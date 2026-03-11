# MOVZZ — Team Briefing
> Reliability-Orchestrated Mobility Platform · Chennai, India
> March 10, 2026

---

## What is MOVZZ?

MOVZZ is a ride aggregator that ranks transport options (cab, bike taxi, auto, metro) by **completion confidence, dispatch speed, and pricing** — not just price. Think Uber + reliability scoring + multi-modal. Base city: Chennai.

---

## Progress Snapshot

**67 / 108 tasks done — 62% complete**

| Section | Done | Total | Status |
|---------|------|-------|--------|
| Security Hardening | 11 | 11 | ✅ Complete |
| Foundation | 34 | 34 | ✅ Complete |
| Platform Features | 9 | 26 | 🔄 In progress |
| AI Intelligence Layer | 13 | 23 | 🔄 In progress |
| Production & Deployment | 0 | 14 | ⬜ Not started |

---

## What's Done

### Security (11/11) — All patched before first user
- JWT secret now throws on startup if missing (no more hardcoded fallback)
- Auth and OAuth race conditions fixed with atomic `upsert`
- Admin role added to DB — regular users get 403 on all `/admin/` routes
- Hardcoded `localhost:3000` replaced with env var across all files
- `.env` removed from git; `.env.example` templates created for both frontend and backend
- OTP brute-force blocked: 5 attempts per 10 minutes per phone
- WebSocket memory leak fixed — handlers properly removed on disconnect
- Dual fare engine eliminated — single source of truth
- JWT expiry enforced — auto-logout after 7 days
- CORS locked to allowlist; global rate limit: 100 req/15 min

### Foundation (34/34) — Full backend + frontend working
- **Backend:** Express + TypeScript + Prisma + PostgreSQL + Redis. Full booking state machine: `SEARCHING → CONFIRMED → IN_PROGRESS → COMPLETED / FAILED / CANCELLED / MANUAL_ESCALATION`
- **Fare engine:** Mode-specific rates (CAB Economy ₹12/km, Comfort ₹15, Premium ₹18 · Bike ₹7 · Auto ₹10 · Metro flat fare), surge multiplier, airport premium, Haversine × 1.35 road factor, all stored in paise
- **Recovery:** 3-level retry with auto-escalation and ₹100 compensation credit
- **Frontend:** 5-screen flow — Landing → Auth → Transport → Destination → Results. Mapbox geocoding with 300ms debounce, interactive map with pickup/dropoff markers, Chennai preset chips
- **Auth:** Phone OTP + Google OAuth (direct REST, no Passport.js) + JWT
- **WebSockets:** Real-time booking state updates via Socket.IO (replaced HTTP polling)
- **Background jobs (BullMQ):** Booking timeout (5 min), recovery retry, SMS dispatch (exponential backoff), nightly aggregation, ML data collection
- **Payments:** Razorpay — payment link, HMAC-SHA256 verify, server-side webhook handler (idempotent), T+2 provider payouts
- **Admin panel:** 4-tab UI at `/admin` — Dashboard, Escalations, Providers, Metrics. Live booking map, provider pause/resume, manual escalation confirm
- **Infrastructure:** Sentry (backend + frontend), S3 presigned upload, transactional email via Resend, PWA with service worker

### AI Intelligence Layer (13/23)

**AI Week 1 (8/8) — Core AI foundation:**
- Type system: `RideContext`, `ProviderMetrics`, `ReliabilityScore`, `ScoreBreakdown`
- Context Builder: Chennai zone detection, peak hours, distance, ride type
- Provider Metrics: Hourly rates, recency windows (1h/6h/24h/7d), streaks, Redis 5-min cache
- Reliability Predictor: `predictReliability()` with 8 contextual adjustments
- Orchestration Engine: SEQUENTIAL / PARALLEL_2 / PARALLEL_3 / CASCADE / EMERGENCY strategies
- Failure Detector: Risk scoring, tiered interventions, ₹50 auto-credit at high risk
- Wired into booking flow with fallback to legacy provider assignment

