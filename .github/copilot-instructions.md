# KukuLink Codebase Instructions for AI Agents

## Project Overview
**KukuLink** is a full-stack mobile app for managing and trading poultry (chicks) in agricultural markets. It uses:
- **Backend**: Express.js + Prisma ORM + PostgreSQL
- **Frontend**: React Native (Expo) with TypeScript + Expo Router
- **Domain**: Agricultural marketplace focused on poultry products
- **Status**: Authentication system fully implemented with password hashing and JWT tokens

## Architecture & Data Flow

### Backend Architecture
- **Port**: 5000 (configured in [backend/index.js](backend/index.js))
- **Entry point**: [backend/index.js](backend/index.js) - Express server with CORS enabled
- **Database**: PostgreSQL via Prisma (connection: `postgresql://postgres:1998@localhost:5432/kukulink`)
- **Authentication**: JWT tokens signed with bcrypt-hashed passwords
- **Key models**: `User` (with email unique constraint), `Product` (with supplier relationship)

**Backend Endpoints**:
| Endpoint | Method | Auth Required | Purpose |
|----------|--------|---|---------|
| `/` | GET | No | Health check |
| `/api/auth/signup` | POST | No | Create account with hashed password |
| `/api/auth/login` | POST | No | Login, returns JWT token |
| `/api/chicks` | GET | Yes (Bearer token) | Get all products |
| `/api/seed` | GET | No | One-time database seeding |

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
  password  String    // bcrypt hashed
  role      String    @default("buyer") // "buyer" or "supplier"
  products  Product[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Product {
  id          Int      @id @default(autoincrement())
  name        String
  price       Int      // in cents
  supplierId  Int
  supplier    User     @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Frontend Architecture
- **Routing**: File-based routing via Expo Router in [frontend/app/](frontend/app/)
- **Auth Flow**: Root layout renders conditionally based on `useAuth()` login state
- **Persistence**: JWT token and user data stored in AsyncStorage across app restarts

**Navigation Structure**:
- [frontend/app/_layout.tsx](frontend/app/_layout.tsx) - Root layout with AuthProvider wrapper + navigation guard
- [frontend/app/(auth)/](frontend/app/(auth)/) - Welcome, Sign In, Sign Up screens (shows if not logged in)
- [frontend/app/(tabs)/](frontend/app/(tabs)/) - Main app for buyers
- [frontend/app/(supplier-tabs)/](frontend/app/(supplier-tabs)/) - Main app for suppliers (auto-redirects based on user.role)

**Authentication System**:
- [frontend/context/AuthContext.tsx](frontend/context/AuthContext.tsx) - Global auth state + methods (signup, login, logout)
- [frontend/services/api.ts](frontend/services/api.ts) - Centralized API calls with JWT header injection
- [frontend/app/(auth)/sign-up.tsx](frontend/app/(auth)/sign-up.tsx) - Form validation + signup call
- [frontend/app/(auth)/sign-in.tsx](frontend/app/(auth)/sign-in.tsx) - Form validation + login call

**How Auth Works**:
1. App starts → checks AsyncStorage for saved token
2. If token exists → restore user session (app shows main screens)
3. If no token → show auth screens
4. User fills signup/login form → API service sends to backend
5. Backend returns JWT token → stored in AsyncStorage
6. Root layout re-renders → automatically redirects to (tabs) or (supplier-tabs)
7. All subsequent API calls auto-include token in header

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
1. **API Service**: [frontend/services/api.ts](frontend/services/api.ts) has all backend calls (signup, login, getProducts)
2. **Auth Context**: [frontend/context/AuthContext.tsx](frontend/context/AuthContext.tsx) manages `user`, `token`, `isLoggedIn`, `isLoading`
3. **useAuth Hook**: Used in screens to access auth state: `const { user, login, logout } = useAuth()`
4. **AsyncStorage**: Token stored with key `kukulink_auth_token`, user with `kukulink_user`
5. **Loading States**: Screens show `ActivityIndicator` while `isLoading` is true, buttons disabled
6. **Error Handling**: Errors shown in red alert boxes; use `clearError()` to dismiss
7. **Navigation Guard**: Root layout conditionally renders auth screens vs app screens based on `isLoggedIn`

### Cross-project Conventions
1. **Email validation**: Frontend trims and lowercases emails before sending
2. **Password requirements**: Minimum 6 characters, must match confirmation
3. **Role types**: Only "buyer" or "supplier" allowed
4. **Timestamps**: Prisma auto-adds `createdAt` and `updatedAt` to all models
5. **Environment Config**: `.env` files hold secrets (JWT_SECRET, DATABASE_URL)

## Integration Points

### Frontend ↔ Backend Communication
- **Base URL**: `http://localhost:5000` (hardcoded in [frontend/services/api.ts](frontend/services/api.ts))
- **Token Format**: `Authorization: Bearer <JWT_TOKEN>`
- **Endpoint Contract**:
  - POST `/api/auth/signup` sends `{name, email, password, role}`; returns `{token, user, message}`
  - POST `/api/auth/login` sends `{email, password}`; returns `{token, user, message}`
  - GET `/api/chicks` with Bearer token; returns array of products with supplier details
  - GET `/api/seed` populates 4 default products + creates default supplier if needed

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
| Schema definition | [backend/prisma/schema.prisma](backend/prisma/schema.prisma) |
| Migrations | [backend/prisma/migrations/](backend/prisma/migrations/) |
| **Backend Auth** | |
| Main server + endpoints | [backend/index.js](backend/index.js) |
| Config + secrets | [backend/.env](backend/.env) |
| Dependencies | [backend/package.json](backend/package.json) |
| **Frontend Auth** | |
| API service layer | [frontend/services/api.ts](frontend/services/api.ts) |
| Auth context + hooks | [frontend/context/AuthContext.tsx](frontend/context/AuthContext.tsx) |
| Root layout + guard | [frontend/app/_layout.tsx](frontend/app/_layout.tsx) |
| Sign up screen | [frontend/app/(auth)/sign-up.tsx](frontend/app/(auth)/sign-up.tsx) |
| Sign in screen | [frontend/app/(auth)/sign-in.tsx](frontend/app/(auth)/sign-in.tsx) |
| Welcome screen | [frontend/app/(auth)/index.tsx](frontend/app/(auth)/index.tsx) |
| **Frontend App** | |
| Buyer home | [frontend/app/(tabs)/index.tsx](frontend/app/(tabs)/index.tsx) |
| Supplier home | [frontend/app/(supplier-tabs)/index.tsx](frontend/app/(supplier-tabs)/index.tsx) |
| User profile | [frontend/app/(tabs)/profile.tsx](frontend/app/(tabs)/profile.tsx) |

## Common Development Tasks

### Add a New API Endpoint
1. Add route to [backend/index.js](backend/index.js) with proper error handling
2. Add JWT middleware if endpoint needs authentication
3. Export function in [frontend/services/api.ts](frontend/services/api.ts)
4. Call from component using: `const data = await api.newFunction()`

### Modify Prisma Schema
1. Edit [backend/prisma/schema.prisma](backend/prisma/schema.prisma)
2. Run: `npx prisma migrate dev --name describe_change`
3. Confirms changes, generates migration file
4. Prisma client auto-regenerated

### Debug Token Issues
- Check browser DevTools → AsyncStorage (if available)
- Check backend `.env` for `JWT_SECRET` and `JWT_EXPIRY`
- Check token expiry: decode JWT at [jwt.io](https://jwt.io)
- Use `npx prisma studio` to inspect User records

### Change Authentication Rules
- **Password requirements**: Edit validation in [frontend/app/(auth)/sign-up.tsx](frontend/app/(auth)/sign-up.tsx) and [backend/index.js](backend/index.js)
- **Token expiry**: Change `JWT_EXPIRY` in [backend/.env](backend/.env)
- **Required fields**: Add validation to signup endpoint in [backend/index.js](backend/index.js)
- **Role types**: Update schema in [backend/prisma/schema.prisma](backend/prisma/schema.prisma) and types in [frontend/services/api.ts](frontend/services/api.ts)

## Next Steps After Authentication is Working
1. **Add logout button** to profile screen that calls `useAuth().logout()`
2. **Implement product listing** in (tabs) home that calls `api.getProducts(token)`
3. **Add product filtering** by role (buyers see all, suppliers only see their own)
4. **Implement cart** for buyers (new Prisma model: Order, OrderItem)
5. **Add image uploads** for products (new Prisma field: Product.imageUrl)
6. **Email verification** on signup (send confirmation email)
7. **Password reset** flow (forgot password endpoint)
8. **Refresh token** logic (implement refresh endpoint to extend sessions)

