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
  bookingChannel: text("booking_channel").default("app"),
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
  pricePerMin: real("price_per_min").notNull().default(1.5),
  minimumFare: real("minimum_fare").notNull().default(25),
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

export const sosStatusEnum = pgEnum("sos_status", ["active", "acknowledged", "resolved"]);

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull().references(() => trips.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  senderRole: userRoleEnum("sender_role").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sosAlerts = pgTable("sos_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").references(() => trips.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  userRole: userRoleEnum("user_role").notNull(),
  lat: real("lat"),
  lng: real("lng"),
  status: sosStatusEnum("status").notNull().default("active"),
  adminNotes: text("admin_notes"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const webauthnCredentials = pgTable("webauthn_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  deviceName: text("device_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWebauthnCredentialSchema = createInsertSchema(webauthnCredentials).omit({ id: true, createdAt: true });
export type InsertWebauthnCredential = z.infer<typeof insertWebauthnCredentialSchema>;
export type WebauthnCredential = typeof webauthnCredentials.$inferSelect;

export const resetRequestStatusEnum = pgEnum("reset_request_status", ["pending", "approved", "rejected"]);

export const passwordResetRequests = pgTable("password_reset_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  username: text("username").notNull(),
  phone: text("phone").notNull(),
  status: resetRequestStatusEnum("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertPasswordResetRequestSchema = createInsertSchema(passwordResetRequests).omit({ id: true, createdAt: true, resolvedAt: true });
export type InsertPasswordResetRequest = z.infer<typeof insertPasswordResetRequestSchema>;
export type PasswordResetRequest = typeof passwordResetRequests.$inferSelect;

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertTripSchema = createInsertSchema(trips).omit({ id: true, createdAt: true, completedAt: true });
export const insertSavedPlaceSchema = createInsertSchema(savedPlaces).omit({ id: true });
export const insertVehicleTypeSchema = createInsertSchema(vehicleTypes).omit({ id: true });
export const insertTaxiRouteSchema = createInsertSchema(taxiRoutes).omit({ id: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertSosAlertSchema = createInsertSchema(sosAlerts).omit({ id: true, createdAt: true, resolvedAt: true });

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
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertSosAlert = z.infer<typeof insertSosAlertSchema>;
export type SosAlert = typeof sosAlerts.$inferSelect;
