require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful!');
    console.log('Query result:', result);
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testConnection();
