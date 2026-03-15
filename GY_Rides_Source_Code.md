# GY Rides — Complete Source Code

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

