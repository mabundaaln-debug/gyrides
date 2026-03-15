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
