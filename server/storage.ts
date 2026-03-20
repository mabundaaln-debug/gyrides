import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users, trips, savedPlaces, vehicleTypes, taxiRoutes, messages, sosAlerts, passwordResetRequests, webauthnCredentials, vehicleInspections, driverReimbursements,
  type User, type InsertUser,
  type Trip, type InsertTrip,
  type SavedPlace, type InsertSavedPlace,
  type VehicleType, type InsertVehicleType,
  type TaxiRoute, type InsertTaxiRoute,
  type Message, type InsertMessage,
  type SosAlert, type InsertSosAlert,
  type PasswordResetRequest, type InsertPasswordResetRequest,
  type WebauthnCredential, type InsertWebauthnCredential,
  type VehicleInspection, type InsertVehicleInspection,
  type DriverReimbursement, type InsertDriverReimbursement,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
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

  getMessagesByTrip(tripId: string): Promise<Message[]>;
  createMessage(msg: InsertMessage): Promise<Message>;

  createSosAlert(alert: InsertSosAlert): Promise<SosAlert>;
  getSosAlerts(): Promise<SosAlert[]>;
  getActiveSosAlerts(): Promise<SosAlert[]>;
  updateSosAlert(id: string, data: Partial<InsertSosAlert & { resolvedAt: Date }>): Promise<SosAlert | undefined>;

  getUserByPhone(phone: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  createPasswordResetRequest(req: InsertPasswordResetRequest): Promise<PasswordResetRequest>;
  getPasswordResetRequests(): Promise<PasswordResetRequest[]>;
  getPendingPasswordResetRequests(): Promise<PasswordResetRequest[]>;
  updatePasswordResetRequest(id: string, data: Partial<InsertPasswordResetRequest & { resolvedAt: Date }>): Promise<PasswordResetRequest | undefined>;

  createWebauthnCredential(cred: InsertWebauthnCredential): Promise<WebauthnCredential>;
  getWebauthnCredentialsByUser(userId: string): Promise<WebauthnCredential[]>;
  getWebauthnCredentialByCredentialId(credentialId: string): Promise<WebauthnCredential | undefined>;
  updateWebauthnCredentialCounter(id: string, counter: number): Promise<void>;
  deleteWebauthnCredential(id: string): Promise<void>;

  getStats(): Promise<{ totalDrivers: number; totalRiders: number; totalTrips: number; totalRevenue: number; onlineDrivers: number; activeTrips: number; activeSosAlerts: number }>;

  createInspection(data: InsertVehicleInspection): Promise<VehicleInspection>;
  getInspectionsByDriver(driverId: string): Promise<VehicleInspection[]>;
  getLatestInspection(driverId: string): Promise<VehicleInspection | undefined>;
  getOnlineDriversByCategory(category?: string): Promise<User[]>;

  createReimbursement(data: InsertDriverReimbursement): Promise<DriverReimbursement>;
  getReimbursements(): Promise<DriverReimbursement[]>;
  getReimbursementsByDriver(driverId: string): Promise<DriverReimbursement[]>;
  updateReimbursement(id: string, data: Partial<DriverReimbursement>): Promise<DriverReimbursement | undefined>;
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

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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
    // Always set timestamps as proper Date objects on the server — never trust string values from clients
    if (data.status === "in_progress") {
      updateData.startedAt = new Date();
    }
    if (data.status === "completed") {
      updateData.completedAt = new Date();
    }
    // Convert any string timestamps that slipped through to Date objects
    if (updateData.startedAt && typeof updateData.startedAt === "string") {
      updateData.startedAt = new Date(updateData.startedAt);
    }
    if (updateData.completedAt && typeof updateData.completedAt === "string") {
      updateData.completedAt = new Date(updateData.completedAt);
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

  async getMessagesByTrip(tripId: string): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.tripId, tripId)).orderBy(messages.createdAt);
  }

  async createMessage(msg: InsertMessage): Promise<Message> {
    const [m] = await db.insert(messages).values(msg).returning();
    return m;
  }

  async createSosAlert(alert: InsertSosAlert): Promise<SosAlert> {
    const [a] = await db.insert(sosAlerts).values(alert).returning();
    return a;
  }

  async getSosAlerts(): Promise<SosAlert[]> {
    return db.select().from(sosAlerts).orderBy(desc(sosAlerts.createdAt));
  }

  async getActiveSosAlerts(): Promise<SosAlert[]> {
    return db.select().from(sosAlerts).where(sql`${sosAlerts.status} IN ('active', 'acknowledged')`).orderBy(desc(sosAlerts.createdAt));
  }

  async updateSosAlert(id: string, data: Partial<InsertSosAlert & { resolvedAt: Date }>): Promise<SosAlert | undefined> {
    const [a] = await db.update(sosAlerts).set(data).where(eq(sosAlerts.id, id)).returning();
    return a;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createPasswordResetRequest(req: InsertPasswordResetRequest): Promise<PasswordResetRequest> {
    const [r] = await db.insert(passwordResetRequests).values(req).returning();
    return r;
  }

  async getPasswordResetRequests(): Promise<PasswordResetRequest[]> {
    return db.select().from(passwordResetRequests).orderBy(desc(passwordResetRequests.createdAt));
  }

  async getPendingPasswordResetRequests(): Promise<PasswordResetRequest[]> {
    return db.select().from(passwordResetRequests).where(eq(passwordResetRequests.status, "pending")).orderBy(desc(passwordResetRequests.createdAt));
  }

  async updatePasswordResetRequest(id: string, data: Partial<InsertPasswordResetRequest & { resolvedAt: Date }>): Promise<PasswordResetRequest | undefined> {
    const [r] = await db.update(passwordResetRequests).set(data).where(eq(passwordResetRequests.id, id)).returning();
    return r;
  }

  async createWebauthnCredential(cred: InsertWebauthnCredential): Promise<WebauthnCredential> {
    const [c] = await db.insert(webauthnCredentials).values(cred).returning();
    return c;
  }

  async getWebauthnCredentialsByUser(userId: string): Promise<WebauthnCredential[]> {
    return db.select().from(webauthnCredentials).where(eq(webauthnCredentials.userId, userId));
  }

  async getWebauthnCredentialByCredentialId(credentialId: string): Promise<WebauthnCredential | undefined> {
    const [c] = await db.select().from(webauthnCredentials).where(eq(webauthnCredentials.credentialId, credentialId));
    return c;
  }

  async updateWebauthnCredentialCounter(id: string, counter: number): Promise<void> {
    await db.update(webauthnCredentials).set({ counter }).where(eq(webauthnCredentials.id, id));
  }

  async deleteWebauthnCredential(id: string): Promise<void> {
    await db.delete(webauthnCredentials).where(eq(webauthnCredentials.id, id));
  }

  async getStats() {
    const [driverCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.role, "driver"));
    const [riderCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.role, "rider"));
    const [tripCount] = await db.select({ count: sql<number>`count(*)::int` }).from(trips);
    const [revenue] = await db.select({ total: sql<number>`coalesce(sum(${trips.fare}), 0)::real` }).from(trips).where(eq(trips.status, "completed"));
    const [onlineCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(and(eq(users.role, "driver"), eq(users.isOnline, true)));
    const activeTrips = await this.getActiveTrips();
    const activeSos = await this.getActiveSosAlerts();

    return {
      totalDrivers: driverCount.count,
      totalRiders: riderCount.count,
      totalTrips: tripCount.count,
      totalRevenue: revenue.total,
      onlineDrivers: onlineCount.count,
      activeTrips: activeTrips.length,
      activeSosAlerts: activeSos.length,
    };
  }

  async createInspection(data: InsertVehicleInspection): Promise<VehicleInspection> {
    const [insp] = await db.insert(vehicleInspections).values(data).returning();
    return insp;
  }

  async getInspectionsByDriver(driverId: string): Promise<VehicleInspection[]> {
    return db.select().from(vehicleInspections).where(eq(vehicleInspections.driverId, driverId)).orderBy(desc(vehicleInspections.inspectedAt));
  }

  async getLatestInspection(driverId: string): Promise<VehicleInspection | undefined> {
    const [insp] = await db.select().from(vehicleInspections).where(eq(vehicleInspections.driverId, driverId)).orderBy(desc(vehicleInspections.inspectedAt)).limit(1);
    return insp;
  }

  async getOnlineDriversByCategory(category?: string): Promise<User[]> {
    const base = and(eq(users.role, "driver"), eq(users.isOnline, true), eq(users.approvalStatus, "approved"));
    if (!category || category === "standard") {
      return db.select().from(users).where(base);
    }
    if (category === "xl") {
      return db.select().from(users).where(and(base, eq(users.vehicleCategory, "xl")));
    }
    if (category === "premium") {
      return db.select().from(users).where(and(base, sql`${users.vehicleCategory} IN ('premium','xl')`));
    }
    return db.select().from(users).where(base);
  }

  async createReimbursement(data: InsertDriverReimbursement): Promise<DriverReimbursement> {
    const [r] = await db.insert(driverReimbursements).values(data).returning();
    return r;
  }

  async getReimbursements(): Promise<DriverReimbursement[]> {
    return db.select().from(driverReimbursements).orderBy(desc(driverReimbursements.createdAt));
  }

  async getReimbursementsByDriver(driverId: string): Promise<DriverReimbursement[]> {
    return db.select().from(driverReimbursements).where(eq(driverReimbursements.driverId, driverId)).orderBy(desc(driverReimbursements.createdAt));
  }

  async updateReimbursement(id: string, data: Partial<DriverReimbursement>): Promise<DriverReimbursement | undefined> {
    const [r] = await db.update(driverReimbursements).set(data as any).where(eq(driverReimbursements.id, id)).returning();
    return r;
  }
}

export const storage = new DatabaseStorage();
