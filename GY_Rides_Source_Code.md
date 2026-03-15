# GY Rides — Complete Source Code (Including UI Components)

Copyright 2026. All rights reserved.

---

## `shared/schema.ts`

```ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["rider", "driver", "admin"]);
export const tripStatusEnum = pgEnum("trip_status", ["requested", "accepted", "arriving", "in_progress", "completed", "cancelled"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "card", "ewallet", "eft"]);
export const approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "rejected"]);
export const rideTypeEnum = pgEnum("ride_type", ["private", "shared", "taxi", "parcel", "medical"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  role: userRoleEnum("role").notNull().default("rider"),
  avatarUrl: text("avatar_url"),
  rating: real("rating").default(5.0),
  totalTrips: integer("total_trips").default(0),
  isOnline: boolean("is_online").default(false),
  vehicleMake: text("vehicle_make"),
  vehicleModel: text("vehicle_model"),
  vehicleColor: text("vehicle_color"),
  vehicleYear: text("vehicle_year"),
  licensePlate: text("license_plate"),
  earnings: real("earnings").default(0),
  approvalStatus: approvalStatusEnum("approval_status").default("pending"),
  onboardingComplete: boolean("onboarding_complete").default(false),
  idNumber: text("id_number"),
  email: text("email"),
  address: text("address"),
  driverLicenseNumber: text("driver_license_number"),
  driverLicenseExpiry: text("driver_license_expiry"),
  driverLicenseCode: text("driver_license_code"),
  vehicleRegistrationNumber: text("vehicle_registration_number"),
  vehicleLicenseExpiry: text("vehicle_license_expiry"),
  roadworthyCertExpiry: text("roadworthy_cert_expiry"),
  driverLicenseDoc: text("driver_license_doc"),
  vehicleLicenseDoc: text("vehicle_license_doc"),
  roadworthyCertDoc: text("roadworthy_cert_doc"),
  proofOfInsuranceDoc: text("proof_of_insurance_doc"),
  profilePhotoDoc: text("profile_photo_doc"),
  rejectionReason: text("rejection_reason"),
  isVerified: boolean("is_verified").default(false),
  walletBalance: real("wallet_balance").default(0),
  trustedContacts: text("trusted_contacts"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trips = pgTable("trips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riderId: varchar("rider_id").notNull().references(() => users.id),
  driverId: varchar("driver_id").references(() => users.id),
  rideType: rideTypeEnum("ride_type").notNull().default("private"),
  pickupName: text("pickup_name").notNull(),
  pickupLat: real("pickup_lat"),
  pickupLng: real("pickup_lng"),
  dropoffName: text("dropoff_name").notNull(),
  dropoffLat: real("dropoff_lat"),
  dropoffLng: real("dropoff_lng"),
  status: tripStatusEnum("status").notNull().default("requested"),
  fare: real("fare").notNull(),
  distance: real("distance"),
  duration: integer("duration"),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("cash"),
  vehicleType: text("vehicle_type").notNull().default("standard"),
  rating: integer("rating"),
  seatsBooked: integer("seats_booked").default(1),
  totalSeats: integer("total_seats").default(4),
  medicalNotes: text("medical_notes"),
  parcelDescription: text("parcel_description"),
  eftProofUrl: text("eft_proof_url"),
  rideNote: text("ride_note"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const savedPlaces = pgTable("saved_places", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  address: text("address").notNull(),
  lat: real("lat"),
  lng: real("lng"),
  icon: text("icon").default("map-pin"),
});

export const vehicleTypes = pgTable("vehicle_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  basePrice: real("base_price").notNull(),
  pricePerKm: real("price_per_km").notNull(),
  seats: integer("seats").notNull().default(4),
  icon: text("icon"),
  isActive: boolean("is_active").default(true),
});

export const taxiRoutes = pgTable("taxi_routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  routeName: text("route_name").notNull(),
  fromLocation: text("from_location").notNull(),
  toLocation: text("to_location").notNull(),
  fare: real("fare").notNull(),
  totalSeats: integer("total_seats").notNull().default(15),
  availableSeats: integer("available_seats").notNull().default(15),
  estimatedDeparture: text("estimated_departure"),
  isActive: boolean("is_active").default(true),
  fromLat: real("from_lat"),
  fromLng: real("from_lng"),
  toLat: real("to_lat"),
  toLng: real("to_lng"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertTripSchema = createInsertSchema(trips).omit({ id: true, createdAt: true, completedAt: true });
export const insertSavedPlaceSchema = createInsertSchema(savedPlaces).omit({ id: true });
export const insertVehicleTypeSchema = createInsertSchema(vehicleTypes).omit({ id: true });
export const insertTaxiRouteSchema = createInsertSchema(taxiRoutes).omit({ id: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof trips.$inferSelect;
export type InsertSavedPlace = z.infer<typeof insertSavedPlaceSchema>;
export type SavedPlace = typeof savedPlaces.$inferSelect;
export type InsertVehicleType = z.infer<typeof insertVehicleTypeSchema>;
export type VehicleType = typeof vehicleTypes.$inferSelect;
export type InsertTaxiRoute = z.infer<typeof insertTaxiRouteSchema>;
export type TaxiRoute = typeof taxiRoutes.$inferSelect;

```

---

## `server/index.ts`

```ts
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();

```

---

## `server/db.ts`

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

```

---

## `server/routes.ts`

```ts
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertTripSchema, insertSavedPlaceSchema, insertVehicleTypeSchema, insertTaxiRouteSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // ── Auth / Users ──
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await storage.getUserByUsername(username);
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    return res.json(user);
  });

  app.post("/api/auth/register", async (req, res) => {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const existing = await storage.getUserByUsername(parsed.data.username);
    if (existing) return res.status(409).json({ message: "Username taken" });
    const user = await storage.createUser(parsed.data);
    return res.status(201).json(user);
  });

  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  });

  app.patch("/api/users/:id", async (req, res) => {
    const user = await storage.updateUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  });

  app.get("/api/users/role/:role", async (req, res) => {
    const users = await storage.getUsersByRole(req.params.role);
    return res.json(users);
  });

  app.get("/api/drivers/online", async (req, res) => {
    const drivers = await storage.getOnlineDrivers();
    return res.json(drivers);
  });

  // ── Trips ──
  app.post("/api/trips", async (req, res) => {
    const parsed = insertTripSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const trip = await storage.createTrip(parsed.data);
    return res.status(201).json(trip);
  });

  app.get("/api/trips", async (req, res) => {
    const trips = await storage.getAllTrips();
    return res.json(trips);
  });

  app.get("/api/trips/active", async (req, res) => {
    const trips = await storage.getActiveTrips();
    return res.json(trips);
  });

  app.get("/api/trips/requested", async (req, res) => {
    const trips = await storage.getRequestedTrips();
    return res.json(trips);
  });

  app.get("/api/trips/:id", async (req, res) => {
    const trip = await storage.getTrip(req.params.id);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    return res.json(trip);
  });

  app.patch("/api/trips/:id", async (req, res) => {
    const trip = await storage.updateTrip(req.params.id, req.body);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    return res.json(trip);
  });

  app.get("/api/trips/rider/:riderId", async (req, res) => {
    const trips = await storage.getTripsByRider(req.params.riderId);
    return res.json(trips);
  });

  app.get("/api/trips/driver/:driverId", async (req, res) => {
    const trips = await storage.getTripsByDriver(req.params.driverId);
    return res.json(trips);
  });

  // ── Saved Places ──
  app.get("/api/saved-places/:userId", async (req, res) => {
    const places = await storage.getSavedPlaces(req.params.userId);
    return res.json(places);
  });

  app.post("/api/saved-places", async (req, res) => {
    const parsed = insertSavedPlaceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const place = await storage.createSavedPlace(parsed.data);
    return res.status(201).json(place);
  });

  app.delete("/api/saved-places/:id", async (req, res) => {
    await storage.deleteSavedPlace(req.params.id);
    return res.status(204).send();
  });

  // ── Vehicle Types ──
  app.get("/api/vehicle-types", async (req, res) => {
    const types = await storage.getVehicleTypes();
    return res.json(types);
  });

  app.post("/api/vehicle-types", async (req, res) => {
    const parsed = insertVehicleTypeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const vt = await storage.createVehicleType(parsed.data);
    return res.status(201).json(vt);
  });

  app.patch("/api/vehicle-types/:id", async (req, res) => {
    const vt = await storage.updateVehicleType(req.params.id, req.body);
    if (!vt) return res.status(404).json({ message: "Vehicle type not found" });
    return res.json(vt);
  });

  // ── Taxi Routes ──
  app.get("/api/taxi-routes", async (req, res) => {
    const routes = await storage.getTaxiRoutes();
    return res.json(routes);
  });

  app.post("/api/taxi-routes", async (req, res) => {
    const parsed = insertTaxiRouteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const route = await storage.createTaxiRoute(parsed.data);
    return res.status(201).json(route);
  });

  app.patch("/api/taxi-routes/:id", async (req, res) => {
    const route = await storage.updateTaxiRoute(req.params.id, req.body);
    if (!route) return res.status(404).json({ message: "Route not found" });
    return res.json(route);
  });

  // ── Wallet ──
  app.post("/api/wallet/topup", async (req, res) => {
    const { userId, amount } = req.body;
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const updated = await storage.updateUser(userId, {
      walletBalance: (user.walletBalance ?? 0) + amount,
    } as any);
    return res.json(updated);
  });

  // ── Driver Onboarding ──
  app.patch("/api/drivers/:id/onboarding", async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user || user.role !== "driver") return res.status(404).json({ message: "Driver not found" });
    const updated = await storage.updateUser(req.params.id, {
      ...req.body,
      onboardingComplete: true,
      approvalStatus: "pending",
    });
    return res.json(updated);
  });

  app.get("/api/drivers/pending", async (req, res) => {
    const pending = await storage.getPendingDrivers();
    return res.json(pending);
  });

  app.patch("/api/admin/drivers/:id/approve", async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user || user.role !== "driver") return res.status(404).json({ message: "Driver not found" });
    const updated = await storage.updateUser(req.params.id, { approvalStatus: "approved", rejectionReason: null, isVerified: true });
    return res.json(updated);
  });

  app.patch("/api/admin/drivers/:id/reject", async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user || user.role !== "driver") return res.status(404).json({ message: "Driver not found" });
    const { reason } = req.body;
    const updated = await storage.updateUser(req.params.id, { approvalStatus: "rejected", rejectionReason: reason || "Application rejected" });
    return res.json(updated);
  });

  // ── Admin Stats ──
  app.get("/api/admin/stats", async (req, res) => {
    const stats = await storage.getStats();
    return res.json(stats);
  });

  // ── Seed Demo Data ──
  app.post("/api/seed", async (req, res) => {
    try {
      const existingDrivers = await storage.getUsersByRole("driver");
      if (existingDrivers.length > 0) {
        return res.json({ message: "Already seeded" });
      }

      const riders = [
        { username: "jane", password: "demo", fullName: "Jane Dlamini", phone: "071 234 5678", role: "rider" as const, rating: 4.8, totalTrips: 23, avatarUrl: null, walletBalance: 150 },
        { username: "thabo", password: "demo", fullName: "Thabo Mabaso", phone: "072 345 6789", role: "rider" as const, rating: 4.9, totalTrips: 45, avatarUrl: null, walletBalance: 75 },
        { username: "lindiwe", password: "demo", fullName: "Lindiwe Nkosi", phone: "073 456 7890", role: "rider" as const, rating: 4.7, totalTrips: 12, avatarUrl: null, walletBalance: 0 },
      ];

      const drivers = [
        { username: "sipho", password: "demo", fullName: "Sipho Maluleke", phone: "074 567 8901", role: "driver" as const, rating: 4.9, totalTrips: 1240, isOnline: true, vehicleMake: "Toyota", vehicleModel: "Etios", vehicleColor: "White", licensePlate: "LGP 123 L", earnings: 45200, avatarUrl: null, approvalStatus: "approved" as const, onboardingComplete: true, driverLicenseNumber: "ML12345", driverLicenseExpiry: "2027-06-30", driverLicenseCode: "B", isVerified: true },
        { username: "grace", password: "demo", fullName: "Grace Chauke", phone: "075 678 9012", role: "driver" as const, rating: 4.8, totalTrips: 890, isOnline: true, vehicleMake: "Volkswagen", vehicleModel: "Polo Vivo", vehicleColor: "Silver", licensePlate: "LGP 456 L", earnings: 32100, avatarUrl: null, approvalStatus: "approved" as const, onboardingComplete: true, driverLicenseNumber: "GC67890", driverLicenseExpiry: "2027-09-15", driverLicenseCode: "B", isVerified: true },
        { username: "mandla", password: "demo", fullName: "Mandla Baloyi", phone: "076 789 0123", role: "driver" as const, rating: 4.7, totalTrips: 560, isOnline: false, vehicleMake: "Hyundai", vehicleModel: "Grand i10", vehicleColor: "Red", licensePlate: "LGP 789 L", earnings: 21500, avatarUrl: null, approvalStatus: "approved" as const, onboardingComplete: true, driverLicenseNumber: "MB34567", driverLicenseExpiry: "2026-12-01", driverLicenseCode: "B", isVerified: true },
        { username: "nomsa", password: "demo", fullName: "Nomsa Rikhotso", phone: "077 890 1234", role: "driver" as const, rating: 4.6, totalTrips: 320, isOnline: true, vehicleMake: "Toyota", vehicleModel: "Avanza", vehicleColor: "Grey", licensePlate: "LGP 321 L", earnings: 15800, avatarUrl: null, approvalStatus: "approved" as const, onboardingComplete: true, driverLicenseNumber: "NR78901", driverLicenseExpiry: "2028-03-20", driverLicenseCode: "C1", isVerified: true },
      ];

      const admin = { username: "admin", password: "admin", fullName: "GY Admin", phone: "078 000 0000", role: "admin" as const, rating: 5.0, totalTrips: 0, avatarUrl: null };

      const createdRiders = [];
      for (const r of riders) {
        createdRiders.push(await storage.createUser(r));
      }
      const createdDrivers = [];
      for (const d of drivers) {
        createdDrivers.push(await storage.createUser(d));
      }
      await storage.createUser(admin);

      const vTypes = [
        { name: "GY Standard", description: "Affordable everyday rides", basePrice: 15, pricePerKm: 8, seats: 4, icon: "car", isActive: true },
        { name: "GY Premium", description: "Comfortable newer vehicles", basePrice: 25, pricePerKm: 12, seats: 4, icon: "star", isActive: true },
        { name: "GY XL", description: "Larger vehicles for groups", basePrice: 30, pricePerKm: 14, seats: 7, icon: "truck", isActive: true },
        { name: "GY Medical", description: "Hospital & clinic transport", basePrice: 20, pricePerKm: 10, seats: 4, icon: "medical", isActive: true },
        { name: "GY Parcel", description: "Same-day parcel delivery", basePrice: 20, pricePerKm: 6, seats: 1, icon: "package", isActive: true },
      ];
      for (const v of vTypes) {
        await storage.createVehicleType(v);
      }

      const routes = [
        { routeName: "Giyani – Masingita Mall", fromLocation: "Giyani Taxi Rank", toLocation: "Masingita Mall", fare: 15, totalSeats: 15, availableSeats: 8, estimatedDeparture: "Every 15 min", fromLat: -23.318, fromLng: 30.718, toLat: -23.30, toLng: 30.73 },
        { routeName: "Giyani – Tzaneen", fromLocation: "Giyani Taxi Rank", toLocation: "Tzaneen Taxi Rank", fare: 50, totalSeats: 15, availableSeats: 4, estimatedDeparture: "When full", fromLat: -23.318, fromLng: 30.718, toLat: -23.832, toLng: 30.163 },
        { routeName: "Giyani – Polokwane", fromLocation: "Giyani Taxi Rank", toLocation: "Polokwane Bus Station", fare: 120, totalSeats: 15, availableSeats: 11, estimatedDeparture: "06:00, 10:00, 14:00", fromLat: -23.318, fromLng: 30.718, toLat: -23.907, toLng: 29.469 },
        { routeName: "Giyani – Hospital", fromLocation: "Giyani Taxi Rank", toLocation: "Giyani Hospital", fare: 10, totalSeats: 15, availableSeats: 12, estimatedDeparture: "Every 20 min", fromLat: -23.318, fromLng: 30.718, toLat: -23.315, toLng: 30.715 },
        { routeName: "Giyani – Thohoyandou", fromLocation: "Giyani Taxi Rank", toLocation: "Thohoyandou", fare: 80, totalSeats: 15, availableSeats: 6, estimatedDeparture: "When full", fromLat: -23.318, fromLng: 30.718, toLat: -22.945, toLng: 30.478 },
        { routeName: "Section A – CBD", fromLocation: "Section A Stop", toLocation: "Giyani CBD", fare: 8, totalSeats: 15, availableSeats: 10, estimatedDeparture: "Every 10 min", fromLat: -23.31, fromLng: 30.72, toLat: -23.32, toLng: 30.71 },
      ];
      for (const r of routes) {
        await storage.createTaxiRoute(r);
      }

      await storage.createSavedPlace({ userId: createdRiders[0].id, name: "Home", address: "Section A, Giyani", lat: -23.31, lng: 30.72, icon: "home" });
      await storage.createSavedPlace({ userId: createdRiders[0].id, name: "Work", address: "Giyani CBD", lat: -23.32, lng: 30.71, icon: "briefcase" });
      await storage.createSavedPlace({ userId: createdRiders[0].id, name: "Masingita Mall", address: "Main Road, Giyani", lat: -23.30, lng: 30.73, icon: "shopping-bag" });

      const demoTrips = [
        { riderId: createdRiders[0].id, driverId: createdDrivers[0].id, rideType: "private" as const, pickupName: "Masingita Mall", dropoffName: "Section A", fare: 45, distance: 3.8, duration: 12, status: "completed" as const, paymentMethod: "cash" as const, vehicleType: "GY Standard", rating: 5 },
        { riderId: createdRiders[0].id, driverId: createdDrivers[1].id, rideType: "private" as const, pickupName: "Section A", dropoffName: "Giyani CBD", fare: 35, distance: 2.5, duration: 8, status: "completed" as const, paymentMethod: "cash" as const, vehicleType: "GY Standard", rating: 4 },
        { riderId: createdRiders[1].id, driverId: createdDrivers[0].id, rideType: "shared" as const, pickupName: "Section B", dropoffName: "Masingita Mall", fare: 25, distance: 4.2, duration: 15, status: "completed" as const, paymentMethod: "cash" as const, vehicleType: "GY Standard", rating: 5, seatsBooked: 1 },
        { riderId: createdRiders[1].id, driverId: createdDrivers[2].id, rideType: "medical" as const, pickupName: "Giyani Hospital", dropoffName: "Section C", fare: 40, distance: 3.0, duration: 10, status: "completed" as const, paymentMethod: "cash" as const, vehicleType: "GY Medical", rating: 4, medicalNotes: "Hospital discharge transport" },
        { riderId: createdRiders[2].id, driverId: createdDrivers[1].id, rideType: "private" as const, pickupName: "Section D", dropoffName: "Giyani Plaza", fare: 55, distance: 5.0, duration: 18, status: "completed" as const, paymentMethod: "cash" as const, vehicleType: "GY Premium", rating: 5 },
        { riderId: createdRiders[0].id, driverId: createdDrivers[3].id, rideType: "parcel" as const, pickupName: "Section A", dropoffName: "Section B", fare: 30, distance: 2.0, duration: 7, status: "completed" as const, paymentMethod: "eft" as const, vehicleType: "GY Parcel", rating: 4, parcelDescription: "Small box - documents" },
      ];
      for (const t of demoTrips) {
        await storage.createTrip(t);
      }

      return res.json({ message: "Demo data seeded successfully" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}

```

---

## `server/storage.ts`

```ts
import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users, trips, savedPlaces, vehicleTypes, taxiRoutes,
  type User, type InsertUser,
  type Trip, type InsertTrip,
  type SavedPlace, type InsertSavedPlace,
  type VehicleType, type InsertVehicleType,
  type TaxiRoute, type InsertTaxiRoute,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  getOnlineDrivers(): Promise<User[]>;
  getPendingDrivers(): Promise<User[]>;

  createTrip(trip: InsertTrip): Promise<Trip>;
  getTrip(id: string): Promise<Trip | undefined>;
  updateTrip(id: string, data: Partial<InsertTrip>): Promise<Trip | undefined>;
  getTripsByRider(riderId: string): Promise<Trip[]>;
  getTripsByDriver(driverId: string): Promise<Trip[]>;
  getActiveTrips(): Promise<Trip[]>;
  getAllTrips(): Promise<Trip[]>;
  getRequestedTrips(): Promise<Trip[]>;

  getSavedPlaces(userId: string): Promise<SavedPlace[]>;
  createSavedPlace(place: InsertSavedPlace): Promise<SavedPlace>;
  deleteSavedPlace(id: string): Promise<void>;

  getVehicleTypes(): Promise<VehicleType[]>;
  createVehicleType(vt: InsertVehicleType): Promise<VehicleType>;
  updateVehicleType(id: string, data: Partial<InsertVehicleType>): Promise<VehicleType | undefined>;

  getTaxiRoutes(): Promise<TaxiRoute[]>;
  createTaxiRoute(route: InsertTaxiRoute): Promise<TaxiRoute>;
  updateTaxiRoute(id: string, data: Partial<InsertTaxiRoute>): Promise<TaxiRoute | undefined>;

  getStats(): Promise<{ totalDrivers: number; totalRiders: number; totalTrips: number; totalRevenue: number; onlineDrivers: number; activeTrips: number }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role as any));
  }

  async getOnlineDrivers(): Promise<User[]> {
    return db.select().from(users).where(and(eq(users.role, "driver"), eq(users.isOnline, true), eq(users.approvalStatus, "approved")));
  }

  async getPendingDrivers(): Promise<User[]> {
    return db.select().from(users).where(and(eq(users.role, "driver"), eq(users.onboardingComplete, true), eq(users.approvalStatus, "pending"))).orderBy(desc(users.createdAt));
  }

  async createTrip(trip: InsertTrip): Promise<Trip> {
    const [t] = await db.insert(trips).values(trip).returning();
    return t;
  }

  async getTrip(id: string): Promise<Trip | undefined> {
    const [t] = await db.select().from(trips).where(eq(trips.id, id));
    return t;
  }

  async updateTrip(id: string, data: Partial<InsertTrip>): Promise<Trip | undefined> {
    const updateData: any = { ...data };
    if (data.status === "completed") {
      updateData.completedAt = new Date();
    }
    const [t] = await db.update(trips).set(updateData).where(eq(trips.id, id)).returning();
    return t;
  }

  async getTripsByRider(riderId: string): Promise<Trip[]> {
    return db.select().from(trips).where(eq(trips.riderId, riderId)).orderBy(desc(trips.createdAt));
  }

  async getTripsByDriver(driverId: string): Promise<Trip[]> {
    return db.select().from(trips).where(eq(trips.driverId, driverId)).orderBy(desc(trips.createdAt));
  }

  async getActiveTrips(): Promise<Trip[]> {
    return db.select().from(trips).where(
      sql`${trips.status} IN ('requested', 'accepted', 'arriving', 'in_progress')`
    );
  }

  async getAllTrips(): Promise<Trip[]> {
    return db.select().from(trips).orderBy(desc(trips.createdAt));
  }

  async getRequestedTrips(): Promise<Trip[]> {
    return db.select().from(trips).where(eq(trips.status, "requested")).orderBy(desc(trips.createdAt));
  }

  async getSavedPlaces(userId: string): Promise<SavedPlace[]> {
    return db.select().from(savedPlaces).where(eq(savedPlaces.userId, userId));
  }

  async createSavedPlace(place: InsertSavedPlace): Promise<SavedPlace> {
    const [p] = await db.insert(savedPlaces).values(place).returning();
    return p;
  }

  async deleteSavedPlace(id: string): Promise<void> {
    await db.delete(savedPlaces).where(eq(savedPlaces.id, id));
  }

  async getVehicleTypes(): Promise<VehicleType[]> {
    return db.select().from(vehicleTypes);
  }

  async createVehicleType(vt: InsertVehicleType): Promise<VehicleType> {
    const [v] = await db.insert(vehicleTypes).values(vt).returning();
    return v;
  }

  async updateVehicleType(id: string, data: Partial<InsertVehicleType>): Promise<VehicleType | undefined> {
    const [v] = await db.update(vehicleTypes).set(data).where(eq(vehicleTypes.id, id)).returning();
    return v;
  }

  async getTaxiRoutes(): Promise<TaxiRoute[]> {
    return db.select().from(taxiRoutes).where(eq(taxiRoutes.isActive, true));
  }

  async createTaxiRoute(route: InsertTaxiRoute): Promise<TaxiRoute> {
    const [r] = await db.insert(taxiRoutes).values(route).returning();
    return r;
  }

  async updateTaxiRoute(id: string, data: Partial<InsertTaxiRoute>): Promise<TaxiRoute | undefined> {
    const [r] = await db.update(taxiRoutes).set(data).where(eq(taxiRoutes.id, id)).returning();
    return r;
  }

  async getStats() {
    const [driverCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.role, "driver"));
    const [riderCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.role, "rider"));
    const [tripCount] = await db.select({ count: sql<number>`count(*)::int` }).from(trips);
    const [revenue] = await db.select({ total: sql<number>`coalesce(sum(${trips.fare}), 0)::real` }).from(trips).where(eq(trips.status, "completed"));
    const [onlineCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(and(eq(users.role, "driver"), eq(users.isOnline, true)));
    const activeTrips = await this.getActiveTrips();

    return {
      totalDrivers: driverCount.count,
      totalRiders: riderCount.count,
      totalTrips: tripCount.count,
      totalRevenue: revenue.total,
      onlineDrivers: onlineCount.count,
      activeTrips: activeTrips.length,
    };
  }
}

