# 🚀 MOVZZ Backend - Manual Setup (No Docker)

Complete guide to set up the backend locally without Docker.

---

## 📋 Prerequisites

- ✅ Node.js 18+ installed
- ✅ PostgreSQL 14+ installed
- ✅ Git installed
- ✅ Code editor (VS Code recommended)

---

## 🗄️ Step 1: Install & Configure PostgreSQL

### **macOS (using Homebrew)**

```bash
# Install PostgreSQL
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Verify installation
psql --version
# Should show: psql (PostgreSQL) 14.x
```

### **Ubuntu/Debian Linux**

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
```

### **Windows**

1. Download installer from: https://www.postgresql.org/download/windows/
2. Run installer (use default settings)
3. Remember the password you set for `postgres` user
4. Add PostgreSQL to PATH (installer should do this)
5. Verify in Command Prompt:
   ```cmd
   psql --version
   ```

---

## 🔧 Step 2: Create Database

### **macOS/Linux**

```bash
# Connect to PostgreSQL as default user
psql postgres

# Or if that doesn't work:
sudo -u postgres psql
```

### **Windows**

```cmd
# Open Command Prompt and connect
psql -U postgres
# Enter the password you set during installation
```

### **Create Database & User**

Once connected to PostgreSQL, run these commands:

```sql
-- Create database
CREATE DATABASE movzz_dev;

-- Create user with password
CREATE USER movzz WITH PASSWORD 'movzz_secure_password_123';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE movzz_dev TO movzz;

-- Connect to the database
\c movzz_dev

-- Grant schema privileges (PostgreSQL 15+)
GRANT ALL ON SCHEMA public TO movzz;

-- Exit
\q
```

### **Verify Database**

```bash
# Test connection
psql -U movzz -d movzz_dev -h localhost

# If successful, you'll see:
# movzz_dev=>

# Exit with:
\q
```

---

## 📦 Step 3: Install Backend Dependencies

```bash
# Navigate to backend directory
cd backend

# Install all dependencies
npm install

# This installs:
# - Express, Prisma, TypeScript
# - JWT, bcrypt, Zod
# - Winston (logging)
# - Socket.io (WebSocket)
# - And 20+ other packages
```

**Expected output:**
```
added 150+ packages in 30s
```

---

## ⚙️ Step 4: Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Open .env in your editor
nano .env
# or
code .env
# or
vim .env
```

### **Edit .env file:**

```env
# ============================================
# REQUIRED - Update these values
# ============================================

# Database Connection
DATABASE_URL="postgresql://movzz:movzz_secure_password_123@localhost:5432/movzz_dev?schema=public"
# ⚠️ Update password to match what you set in Step 2

# JWT Secret (generate a random string)
JWT_SECRET="your-super-secret-jwt-key-change-this-to-random-string"
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Server Configuration
PORT=5000
NODE_ENV=development
API_VERSION=v1

# ============================================
# OPTIONAL - Can leave as-is for now
# ============================================

# Redis (optional - for caching)
# REDIS_URL="redis://localhost:6379"

# JWT Refresh Token
REFRESH_TOKEN_SECRET="your-refresh-token-secret"
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# Twilio (for SMS OTP - optional for now)
# TWILIO_ACCOUNT_SID=your-twilio-account-sid
# TWILIO_AUTH_TOKEN=your-twilio-auth-token
# TWILIO_PHONE_NUMBER=+1234567890

# Provider APIs (optional - using mock data for now)
# UBER_CLIENT_ID=your-uber-client-id
# UBER_CLIENT_SECRET=your-uber-client-secret
# OLA_API_KEY=your-ola-api-key
# RAPIDO_API_KEY=your-rapido-api-key

# Google Maps (optional)
# GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS (update when you know your frontend URL)
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=debug

# Feature Flags
ENABLE_UBER=true
ENABLE_OLA=true
ENABLE_RAPIDO=true
ENABLE_METRO=false
ENABLE_CACHING=false
```

### **Generate Secure JWT Secret:**

```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL (macOS/Linux)
openssl rand -hex 32

# Copy the output and paste it as JWT_SECRET in .env
```

---

## 🗄️ Step 5: Set Up Database Schema

```bash
# Generate Prisma Client (creates TypeScript types)
npm run prisma:generate

# Expected output:
# ✔ Generated Prisma Client

# Run database migrations (creates tables)
npm run prisma:migrate

# You'll be prompted for a migration name, enter:
# initial_schema

# Expected output:
# ✔ Database migrations applied successfully
```

