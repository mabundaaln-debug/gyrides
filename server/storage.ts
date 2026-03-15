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
