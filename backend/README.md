# 🚗 MOVZZY Backend — Complete Documentation

> **Version:** 1.0.0  
> **Last Updated:** February 2026  
> **Tech Stack:** Node.js · TypeScript · Express.js · PostgreSQL · Prisma ORM  

---

## 📑 Table of Contents

1. [What is MOVZZY?](#-what-is-movzzy)
2. [Prerequisites (What You Need Before Starting)](#-prerequisites-what-you-need-before-starting)
3. [Installation (Step-by-Step)](#-installation-step-by-step)
4. [Running the Server](#-running-the-server)
5. [Project Structure (Every File Explained)](#-project-structure-every-file-explained)
6. [Architecture Overview](#-architecture-overview)
7. [Database Schema (All 8 Tables)](#-database-schema-all-8-tables)
8. [API Endpoints (Complete Reference)](#-api-endpoints-complete-reference)
9. [Authentication Flow](#-authentication-flow)
10. [Booking Flow (State Machine)](#-booking-flow-state-machine)
11. [Provider Scoring — "The Brain"](#-provider-scoring--the-brain)
12. [Recovery & Compensation System](#-recovery--compensation-system)
13. [Admin Dashboard](#-admin-dashboard)
14. [Testing](#-testing)
15. [Configuration & Environment Variables](#-configuration--environment-variables)
16. [How to Test with Postman / curl](#-how-to-test-with-postman--curl)
17. [Common Errors & Troubleshooting](#-common-errors--troubleshooting)
18. [Tech Decisions & Why](#-tech-decisions--why)

---

## 🚗 What is MOVZZY?

MOVZZY is a **ride-booking platform** (like Uber/Ola) built from scratch. The backend handles:

- **User authentication** via OTP (no passwords)
- **Booking management** with a full state machine
- **Intelligent provider (driver) assignment** using a scoring algorithm
- **Automatic failure recovery** with retries and escalation
- **User compensation** (₹100 credits for failed bookings)
- **Admin dashboard** for operations management

**Key Differentiator:** MOVZZY has a "HIGH_RELIABILITY" trip type where only drivers with 90%+ success rates are eligible — ensuring premium service quality.

---

## 📋 Prerequisites (What You Need Before Starting)

Before you do ANYTHING, make sure you have these installed:

| Tool | Version | How to Check | Download Link |
|------|---------|-------------|---------------|
| **Node.js** | v18 or higher | `node --version` | [nodejs.org](https://nodejs.org) |
| **npm** | v8 or higher | `npm --version` | Comes with Node.js |
| **PostgreSQL** | v15 or higher | `psql --version` | [postgresql.org](https://postgresql.org/download) |
| **Git** | Any | `git --version` | [git-scm.com](https://git-scm.com) |

### ⚠️ Important Notes:
- **Windows users:** PostgreSQL installer adds itself to PATH automatically. If `psql` doesn't work in terminal, find it manually at `C:\Program Files\PostgreSQL\<version>\bin\`
- **You need to know your PostgreSQL password.** If you set it during installation, remember it. The default username is `postgres`.

---

## 🔧 Installation (Step-by-Step)

### Step 1: Clone the Repository
```bash
git clone <your-repo-url>
cd MOVZZY/backend
```

### Step 2: Install Dependencies
```bash
npm install
```
This installs **all** packages listed in `package.json`. It will create a `node_modules/` folder (this is normal, do NOT commit it).

### Step 3: Set Up Environment Variables

Open the `.env` file and update the `DATABASE_URL` with YOUR PostgreSQL password:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD_HERE@localhost:5432/movzzy_db?schema=public"
```

**Breaking this URL down:**
| Part | Meaning |
|------|---------|
| `postgresql://` | Database type |
| `postgres` | Username (default PostgreSQL user) |
| `YOUR_PASSWORD_HERE` | The password YOU set during PostgreSQL installation |
| `localhost` | Database is on your machine |
| `5432` | Default PostgreSQL port |
| `movzzy_db` | Name of the database (we'll create it next) |
| `?schema=public` | Use the default schema |

### Step 4: Create the Database

**On Windows (PowerShell):**
```powershell
$env:PGPASSWORD='YOUR_PASSWORD'; & "C:\Program Files\PostgreSQL\18\bin\createdb.exe" -U postgres movzzy_db
```

**On Mac/Linux:**
```bash
createdb -U postgres movzzy_db
```

**If you get "database already exists"** — that's fine, skip this step.

### Step 5: Run Database Migrations

This creates all the tables in your database:
```bash
npx prisma migrate dev --name init
```

You should see output like:
```
✔ Generated Prisma Client
Applying migration `20260212015654_init`
```

### Step 6: Generate Prisma Client
```bash
npx prisma generate
```

### Step 7: Verify Everything
```bash
npx tsc --noEmit
```
If this outputs **nothing** — congratulations, everything compiles! If it shows errors, something went wrong.

---

## 🚀 Running the Server

### Development Mode (Recommended)
```bash
npm run dev
```

This starts the server with **hot-reload** — every time you save a file, the server automatically restarts.

You should see:
```
╔══════════════════════════════════════════╗
║         🚗 MOVZZY API SERVER 🚗          ║
╠══════════════════════════════════════════╣
║  Status:  RUNNING                        ║
║  Port:    3000                           ║
║  Env:     development                    ║
╠══════════════════════════════════════════╣
║  Auth:                                   ║
║  POST /api/v1/auth/send-otp              ║
║  POST /api/v1/auth/verify-otp            ║
║  Bookings:                               ║
║  POST /api/v1/bookings                   ║
║  GET  /api/v1/bookings/:id               ║
║  POST /api/v1/bookings/:id/cancel        ║
║  Admin:                                  ║
║  GET  /api/v1/admin/dashboard            ║
║  GET  /api/v1/admin/providers            ║
╚══════════════════════════════════════════╝
```

### Production Mode
```bash
npm run build    # Compiles TypeScript to JavaScript
npm start        # Runs the compiled JavaScript
```

### Verify Server is Running
Open your browser and go to: **http://localhost:3000/health**

You should see:
```json
{
  "success": true,
  "status": "healthy",
  "database": "connected"
}
```

---

## 📂 Project Structure (Every File Explained)

```
backend/
├── .env                          # Secret config (passwords, keys) — NEVER COMMIT THIS
├── .gitignore                    # Files Git should ignore
├── docker-compose.yml            # Docker config (optional, for containerized DB)
├── package.json                  # Dependencies and npm scripts
├── tsconfig.json                 # TypeScript compiler settings
│
├── prisma/
│   ├── schema.prisma             # DATABASE SCHEMA — defines all tables
│   └── migrations/               # SQL migration files (auto-generated)
│       └── 20260212015654_init/
│           └── migration.sql     # The actual SQL that created tables
│
└── src/
    ├── index.ts                  # 🟢 ENTRY POINT — starts the Express server
    │
    ├── config/
    │   ├── database.ts           # Prisma client singleton (DB connection)
    │   └── redis.ts              # In-memory cache (OTP storage)
    │
    ├── controllers/              # Handle HTTP requests, call services
    │   ├── auth.controller.ts    # Login (send OTP, verify OTP)
    │   ├── booking.controller.ts # Create/get/cancel bookings
    │   └── admin.controller.ts   # Dashboard, provider management
    │
    ├── middleware/
    │   └── auth.middleware.ts    # JWT token verification middleware
    │
    ├── routes/                   # URL → Controller mapping
    │   ├── auth.routes.ts        # /api/v1/auth/*
    │   ├── booking.routes.ts     # /api/v1/bookings/*
    │   └── admin.routes.ts       # /api/v1/admin/*
    │
    ├── services/                 # BUSINESS LOGIC — the real brains
    │   ├── jwt.service.ts        # Generate/verify JWT tokens
    │   ├── sms.service.ts        # Send OTPs (mock + Twilio placeholder)
    │   ├── booking.service.ts    # Booking state machine + provider assignment
    │   ├── provider-scoring.service.ts  # 🧠 "THE BRAIN" — scoring algorithm
    │   └── recovery.service.ts   # Retry logic + compensation
    │
    ├── tests/
    │   ├── scoring.test.ts       # Unit tests for provider scoring
    │   └── integration.test.ts   # End-to-end booking flow tests
    │
    ├── types/
    │   └── index.ts              # TypeScript interfaces (type safety)
    │
    ├── utils/
    │   ├── otp.ts                # OTP generator + referral code generator
    │   └── phone.ts              # Indian phone number validation/normalization
    │
    └── validators/
        ├── auth.validator.ts     # Zod schema for auth input
        └── booking.validator.ts  # Zod schema for booking input
```

### What Each Folder Does:

| Folder | Purpose | Think of it as... |
|--------|---------|-------------------|
| `config/` | Database and cache connections | The "plumbing" |
| `controllers/` | Receive HTTP requests, send HTTP responses | The "receptionist" |
| `routes/` | Map URLs to controller functions | The "directory" |
| `services/` | Core business logic | The "brain" |
| `middleware/` | Code that runs BEFORE controllers | The "security guard" |
| `validators/` | Input validation schemas | The "quality checker" |
| `utils/` | Small helper functions | The "toolbox" |
| `types/` | TypeScript type definitions | The "blueprint" |
| `tests/` | Automated tests | The "quality assurance team" |

---

## 🏗️ Architecture Overview

```
                    ┌─────────────┐
                    │   Client    │  (Frontend / Postman / curl)
                    └──────┬──────┘
                           │ HTTP Request
                           ▼
                    ┌──────────────┐
                    │   Express    │  (index.ts)
                    │   Server     │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌───────────┐
        │ Security │ │  Body    │ │  Logging  │
        │ Helmet   │ │  Parser  │ │  Morgan   │
        │ CORS     │ │  JSON    │ │           │
        │ RateLimit│ │          │ │           │
        └──────────┘ └──────────┘ └───────────┘
              │            │            │
              └────────────┼────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Routes     │  auth.routes / booking.routes / admin.routes
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Middleware   │  auth.middleware (JWT verification)
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Controllers  │  auth / booking / admin controllers
                    └──────┬───────┘
                           │
              ┌────────────┼───────────────┐
              ▼            ▼               ▼
        ┌──────────┐ ┌───────────────┐ ┌──────────┐
        │ Booking  │ │ Provider      │ │ Recovery │
        │ Service  │ │ Scoring       │ │ Service  │
        │          │ │ ("The Brain") │ │          │
        └────┬─────┘ └───────┬───────┘ └────┬─────┘
             │               │              │
             └───────────────┼──────────────┘
                             │
                             ▼
                    ┌──────────────┐
                    │   Prisma     │  (ORM — talks to database)
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  PostgreSQL  │  (The actual database)
                    └──────────────┘
```

### Request Lifecycle (What happens when a request comes in):

1. **Client** sends HTTP request (e.g., `POST /api/v1/bookings`)
2. **Express** receives it
3. **Security middleware** runs:
   - Helmet adds security headers
   - CORS validates the origin
   - Rate limiter checks if IP has made too many requests
4. **Body parser** converts JSON body to JavaScript object
5. **Morgan** logs the request to console
6. **Router** matches the URL to the right controller
7. **Auth middleware** checks the JWT token (for protected routes)
8. **Controller** validates input and calls the appropriate service
9. **Service** runs business logic and talks to database via Prisma
10. **Controller** formats the response and sends it back

---

## 🗄️ Database Schema (All 8 Tables)

### Visual Overview

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│   User   │────<│   Booking    │>────│   Provider   │
└──────────┘     └──────┬───────┘     └──────┬───────┘
     │                  │                    │
     │           ┌──────┼───────┐            │
     │           │      │       │            │
     │           ▼      ▼       ▼            ▼
     │      ┌────────┐ ┌────┐ ┌────────┐ ┌────────┐
     │      │Attempts│ │Logs│ │Credits │ │Metrics │
     │      └────────┘ └────┘ └────────┘ └────────┘
     │                                       │
     │                                       ▼
     │                                  ┌────────┐
     └─────────────────────────────────>│Payouts │
                                        └────────┘
```

### Table 1: `User` — The people who book rides

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (cuid) | Unique identifier, auto-generated |
| `phone` | String | Indian phone number (+919xxxxxxxxx), **unique** |
| `name` | String? | Optional display name |
| `email` | String? | Optional email address |
| `referralCode` | String | Unique code like "USER6729" for referrals |
| `referredBy` | String? | Referral code of who referred this user |
| `createdAt` | DateTime | When the account was created |
| `updatedAt` | DateTime | Last modification timestamp |
| `lastLoginAt` | DateTime? | Last time they verified OTP |

### Table 2: `Booking` — Every ride request

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (cuid) | Unique booking ID |
| `userId` | String | Who made the booking (FK → User) |
| `userPhone` | String | Phone of the booker |
| `pickup` | String | Pickup address text |
| `pickupLat` | Float? | Pickup latitude |
| `pickupLng` | Float? | Pickup longitude |
| `dropoff` | String | Drop-off address text |
| `dropoffLat` | Float? | Drop-off latitude |
| `dropoffLng` | Float? | Drop-off longitude |
| `tripType` | Enum | HIGH_RELIABILITY or STANDARD |
| `providerId` | String? | Assigned driver (FK → Provider) |
| `providerType` | Enum? | INDIVIDUAL_DRIVER or FLEET_OPERATOR |
| `state` | Enum | Current booking state (see State Machine below) |
| `previousState` | Enum? | State before the current one |
| `fareEstimate` | Int | Estimated fare **in paise** (₹150 = 15000) |
| `fareActual` | Int? | Actual fare charged (after completion) |
| `commissionRate` | Float | Platform cut (default 10%) |
| `commissionAmount` | Int? | Commission in paise |
| `createdAt` | DateTime | When booking was created |
| `confirmedAt` | DateTime? | When a provider accepted |
| `startedAt` | DateTime? | When the ride started |
| `completedAt` | DateTime? | When the ride finished |
| `failedAt` | DateTime? | When the booking failed |
| `timeoutAt` | DateTime? | 5-minute deadline to find a provider |
| `recoveryAttempts` | Int | How many times we retried finding a provider |
| `manualIntervention` | Boolean | Whether an admin manually handled this |
| `metadata` | JSON? | Extra data (flexible, schema-less) |

> **⚠️ Why paise?** All money values are stored in **paise** (1 rupee = 100 paise) to avoid floating-point rounding errors. ₹150.50 is stored as `15050`. This is industry standard practice (Stripe does cents, PayPal does minor units).

### Table 3: `Provider` — Drivers / Fleet operators

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (cuid) | Unique provider ID |
| `name` | String | Driver's name |
| `phone` | String | Phone number, **unique** |
| `type` | Enum | INDIVIDUAL_DRIVER or FLEET_OPERATOR |
| `vehicleModel` | String? | e.g., "Maruti Swift" |
| `vehiclePlate` | String? | e.g., "DL01AB1234" |
| `apiEndpoint` | String? | For fleet APIs (future use) |
| `commissionRate` | Float | How much MOVZZY takes (default 10%) |
| `paymentTerms` | String | When they get paid (default "T+2") |
| `active` | Boolean | Whether they're currently available |
| `pausedUntil` | DateTime? | If paused, when they become active again |
| `pauseReason` | String? | Why they were paused |
| `reliability` | Float | Success rate 0.0-1.0 (e.g., 0.95 = 95%) |
| `rating` | Float | User rating 1.0-5.0 |
| `totalRides` | Int | Lifetime ride count |
| `successfulRides` | Int | How many rides they completed |
| `createdAt` | DateTime | When registered |
| `lastActiveAt` | DateTime? | Last activity timestamp |

### Table 4: `ProviderMetric` — Daily performance snapshots

Tracks how each provider performed **each day**. Used for analytics and the scoring algorithm.

| Column | Type | Description |
|--------|------|-------------|
| `providerId` | String | FK → Provider |
| `date` | Date | Which day |
| `totalBookings` | Int | Bookings assigned that day |
| `successfulBookings` | Int | Successfully completed |
| `failedBookings` | Int | Failed |
| `reliabilityScore` | Float | That day's reliability |
| `totalRevenue` | Int | Revenue generated (paise) |
| `totalCommission` | Int | Commission earned (paise) |

### Table 5: `BookingAttempt` — Provider assignment attempts

Every time the system tries to assign a provider to a booking, it creates a record here. Useful for debugging.

| Column | Type | Description |
|--------|------|-------------|
| `bookingId` | String | FK → Booking |
| `providerId` | String | FK → Provider |
| `attemptNumber` | Int | 1st, 2nd, 3rd attempt |
| `success` | Boolean | Did this attempt work? |
| `score` | Float? | Provider's score when assigned |
| `reliability` | Float? | Provider's reliability when assigned |

### Table 6: `BookingLog` — Audit trail for every booking

Every significant event in a booking's lifecycle is logged here. Think of it as the booking's "diary."

| Column | Type | Description |
|--------|------|-------------|
| `bookingId` | String | FK → Booking |
| `event` | String | Event name, e.g., "CREATED", "PROVIDER_ASSIGNED" |
| `message` | String | Human-readable description |
| `metadata` | JSON? | Extra structured data |
| `createdAt` | DateTime | When the event happened |

### Table 7: `UserCredit` — Compensation credits

When a booking fails, the user gets ₹100 credit. These credits are tracked here.

| Column | Type | Description |
|--------|------|-------------|
| `userId` | String | FK → User |
| `amount` | Int | Credit amount in paise (10000 = ₹100) |
| `reason` | String | Why the credit was issued |
| `used` | Boolean | Whether the credit has been redeemed |
| `usedInBookingId` | String? | Which booking it's linked to |
| `expiresAt` | DateTime | Credits expire after 30 days |

### Table 8: `Payout` — Provider payment records

Tracks payments to providers. Status goes: PENDING → PROCESSING → COMPLETED.

| Column | Type | Description |
|--------|------|-------------|
| `providerId` | String | FK → Provider |
| `totalRevenue` | Int | Gross amount (paise) |
| `commissionAmount` | Int | MOVZZY's cut (paise) |
| `netPayout` | Int | What the provider gets (paise) |
| `status` | Enum | PENDING / PROCESSING / COMPLETED / FAILED |

---

## 📡 API Endpoints (Complete Reference)

**Base URL:** `http://localhost:3000`

### 🔓 Public Endpoints (No Authentication Needed)

#### `GET /health` — Health Check
Check if the server and database are running.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-02-15T12:45:25.742Z",
  "uptime": 10.85,
  "environment": "development",
  "database": "connected"
}
```

---

#### `POST /api/v1/auth/send-otp` — Request Login OTP
Send an OTP to a phone number. Creates a new user account if one doesn't exist.

**Request Body:**
```json
{
  "phone": "9876543210"
}
```

**Response (dev mode includes OTP):**
```json
{
  "success": true,
  "message": "OTP sent to +919876543210",
  "expiresIn": 300,
  "otp": "992687"
}
```

> **⚠️ `otp` field only appears in development mode.** In production, the OTP is sent via SMS only.

---

#### `POST /api/v1/auth/verify-otp` — Verify OTP & Get Token
Submit the OTP to get a JWT authentication token.

**Request Body:**
```json
{
  "phone": "9876543210",
  "otp": "992687"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "cmlnk0xyz123",
    "phone": "+919876543210",
    "name": null,
    "referralCode": "USER6729"
  }
}
```

> **🔑 Save the `token`!** You need it for ALL subsequent requests. Add it as a header: `Authorization: Bearer <token>`

---

### 🔒 Protected Endpoints (Require JWT Token)

**All requests below require this header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

---

#### `POST /api/v1/bookings` — Create a Booking

**Request Body:**
```json
{
  "pickup": "Connaught Place, Delhi",
  "dropoff": "India Gate, Delhi",
  "pickupLat": 28.6315,
  "pickupLng": 77.2167,
  "dropoffLat": 28.6129,
  "dropoffLng": 77.2295,
  "tripType": "HIGH_RELIABILITY"
}
```

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `pickup` | ✅ Yes | String | Pickup address |
| `dropoff` | ✅ Yes | String | Drop-off address |
| `pickupLat` | Optional | Number | Pickup latitude |
| `pickupLng` | Optional | Number | Pickup longitude |
| `dropoffLat` | Optional | Number | Drop-off latitude |
| `dropoffLng` | Optional | Number | Drop-off longitude |
| `tripType` | Optional | String | `HIGH_RELIABILITY` (default) or `STANDARD` |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cmlnk0abc123",
    "state": "SEARCHING",
    "pickup": "Connaught Place, Delhi",
    "dropoff": "India Gate, Delhi",
    "fareEstimate": 5000,
    "fareEstimateRupees": 50,
    "tripType": "HIGH_RELIABILITY",
    "timeoutAt": "2026-02-15T13:00:00.000Z"
  },
  "message": "Booking created. Searching for provider..."
}
```

---

#### `GET /api/v1/bookings` — List My Bookings

**Query Parameters:**
| Param | Default | Description |
|-------|---------|-------------|
| `page` | 1 | Page number |
| `limit` | 10 | Items per page (max 50) |

**Response:**
```json
{
  "success": true,
  "data": [ ... array of bookings ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

---

#### `GET /api/v1/bookings/:id` — Get Booking Details

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cmlnk0abc123",
    "state": "CONFIRMED",
    "pickup": "Connaught Place, Delhi",
    "dropoff": "India Gate, Delhi",
    "fareEstimate": 5000,
    "fareEstimateRupees": 50,
    "provider": {
      "id": "clm123",
      "name": "Rajesh Kumar",
      "phone": "+919876543210",
      "vehicleModel": "Maruti Swift",
      "vehiclePlate": "DL01AB1234",
      "rating": 4.8,
      "reliability": 0.95
    },
    "attempts": 1,
    "logs": [ ... event history ... ]
  }
}
```

---

#### `POST /api/v1/bookings/:id/cancel` — Cancel a Booking

**Response:**
```json
{
  "success": true,
  "message": "Booking cancelled"
}
```

---

#### `GET /api/v1/bookings/credits` — Get My Credits

**Response:**
```json
{
  "success": true,
  "data": {
    "credits": [
      {
        "id": "clm456",
        "amount": 10000,
        "reason": "Compensation for failed booking",
        "expiresAt": "2026-03-15T00:00:00.000Z",
        "used": false
      }
    ],
    "totalAvailable": 10000,
    "totalAvailableRupees": 100
  }
}
```

---

### 🛡️ Admin Endpoints (Require JWT Token)

#### `GET /api/v1/admin/dashboard` — System Overview

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 150,
      "totalBookings": 1200,
      "todayBookings": 45,
      "activeProviders": 30,
      "escalatedBookings": 2
    },
    "bookingsByState": {
      "COMPLETED": 900,
      "SEARCHING": 5,
      "CONFIRMED": 10,
      "FAILED": 50,
      "CANCELLED": 200
    },
    "recentBookings": [ ... last 10 bookings ... ]
  }
}
```

---

#### `GET /api/v1/admin/metrics` — Weekly System Metrics

Returns revenue, commission, failure rates, and top providers.

---

#### `GET /api/v1/admin/bookings/escalated` — View Escalated Bookings

Returns all bookings in `MANUAL_ESCALATION` state, ordered oldest-first (FIFO queue).

---

#### `POST /api/v1/admin/bookings/:bookingId/confirm` — Manually Assign Provider

**Request Body:**
```json
{
  "providerId": "clm789..."
}
```

---

#### `GET /api/v1/admin/providers` — List All Providers

**Query Parameters:**
| Param | Default | Description |
|-------|---------|-------------|
| `page` | 1 | Page number |
| `limit` | 20 | Items per page (max 100) |
| `active` | – | Set to `true` to show only active ones |

---

#### `POST /api/v1/admin/providers` — Register New Provider

**Request Body:**
```json
{
  "name": "Rajesh Kumar",
  "phone": "+919876543210",
  "type": "INDIVIDUAL_DRIVER",
  "vehicleModel": "Maruti Swift",
  "vehiclePlate": "DL01AB1234",
  "commissionRate": 0.10
}
```

---

#### `PUT /api/v1/admin/providers/:id` — Update Provider

Send any fields you want to update in the body.

---

#### `POST /api/v1/admin/providers/:id/pause` — Pause a Provider

**Request Body:**
```json
{
  "reason": "Vehicle maintenance",
  "durationHours": 24
}
```

---

#### `POST /api/v1/admin/providers/:id/resume` — Resume a Paused Provider

No body needed.

---

#### `GET /api/v1/admin/providers/:id/metrics` — Provider Performance

**Query Parameters:**
| Param | Default | Description |
|-------|---------|-------------|
| `days` | 7 | Number of past days to show |

---

## 🔐 Authentication Flow

```
┌────────────┐          ┌────────────┐          ┌──────────┐
│   Client   │          │   Server   │          │   Cache  │
│ (App/Web)  │          │ (Express)  │          │ (Redis)  │
└─────┬──────┘          └─────┬──────┘          └────┬─────┘
      │                       │                      │
      │  POST /send-otp       │                      │
      │  { phone: "987..." }  │                      │
      │──────────────────────>│                      │
      │                       │                      │
      │                       │  Generate 6-digit OTP│
      │                       │  Store OTP in cache  │
      │                       │─────────────────────>│
      │                       │                      │
      │                       │  "Send" via SMS      │
      │                       │  (mock: console.log) │
      │                       │                      │
      │  { success, otp* }    │                      │
      │<──────────────────────│                      │
      │                       │                      │
      │  POST /verify-otp     │                      │
      │  { phone, otp }       │                      │
      │──────────────────────>│                      │
      │                       │  Check OTP in cache  │
      │                       │─────────────────────>│
      │                       │                      │
      │                       │  OTP matches! ✅     │
      │                       │<─────────────────────│
      │                       │                      │
      │                       │  Create/find user    │
      │                       │  Generate JWT token  │
      │                       │                      │
      │  { token, user }      │                      │
      │<──────────────────────│                      │
      │                       │                      │
      │  GET /api/v1/bookings │                      │
      │  Authorization: Bearer│<token>               │
      │──────────────────────>│                      │
      │                       │  Verify JWT ✅       │
      │                       │  req.user = decoded  │
      │                       │                      │
      │  { bookings: [...] }  │                      │
      │<──────────────────────│                      │
```

**Important details:**
- OTPs expire after **5 minutes** (300 seconds)
- OTPs are **6 digits** (e.g., "472839")
- JWT tokens contain: `{ userId, phone }` and expire based on `JWT_SECRET` config
- The `*otp` in the send-otp response only appears in **development mode** for testing convenience

---

## 📊 Booking Flow (State Machine)

A booking goes through these states:

```
                              ┌───── CANCELLED
                              │
   SEARCHING ──→ CONFIRMED ──→ IN_PROGRESS ──→ COMPLETED
       │              │              │
       ▼              ▼              ▼
     FAILED         FAILED         FAILED
       │
       ▼
  MANUAL_ESCALATION
       │
       ▼
    CONFIRMED (by admin)
```

### State Descriptions:

| State | Meaning | What Happens |
|-------|---------|--------------|
| `SEARCHING` | Looking for a driver | Auto-assigns using "The Brain" scoring engine |
| `CONFIRMED` | Driver accepted | Waiting for ride to start |
| `IN_PROGRESS` | Ride is happening | Driver is on the way / passenger is in car |
| `COMPLETED` | Ride finished | Fare charged, commission calculated |
| `FAILED` | Something went wrong | Recovery system kicks in (see below) |
| `CANCELLED` | User or system cancelled | No charges |
| `MANUAL_ESCALATION` | Auto-recovery failed | Admin must manually assign a driver |

### Valid Transitions:

| From | Allowed Next States |
|------|-------------------|
| SEARCHING | CONFIRMED, FAILED, CANCELLED, MANUAL_ESCALATION |
| CONFIRMED | IN_PROGRESS, CANCELLED, FAILED |
| IN_PROGRESS | COMPLETED, FAILED |
| COMPLETED | *(terminal state — cannot change)* |
| FAILED | SEARCHING (retry), MANUAL_ESCALATION |
| CANCELLED | *(terminal state — cannot change)* |
| MANUAL_ESCALATION | CONFIRMED, CANCELLED, FAILED |

### What happens when you create a booking:

1. Booking created in `SEARCHING` state
2. **Fare is estimated** using Haversine distance formula (₹12/km, ₹50 minimum)
3. **Async provider search** starts immediately in the background
4. "The Brain" runs `hardFilter()` → `scoreProvider()` → picks the best one
5. If found: state → `CONFIRMED`
6. If not found: **Recovery system** kicks in (3 retries)
7. If recovery fails: state → `MANUAL_ESCALATION` + user gets ₹100 credit

---

## 🧠 Provider Scoring — "The Brain"

This is the core intelligence that decides which driver gets each booking. Located in `provider-scoring.service.ts`.

### How It Works (3-Step Pipeline):

```
Step 1: hardFilter()        Step 2: scoreProvider()     Step 3: findBestProvider()
┌─────────────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│ All Providers (50)   │    │ Eligible Providers    │    │ Ranked by Score      │
│                      │    │                       │    │                      │
│ ❌ Reliability < 90% │→→→│ Score = weighted sum   │→→→│ #1: Rajesh (87.5)    │
│ ❌ Rating < 3.5      │    │ of 5 factors          │    │ #2: Amit (82.1)      │
│ ❌ Paused / Inactive │    │                       │    │ #3: Suresh (78.3)    │
│ ❌ Already tried     │    │ (see formula below)   │    │                      │
│                      │    │                       │    │ → Return #1          │
│ ✅ 12 providers pass │    │                       │    │                      │
└─────────────────────┘     └─────────────────────┘     └──────────────────────┘
```

### Step 1: Hard Filter (Gate)

The following providers are **immediately rejected**:

| Criteria | HIGH_RELIABILITY Trip | STANDARD Trip |
|----------|----------------------|---------------|
| Min Reliability | 90% | 70% |
| Min Rating | 4.0 stars | 3.0 stars |
| Active | Must be active | Must be active |
| Not Paused | Can't be paused | Can't be paused |
| Not Already Tried | For this booking | For this booking |

### Step 2: Scoring Formula

Each surviving provider gets scored on 5 factors:

```
Total Score = (0.35 × Reliability) + (0.20 × Rating) + (0.20 × Completion)
            + (0.10 × Recency) + (0.15 × Proximity)
```

| Factor | Weight | How It's Calculated | Range |
|--------|--------|-------------------|-------|
| **Reliability** | 35% | `reliability × 100` (0.95 → 95) | 0-100 |
| **Rating** | 20% | `(rating - 1) / 4 × 100` (4.8 → 95) | 0-100 |
| **Completion Rate** | 20% | `successfulRides / totalRides × 100` | 0-100 |
| **Recency** | 10% | How recently they were active (see below) | 0-100 |
| **Proximity** | 15% | Placeholder (70) until GPS integration | 0-100 |

**Recency scoring:**
| Last Active | Score |
|------------|-------|
| < 1 hour ago | 100 |
| 1-6 hours | 80 |
| 6-24 hours | 60 |
| 1-3 days | 30 |
| 3+ days | 10 |

### Step 3: Select Best

Providers are sorted by total score (descending) and the highest scorer is assigned.

**Example calculation for a provider:**
```
Rajesh Kumar:
  Reliability: 0.95 → score 95.0 → weighted: 0.35 × 95.0 = 33.25
  Rating: 4.8      → score 95.0 → weighted: 0.20 × 95.0 = 19.00
  Completion: 95%  → score 95.0 → weighted: 0.20 × 95.0 = 19.00
  Recency: 30min   → score 100  → weighted: 0.10 × 100  = 10.00
  Proximity: —     → score 70   → weighted: 0.15 × 70   = 10.50
                                   ─────────────────────────
                                   TOTAL SCORE = 91.75
```

---

## 🔄 Recovery & Compensation System

When the system can't find a provider, it doesn't just give up. Located in `recovery.service.ts`.

### 3-Tier Retry Strategy:

```
Attempt 1: Same strict filters           → "Try another good driver"
    ↓ failed
Attempt 2: Relaxed to STANDARD filters   → "Try any decent driver"
    ↓ failed
Attempt 3: Most relaxed filters          → "Try ANY active driver"
    ↓ failed
ESCALATION: Manual intervention needed   → Admin handles it
    +
COMPENSATION: ₹100 credit to user       → "Sorry for the trouble"
```

### Compensation Rules:

| Rule | Value |
|------|-------|
| Amount per failed booking | ₹100 |
| Credit validity | 30 days |
| Max credits per user per day | 3 (fraud prevention) |
| Duplicate protection | Can't get 2 credits for the same booking |
| Can be applied to | Next booking |

---

## 🛡️ Admin Dashboard

The admin dashboard provides:

1. **System Overview** (`/admin/dashboard`)
   - Total users, bookings, active providers
   - Booking breakdown by state
   - 10 most recent bookings

2. **Escalation Queue** (`/admin/bookings/escalated`)
   - FIFO queue of bookings needing manual attention
   - Includes full attempt history for context

3. **Manual Confirmation** (`/admin/bookings/:id/confirm`)
   - Admin picks a provider and force-assigns them
   - Creates audit log entry

4. **Provider Management**
   - CRUD operations (create, read, update, delete)
   - Pause/resume with duration
   - View per-provider metrics (daily performance)

5. **System Metrics** (`/admin/metrics`)
   - Weekly revenue and commission totals
   - Failure rate percentage
   - Top 5 providers by reliability

---

## 🧪 Testing

### Run Unit Tests (Provider Scoring)
```bash
npm test
```

This tests:
- `hardFilter()` — Correctly filters providers by reliability, rating, active status
- `scoreProvider()` — Scoring algorithm produces valid scores
- `findBestProvider()` — Returns the highest-scoring provider
- `findTopProviders()` — STANDARD mode includes more providers

### Run Integration Tests (Full Booking Flow)
```bash
npm run test:integration
```

This tests:
- OTP generation (6 digits, random)
- OTP cache storage and expiry
- JWT token generation and verification
- Phone number validation (Indian numbers)
- Booking creation (SEARCHING state, fare estimation)
- Booking retrieval (with provider details)
- State transitions (valid and invalid)
- Compensation (₹100 credit issuance, duplicate prevention)

### Run All Tests
```bash
npm run test:all
```

### View Database (Prisma Studio)
```bash
npx prisma studio
```
Opens a web GUI at `http://localhost:5555` where you can browse and edit all database records.

---

## ⚙️ Configuration & Environment Variables

All configuration is in the `.env` file:

```env
# ─── Database ────────────────────────────────────────────
# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/movzzy_db?schema=public"

# ─── Authentication ──────────────────────────────────────
# Secret key for signing JWT tokens (change this in production!)
JWT_SECRET=movzzy-super-secret-jwt-key-change-in-production-2026

# ─── Server ──────────────────────────────────────────────
PORT=3000                    # HTTP port
NODE_ENV=development         # development | production

# ─── SMS Provider ────────────────────────────────────────
SMS_PROVIDER=mock            # mock (console log) | twilio (real SMS)

# ─── CORS ────────────────────────────────────────────────
CORS_ORIGIN=*                # Which domains can call the API
```

### Security Middleware (Pre-configured in `index.ts`):

| Middleware | What It Does |
|-----------|--------------|
| **Helmet** | Adds security HTTP headers (XSS, content-type, etc.) |
| **CORS** | Controls which domains can call the API |
| **Rate Limiter** | Max 100 requests per minute per IP |
| **Morgan** | Logs every request to console |
| **JSON Parser** | Parses JSON request bodies (10MB limit) |

---

## 🧰 How to Test with Postman / curl

### Option 1: PowerShell (Windows)

```powershell
# Step 1: Get OTP
$resp = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/send-otp" `
  -Method POST -ContentType "application/json" `
  -Body '{"phone":"9876543210"}'
$otp = $resp.otp
Write-Host "OTP: $otp"

# Step 2: Verify OTP and get token
$verify = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/verify-otp" `
  -Method POST -ContentType "application/json" `
  -Body "{`"phone`":`"9876543210`",`"otp`":`"$otp`"}"
$token = $verify.token
Write-Host "Token: $token"

# Step 3: Use the token for any protected endpoint
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/admin/dashboard" `
  -Headers @{Authorization="Bearer $token"} | ConvertTo-Json -Depth 5
```

### Option 2: curl (Mac/Linux)

```bash
# Step 1: Get OTP
curl -X POST http://localhost:3000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210"}'

# Step 2: Verify OTP (use the OTP from step 1)
curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","otp":"THE_OTP"}'

# Step 3: Use token
curl http://localhost:3000/api/v1/admin/dashboard \
  -H "Authorization: Bearer THE_TOKEN"
```

### Option 3: Postman (Recommended for Regular Testing)

1. **Download Postman** from [postman.com](https://www.postman.com/downloads/)
2. Create a new Collection called "MOVZZY API"
3. Add requests for each endpoint
4. In the **Authorization** tab of each protected request:
   - Type: **Bearer Token**
   - Token: paste your JWT token
5. **Pro tip:** Use Postman's environment variables to auto-save the token from the verify-otp response

---

## ❗ Common Errors & Troubleshooting

### `EADDRINUSE: address already in use :::3000`
**Cause:** Another process is already using port 3000.  
**Fix:**
```powershell
# Find and kill the process on port 3000
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000 | Select-Object -First 1 -ExpandProperty OwningProcess) -Force
# Then restart
npm run dev
```

### `401 Unauthorized` on every request
**Cause:** You're not including the JWT token.  
**Fix:** Add header `Authorization: Bearer <your-token>` to the request. See [How to Test](#-how-to-test-with-postman--curl) above.

### `Invalid or expired OTP`
**Cause:** OTP expired (5 min limit) or you used the wrong OTP.  
**Fix:** Request a new OTP with `/send-otp`, then use the new one.

### `ECONNREFUSED: connect ECONNREFUSED 127.0.0.1:5432`
**Cause:** PostgreSQL is not running.  
**Fix:**
- Windows: Open Services app → find PostgreSQL → Start it
- Mac: `brew services start postgresql`
- Linux: `sudo systemctl start postgresql`

### `database "movzzy_db" does not exist`
**Cause:** You haven't created the database yet.  
**Fix:** See [Step 4 of Installation](#step-4-create-the-database).

### `Cannot find module` errors
**Cause:** Dependencies not installed or Prisma client not generated.  
**Fix:**
```bash
npm install
npx prisma generate
```

### TypeScript compilation errors
**Fix:** Run `npx tsc --noEmit` to see specific errors. Most common causes:
- Missing type definitions (`npm install`)
- Prisma client outdated (`npx prisma generate`)

---

## 💡 Tech Decisions & Why

| Decision | Reasoning |
|----------|-----------|
| **TypeScript over JavaScript** | Type safety catches bugs at compile time, not runtime |
| **Express.js** | Most popular Node.js framework, massive ecosystem |
| **Prisma ORM** | Type-safe database queries, auto-generated client, great migrations |
| **PostgreSQL** | Production-grade, supports JSON fields, excellent indexing |
| **OTP auth (no passwords)** | Modern UX, no password management headaches |
| **In-memory cache (not Redis)** | Simpler setup for dev. Switch to Redis for production |
| **Money in paise (integers)** | Avoids floating-point errors (0.1 + 0.2 ≠ 0.3 in JS) |
| **Booking state machine** | Prevents invalid state transitions, makes debugging easy |
| **Weighted scoring algorithm** | Flexible, tunable, and transparent provider selection |
| **3-tier recovery** | Progressively relaxes standards to maximize success rate |
| **cuid for IDs** | URL-safe, collision-resistant, sortable by creation time |
| **Zod for validation** | TypeScript-native, composable schemas, great error messages |

---

## 📜 npm Scripts Reference

| Script | Command | What It Does |
|--------|---------|--------------|
| `npm run dev` | `ts-node-dev --respawn --transpile-only src/index.ts` | Start dev server with hot reload |
| `npm run build` | `tsc` | Compile TypeScript to JavaScript |
| `npm start` | `node dist/index.js` | Run production build |
| `npm test` | `ts-node-dev --transpile-only src/tests/scoring.test.ts` | Run provider scoring unit tests |
| `npm run test:integration` | `ts-node-dev --transpile-only src/tests/integration.test.ts` | Run full integration tests |
| `npm run test:all` | `npm run test && npm run test:integration` | Run all tests |
| `npm run prisma:generate` | `prisma generate` | Regenerate Prisma Client |
| `npm run prisma:migrate` | `prisma migrate dev` | Run database migrations |
| `npm run prisma:studio` | `prisma studio` | Open database GUI browser |
| `npm run prisma:push` | `prisma db push` | Push schema changes without migration file |

---

## 📄 File-by-File Deep Dive

### `src/index.ts` — The Entry Point
This is where everything starts. When you run `npm run dev`, this file is executed. It:
1. Loads environment variables from `.env`
2. Creates an Express application
3. Adds security middleware (Helmet, CORS, rate limiting)
4. Adds body parsers (JSON, URL-encoded)
5. Adds request logging (Morgan)
6. Registers the health check endpoint
7. Mounts route modules: `/api/v1/auth`, `/api/v1/bookings`, `/api/v1/admin`
8. Adds 404 handler and global error handler
9. Starts listening on the configured port
10. Sets up graceful shutdown handlers (SIGINT/SIGTERM)

### `src/config/database.ts` — Database Connection
Creates a **singleton** Prisma Client instance. This means the entire app shares one database connection pool (efficient). In development, it enables query logging so you can see the SQL being executed.

### `src/config/redis.ts` — In-Memory Cache
Instead of requiring an actual Redis server, this implements a **MemoryCache** class that stores data in a JavaScript `Map`. It supports:
- `set(key, value, ttlSeconds)` — Store with auto-expiry
- `get(key)` — Retrieve (returns null if expired)
- `del(key)` — Delete

This is used for temporary OTP storage. **For production, replace this with actual Redis.**

### `src/middleware/auth.middleware.ts` — JWT Guard
This middleware function runs BEFORE any protected controller. It:
1. Reads the `Authorization` header
2. Extracts the Bearer token
3. Verifies it using the JWT secret
4. Attaches the decoded user info to `req.user`
5. If invalid/missing: returns 401 Unauthorized

### `src/services/jwt.service.ts` — Token Management
Two functions:
- `generateToken(payload)` — Creates a signed JWT with userId and phone
- `verifyToken(token)` — Decodes and verifies a JWT, returns the payload

### `src/services/sms.service.ts` — OTP Delivery
Two implementations:
- **MockSMSService** — Logs the OTP to console (used in development)
- **TwilioSMSService** — Placeholder for real SMS (used in production)

The environment variable `SMS_PROVIDER` controls which one is used.

### `src/services/booking.service.ts` — Booking Brain
The most complex service. It handles:
- **Fare estimation** using the Haversine formula (straight-line distance × ₹12/km)
- **Booking creation** in SEARCHING state
- **Async provider assignment** (doesn't block the API response)
- **State transitions** with validation (rejects invalid transitions)
- **Provider metrics updates** on booking completion/failure
- **Event logging** (every state change is recorded)

### `src/services/provider-scoring.service.ts` — "The Brain"
See the [Provider Scoring section](#-provider-scoring--the-brain) above for complete details.

### `src/services/recovery.service.ts` — Failure Handler
See the [Recovery & Compensation section](#-recovery--compensation-system) above for complete details.

### `src/utils/otp.ts` — OTP Generator
- `generateOTP()` — Returns a random 6-digit string (e.g., "482937")
- `generateReferralCode(prefix?)` — Returns a code like "USER6729" or "MOVZZY1234"

### `src/utils/phone.ts` — Phone Number Utilities
- `isValidIndianPhone(phone)` — Checks if it's a valid Indian mobile number (starts with 6-9, 10 digits)
- `normalizePhone(phone)` — Converts any format to +91XXXXXXXXXX
- `maskPhone(phone)` — Converts +919876543210 to +91****3210

### `src/validators/auth.validator.ts` — Auth Input Validation
Uses Zod schemas to validate:
- `sendOTPSchema` — Requires `phone` (string, 6-15 chars)
- `verifyOTPSchema` — Requires `phone` + `otp` (string, exactly 6 digits)

### `src/validators/booking.validator.ts` — Booking Input Validation
Uses Zod schema to validate:
- `pickup` (required string)
- `dropoff` (required string)
- `pickupLat`, `pickupLng`, `dropoffLat`, `dropoffLng` (optional numbers)
- `tripType` (optional, HIGH_RELIABILITY or STANDARD)

---

*Built with 💪 by the MOVZZY team*
