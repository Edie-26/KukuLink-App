# KukuLink Codebase Instructions for AI Agents

## Project Overview
**KukuLink** is a full-stack mobile app for ordering and managing poultry (chicks) in Uganda, connecting buyers with suppliers. It uses:
- **Backend**: Express.js + Prisma ORM + PostgreSQL (Node.js on port 5000)
- **Frontend**: React Native (Expo) with TypeScript + Expo Router (file-based routing)
- **Domain**: Agricultural marketplace focused on poultry products
- **Status**: Core authentication system complete; ongoing development on product ordering, cart, and payment integration

## Architecture & Data Flow

### Backend Architecture
- **Port**: 5000 (configured in [backend/index.js](backend/index.js))
- **Entry point**: [backend/index.js](backend/index.js) - Express server with CORS + JSON middleware
- **Database**: PostgreSQL via Prisma ORM (connection: `postgresql://postgres:1998@localhost:5432/kukulink`)
- **Authentication**: JWT tokens (7-day expiry) signed with `JWT_SECRET` from .env; passwords bcrypt-hashed (10 salt rounds)
- **Key models**: `User` (email unique), `Product` (price in cents, supplier foreign key), `Order` (user-placed orders)

**Backend Endpoints** (all return JSON):
| Endpoint | Method | Auth | Purpose | Request Body |
|----------|--------|------|---------|---------------|
| `/` | GET | No | Health check | - |
| `/api/auth/signup` | POST | No | Create account | `{name, email, password, role}` |
| `/api/auth/login` | POST | No | Login, returns JWT token | `{email, password}` |
| `/api/chicks` | GET | Yes | Get all products with supplier | - |
| `/api/seed` | GET | No | Populate default products + supplier | - |

**Auth Flow**:
1. User signs up → bcrypt hashes password (10 salt rounds) → stores in DB
2. Server generates JWT token (expires in 7 days)
3. Frontend stores token in AsyncStorage
4. Subsequent requests include token in `Authorization: Bearer <token>` header
5. Middleware verifies token before granting access

**Database Models** (in [backend/prisma/schema.prisma](backend/prisma/schema.prisma)):
```prisma
model User {
  id        Int       @id @default(autoincrement())
  name      String
  email     String    @unique
  password  String    // bcrypt hashed (never returned in API responses)
  role      String    @default("buyer") // "buyer" or "supplier"
  products  Product[] // products they supply
  orders    Order[]   // orders they placed
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Product {
  id          Int      @id @default(autoincrement())
  name        String
  price       Int      // in cents (e.g., 3000 = 30 UGX)
  supplierId  Int
  supplier    User     @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Order {
  id        String   @id @default(uuid())
  chickName String   // product name
  quantity  Int
  price     Int      // total price
  status    String   @default("Pending") // Order status
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}
```

### Frontend Architecture
- **Routing**: File-based routing via Expo Router in frontend/app/ (see directory for structure)
- **Auth Flow**: Root layout conditionally renders (auth), (tabs), or (supplier-tabs) based on authentication state
- **Persistence**: JWT token stored in AsyncStorage with key `kukulink_auth_token`; user data in `kukulink_user`

**Frontend Navigation Structure**:
- frontend/app/_layout.tsx - Root layout with AuthProvider + conditional stack-based navigation
- frontend/app/(auth)/ - Welcome, Sign In, Sign Up screens (shown if not logged in)
- frontend/app/(tabs)/ - Main buyer app (Home, Notifications, Profile)
- frontend/app/(screens)/ - Additional screens (Cart, Checkout, Order, etc.)
- frontend/app/(supplier-tabs)/ - Main supplier app (auto-redirected if user.role === "supplier")

**Authentication System**:
- frontend/context/AuthContext.tsx - Manages global auth state (user, token, isLoggedIn, isLoading) + signup/login/logout methods
- frontend/services/api.ts - Centralized API layer with auto-JWT-header injection for all requests
- frontend/app/(auth)/sign-up.tsx - Form with validation (name, email, password confirm, role selection)
- frontend/app/(auth)/sign-in.tsx - Form with email/password validation

**Auth Flow Detail**:
1. App mounts → AuthProvider reads AsyncStorage for saved token/user
2. If valid token found → set isLoggedIn=true, restore session
3. Root layout checks isLoggedIn and routes to (auth), (tabs), or (supplier-tabs)
4. User submits signup/login → api.signup/api.login called → JWT token returned
5. Token + user saved to AsyncStorage → isLoggedIn becomes true → automatic navigation

## Development Workflows

### Backend Development
```bash
# Development mode (auto-restart on file changes)
npm run dev

# Database migrations
npx prisma migrate dev --name <migration_name>

# Regenerate Prisma client
npx prisma generate

# Seed database one-time
curl http://localhost:5000/api/seed

# Test signup with curl
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@test.com","password":"pass123","role":"buyer"}'

# Test login with curl
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@test.com","password":"pass123"}'

# Test protected endpoint with token
curl http://localhost:5000/api/chicks \
  -H "Authorization: Bearer <JWT_TOKEN_HERE>"
```