export const storage = new DatabaseStorage();

```

---

## `server/static.ts`

```ts
import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

```

---

## `server/vite.ts`

```ts
import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("/{*path}", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

```

---

## `client/index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />

    <meta property="og:title" content="GY Rides" />
    <meta property="og:description" content="Local ride-hailing transport for Giyani, South Africa. Book affordable rides across all sections of Giyani." />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="https://replit.com/public/images/opengraph.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@replit" />
    <meta name="twitter:title" content="GY Rides" />
    <meta name="twitter:description" content="Local ride-hailing transport for Giyani, South Africa. Book affordable rides across all sections of Giyani." />
    <meta name="twitter:image" content="https://replit.com/public/images/opengraph.png" />

    <title>GY Rides</title>
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

```

---

## `client/src/main.tsx`

```tsx
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

```

---

## `client/src/App.tsx`

```tsx
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import RiderApp from "@/pages/RiderApp";
import DriverApp from "@/pages/DriverApp";
import DriverOnboarding from "@/pages/DriverOnboarding";
import AdminApp from "@/pages/AdminApp";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Home} />
      <Route path="/rider/:rest*" component={RiderApp} />
      <Route path="/rider" component={RiderApp} />
      <Route path="/driver/onboarding" component={DriverOnboarding} />
      <Route path="/driver/:rest*" component={DriverApp} />
      <Route path="/driver" component={DriverApp} />
      <Route path="/admin/:rest*" component={AdminApp} />
      <Route path="/admin" component={AdminApp} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

```

---

## `client/src/index.css`

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  --color-chart-1: hsl(var(--chart-1));
  --color-chart-2: hsl(var(--chart-2));
  --color-chart-3: hsl(var(--chart-3));
  --color-chart-4: hsl(var(--chart-4));
  --color-chart-5: hsl(var(--chart-5));
  --color-sidebar: hsl(var(--sidebar));
  --color-sidebar-foreground: hsl(var(--sidebar-foreground));
  --color-sidebar-primary: hsl(var(--sidebar-primary));
  --color-sidebar-primary-foreground: hsl(var(--sidebar-primary-foreground));
  --color-sidebar-accent: hsl(var(--sidebar-accent));
  --color-sidebar-accent-foreground: hsl(var(--sidebar-accent-foreground));
  --color-sidebar-border: hsl(var(--sidebar-border));
  --color-sidebar-ring: hsl(var(--sidebar-ring));
}

:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 5%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 5%;
  --card-border: 0 0% 92%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 5%;
  --primary: 45 96% 53%;
  --primary-foreground: 0 0% 5%;
  --secondary: 0 0% 96%;
  --secondary-foreground: 0 0% 15%;
  --muted: 0 0% 96%;
  --muted-foreground: 0 0% 45%;
  --accent: 0 0% 96%;
  --accent-foreground: 0 0% 15%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;
  --border: 0 0% 90%;
  --input: 0 0% 85%;
  --ring: 45 96% 53%;
  --chart-1: 45 96% 53%;
  --chart-2: 200 60% 50%;
  --chart-3: 150 60% 45%;
  --chart-4: 280 60% 55%;
  --chart-5: 30 80% 55%;
  --sidebar: 0 0% 98%;
  --sidebar-foreground: 0 0% 15%;
  --sidebar-primary: 45 96% 53%;
  --sidebar-primary-foreground: 0 0% 5%;
  --sidebar-accent: 0 0% 96%;
  --sidebar-accent-foreground: 0 0% 15%;
  --sidebar-border: 0 0% 90%;
  --sidebar-ring: 45 96% 53%;
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --radius: 0.75rem;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.04);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04);
  --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04);
  --shadow-2xl: 0 25px 50px -12px rgba(0,0,0,0.15);
  --tracking-normal: -0.01em;
  --spacing: 0.25rem;
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply font-sans antialiased bg-background text-foreground;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  html {
    scroll-behavior: smooth;
    -webkit-tap-highlight-color: transparent;
  }
}

@layer utilities {
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
}

```

---

## `client/src/lib/api.ts`

```ts
import { apiRequest } from "./queryClient";
import type { User, Trip, SavedPlace, VehicleType, TaxiRoute } from "@shared/schema";

export async function login(username: string, password: string): Promise<User> {
  const res = await apiRequest("POST", "/api/auth/login", { username, password });
  return res.json();
}

export async function register(data: any): Promise<User> {
  const res = await apiRequest("POST", "/api/auth/register", data);
  return res.json();
}

export async function getUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`, { credentials: "include" });
  return res.json();
}

export async function updateUser(id: string, data: Partial<User>): Promise<User> {
  const res = await apiRequest("PATCH", `/api/users/${id}`, data);
  return res.json();
}

export async function createTrip(data: any): Promise<Trip> {
  const res = await apiRequest("POST", "/api/trips", data);
  return res.json();
}

export async function updateTrip(id: string, data: any): Promise<Trip> {
  const res = await apiRequest("PATCH", `/api/trips/${id}`, data);
  return res.json();
}

export async function submitOnboarding(driverId: string, data: any): Promise<User> {
  const res = await apiRequest("PATCH", `/api/drivers/${driverId}/onboarding`, data);
  return res.json();
}

export async function approveDriver(driverId: string): Promise<User> {
  const res = await apiRequest("PATCH", `/api/admin/drivers/${driverId}/approve`);
  return res.json();
}

export async function rejectDriver(driverId: string, reason: string): Promise<User> {
  const res = await apiRequest("PATCH", `/api/admin/drivers/${driverId}/reject`, { reason });
  return res.json();
}

export async function seedData(): Promise<void> {
  await apiRequest("POST", "/api/seed");
}

```

---

## `client/src/lib/auth.tsx`

```tsx
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { User } from "@shared/schema";

interface AuthContext {
  user: User | null;
  setUser: (u: User | null) => void;
  logout: () => void;
}

const AuthCtx = createContext<AuthContext>({ user: null, setUser: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => {
    const saved = localStorage.getItem("gy_user");
    return saved ? JSON.parse(saved) : null;
  });

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) localStorage.setItem("gy_user", JSON.stringify(u));
    else localStorage.removeItem("gy_user");
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, [setUser]);

  return <AuthCtx.Provider value={{ user, setUser, logout }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}

```

---

## `client/src/lib/queryClient.ts`

```ts
import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

```

---

## `client/src/lib/utils.ts`

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```

---

## `client/src/hooks/use-toast.ts`

```ts
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }

```

---

## `client/src/hooks/use-mobile.tsx`

```tsx
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

```

---

## `client/src/pages/Home.tsx`

```tsx
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Car, User, Settings, ArrowRight, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { login, register, seedData } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { user, setUser } = useAuth();
  const [, setLocation] = useLocation();
  const [showLogin, setShowLogin] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"rider" | "driver">("rider");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!seeded) {
      seedData().catch(() => {});
      setSeeded(true);
    }
  }, [seeded]);

  const handleLogin = async () => {
    if (!username || !password) {
      toast({ title: "Missing fields", description: "Please enter username and password", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const u = await login(username, password);
      setUser(u);
      if (u.role === "rider") setLocation("/rider");
      else if (u.role === "driver") {
        if (u.approvalStatus === "approved") setLocation("/driver");
        else setLocation("/driver/onboarding");
      }
      else setLocation("/admin");
    } catch {
      toast({ title: "Login failed", description: "Check your username and password", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!username || !password || !fullName || !phone) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please confirm your password", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const u = await register({ username, password, fullName, phone, role });
      setUser(u);
      if (u.role === "rider") setLocation("/rider");
      else setLocation("/driver/onboarding");
    } catch {
      toast({ title: "Registration failed", description: "Username may already be taken", variant: "destructive" });
    }
    setLoading(false);
  };

  if (user) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-black">
        <div className="w-full max-w-sm mx-auto text-center">
          <div className="w-20 h-20 bg-yellow-400 rounded-3xl flex items-center justify-center shadow-lg mb-6 mx-auto">
            <Car size={40} className="text-black" />
          </div>
          <h1 className="text-3xl font-black mb-2 text-white">Welcome back, {user.fullName.split(" ")[0]}!</h1>
          <p className="text-gray-400 mb-8">Signed in as {user.role}</p>

          <div className="space-y-3">
            {user.role === "rider" && (
              <Button size="lg" className="w-full h-14 rounded-2xl text-lg bg-yellow-400 hover:bg-yellow-500 text-black font-bold" onClick={() => setLocation("/rider")} data-testid="btn-go-rider">
                <Car className="mr-3" /> Book a Ride <ArrowRight className="ml-auto" size={18} />
              </Button>
            )}
            {user.role === "driver" && (
              <Button size="lg" className="w-full h-14 rounded-2xl text-lg bg-yellow-400 hover:bg-yellow-500 text-black font-bold" onClick={() => setLocation("/driver")} data-testid="btn-go-driver">
                <Car className="mr-3" /> Driver Dashboard <ArrowRight className="ml-auto" size={18} />
              </Button>
            )}
            {user.role === "admin" && (
              <Button size="lg" className="w-full h-14 rounded-2xl text-lg bg-yellow-400 hover:bg-yellow-500 text-black font-bold" onClick={() => setLocation("/admin")} data-testid="btn-go-admin">
                <Settings className="mr-3" /> Admin Panel <ArrowRight className="ml-auto" size={18} />
              </Button>
            )}
            <Button variant="ghost" className="w-full text-gray-400 hover:text-white" onClick={() => { setUser(null); }}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (showLogin) {
    return (
      <div className="min-h-[100dvh] flex flex-col p-6 bg-black">
        <div className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center">
          <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg mb-8 mx-auto">
            <Car size={32} className="text-black" />
          </div>
          <h2 className="text-2xl font-black text-center mb-1 text-white">{isRegister ? "Create Account" : "Welcome Back"}</h2>
          <p className="text-gray-400 text-center mb-8">{isRegister ? "Join GY Rides today" : "Sign in to continue"}</p>

          <div className="space-y-3">
            <Input
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="h-14 rounded-2xl bg-white/10 border-white/20 px-5 text-lg text-white placeholder:text-gray-500"
              data-testid="input-username"
            />

            {isRegister && (
              <>
                <Input
                  placeholder="Full Name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="h-14 rounded-2xl bg-white/10 border-white/20 px-5 text-lg text-white placeholder:text-gray-500"
                  data-testid="input-fullname"
                />
                <Input
                  placeholder="Phone Number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="h-14 rounded-2xl bg-white/10 border-white/20 px-5 text-lg text-white placeholder:text-gray-500"
                  data-testid="input-phone"
                />
                <Input
                  placeholder="Email (optional)"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="h-14 rounded-2xl bg-white/10 border-white/20 px-5 text-lg text-white placeholder:text-gray-500"
                  data-testid="input-email"
                />
              </>
            )}

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-14 rounded-2xl bg-white/10 border-white/20 px-5 pr-12 text-lg text-white placeholder:text-gray-500"
                data-testid="input-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                data-testid="btn-toggle-password"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {isRegister && (
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="h-14 rounded-2xl bg-white/10 border-white/20 px-5 text-lg text-white placeholder:text-gray-500"
                data-testid="input-confirm-password"
              />
            )}

            {isRegister && (
              <div className="flex gap-3">
                <button
                  className={`flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm border-2 transition-all ${role === "rider" ? "bg-yellow-400 text-black border-yellow-400" : "bg-transparent text-gray-400 border-white/20"}`}
                  onClick={() => setRole("rider")}
                  data-testid="btn-role-rider"
                >
                  <User className="h-4 w-4" /> Passenger
                </button>
                <button
                  className={`flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm border-2 transition-all ${role === "driver" ? "bg-yellow-400 text-black border-yellow-400" : "bg-transparent text-gray-400 border-white/20"}`}
                  onClick={() => setRole("driver")}
                  data-testid="btn-role-driver"
                >
                  <Car className="h-4 w-4" /> Driver
                </button>
              </div>
            )}

            {!isRegister && (
              <div className="text-right">
                <button className="text-yellow-400 text-sm font-medium" data-testid="btn-forgot-password">
                  Forgot password?
                </button>
              </div>
            )}

            <button
              className="w-full h-14 rounded-2xl text-lg font-bold bg-yellow-400 hover:bg-yellow-500 text-black transition-colors disabled:opacity-50"
              onClick={isRegister ? handleRegister : handleLogin}
              disabled={loading}
              data-testid="btn-submit-auth"
            >
              {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
            </button>

            {!isRegister && (
              <div className="bg-white/5 rounded-2xl p-4 text-sm text-gray-400 border border-white/10">
                <p className="font-bold mb-1 text-gray-300">Demo Accounts:</p>
                <p>Rider: <span className="font-mono text-yellow-400">jane / demo</span></p>
                <p>Driver: <span className="font-mono text-yellow-400">sipho / demo</span></p>
                <p>Admin: <span className="font-mono text-yellow-400">admin / admin</span></p>
              </div>
            )}

            <button className="w-full text-gray-400 text-sm py-3" onClick={() => { setIsRegister(!isRegister); setConfirmPassword(""); }}>
              {isRegister ? "Already have an account? Sign In" : "New here? Create Account"}
            </button>
            <button className="w-full text-gray-500 text-sm" onClick={() => setShowLogin(false)}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-black relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-40 h-40 bg-yellow-400 rounded-full blur-3xl" />
        <div className="absolute bottom-32 right-8 w-56 h-56 bg-yellow-400 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mx-auto relative z-10">
        <div className="w-24 h-24 bg-yellow-400 rounded-3xl flex items-center justify-center shadow-xl mb-6">
          <Car size={48} className="text-black" />
        </div>

        <h1 className="text-4xl font-black text-center mb-2 tracking-tight text-white">GY Rides</h1>
        <p className="text-yellow-400 text-center mb-2 text-lg font-medium">Your local ride, anytime.</p>
        <p className="text-gray-500 text-center mb-12 text-sm">Transport made easy in Giyani</p>

        <div className="space-y-3 w-full">
          <button
            className="w-full h-14 text-lg rounded-2xl shadow-lg flex items-center justify-between px-6 font-bold bg-yellow-400 text-black transition-colors hover:bg-yellow-500"
            onClick={() => { setShowLogin(true); setIsRegister(false); }}
            data-testid="btn-get-started"
          >
            <span className="flex items-center gap-3">
              <LogIn size={22} />
              Sign In
            </span>
            <ArrowRight size={20} />
          </button>

          <button
            className="w-full h-14 text-lg rounded-2xl flex items-center justify-between px-6 font-bold border-2 border-white/20 text-white transition-colors hover:border-yellow-400 hover:text-yellow-400"
            onClick={() => { setShowLogin(true); setIsRegister(true); }}
            data-testid="btn-create-account"
          >
            <span className="flex items-center gap-3">
              <UserPlus size={22} />
              Create Account
            </span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>

      <div className="mt-8 text-sm text-gray-600 text-center relative z-10">
        Giyani, Limpopo, South Africa
      </div>
    </div>
  );
}

```

---

## `client/src/pages/RiderApp.tsx`

