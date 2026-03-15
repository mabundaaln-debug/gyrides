# GY Rides

Local ride-hailing web app for Giyani, South Africa. Mobile-first UI with rider, driver, and admin flows.

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js server
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (backend API)
- **State**: TanStack React Query + localStorage auth
- **Map**: Leaflet + OpenStreetMap tiles, OSRM road routing, Nominatim reverse geocoding

## Design System

- **Palette**: Black (#000) primary, Yellow (#facc15 / bg-yellow-400) accent, white cards
- **Typography**: Inter font, font-black for headings
- **Layout**: Mobile-first (optimized for 400px width), rounded-2xl cards, bottom navigation bars
- **Landing**: Black background with yellow CTAs

## Structure

```
client/src/
  pages/Home.tsx       - Landing page with sign in/register, password toggle, forgot password
  pages/RiderApp.tsx   - Full rider flow with bottom nav, quick destinations, map preview,
                         trip PIN, SOS, call/WhatsApp driver, notes, promo code, star rating,
                         receipt, rebook
  pages/DriverApp.tsx  - Driver dashboard with bottom nav, countdown timer on requests,
                         call/WhatsApp passenger, navigate button, earnings breakdown
  pages/DriverOnboarding.tsx - Multi-step driver registration (personal info, vehicle, licenses,
                              document uploads, review). Shows pending/rejected status screens.
  pages/AdminApp.tsx   - Admin panel with pending approvals, driver review flow (view docs,
                         approve/reject with reason), completion rate, platform health
  components/GiyaniMap.tsx - Leaflet map with OSRM routing, pin-on-map, driver markers
  lib/auth.tsx         - Auth context (localStorage-based)
  lib/api.ts           - API helper functions

server/
  index.ts             - Express server entry
  routes.ts            - All API routes (/api/*)
  storage.ts           - Database storage layer (Drizzle)
  db.ts                - Database connection

shared/
  schema.ts            - Drizzle schema (users, trips, savedPlaces, vehicleTypes)
```

## Key Features

- **Rider**: Search Giyani locations, pin on map, quick destination chips, choose vehicle,
  add notes/promo code, book ride, trip PIN verification, call/WhatsApp driver, SOS button,
  ride status tracking, trip completion with star rating, receipt, rebook, bottom nav
- **Driver**: Go online/offline, countdown timer on requests, accept/decline, navigate to
  pickup/dropoff (Google Maps), call/WhatsApp passenger, trip phase progression, earnings
  breakdown (today/weekly/cash), bottom nav with trips/earnings/profile tabs
- **Driver Onboarding**: 5-step registration form (personal info → vehicle → licenses →
  document uploads → review & submit). Blocked from driving until approved. Shows pending
  review screen or rejected screen with reason and re-submit option.
- **Admin**: Dashboard with revenue/active trips, pending approval alerts, driver review flow
  (view all submitted details & documents, approve or reject with reason), completion rate,
  management for drivers/trips/vehicle pricing

## Demo Accounts

- Rider: `jane` / `demo`
- Driver: `sipho` / `demo`
- Admin: `admin` / `admin`

Data auto-seeds on first visit via POST /api/seed.

## API Routes

All prefixed with `/api`:
- Auth: POST `/auth/login`, `/auth/register`
- Users: GET/PATCH `/users/:id`, GET `/users/role/:role`, `/drivers/online`
- Trips: CRUD at `/trips`, plus `/trips/active`, `/trips/requested`, `/trips/rider/:id`, `/trips/driver/:id`
- Saved Places: GET/POST/DELETE `/saved-places`
- Vehicle Types: GET/POST/PATCH `/vehicle-types`
- Admin: GET `/admin/stats`, GET `/drivers/pending`, PATCH `/admin/drivers/:id/approve`, PATCH `/admin/drivers/:id/reject`
- Onboarding: PATCH `/drivers/:id/onboarding`
- Health: GET `/health`
- Seed: POST `/seed`
