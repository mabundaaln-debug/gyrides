# GY Rides

Local ride-hailing web app for Giyani, South Africa. Mobile-first UI with rider, driver, and admin flows.

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js server
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (backend API)
- **State**: TanStack React Query + localStorage auth

## Structure

```
client/src/
  pages/Home.tsx       - Landing page with login/register
  pages/RiderApp.tsx   - Rider booking flow, trip history, profile
  pages/DriverApp.tsx  - Driver dashboard, trip management, earnings
  pages/AdminApp.tsx   - Admin panel with stats, driver/trip/pricing management
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

- **Rider**: Search Giyani locations, choose vehicle type, book ride, track driver, trip history, saved places, profile
- **Driver**: Go online/offline, receive ride requests, accept/decline, navigate trip phases, earnings dashboard
- **Admin**: Dashboard stats, driver management, trip list, vehicle types & pricing

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
- Admin: GET `/admin/stats`
- Seed: POST `/seed`