```tsx
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { MapPin, Search, Clock, CreditCard, ChevronLeft, Star, Home as HomeIcon, Briefcase, ShoppingBag, User, History, BookmarkPlus, Car, LogOut, Menu, X, Navigation, Share2, Crosshair, Phone, MessageCircle, Shield, AlertTriangle, Edit2, Tag, StickyNote, RotateCcw, Download, Users, Package, Heart, Bus, Banknote, Wallet, Upload, CheckCircle, UserPlus, Minus, Plus, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { createTrip, updateTrip, updateUser } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import GiyaniMap from "@/components/GiyaniMap";
import type { Trip, SavedPlace, VehicleType, User as UserType, TaxiRoute } from "@shared/schema";

const GIYANI_LOCATIONS = [
  { name: "Masingita Mall", address: "Main Road, Giyani", lat: -23.30, lng: 30.73 },
  { name: "Giyani CBD", address: "Central Business District", lat: -23.32, lng: 30.71 },
  { name: "Section A", address: "Giyani Section A", lat: -23.31, lng: 30.72 },
  { name: "Section B", address: "Giyani Section B", lat: -23.29, lng: 30.74 },
  { name: "Section C", address: "Giyani Section C", lat: -23.33, lng: 30.70 },
  { name: "Section D", address: "Giyani Section D", lat: -23.28, lng: 30.75 },
  { name: "Section E", address: "Giyani Section E", lat: -23.295, lng: 30.735 },
  { name: "Giyani Hospital", address: "Hospital Road", lat: -23.315, lng: 30.715 },
  { name: "Giyani Plaza", address: "Plaza Street", lat: -23.325, lng: 30.725 },
  { name: "Giyani Stadium", address: "Stadium Road", lat: -23.305, lng: 30.735 },
  { name: "Giyani Taxi Rank", address: "Main Taxi Rank", lat: -23.318, lng: 30.718 },
  { name: "Thohoyandou Road", address: "R81 Highway", lat: -23.27, lng: 30.76 },
  { name: "Giyani Clinic", address: "Section B Clinic", lat: -23.295, lng: 30.74 },
  { name: "Nkhensani Hospital", address: "Hospital Complex", lat: -23.312, lng: 30.712 },
];

const QUICK_DESTINATIONS = [
  { name: "Home", icon: "home" },
  { name: "Work", icon: "briefcase" },
  { name: "Hospital", icon: "hospital" },
  { name: "Mall", icon: "shopping" },
  { name: "Taxi Rank", icon: "taxi" },
  { name: "Clinic", icon: "clinic" },
];

type RideType = "private" | "shared" | "taxi" | "parcel" | "medical";
type PaymentMethod = "cash" | "eft" | "ewallet" | "card";

const RIDE_TYPES: { key: RideType; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: "private", label: "Private", icon: <Car className="h-5 w-5" />, desc: "Just for you" },
  { key: "shared", label: "Shared", icon: <Users className="h-5 w-5" />, desc: "Share & save" },
  { key: "taxi", label: "Taxi", icon: <Bus className="h-5 w-5" />, desc: "Route taxis" },
  { key: "parcel", label: "Parcel", icon: <Package className="h-5 w-5" />, desc: "Send items" },
  { key: "medical", label: "Medical", icon: <Heart className="h-5 w-5" />, desc: "Health trips" },
];

function generateTripPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function RiderApp() {
  const { user, setUser, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<"home" | "search" | "pickmap" | "confirm" | "searching" | "tracking" | "completed" | "history" | "profile" | "menu" | "taxi" | "wallet" | "safety">("home");
  const [pickup, setPickup] = useState<typeof GIYANI_LOCATIONS[0] | null>(null);
  const [dropoff, setDropoff] = useState<typeof GIYANI_LOCATIONS[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFor, setSearchFor] = useState<"pickup" | "dropoff">("dropoff");
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(null);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [assignedDriver, setAssignedDriver] = useState<UserType | null>(null);
  const [pinDrop, setPinDrop] = useState<{ lat: number; lng: number } | null>(null);
  const [tripPin, setTripPin] = useState("");
  const [rideNote, setRideNote] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [driverRating, setDriverRating] = useState(0);
  const [rideStatus, setRideStatus] = useState<"searching" | "on_the_way" | "arrived" | "in_progress">("searching");
  const [activeTab, setActiveTab] = useState<"home" | "activity" | "profile">("home");
  const [rideType, setRideType] = useState<RideType>("private");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [sharedSeats, setSharedSeats] = useState(1);
  const [medicalNotes, setMedicalNotes] = useState("");
  const [parcelDescription, setParcelDescription] = useState("");
  const [trustedContactInput, setTrustedContactInput] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || user.role !== "rider") {
      setLocation("/");
    }
  }, [user]);

  const { data: savedPlaces = [] } = useQuery<SavedPlace[]>({
    queryKey: ["/api/saved-places", user?.id ?? ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  const { data: vehicleTypes = [] } = useQuery<VehicleType[]>({
    queryKey: ["/api/vehicle-types"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: tripHistory = [] } = useQuery<Trip[]>({
    queryKey: ["/api/trips/rider", user?.id ?? ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  const { data: onlineDrivers = [] } = useQuery<UserType[]>({
    queryKey: ["/api/drivers/online"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: taxiRoutes = [] } = useQuery<TaxiRoute[]>({
    queryKey: ["/api/taxi-routes"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  if (!user) return null;

  const trustedContacts: string[] = user.trustedContacts ? JSON.parse(user.trustedContacts) : [];

  const filteredVehicleTypes = vehicleTypes.filter(vt => {
    if (rideType === "medical") return vt.name.toLowerCase().includes("medical") || vt.name.toLowerCase().includes("standard");
    if (rideType === "parcel") return vt.name.toLowerCase().includes("parcel") || vt.name.toLowerCase().includes("standard");
    if (rideType === "shared") return !vt.name.toLowerCase().includes("parcel") && !vt.name.toLowerCase().includes("medical");
    return !vt.name.toLowerCase().includes("parcel") && !vt.name.toLowerCase().includes("medical");
  });

  const calcDistance = () => {
    if (!pickup || !dropoff) return 3;
    return Math.sqrt(Math.pow((pickup.lat - dropoff.lat) * 111, 2) + Math.pow((pickup.lng - dropoff.lng) * 111 * Math.cos(pickup.lat * Math.PI / 180), 2));
  };

  const calcFare = (vt: VehicleType) => {
    let fare = Math.round(vt.basePrice + vt.pricePerKm * calcDistance());
    if (rideType === "shared") fare = Math.round(fare * 0.6 * sharedSeats);
    return fare;
  };

  const calcDuration = () => Math.round(calcDistance() * 3 + 4);

  const filteredLocations = GIYANI_LOCATIONS.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.address.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleBookRide = async () => {
    if (!pickup || !dropoff || !selectedVehicle || !user) return;
    setView("searching");
    setRideStatus("searching");
    const pin = generateTripPin();
    setTripPin(pin);

    try {
      const driver = onlineDrivers[0];
      const dist = calcDistance();
      const trip = await createTrip({
        riderId: user.id,
        driverId: driver?.id || null,
        rideType,
        pickupName: pickup.name,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropoffName: dropoff.name,
        dropoffLat: dropoff.lat,
        dropoffLng: dropoff.lng,
        fare: calcFare(selectedVehicle),
        distance: dist,
        duration: calcDuration(),
        vehicleType: selectedVehicle.name,
        paymentMethod: paymentMethod as any,
        status: "requested",
        seatsBooked: rideType === "shared" ? sharedSeats : 1,
        medicalNotes: rideType === "medical" ? medicalNotes : null,
        parcelDescription: rideType === "parcel" ? parcelDescription : null,
        rideNote,
      });
      setCurrentTrip(trip);
      if (driver) setAssignedDriver(driver);

      setTimeout(async () => {
        if (driver) {
          const updated = await updateTrip(trip.id, { status: "accepted", driverId: driver.id });
          setCurrentTrip(updated);
          setRideStatus("on_the_way");
        }
        setView("tracking");
      }, 2500);
    } catch {
      setView("home");
    }
  };

  const handleWhatsAppBooking = () => {
    const pickupText = pickup?.name || "My location";
    const dropoffText = dropoff?.name || "Not set";
    const typeLabel = rideType === "medical" ? "Medical Transport" : rideType === "parcel" ? "Parcel Delivery" : rideType === "shared" ? `Shared Ride (${sharedSeats} seat${sharedSeats > 1 ? "s" : ""})` : "Private Ride";
    const msg = `Hi GY Rides! I'd like to book a ride:\n\nType: ${typeLabel}\nPickup: ${pickupText}\nDrop-off: ${dropoffText}\nPhone: ${user.phone}\nName: ${user.fullName}\nPayment: ${paymentMethod}${medicalNotes ? `\nMedical notes: ${medicalNotes}` : ""}${parcelDescription ? `\nParcel: ${parcelDescription}` : ""}`;
    window.open(`https://wa.me/27780000000?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleCancelTrip = async () => {
    if (currentTrip) {
      await updateTrip(currentTrip.id, { status: "cancelled" });
    }
    setCurrentTrip(null);
    setAssignedDriver(null);
    setPickup(null);
    setDropoff(null);
    setRideNote("");
    setPromoCode("");
    setMedicalNotes("");
    setParcelDescription("");
    setView("home");
    queryClient.invalidateQueries({ queryKey: ["/api/trips/rider"] });
  };

  const handleCompleteTrip = () => {
    setDriverRating(0);
    setView("completed");
  };

  const handleSubmitRating = async () => {
    if (currentTrip) {
      await updateTrip(currentTrip.id, { status: "completed", rating: driverRating || 5 });
    }
    queryClient.invalidateQueries({ queryKey: ["/api/trips/rider"] });
    setCurrentTrip(null);
    setAssignedDriver(null);
    setPickup(null);
    setDropoff(null);
    setRideNote("");
    setPromoCode("");
    setMedicalNotes("");
    setParcelDescription("");
    setView("home");
    toast({ title: "Trip completed!", description: "Thanks for riding with GY Rides" });
  };

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`);
      const data = await res.json();
      if (data.display_name) return data.display_name.split(",").slice(0, 3).join(",").trim();
    } catch {}
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }, []);

  const handlePinDrop = useCallback((lat: number, lng: number) => { setPinDrop({ lat, lng }); }, []);

  const handleConfirmPin = useCallback(async () => {
    if (!pinDrop) return;
    const name = await reverseGeocode(pinDrop.lat, pinDrop.lng);
    const loc = { name, address: "Pinned on map", lat: pinDrop.lat, lng: pinDrop.lng };
    if (searchFor === "pickup") { setPickup(loc); setSearchFor("dropoff"); }
    else { setDropoff(loc); }
    setPinDrop(null);
    if (searchFor === "dropoff" || (searchFor === "pickup" && dropoff)) setView("confirm");
    else setView("home");
  }, [pinDrop, searchFor, dropoff, reverseGeocode]);

  const handleShareLocation = useCallback(async () => {
    if (!currentTrip) return;
    const shareText = `I'm on a GY Rides trip!\nFrom: ${currentTrip.pickupName}\nTo: ${currentTrip.dropoffName}\nTrip PIN: ${tripPin}\nTrack me: https://www.google.com/maps?q=${currentTrip.dropoffLat},${currentTrip.dropoffLng}`;
    if (navigator.share) {
      try { await navigator.share({ title: "My GY Rides Trip", text: shareText }); } catch {}
    } else {
      await navigator.clipboard.writeText(shareText);
      toast({ title: "Link copied!", description: "Trip details copied to clipboard" });
    }
  }, [currentTrip, tripPin, toast]);

  const handleSharePickup = useCallback(async () => {
    const loc = pickup || pinDrop;
    if (!loc) return;
    const text = `My pickup location:\nhttps://www.google.com/maps?q=${loc.lat},${loc.lng}`;
    if (navigator.share) {
      try { await navigator.share({ title: "My Pickup Location", text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Link copied!", description: "Pickup location copied to clipboard" });
    }
  }, [pickup, pinDrop, toast]);

  const handleShareWithContacts = useCallback(() => {
    if (!currentTrip || trustedContacts.length === 0) return;
    const msg = `GY Rides Trip Alert!\n${user.fullName} is on a trip:\nFrom: ${currentTrip.pickupName}\nTo: ${currentTrip.dropoffName}\nPIN: ${tripPin}\nMap: https://www.google.com/maps?q=${currentTrip.dropoffLat},${currentTrip.dropoffLng}`;
    trustedContacts.forEach(phone => {
      window.open(`https://wa.me/${phone.replace(/\s+/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
    });
    toast({ title: "Shared with trusted contacts", description: `Sent to ${trustedContacts.length} contact(s)` });
  }, [currentTrip, trustedContacts, tripPin, user, toast]);

  const handleSOS = () => {
    toast({ title: "SOS Alert Sent", description: "Emergency contacts have been notified with your location" });
    if (trustedContacts.length > 0) handleShareWithContacts();
  };

  const addTrustedContact = async () => {
    if (!trustedContactInput.trim()) return;
    const updated = [...trustedContacts, trustedContactInput.trim()];
    await updateUser(user.id, { trustedContacts: JSON.stringify(updated) } as any);
    setUser({ ...user, trustedContacts: JSON.stringify(updated) });
    setTrustedContactInput("");
    toast({ title: "Contact added" });
  };

  const removeTrustedContact = async (phone: string) => {
    const updated = trustedContacts.filter(c => c !== phone);
    await updateUser(user.id, { trustedContacts: JSON.stringify(updated) } as any);
    setUser({ ...user, trustedContacts: JSON.stringify(updated) });
  };

  const iconForPlace = (icon: string | null) => {
    switch (icon) {
      case "home": return <HomeIcon className="h-4 w-4" />;
      case "briefcase": return <Briefcase className="h-4 w-4" />;
      case "shopping-bag": return <ShoppingBag className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  const quickDestIcon = (icon: string) => {
    switch (icon) {
      case "home": return <HomeIcon className="h-5 w-5" />;
      case "briefcase": return <Briefcase className="h-5 w-5" />;
      case "hospital": return <Heart className="h-5 w-5" />;
      case "shopping": return <ShoppingBag className="h-5 w-5" />;
      case "taxi": return <Bus className="h-5 w-5" />;
      case "clinic": return <Shield className="h-5 w-5" />;
      default: return <MapPin className="h-5 w-5" />;
    }
  };

  const paymentLabel = (m: PaymentMethod) => {
    switch (m) {
      case "cash": return "Cash";
      case "eft": return "EFT";
      case "ewallet": return "Wallet";
      case "card": return "Card";
    }
  };

  const BottomNav = () => (
    <div className="bg-white border-t border-gray-100 px-4 py-2 flex justify-around items-center safe-area-bottom" data-testid="bottom-nav">
      <button className={`flex flex-col items-center gap-1 py-1 px-3 ${activeTab === "home" ? "text-black" : "text-gray-400"}`} onClick={() => { setActiveTab("home"); setView("home"); }} data-testid="tab-home">
        <HomeIcon className="h-5 w-5" /><span className="text-[10px] font-medium">Home</span>
      </button>
      <button className={`flex flex-col items-center gap-1 py-1 px-3 ${activeTab === "activity" ? "text-black" : "text-gray-400"}`} onClick={() => { setActiveTab("activity"); setView("history"); }} data-testid="tab-activity">
        <Clock className="h-5 w-5" /><span className="text-[10px] font-medium">Activity</span>
      </button>
      <button className={`flex flex-col items-center gap-1 py-1 px-3 ${activeTab === "profile" ? "text-black" : "text-gray-400"}`} onClick={() => { setActiveTab("profile"); setView("profile"); }} data-testid="tab-profile">
        <User className="h-5 w-5" /><span className="text-[10px] font-medium">Profile</span>
      </button>
    </div>
  );

  // ── Safety / Trusted Contacts ──
  if (view === "safety") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setView("menu")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Safety Center</h1>
        </div>
        <div className="flex-1 p-5 space-y-5 overflow-auto pb-20">
          <div className="bg-red-50 rounded-2xl p-5 border border-red-200 text-center">
            <button onClick={handleSOS} className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg" data-testid="btn-sos-safety">
              <AlertTriangle className="h-10 w-10 text-white" />
            </button>
            <h3 className="font-bold text-red-700 mb-1">Emergency SOS</h3>
            <p className="text-xs text-red-600">Sends your location to all trusted contacts</p>
          </div>

          <div>
            <h3 className="font-bold mb-3">Trusted Contacts</h3>
            <p className="text-xs text-gray-500 mb-3">These contacts will receive your trip details when you share or press SOS.</p>
            <div className="space-y-2 mb-3">
              {trustedContacts.map((c, i) => (
                <div key={i} className="bg-white rounded-xl p-3 flex items-center justify-between border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center"><Phone className="h-4 w-4 text-green-600" /></div>
                    <span className="font-medium text-sm">{c}</span>
                  </div>
                  <button onClick={() => removeTrustedContact(c)} className="text-red-400"><X className="h-4 w-4" /></button>
                </div>
              ))}
              {trustedContacts.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No trusted contacts added yet</p>}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Phone number (e.g., 071 234 5678)"
                value={trustedContactInput}
                onChange={e => setTrustedContactInput(e.target.value)}
                className="h-12 rounded-xl flex-1"
                data-testid="input-trusted-contact"
              />
              <Button className="h-12 px-4 rounded-xl bg-black text-white" onClick={addTrustedContact} data-testid="btn-add-contact">
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-3">Safety Features</h3>
            <div className="space-y-2">
              {[
                { icon: <Share2 className="h-4 w-4" />, label: "Share Trip", desc: "Share live trip details with contacts" },
                { icon: <Shield className="h-4 w-4" />, label: "Ride PIN", desc: "Verify your driver before boarding" },
                { icon: <Star className="h-4 w-4" />, label: "Driver Ratings", desc: "Rate every ride for safety" },
                { icon: <BadgeCheck className="h-4 w-4" />, label: "Verified Drivers", desc: "All drivers are document-verified" },
              ].map((f, i) => (
                <div key={i} className="bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-100 shadow-sm">
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">{f.icon}</div>
                  <div><div className="font-medium text-sm">{f.label}</div><div className="text-[10px] text-gray-500">{f.desc}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Wallet ──
  if (view === "wallet") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setView("menu")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Wallet</h1>
        </div>
        <div className="flex-1 p-5 space-y-5 overflow-auto pb-20">
          <div className="bg-black rounded-2xl p-6 text-white text-center">
            <p className="text-xs text-gray-400 mb-1">Wallet Balance</p>
            <p className="text-4xl font-black">R{(user.walletBalance ?? 0).toFixed(0)}</p>
          </div>

          <h3 className="font-bold">Payment Methods</h3>
          <div className="space-y-2">
            {(["cash", "ewallet", "eft", "card"] as PaymentMethod[]).map(m => (
              <button key={m} className={`w-full bg-white rounded-xl p-4 flex items-center gap-3 border-2 transition-all ${paymentMethod === m ? "border-yellow-400" : "border-gray-100"}`}
                onClick={() => setPaymentMethod(m)} data-testid={`payment-${m}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === m ? "bg-yellow-400" : "bg-gray-100"}`}>
                  {m === "cash" ? <Banknote className={`h-5 w-5 ${paymentMethod === m ? "text-black" : "text-gray-600"}`} /> :
                   m === "ewallet" ? <Wallet className={`h-5 w-5 ${paymentMethod === m ? "text-black" : "text-gray-600"}`} /> :
                   m === "eft" ? <Upload className={`h-5 w-5 ${paymentMethod === m ? "text-black" : "text-gray-600"}`} /> :
                   <CreditCard className={`h-5 w-5 ${paymentMethod === m ? "text-black" : "text-gray-600"}`} />}
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-sm">{paymentLabel(m)}</div>
                  <div className="text-[10px] text-gray-500">
                    {m === "cash" ? "Pay driver directly" :
                     m === "ewallet" ? `Balance: R${(user.walletBalance ?? 0).toFixed(0)}` :
                     m === "eft" ? "Upload proof after transfer" :
                     "Coming soon"}
                  </div>
                </div>
                {paymentMethod === m && <CheckCircle className="h-5 w-5 text-yellow-500" />}
              </button>
            ))}
          </div>

          {paymentMethod === "eft" && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <h4 className="font-bold text-sm text-blue-800 mb-2">EFT Banking Details</h4>
              <div className="text-xs text-blue-700 space-y-1">
                <p>Bank: FNB</p>
                <p>Account: 62 XXX XXX XXX</p>
                <p>Branch Code: 250 655</p>
                <p>Reference: Your phone number</p>
              </div>
              <p className="text-[10px] text-blue-600 mt-2">Upload proof of payment after transferring</p>
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Taxi Routes ──
  if (view === "taxi") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setView("home")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Taxi Routes</h1>
        </div>
        <div className="flex-1 p-4 space-y-3 overflow-auto pb-20">
          <p className="text-sm text-gray-500">Live queue info from Giyani Taxi Rank</p>
          {taxiRoutes.map(route => (
            <div key={route.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100" data-testid={`taxi-route-${route.id}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-sm">{route.routeName}</h3>
                  <p className="text-[10px] text-gray-500">{route.fromLocation} → {route.toLocation}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">R{route.fare}</div>
                  <div className="text-[10px] text-gray-500">per seat</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className={`text-sm font-bold ${route.availableSeats <= 3 ? "text-red-600" : route.availableSeats <= 7 ? "text-yellow-600" : "text-green-600"}`}>
                    {route.availableSeats}/{route.totalSeats}
                  </div>
                  <div className="text-[10px] text-gray-500">Seats</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className="text-sm font-bold">{route.estimatedDeparture}</div>
                  <div className="text-[10px] text-gray-500">Departs</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className={`text-sm font-bold ${route.isActive ? "text-green-600" : "text-red-600"}`}>{route.isActive ? "Active" : "Off"}</div>
                  <div className="text-[10px] text-gray-500">Status</div>
                </div>
              </div>
              <Button
                className="w-full h-11 rounded-xl bg-yellow-400 text-black hover:bg-yellow-500 font-bold text-sm"
                onClick={() => {
                  setRideType("taxi");
                  setPickup({ name: route.fromLocation, address: route.routeName, lat: route.fromLat ?? -23.318, lng: route.fromLng ?? 30.718 });
                  setDropoff({ name: route.toLocation, address: route.routeName, lat: route.toLat ?? -23.32, lng: route.toLng ?? 30.71 });
                  setView("confirm");
                }}
                data-testid={`btn-book-taxi-${route.id}`}
              >
                Book Seat · R{route.fare}
              </Button>
            </div>
          ))}
          {taxiRoutes.length === 0 && <p className="text-center py-16 text-gray-400 text-sm">No taxi routes available</p>}

          <div className="bg-green-50 rounded-xl p-4 border border-green-200 mt-4">
            <h4 className="font-bold text-sm text-green-800 mb-1">Can't find your route?</h4>
            <p className="text-xs text-green-700 mb-3">Book on WhatsApp and we'll find a taxi for you.</p>
            <Button className="w-full h-10 rounded-xl bg-green-600 text-white hover:bg-green-700 text-sm font-bold" onClick={() => {
              window.open(`https://wa.me/27780000000?text=${encodeURIComponent("Hi GY Rides! I need a taxi from Giyani. Can you help?")}`, "_blank");
            }} data-testid="btn-whatsapp-taxi">
              <MessageCircle className="h-4 w-4 mr-2" /> Book on WhatsApp
            </Button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Side Menu ──
  if (view === "menu") {
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col">
        <div className="bg-black text-white p-6 pb-8">
          <Button variant="ghost" size="icon" className="text-white mb-4 -ml-2" onClick={() => setView("home")} data-testid="btn-close-menu">
            <X className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-yellow-400">
              <AvatarFallback className="bg-yellow-400 text-black text-xl font-bold">{user.fullName[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{user.fullName}</h2>
              <div className="flex items-center gap-1 text-yellow-400 text-sm">
                <Star className="h-3 w-3 fill-current" /> {user.rating?.toFixed(1)} · {user.totalTrips} trips
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 space-y-1">
          {[
            { icon: <HomeIcon className="h-5 w-5" />, label: "Home", action: () => setView("home") },
            { icon: <History className="h-5 w-5" />, label: "Trip History", action: () => setView("history") },
            { icon: <Bus className="h-5 w-5" />, label: "Taxi Routes", action: () => setView("taxi") },
            { icon: <Wallet className="h-5 w-5" />, label: "Wallet & Payments", action: () => setView("wallet") },
            { icon: <BookmarkPlus className="h-5 w-5" />, label: "Saved Places", action: () => setView("profile") },
            { icon: <Shield className="h-5 w-5" />, label: "Safety & Contacts", action: () => setView("safety") },
            { icon: <User className="h-5 w-5" />, label: "Profile", action: () => setView("profile") },
          ].map((item, i) => (
            <Button key={i} variant="ghost" className="w-full justify-start h-14 text-base rounded-xl gap-4" onClick={item.action}>
              {item.icon} {item.label}
            </Button>
          ))}
        </div>
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start h-14 text-base rounded-xl gap-4 text-red-500" onClick={() => { logout(); setLocation("/"); }} data-testid="btn-logout">
            <LogOut className="h-5 w-5" /> Sign Out
          </Button>
        </div>
      </div>
    );
  }

  // ── Trip History ──
  if (view === "history") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setView("home")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Trip History</h1>
        </div>
        <div className="flex-1 p-4 space-y-3 overflow-auto pb-20">
          {tripHistory.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Car className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="font-medium">No trips yet</p>
              <p className="text-sm">Your completed rides will appear here</p>
            </div>
          ) : tripHistory.map((trip) => (
            <button
              key={trip.id}
              className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
              data-testid={`trip-history-${trip.id}`}
              onClick={() => {
                const loc = GIYANI_LOCATIONS.find(l => l.name === trip.dropoffName);
                if (loc) {
                  setDropoff(loc);
                  const pickLoc = GIYANI_LOCATIONS.find(l => l.name === trip.pickupName);
                  if (pickLoc) setPickup(pickLoc);
                  setRideType((trip.rideType as RideType) || "private");
                  setView("confirm");
                }
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{trip.createdAt ? new Date(trip.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : ""}</span>
                  {trip.rideType && trip.rideType !== "private" && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">{trip.rideType}</span>
                  )}
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${trip.status === "completed" ? "bg-green-100 text-green-700" : trip.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {trip.status}
                </span>
              </div>
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-sm"><div className="w-2 h-2 bg-green-500 rounded-full" /><span className="font-medium">{trip.pickupName}</span></div>
                <div className="flex items-center gap-2 text-sm"><div className="w-2 h-2 bg-black rounded-full" /><span className="font-medium">{trip.dropoffName}</span></div>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-500">{trip.vehicleType} · {trip.distance?.toFixed(1)}km</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold">R{trip.fare}</span>
                  <RotateCcw className="h-3.5 w-3.5 text-gray-400" />
                </div>
              </div>
            </button>
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Profile ──
  if (view === "profile") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setView("home")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Profile</h1>
        </div>
        <div className="flex-1 p-6 pb-20 overflow-auto">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center mb-6">
            <Avatar className="h-20 w-20 mx-auto mb-4 border-2 border-yellow-400">
              <AvatarFallback className="bg-yellow-400 text-black text-2xl font-bold">{user.fullName[0]}</AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold">{user.fullName}</h2>
            <p className="text-gray-500">{user.phone}</p>
            <div className="flex items-center justify-center gap-1 mt-2 text-sm">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> {user.rating?.toFixed(1)} · {user.totalTrips} trips
            </div>
            <div className="mt-3 bg-yellow-50 rounded-xl px-3 py-2 inline-flex items-center gap-2 text-sm">
              <Wallet className="h-4 w-4 text-yellow-600" />
              <span className="font-bold">R{(user.walletBalance ?? 0).toFixed(0)}</span>
              <span className="text-gray-500 text-xs">wallet</span>
            </div>
          </div>

          <h3 className="font-bold mb-3">Saved Places</h3>
          <div className="space-y-2 mb-6">
            {savedPlaces.map((p) => (
              <div key={p.id} className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border border-gray-100">
                <div className="bg-gray-100 p-2 rounded-xl">{iconForPlace(p.icon)}</div>
                <div className="flex-1">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.address}</div>
                </div>
              </div>
            ))}
            {savedPlaces.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No saved places yet</p>}
          </div>

          <h3 className="font-bold mb-3">Ride Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <div className="text-2xl font-bold">{tripHistory.filter(t => t.status === "completed").length}</div>
              <div className="text-xs text-gray-500">Completed Trips</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <div className="text-2xl font-bold">R{tripHistory.filter(t => t.status === "completed").reduce((s, t) => s + (t.fare || 0), 0)}</div>
              <div className="text-xs text-gray-500">Total Spent</div>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Search Location ──
  if (view === "search") {
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col">
        <div className="p-4 flex items-center gap-3 border-b">
          <Button variant="ghost" size="icon" onClick={() => setView("home")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-lg font-bold">{searchFor === "pickup" ? "Set Pickup" : "Set Drop-off"}</h1>
        </div>
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input placeholder="Search Giyani locations..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-14 pl-12 rounded-2xl bg-gray-100 border-none text-lg" autoFocus data-testid="input-search-location" />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {searchQuery === "" && (
            <div className="px-4 pb-2">
              <Button variant="ghost" className="w-full justify-start h-14 rounded-xl gap-3 text-base" onClick={() => { setView("pickmap"); setPinDrop(null); }} data-testid="btn-pin-on-map">
                <div className="bg-indigo-100 p-2 rounded-lg"><Crosshair className="h-4 w-4 text-indigo-600" /></div>
                <div className="text-left">
                  <div className="font-medium">Pin location on map</div>
                  <div className="text-xs text-gray-500">Tap the map to set your {searchFor === "pickup" ? "pickup" : "drop-off"}</div>
                </div>
              </Button>
            </div>
          )}
          {savedPlaces.length > 0 && searchQuery === "" && (
            <div className="px-4 pb-2">
              <p className="text-xs text-gray-500 uppercase font-bold mb-2 px-1">Saved Places</p>
              {savedPlaces.map((p) => (
                <Button key={p.id} variant="ghost" className="w-full justify-start h-14 rounded-xl gap-3 text-base" onClick={() => {
                  const loc = { name: p.name, address: p.address, lat: p.lat ?? -23.31, lng: p.lng ?? 30.72 };
                  if (searchFor === "pickup") setPickup(loc); else setDropoff(loc);
                  setView(pickup && searchFor === "dropoff" ? "confirm" : "home");
                  setSearchQuery("");
                }}>
                  <div className="bg-gray-100 p-2 rounded-lg">{iconForPlace(p.icon)}</div>
                  <div className="text-left">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.address}</div>
                  </div>
                </Button>
              ))}
            </div>
          )}
          <div className="px-4">
            <p className="text-xs text-gray-500 uppercase font-bold mb-2 px-1">{searchQuery ? "Results" : "All Locations"}</p>
            {filteredLocations.map((loc, i) => (
              <Button key={i} variant="ghost" className="w-full justify-start h-14 rounded-xl gap-3 text-base" onClick={() => {
                if (searchFor === "pickup") { setPickup(loc); setSearchFor("dropoff"); setSearchQuery(""); }
                else { setDropoff(loc); setView("confirm"); setSearchQuery(""); }
              }} data-testid={`location-${loc.name.replace(/\s+/g, '-').toLowerCase()}`}>
                <div className="bg-gray-100 p-2 rounded-lg"><MapPin className="h-4 w-4" /></div>
                <div className="text-left">
                  <div className="font-medium">{loc.name}</div>
                  <div className="text-xs text-gray-500">{loc.address}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Pick on Map ──
  if (view === "pickmap") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setView("search"); setPinDrop(null); }} className="rounded-full bg-white shadow-md"><ChevronLeft className="h-6 w-6" /></Button>
          <span className="font-bold text-lg bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-sm">Tap to set {searchFor === "pickup" ? "pickup" : "drop-off"}</span>
        </div>
        <div className="flex-1 relative">
          <GiyaniMap pickup={searchFor === "dropoff" ? pickup : null} dropoff={searchFor === "pickup" ? dropoff : null} className="h-full absolute inset-0" showRoute={false} interactive={true} onPinDrop={handlePinDrop} pinDropLocation={pinDrop} />
        </div>
        <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.08)] p-6 space-y-3">
          {pinDrop ? (
            <>
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg"><Crosshair className="h-5 w-5 text-indigo-600" /></div>
                <div>
                  <div className="font-medium text-sm">Pinned location</div>
                  <div className="text-xs text-gray-500">{pinDrop.lat.toFixed(5)}, {pinDrop.lng.toFixed(5)}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button className="flex-1 h-14 rounded-2xl bg-black text-white hover:bg-gray-900 font-bold text-base" onClick={handleConfirmPin} data-testid="btn-confirm-pin">
                  Confirm {searchFor === "pickup" ? "Pickup" : "Drop-off"}
                </Button>
                <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl" onClick={handleSharePickup} data-testid="btn-share-pin">
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-3 text-gray-500">
              <Crosshair className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="font-medium">Tap anywhere on the map</p>
              <p className="text-sm">to pin your {searchFor === "pickup" ? "pickup" : "drop-off"} location</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Confirm Ride ──
  if (view === "confirm") {
    const dist = calcDistance();
    const dur = calcDuration();
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => { setView("home"); setDropoff(null); }} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">
            {rideType === "medical" ? "Medical Transport" : rideType === "parcel" ? "Send Parcel" : rideType === "shared" ? "Shared Ride" : rideType === "taxi" ? "Taxi Ride" : "Confirm Ride"}
          </h1>
        </div>

        <div className="relative h-36 overflow-hidden">
          <GiyaniMap pickup={pickup} dropoff={dropoff} className="h-full" showRoute={true} />
        </div>

        <div className="flex-1 px-5 pb-6 overflow-auto -mt-3 relative z-10">
          <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100 space-y-3 mb-4">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 pt-1">
                <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-green-200" />
                <div className="w-0.5 h-6 bg-gray-200" />
                <div className="w-3 h-3 bg-black rounded-full border-2 border-gray-300" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase">Pickup</div>
                    <div className="font-bold text-sm">{pickup?.name || "Current Location"}</div>
                  </div>
                  <button onClick={() => { setSearchFor("pickup"); setView("search"); }} className="text-yellow-600" data-testid="btn-edit-pickup"><Edit2 className="h-3.5 w-3.5" /></button>
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase">Drop-off</div>
                    <div className="font-bold text-sm">{dropoff?.name}</div>
                  </div>
                  <button onClick={() => { setSearchFor("dropoff"); setView("search"); }} className="text-yellow-600" data-testid="btn-edit-dropoff"><Edit2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2 border-t border-gray-50">
              <div className="flex-1 text-center">
                <div className="text-sm font-bold">{dist.toFixed(1)} km</div>
                <div className="text-[10px] text-gray-500">Distance</div>
              </div>
              <div className="flex-1 text-center border-x border-gray-100">
                <div className="text-sm font-bold">{dur} min</div>
                <div className="text-[10px] text-gray-500">Duration</div>
              </div>
              <div className="flex-1 text-center">
                <div className="text-sm font-bold text-green-600">{paymentLabel(paymentMethod)}</div>
                <div className="text-[10px] text-gray-500">Payment</div>
              </div>
            </div>
          </div>

          {rideType === "shared" && (
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm">Seats to book</h4>
                  <p className="text-[10px] text-gray-500">Share a ride, pay less per seat</p>
                </div>
                <div className="flex items-center gap-3">
                  <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center" onClick={() => setSharedSeats(Math.max(1, sharedSeats - 1))} data-testid="btn-seats-minus"><Minus className="h-4 w-4" /></button>
                  <span className="text-xl font-bold w-6 text-center" data-testid="text-seats">{sharedSeats}</span>
                  <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center" onClick={() => setSharedSeats(Math.min(4, sharedSeats + 1))} data-testid="btn-seats-plus"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          )}

          {rideType === "medical" && (
            <div className="bg-red-50 rounded-xl p-4 border border-red-200 mb-4 space-y-3">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                <h4 className="font-bold text-sm text-red-700">Medical Transport</h4>
              </div>
              <select className="w-full h-10 rounded-lg border border-red-200 bg-white px-3 text-sm" value={medicalNotes} onChange={e => setMedicalNotes(e.target.value)} data-testid="select-medical-type">
                <option value="">Select type...</option>
                <option value="Clinic pickup">Clinic pickup</option>
                <option value="Hospital discharge">Hospital discharge</option>
                <option value="Medication delivery">Medication delivery</option>
                <option value="Elderly patient transport">Elderly patient transport</option>
                <option value="Dialysis appointment">Dialysis appointment</option>
                <option value="Other medical">Other medical</option>
              </select>
              <input placeholder="Additional notes (optional)" className="w-full h-10 rounded-lg border border-red-200 bg-white px-3 text-sm" data-testid="input-medical-notes" />
            </div>
          )}

          {rideType === "parcel" && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 mb-4 space-y-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                <h4 className="font-bold text-sm text-blue-700">Parcel Details</h4>
              </div>
              <input placeholder="Describe your parcel (e.g., Small box - documents)" value={parcelDescription} onChange={e => setParcelDescription(e.target.value)} className="w-full h-10 rounded-lg border border-blue-200 bg-white px-3 text-sm" data-testid="input-parcel-desc" />
              <p className="text-[10px] text-blue-600">Receiver will need the trip PIN to collect</p>
            </div>
          )}

          <h3 className="font-bold text-base mb-2">Choose your ride</h3>
          <div className="space-y-2 mb-4">
            {filteredVehicleTypes.map((vt) => {
              const fare = calcFare(vt);
              const isSelected = selectedVehicle?.id === vt.id;
              const eta = Math.round(Math.random() * 4 + 2);
              return (
                <button key={vt.id} className={`w-full bg-white rounded-xl p-3 flex items-center justify-between border-2 transition-all ${isSelected ? "border-black shadow-md" : "border-gray-100 shadow-sm"}`}
                  onClick={() => setSelectedVehicle(vt)} data-testid={`vehicle-${vt.name.replace(/\s+/g, '-').toLowerCase()}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? "bg-black" : "bg-gray-100"}`}>
                      {rideType === "medical" ? <Heart className={`h-5 w-5 ${isSelected ? "text-red-400" : "text-gray-600"}`} /> :
                       rideType === "parcel" ? <Package className={`h-5 w-5 ${isSelected ? "text-yellow-400" : "text-gray-600"}`} /> :
                       <Car className={`h-5 w-5 ${isSelected ? "text-yellow-400" : "text-gray-600"}`} />}
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm">{vt.name}</div>
                      <div className="text-[10px] text-gray-500">{rideType === "shared" ? `${vt.seats} seats available · ${eta} min` : `${vt.seats} seats · ${eta} min away`}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">R{fare}</div>
                    {rideType === "shared" && <div className="text-[10px] text-green-600">per seat</div>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {(["cash", "ewallet", "eft", "card"] as PaymentMethod[]).map(m => (
              <button key={m} className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold border-2 flex items-center gap-1.5 ${paymentMethod === m ? "border-yellow-400 bg-yellow-50" : "border-gray-100 bg-white"}`}
                onClick={() => setPaymentMethod(m)} data-testid={`pay-${m}`}>
                {m === "cash" ? <Banknote className="h-3.5 w-3.5" /> : m === "ewallet" ? <Wallet className="h-3.5 w-3.5" /> : m === "eft" ? <Upload className="h-3.5 w-3.5" /> : <CreditCard className="h-3.5 w-3.5" />}
                {paymentLabel(m)}
                {m === "ewallet" && <span className="text-[10px] text-gray-500">R{(user.walletBalance ?? 0).toFixed(0)}</span>}
              </button>
            ))}
          </div>

          <div className="space-y-2 mb-4">
            <div className="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3">
              <StickyNote className="h-4 w-4 text-gray-400 shrink-0" />
              <input placeholder={rideType === "medical" ? "Special requirements..." : "Add a note (e.g., Call when you arrive)"} value={rideNote} onChange={e => setRideNote(e.target.value)} className="flex-1 text-sm outline-none bg-transparent" data-testid="input-ride-note" />
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3">
              <Tag className="h-4 w-4 text-gray-400 shrink-0" />
              <input placeholder="Promo code" value={promoCode} onChange={e => setPromoCode(e.target.value)} className="flex-1 text-sm outline-none bg-transparent" data-testid="input-promo-code" />
              {promoCode && <button className="text-xs font-bold text-yellow-600">Apply</button>}
            </div>
          </div>

          <Button size="lg" className="w-full h-14 rounded-2xl text-lg font-bold bg-black text-white hover:bg-gray-900" disabled={!selectedVehicle} onClick={handleBookRide} data-testid="btn-confirm-ride">
            {selectedVehicle ? `Book ${selectedVehicle.name} · R${calcFare(selectedVehicle)}` : "Select a ride"}
          </Button>

          <button onClick={handleWhatsAppBooking} className="w-full mt-3 h-12 rounded-2xl bg-green-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-700 transition-colors" data-testid="btn-whatsapp-book">
            <MessageCircle className="h-4 w-4" /> Book on WhatsApp instead
          </button>
        </div>
      </div>
    );
  }

  // ── Searching for Driver ──
  if (view === "searching") {
    return (
      <div className="min-h-[100dvh] bg-black flex flex-col">
        <div className="absolute top-0 left-0 right-0 z-20 p-4">
          <Button variant="ghost" size="icon" onClick={handleCancelTrip} className="rounded-full bg-white/10 text-white"><X className="h-5 w-5" /></Button>
        </div>
        <div className="flex-1 relative opacity-60">
          <GiyaniMap pickup={pickup} dropoff={dropoff} className="h-full absolute inset-0" showRoute={true} />
        </div>
        <div className="bg-white rounded-t-3xl p-6 space-y-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-yellow-400/20 rounded-full flex items-center justify-center animate-pulse">
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                <Search className="h-5 w-5 text-black animate-spin" style={{ animationDuration: "3s" }} />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {rideType === "medical" ? "Finding medical transport" : rideType === "parcel" ? "Finding delivery driver" : "Finding your driver"}
              </h2>
              <p className="text-gray-500 text-sm">Connecting to nearby drivers...</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm flex-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" /><span className="truncate">{pickup?.name}</span>
            </div>
            <span className="text-gray-300">→</span>
            <div className="flex items-center gap-2 text-sm flex-1">
              <div className="w-2 h-2 bg-black rounded-full" /><span className="truncate">{dropoff?.name}</span>
            </div>
          </div>
          <Button variant="outline" className="w-full rounded-2xl h-12 text-red-500 border-red-200" onClick={handleCancelTrip} data-testid="btn-cancel-search">Cancel</Button>
        </div>
      </div>
    );
  }

  // ── Tracking ──
  if (view === "tracking") {
    const driver = assignedDriver;
    const statusLabel = rideStatus === "on_the_way" ? "Driver on the way" : rideStatus === "arrived" ? "Driver arrived" : rideStatus === "in_progress" ? "Trip in progress" : "Finding driver...";
    const statusColor = rideStatus === "on_the_way" ? "bg-blue-100 text-blue-700" : rideStatus === "arrived" ? "bg-green-100 text-green-700" : rideStatus === "in_progress" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700";

    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => {}} className="rounded-full bg-white shadow-md"><ChevronLeft className="h-6 w-6" /></Button>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-sm ${statusColor}`} data-testid="text-ride-status">{statusLabel}</span>
          </div>
          <button onClick={handleSOS} className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg" data-testid="btn-sos">
            <AlertTriangle className="h-5 w-5 text-white" />
          </button>
        </div>

        <div className="flex-1 relative">
          <GiyaniMap
            pickup={currentTrip ? { lat: currentTrip.pickupLat ?? -23.31, lng: currentTrip.pickupLng ?? 30.72, name: currentTrip.pickupName } : null}
            dropoff={currentTrip ? { lat: currentTrip.dropoffLat ?? -23.32, lng: currentTrip.dropoffLng ?? 30.71, name: currentTrip.dropoffName } : null}
            driverLocation={assignedDriver ? { lat: (currentTrip?.pickupLat ?? -23.31) + 0.005, lng: (currentTrip?.pickupLng ?? 30.72) - 0.003 } : null}
            className="h-full absolute inset-0"
            showRoute={true}
          />
        </div>

        <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.08)] p-5 space-y-4">
          {tripPin && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 flex items-center justify-between">
              <span className="text-xs text-yellow-700 font-medium">Trip PIN</span>
              <span className="text-xl font-black tracking-widest text-black" data-testid="text-trip-pin">{tripPin}</span>
            </div>
          )}

          {driver && (
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <Avatar className="h-12 w-12 border-2 border-yellow-400">
                <AvatarFallback className="bg-yellow-400 text-black font-bold text-lg">{driver.fullName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold">{driver.fullName}</h3>
                  {driver.isVerified && <BadgeCheck className="h-4 w-4 text-blue-500" />}
                </div>
                <div className="flex items-center text-xs text-gray-500 gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium text-black">{driver.rating?.toFixed(1)}</span>
                  · {driver.vehicleColor} {driver.vehicleModel} · {driver.licensePlate}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center" data-testid="btn-call-driver"><Phone className="h-4 w-4 text-green-700" /></button>
                <button className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center" data-testid="btn-whatsapp-driver"><MessageCircle className="h-4 w-4 text-green-700" /></button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 flex-1"><div className="w-2 h-2 bg-green-500 rounded-full" /><span className="truncate">{currentTrip?.pickupName}</span></div>
            <span className="text-gray-300">→</span>
            <div className="flex items-center gap-2 flex-1"><div className="w-2 h-2 bg-black rounded-full" /><span className="truncate">{currentTrip?.dropoffName}</span></div>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <div className="text-2xl font-bold">R{currentTrip?.fare}</div>
              <div className="text-xs text-gray-500">{paymentLabel(paymentMethod)} · {currentTrip?.duration || calcDuration()} min</div>
            </div>
            {currentTrip?.rideType && currentTrip.rideType !== "private" && (
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700">{currentTrip.rideType}</span>
            )}
          </div>

          <div className="flex gap-2">
            <Button className="flex-1 h-12 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 font-bold text-sm" variant="ghost" onClick={handleCancelTrip} data-testid="btn-cancel-ride">Cancel</Button>
            <Button variant="outline" className="h-12 px-4 rounded-2xl font-bold text-sm gap-2" onClick={handleShareLocation} data-testid="btn-share-trip">
              <Share2 className="h-4 w-4" /> Share
            </Button>
            {trustedContacts.length > 0 && (
              <Button variant="outline" className="h-12 px-3 rounded-2xl text-sm gap-1" onClick={handleShareWithContacts} data-testid="btn-share-contacts">
                <Users className="h-4 w-4" />
              </Button>
            )}
            <Button className="flex-1 h-12 rounded-2xl bg-black text-white hover:bg-gray-900 font-bold text-sm" onClick={handleCompleteTrip} data-testid="btn-complete-ride">Complete</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Trip Completed ──
  if (view === "completed") {
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Navigation className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-1">
              {currentTrip?.rideType === "parcel" ? "Parcel Delivered!" : currentTrip?.rideType === "medical" ? "Medical Trip Complete!" : "Trip Complete!"}
            </h2>
            <p className="text-gray-500">
              {currentTrip?.rideType === "parcel" ? "Your parcel has been delivered" : "You've arrived at your destination"}
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-5 mb-6 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-gray-500">From</span><span className="font-medium">{currentTrip?.pickupName}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">To</span><span className="font-medium">{currentTrip?.dropoffName}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Distance</span><span className="font-medium">{currentTrip?.distance?.toFixed(1)} km</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Duration</span><span className="font-medium">{currentTrip?.duration} min</span></div>
            {currentTrip?.rideType && currentTrip.rideType !== "private" && (
              <div className="flex justify-between text-sm"><span className="text-gray-500">Type</span><span className="font-medium capitalize">{currentTrip.rideType}</span></div>
            )}
            <div className="flex justify-between text-sm border-t pt-3 border-gray-200"><span className="text-gray-500">Fare</span><span className="text-xl font-bold">R{currentTrip?.fare}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Payment</span><span className="font-medium text-green-600 capitalize">{currentTrip?.paymentMethod || "Cash"}</span></div>
          </div>

          {assignedDriver && (
            <div className="mb-6">
              <p className="text-center text-gray-500 mb-3">Rate your driver</p>
              <div className="flex items-center justify-center gap-4 mb-3">
                <Avatar className="h-12 w-12 border-2 border-yellow-400">
                  <AvatarFallback className="bg-yellow-400 text-black font-bold">{assignedDriver.fullName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">{assignedDriver.fullName}</span>
                  {assignedDriver.isVerified && <BadgeCheck className="h-4 w-4 text-blue-500" />}
                </div>
              </div>
              <div className="flex justify-center gap-2" data-testid="rating-stars">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setDriverRating(s)} data-testid={`star-${s}`}>
                    <Star className={`h-10 w-10 transition-colors ${s <= driverRating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button className="w-full h-14 rounded-2xl bg-black text-white hover:bg-gray-900 font-bold text-lg" onClick={handleSubmitRating} data-testid="btn-submit-rating">
              {driverRating > 0 ? `Submit ${driverRating}-Star Rating` : "Done"}
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12 rounded-2xl text-sm gap-2" onClick={() => {
                toast({ title: "Receipt", description: "Receipt download will be available soon" });
              }} data-testid="btn-download-receipt"><Download className="h-4 w-4" /> Receipt</Button>
              <Button variant="outline" className="flex-1 h-12 rounded-2xl text-sm gap-2" onClick={() => { setView("confirm"); }} data-testid="btn-rebook"><RotateCcw className="h-4 w-4" /> Rebook</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Home ──
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-gray-50 to-white flex flex-col">
      <div className="p-4 flex justify-between items-center">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setView("menu")} data-testid="btn-menu">
          <Menu className="h-6 w-6" />
        </Button>
        <span className="font-black text-lg">GY Rides</span>
        <Avatar className="h-10 w-10 border-2 border-yellow-400">
          <AvatarFallback className="bg-yellow-400 text-black font-bold">{user.fullName[0]}</AvatarFallback>
        </Avatar>
      </div>

      <div className="flex-1 overflow-auto pb-16">
        <div className="px-6 pt-2 pb-4">
          <h2 className="text-2xl font-bold mb-0.5">Hi, {user.fullName.split(" ")[0]}!</h2>
          <p className="text-gray-500 text-sm">Where are you heading?</p>
        </div>

        <div className="px-6 mb-4">
          <div className="flex gap-1.5 bg-gray-100 rounded-2xl p-1">
            {RIDE_TYPES.map(rt => (
              <button key={rt.key} className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl transition-all ${rideType === rt.key ? "bg-black text-white shadow-md" : "text-gray-500"}`}
                onClick={() => { setRideType(rt.key); if (rt.key === "taxi") setView("taxi"); }} data-testid={`ride-type-${rt.key}`}>
                <span className={rideType === rt.key ? "text-yellow-400" : ""}>{rt.icon}</span>
                <span className="text-[10px] font-bold">{rt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 mb-4 space-y-2">
          <button className="w-full bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 flex items-center gap-3 text-left" onClick={() => { setSearchFor("pickup"); setView("search"); }} data-testid="btn-set-pickup">
            <div className="bg-green-500 p-2.5 rounded-xl"><Crosshair className="h-4 w-4 text-white" /></div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">{pickup ? pickup.name : "Set pickup"}</div>
              <div className="text-xs text-gray-500 truncate">{pickup ? pickup.address : "Tap to choose or pin on map"}</div>
            </div>
            {pickup && <div className="w-2.5 h-2.5 bg-green-500 rounded-full shrink-0" />}
          </button>

          <button className="w-full bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 flex items-center gap-3 text-left" onClick={() => { setSearchFor("dropoff"); if (!pickup) setPickup(GIYANI_LOCATIONS[2]); setView("search"); }} data-testid="btn-where-to">
            <div className="bg-black p-2.5 rounded-xl"><Search className="h-4 w-4 text-yellow-400" /></div>
            <div>
              <div className="font-bold">{rideType === "parcel" ? "Deliver to?" : "Where to?"}</div>
              <div className="text-xs text-gray-500">{rideType === "parcel" ? "Enter delivery destination" : "Enter your destination"}</div>
            </div>
          </button>
        </div>

        <div className="px-6 mb-5">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {QUICK_DESTINATIONS.map((qd) => {
              const matchedSaved = savedPlaces.find(sp => sp.name.toLowerCase().includes(qd.name.toLowerCase()));
              const matchedLocation = GIYANI_LOCATIONS.find(l => l.name.toLowerCase().includes(qd.name.toLowerCase()));
              return (
                <button key={qd.name} className="bg-white rounded-xl px-3.5 py-2.5 shadow-sm border border-gray-100 flex items-center gap-2 shrink-0 text-sm" onClick={() => {
                  const dest = matchedSaved ? { name: matchedSaved.name, address: matchedSaved.address, lat: matchedSaved.lat ?? -23.31, lng: matchedSaved.lng ?? 30.72 }
                    : matchedLocation || GIYANI_LOCATIONS[0];
                  setDropoff(dest);
                  if (!pickup) setPickup(GIYANI_LOCATIONS[2]);
                  setView("confirm");
                }} data-testid={`quick-dest-${qd.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  <span className="text-gray-600">{quickDestIcon(qd.icon)}</span>
                  <span className="font-medium whitespace-nowrap">{qd.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-6 mb-4 h-32 rounded-2xl overflow-hidden mx-2 shadow-sm">
          <GiyaniMap pickup={null} dropoff={null} className="h-full rounded-2xl" showRoute={false} />
        </div>

        {savedPlaces.length > 0 && (
          <div className="px-6 mb-5">
            <h3 className="font-bold mb-2 text-sm">Saved Places</h3>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {savedPlaces.map((p) => (
                <button key={p.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex-shrink-0 min-w-[120px] flex flex-col items-start gap-1.5" onClick={() => {
                  setDropoff({ name: p.name, address: p.address, lat: p.lat ?? -23.31, lng: p.lng ?? 30.72 });
                  if (!pickup) setPickup(GIYANI_LOCATIONS[2]);
                  setView("confirm");
                }}>
                  <div className="bg-gray-100 p-1.5 rounded-lg">{iconForPlace(p.icon)}</div>
                  <div className="text-left">
                    <div className="font-bold text-xs">{p.name}</div>
                    <div className="text-[10px] text-gray-500 truncate max-w-[100px]">{p.address}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-6 mb-5">
          <button onClick={handleWhatsAppBooking} className="w-full bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3 text-left" data-testid="btn-whatsapp-home">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shrink-0">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm text-green-800">Book on WhatsApp</div>
              <div className="text-[10px] text-green-600">Weak signal? Book your ride via WhatsApp</div>
            </div>
          </button>
        </div>

        {onlineDrivers.length > 0 && (
          <div className="px-6 mb-5">
            <h3 className="font-bold mb-2 text-sm">Nearby Drivers ({onlineDrivers.length})</h3>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {onlineDrivers.slice(0, 4).map(d => (
                <div key={d.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex-shrink-0 min-w-[140px]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Avatar className="h-8 w-8 border border-yellow-400">
                      <AvatarFallback className="bg-yellow-400 text-black text-xs font-bold">{d.fullName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs">{d.fullName.split(" ")[0]}</span>
                        {d.isVerified && <BadgeCheck className="h-3 w-3 text-blue-500" />}
                      </div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-0.5">
                        <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" /> {d.rating?.toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-500">{d.vehicleColor} {d.vehicleModel}</div>
                  <div className="text-[10px] text-gray-400">{d.licensePlate}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

```

---

## `client/src/pages/DriverApp.tsx`

```tsx
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { MapPin, DollarSign, Star, Check, X, Menu, LogOut, Navigation, Car, Clock, TrendingUp, User, ChevronLeft, History, Phone, MessageCircle, AlertTriangle, Shield, ExternalLink, BadgeCheck, Heart, Package, Users, Bus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { updateTrip, updateUser } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import GiyaniMap from "@/components/GiyaniMap";
import type { Trip, User as UserType } from "@shared/schema";

export default function DriverApp() {
  const { user, setUser, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<"home" | "trip" | "earnings" | "history" | "profile" | "menu">("home");
  const [onTrip, setOnTrip] = useState<Trip | null>(null);
  const [tripRider, setTripRider] = useState<UserType | null>(null);
  const [tripPhase, setTripPhase] = useState<"arriving" | "pickup" | "inprogress">("arriving");
  const [countdown, setCountdown] = useState(30);
  const [activeTab, setActiveTab] = useState<"home" | "trips" | "earnings" | "profile">("home");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || user.role !== "driver") {
      setLocation("/");
    } else if (user.role === "driver" && user.approvalStatus !== "approved") {
      setLocation("/driver/onboarding");
    }
  }, [user]);

  const { data: requestedTrips = [], refetch: refetchRequested } = useQuery<Trip[]>({
    queryKey: ["/api/trips/requested"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 5000,
  });

  const { data: myTrips = [] } = useQuery<Trip[]>({
    queryKey: ["/api/trips/driver", user?.id ?? ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  const pendingRequest = requestedTrips[0];

  useEffect(() => {
    if (!pendingRequest) { setCountdown(30); return; }
    setCountdown(30);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); refetchRequested(); return 30; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pendingRequest?.id]);

  if (!user) return null;

  const isOnline = user.isOnline ?? false;
  const completedTrips = myTrips.filter(t => t.status === "completed");
  const todayEarnings = completedTrips.reduce((sum, t) => sum + (t.fare || 0), 0);
  const weeklyEarnings = Math.round(todayEarnings * 5.2);
  const cashCollected = Math.round(todayEarnings * 0.85);

  const toggleOnline = async () => {
    const updated = await updateUser(user.id, { isOnline: !isOnline } as any);
    setUser(updated);
  };

  const acceptTrip = async (trip: Trip) => {
    const updated = await updateTrip(trip.id, { status: "accepted", driverId: user.id });
    setOnTrip(updated);
    setTripPhase("arriving");
    setView("trip");
    try {
      const res = await fetch(`/api/users/${trip.riderId}`, { credentials: "include" });
      const rider = await res.json();
      setTripRider(rider);
    } catch {}
    refetchRequested();
  };

  const advanceTrip = async () => {
    if (!onTrip) return;
    if (tripPhase === "arriving") {
      await updateTrip(onTrip.id, { status: "arriving" });
      setTripPhase("pickup");
    } else if (tripPhase === "pickup") {
      await updateTrip(onTrip.id, { status: "in_progress" });
      setTripPhase("inprogress");
    } else {
      await updateTrip(onTrip.id, { status: "completed" });
      setOnTrip(null);
      setTripRider(null);
      setView("home");
      queryClient.invalidateQueries({ queryKey: ["/api/trips/driver"] });
      toast({ title: "Trip completed!", description: `Fare: R${onTrip.fare}` });
    }
  };

  const declineTrip = () => {
    refetchRequested();
  };

  const openNavigation = useCallback(() => {
    if (!onTrip) return;
    const lat = tripPhase === "inprogress" ? onTrip.dropoffLat : onTrip.pickupLat;
    const lng = tripPhase === "inprogress" ? onTrip.dropoffLng : onTrip.pickupLng;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
  }, [onTrip, tripPhase]);

  const BottomNav = () => (
    <div className="bg-white border-t border-gray-100 px-4 py-2 flex justify-around items-center" data-testid="driver-bottom-nav">
      <button className={`flex flex-col items-center gap-1 py-1 px-3 ${activeTab === "home" ? "text-black" : "text-gray-400"}`} onClick={() => { setActiveTab("home"); setView("home"); }} data-testid="driver-tab-home">
        <Car className="h-5 w-5" /><span className="text-[10px] font-medium">Home</span>
      </button>
      <button className={`flex flex-col items-center gap-1 py-1 px-3 ${activeTab === "trips" ? "text-black" : "text-gray-400"}`} onClick={() => { setActiveTab("trips"); setView("history"); }} data-testid="driver-tab-trips">
        <History className="h-5 w-5" /><span className="text-[10px] font-medium">Trips</span>
      </button>
      <button className={`flex flex-col items-center gap-1 py-1 px-3 ${activeTab === "earnings" ? "text-black" : "text-gray-400"}`} onClick={() => { setActiveTab("earnings"); setView("earnings"); }} data-testid="driver-tab-earnings">
        <DollarSign className="h-5 w-5" /><span className="text-[10px] font-medium">Earnings</span>
      </button>
      <button className={`flex flex-col items-center gap-1 py-1 px-3 ${activeTab === "profile" ? "text-black" : "text-gray-400"}`} onClick={() => { setActiveTab("profile"); setView("profile"); }} data-testid="driver-tab-profile">
        <User className="h-5 w-5" /><span className="text-[10px] font-medium">Profile</span>
      </button>
    </div>
  );

  // ── Menu ──
  if (view === "menu") {
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col">
        <div className="bg-black text-white p-6 pb-8">
          <Button variant="ghost" size="icon" className="text-white mb-4 -ml-2" onClick={() => setView("home")}><X className="h-6 w-6" /></Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-yellow-400">
              <AvatarFallback className="bg-yellow-400 text-black text-xl font-bold">{user.fullName[0]}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-xl font-bold">{user.fullName}</h2>
                {user.isVerified && <BadgeCheck className="h-5 w-5 text-blue-400" />}
              </div>
              <div className="text-yellow-400 text-sm flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" /> {user.rating?.toFixed(1)} · {user.totalTrips} trips
              </div>
              {user.vehicleMake && <div className="text-xs text-gray-400 mt-1">{user.vehicleColor} {user.vehicleMake} {user.vehicleModel} · {user.licensePlate}</div>}
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 space-y-1">
          {[
            { icon: <Car className="h-5 w-5" />, label: "Dashboard", action: () => setView("home") },
            { icon: <DollarSign className="h-5 w-5" />, label: "Earnings", action: () => setView("earnings") },
            { icon: <History className="h-5 w-5" />, label: "Trip History", action: () => setView("history") },
            { icon: <User className="h-5 w-5" />, label: "Profile", action: () => setView("profile") },
            { icon: <Shield className="h-5 w-5" />, label: "Safety", action: () => toast({ title: "Safety Center", description: "Emergency settings available here" }) },
          ].map((item, i) => (
            <Button key={i} variant="ghost" className="w-full justify-start h-14 text-base rounded-xl gap-4" onClick={item.action}>
              {item.icon} {item.label}
            </Button>
          ))}
        </div>
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start h-14 text-base rounded-xl gap-4 text-red-500" onClick={() => { logout(); setLocation("/"); }}>
            <LogOut className="h-5 w-5" /> Sign Out
          </Button>
        </div>
      </div>
    );
  }

  // ── Earnings ──
  if (view === "earnings") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b">
          <Button variant="ghost" size="icon" onClick={() => setView("home")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Earnings</h1>
        </div>
        <div className="flex-1 p-5 pb-20 overflow-auto">
          <div className="bg-black rounded-3xl p-6 text-white text-center mb-5">
            <p className="text-xs text-gray-400 mb-1">Total Earnings</p>
            <p className="text-4xl font-black">R{(user.earnings ?? 0).toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-2">{completedTrips.length} completed trips</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
              <div className="text-lg font-bold">R{todayEarnings}</div>
              <div className="text-[10px] text-gray-500">Today</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
              <div className="text-lg font-bold">R{weeklyEarnings}</div>
              <div className="text-[10px] text-gray-500">This Week</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
              <div className="text-lg font-bold text-green-600">R{cashCollected}</div>
              <div className="text-[10px] text-gray-500">Cash</div>
            </div>
          </div>

          <h3 className="font-bold mb-3 text-sm">Trip Breakdown</h3>
          <div className="space-y-2">
            {completedTrips.slice(0, 8).map(trip => (
              <div key={trip.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm">{trip.pickupName} → {trip.dropoffName}</div>
                  <div className="text-[10px] text-gray-500">{trip.createdAt ? new Date(trip.createdAt).toLocaleDateString("en-ZA") : ""} · {trip.distance?.toFixed(1)} km</div>
                </div>
                <div className="font-bold text-green-600">R{trip.fare}</div>
              </div>
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Trip History ──
  if (view === "history") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b">
          <Button variant="ghost" size="icon" onClick={() => setView("home")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Trip History</h1>
        </div>
        <div className="flex-1 p-4 space-y-2 overflow-auto pb-20">
          {myTrips.map(trip => (
            <div key={trip.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{trip.createdAt ? new Date(trip.createdAt).toLocaleDateString("en-ZA") : ""}</span>
                  {trip.rideType && trip.rideType !== "private" && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">{trip.rideType}</span>
                  )}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trip.status === "completed" ? "bg-green-100 text-green-700" : trip.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {trip.status}
                </span>
              </div>
              <div className="font-medium text-sm">{trip.pickupName} → {trip.dropoffName}</div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-gray-500">{trip.vehicleType} · {trip.distance?.toFixed(1)} km</span>
                <span className="text-sm font-bold">R{trip.fare}</span>
              </div>
            </div>
          ))}
          {myTrips.length === 0 && <div className="text-center py-16 text-gray-400 text-sm">No trips yet</div>}
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Profile ──
  if (view === "profile") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b">
          <Button variant="ghost" size="icon" onClick={() => setView("home")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Profile</h1>
        </div>
        <div className="flex-1 p-5 pb-20 overflow-auto">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center mb-5">
            <Avatar className="h-20 w-20 mx-auto mb-3 border-2 border-yellow-400">
              <AvatarFallback className="bg-yellow-400 text-black text-2xl font-bold">{user.fullName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex items-center justify-center gap-1.5">
              <h2 className="text-xl font-bold">{user.fullName}</h2>
              {user.isVerified && <BadgeCheck className="h-5 w-5 text-blue-500" />}
            </div>
            <p className="text-gray-500 text-sm">{user.phone}</p>
            {user.isVerified && (
              <div className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full mt-1">
                <BadgeCheck className="h-3 w-3" /> Verified Driver
              </div>
            )}
            <div className="flex items-center justify-center gap-1 mt-2 text-sm">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> {user.rating?.toFixed(1)} · {user.totalTrips} trips
            </div>
            {user.vehicleMake && (
              <div className="mt-3 bg-gray-50 rounded-xl p-3 text-sm">
                <span className="font-medium">{user.vehicleColor} {user.vehicleMake} {user.vehicleModel}</span>
                <span className="text-gray-500"> · {user.licensePlate}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
              <div className="text-xl font-bold">{completedTrips.length}</div>
              <div className="text-[10px] text-gray-500">Trips</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
              <div className="text-xl font-bold">{user.rating?.toFixed(1)}</div>
              <div className="text-[10px] text-gray-500">Rating</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
              <div className="text-xl font-bold text-green-600">R{(user.earnings ?? 0).toLocaleString()}</div>
              <div className="text-[10px] text-gray-500">Earned</div>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Active Trip ──
  if (view === "trip" && onTrip) {
    const isParcel = onTrip.rideType === "parcel";
    const isMedical = onTrip.rideType === "medical";
    const phaseLabel = tripPhase === "arriving" ? (isParcel ? "Navigate to Pickup" : "Navigate to Pickup") : tripPhase === "pickup" ? (isParcel ? "Collect Parcel" : "Passenger Pickup") : (isParcel ? "Delivering Parcel" : "Trip in Progress");
    const phaseColor = tripPhase === "arriving" ? "bg-blue-100 text-blue-700" : tripPhase === "pickup" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700";

    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col relative">
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setOnTrip(null); setView("home"); }} className="rounded-full bg-white shadow-md"><ChevronLeft className="h-6 w-6" /></Button>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-sm ${phaseColor}`}>{phaseLabel}</span>
            {onTrip.rideType && onTrip.rideType !== "private" && (
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full shadow-sm ${
                isMedical ? "bg-red-100 text-red-700" : isParcel ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
              }`}>{onTrip.rideType}</span>
            )}
          </div>
          <button onClick={openNavigation} className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg" data-testid="btn-navigate">
            <ExternalLink className="h-5 w-5 text-white" />
          </button>
        </div>

        <div className="flex-1 relative">
          <GiyaniMap
            pickup={{ lat: onTrip.pickupLat ?? -23.31, lng: onTrip.pickupLng ?? 30.72, name: onTrip.pickupName }}
            dropoff={{ lat: onTrip.dropoffLat ?? -23.32, lng: onTrip.dropoffLng ?? 30.71, name: onTrip.dropoffName }}
            driverLocation={{ lat: (onTrip.pickupLat ?? -23.31) + (tripPhase === "arriving" ? 0.006 : 0.001), lng: (onTrip.pickupLng ?? 30.72) - 0.003 }}
            className="h-full absolute inset-0"
            showRoute={true}
          />
        </div>

        <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.08)] p-5 space-y-4">
          {onTrip.medicalNotes && (
            <div className="bg-red-50 rounded-lg px-3 py-2 flex items-center gap-2">
              <Heart className="h-3.5 w-3.5 text-red-500" />
              <span className="text-xs text-red-700 font-medium">{onTrip.medicalNotes}</span>
            </div>
          )}
          {onTrip.parcelDescription && (
            <div className="bg-blue-50 rounded-lg px-3 py-2 flex items-center gap-2">
              <Package className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs text-blue-700 font-medium">{onTrip.parcelDescription}</span>
            </div>
          )}

          {tripRider && (
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <Avatar className="h-11 w-11">
                <AvatarFallback className="bg-gray-200 font-bold">{tripRider.fullName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm">{tripRider.fullName}</h3>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {tripRider.rating?.toFixed(1)}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center" data-testid="btn-call-rider"><Phone className="h-4 w-4 text-green-700" /></button>
                <button className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center" data-testid="btn-whatsapp-rider"><MessageCircle className="h-4 w-4 text-green-700" /></button>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">R{onTrip.fare}</div>
                <div className="text-[10px] text-gray-500 capitalize">{onTrip.paymentMethod}</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 flex-1"><div className="w-2 h-2 bg-green-500 rounded-full" /><span className="font-medium truncate">{onTrip.pickupName}</span></div>
            <span className="text-gray-300">→</span>
            <div className="flex items-center gap-2 flex-1"><div className="w-2 h-2 bg-black rounded-full" /><span className="font-medium truncate">{onTrip.dropoffName}</span></div>
          </div>

          <Button size="lg" className="w-full h-14 rounded-2xl text-lg font-bold bg-black text-white hover:bg-gray-900" onClick={advanceTrip} data-testid="btn-advance-trip">
            {tripPhase === "arriving" ? "Arrived at Pickup" : tripPhase === "pickup" ? (isParcel ? "Collected Parcel" : "Start Trip") : (isParcel ? "Delivered" : "Complete Trip")}
          </Button>
        </div>
      </div>
    );
  }

  // ── Home / Dashboard ──
  return (
    <div className="min-h-[100dvh] bg-gray-100 flex flex-col relative">
      <div className="absolute inset-0 z-0">
        <GiyaniMap pickup={null} dropoff={null} className="h-full" />
      </div>

      <div className="relative z-10 p-4 flex justify-between items-center">
        <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-md" onClick={() => setView("menu")} data-testid="btn-driver-menu">
          <Menu className="h-6 w-6" />
        </Button>
        <div className="bg-black text-white backdrop-blur px-4 py-1.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-md">
          <DollarSign className="h-4 w-4 text-yellow-400" /> R{todayEarnings}
        </div>
        <Avatar className="h-10 w-10 border-2 border-yellow-400 shadow-md">
          <AvatarFallback className="bg-yellow-400 text-black font-bold">{user.fullName[0]}</AvatarFallback>
        </Avatar>
      </div>

      <div className="relative z-10 px-5 pt-2">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 shadow-sm">
          <h2 className="text-lg font-bold mb-0.5">Hey, {user.fullName.split(" ")[0]}</h2>
          <p className="text-gray-500 text-sm">{isOnline ? "You're online and ready for trips" : "Go online to start earning"}</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative z-10">
        {!isOnline && (
          <button onClick={toggleOnline} className="w-28 h-28 bg-yellow-400 text-black rounded-full shadow-[0_10px_40px_rgba(250,204,21,0.4)] flex items-center justify-center text-3xl font-black border-4 border-white/20 transition-transform active:scale-95" data-testid="btn-go-online">
            GO
          </button>
        )}

        {isOnline && !pendingRequest && (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-yellow-400/20 rounded-full flex items-center justify-center animate-pulse mb-4">
              <div className="w-14 h-14 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                <Car className="h-7 w-7 text-black" />
              </div>
            </div>
            <p className="text-white font-medium bg-black/50 px-4 py-1.5 rounded-full text-sm backdrop-blur">Looking for trips...</p>
            <Button variant="ghost" className="text-red-400 mt-4 bg-white/80 rounded-full" onClick={toggleOnline} data-testid="btn-go-offline">Go Offline</Button>
          </div>
        )}

        {isOnline && pendingRequest && (
          <div className="absolute inset-x-4 bottom-4 top-auto bg-white rounded-3xl overflow-hidden shadow-2xl text-black animate-in slide-in-from-bottom-8">
            <div className="bg-yellow-400 p-4 flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg">
                  {pendingRequest.rideType === "medical" ? "Medical Transport" :
                   pendingRequest.rideType === "parcel" ? "Parcel Delivery" :
                   pendingRequest.rideType === "shared" ? "Shared Ride" :
                   "New Ride Request"}
                </h3>
                <p className="text-black/60 text-xs">{pendingRequest.vehicleType}</p>
              </div>
              <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                <span className="text-yellow-400 font-black text-lg" data-testid="text-countdown">{countdown}</span>
              </div>
            </div>
            <div className="p-5">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <div className="text-3xl font-black">R{pendingRequest.fare}</div>
                  <div className="text-gray-500 text-xs">{pendingRequest.paymentMethod} · {pendingRequest.duration || "?"} min · {pendingRequest.distance?.toFixed(1)} km</div>
                </div>
                {pendingRequest.rideType && pendingRequest.rideType !== "private" && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    pendingRequest.rideType === "medical" ? "bg-red-100 text-red-700" :
                    pendingRequest.rideType === "parcel" ? "bg-blue-100 text-blue-700" :
                    pendingRequest.rideType === "shared" ? "bg-purple-100 text-purple-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`} data-testid="text-ride-type">
                    {pendingRequest.rideType === "medical" ? "🏥 Medical" :
                     pendingRequest.rideType === "parcel" ? "📦 Parcel" :
                     pendingRequest.rideType === "shared" ? `👥 ${pendingRequest.seatsBooked || 1} seat${(pendingRequest.seatsBooked || 1) > 1 ? "s" : ""}` :
                     pendingRequest.rideType}
                  </span>
                )}
              </div>

              {pendingRequest.medicalNotes && (
                <div className="bg-red-50 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                  <Heart className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-xs text-red-700">{pendingRequest.medicalNotes}</span>
                </div>
              )}
              {pendingRequest.parcelDescription && (
                <div className="bg-blue-50 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-xs text-blue-700">{pendingRequest.parcelDescription}</span>
                </div>
              )}
              {pendingRequest.rideNote && (
                <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3 text-xs text-gray-600">
                  Note: {pendingRequest.rideNote}
                </div>
              )}

              <div className="space-y-3 mb-5 relative">
                <div className="absolute left-3 top-5 bottom-5 w-0.5 bg-gray-200" />
                <div className="flex items-start gap-4">
                  <div className="bg-green-500 w-6 h-6 rounded-full flex items-center justify-center z-10 shrink-0 border-2 border-white"><div className="w-2 h-2 bg-white rounded-full" /></div>
                  <div><div className="font-bold text-sm">{pendingRequest.pickupName}</div><div className="text-[10px] text-gray-500">Pickup</div></div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-black w-6 h-6 rounded-full flex items-center justify-center z-10 shrink-0 border-2 border-white"><MapPin className="w-3 h-3 text-white" /></div>
                  <div><div className="font-bold text-sm">{pendingRequest.dropoffName}</div><div className="text-[10px] text-gray-500">Drop-off</div></div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button size="lg" variant="outline" className="flex-1 h-13 rounded-2xl" onClick={declineTrip} data-testid="btn-decline-trip">
                  <X className="mr-2 h-4 w-4" /> Decline
                </Button>
                <Button size="lg" className="flex-1 h-13 rounded-2xl bg-black text-white hover:bg-gray-900" onClick={() => acceptTrip(pendingRequest)} data-testid="btn-accept-trip">
                  <Check className="mr-2 h-4 w-4" /> Accept
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isOnline && !pendingRequest && (
        <div className="bg-black/80 backdrop-blur-md mx-4 mb-16 rounded-2xl p-4 flex justify-around relative z-10 shadow-lg">
          <div className="text-center text-white">
            <div className="text-xl font-bold text-yellow-400">{completedTrips.length}</div>
            <div className="text-[10px] text-gray-300">Trips</div>
          </div>
          <div className="text-center text-white">
            <div className="text-xl font-bold text-yellow-400">{user.rating?.toFixed(1)}</div>
            <div className="text-[10px] text-gray-300">Rating</div>
          </div>
          <div className="text-center text-white">
            <div className="text-xl font-bold text-yellow-400">R{todayEarnings}</div>
            <div className="text-[10px] text-gray-300">Earned</div>
          </div>
        </div>
      )}

      {view === "home" && !onTrip && <BottomNav />}
    </div>
  );
}

```

---

## `client/src/pages/DriverOnboarding.tsx`

```tsx
import { useState } from "react";
import { useLocation } from "wouter";
import { Car, User, FileText, Camera, ChevronRight, ChevronLeft, CheckCircle, Clock, XCircle, Upload, Shield, CreditCard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { submitOnboarding } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type Step = "personal" | "vehicle" | "license" | "documents" | "review";

const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: "personal", label: "Personal Info", icon: <User className="h-4 w-4" /> },
  { key: "vehicle", label: "Vehicle Details", icon: <Car className="h-4 w-4" /> },
  { key: "license", label: "Licenses", icon: <CreditCard className="h-4 w-4" /> },
  { key: "documents", label: "Documents", icon: <FileText className="h-4 w-4" /> },
  { key: "review", label: "Review", icon: <CheckCircle className="h-4 w-4" /> },
];

export default function DriverOnboarding() {
  const { user, setUser, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("personal");
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [idNumber, setIdNumber] = useState(user?.idNumber || "");
  const [address, setAddress] = useState(user?.address || "");

  const [vehicleMake, setVehicleMake] = useState(user?.vehicleMake || "");
  const [vehicleModel, setVehicleModel] = useState(user?.vehicleModel || "");
  const [vehicleColor, setVehicleColor] = useState(user?.vehicleColor || "");
  const [vehicleYear, setVehicleYear] = useState(user?.vehicleYear || "");
  const [licensePlate, setLicensePlate] = useState(user?.licensePlate || "");
  const [vehicleRegistrationNumber, setVehicleRegistrationNumber] = useState("");

  const [driverLicenseNumber, setDriverLicenseNumber] = useState("");
  const [driverLicenseExpiry, setDriverLicenseExpiry] = useState("");
  const [driverLicenseCode, setDriverLicenseCode] = useState("B");
  const [vehicleLicenseExpiry, setVehicleLicenseExpiry] = useState("");
  const [roadworthyCertExpiry, setRoadworthyCertExpiry] = useState("");

  const [driverLicenseDoc, setDriverLicenseDoc] = useState("");
  const [vehicleLicenseDoc, setVehicleLicenseDoc] = useState("");
  const [roadworthyCertDoc, setRoadworthyCertDoc] = useState("");
  const [proofOfInsuranceDoc, setProofOfInsuranceDoc] = useState("");
  const [profilePhotoDoc, setProfilePhotoDoc] = useState("");

  if (!user || user.role !== "driver") {
    return null;
  }

  if (user.approvalStatus === "approved" && user.onboardingComplete) {
    setLocation("/driver");
    return null;
  }

  const stepIndex = STEPS.findIndex(s => s.key === step);

  const canProceedPersonal = fullName && phone && idNumber && address;
  const canProceedVehicle = vehicleMake && vehicleModel && vehicleColor && vehicleYear && licensePlate;
  const canProceedLicense = driverLicenseNumber && driverLicenseExpiry && driverLicenseCode;
  const canProceedDocs = driverLicenseDoc && vehicleLicenseDoc && roadworthyCertDoc;

  const handleNext = () => {
    const keys = STEPS.map(s => s.key);
    const idx = keys.indexOf(step);
    if (idx < keys.length - 1) setStep(keys[idx + 1]);
  };

  const handleBack = () => {
    const keys = STEPS.map(s => s.key);
    const idx = keys.indexOf(step);
    if (idx > 0) setStep(keys[idx - 1]);
  };

  const handleFileUpload = (setter: (val: string) => void) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.pdf";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          setter(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const updated = await submitOnboarding(user.id, {
        fullName,
        phone,
        email: email || null,
        idNumber,
        address,
        vehicleMake,
        vehicleModel,
        vehicleColor,
        vehicleYear,
        licensePlate,
        vehicleRegistrationNumber: vehicleRegistrationNumber || null,
        driverLicenseNumber,
        driverLicenseExpiry,
        driverLicenseCode,
        vehicleLicenseExpiry: vehicleLicenseExpiry || null,
        roadworthyCertExpiry: roadworthyCertExpiry || null,
        driverLicenseDoc,
        vehicleLicenseDoc,
        roadworthyCertDoc,
        proofOfInsuranceDoc: proofOfInsuranceDoc || null,
        profilePhotoDoc: profilePhotoDoc || null,
      });
      setUser(updated);
      toast({ title: "Application submitted!", description: "Your documents are under review. We'll notify you once approved." });
    } catch {
      toast({ title: "Submission failed", description: "Please try again", variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (user.onboardingComplete && user.approvalStatus === "pending") {
    return (
      <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-yellow-400/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <Clock className="h-10 w-10 text-yellow-400" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Application Under Review</h1>
        <p className="text-gray-400 mb-2 max-w-xs">Your documents have been submitted and are being reviewed by our team.</p>
        <p className="text-gray-500 text-sm mb-8">This usually takes 24-48 hours. You'll be notified once your account is approved.</p>
        <div className="bg-white/5 rounded-2xl p-5 w-full max-w-sm border border-white/10 space-y-3 mb-6">
          <div className="flex justify-between text-sm"><span className="text-gray-400">Status</span><span className="text-yellow-400 font-bold">Pending Review</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-400">Name</span><span className="text-white">{user.fullName}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-400">Vehicle</span><span className="text-white">{user.vehicleColor} {user.vehicleMake} {user.vehicleModel}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-400">License Plate</span><span className="text-white">{user.licensePlate}</span></div>
        </div>
        <Button variant="ghost" className="text-gray-400" onClick={() => { logout(); setLocation("/"); }} data-testid="btn-logout-pending">
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </div>
    );
  }

  if (user.onboardingComplete && user.approvalStatus === "rejected") {
    return (
      <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
          <XCircle className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Application Rejected</h1>
        <p className="text-gray-400 mb-2 max-w-xs">Unfortunately your application was not approved.</p>
        {user.rejectionReason && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 w-full max-w-sm">
            <p className="text-sm text-red-400"><strong>Reason:</strong> {user.rejectionReason}</p>
          </div>
        )}
        <p className="text-gray-500 text-sm mb-8">You can update your documents and re-submit.</p>
        <Button className="bg-yellow-400 text-black hover:bg-yellow-500 font-bold rounded-2xl h-14 px-8" onClick={() => {
          setStep("personal");
          setUser({ ...user, onboardingComplete: false, approvalStatus: "pending" } as any);
        }} data-testid="btn-resubmit">
          Update & Resubmit
        </Button>
        <Button variant="ghost" className="text-gray-400 mt-4" onClick={() => { logout(); setLocation("/"); }}>
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </div>
    );
  }

  const DocUploadButton = ({ label, value, setter, required = true }: { label: string; value: string; setter: (v: string) => void; required?: boolean }) => (
    <button
      className={`w-full p-4 rounded-xl border-2 border-dashed flex items-center gap-3 text-left transition-all ${value ? "border-green-400 bg-green-50" : "border-gray-300 bg-gray-50 hover:border-yellow-400"}`}
      onClick={() => handleFileUpload(setter)}
      data-testid={`upload-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {value ? (
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0"><CheckCircle className="h-5 w-5 text-green-600" /></div>
      ) : (
        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center shrink-0"><Upload className="h-5 w-5 text-gray-500" /></div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{label} {required && <span className="text-red-500">*</span>}</div>
        <div className="text-xs text-gray-500">{value ? "Uploaded - tap to replace" : "Tap to upload (image or PDF)"}</div>
      </div>
      {value && (
        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-100">
          {value.startsWith("data:image") ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <FileText className="h-5 w-5 text-gray-500 m-2.5" />
          )}
        </div>
      )}
    </button>
  );

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      <div className="bg-black text-white px-5 pt-8 pb-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-black">Driver Registration</h1>
          <Button variant="ghost" size="sm" className="text-gray-400 h-8" onClick={() => { logout(); setLocation("/"); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <button key={s.key} className={`flex-1 h-1.5 rounded-full transition-colors ${i <= stepIndex ? "bg-yellow-400" : "bg-white/20"}`} onClick={() => { if (i <= stepIndex) setStep(s.key); }} />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          {STEPS[stepIndex].icon}
          <span className="text-sm font-medium text-yellow-400">Step {stepIndex + 1} of {STEPS.length}: {STEPS[stepIndex].label}</span>
        </div>
      </div>

      <div className="flex-1 p-5 overflow-auto">
        {step === "personal" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Personal Information</h2>
            <p className="text-sm text-gray-500">We need your personal details to verify your identity.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Full Name *</label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g., Sipho Maluleke" className="h-12 rounded-xl" data-testid="input-onboard-fullname" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">SA ID Number *</label>
                <Input value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="13-digit ID number" maxLength={13} className="h-12 rounded-xl" data-testid="input-onboard-id" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Phone Number *</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g., 074 567 8901" className="h-12 rounded-xl" data-testid="input-onboard-phone" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email (optional)</label>
                <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" type="email" className="h-12 rounded-xl" data-testid="input-onboard-email" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Residential Address *</label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g., Section A, Giyani" className="h-12 rounded-xl" data-testid="input-onboard-address" />
              </div>
            </div>
          </div>
        )}

        {step === "vehicle" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Vehicle Details</h2>
            <p className="text-sm text-gray-500">Tell us about the vehicle you'll be driving.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Vehicle Make *</label>
                <Input value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} placeholder="e.g., Toyota" className="h-12 rounded-xl" data-testid="input-onboard-make" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Vehicle Model *</label>
                <Input value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} placeholder="e.g., Etios" className="h-12 rounded-xl" data-testid="input-onboard-model" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Year *</label>
                  <Input value={vehicleYear} onChange={e => setVehicleYear(e.target.value)} placeholder="e.g., 2020" className="h-12 rounded-xl" data-testid="input-onboard-year" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Color *</label>
                  <Input value={vehicleColor} onChange={e => setVehicleColor(e.target.value)} placeholder="e.g., White" className="h-12 rounded-xl" data-testid="input-onboard-color" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">License Plate Number *</label>
                <Input value={licensePlate} onChange={e => setLicensePlate(e.target.value)} placeholder="e.g., LGP 123 L" className="h-12 rounded-xl" data-testid="input-onboard-plate" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Vehicle Registration Number</label>
                <Input value={vehicleRegistrationNumber} onChange={e => setVehicleRegistrationNumber(e.target.value)} placeholder="Registration number" className="h-12 rounded-xl" data-testid="input-onboard-reg" />
              </div>
            </div>
          </div>
        )}

        {step === "license" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">License Information</h2>
            <p className="text-sm text-gray-500">Enter your driver's license and vehicle license details.</p>
            <div className="space-y-3">
              <h3 className="font-bold text-sm mt-2">Driver's License</h3>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">License Number *</label>
                <Input value={driverLicenseNumber} onChange={e => setDriverLicenseNumber(e.target.value)} placeholder="Your license number" className="h-12 rounded-xl" data-testid="input-onboard-license-num" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Expiry Date *</label>
                  <Input type="date" value={driverLicenseExpiry} onChange={e => setDriverLicenseExpiry(e.target.value)} className="h-12 rounded-xl" data-testid="input-onboard-license-exp" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">License Code *</label>
                  <select value={driverLicenseCode} onChange={e => setDriverLicenseCode(e.target.value)} className="h-12 rounded-xl border border-gray-200 bg-white px-3 w-full" data-testid="select-license-code">
                    <option value="A">A - Motorcycle</option>
                    <option value="A1">A1 - Light Motorcycle</option>
                    <option value="B">B - Light Motor Vehicle</option>
                    <option value="C">C - Heavy Vehicle</option>
                    <option value="C1">C1 - Heavy Vehicle</option>
                    <option value="EB">EB - Articulated</option>
                    <option value="EC">EC - Extra Heavy</option>
                    <option value="EC1">EC1 - Extra Heavy</option>
                  </select>
                </div>
              </div>
              <h3 className="font-bold text-sm mt-4">Vehicle License & Roadworthy</h3>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Vehicle License Disc Expiry</label>
                <Input type="date" value={vehicleLicenseExpiry} onChange={e => setVehicleLicenseExpiry(e.target.value)} className="h-12 rounded-xl" data-testid="input-onboard-vehicle-exp" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Roadworthy Certificate Expiry</label>
                <Input type="date" value={roadworthyCertExpiry} onChange={e => setRoadworthyCertExpiry(e.target.value)} className="h-12 rounded-xl" data-testid="input-onboard-roadworthy-exp" />
              </div>
            </div>
          </div>
        )}

        {step === "documents" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Upload Documents</h2>
            <p className="text-sm text-gray-500">Upload clear photos or scans of the following documents.</p>
            <div className="space-y-3">
              <DocUploadButton label="Driver's License" value={driverLicenseDoc} setter={setDriverLicenseDoc} />
              <DocUploadButton label="Vehicle License Disc" value={vehicleLicenseDoc} setter={setVehicleLicenseDoc} />
              <DocUploadButton label="Roadworthy Certificate" value={roadworthyCertDoc} setter={setRoadworthyCertDoc} />
              <DocUploadButton label="Proof of Insurance" value={proofOfInsuranceDoc} setter={setProofOfInsuranceDoc} required={false} />
              <DocUploadButton label="Profile Photo" value={profilePhotoDoc} setter={setProfilePhotoDoc} required={false} />
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Review Your Application</h2>
            <p className="text-sm text-gray-500">Please review all your details before submitting.</p>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
              <h3 className="font-bold text-sm text-yellow-600 flex items-center gap-2"><User className="h-4 w-4" /> Personal Details</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-gray-500">Name</span><span className="font-medium">{fullName}</span>
                <span className="text-gray-500">ID Number</span><span className="font-medium">{idNumber}</span>
                <span className="text-gray-500">Phone</span><span className="font-medium">{phone}</span>
                {email && <><span className="text-gray-500">Email</span><span className="font-medium">{email}</span></>}
                <span className="text-gray-500">Address</span><span className="font-medium">{address}</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
              <h3 className="font-bold text-sm text-yellow-600 flex items-center gap-2"><Car className="h-4 w-4" /> Vehicle</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-gray-500">Vehicle</span><span className="font-medium">{vehicleColor} {vehicleMake} {vehicleModel} ({vehicleYear})</span>
                <span className="text-gray-500">Plate</span><span className="font-medium">{licensePlate}</span>
                {vehicleRegistrationNumber && <><span className="text-gray-500">Reg. No.</span><span className="font-medium">{vehicleRegistrationNumber}</span></>}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
              <h3 className="font-bold text-sm text-yellow-600 flex items-center gap-2"><CreditCard className="h-4 w-4" /> Licenses</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-gray-500">License No.</span><span className="font-medium">{driverLicenseNumber}</span>
                <span className="text-gray-500">Code</span><span className="font-medium">{driverLicenseCode}</span>
                <span className="text-gray-500">Expires</span><span className="font-medium">{driverLicenseExpiry}</span>
                {vehicleLicenseExpiry && <><span className="text-gray-500">Vehicle Disc</span><span className="font-medium">{vehicleLicenseExpiry}</span></>}
                {roadworthyCertExpiry && <><span className="text-gray-500">Roadworthy</span><span className="font-medium">{roadworthyCertExpiry}</span></>}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
              <h3 className="font-bold text-sm text-yellow-600 flex items-center gap-2"><FileText className="h-4 w-4" /> Documents</h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">{driverLicenseDoc ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}<span>Driver's License</span></div>
                <div className="flex items-center gap-2">{vehicleLicenseDoc ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}<span>Vehicle License Disc</span></div>
                <div className="flex items-center gap-2">{roadworthyCertDoc ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}<span>Roadworthy Certificate</span></div>
                <div className="flex items-center gap-2">{proofOfInsuranceDoc ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <span className="text-gray-300">—</span>}<span className="text-gray-500">Proof of Insurance (optional)</span></div>
                <div className="flex items-center gap-2">{profilePhotoDoc ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <span className="text-gray-300">—</span>}<span className="text-gray-500">Profile Photo (optional)</span></div>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200 flex items-start gap-3">
              <Shield className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-bold mb-1">By submitting, you confirm that:</p>
                <ul className="space-y-0.5 text-xs">
                  <li>• All information provided is accurate</li>
                  <li>• Your vehicle is in safe working condition</li>
                  <li>• You hold a valid driver's license</li>
                  <li>• You agree to GY Rides' terms and conditions</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border-t border-gray-100 p-4 flex gap-3">
        {stepIndex > 0 && (
          <Button variant="outline" className="h-14 px-6 rounded-2xl" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        )}
        {step === "review" ? (
          <Button
            className="flex-1 h-14 rounded-2xl bg-yellow-400 text-black hover:bg-yellow-500 font-bold text-lg"
            onClick={handleSubmit}
            disabled={submitting || !canProceedDocs}
            data-testid="btn-submit-onboarding"
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </Button>
        ) : (
          <Button
            className="flex-1 h-14 rounded-2xl bg-black text-white hover:bg-gray-900 font-bold text-base"
            onClick={handleNext}
            disabled={
              (step === "personal" && !canProceedPersonal) ||
              (step === "vehicle" && !canProceedVehicle) ||
              (step === "license" && !canProceedLicense) ||
              (step === "documents" && !canProceedDocs)
            }
            data-testid="btn-next-step"
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

```

---

## `client/src/pages/AdminApp.tsx`

```tsx
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Users, Car, DollarSign, LogOut, ChevronRight, ChevronLeft, Star, MapPin, TrendingUp, Activity, AlertCircle, CheckCircle, Shield, XCircle, FileText, Eye, User as UserIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { approveDriver, rejectDriver } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { User, Trip, VehicleType } from "@shared/schema";

export default function AdminApp() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<"dashboard" | "drivers" | "trips" | "pricing" | "approvals" | "review-driver">("dashboard");
  const [reviewingDriver, setReviewingDriver] = useState<User | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setLocation("/");
    }
  }, [user]);

  const { data: stats } = useQuery<{ totalDrivers: number; totalRiders: number; totalTrips: number; totalRevenue: number; onlineDrivers: number; activeTrips: number }>({
    queryKey: ["/api/admin/stats"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: drivers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/role/driver"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: pendingDrivers = [] } = useQuery<User[]>({
    queryKey: ["/api/drivers/pending"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: allTrips = [] } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: vehicleTypes = [] } = useQuery<VehicleType[]>({
    queryKey: ["/api/vehicle-types"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  if (!user) return null;

  const completedTrips = allTrips.filter(t => t.status === "completed");
  const cancelledTrips = allTrips.filter(t => t.status === "cancelled");

  const handleApprove = async (driverId: string) => {
    try {
      await approveDriver(driverId);
      toast({ title: "Driver Approved", description: "The driver can now start accepting rides" });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/role/driver"] });
      setReviewingDriver(null);
      setView("approvals");
    } catch {
      toast({ title: "Failed to approve", variant: "destructive" });
    }
  };

  const handleReject = async (driverId: string) => {
    try {
      await rejectDriver(driverId, rejectReason || "Application does not meet requirements");
      toast({ title: "Driver Rejected", description: "The driver has been notified" });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/role/driver"] });
      setReviewingDriver(null);
      setShowRejectInput(false);
      setRejectReason("");
      setView("approvals");
    } catch {
      toast({ title: "Failed to reject", variant: "destructive" });
    }
  };

  // ── Review Driver Application ──
  if (view === "review-driver" && reviewingDriver) {
    const d = reviewingDriver;
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => { setView("approvals"); setReviewingDriver(null); setShowRejectInput(false); }} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Review Application</h1>
        </div>
        <div className="flex-1 p-4 space-y-4 overflow-auto">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
            <Avatar className="h-16 w-16 mx-auto mb-3 border-2 border-yellow-400">
              <AvatarFallback className="bg-yellow-400 text-black text-xl font-bold">{d.fullName[0]}</AvatarFallback>
            </Avatar>
            <h2 className="text-lg font-bold">{d.fullName}</h2>
            <p className="text-gray-500 text-sm">{d.phone}</p>
            {d.email && <p className="text-gray-500 text-xs">{d.email}</p>}
            <span className="inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">Pending Approval</span>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
            <h3 className="font-bold text-sm text-gray-600 flex items-center gap-2"><UserIcon className="h-4 w-4" /> Personal Details</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-gray-500">ID Number</span><span className="font-medium">{d.idNumber || "—"}</span>
              <span className="text-gray-500">Address</span><span className="font-medium">{d.address || "—"}</span>
              <span className="text-gray-500">Phone</span><span className="font-medium">{d.phone}</span>
              {d.email && <><span className="text-gray-500">Email</span><span className="font-medium">{d.email}</span></>}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
            <h3 className="font-bold text-sm text-gray-600 flex items-center gap-2"><Car className="h-4 w-4" /> Vehicle Details</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-gray-500">Make</span><span className="font-medium">{d.vehicleMake || "—"}</span>
              <span className="text-gray-500">Model</span><span className="font-medium">{d.vehicleModel || "—"}</span>
              <span className="text-gray-500">Color</span><span className="font-medium">{d.vehicleColor || "—"}</span>
              <span className="text-gray-500">Year</span><span className="font-medium">{d.vehicleYear || "—"}</span>
              <span className="text-gray-500">Plate</span><span className="font-medium">{d.licensePlate || "—"}</span>
              <span className="text-gray-500">Reg. Number</span><span className="font-medium">{d.vehicleRegistrationNumber || "—"}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
            <h3 className="font-bold text-sm text-gray-600 flex items-center gap-2"><FileText className="h-4 w-4" /> License Info</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-gray-500">License No.</span><span className="font-medium">{d.driverLicenseNumber || "—"}</span>
              <span className="text-gray-500">Code</span><span className="font-medium">{d.driverLicenseCode || "—"}</span>
              <span className="text-gray-500">License Expiry</span><span className="font-medium">{d.driverLicenseExpiry || "—"}</span>
              <span className="text-gray-500">Vehicle Disc Expiry</span><span className="font-medium">{d.vehicleLicenseExpiry || "—"}</span>
              <span className="text-gray-500">Roadworthy Expiry</span><span className="font-medium">{d.roadworthyCertExpiry || "—"}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h3 className="font-bold text-sm text-gray-600 flex items-center gap-2"><FileText className="h-4 w-4" /> Uploaded Documents</h3>
            {[
              { label: "Driver's License", doc: d.driverLicenseDoc },
              { label: "Vehicle License Disc", doc: d.vehicleLicenseDoc },
              { label: "Roadworthy Certificate", doc: d.roadworthyCertDoc },
              { label: "Proof of Insurance", doc: d.proofOfInsuranceDoc },
              { label: "Profile Photo", doc: d.profilePhotoDoc },
            ].map(({ label, doc }) => (
              <div key={label} className="flex items-center gap-3">
                {doc ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-sm flex-1">{label}</span>
                    {doc.startsWith("data:image") && (
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        <img src={doc} alt={label} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <button className="text-xs text-blue-600 font-medium" onClick={() => {
                      if (doc.startsWith("data:")) {
                        const win = window.open();
                        if (win) { win.document.write(`<img src="${doc}" style="max-width:100%" />`); }
                      }
                    }}>
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-gray-300 shrink-0" />
                    <span className="text-sm text-gray-400 flex-1">{label} — not uploaded</span>
                  </>
                )}
              </div>
            ))}
          </div>

          {showRejectInput && (
            <div className="bg-red-50 rounded-xl p-4 border border-red-200 space-y-3">
              <p className="text-sm font-bold text-red-700">Rejection Reason</p>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Explain why the application is rejected..."
                className="w-full h-24 rounded-lg border border-red-200 p-3 text-sm resize-none"
                data-testid="input-reject-reason"
              />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => { setShowRejectInput(false); setRejectReason(""); }}>Cancel</Button>
                <Button className="flex-1 rounded-xl h-11 bg-red-600 hover:bg-red-700 text-white" onClick={() => handleReject(d.id)} data-testid="btn-confirm-reject">Confirm Reject</Button>
              </div>
            </div>
          )}
        </div>

        {!showRejectInput && (
          <div className="bg-white border-t border-gray-100 p-4 flex gap-3">
            <Button variant="outline" className="flex-1 h-14 rounded-2xl text-red-600 border-red-200" onClick={() => setShowRejectInput(true)} data-testid="btn-reject-driver">
              <XCircle className="h-4 w-4 mr-2" /> Reject
            </Button>
            <Button className="flex-1 h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => handleApprove(d.id)} data-testid="btn-approve-driver">
              <CheckCircle className="h-4 w-4 mr-2" /> Approve
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ── Pending Approvals ──
  if (view === "approvals") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setView("dashboard")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Pending Approvals ({pendingDrivers.length})</h1>
        </div>
        <div className="p-4 space-y-3 overflow-auto">
          {pendingDrivers.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-4" />
              <p className="font-medium text-gray-500">All caught up!</p>
              <p className="text-sm text-gray-400">No pending driver applications</p>
            </div>
          ) : pendingDrivers.map(d => (
            <button
              key={d.id}
              className="w-full text-left bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3"
              onClick={() => { setReviewingDriver(d); setView("review-driver"); }}
              data-testid={`pending-driver-${d.id}`}
            >
              <Avatar className="h-11 w-11 border-2 border-yellow-400">
                <AvatarFallback className="bg-yellow-400 text-black font-bold">{d.fullName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{d.fullName}</div>
                <div className="text-xs text-gray-500">{d.phone}</div>
                <div className="text-[10px] text-gray-400">{d.vehicleColor} {d.vehicleMake} {d.vehicleModel} · {d.licensePlate}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Pending</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Drivers List ──
  if (view === "drivers") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setView("dashboard")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Drivers ({drivers.length})</h1>
        </div>
        <div className="p-4 space-y-2 overflow-auto">
          {drivers.map(d => (
            <div key={d.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3" data-testid={`driver-card-${d.id}`}>
              <Avatar className="h-11 w-11 border-2 border-yellow-400">
                <AvatarFallback className="bg-yellow-400 text-black font-bold">{d.fullName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{d.fullName}</span>
                  {d.approvalStatus === "approved" && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {d.rating?.toFixed(1)} · {d.totalTrips} trips
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">{d.vehicleColor} {d.vehicleMake} {d.vehicleModel} · {d.licensePlate}</div>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.approvalStatus === "approved" ? (d.isOnline ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500") : d.approvalStatus === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                  {d.approvalStatus === "approved" ? (d.isOnline ? "Online" : "Offline") : d.approvalStatus}
                </span>
                <div className="text-sm font-bold mt-1">R{(d.earnings ?? 0).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Trips List ──
  if (view === "trips") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setView("dashboard")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">All Trips ({allTrips.length})</h1>
        </div>
        <div className="p-3 flex gap-2 sticky top-14 bg-gray-50 z-10">
          <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full">{completedTrips.length} completed</span>
          <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full">{cancelledTrips.length} cancelled</span>
          <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded-full">{allTrips.length - completedTrips.length - cancelledTrips.length} active</span>
        </div>
        <div className="p-3 space-y-2 overflow-auto">
          {allTrips.map(trip => (
            <div key={trip.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" data-testid={`admin-trip-${trip.id}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="text-[10px] text-gray-500">{trip.createdAt ? new Date(trip.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trip.status === "completed" ? "bg-green-100 text-green-700" : trip.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {trip.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm mb-1">
                <div className="w-2 h-2 bg-green-500 rounded-full shrink-0" /><span className="truncate">{trip.pickupName}</span>
                <span className="text-gray-300">→</span>
                <div className="w-2 h-2 bg-black rounded-full shrink-0" /><span className="truncate">{trip.dropoffName}</span>
              </div>
              <div className="flex justify-between text-xs mt-2 pt-2 border-t border-gray-50">
                <span className="text-gray-500">{trip.vehicleType} · {trip.distance?.toFixed(1)} km · {trip.paymentMethod}</span>
                <span className="font-bold">R{trip.fare}</span>
              </div>
            </div>
          ))}
          {allTrips.length === 0 && <div className="text-center py-16 text-gray-400 text-sm">No trips yet</div>}
        </div>
      </div>
    );
  }

  // ── Pricing ──
  if (view === "pricing") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setView("dashboard")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Vehicles & Pricing</h1>
        </div>
        <div className="p-4 space-y-3">
          {vehicleTypes.map(vt => (
            <div key={vt.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                  <Car className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{vt.name}</h3>
                  <p className="text-xs text-gray-500">{vt.description}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${vt.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {vt.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-sm font-bold">R{vt.basePrice}</div>
                  <div className="text-[10px] text-gray-500">Base</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-sm font-bold">R{vt.pricePerKm}/km</div>
                  <div className="text-[10px] text-gray-500">Per Km</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-sm font-bold">{vt.seats}</div>
                  <div className="text-[10px] text-gray-500">Seats</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Dashboard ──
  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      <div className="bg-black text-white pt-8 pb-6 px-5 rounded-b-3xl">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h1 className="text-xl font-black tracking-tight">GY Admin</h1>
            <p className="text-xs text-gray-400">Platform Management</p>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full" onClick={() => { logout(); setLocation("/"); }} data-testid="btn-admin-logout">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-white/10 border-none shadow-none text-white">
            <CardContent className="p-3 flex flex-col items-start gap-1.5">
              <div className="p-1.5 bg-yellow-400/20 rounded-lg text-yellow-400"><DollarSign className="h-4 w-4" /></div>
              <div>
                <div className="text-xl font-bold">R{stats ? stats.totalRevenue.toLocaleString() : "..."}</div>
                <div className="text-[10px] opacity-70">Total Revenue</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-none shadow-none text-white">
            <CardContent className="p-3 flex flex-col items-start gap-1.5">
              <div className="p-1.5 bg-green-500/20 rounded-lg text-green-400"><Activity className="h-4 w-4" /></div>
              <div>
                <div className="text-xl font-bold">{stats?.activeTrips ?? 0}</div>
                <div className="text-[10px] opacity-70">Active Trips</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="p-5 space-y-5 flex-1">
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <div className="text-lg font-bold">{stats?.totalDrivers ?? 0}</div>
            <div className="text-[10px] text-gray-500">Drivers</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <div className="text-lg font-bold">{stats?.totalRiders ?? 0}</div>
            <div className="text-[10px] text-gray-500">Riders</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <div className="text-lg font-bold text-green-600">{stats?.onlineDrivers ?? 0}</div>
            <div className="text-[10px] text-gray-500">Online</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <div className="text-lg font-bold">{stats?.totalTrips ?? 0}</div>
            <div className="text-[10px] text-gray-500">Trips</div>
          </div>
        </div>

        {pendingDrivers.length > 0 && (
          <button
            className="w-full bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3 text-left"
            onClick={() => setView("approvals")}
            data-testid="btn-pending-approvals"
          >
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-orange-500" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm text-orange-800">{pendingDrivers.length} Pending Driver Application{pendingDrivers.length > 1 ? "s" : ""}</div>
              <div className="text-[10px] text-orange-600">Tap to review and approve or reject</div>
            </div>
            <ChevronRight className="h-4 w-4 text-orange-400" />
          </button>
        )}

        <h2 className="font-bold">Management</h2>

        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-between h-14 rounded-xl bg-white border-gray-100 shadow-sm px-4" onClick={() => setView("approvals")} data-testid="btn-manage-approvals">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-50 p-2 rounded-lg text-yellow-600"><Shield className="h-4 w-4" /></div>
              <div className="text-left">
                <div className="font-bold text-sm">Driver Approvals</div>
                <div className="text-[10px] text-gray-500">{pendingDrivers.length} pending</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pendingDrivers.length > 0 && <span className="w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{pendingDrivers.length}</span>}
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </Button>

          <Button variant="outline" className="w-full justify-between h-14 rounded-xl bg-white border-gray-100 shadow-sm px-4" onClick={() => setView("drivers")} data-testid="btn-manage-drivers">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Users className="h-4 w-4" /></div>
              <div className="text-left">
                <div className="font-bold text-sm">All Drivers</div>
                <div className="text-[10px] text-gray-500">{stats?.onlineDrivers ?? 0} online now</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Button>

          <Button variant="outline" className="w-full justify-between h-14 rounded-xl bg-white border-gray-100 shadow-sm px-4" onClick={() => setView("trips")} data-testid="btn-manage-trips">
            <div className="flex items-center gap-3">
              <div className="bg-purple-50 p-2 rounded-lg text-purple-600"><MapPin className="h-4 w-4" /></div>
              <div className="text-left">
                <div className="font-bold text-sm">Trips</div>
                <div className="text-[10px] text-gray-500">{completedTrips.length} completed · {cancelledTrips.length} cancelled</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Button>

          <Button variant="outline" className="w-full justify-between h-14 rounded-xl bg-white border-gray-100 shadow-sm px-4" onClick={() => setView("pricing")} data-testid="btn-manage-pricing">
            <div className="flex items-center gap-3">
              <div className="bg-orange-50 p-2 rounded-lg text-orange-600"><Car className="h-4 w-4" /></div>
              <div className="text-left">
                <div className="font-bold text-sm">Vehicles & Pricing</div>
                <div className="text-[10px] text-gray-500">{vehicleTypes.length} categories</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Button>
        </div>

        <h2 className="font-bold">Platform Health</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-xs font-bold">Revenue</span>
            </div>
            <div className="text-lg font-bold">R{stats ? stats.totalRevenue.toLocaleString() : "0"}</div>
            <div className="text-[10px] text-gray-500">{completedTrips.length} paid trips</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold">Completion Rate</span>
            </div>
            <div className="text-lg font-bold">{allTrips.length > 0 ? Math.round((completedTrips.length / allTrips.length) * 100) : 0}%</div>
            <div className="text-[10px] text-gray-500">{cancelledTrips.length} cancellations</div>
          </div>
        </div>
      </div>
    </div>
  );
}

```

---

## `client/src/pages/not-found.tsx`

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

```

---

## `client/src/components/GiyaniMap.tsx`

```tsx
import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const GIYANI_CENTER: [number, number] = [-23.31, 30.72];

const pickupIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:36px;height:36px;background:#22c55e;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
    <div style="width:10px;height:10px;background:white;border-radius:50%"></div>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const dropoffIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:36px;height:36px;background:#000;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const carIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:44px;height:44px;background:#facc15;border:3px solid white;border-radius:50%;box-shadow:0 4px 14px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>
  </div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const pinDropIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:36px;height:46px;display:flex;flex-direction:column;align-items:center">
    <div style="width:32px;height:32px;background:#6366f1;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="3"/></svg>
    </div>
    <div style="width:3px;height:10px;background:#6366f1;border-radius:0 0 2px 2px;margin-top:-2px"></div>
  </div>`,
  iconSize: [36, 46],
  iconAnchor: [18, 46],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    }
  }, [JSON.stringify(points)]);
  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

async function fetchRoute(from: [number, number], to: [number, number]): Promise<[number, number][]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      const coords = data.routes[0].geometry.coordinates;
      return coords.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
    }
  } catch (err) {
    console.warn("Route fetch failed, falling back to straight line", err);
  }
  return [from, to];
}

interface GiyaniMapProps {
  pickup?: { lat: number; lng: number; name?: string } | null;
  dropoff?: { lat: number; lng: number; name?: string } | null;
  driverLocation?: { lat: number; lng: number } | null;
  className?: string;
  showRoute?: boolean;
  interactive?: boolean;
  onPinDrop?: (lat: number, lng: number) => void;
  pinDropLocation?: { lat: number; lng: number } | null;
}

export default function GiyaniMap({
  pickup,
  dropoff,
  driverLocation,
  className = "",
  showRoute = true,
  interactive = false,
  onPinDrop,
  pinDropLocation,
}: GiyaniMapProps) {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [driverRouteCoords, setDriverRouteCoords] = useState<[number, number][]>([]);

  useEffect(() => {
    if (pickup && dropoff && showRoute) {
      fetchRoute([pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]).then(setRouteCoords);
    } else {
      setRouteCoords([]);
    }
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng, showRoute]);

  useEffect(() => {
    if (driverLocation && pickup && showRoute) {
      fetchRoute([driverLocation.lat, driverLocation.lng], [pickup.lat, pickup.lng]).then(setDriverRouteCoords);
    } else {
      setDriverRouteCoords([]);
    }
  }, [driverLocation?.lat, driverLocation?.lng, pickup?.lat, pickup?.lng, showRoute]);

  const fitPoints: [number, number][] = [];
  if (pickup) fitPoints.push([pickup.lat, pickup.lng]);
  if (dropoff) fitPoints.push([dropoff.lat, dropoff.lng]);
  if (driverLocation) fitPoints.push([driverLocation.lat, driverLocation.lng]);
  if (pinDropLocation) fitPoints.push([pinDropLocation.lat, pinDropLocation.lng]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (interactive && onPinDrop) {
      onPinDrop(lat, lng);
    }
  }, [interactive, onPinDrop]);

  return (
    <div className={`w-full ${className}`} style={{ minHeight: "200px" }}>
      <MapContainer
        center={GIYANI_CENTER}
        zoom={14}
        scrollWheelZoom={true}
        zoomControl={false}
        attributionControl={false}
        style={{ width: "100%", height: "100%", borderRadius: "inherit" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {fitPoints.length > 0 && <FitBounds points={fitPoints} />}

        {interactive && <MapClickHandler onMapClick={handleMapClick} />}

        {pickup && (
          <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
            <Popup><b>Pickup:</b> {pickup.name || "Pickup point"}</Popup>
          </Marker>
        )}

        {dropoff && (
          <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
            <Popup><b>Drop-off:</b> {dropoff.name || "Drop-off point"}</Popup>
          </Marker>
        )}

        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={carIcon}>
            <Popup>Driver location</Popup>
          </Marker>
        )}

        {pinDropLocation && (
          <Marker position={[pinDropLocation.lat, pinDropLocation.lng]} icon={pinDropIcon}>
            <Popup>Dropped pin</Popup>
          </Marker>
        )}

        {routeCoords.length > 1 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{ color: "#000", weight: 5, opacity: 0.8 }}
          />
        )}

        {driverRouteCoords.length > 1 && (
          <Polyline
            positions={driverRouteCoords}
            pathOptions={{ color: "#facc15", weight: 4, opacity: 0.9, dashArray: "8, 6" }}
          />
        )}
      </MapContainer>
    </div>
  );
}

```

---

## `drizzle.config.ts`

```ts
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});

```

---

## `vite.config.ts`

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    tailwindcss(),
    metaImagesPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});

```

---

## `vite-plugin-meta-images.ts`

```ts
import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Vite plugin that updates og:image and twitter:image meta tags
 * to point to the app's opengraph image with the correct Replit domain.
 */
export function metaImagesPlugin(): Plugin {
  return {
    name: 'vite-plugin-meta-images',
    transformIndexHtml(html) {
      const baseUrl = getDeploymentUrl();
      if (!baseUrl) {
        log('[meta-images] no Replit deployment domain found, skipping meta tag updates');
        return html;
      }

      // Check if opengraph image exists in public directory
      const publicDir = path.resolve(process.cwd(), 'client', 'public');
      const opengraphPngPath = path.join(publicDir, 'opengraph.png');
      const opengraphJpgPath = path.join(publicDir, 'opengraph.jpg');
      const opengraphJpegPath = path.join(publicDir, 'opengraph.jpeg');

      let imageExt: string | null = null;
      if (fs.existsSync(opengraphPngPath)) {
        imageExt = 'png';
      } else if (fs.existsSync(opengraphJpgPath)) {
        imageExt = 'jpg';
      } else if (fs.existsSync(opengraphJpegPath)) {
        imageExt = 'jpeg';
      }

      if (!imageExt) {
        log('[meta-images] OpenGraph image not found, skipping meta tag updates');
        return html;
      }

      const imageUrl = `${baseUrl}/opengraph.${imageExt}`;

      log('[meta-images] updating meta image tags to:', imageUrl);

      html = html.replace(
        /<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/g,
        `<meta property="og:image" content="${imageUrl}" />`
      );

      html = html.replace(
        /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/>/g,
        `<meta name="twitter:image" content="${imageUrl}" />`
      );

      return html;
    },
  };
}

function getDeploymentUrl(): string | null {
  if (process.env.REPLIT_INTERNAL_APP_DOMAIN) {
    const url = `https://${process.env.REPLIT_INTERNAL_APP_DOMAIN}`;
    log('[meta-images] using internal app domain:', url);
    return url;
  }

  if (process.env.REPLIT_DEV_DOMAIN) {
    const url = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    log('[meta-images] using dev domain:', url);
    return url;
  }

  return null;
}

function log(...args: any[]): void {
  if (process.env.NODE_ENV === 'production') {
    console.log(...args);
  }
}

```

---

## `tsconfig.json`

```json
{
  "include": ["client/src/**/*", "shared/**/*", "server/**/*"],
  "exclude": ["node_modules", "build", "dist", "**/*.test.ts"],
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./node_modules/typescript/tsbuildinfo",
    "noEmit": true,
    "module": "ESNext",
    "strict": true,
    "lib": ["esnext", "dom", "dom.iterable"],
    "jsx": "preserve",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "types": ["node", "vite/client"],
    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"]
    }
  }
}

```

---

## `package.json`

```json
{
  "name": "rest-express",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev:client": "vite dev --port 5000",
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "tsx script/build.ts",
    "start": "NODE_ENV=production node dist/index.cjs",
    "check": "tsc",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@jridgewell/trace-mapping": "^0.3.25",
    "@radix-ui/react-accordion": "^1.2.12",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-aspect-ratio": "^1.1.8",
    "@radix-ui/react-avatar": "^1.1.11",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-collapsible": "^1.1.12",
    "@radix-ui/react-context-menu": "^2.2.16",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-hover-card": "^1.1.15",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-menubar": "^1.1.16",
    "@radix-ui/react-navigation-menu": "^1.2.14",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-progress": "^1.1.8",
    "@radix-ui/react-radio-group": "^1.3.8",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slider": "^1.3.6",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-toast": "^1.2.7",
    "@radix-ui/react-toggle": "^1.1.10",
    "@radix-ui/react-toggle-group": "^1.1.11",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@tanstack/react-query": "^5.60.5",
    "@types/leaflet": "^1.9.21",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "connect-pg-simple": "^10.0.0",
    "date-fns": "^3.6.0",
    "drizzle-orm": "^0.39.3",
    "drizzle-zod": "^0.7.0",
    "embla-carousel-react": "^8.6.0",
    "express": "^5.0.1",
    "express-session": "^1.18.1",
    "framer-motion": "^12.23.24",
    "input-otp": "^1.4.2",
    "leaflet": "^1.9.4",
    "lucide-react": "^0.545.0",
    "memorystore": "^1.6.7",
    "next-themes": "^0.4.6",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "pg": "^8.16.3",
    "react": "^19.2.0",
    "react-day-picker": "^9.11.1",
    "react-dom": "^19.2.0",
    "react-hook-form": "^7.66.0",
    "react-leaflet": "^5.0.0",
    "react-resizable-panels": "^2.1.9",
    "recharts": "^2.15.4",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.3.1",
    "tailwindcss-animate": "^1.0.7",
    "tw-animate-css": "^1.4.0",
    "vaul": "^1.1.2",
    "wouter": "^3.3.5",
    "ws": "^8.18.0",
    "zod": "^3.25.76",
    "zod-validation-error": "^3.4.0"
  },
  "devDependencies": {
    "@replit/vite-plugin-cartographer": "^0.4.10",
    "@replit/vite-plugin-dev-banner": "^0.1.1",
    "@replit/vite-plugin-runtime-error-modal": "^0.0.4",
    "@tailwindcss/vite": "^4.1.14",
    "@types/connect-pg-simple": "^7.0.3",
    "@types/express": "^5.0.0",
    "@types/express-session": "^1.18.0",
    "@types/node": "^20.19.0",
    "@types/passport": "^1.0.16",
    "@types/passport-local": "^1.0.38",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@types/ws": "^8.5.13",
    "@vitejs/plugin-react": "^5.0.4",
    "autoprefixer": "^10.4.21",
    "drizzle-kit": "^0.31.4",
    "esbuild": "^0.25.0",
    "postcss": "^8.5.6",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.20.5",
    "typescript": "5.6.3",
    "vite": "^7.1.9"
  },
  "optionalDependencies": {
    "bufferutil": "^4.0.8"
  }
}

```

---

## `components.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "client/src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}

```

---

## `script/build.ts`

```ts
import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});

```

---

# UI Components (shadcn/ui)

---

## `client/src/components/ui/accordion.tsx`

```tsx
import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b", className)}
    {...props}
  />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline text-left [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }

```

---

## `client/src/components/ui/alert-dialog.tsx`

```tsx
import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const AlertDialog = AlertDialogPrimitive.Root

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    />
  </AlertDialogPortal>
))
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants(), className)}
    {...props}
  />
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: "outline" }),
      "mt-2 sm:mt-0",
      className
    )}
    {...props}
  />
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}

