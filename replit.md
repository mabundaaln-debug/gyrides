# GY Rides

Local ride-hailing web app for Giyani, South Africa. Mobile-first UI with rider, driver, and admin flows.

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js server
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (backend API)
- **State**: TanStack React Query + localStorage auth
- **Map**: Leaflet with Google Maps tiles (auto-fallback to OpenStreetMap), OSRM routing for accurate road-following polylines + real distance/duration via `/api/directions` and `/api/route-info`, Nominatim geocoding (`/api/geocode/search` and `/api/geocode/reverse`) for live place search and reverse geocoding
- **PWA**: Service worker, manifest.json, installable on mobile devices

## Design System

- **Palette**: Black (#000) primary, Yellow (#facc15 / bg-yellow-400) accent, white cards
- **Typography**: Inter font, font-black for headings
- **Layout**: Mobile-first (optimized for 400px width), rounded-2xl cards, bottom navigation bars
- **Landing**: Black background with yellow CTAs

## Structure

```
client/src/
  pages/Home.tsx       - Landing page with sign in/register, password toggle, forgot password
  pages/RiderApp.tsx   - Full rider flow: ride type selector, booking, tracking, history,
                         WhatsApp fallback, wallet, safety center, taxi routes
  pages/DriverApp.tsx  - Driver dashboard with verified badge, ride type indicators,
                         medical/parcel trip handling, earnings breakdown
  pages/DriverOnboarding.tsx - Multi-step driver registration (5 steps)
  pages/AdminApp.tsx   - Admin panel with approvals, stats, driver management
  components/GiyaniMap.tsx - Leaflet map with OSRM routing, pin-on-map, driver markers
  lib/auth.tsx         - Auth context (localStorage-based)
  lib/api.ts           - API helper functions

server/
  index.ts             - Express server entry
  routes.ts            - All API routes + seed data
  storage.ts           - Database storage layer (Drizzle)
  db.ts                - Database connection

shared/
  schema.ts            - Drizzle schema (users, trips, savedPlaces, vehicleTypes, taxiRoutes)
```

## Key Features

### Pricing Structure (Giyani-optimized)
- **Base fare**: R10 (Standard/Health/Parcel), R15 (Premium/XL)
- **Per km**: R7-R11 depending on vehicle type
- **Per minute**: R1.0-R1.8 depending on vehicle type
- **Minimum fare**: R25 (Standard/Parcel), R35 (Premium), R40 (XL), R50 (Health)
- **Rural surcharge**: +R8 for villages (Homu, Dzumeri, Nkuri, Ndhambi, Risinga, Muyexe, Xikukwani, Gawula, Section E)
- **Shared rides**: 55% of full fare per seat
- **Platform commission**: 15% (driver keeps 85%)
- **Driver bonuses**: R100 for 20 rides/day, R500 for 100 rides/week
- **Fare breakdown**: Shown on confirm screen (base + distance + time + rural surcharge)

### Ride Types (5 modes)
- **Private**: Standard one-to-one rides
- **Shared (GY Share)**: Share a ride, select 1-4 seats, 55% fare per seat
- **Taxi**: Browse Giyani taxi routes with live queue info (seats/departure times)
- **Parcel**: Same-day parcel delivery with description field
- **Medical (GY Health)**: Hospital/clinic transport with medical notes, minimum R50

### Rider Features
- Search 22 locations (14 town + 8 rural villages with "Rural" badge)
- Ride type selector tabs (private/shared/taxi/parcel/medical)
- Choose vehicle type with detailed fare breakdown (base/distance/time/surcharge)
- Payment methods: Cash, eWallet (balance), EFT (bank details shown), Yoco (card via hosted checkout)
- WhatsApp fallback booking (available after ride confirmation, creates tracked trip record)
- Trip PIN verification, SOS button (sends alert to admin), in-app chat with driver
- Live ETA tracking with countdown, simulated driver movement on map
- Trip completion with star rating, receipt, rebook
- Wallet view with balance and payment method selection
- Safety Center with SOS, trusted contacts (add/remove), trip sharing
- Taxi Routes browser with live queue data
- Verified driver badge visible on tracking and completion screens
- Password reset via phone number verification (username + phone match)
- WhatsApp support link for account recovery
- Bottom navigation (Home/Activity/Profile)

### Driver Features
- Go online/offline, countdown timer on ride requests
- Verified Driver badge (blue checkmark) in menu, profile, trip card
- Ride type indicators: Medical/Parcel/Shared badges on requests
- Medical notes and parcel descriptions shown on trip cards
- Phase-specific labels for parcel (Collect/Delivering/Delivered)
- Navigate to pickup/dropoff (Google Maps), in-app chat with passenger, SOS button
- Earnings with 85% commission breakdown, trip-level driver earnings
- Driver Bonus system: daily (20 rides → R100) and weekly (100 rides → R500) with progress bars
- Commission info panel showing 15% vs Uber/Bolt comparison
- Bottom nav with trips/earnings/profile tabs

### Driver Onboarding
- 5-step registration: personal info → vehicle → licenses → documents → review
- Admin approval flow with verified badge on approval

### Chat & SOS
- **In-app chat**: Real-time messaging between rider and driver during active trips (3-second polling)
- **Admin chat**: Admin can join any trip's chat from both the Trips list and SOS Alerts view; admin messages show with red "GY Admin" label and Shield icon
- **SOS alerts**: Rider and driver can trigger SOS with GPS coordinates, sent to admin
- **Admin SOS panel**: View active/acknowledged/resolved alerts, acknowledge or resolve with notes, Google Maps link to location, direct chat with trip participants

### Admin
- Users & Accounts management (verify/unverify accounts, reset user passwords, review password reset requests)
- Password reset requests panel with auto-generate temp password or custom reset
- Dashboard with revenue/active trips, SOS alert banner (pulsing red), pending approval alerts, password reset request alerts
- SOS Alerts management with acknowledge/resolve workflow
- Driver review flow with approve/reject
- Management for drivers/trips/vehicle pricing

### Yoco Online Payments
- Riders can pay with card via Yoco hosted checkout
- Flow: Select "Yoco" payment → book ride → redirected to Yoco payment page → return to `/payment/success`, `/payment/failure`, or `/payment/cancel`
- Server creates checkout session via `POST https://payments.yoco.com/api/checkouts` with `YOCO_SECRET_KEY`
- Webhook at `/api/payments/yoco/webhook` updates trip payment on success
- Fallback: If Yoco fails, trip is automatically converted to cash payment
- Amount in ZAR cents (e.g., R25.00 = 2500)

## Admin Account

- Admin: `drnkateko` / `drin123!`

Data auto-seeds vehicle types, taxi routes, and admin account on first visit via POST /api/seed.

## Database Schema

- `users`: role (rider/driver/admin), approval status, isVerified, walletBalance, trustedContacts (JSON)
- `trips`: rideType (private/shared/taxi/parcel/medical), paymentMethod (cash/card/ewallet/eft), seatsBooked, medicalNotes, parcelDescription, rideNote, eftProofUrl, bookingChannel (app/whatsapp)
- `savedPlaces`: user's saved locations with lat/lng
- `vehicleTypes`: GY Standard, GY Premium, GY XL, GY Health, GY Parcel (with pricePerMin, minimumFare)
- `taxiRoutes`: route name, from/to locations with lat/lng, fare, available/total seats, departure schedule
- `messages`: in-trip chat messages with tripId, senderId, senderRole, text
- `sosAlerts`: emergency alerts with userId, userRole, tripId, lat/lng, status (active/acknowledged/resolved), adminNotes

## API Routes

All prefixed with `/api`:
- Auth: POST `/auth/login`, `/auth/register`
- Users: GET/PATCH `/users/:id`, GET `/users/role/:role`, `/drivers/online`
- Trips: CRUD at `/trips`, plus `/trips/active`, `/trips/requested`, `/trips/rider/:id`, `/trips/driver/:id`
- Saved Places: GET/POST/DELETE `/saved-places`
- Vehicle Types: GET/POST/PATCH `/vehicle-types`
- Taxi Routes: GET/POST/PATCH `/taxi-routes`
- Payments: POST `/payments/yoco/checkout`, POST `/payments/yoco/webhook`
- Wallet: POST `/wallet/topup`
- Messages: GET `/messages/:tripId`, POST `/messages`
- SOS: POST `/sos`, GET `/sos`, GET `/sos/active`, PATCH `/sos/:id`
- Admin: GET `/admin/stats`, GET `/drivers/pending`, PATCH `/admin/drivers/:id/approve`, PATCH `/admin/drivers/:id/reject`
- Onboarding: PATCH `/drivers/:id/onboarding`
- Health: GET `/health`
- Seed: POST `/seed`