**AI Week 2 (5/5) — Performance + visible AI:**
- Nightly aggregation CRON: rolls up per-provider success rates, updates reliability scores
- Redis cache service: `getOrCompute(key, ttl, fn)` pattern across all AI services
- ML training data collection: triggers on every terminal booking state (COMPLETED / FAILED / CANCELLED)
- New DB tables: `ProviderMetricsCache`, `MLTrainingData`
- Frontend AI UI: reliability bars, AI reasoning text, MOVZZ score chips, orchestration strategy badge

---

## What's Next

### Immediate (pre-beta blockers)
1. **#43 — Real Twilio SMS** — replace `console.log` mock with actual OTP delivery. Blocks real signups.
2. **AI Week 3** — Demand forecasting + fair dynamic pricing (see briefing below)
3. **D1–D5 — Production deploy** — Railway (backend + Postgres + Redis) + Vercel (frontend) + domain

### Post-launch
- Provider integrations: Fast Track Cabs, Chennai Call Taxi, Uber/Ola/Rapido price scraping
- AI Week 4: Provider analytics + user personalization
- React Native apps (user + driver)

---

## AI Success Metrics (tracking weekly)

| Metric | Baseline | Target |
|--------|---------|--------|
| Booking success rate | ~75% | 92%+ |
| Avg time to confirmation | ~45 sec | <20 sec |
| Rides needing manual ops | ~20% | <5% |
| AI prediction accuracy | — | >90% |
| Revenue from dynamic pricing | 0% | +10–15% |
| User satisfaction | ~4.2 | 4.7+ |

---

## AI Week 3 — Team Briefing Script

### Opening

"Week 3 is about making MOVZZ smarter about *when* and *where* demand spikes — and pricing fairly when it does. We're building two things: a demand forecaster, and an enhanced pricing engine that uses it."

---

### The Problem

"Right now our surge pricing is static. If it's 6 PM on a Friday, we don't know in advance that North Chennai will be short on autos. Drivers don't know either. So users get 'no providers available,' drivers miss earnings, and we lose the booking. We're fixing that."

---

### Task Breakdown (5 tasks)

**AI-14 — Demand Forecaster Service**
A new service that looks at the last 4 weeks of booking data for each zone, broken down by hour and day of week. It computes a predicted ride count and a confidence interval. It also factors in weather — rain pushes demand up 30%. No ML model, no training pipeline — pure historical pattern matching. Fast and explainable.

**AI-15 — Database table**
One new Prisma table: `DemandForecast`. Stores zone, forecast hour, predicted rides, actual rides, and accuracy. This lets us measure how good our forecasts are over time and improve them.

**AI-16 — Proactive driver positioning job**
Every night, a BullMQ job runs 24 forecasts — one per hour. It detects zones where predicted demand is significantly higher than available drivers. It then sends an SMS or WhatsApp to off-duty drivers in that area: *"We expect high demand in Adyar tomorrow 8–10 AM — come online for a ₹100 bonus."* This is supply-side nudging, completely automated.

**AI-17 — Enhanced dynamic pricing**
This is where the forecast meets the fare engine. We add three new multipliers to `fare.service.ts`:
- Demand: up to +15% when the zone forecast is high
- Weather: rain +8%, heavy rain +15%, storm +20%
- Traffic: jam +12%, clear −5%

Critical constraint: **hard cap at base × 1.2** — maximum 20% above base fare. No uncapped surge. Movzz Pass users are always shielded and get base fare regardless.

**AI-18 — Pricing transparency**
The quotes API response gains a new `breakdown` field: base fare, plus each multiplier that applied with a label and amount. The frontend shows a "Why this price?" tap-to-expand on every quote card. Users see exactly what pushed the price up — demand, weather, whatever. Trust through transparency.

---

### Why the Hard Cap Matters

"Uber and Ola have lost users during rain and festivals because of 3× and 4× surge. We won't do that. Our cap means the most a user ever pays is 20% above base. The goal is yield optimization, not price gouging."

---

### Outcome

"By end of the week: drivers are better positioned before demand hits, users see fair transparent pricing, and we're projecting 10–15% revenue lift from the pricing engine. The forecast table also becomes the foundation for the Week 4 analytics dashboard."

---

*MOVZZ · March 2026 · 67/108 tasks (62%)*