```

---

## `client/src/components/ui/alert.tsx`

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }

```

---

## `client/src/components/ui/aspect-ratio.tsx`

```tsx
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio"

const AspectRatio = AspectRatioPrimitive.Root

export { AspectRatio }

```

---

## `client/src/components/ui/avatar.tsx`

```tsx
"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }

```

---

## `client/src/components/ui/badge.tsx`

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // @replit
  // Whitespace-nowrap: Badges should never wrap.
  "whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" +
  " hover-elevate ",
  {
    variants: {
      variant: {
        default:
          // @replit shadow-xs instead of shadow, no hover because we use hover-elevate
          "border-transparent bg-primary text-primary-foreground shadow-xs",
        secondary:
          // @replit no hover because we use hover-elevate
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          // @replit shadow-xs instead of shadow, no hover because we use hover-elevate
          "border-transparent bg-destructive text-destructive-foreground shadow-xs",
          // @replit shadow-xs" - use badge outline variable
        outline: "text-foreground border [border-color:var(--badge-outline)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

```

---

## `client/src/components/ui/breadcrumb.tsx`

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<"nav"> & {
    separator?: React.ReactNode
  }
>(({ ...props }, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />)
Breadcrumb.displayName = "Breadcrumb"

const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  React.ComponentPropsWithoutRef<"ol">
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn(
      "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
      className
    )}
    {...props}
  />
))
BreadcrumbList.displayName = "BreadcrumbList"

const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn("inline-flex items-center gap-1.5", className)}
    {...props}
  />
))
BreadcrumbItem.displayName = "BreadcrumbItem"

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<"a"> & {
    asChild?: boolean
  }
>(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"

  return (
    <Comp
      ref={ref}
      className={cn("transition-colors hover:text-foreground", className)}
      {...props}
    />
  )
})
BreadcrumbLink.displayName = "BreadcrumbLink"

const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn("font-normal text-foreground", className)}
    {...props}
  />
))
BreadcrumbPage.displayName = "BreadcrumbPage"

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn("[&>svg]:w-3.5 [&>svg]:h-3.5", className)}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
)
BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

const BreadcrumbEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
)
BreadcrumbEllipsis.displayName = "BreadcrumbElipssis"

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
}

```

---

## `client/src/components/ui/button-group.tsx`

```tsx
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

const buttonGroupVariants = cva(
  "flex w-fit items-stretch has-[>[data-slot=button-group]]:gap-2 [&>*]:focus-visible:relative [&>*]:focus-visible:z-10 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  {
    variants: {
      orientation: {
        horizontal:
          "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none",
        vertical:
          "flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  }
)

function ButtonGroup({
  className,
  orientation,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  )
}

function ButtonGroupText({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & {
  asChild?: boolean
}) {
  const Comp = asChild ? Slot : "div"

  return (
    <Comp
      className={cn(
        "bg-muted shadow-xs flex items-center gap-2 rounded-md border px-4 text-sm font-medium [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none",
        className
      )}
      {...props}
    />
  )
}

function ButtonGroupSeparator({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(
        "bg-input relative !m-0 self-stretch data-[orientation=vertical]:h-auto",
        className
      )}
      {...props}
    />
  )
}

export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
}

```

---

## `client/src/components/ui/button.tsx`

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0" +
" hover-elevate active-elevate-2",
  {
    variants: {
      variant: {
        default:
           // @replit: no hover, and add primary border
           "bg-primary text-primary-foreground border border-primary-border",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm border-destructive-border",
        outline:
          // @replit Shows the background color of whatever card / sidebar / accent background it is inside of.
          // Inherits the current text color. Uses shadow-xs. no shadow on active
          // No hover state
          " border [border-color:var(--button-outline)] shadow-xs active:shadow-none ",
        secondary:
          // @replit border, no hover, no shadow, secondary border.
          "border bg-secondary text-secondary-foreground border border-secondary-border ",
        // @replit no hover, transparent border
        ghost: "border border-transparent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // @replit changed sizes
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 rounded-md px-3 text-xs",
        lg: "min-h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

```

---

## `client/src/components/ui/calendar.tsx`

```tsx
"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background group/calendar p-3 [--cell-size:2rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-[--cell-size] w-[--cell-size] select-none p-0 aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-[--cell-size] w-[--cell-size] select-none p-0 aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-[--cell-size] w-full items-center justify-center px-[--cell-size]",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-[--cell-size] w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "has-focus:border-ring border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] relative rounded-md border",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "bg-popover absolute inset-0 opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label"
            ? "text-sm"
            : "[&>svg]:text-muted-foreground flex h-8 items-center gap-1 rounded-md pl-2 pr-1 text-sm [&>svg]:size-3.5",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground flex-1 select-none rounded-md text-[0.8rem] font-normal",
          defaultClassNames.weekday
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-[--cell-size] select-none",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-muted-foreground select-none text-[0.8rem]",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full select-none p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md",
          defaultClassNames.day
        ),
        range_start: cn(
          "bg-accent rounded-l-md",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("bg-accent rounded-r-md", defaultClassNames.range_end),
        today: cn(
          "bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-[--cell-size] items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 flex aspect-square h-auto w-full min-w-[--cell-size] flex-col gap-1 font-normal leading-none data-[range-end=true]:rounded-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }

```

---

## `client/src/components/ui/card.tsx`

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

```

---

## `client/src/components/ui/carousel.tsx`

```tsx
import * as React from "react"
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
}

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: ReturnType<typeof useEmblaCarousel>[1]
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
} & CarouselProps

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CarouselProps
>(
  (
    {
      orientation = "horizontal",
      opts,
      setApi,
      plugins,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [carouselRef, api] = useEmblaCarousel(
      {
        ...opts,
        axis: orientation === "horizontal" ? "x" : "y",
      },
      plugins
    )
    const [canScrollPrev, setCanScrollPrev] = React.useState(false)
    const [canScrollNext, setCanScrollNext] = React.useState(false)

    const onSelect = React.useCallback((api: CarouselApi) => {
      if (!api) {
        return
      }

      setCanScrollPrev(api.canScrollPrev())
      setCanScrollNext(api.canScrollNext())
    }, [])

    const scrollPrev = React.useCallback(() => {
      api?.scrollPrev()
    }, [api])

    const scrollNext = React.useCallback(() => {
      api?.scrollNext()
    }, [api])

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault()
          scrollPrev()
        } else if (event.key === "ArrowRight") {
          event.preventDefault()
          scrollNext()
        }
      },
      [scrollPrev, scrollNext]
    )

    React.useEffect(() => {
      if (!api || !setApi) {
        return
      }

      setApi(api)
    }, [api, setApi])

    React.useEffect(() => {
      if (!api) {
        return
      }

      onSelect(api)
      api.on("reInit", onSelect)
      api.on("select", onSelect)

      return () => {
        api?.off("select", onSelect)
      }
    }, [api, onSelect])

    return (
      <CarouselContext.Provider
        value={{
          carouselRef,
          api: api,
          opts,
          orientation:
            orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
          scrollPrev,
          scrollNext,
          canScrollPrev,
          canScrollNext,
        }}
      >
        <div
          ref={ref}
          onKeyDownCapture={handleKeyDown}
          className={cn("relative", className)}
          role="region"
          aria-roledescription="carousel"
          {...props}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    )
  }
)
Carousel.displayName = "Carousel"

const CarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { carouselRef, orientation } = useCarousel()

  return (
    <div ref={carouselRef} className="overflow-hidden">
      <div
        ref={ref}
        className={cn(
          "flex",
          orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
          className
        )}
        {...props}
      />
    </div>
  )
})
CarouselContent.displayName = "CarouselContent"

const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { orientation } = useCarousel()

  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className
      )}
      {...props}
    />
  )
})
CarouselItem.displayName = "CarouselItem"

const CarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute  h-8 w-8 rounded-full",
        orientation === "horizontal"
          ? "-left-12 top-1/2 -translate-y-1/2"
          : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
})
CarouselPrevious.displayName = "CarouselPrevious"

const CarouselNext = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute h-8 w-8 rounded-full",
        orientation === "horizontal"
          ? "-right-12 top-1/2 -translate-y-1/2"
          : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight className="h-4 w-4" />
      <span className="sr-only">Next slide</span>
    </Button>
  )
})
CarouselNext.displayName = "CarouselNext"

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
}

```

---

## `client/src/components/ui/chart.tsx`

```tsx
import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"]
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "Chart"

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.theme || config.color
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean
      hideIndicator?: boolean
      indicator?: "line" | "dot" | "dashed"
      nameKey?: string
      labelKey?: string
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const { config } = useChart()

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null
      }

      const [item] = payload
      const key = `${labelKey || item?.dataKey || item?.name || "value"}`
      const itemConfig = getPayloadConfigFromPayload(config, item, key)
      const value =
        !labelKey && typeof label === "string"
          ? config[label as keyof typeof config]?.label || label
          : itemConfig?.label

      if (labelFormatter) {
        return (
          <div className={cn("font-medium", labelClassName)}>
            {labelFormatter(value, payload)}
          </div>
        )
      }

      if (!value) {
        return null
      }

      return <div className={cn("font-medium", labelClassName)}>{value}</div>
    }, [
      label,
      labelFormatter,
      payload,
      hideLabel,
      labelClassName,
      config,
      labelKey,
    ])

    if (!active || !payload?.length) {
      return null
    }

    const nestLabel = payload.length === 1 && indicator !== "dot"

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload
            .filter((item) => item.type !== "none")
            .map((item, index) => {
              const key = `${nameKey || item.name || item.dataKey || "value"}`
              const itemConfig = getPayloadConfigFromPayload(config, item, key)
              const indicatorColor = color || item.payload.fill || item.color

              return (
                <div
                  key={item.dataKey}
                  className={cn(
                    "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                    indicator === "dot" && "items-center"
                  )}
                >
                  {formatter && item?.value !== undefined && item.name ? (
                    formatter(item.value, item.name, item, index, item.payload)
                  ) : (
                    <>
                      {itemConfig?.icon ? (
                        <itemConfig.icon />
                      ) : (
                        !hideIndicator && (
                          <div
                            className={cn(
                              "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                              {
                                "h-2.5 w-2.5": indicator === "dot",
                                "w-1": indicator === "line",
                                "w-0 border-[1.5px] border-dashed bg-transparent":
                                  indicator === "dashed",
                                "my-0.5": nestLabel && indicator === "dashed",
                              }
                            )}
                            style={
                              {
                                "--color-bg": indicatorColor,
                                "--color-border": indicatorColor,
                              } as React.CSSProperties
                            }
                          />
                        )
                      )}
                      <div
                        className={cn(
                          "flex flex-1 justify-between leading-none",
                          nestLabel ? "items-end" : "items-center"
                        )}
                      >
                        <div className="grid gap-1.5">
                          {nestLabel ? tooltipLabel : null}
                          <span className="text-muted-foreground">
                            {itemConfig?.label || item.name}
                          </span>
                        </div>
                        {item.value && (
                          <span className="font-mono font-medium tabular-nums text-foreground">
                            {item.value.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltip"

const ChartLegend = RechartsPrimitive.Legend

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
      hideIcon?: boolean
      nameKey?: string
    }
>(
  (
    { className, hideIcon = false, payload, verticalAlign = "bottom", nameKey },
    ref
  ) => {
    const { config } = useChart()

    if (!payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-4",
          verticalAlign === "top" ? "pb-3" : "pt-3",
          className
        )}
      >
        {payload
          .filter((item) => item.type !== "none")
          .map((item) => {
            const key = `${nameKey || item.dataKey || "value"}`
            const itemConfig = getPayloadConfigFromPayload(config, item, key)

            return (
              <div
                key={item.value}
                className={cn(
                  "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
                )}
              >
                {itemConfig?.icon && !hideIcon ? (
                  <itemConfig.icon />
                ) : (
                  <div
                    className="h-2 w-2 shrink-0 rounded-[2px]"
                    style={{
                      backgroundColor: item.color,
                    }}
                  />
                )}
                {itemConfig?.label}
              </div>
            )
          })}
      </div>
    )
  }
)
ChartLegendContent.displayName = "ChartLegend"

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined

  let configLabelKey: string = key

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key as keyof typeof config]
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}

```

---

## `client/src/components/ui/checkbox.tsx`

```tsx
import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("grid place-content-center text-current")}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }

```

---

## `client/src/components/ui/collapsible.tsx`

```tsx
"use client"

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

const Collapsible = CollapsiblePrimitive.Root

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent

export { Collapsible, CollapsibleTrigger, CollapsibleContent }

```

---

## `client/src/components/ui/command.tsx`

```tsx
"use client"

import * as React from "react"
import { type DialogProps } from "@radix-ui/react-dialog"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
      className
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

const CommandDialog = ({ children, ...props }: DialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  </div>
))

CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
))

CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-6 text-center text-sm"
    {...props}
  />
))

CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className
    )}
    {...props}
  />
))

CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      className
    )}
    {...props}
  />
))

CommandItem.displayName = CommandPrimitive.Item.displayName

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
CommandShortcut.displayName = "CommandShortcut"

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}

```

---

## `client/src/components/ui/context-menu.tsx`

```tsx
import * as React from "react"
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const ContextMenu = ContextMenuPrimitive.Root

const ContextMenuTrigger = ContextMenuPrimitive.Trigger

const ContextMenuGroup = ContextMenuPrimitive.Group

const ContextMenuPortal = ContextMenuPrimitive.Portal

const ContextMenuSub = ContextMenuPrimitive.Sub

const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup

const ContextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <ContextMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </ContextMenuPrimitive.SubTrigger>
))
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName

const ContextMenuSubContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-context-menu-content-transform-origin]",
      className
    )}
    {...props}
  />
))
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName

const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Content
      ref={ref}
      className={cn(
        "z-50 max-h-[--radix-context-menu-content-available-height] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-context-menu-content-transform-origin]",
        className
      )}
      {...props}
    />
  </ContextMenuPrimitive.Portal>
))
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName

const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName

const ContextMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <ContextMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.CheckboxItem>
))
ContextMenuCheckboxItem.displayName =
  ContextMenuPrimitive.CheckboxItem.displayName

const ContextMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <ContextMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <Circle className="h-4 w-4 fill-current" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.RadioItem>
))
ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName

const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-sm font-semibold text-foreground",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName

const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
))
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName

const ContextMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
ContextMenuShortcut.displayName = "ContextMenuShortcut"

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
}

```

---

## `client/src/components/ui/dialog.tsx`

```tsx
import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}

```

---

## `client/src/components/ui/drawer.tsx`

```tsx
import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    {...props}
  />
)
Drawer.displayName = "Drawer"

const DrawerTrigger = DrawerPrimitive.Trigger

const DrawerPortal = DrawerPrimitive.Portal

const DrawerClose = DrawerPrimitive.Close

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/80", className)}
    {...props}
  />
))
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
        className
      )}
      {...props}
    >
      <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
))
DrawerContent.displayName = "DrawerContent"

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
    {...props}
  />
)
DrawerHeader.displayName = "DrawerHeader"

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    {...props}
  />
)
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}

```

---

## `client/src/components/ui/dropdown-menu.tsx`

```tsx
"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const DropdownMenu = DropdownMenuPrimitive.Root

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuGroup = DropdownMenuPrimitive.Group

const DropdownMenuPortal = DropdownMenuPrimitive.Portal

const DropdownMenuSub = DropdownMenuPrimitive.Sub

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto" />
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-dropdown-menu-content-transform-origin]",
      className
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-dropdown-menu-content-transform-origin]",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-sm font-semibold",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
      {...props}
    />
  )
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}

```

---

## `client/src/components/ui/empty.tsx`

```tsx
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-6 text-balance rounded-lg border-dashed p-6 text-center md:p-12",
        className
      )}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn(
        "flex max-w-sm flex-col items-center gap-2 text-center",
        className
      )}
      {...props}
    />
  )
}

const emptyMediaVariants = cva(
  "mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function EmptyMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-title"
      className={cn("text-lg font-medium tracking-tight", className)}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        "text-muted-foreground [&>a:hover]:text-primary text-sm/relaxed [&>a]:underline [&>a]:underline-offset-4",
        className
      )}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "flex w-full min-w-0 max-w-sm flex-col items-center gap-4 text-balance text-sm",
        className
      )}
      {...props}
    />
  )
}

export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
}

```

---

## `client/src/components/ui/field.tsx`

```tsx
"use client"

import { useMemo } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        "flex flex-col gap-6",
        "has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
        className
      )}
      {...props}
    />
  )
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "mb-3 font-medium",
        "data-[variant=legend]:text-base",
        "data-[variant=label]:text-sm",
        className
      )}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        "group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4",
        className
      )}
      {...props}
    />
  )
}

const fieldVariants = cva(
  "group/field data-[invalid=true]:text-destructive flex w-full gap-3",
  {
    variants: {
      orientation: {
        vertical: ["flex-col [&>*]:w-full [&>.sr-only]:w-auto"],
        horizontal: [
          "flex-row items-center",
          "[&>[data-slot=field-label]]:flex-auto",
          "has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px has-[>[data-slot=field-content]]:items-start",
        ],
        responsive: [
          "@md/field-group:flex-row @md/field-group:items-center @md/field-group:[&>*]:w-auto flex-col [&>*]:w-full [&>.sr-only]:w-auto",
          "@md/field-group:[&>[data-slot=field-label]]:flex-auto",
          "@md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
        ],
      },
    },
    defaultVariants: {
      orientation: "vertical",
    },
  }
)

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn(
        "group/field-content flex flex-1 flex-col gap-1.5 leading-snug",
        className
      )}
      {...props}
    />
  )
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        "group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50",
        "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>[data-slot=field]]:p-4",
        "has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary dark:has-data-[state=checked]:bg-primary/10",
        className
      )}
      {...props}
    />
  )
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        "flex w-fit items-center gap-2 text-sm font-medium leading-snug group-data-[disabled=true]/field:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "text-muted-foreground text-sm font-normal leading-normal group-has-[[data-orientation=horizontal]]/field:text-balance",
        "nth-last-2:-mt-1 last:mt-0 [[data-variant=legend]+&]:-mt-1.5",
        "[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
        className
      )}
      {...props}
    />
  )
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        "relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2",
        className
      )}
      {...props}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {children && (
        <span
          className="bg-background text-muted-foreground relative mx-auto block w-fit px-2"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  )
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<"div"> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  const content = useMemo(() => {
    if (children) {
      return children
    }

    if (!errors) {
      return null
    }

    if (errors?.length === 1 && errors[0]?.message) {
      return errors[0].message
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {errors.map(
          (error, index) =>
            error?.message && <li key={index}>{error.message}</li>
        )}
      </ul>
    )
  }, [children, errors])

  if (!content) {
    return null
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn("text-destructive text-sm font-normal", className)}
      {...props}
    >
      {content}
    </div>
  )
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
}

```

---

## `client/src/components/ui/form.tsx`

```tsx
import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  if (!itemContext) {
    throw new Error("useFormField should be used within <FormItem>")
  }

  const fieldState = getFieldState(fieldContext.name, formState)

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue | null>(null)

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  )
})
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField()

  return (
    <Label
      ref={ref}
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
})
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
})
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-[0.8rem] text-muted-foreground", className)}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message ?? "") : children

  if (!body) {
    return null
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-[0.8rem] font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  )
})
FormMessage.displayName = "FormMessage"

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}

```

---

## `client/src/components/ui/hover-card.tsx`

```tsx
import * as React from "react"
import * as HoverCardPrimitive from "@radix-ui/react-hover-card"

import { cn } from "@/lib/utils"

const HoverCard = HoverCardPrimitive.Root

const HoverCardTrigger = HoverCardPrimitive.Trigger

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <HoverCardPrimitive.Content
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    className={cn(
      "z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-hover-card-content-transform-origin]",
      className
    )}
    {...props}
  />
))
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName

export { HoverCard, HoverCardTrigger, HoverCardContent }

```

---

## `client/src/components/ui/input-group.tsx`

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "group/input-group border-input dark:bg-input/30 shadow-xs relative flex w-full items-center rounded-md border outline-none transition-[color,box-shadow]",
        "h-9 has-[>textarea]:h-auto",

        // Variants based on alignment.
        "has-[>[data-align=inline-start]]:[&>input]:pl-2",
        "has-[>[data-align=inline-end]]:[&>input]:pr-2",
        "has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3",
        "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3",

        // Focus state.
        "has-[[data-slot=input-group-control]:focus-visible]:ring-ring has-[[data-slot=input-group-control]:focus-visible]:ring-1",

        // Error state.
        "has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[[data-slot][aria-invalid=true]]:border-destructive dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40",

        className
      )}
      {...props}
    />
  )
}

const inputGroupAddonVariants = cva(
  "text-muted-foreground flex h-auto cursor-text select-none items-center justify-center gap-2 py-1.5 text-sm font-medium group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start":
          "order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]",
        "inline-end":
          "order-last pr-3 has-[>button]:mr-[-0.4rem] has-[>kbd]:mr-[-0.35rem]",
        "block-start":
          "[.border-b]:pb-3 order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5",
        "block-end":
          "[.border-t]:pt-3 order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  }
)

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return
        }
        e.currentTarget.parentElement?.querySelector("input")?.focus()
      }}
      {...props}
    />
  )
}

