# 🚀 MOVZZ Backend

Production-ready backend for MOVZZ - Multi-modal Transport Orchestration Engine.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)

---

## ✨ Features

### Core Functionality
- ✅ **Multi-Provider Orchestration** - Uber, Ola, Rapido integration
- ✅ **Real-time Updates** - WebSocket support for live booking status
- ✅ **Smart Caching** - Redis-based caching for provider estimates
- ✅ **Phone Authentication** - OTP-based login via Twilio
- ✅ **JWT Auth** - Secure token-based authentication
- ✅ **Rate Limiting** - Protection against abuse
- ✅ **Request Logging** - Winston-based comprehensive logging
- ✅ **Error Handling** - Centralized error management
- ✅ **Input Validation** - Zod schema validation

### Advanced Features
- 🔄 **Provider Comparison** - Compare prices across all providers
- 📊 **Analytics** - Track route performance and provider reliability
- 💾 **Intelligent Caching** - 5-minute cache for estimates
- 🔐 **Secure** - Helmet.js, CORS, rate limiting
- 📱 **Mobile-Ready** - RESTful API designed for mobile apps

---

## 🛠 Tech Stack

| Category | Technology |
|----------|-----------|
| **Runtime** | Node.js 18+ |
| **Language** | TypeScript 5.7 |
| **Framework** | Express.js 4.21 |
| **Database** | PostgreSQL + Prisma ORM |
| **Caching** | Redis |
| **Auth** | JWT + Twilio (OTP) |
| **Validation** | Zod |
| **Logging** | Winston |
| **WebSocket** | Socket.io |
| **Testing** | Jest + ts-jest |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     API Gateway                          │
│              (Express + Middleware)                      │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼────────┐ ┌─────▼──────┐ ┌───────▼────────┐
│  Auth Routes   │ │  Booking   │ │   Provider     │
│                │ │   Routes   │ │    Routes      │
└───────┬────────┘ └─────┬──────┘ └───────┬────────┘
        │                 │                 │
┌───────▼────────┐ ┌─────▼──────┐ ┌───────▼────────┐
│ Auth Service   │ │  Booking   │ │   Provider     │
│                │ │  Service   │ │   Service      │
└───────┬────────┘ └─────┬──────┘ └───────┬────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼────────┐ ┌─────▼──────┐ ┌───────▼────────┐
│   PostgreSQL   │ │   Redis    │ │  Provider APIs │
│   (Prisma)     │ │  (Cache)   │ │ (Uber/Ola/etc) │
└────────────────┘ └────────────┘ └────────────────┘
```

### Layer Responsibilities

1. **Routes** - HTTP endpoint definitions
2. **Controllers** - Request/response handling
3. **Services** - Business logic & orchestration
4. **Models** - Database schema (Prisma)
5. **Middleware** - Auth, validation, logging, errors

---

## 🚀 Quick Start

### Prerequisites

```bash
# Required
- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+
- npm or yarn

# Optional (for production)
- Docker
- PM2
```

### Installation

```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# 4. Set up database
npm run prisma:generate
npm run prisma:migrate

# 5. Start development server
npm run dev
```

The server will start at `http://localhost:5000`

### Verify Installation

```bash
# Health check
curl http://localhost:5000/health

# Expected response:
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 123.45,
  "environment": "development"
}
```

---

## 📚 API Documentation

### Base URL
```
Development: http://localhost:5000/api/v1
Production: https://api.movzz.com/api/v1
```

### Authentication

All protected endpoints require a Bearer token:
```
Authorization: Bearer <your-jwt-token>
```

### Endpoints

#### 🔐 Authentication

**Send OTP**
```http
POST /api/v1/auth/send-otp
Content-Type: application/json

{
  "phone": "+919876543210"
}
```

**Verify OTP**
```http
POST /api/v1/auth/verify-otp
Content-Type: application/json

{
  "phone": "+919876543210",
  "code": "123456"
}

Response:
{
  "success": true,
  "data": {
    "user": { "id": "...", "phone": "..." },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**Get Current User**
```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

