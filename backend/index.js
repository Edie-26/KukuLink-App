require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Constants
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

// ============ MIDDLEWARE ============

/**
 * Middleware to authenticate JWT token
 * Extracts token from Authorization header (Bearer <token>)
 * Verifies token and attaches user data to request
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attach user data to request
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// ============ ROUTES ============

// Welcome route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to KukuLink Backend API!' });
});

/**
 * SIGN UP ENDPOINT
 * POST /api/auth/signup
 * Body: { name, email, password, role }
 * Returns: { token, user }
 */
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: 'Missing required fields: name, email, password, role',
      });
    }

    if (!['buyer', 'supplier'].includes(role)) {
      return res.status(400).json({
        message: 'Role must be either "buyer" or "supplier"',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'User with this email already exists',
      });
    }

    // Hash password with bcrypt (10 salt rounds = good balance of security/speed)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in database
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Return token and user (without password)
    res.status(201).json({
      message: 'Sign up successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      message: 'Error during sign up',
      error: error.message,
    });
  }
});

/**
 * SIGN IN ENDPOINT
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { token, user }
 */
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validation
    if (!email || !password) {
      console.log('❌ Login: Missing email or password');
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    console.log('🔐 Login: Attempting login for email:', email);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log('❌ Login: User not found with email:', email);
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    console.log('✓ Login: User found, comparing password...');

    // Compare provided password with hashed password in database
    const passwordMatch = await bcrypt.compare(password, user.password);

    console.log('🔐 Login: Password match result:', passwordMatch);

    if (!passwordMatch) {
      console.log('❌ Login: Password mismatch for user:', email);
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    console.log('✓ Login: Password matched! Generating token for user:', email);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    console.log('✓ Login: Token generated, returning user:', user.name);

    // Return token and user (without password)
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Error during login',
      error: error.message,
    });
  }
});

/**
 * GET PRODUCTS ENDPOINT (PROTECTED)
 * GET /api/chicks
 * Requires: Valid JWT token in Authorization header
 * Returns: Array of products
 */
app.get('/api/chicks', authenticateToken, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      message: 'Error fetching products',
      error: error.message,
    });
  }
});

/**
 * SEED ENDPOINT
 * GET /api/seed
 * Populates database with initial product data
 * Run this ONCE during development
 */
app.get('/api/seed', async (req, res) => {
  try {
    // Check if products already exist
    const existingProducts = await prisma.product.count();
    
    if (existingProducts > 0) {
      return res.json({
        message: 'Products already seeded, skipping',
        count: existingProducts,
      });
    }

    // Create a default supplier if none exists
    let supplier = await prisma.user.findFirst({
      where: { role: 'supplier' },
    });

    if (!supplier) {
      const hashedPassword = await bcrypt.hash('supplier123', 10);
      supplier = await prisma.user.create({
        data: {
          name: 'KukuLink Default Supplier',
          email: 'supplier@kukulink.local',
          password: hashedPassword,
          role: 'supplier',
        },
      });
    }

    // Seed products
    await prisma.product.createMany({
      data: [
        { name: 'Local Chicks', price: 3000, supplierId: supplier.id },
        { name: 'Layers', price: 5000, supplierId: supplier.id },
        { name: 'Broilers', price: 4000, supplierId: supplier.id },
        { name: 'Croilers', price: 4500, supplierId: supplier.id },
      ],
      skipDuplicates: true,
    });

    res.json({
      message: 'Seeded products and default supplier successfully!',
      supplier,
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({
      message: 'Error seeding database',
      error: error.message,
    });
  }
});

// Error handling for undefined routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  console.log('📌 API Endpoints:');
  console.log('   POST   /api/auth/signup  - Create new account');
  console.log('   POST   /api/auth/login   - Login with email/password');
  console.log('   GET    /api/chicks       - Get all products (requires token)');
  console.log('   GET    /api/seed         - Seed initial data (run once)');
  console.log('');
  console.log('🚀 Quick start:');
  console.log('   1. Visit http://localhost:5000/api/seed to populate data');
  console.log('   2. POST to /api/auth/signup to create an account');
  console.log('   3. Use returned token in Authorization: Bearer <token> header');
});