### **Verify Database Tables**

```bash
# Open Prisma Studio (visual database browser)
npm run prisma:studio

# This opens http://localhost:5555 in your browser
# You should see all 11 tables:
# - User
# - OTPCode
# - SavedLocation
# - Booking
# - BookingLeg
# - ProviderCache
# - ProviderLog
# - PaymentMethod
# - RouteAnalytics
# - SystemMetrics
```

---

## 🚀 Step 6: Start Development Server

```bash
# Start server with hot reload
npm run dev

# Expected output:
# 🚀 ========================================
# 🚀 MOVZZ Backend Server Started
# 🚀 Environment: development
# 🚀 Port: 5000
# 🚀 API: http://localhost:5000/api/v1
# 🚀 Health: http://localhost:5000/health
# 🚀 ========================================
```

**Server is now running!** 🎉

---

## ✅ Step 7: Verify Installation

### **Test 1: Health Check**

```bash
# In a new terminal window
curl http://localhost:5000/health

# Expected response:
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 5.123,
  "environment": "development",
  "version": "1.0.0"
}
```

### **Test 2: Send OTP**

```bash
curl -X POST http://localhost:5000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'

# Expected response:
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "phone": "+919876543210",
    "expiresIn": 300
  }
}
```

**Check your terminal** where the server is running - you'll see the OTP code logged:
```
📱 OTP for +919876543210: 123456
```

### **Test 3: Verify OTP**

```bash
# Use the OTP from the server logs (e.g., 123456)
curl -X POST http://localhost:5000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "code": "123456"
  }'

# Expected response:
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "user": {
      "id": "uuid-here",
      "phone": "+919876543210",
      "email": null,
      "name": null
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Save the `accessToken`** - you'll need it for the next test!

### **Test 4: Search Rides (Protected Endpoint)**

```bash
# Replace YOUR_TOKEN with the accessToken from Test 3
curl -X POST http://localhost:5000/api/v1/bookings/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "pickupLat": 13.0827,
    "pickupLng": 80.2707,
    "dropLat": 12.9941,
    "dropLng": 80.1709,
    "vehicleTypes": ["cab", "bike", "auto"]
  }'

# Expected response:
{
  "success": true,
  "data": {
    "distance": 15.2,
    "rides": [
      {
        "provider": "rapido",
        "vehicleType": "bike",
        "rideType": "Rapido Bike",
        "estimatedPrice": 132,
        "estimatedETA": 30,
        "currency": "INR",
        "distance": 15.2,
        "availability": true,
        "surgeMultiplier": 1.0
      },
      {
        "provider": "ola",
        "vehicleType": "cab",
        "rideType": "Ola Mini",
        "estimatedPrice": 217,
        "estimatedETA": 32,
        ...
      },
      ...
    ],
    "count": 9
  }
}
```

---

## 🎉 Success Checklist

If all tests passed, you should have:

- ✅ PostgreSQL running
- ✅ Database `movzz_dev` created
- ✅ All tables created (11 models)
- ✅ Backend server running on port 5000
- ✅ Health check returns 200 OK
- ✅ Can send OTP
- ✅ Can verify OTP and get JWT token
- ✅ Can search rides with authentication
- ✅ Database entries created (check Prisma Studio)

---

## 🔧 Common Issues & Solutions

### **Issue 1: "Cannot connect to database"**

**Error:**
```
Error: Can't reach database server at `localhost:5432`
```

**Solutions:**

```bash
# Check if PostgreSQL is running
# macOS:
brew services list | grep postgresql

# Linux:
sudo systemctl status postgresql

# If not running, start it:
# macOS:
brew services start postgresql@14

# Linux:
sudo systemctl start postgresql
```

**Verify connection manually:**
```bash
psql -U movzz -d movzz_dev -h localhost
# If this works, your DATABASE_URL in .env is wrong
```

**Common DATABASE_URL mistakes:**
```env
# ❌ Wrong
DATABASE_URL="postgresql://movzz:password@localhost:5432/movzz_dev"

# ✅ Correct (with schema)
DATABASE_URL="postgresql://movzz:password@localhost:5432/movzz_dev?schema=public"
```

---

### **Issue 2: "Prisma Client not generated"**

**Error:**
```
Error: @prisma/client did not initialize yet
```

**Solution:**
```bash
npm run prisma:generate
```

---

### **Issue 3: "Port 5000 already in use"**

**Error:**
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution:**

```bash
# Option 1: Change port in .env
PORT=5001