#### 🚗 Bookings

**Search Rides**
```http
POST /api/v1/bookings/search
Authorization: Bearer <token>
Content-Type: application/json

{
  "pickupLat": 13.0827,
  "pickupLng": 80.2707,
  "dropLat": 12.9941,
  "dropLng": 80.1709,
  "vehicleTypes": ["cab", "bike", "auto"]
}

Response:
{
  "success": true,
  "data": {
    "distance": 15.2,
    "rides": [
      {
        "provider": "rapido",
        "vehicleType": "bike",
        "estimatedPrice": 132,
        "estimatedETA": 30
      },
      ...
    ]
  }
}
```

**Create Booking**
```http
POST /api/v1/bookings/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "pickupLat": 13.0827,
  "pickupLng": 80.2707,
  "dropLat": 12.9941,
  "dropLng": 80.1709,
  "pickupAddress": "Chennai Central",
  "dropAddress": "Chennai Airport",
  "provider": "uber",
  "vehicleType": "cab",
  "estimatedPrice": 349,
  "paymentMethod": "cash"
}
```

**Get User Bookings**
```http
GET /api/v1/bookings?status=PENDING&limit=10&offset=0
Authorization: Bearer <token>
```

**Get Booking by ID**
```http
GET /api/v1/bookings/:bookingId
Authorization: Bearer <token>
```

**Cancel Booking**
```http
PATCH /api/v1/bookings/:bookingId/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Changed plans"
}
```

#### 🏢 Providers

**Get Available Providers**
```http
GET /api/v1/providers/available
```

**Compare Providers**
```http
GET /api/v1/providers/compare?pickupLat=13.0827&pickupLng=80.2707&dropLat=12.9941&dropLng=80.1709&vehicleType=cab
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "cheapest": { "provider": "rapido", "price": 289 },
    "fastest": { "provider": "uber", "eta": 4 },
    "all": [...]
  }
}
```

#### 👤 User

**Get Profile**
```http
GET /api/v1/users/profile
Authorization: Bearer <token>
```

**Update Profile**
```http
PATCH /api/v1/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Get Saved Locations**
```http
GET /api/v1/users/saved-locations
Authorization: Bearer <token>
```

**Add Saved Location**
```http
POST /api/v1/users/saved-locations
Authorization: Bearer <token>
Content-Type: application/json

{
  "label": "Home",
  "address": "123 Main St, Chennai",
  "latitude": 13.0827,
  "longitude": 80.2707
}
```

---

## 🗄 Database Schema

### Key Models

**User**
- Authentication & profile data
- Saved locations
- Booking history

**Booking**
- Journey details (pickup/drop)
- Provider & vehicle info
- Status tracking
- Payment details

**ProviderCache**
- Cached estimates (5 min TTL)
- Route-based caching
- Surge pricing data

**ProviderLog**
- API call logging
- Performance metrics
- Error tracking

See `prisma/schema.prisma` for complete schema.

---

## 🔧 Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/movzz_dev"

# JWT
JWT_SECRET="your-super-secret-key"
JWT_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV=development
```

### Optional Variables

```bash
# Redis (for caching)
REDIS_URL="redis://localhost:6379"

# Twilio (for OTP)
TWILIO_ACCOUNT_SID="your-sid"
TWILIO_AUTH_TOKEN="your-token"
TWILIO_PHONE_NUMBER="+1234567890"

# Provider APIs
UBER_CLIENT_ID="your-uber-client-id"
OLA_API_KEY="your-ola-api-key"
RAPIDO_API_KEY="your-rapido-api-key"

# Google Maps
GOOGLE_MAPS_API_KEY="your-google-maps-key"

# Feature Flags
ENABLE_CACHING=true
ENABLE_UBER=true
ENABLE_OLA=true
ENABLE_RAPIDO=true
```