const inputGroupButtonVariants = cva(
  "flex items-center gap-2 text-sm shadow-none",
  {
    variants: {
      size: {
        xs: "h-6 gap-1 rounded-[calc(var(--radius)-5px)] px-2 has-[>svg]:px-2 [&>svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2.5",
        "icon-xs":
          "size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0",
        "icon-sm": "size-8 p-0 has-[>svg]:p-0",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  }
)

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size"> &
  VariantProps<typeof inputGroupButtonVariants>) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "text-muted-foreground flex items-center gap-2 text-sm [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none",
        className
      )}
      {...props}
    />
  )
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        "flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        "flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 dark:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
}

```

---

## `client/src/components/ui/input-otp.tsx`

```tsx
import * as React from "react"
import { OTPInput, OTPInputContext } from "input-otp"
import { Minus } from "lucide-react"

import { cn } from "@/lib/utils"

const InputOTP = React.forwardRef<
  React.ElementRef<typeof OTPInput>,
  React.ComponentPropsWithoutRef<typeof OTPInput>
>(({ className, containerClassName, ...props }, ref) => (
  <OTPInput
    ref={ref}
    containerClassName={cn(
      "flex items-center gap-2 has-[:disabled]:opacity-50",
      containerClassName
    )}
    className={cn("disabled:cursor-not-allowed", className)}
    {...props}
  />
))
InputOTP.displayName = "InputOTP"