# Option 2: Kill process using port 5000
# macOS/Linux:
lsof -ti:5000 | xargs kill -9

# Windows:
netstat -ano | findstr :5000
# Note the PID, then:
taskkill /PID <PID> /F
```

---

### **Issue 4: "Module not found" errors**

**Error:**
```
Error: Cannot find module 'express'
```

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

---

### **Issue 5: "Permission denied" on PostgreSQL**

**Error:**
```
FATAL: role "movzz" does not exist
```

**Solution:**
```bash
# Reconnect to PostgreSQL
psql postgres

# Recreate user
CREATE USER movzz WITH PASSWORD 'movzz_secure_password_123';
GRANT ALL PRIVILEGES ON DATABASE movzz_dev TO movzz;

# For PostgreSQL 15+
\c movzz_dev
GRANT ALL ON SCHEMA public TO movzz;
```

---

### **Issue 6: OTP not showing in logs**

**Check:**
```bash
# Make sure LOG_LEVEL is set to debug in .env
LOG_LEVEL=debug

# Restart server
# Press Ctrl+C to stop
npm run dev
```

---

## 📊 Database Management

### **View Database**

```bash
# Open Prisma Studio (GUI)
npm run prisma:studio

# Opens http://localhost:5555
```

### **Reset Database (⚠️ Deletes all data)**

```bash
npx prisma migrate reset
```

### **Create New Migration**

```bash
# After editing prisma/schema.prisma
npx prisma migrate dev --name your_migration_name
```

### **Direct SQL Access**

```bash
# Connect to database
psql -U movzz -d movzz_dev -h localhost

# List tables
\dt

# View table structure
\d "User"

# Run SQL query
SELECT * FROM "User";

# Exit
\q
```

---

## 🚀 Development Workflow

### **Daily Development**

```bash
# 1. Start PostgreSQL (if not auto-started)
brew services start postgresql@14  # macOS
sudo systemctl start postgresql    # Linux

# 2. Start backend server
cd backend
npm run dev

# 3. Open Prisma Studio (optional)
npm run prisma:studio

# 4. View logs
tail -f logs/combined.log
```

### **Making Changes**

```bash
# 1. Edit code in src/
# 2. Server auto-reloads (tsx watch)
# 3. Test with curl or Postman
# 4. Check logs for errors
```

### **Database Changes**

```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration
npm run prisma:migrate dev --name add_new_field

# 3. Prisma Client auto-regenerates
```

---

## 📝 Next Steps

### **1. Test All Endpoints**

Use the API examples in `README.md` to test:
- ✅ Authentication (send OTP, verify OTP)
- ✅ User profile (get, update)
- ✅ Saved locations (add, list, delete)
- ✅ Bookings (search, create, cancel)
- ✅ Providers (list, compare)

### **2. Connect Frontend**

Update your frontend API configuration:
```javascript
// frontend/src/config.js
export const API_BASE_URL = 'http://localhost:5000/api/v1';
```

### **3. Optional: Install Redis (for caching)**

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Linux:**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

**Update .env:**
```env
REDIS_URL="redis://localhost:6379"
ENABLE_CACHING=true
```

---

## 🎯 Production Deployment (Later)

When ready to deploy:

1. **Build TypeScript:**
   ```bash
   npm run build
   ```

2. **Use PM2:**
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js --env production
   ```

3. **Set up production database** (PostgreSQL on cloud)

4. **Configure environment variables** for production

---

## 🆘 Getting Help

If you're stuck:

1. **Check logs:**
   ```bash
   tail -f logs/combined.log
   tail -f logs/error.log
   ```

2. **Check database:**
   ```bash
   npm run prisma:studio
   ```

3. **Verify PostgreSQL:**
   ```bash
   psql -U movzz -d movzz_dev -h localhost
   ```

4. **Test connection:**
   ```bash
   curl http://localhost:5000/health
   ```

---

## ✅ You're All Set!

Your backend is now running locally without Docker! 🎉

**What you have:**
- ✅ PostgreSQL database running
- ✅ Backend server on http://localhost:5000
- ✅ All API endpoints working
- ✅ Database schema created
- ✅ Development environment ready

**Next:** Start building your frontend integration! 🚀