---

## 💻 Development

### Available Scripts

```bash
# Development
npm run dev              # Start with hot reload (tsx watch)

# Build
npm run build            # Compile TypeScript to JavaScript

# Production
npm start                # Run compiled code

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio (GUI)

# Testing
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format with Prettier
```

### Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── config.ts    # Environment config
│   │   ├── database.ts  # Prisma client
│   │   └── logger.ts    # Winston logger
│   ├── controllers/     # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── booking.controller.ts
│   │   ├── provider.controller.ts
│   │   └── user.controller.ts
│   ├── services/        # Business logic
│   │   ├── auth.service.ts
│   │   ├── booking.service.ts
│   │   ├── provider.service.ts
│   │   └── user.service.ts
│   ├── middleware/      # Express middleware
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   ├── rateLimiter.ts
│   │   └── requestLogger.ts
│   ├── routes/          # API routes
│   │   ├── auth.routes.ts
│   │   ├── booking.routes.ts
│   │   ├── provider.routes.ts
│   │   └── user.routes.ts
│   └── server.ts        # Entry point
├── prisma/
│   └── schema.prisma    # Database schema
├── logs/                # Log files (auto-generated)
├── .env                 # Environment variables
├── package.json
└── tsconfig.json
```

### Adding a New Feature

1. **Define Route** in `src/routes/`
2. **Create Controller** in `src/controllers/`
3. **Implement Service** in `src/services/`
4. **Update Database** in `prisma/schema.prisma`
5. **Run Migration** `npm run prisma:migrate`
6. **Test** the endpoint

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- auth.service.test.ts

# Watch mode
npm run test:watch
```

### Test Structure

```
tests/
├── unit/
│   ├── services/
│   └── utils/
├── integration/
│   └── api/
└── e2e/
```

---

## 🚀 Deployment

### Using Docker

```bash
# Build image
docker build -t movzz-backend .

# Run container
docker run -p 5000:5000 --env-file .env movzz-backend
```

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Build
npm run build

# Start with PM2
pm2 start dist/server.js --name movzz-backend

# Monitor
pm2 monit

# Logs
pm2 logs movzz-backend
```

### Environment Setup

**Development**
```bash
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_CACHING=false
```

**Production**
```bash
NODE_ENV=production
LOG_LEVEL=info
ENABLE_CACHING=true
```

---

## 📊 Monitoring

### Logs

Logs are stored in `logs/` directory:
- `combined.log` - All logs
- `error.log` - Error logs only
- `exceptions.log` - Uncaught exceptions
- `rejections.log` - Unhandled promise rejections

### Health Check

```bash
curl http://localhost:5000/health
```

### Metrics

- Request latency
- Provider API response times
- Cache hit rates
- Error rates

---

## 🔒 Security

- ✅ Helmet.js for HTTP headers
- ✅ CORS configuration
- ✅ Rate limiting (100 req/15min)
- ✅ JWT authentication
- ✅ Input validation (Zod)
- ✅ SQL injection protection (Prisma)
- ✅ XSS protection

---

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm test`
4. Run linter: `npm run lint`
5. Submit a pull request

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🆘 Support

- **Documentation**: [docs.movzz.com](https://docs.movzz.com)
- **Issues**: [GitHub Issues](https://github.com/tathagatamovzz-cell/MOVZZ/issues)
- **Email**: support@movzz.com

---

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Core API endpoints
- ✅ Authentication
- ✅ Provider orchestration
- ✅ Basic caching

### Phase 2 (Next 2 weeks)
- 🔄 Real provider API integration
- 🔄 Payment gateway integration
- 🔄 Advanced analytics
- 🔄 Multi-leg journey support

### Phase 3 (Weeks 3-4)
- 📅 Real-time driver tracking
- 📅 Push notifications
- 📅 Ride sharing
- 📅 Loyalty program

---

**Built with ❤️ by the MOVZZ Team**