### Frontend Development
```bash
# Start development server
npm start

# Platform-specific targets
npm run android    # Android emulator
npm run ios       # iOS simulator
npm run web       # Web browser

# Reset project scaffold
npm run reset-project

# Linting
npm run lint
```

### Database Connection
- **URL**: `postgresql://postgres:1998@localhost:5432/kukulink`
- **Setup**: PostgreSQL server must be running locally
- **Verify**: `npx prisma studio` opens UI browser to view/edit data

## Project Conventions & Patterns

### Backend Patterns
1. **Authentication Middleware**: `authenticateToken` checks `Authorization: Bearer <token>` header
2. **Error Handling**: Returns proper HTTP status codes (400 validation, 401 auth, 409 conflict, 500 server)
3. **Password Security**: bcrypt.hash(password, 10) hashes with 10 salt rounds before storing
4. **JWT Tokens**: Contain payload `{id, email, role}`, signed with `JWT_SECRET` from .env
5. **Prisma Queries**: All database access through PrismaClient (see [backend/index.js](backend/index.js) for examples)

### Frontend Patterns
1. **API Service**: frontend/services/api.ts has centralized API calls; provides signup, login, getProducts functions
2. **Auth Context**: frontend/context/AuthContext.tsx manages user, token, isLoggedIn, isLoading state
3. **useAuth Hook**: Used in all protected screens to access auth state and methods: `const { user, login, logout, error } = useAuth()`
4. **AsyncStorage Keys**: Token: `kukulink_auth_token`, User: `kukulink_user` (JSON serialized)
5. **Loading States**: Screens show ActivityIndicator while `isLoading` is true; disable buttons during API calls
6. **Error Handling**: Errors shown in alert boxes; use `clearError()` to dismiss; API errors bubble up with `.message` property
7. **Navigation Guard**: Root layout (_layout.tsx) uses Stack navigation with conditional route rendering based on isLoggedIn + user.role

### Cross-project Conventions
1. **Email validation**: Frontend trims and lowercases emails before sending
2. **Password requirements**: Minimum 6 characters, must match confirmation
3. **Role types**: Only "buyer" or "supplier" allowed
4. **Timestamps**: Prisma auto-adds `createdAt` and `updatedAt` to all models
5. **Environment Config**: `.env` files hold secrets (JWT_SECRET, DATABASE_URL)

## Integration Points

### Frontend ↔ Backend Communication
- **Base URL**: `http://172.0.0.1:5000` (currently set in frontend/services/api.ts; was `http://172.20.10.6:5000`)
- **Token Format**: `Authorization: Bearer <JWT_TOKEN>` header added automatically by api.ts helper
- **Endpoint Contracts**:
  - POST `/api/auth/signup` sends `{name, email, password, role}` → returns `{message, token, user}`
  - POST `/api/auth/login` sends `{email, password}` → returns `{message, token, user}`
  - GET `/api/chicks` (requires Bearer token) → returns array of `{id, name, price, supplierId, supplier: {id, name, email}, createdAt, updatedAt}`
  - GET `/api/seed` → seeds 4 default products + creates default supplier if needed
- **Error Responses**: All errors return JSON with `{message: string, error?: string}` and appropriate HTTP status (400, 401, 409, 500)

### External Dependencies
- **Prisma** (^5.22.0): ORM for PostgreSQL
- **bcrypt** (^5.1.0): Password hashing
- **jsonwebtoken** (^9.0.2): JWT token generation/verification
- **dotenv** (^16.3.1): Environment variable loading
- **AsyncStorage** (@react-native-async-storage/async-storage): Mobile persistent storage

## Critical Implementation Details

### Password Storage (Security)
- **Never**: Store plaintext passwords
- **Always**: Use `bcrypt.hash(password, 10)` before storing
- **Never**: Return password in API responses (even hashed)
- **Backend**: Signup endpoint hashes password before saving to DB

### JWT Token Handling
- **Issued**: On successful signup/login with 7-day expiry
- **Format**: `Authorization: Bearer <token>` header for protected routes
- **Verification**: `jwt.verify(token, JWT_SECRET)` on middleware
- **Payload**: Contains `{id, email, role}` (user identification data)
- **Secret**: `JWT_SECRET` from .env (keep this secret in production!)

### Error Scenarios & Responses
| Scenario | HTTP Status | Response |
|----------|---------|----------|
| Missing required fields | 400 | `{message: "Missing required fields: ..."}`  |
| Duplicate email | 409 | `{message: "User with this email already exists"}` |
| Invalid credentials | 401 | `{message: "Invalid email or password"}` |
| Missing token | 401 | `{message: "Access token required"}` |
| Expired token | 401 | `{message: "Invalid or expired token"}` |
| Server error | 500 | `{message: "Error...", error: "details"}` |

## Testing Complete Authentication Flow (Step-by-Step)

### 1. Verify Backend is Running
```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Should see: ✅ Backend running on http://localhost:5000
```

### 2. Seed Database
```bash
# In browser or Postman: GET http://localhost:5000/api/seed
# Response: {message: "Seeded products...", supplier: {...}}
```

