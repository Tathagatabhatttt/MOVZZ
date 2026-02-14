# 🚀 MOVZZ Backend - Complete Setup Guide

This guide will walk you through setting up the MOVZZ backend from scratch.

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] **Node.js 18+** installed ([Download](https://nodejs.org/))
- [ ] **PostgreSQL 14+** installed ([Download](https://www.postgresql.org/download/))
- [ ] **Redis 6+** installed (optional, for caching) ([Download](https://redis.io/download))
- [ ] **Git** installed
- [ ] A code editor (VS Code recommended)
- [ ] Terminal/Command Prompt access

---

## 🎯 Setup Options

Choose your preferred setup method:

### Option 1: Docker (Recommended for Quick Start) 🐳

**Pros:** Everything pre-configured, no manual database setup  
**Cons:** Requires Docker installed

```bash
# 1. Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop

# 2. Navigate to backend directory
cd backend

# 3. Start all services (PostgreSQL + Redis + Backend)
docker-compose up -d

# 4. Check logs
docker-compose logs -f backend

# 5. Access API
curl http://localhost:5000/health
```

**That's it!** Your backend is running at `http://localhost:5000`

---

### Option 2: Manual Setup (Full Control) 🛠

**Pros:** Full control, better for development  
**Cons:** More setup steps

#### Step 1: Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download installer from [postgresql.org](https://www.postgresql.org/download/windows/)

#### Step 2: Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE movzz_dev;
CREATE USER movzz WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE movzz_dev TO movzz;

# Exit
\q
```

#### Step 3: Install Redis (Optional but Recommended)

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

**Windows:**
Download from [redis.io](https://redis.io/download) or use WSL

#### Step 4: Install Backend Dependencies

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# This will install:
# - Express, Prisma, TypeScript
# - Authentication libraries (JWT, bcrypt)
# - Validation (Zod)
# - Logging (Winston)
# - And more...
```

#### Step 5: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env file
nano .env  # or use your preferred editor
```

**Minimum required configuration:**
```env
# Database (update with your credentials)
DATABASE_URL="postgresql://movzz:your_password@localhost:5432/movzz_dev?schema=public"

# JWT Secret (generate a random string)
JWT_SECRET="your-super-secret-jwt-key-change-this"

# Server
PORT=5000
NODE_ENV=development
```

**Generate a secure JWT secret:**
```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 32
```

#### Step 6: Set Up Database Schema

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio to view database
npm run prisma:studio
```

#### Step 7: Start Development Server

```bash
# Start with hot reload
npm run dev

# You should see:
# 🚀 ========================================
# 🚀 MOVZZ Backend Server Started
# 🚀 Environment: development
# 🚀 Port: 5000
# 🚀 API: http://localhost:5000/api/v1
# 🚀 ========================================
```

#### Step 8: Verify Installation

```bash
# Test health endpoint
curl http://localhost:5000/health

# Expected response:
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 5.123,
  "environment": "development"
}
```

---

## 🧪 Testing the API

### 1. Send OTP (Authentication)

```bash
curl -X POST http://localhost:5000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```

**Check your terminal logs** for the OTP code (in development mode, it's logged instead of sent via SMS).

### 2. Verify OTP

```bash
curl -X POST http://localhost:5000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "code": "123456"
  }'
```

**Save the `accessToken` from the response!**

### 3. Search Rides (Protected Endpoint)

```bash
# Replace <YOUR_TOKEN> with the accessToken from step 2
curl -X POST http://localhost:5000/api/v1/bookings/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "pickupLat": 13.0827,
    "pickupLng": 80.2707,
    "dropLat": 12.9941,
    "dropLng": 80.1709,
    "vehicleTypes": ["cab", "bike"]
  }'
```

---

## 🔧 Common Issues & Solutions

### Issue 1: "Cannot connect to database"

**Solution:**
```bash
# Check if PostgreSQL is running
# macOS/Linux:
pg_isready

# If not running, start it:
brew services start postgresql@14  # macOS
sudo systemctl start postgresql    # Linux

# Verify connection string in .env
# Make sure DATABASE_URL matches your setup
```

### Issue 2: "Prisma Client not generated"

**Solution:**
```bash
npm run prisma:generate
```

### Issue 3: "Port 5000 already in use"

**Solution:**
```bash
# Option 1: Change port in .env
PORT=5001

# Option 2: Kill process using port 5000
# macOS/Linux:
lsof -ti:5000 | xargs kill -9

# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Issue 4: "Redis connection failed"

**Solution:**
```bash
# Redis is optional for development
# Either start Redis:
brew services start redis  # macOS
sudo systemctl start redis # Linux

# Or disable caching in .env:
ENABLE_CACHING=false
```

### Issue 5: "Module not found" errors

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 Database Management

### View Database with Prisma Studio

```bash
npm run prisma:studio
```

Opens a GUI at `http://localhost:5555` to view/edit data.

### Reset Database

```bash
# WARNING: This deletes all data!
npx prisma migrate reset
```

### Create New Migration

```bash
# After modifying schema.prisma
npx prisma migrate dev --name your_migration_name
```

### Seed Database (Optional)

Create `prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create test user
  await prisma.user.create({
    data: {
      phone: '+919876543210',
      name: 'Test User',
      isVerified: true,
    },
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run seed:
```bash
npx prisma db seed
```

---

## 🚀 Production Deployment

### Build for Production

```bash
# Compile TypeScript
npm run build

# Output will be in dist/ directory
```

### Using PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js --env production

# Monitor
pm2 monit

# View logs
pm2 logs movzz-backend

# Restart
pm2 restart movzz-backend

# Stop
pm2 stop movzz-backend
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
DATABASE_URL="postgresql://user:password@your-db-host:5432/movzz_prod"
REDIS_URL="redis://your-redis-host:6379"
JWT_SECRET="your-production-secret-key"
ENABLE_CACHING=true

# Provider APIs (get from respective platforms)
UBER_CLIENT_ID="your-uber-client-id"
UBER_CLIENT_SECRET="your-uber-client-secret"
OLA_API_KEY="your-ola-api-key"
RAPIDO_API_KEY="your-rapido-api-key"

# Twilio (for SMS OTP)
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"
TWILIO_PHONE_NUMBER="+1234567890"

# Google Maps
GOOGLE_MAPS_API_KEY="your-google-maps-key"
```

---

## 🔐 Security Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Use strong database password
- [ ] Enable HTTPS (use reverse proxy like Nginx)
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS for your frontend domain
- [ ] Enable rate limiting
- [ ] Set up monitoring (e.g., Sentry, LogRocket)
- [ ] Regular database backups
- [ ] Keep dependencies updated

---

## 📚 Next Steps

1. **Connect Frontend**
   - Update frontend API base URL to `http://localhost:5000/api/v1`
   - Implement authentication flow
   - Test booking flow end-to-end

2. **Integrate Real Provider APIs**
   - Sign up for Uber Developer account
   - Get Ola API credentials
   - Implement actual API calls in `provider.service.ts`

3. **Add Payment Gateway**
   - Integrate Razorpay/Stripe
   - Implement payment flow
   - Add webhook handlers

4. **Set Up Monitoring**
   - Add error tracking (Sentry)
   - Set up logging aggregation
   - Configure alerts

---

## 🆘 Getting Help

- **Documentation**: Check `README.md` for API docs
- **Logs**: Check `logs/` directory for error details
- **Database**: Use Prisma Studio to inspect data
- **Issues**: Create GitHub issue with error logs

---

## 🎉 Success!

If you've reached here, your backend is ready! 🚀

**Test the complete flow:**
1. ✅ Health check works
2. ✅ Can send OTP
3. ✅ Can verify OTP and get token
4. ✅ Can search rides with token
5. ✅ Database is connected
6. ✅ Logs are being written

**You're ready to build MOVZZ!** 💪
