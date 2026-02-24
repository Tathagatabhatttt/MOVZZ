# MOVZZ Gap Resolution — Implementation Plan

## Current State Summary
- **Backend**: Express + Prisma + PostgreSQL, auth (OTP), booking state machine, provider scoring, ride search (simulated + NY)
- **Frontend (main src/)**: React app with full OTP auth, map (Leaflet), ride search calling backend API, inline styles
- **Frontend (frontend/)**: Simpler prototype with static data, no API calls
- **Redis**: In-memory mock (MemoryCache class)

## Task Execution Order (Critical Path First)

### Phase 1: Backend Foundation (Tasks #1, #2)

**Task #1: Add `transportMode` to Prisma schema + migration**
- Add `TransportMode` enum: `CAB`, `BIKE`, `AUTO`, `METRO`
- Add `transportMode` field to `Booking` model (default `CAB`)
- Run migration

**Task #2: Build mode-specific fare estimation**
- Replace single `estimateFare()` with mode-aware pricing
- CAB: ₹12/km, min ₹80 | BIKE: ₹5/km, min ₹20 | AUTO: ₹8/km, min ₹25 | METRO: fixed route pricing

### Phase 2: Quotes Endpoint (Tasks #3, #4)

**Task #3: Build POST /quotes endpoint**
- New controller + route: `POST /api/v1/quotes`
- Accepts: pickup/dropoff coords, transportMode
- Returns: array of ride options with provider, price, ETA, reliability score, tags
- Replaces current ride search for booking flow

**Task #4: Metro-specific quote logic**
- Metro quotes return fixed routes with stations, duration
- No provider scoring for metro (fixed infrastructure)

### Phase 3: Frontend Plumbing (Tasks #5, #6, #7, #8) — Parallel with Phase 1-2

**Task #5: API client + auth store**
- Already done in `src/api.js` — verify and enhance
- Add Zustand for state management

**Task #6: Phone OTP input UI**
- Already implemented in `src/App.jsx` AuthScreen — verify completeness

**Task #7: Wire auth screen to real OTP flow**
- Already done — verify error handling

**Task #8: Booking store (Zustand)**
- Create Zustand store for booking state: transportMode, pickup/drop, quotes, selected ride, booking status

### Phase 4: Frontend Wiring (Tasks #9, #10, #11)

**Task #9: Wire Results screen to POST /quotes**
- Replace static RIDE_OPTIONS with API call to `/api/v1/quotes`
- Pass transportMode from selection

**Task #10: Wire Confirm screen to POST /bookings**
- On "Book Now", call createBooking with transportMode + selected quote

**Task #11: Booking status polling**
- Already have `pollBookingStatus` in api.js — wire to UI

### Phase 5: Infrastructure (Tasks #12, #13, #14, #15) — Lower priority
- Wire real Redis, WebSocket, OAuth, Google Maps
