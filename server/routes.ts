import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertTripSchema, insertSavedPlaceSchema, insertVehicleTypeSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Health Check ──
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
        { username: "jane", password: "demo", fullName: "Jane Dlamini", phone: "071 234 5678", role: "rider" as const, rating: 4.8, totalTrips: 23, avatarUrl: null },
        { username: "thabo", password: "demo", fullName: "Thabo Mabaso", phone: "072 345 6789", role: "rider" as const, rating: 4.9, totalTrips: 45, avatarUrl: null },
        { username: "lindiwe", password: "demo", fullName: "Lindiwe Nkosi", phone: "073 456 7890", role: "rider" as const, rating: 4.7, totalTrips: 12, avatarUrl: null },
      ];

      const drivers = [
        { username: "sipho", password: "demo", fullName: "Sipho Maluleke", phone: "074 567 8901", role: "driver" as const, rating: 4.9, totalTrips: 1240, isOnline: true, vehicleMake: "Toyota", vehicleModel: "Etios", vehicleColor: "White", licensePlate: "LGP 123 L", earnings: 45200, avatarUrl: null },
        { username: "grace", password: "demo", fullName: "Grace Chauke", phone: "075 678 9012", role: "driver" as const, rating: 4.8, totalTrips: 890, isOnline: true, vehicleMake: "Volkswagen", vehicleModel: "Polo Vivo", vehicleColor: "Silver", licensePlate: "LGP 456 L", earnings: 32100, avatarUrl: null },
        { username: "mandla", password: "demo", fullName: "Mandla Baloyi", phone: "076 789 0123", role: "driver" as const, rating: 4.7, totalTrips: 560, isOnline: false, vehicleMake: "Hyundai", vehicleModel: "Grand i10", vehicleColor: "Red", licensePlate: "LGP 789 L", earnings: 21500, avatarUrl: null },
        { username: "nomsa", password: "demo", fullName: "Nomsa Rikhotso", phone: "077 890 1234", role: "driver" as const, rating: 4.6, totalTrips: 320, isOnline: true, vehicleMake: "Toyota", vehicleModel: "Avanza", vehicleColor: "Grey", licensePlate: "LGP 321 L", earnings: 15800, avatarUrl: null },
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
      ];
      for (const v of vTypes) {
        await storage.createVehicleType(v);
      }

      await storage.createSavedPlace({ userId: createdRiders[0].id, name: "Home", address: "Section A, Giyani", lat: -23.31, lng: 30.72, icon: "home" });
      await storage.createSavedPlace({ userId: createdRiders[0].id, name: "Work", address: "Giyani CBD", lat: -23.32, lng: 30.71, icon: "briefcase" });
      await storage.createSavedPlace({ userId: createdRiders[0].id, name: "Masingita Mall", address: "Main Road, Giyani", lat: -23.30, lng: 30.73, icon: "shopping-bag" });

      const demoTrips = [
        { riderId: createdRiders[0].id, driverId: createdDrivers[0].id, pickupName: "Masingita Mall", dropoffName: "Section A", fare: 45, distance: 3.8, duration: 12, status: "completed" as const, paymentMethod: "cash" as const, vehicleType: "GY Standard", rating: 5 },
        { riderId: createdRiders[0].id, driverId: createdDrivers[1].id, pickupName: "Section A", dropoffName: "Giyani CBD", fare: 35, distance: 2.5, duration: 8, status: "completed" as const, paymentMethod: "cash" as const, vehicleType: "GY Standard", rating: 4 },
        { riderId: createdRiders[1].id, driverId: createdDrivers[0].id, pickupName: "Section B", dropoffName: "Masingita Mall", fare: 50, distance: 4.2, duration: 15, status: "completed" as const, paymentMethod: "cash" as const, vehicleType: "GY Standard", rating: 5 },
        { riderId: createdRiders[1].id, driverId: createdDrivers[2].id, pickupName: "Giyani Hospital", dropoffName: "Section C", fare: 40, distance: 3.0, duration: 10, status: "completed" as const, paymentMethod: "cash" as const, vehicleType: "GY Standard", rating: 4 },
        { riderId: createdRiders[2].id, driverId: createdDrivers[1].id, pickupName: "Section D", dropoffName: "Giyani Plaza", fare: 55, distance: 5.0, duration: 18, status: "completed" as const, paymentMethod: "cash" as const, vehicleType: "GY Premium", rating: 5 },
        { riderId: createdRiders[0].id, driverId: createdDrivers[3].id, pickupName: "Section A", dropoffName: "Section B", fare: 30, distance: 2.0, duration: 7, status: "completed" as const, paymentMethod: "cash" as const, vehicleType: "GY Standard", rating: 4 },
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