const InputOTPGroup = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center", className)} {...props} />
))
InputOTPGroup.displayName = "InputOTPGroup"

const InputOTPSlot = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & { index: number }
>(({ index, className, ...props }, ref) => {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index]

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
        isActive && "z-10 ring-1 ring-ring",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  )
})
InputOTPSlot.displayName = "InputOTPSlot"

const InputOTPSeparator = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ ...props }, ref) => (
  <div ref={ref} role="separator" {...props}>
    <Minus />
  </div>
))
InputOTPSeparator.displayName = "InputOTPSeparator"

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }

```

---

## `client/src/components/ui/input.tsx`

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

```

---

## `client/src/components/ui/item.tsx`

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

function ItemGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="list"
      data-slot="item-group"
      className={cn("group/item-group flex flex-col", className)}
      {...props}
    />
  )
}

function ItemSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="item-separator"
      orientation="horizontal"
      className={cn("my-0", className)}
      {...props}
    />
  )
}

const itemVariants = cva(
  "group/item [a]:hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-ring/50 [a]:transition-colors flex flex-wrap items-center rounded-md border border-transparent text-sm outline-none transition-colors duration-100 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border-border",
        muted: "bg-muted/50",
      },
      size: {
        default: "gap-4 p-4 ",
        sm: "gap-2.5 px-4 py-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Item({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof itemVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "div"
  return (
    <Comp
      data-slot="item"
      data-variant={variant}
      data-size={size}
      className={cn(itemVariants({ variant, size, className }))}
      {...props}
    />
  )
}

