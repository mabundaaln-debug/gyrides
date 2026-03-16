# GY Rides

Local ride-hailing web app for Giyani, South Africa. Mobile-first UI with rider, driver, and admin flows.

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js server
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (backend API)
- **State**: TanStack React Query + localStorage auth
- **Map**: Leaflet with Google Maps tiles (auto-fallback to OpenStreetMap), Google Directions API (server-side proxy) with OSRM fallback, Nominatim reverse geocoding
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

### Ride Types (5 modes)
- **Private**: Standard one-to-one rides
- **Shared**: Share a ride, select 1-4 seats, 60% fare per seat
- **Taxi**: Browse Giyani taxi routes with live queue info (seats/departure times)
- **Parcel**: Same-day parcel delivery with description field
- **Medical**: Hospital/clinic transport with medical notes dropdown

### Rider Features
- Search Giyani locations, pin on map, quick destination chips
- Ride type selector tabs (private/shared/taxi/parcel/medical)
- Choose vehicle type, add notes/promo code
- Payment methods: Cash, eWallet (balance), EFT (bank details shown), Card
- WhatsApp fallback booking (from home screen and confirm screen)
- Trip PIN verification, SOS button, call/WhatsApp driver
- Ride status tracking, trip completion with star rating, receipt, rebook
- Wallet view with balance and payment method selection
- Safety Center with SOS, trusted contacts (add/remove), trip sharing
- Taxi Routes browser with live queue data
- Verified driver badge visible on tracking and completion screens
- Bottom navigation (Home/Activity/Profile)

### Driver Features
- Go online/offline, countdown timer on ride requests
- Verified Driver badge (blue checkmark) in menu, profile, trip card
- Ride type indicators: Medical/Parcel/Shared badges on requests
- Medical notes and parcel descriptions shown on trip cards
- Phase-specific labels for parcel (Collect/Delivering/Delivered)
- Navigate to pickup/dropoff (Google Maps), call/WhatsApp passenger
- Earnings breakdown (today/weekly/cash), trip history with ride type badges
- Bottom nav with trips/earnings/profile tabs

### Driver Onboarding
- 5-step registration: personal info → vehicle → licenses → documents → review
- Admin approval flow with verified badge on approval

### Admin
- Dashboard with revenue/active trips, pending approval alerts
- Driver review flow with approve/reject
- Management for drivers/trips/vehicle pricing

## Demo Accounts

- Rider: `jane` / `demo` (with wallet balance R150)
- Driver: `sipho` / `demo` (verified, approved)
- Admin: `admin` / `admin`

Data auto-seeds on first visit via POST /api/seed.

## Database Schema

- `users`: role (rider/driver/admin), approval status, isVerified, walletBalance, trustedContacts (JSON)
- `trips`: rideType (private/shared/taxi/parcel/medical), paymentMethod (cash/card/ewallet/eft), seatsBooked, medicalNotes, parcelDescription, rideNote, eftProofUrl
- `savedPlaces`: user's saved locations with lat/lng
- `vehicleTypes`: GY Standard, GY Premium, GY XL, GY Medical, GY Parcel
- `taxiRoutes`: route name, from/to locations with lat/lng, fare, available/total seats, departure schedule

## API Routes

All prefixed with `/api`:
- Auth: POST `/auth/login`, `/auth/register`
- Users: GET/PATCH `/users/:id`, GET `/users/role/:role`, `/drivers/online`
- Trips: CRUD at `/trips`, plus `/trips/active`, `/trips/requested`, `/trips/rider/:id`, `/trips/driver/:id`
- Saved Places: GET/POST/DELETE `/saved-places`
- Vehicle Types: GET/POST/PATCH `/vehicle-types`
- Taxi Routes: GET/POST/PATCH `/taxi-routes`
- Wallet: POST `/wallet/topup`
- Admin: GET `/admin/stats`, GET `/drivers/pending`, PATCH `/admin/drivers/:id/approve`, PATCH `/admin/drivers/:id/reject`
- Onboarding: PATCH `/drivers/:id/onboarding`
- Health: GET `/health`
- Seed: POST `/seed`