### 3. Create Test Account (Backend Test First)
```bash
# Using Postman or curl:
POST http://localhost:5000/api/auth/signup
Content-Type: application/json
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "password123",
  "role": "buyer"
}

# Response should include:
# {
#   "message": "Sign up successful",
#   "token": "eyJhbGc...",
#   "user": { "id": 1, "name": "Test User", "email": "test@example.com", "role": "buyer" }
# }
```

### 4. Test Products Endpoint with Token
```bash
# Copy token from signup response
GET http://localhost:5000/api/chicks
Authorization: Bearer <TOKEN_FROM_STEP_3>

# Response: Array of 4 products with supplier details
```

### 5. Test Frontend Sign Up
```bash
# Terminal 2: Start frontend
cd frontend
npm start

# Select web target, open http://localhost:8081 (or displayed URL)
# Click "Sign Up"
# Fill form:
#   Name: Frontend Test
#   Email: frontend@test.com
#   Role: Buyer
#   Password: testpass123
#   Confirm: testpass123
# Click "Create Account"
# Should redirect to (tabs) home screen
```

### 6. Verify Data Persisted
```bash
# Check PostgreSQL directly:
npx prisma studio
# Navigate to User table, should see new user with hashed password
# Navigate to Product table, should see 4 seeded products
```

### 7. Test Persistence (Restart App)
```bash
# Frontend running
# Press Ctrl+C to close, then restart: npm start
# App should skip auth screens and go directly to (tabs)
# User session restored from AsyncStorage token
```

## File Reference Guide
| Purpose | File(s) |
|---------|---------|
| **Database Setup** | |
| Schema definition | backend/prisma/schema.prisma |
| Migrations | backend/prisma/migrations/ |
| **Backend API** | |
| Main server + routes + middleware | backend/index.js |
| Config + secrets | backend/.env (DATABASE_URL, JWT_SECRET, JWT_EXPIRY) |
| Dependencies | backend/package.json |
| **Frontend Auth** | |
| API service (signup, login, getProducts) | frontend/services/api.ts |
| Auth context + useAuth hook | frontend/context/AuthContext.tsx |
| Root layout + navigation guard | frontend/app/_layout.tsx |
| Sign up screen | frontend/app/(auth)/sign-up.tsx |
| Sign in screen | frontend/app/(auth)/sign-in.tsx |
| Welcome screen | frontend/app/(auth)/index.tsx |
| **Frontend App** | |
| Buyer home (tabs) | frontend/app/(tabs)/index.tsx |
| Buyer notifications | frontend/app/(tabs)/notifications.tsx |
| Buyer profile | frontend/app/(tabs)/profile.tsx |
| Supplier home | frontend/app/(supplier-tabs)/index.tsx |
| Cart, Checkout, Order screens | frontend/app/(screens)/ |

## Common Development Tasks

### Add a New Backend API Endpoint
1. Create route handler in backend/index.js (add after existing endpoint comments)
2. Use `authenticateToken` middleware if endpoint requires auth: `app.get('/api/route', authenticateToken, async (req, res) => {...})`
3. Access authenticated user via `req.user.id`, `req.user.email`, `req.user.role`
4. Always return JSON: `res.json({data})` or `res.status(code).json({message, error})`
5. Export corresponding function in frontend/services/api.ts
6. Use in component: `await api.functionName(params, token)` or just `api.functionName(params)` if token auto-injected

### Add a New Prisma Model
1. Edit backend/prisma/schema.prisma, define model with relationships
2. Run: `npx prisma migrate dev --name describe_change`
3. Prisma client auto-regenerates; restart backend server
4. Seed new model in `/api/seed` endpoint if needed for testing

### Debug Authentication Issues
- Check `JWT_SECRET` and `JWT_EXPIRY` in backend/.env match expected values
- Verify AsyncStorage content: use DevTools if debugging web, or: `const token = await AsyncStorage.getItem('kukulink_auth_token')`
- Decode token at jwt.io to check expiry and payload
- Check backend logs: `console.log` statements show login flow progress
- Verify token format in network requests: `Authorization: Bearer <token>` (no extra spaces)

### Modify Authentication Rules
- **Password validation**: Edit frontend/app/(auth)/sign-up.tsx validation + backend/index.js regex checks
- **Token expiry**: Change `JWT_EXPIRY` in backend/.env (format: "7d", "24h", etc.)
- **Required signup fields**: Add validation to backend/index.js signup endpoint
- **Role types**: Update User.role default in backend/prisma/schema.prisma + SignupPayload role type in frontend/services/api.ts

## Next Steps After Authentication is Working
1. **Add logout button** to profile screen that calls `useAuth().logout()`
2. **Implement product listing** in (tabs) home that calls `api.getProducts(token)`
3. **Add product filtering** by role (buyers see all, suppliers only see their own)
4. **Implement cart** for buyers (new Prisma model: Order, OrderItem)
5. **Add image uploads** for products (new Prisma field: Product.imageUrl)
6. **Email verification** on signup (send confirmation email)
7. **Password reset** flow (forgot password endpoint)
8. **Refresh token** logic (implement refresh endpoint to extend sessions)