const itemMediaVariants = cva(
  "flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:translate-y-0.5 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "bg-muted size-8 rounded-sm border [&_svg:not([class*='size-'])]:size-4",
        image:
          "size-10 overflow-hidden rounded-sm [&_img]:size-full [&_img]:object-cover",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function ItemMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof itemMediaVariants>) {
  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      className={cn(itemMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-content"
      className={cn(
        "flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none",
        className
      )}
      {...props}
    />
  )
}

function ItemTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-title"
      className={cn(
        "flex w-fit items-center gap-2 text-sm font-medium leading-snug",
        className
      )}
      {...props}
    />
  )
}

function ItemDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="item-description"
      className={cn(
        "text-muted-foreground line-clamp-2 text-balance text-sm font-normal leading-normal",
        "[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
        className
      )}
      {...props}
    />
  )
}

function ItemActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-actions"
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  )
}

function ItemHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-header"
      className={cn(
        "flex basis-full items-center justify-between gap-2",
        className
      )}
      {...props}
    />
  )
}

function ItemFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-footer"
      className={cn(
        "flex basis-full items-center justify-between gap-2",
        className
      )}
      {...props}
    />
  )
}

export {
  Item,
  ItemMedia,
  ItemContent,
  ItemActions,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
  ItemDescription,
  ItemHeader,
  ItemFooter,
}

