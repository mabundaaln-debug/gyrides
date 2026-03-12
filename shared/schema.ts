import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["rider", "driver", "admin"]);
export const tripStatusEnum = pgEnum("trip_status", ["requested", "accepted", "arriving", "in_progress", "completed", "cancelled"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "card", "ewallet"]);

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
  licensePlate: text("license_plate"),
  earnings: real("earnings").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trips = pgTable("trips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riderId: varchar("rider_id").notNull().references(() => users.id),
  driverId: varchar("driver_id").references(() => users.id),
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

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertTripSchema = createInsertSchema(trips).omit({ id: true, createdAt: true, completedAt: true });
export const insertSavedPlaceSchema = createInsertSchema(savedPlaces).omit({ id: true });
export const insertVehicleTypeSchema = createInsertSchema(vehicleTypes).omit({ id: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof trips.$inferSelect;
export type InsertSavedPlace = z.infer<typeof insertSavedPlaceSchema>;
export type SavedPlace = typeof savedPlaces.$inferSelect;
export type InsertVehicleType = z.infer<typeof insertVehicleTypeSchema>;
export type VehicleType = typeof vehicleTypes.$inferSelect;