```

---

## `client/src/components/ui/kbd.tsx`

```tsx
import { cn } from "@/lib/utils"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "bg-muted text-muted-foreground pointer-events-none inline-flex h-5 w-fit min-w-5 select-none items-center justify-center gap-1 rounded-sm px-1 font-sans text-xs font-medium",
        "[&_svg:not([class*='size-'])]:size-3",
        "[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10",
        className
      )}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }

```

---

## `client/src/components/ui/label.tsx`

```tsx
"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }

```

---

## `client/src/components/ui/menubar.tsx`

```tsx
import * as React from "react"
import * as MenubarPrimitive from "@radix-ui/react-menubar"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

function MenubarMenu({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Menu>) {
  return <MenubarPrimitive.Menu {...props} />
}

function MenubarGroup({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Group>) {
  return <MenubarPrimitive.Group {...props} />
}

function MenubarPortal({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Portal>) {
  return <MenubarPrimitive.Portal {...props} />
}

function MenubarRadioGroup({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.RadioGroup>) {
  return <MenubarPrimitive.RadioGroup {...props} />
}

function MenubarSub({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Sub>) {
  return <MenubarPrimitive.Sub data-slot="menubar-sub" {...props} />
}

const Menubar = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Root
    ref={ref}
    className={cn(
      "flex h-9 items-center space-x-1 rounded-md border bg-background p-1 shadow-sm",
      className
    )}
    {...props}
  />
))
Menubar.displayName = MenubarPrimitive.Root.displayName

const MenubarTrigger = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-3 py-1 text-sm font-medium outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
      className
    )}
    {...props}
  />
))
MenubarTrigger.displayName = MenubarPrimitive.Trigger.displayName

const MenubarSubTrigger = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <MenubarPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </MenubarPrimitive.SubTrigger>
))
MenubarSubTrigger.displayName = MenubarPrimitive.SubTrigger.displayName

const MenubarSubContent = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-menubar-content-transform-origin]",
      className
    )}
    {...props}
  />
))
MenubarSubContent.displayName = MenubarPrimitive.SubContent.displayName

const MenubarContent = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Content>
>(
  (
    { className, align = "start", alignOffset = -4, sideOffset = 8, ...props },
    ref
  ) => (
    <MenubarPrimitive.Portal>
      <MenubarPrimitive.Content
        ref={ref}
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-menubar-content-transform-origin]",
          className
        )}
        {...props}
      />
    </MenubarPrimitive.Portal>
  )
)
MenubarContent.displayName = MenubarPrimitive.Content.displayName

const MenubarItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <MenubarPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
MenubarItem.displayName = MenubarPrimitive.Item.displayName

const MenubarCheckboxItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <MenubarPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenubarPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.CheckboxItem>
))
MenubarCheckboxItem.displayName = MenubarPrimitive.CheckboxItem.displayName

const MenubarRadioItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <MenubarPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenubarPrimitive.ItemIndicator>
        <Circle className="h-4 w-4 fill-current" />
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.RadioItem>
))
MenubarRadioItem.displayName = MenubarPrimitive.RadioItem.displayName

const MenubarLabel = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <MenubarPrimitive.Label
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-sm font-semibold",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
MenubarLabel.displayName = MenubarPrimitive.Label.displayName

const MenubarSeparator = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
MenubarSeparator.displayName = MenubarPrimitive.Separator.displayName

const MenubarShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
MenubarShortcut.displayname = "MenubarShortcut"

export {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarPortal,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarGroup,
  MenubarSub,
  MenubarShortcut,
}

```

---

## `client/src/components/ui/navigation-menu.tsx`

```tsx
import * as React from "react"
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu"
import { cva } from "class-variance-authority"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Root
    ref={ref}
    className={cn(
      "relative z-10 flex max-w-max flex-1 items-center justify-center",
      className
    )}
    {...props}
  >
    {children}
    <NavigationMenuViewport />
  </NavigationMenuPrimitive.Root>
))
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName

const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.List
    ref={ref}
    className={cn(
      "group flex flex-1 list-none items-center justify-center space-x-1",
      className
    )}
    {...props}
  />
))
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName

const NavigationMenuItem = NavigationMenuPrimitive.Item

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=open]:text-accent-foreground data-[state=open]:bg-accent/50 data-[state=open]:hover:bg-accent data-[state=open]:focus:bg-accent"
)

const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger
    ref={ref}
    className={cn(navigationMenuTriggerStyle(), "group", className)}
    {...props}
  >
    {children}{" "}
    <ChevronDown
      className="relative top-[1px] ml-1 h-3 w-3 transition duration-300 group-data-[state=open]:rotate-180"
      aria-hidden="true"
    />
  </NavigationMenuPrimitive.Trigger>
))
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName

const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Content
    ref={ref}
    className={cn(
      "left-0 top-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 md:absolute md:w-auto ",
      className
    )}
    {...props}
  />
))
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName

const NavigationMenuLink = NavigationMenuPrimitive.Link

const NavigationMenuViewport = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <div className={cn("absolute left-0 top-full flex justify-center")}>
    <NavigationMenuPrimitive.Viewport
      className={cn(
        "origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 md:w-[var(--radix-navigation-menu-viewport-width)]",
        className
      )}
      ref={ref}
      {...props}
    />
  </div>
))
NavigationMenuViewport.displayName =
  NavigationMenuPrimitive.Viewport.displayName

const NavigationMenuIndicator = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Indicator>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Indicator
    ref={ref}
    className={cn(
      "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in",
      className
    )}
    {...props}
  >
    <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
  </NavigationMenuPrimitive.Indicator>
))
NavigationMenuIndicator.displayName =
  NavigationMenuPrimitive.Indicator.displayName

export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
}

```

---

## `client/src/components/ui/pagination.tsx`

```tsx
import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { ButtonProps, buttonVariants } from "@/components/ui/button"

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
)
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"a">

const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? "outline" : "ghost",
        size,
      }),
      className
    )}
    {...props}
  />
)
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    className={cn("gap-1 pl-2.5", className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
)
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    className={cn("gap-1 pr-2.5", className)}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
)
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}

```

---

## `client/src/components/ui/popover.tsx`

```tsx
import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-popover-content-transform-origin]",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }

```

---

## `client/src/components/ui/progress.tsx`

```tsx
"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }

```

---

## `client/src/components/ui/radio-group.tsx`

```tsx
import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-2", className)}
      {...props}
      ref={ref}
    />
  )
})
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="h-3.5 w-3.5 fill-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
})
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

export { RadioGroup, RadioGroupItem }

```

---

## `client/src/components/ui/resizable.tsx`

```tsx
"use client"

import { GripVertical } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
)

const ResizablePanel = ResizablePrimitive.Panel

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }

```

---

## `client/src/components/ui/scroll-area.tsx`

```tsx
import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }

```

---

## `client/src/components/ui/select.tsx`

```tsx
"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-[--radix-select-content-available-height] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-select-content-transform-origin]",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}

```

---

## `client/src/components/ui/separator.tsx`

```tsx
import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"

import { cn } from "@/lib/utils"

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  )
)
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }

```

---

## `client/src/components/ui/sheet.tsx`

```tsx
"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Sheet = SheetPrimitive.Root

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
      {children}
    </SheetPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}

```

---

## `client/src/components/ui/sidebar.tsx`

```tsx
"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, VariantProps } from "class-variance-authority"
import { PanelLeftIcon } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

type SidebarContextProps = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)

  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  const [_open, _setOpen] = React.useState(defaultOpen)
  const open = openProp ?? _open
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value
      if (setOpenProp) {
        setOpenProp(openState)
      } else {
        _setOpen(openState)
      }

      // This sets the cookie to keep the sidebar state.
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
    },
    [setOpenProp, open]
  )

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open)
  }, [isMobile, setOpen, setOpenMobile])

  // Adds a keyboard shortcut to toggle the sidebar.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault()
        toggleSidebar()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleSidebar])

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? "expanded" : "collapsed"

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          data-slot="sidebar-wrapper"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties
          }
          className={cn(
            "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  )
}

function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right"
  variant?: "sidebar" | "floating" | "inset"
  collapsible?: "offcanvas" | "icon" | "none"
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          "bg-sidebar text-sidebar-foreground flex h-full w-[var(--sidebar-width)] flex-col",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className="bg-sidebar text-sidebar-foreground w-[var(--sidebar-width)] p-0 [&>button]:hidden"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          side={side}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      className="group peer text-sidebar-foreground hidden md:block"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      {/* This is what handles the sidebar gap on desktop */}
      <div
        data-slot="sidebar-gap"
        className={cn(
          "relative w-[var(--sidebar-width)] bg-transparent transition-[width] duration-200 ease-linear",
          "group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180",
          variant === "floating" || variant === "inset"
            ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+var(--spacing-4))]"
            : "group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)]"
        )}
      />
      <div
        data-slot="sidebar-container"
        className={cn(
          "fixed inset-y-0 z-10 hidden h-svh w-[var(--sidebar-width)] transition-[left,right,width] duration-200 ease-linear md:flex",
          side === "left"
            ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
            : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
          // Adjust the padding for floating and inset variants.
          variant === "floating" || variant === "inset"
            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+var(--spacing-4)+2px)]"
            : "group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)] group-data-[side=left]:border-r group-data-[side=right]:border-l",
          className
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
        >
          {children}
        </div>
      </div>
    </div>
  )
}

function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar()

  // Note: Tailwind v3.4 doesn't support "in-" selectors. So the rail won't work perfectly.
  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        "hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] sm:flex",
        "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className
      )}
      {...props}
    />
  )
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        "bg-background relative flex w-full flex-1 flex-col",
        "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2",
        className
      )}
      {...props}
    />
  )
}

function SidebarInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn("bg-background h-8 w-full shadow-none", className)}
      {...props}
    />
  )
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
}

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn("bg-sidebar-border mx-2 w-auto", className)}
      {...props}
    />
  )
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className
      )}
      {...props}
    />
  )
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  )
}

function SidebarGroupLabel({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "div"

  return (
    <Comp
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      className={cn(
        "text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className
      )}
      {...props}
    />
  )
}

function SidebarGroupAction({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      className={cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 md:after:hidden",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  )
}

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn("w-full text-sm", className)}
      {...props}
    />
  )
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  )
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  )
}

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:w-8! group-data-[collapsible=icon]:h-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
  isActive?: boolean
  tooltip?: string | React.ComponentProps<typeof TooltipContent>
} & VariantProps<typeof sidebarMenuButtonVariants>) {
  const Comp = asChild ? Slot : "button"
  const { isMobile, state } = useSidebar()

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  )

  if (!tooltip) {
    return button
  }

  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== "collapsed" || isMobile}
        {...tooltip}
      />
    </Tooltip>
  )
}

function SidebarMenuAction({
  className,
  asChild = false,
  showOnHover = false,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
  showOnHover?: boolean
}) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="sidebar-menu-action"
      data-sidebar="menu-action"
      className={cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 md:after:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover &&
          "peer-data-[active=true]/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 md:opacity-0",
        className
      )}
      {...props}
    />
  )
}

function SidebarMenuBadge({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        "text-sidebar-foreground pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums select-none",
        "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  )
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<"div"> & {
  showIcon?: boolean
}) {
  // Random width between 50 to 90%.
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`
  }, [])

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-md"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 max-w-[var(--skeleton-width)] flex-1"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  )
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(
        "border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  )
}

function SidebarMenuSubItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn("group/menu-sub-item relative", className)}
      {...props}
    />
  )
}

function SidebarMenuSubButton({
  asChild = false,
  size = "md",
  isActive = false,
  className,
  ...props
}: React.ComponentProps<"a"> & {
  asChild?: boolean
  size?: "sm" | "md"
  isActive?: boolean
}) {
  const Comp = asChild ? Slot : "a"

  return (
    <Comp
      data-slot="sidebar-menu-sub-button"
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 outline outline-2 outline-transparent outline-offset-2 focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  )
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
}

```

---

## `client/src/components/ui/skeleton.tsx`

```tsx
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props}
    />
  )
}

export { Skeleton }

```

---

## `client/src/components/ui/slider.tsx`

```tsx
import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }

```

---

## `client/src/components/ui/sonner.tsx`

```tsx
"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

```

---

## `client/src/components/ui/spinner.tsx`

```tsx
import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }

```

---

## `client/src/components/ui/switch.tsx`

```tsx
import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }

```

---

## `client/src/components/ui/table.tsx`

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}

```

---

## `client/src/components/ui/tabs.tsx`

```tsx
import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }

```

---

## `client/src/components/ui/textarea.tsx`

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }

```

---

## `client/src/components/ui/toaster.tsx`

```tsx
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

```

---

## `client/src/components/ui/toast.tsx`

```tsx
import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}

```

---

## `client/src/components/ui/toggle-group.tsx`

```tsx
"use client"

import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { toggleVariants } from "@/components/ui/toggle"

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({
  size: "default",
  variant: "default",
})

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn("flex items-center justify-center gap-1", className)}
    {...props}
  >
    <ToggleGroupContext.Provider value={{ variant, size }}>
      {children}
    </ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>
))

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
    VariantProps<typeof toggleVariants>
>(({ className, children, variant, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext)

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
})

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName

export { ToggleGroup, ToggleGroupItem }

```

---

## `client/src/components/ui/toggle.tsx`

```tsx
import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-2 min-w-9",
        sm: "h-8 px-1.5 min-w-8",
        lg: "h-10 px-2.5 min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
))

Toggle.displayName = TogglePrimitive.Root.displayName

export { Toggle, toggleVariants }

```

---

## `client/src/components/ui/tooltip.tsx`

```tsx
"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-tooltip-content-transform-origin]",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }

```

---

