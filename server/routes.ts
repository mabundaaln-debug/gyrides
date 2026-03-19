import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertTripSchema, insertSavedPlaceSchema, insertVehicleTypeSchema, insertTaxiRouteSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

const docUploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `doc_${crypto.randomUUID()}${ext}`);
  },
});

const docUpload = multer({
  storage: docUploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|pdf)$/i;
    if (allowed.test(path.extname(file.originalname)) || file.mimetype === "application/pdf" || file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image or PDF files are allowed"));
    }
  },
});

const webauthnChallenges = new Map<string, string>();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  app.get("/api/config/maps", (_req, res) => {
    res.json({ apiKey: process.env.GOOGLE_MAPS_API_KEY || "" });
  });

  app.get("/api/config/google", (_req, res) => {
    res.json({ clientId: process.env.GOOGLE_CLIENT_ID || "" });
  });

  app.get("/api/route-info", async (req, res) => {
    const { originLat, originLng, destLat, destLng } = req.query;
    if (!originLat || !originLng || !destLat || !destLng) {
      return res.json({ distance: 0, duration: 0 });
    }
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;
      const response = await fetch(osrmUrl);
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return res.json({
          distance: Math.round(route.distance / 100) / 10,
          duration: Math.round(route.duration / 60),
        });
      }
    } catch {}
    const R = 6371;
    const dLat = (Number(destLat) - Number(originLat)) * Math.PI / 180;
    const dLon = (Number(destLng) - Number(originLng)) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(Number(originLat) * Math.PI / 180) * Math.cos(Number(destLat) * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return res.json({ distance: Math.round(dist * 10) / 10, duration: Math.round(dist * 2.5 + 3) });
  });

  app.get("/api/directions", async (req, res) => {
    const { origin, destination } = req.query;
    if (!origin || !destination) {
      return res.json({ routes: [], distance: 0, duration: 0 });
    }
    const [oLat, oLng] = (origin as string).split(",").map(Number);
    const [dLat, dLng] = (destination as string).split(",").map(Number);

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates;
        const points: [number, number][] = coords.map((c: [number, number]) => [c[1], c[0]]);
        const distKm = Math.round((data.routes[0].distance / 1000) * 10) / 10;
        const durMin = Math.round(data.routes[0].duration / 60);
        return res.json({ routes: points, distance: distKm, duration: durMin });
      }
      return res.json({ routes: [], distance: 0, duration: 0 });
    } catch {
      return res.json({ routes: [], distance: 0, duration: 0 });
    }
  });

  app.get("/api/geocode/search", async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q as string)}&countrycodes=za&viewbox=30.3,-23.0,31.1,-23.7&bounded=0&limit=8`;
      const response = await fetch(url, { headers: { "User-Agent": "GYRides/1.0" } });
      const data = await response.json();
      const results = data.map((item: any) => ({
        name: item.display_name.split(",")[0],
        address: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));
      return res.json(results);
    } catch {
      return res.json([]);
    }
  });

  app.get("/api/geocode/reverse", async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.json({ name: "Unknown", address: "Unknown location" });
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`;
      const response = await fetch(url, { headers: { "User-Agent": "GYRides/1.0" } });
      const data = await response.json();
      const name = data.address?.road || data.address?.suburb || data.address?.village || data.address?.town || "Dropped Pin";
      return res.json({ name, address: data.display_name || "Giyani area", lat: parseFloat(data.lat), lng: parseFloat(data.lon) });
    } catch {
      return res.json({ name: "Dropped Pin", address: "Giyani area", lat: parseFloat(lat as string), lng: parseFloat(lng as string) });
    }
  });

  // ── Public config ──
  app.get("/api/config/public", (_req, res) => {
    res.json({ yocoPublicKey: process.env.YOCO_PUBLIC_KEY || "" });
  });

  // ── Yoco Payments ──
  app.post("/api/payments/yoco/charge", async (req, res) => {
    const secretKey = process.env.YOCO_SECRET_KEY;
    if (!secretKey) return res.status(500).json({ message: "Yoco not configured" });
    try {
      const { token, amountInCents, tripId, riderId } = req.body;
      if (!token || !amountInCents) return res.status(400).json({ message: "token and amountInCents required" });
      const response = await fetch("https://online.yoco.com/v1/charges/", {
        method: "POST",
        headers: { "X-Auth-Token": secretKey, "Content-Type": "application/json" },
        body: JSON.stringify({ token, amountInCents, currency: "ZAR" }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error("[Yoco] Charge error:", JSON.stringify(data));
        // Mark trip as failed and add to rider's pending balance
        if (tripId) {
          try { await storage.updateTrip(tripId, { paymentStatus: "failed" as any }); } catch {}
        }
        if (riderId) {
          try {
            const rider = await storage.getUser(riderId);
            if (rider) {
              const amountRand = amountInCents / 100;
              await storage.updateUser(riderId, { pendingBalance: (rider.pendingBalance || 0) + amountRand } as any);
            }
          } catch {}
        }
        return res.status(response.status).json({ message: data.message || data.error || "Payment failed", yocoError: data, paymentFailed: true });
      }
      if (tripId) {
        try { await storage.updateTrip(tripId, { paymentStatus: "paid" as any }); } catch {}
      }
      // Clear rider's pending balance on successful payment
      if (riderId) {
        try { await storage.updateUser(riderId, { pendingBalance: 0 } as any); } catch {}
      }
      return res.json({ success: true, chargeId: data.id });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/payments/yoco/checkout", async (req, res) => {
    const yocoKey = process.env.YOCO_SECRET_KEY;
    if (!yocoKey) {
      return res.status(500).json({ message: "Yoco payments not configured" });
    }
    try {
      const { amount, tripId, riderId, description } = req.body;
      if (!amount || amount < 200) {
        return res.status(400).json({ message: "Minimum payment is R2.00" });
      }
      const baseUrl = `https://${req.get("host")}`;
      const response = await fetch("https://payments.yoco.com/api/checkouts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${yocoKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(amount),
          currency: "ZAR",
          successUrl: `${baseUrl}/payment/success?tripId=${tripId || ""}`,
          cancelUrl: `${baseUrl}/payment/cancel`,
          failureUrl: `${baseUrl}/payment/failure`,
          metadata: { tripId: tripId || "", riderId: riderId || "", description: description || "GY Rides trip" },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error("[Yoco] Checkout error:", JSON.stringify(data));
        return res.status(response.status).json({ message: data.message || data.error || data.detail || "Failed to create checkout", yocoError: data });
      }
      return res.json({ checkoutId: data.id, redirectUrl: data.redirectUrl });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/payments/yoco/webhook", async (req, res) => {
    try {
      const event = req.body;
      if (event.type === "payment.succeeded" && event.payload?.metadata?.tripId) {
        const tripId = event.payload.metadata.tripId;
        await storage.updateTrip(tripId, { paymentMethod: "card" as any });
      }
      return res.json({ received: true });
    } catch {
      return res.status(200).json({ received: true });
    }
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

  app.post("/api/auth/google", async (req, res) => {
    try {
      const { googleId, email, fullName, avatarUrl } = req.body;
      if (!googleId || !email) {
        return res.status(400).json({ message: "Missing Google account info" });
      }
      let user = await storage.getUserByGoogleId(googleId);
      if (user) return res.json(user);

      user = await storage.getUserByEmail(email);
      if (user) {
        const updated = await storage.updateUser(user.id, { googleId, avatarUrl: avatarUrl || user.avatarUrl });
        return res.json(updated);
      }

      const username = email.split("@")[0] + "_g" + googleId.slice(-4);
      const randomPass = crypto.randomBytes(16).toString("hex");
      user = await storage.createUser({
        username,
        password: randomPass,
        fullName: fullName || email.split("@")[0],
        phone: "",
        email,
        googleId,
        avatarUrl: avatarUrl || null,
        role: "rider",
      });
      return res.status(201).json(user);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
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

  app.get("/api/users", async (req, res) => {
    const users = await storage.getAllUsers();
    return res.json(users);
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { username, phone } = req.body;
      if (!username || !phone) {
        return res.status(400).json({ message: "Username and phone number are required" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "No account found with that username" });
      }
      const normalizedInputPhone = phone.replace(/\s+/g, "").replace(/-/g, "");
      const normalizedUserPhone = user.phone.replace(/\s+/g, "").replace(/-/g, "");
      if (normalizedInputPhone !== normalizedUserPhone) {
        return res.status(400).json({ message: "Phone number does not match our records" });
      }
      const request = await storage.createPasswordResetRequest({
        userId: user.id,
        username: user.username,
        phone: user.phone,
        status: "pending",
      });
      return res.json({ message: "Password reset request submitted. An admin will review and reset your password.", requestId: request.id });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { username, phone, newPassword } = req.body;
      if (!username || !phone || !newPassword) {
        return res.status(400).json({ message: "Username, phone, and new password are required" });
      }
      if (newPassword.length < 4) {
        return res.status(400).json({ message: "Password must be at least 4 characters" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "No account found with that username" });
      }
      const normalizedInputPhone = phone.replace(/\s+/g, "").replace(/-/g, "");
      const normalizedUserPhone = user.phone.replace(/\s+/g, "").replace(/-/g, "");
      if (normalizedInputPhone !== normalizedUserPhone) {
        return res.status(400).json({ message: "Phone number does not match our records" });
      }
      await storage.updateUser(user.id, { password: newPassword });
      return res.json({ message: "Password has been reset successfully. You can now sign in." });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/password-reset-requests", async (req, res) => {
    const requests = await storage.getPasswordResetRequests();
    return res.json(requests);
  });

  app.get("/api/password-reset-requests/pending", async (req, res) => {
    const requests = await storage.getPendingPasswordResetRequests();
    return res.json(requests);
  });

  app.patch("/api/password-reset-requests/:id", async (req, res) => {
    const request = await storage.updatePasswordResetRequest(req.params.id, req.body);
    if (!request) return res.status(404).json({ message: "Request not found" });
    return res.json(request);
  });

  app.post("/api/admin/reset-user-password", async (req, res) => {
    try {
      const { userId, newPassword } = req.body;
      if (!userId || !newPassword) {
        return res.status(400).json({ message: "User ID and new password are required" });
      }
      const user = await storage.updateUser(userId, { password: newPassword });
      if (!user) return res.status(404).json({ message: "User not found" });
      return res.json({ message: `Password reset for ${user.fullName}` });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/admin/users/:id/verify", async (req, res) => {
    const { isVerified } = req.body;
    const user = await storage.updateUser(req.params.id, { isVerified: isVerified ?? true });
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  });

  app.use("/uploads", (await import("express")).default.static(uploadsDir));

  app.post("/api/upload/profile-picture", upload.single("photo"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ message: "User ID required" });
      const avatarUrl = `/uploads/${req.file.filename}`;
      const user = await storage.updateUser(userId, { avatarUrl });
      if (!user) return res.status(404).json({ message: "User not found" });
      return res.json({ avatarUrl, user });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/upload/document", docUpload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const url = `/uploads/${req.file.filename}`;
      return res.json({ url });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/webauthn/register-options", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ message: "User ID required" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const challenge = crypto.randomBytes(32).toString("base64url");
      webauthnChallenges.set(userId, challenge);
      setTimeout(() => webauthnChallenges.delete(userId), 5 * 60 * 1000);
      const existingCreds = await storage.getWebauthnCredentialsByUser(userId);
      return res.json({
        challenge,
        rp: { name: "GY Rides", id: req.hostname },
        user: { id: Buffer.from(userId).toString("base64url"), name: user.username, displayName: user.fullName },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
        timeout: 60000,
        excludeCredentials: existingCreds.map(c => ({ type: "public-key" as const, id: c.credentialId })),
      });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/webauthn/register-verify", async (req, res) => {
    try {
      const { userId, credentialId, publicKey, deviceName } = req.body;
      if (!userId || !credentialId || !publicKey) {
        return res.status(400).json({ message: "Missing credential data" });
      }
      const storedChallenge = webauthnChallenges.get(userId);
      if (!storedChallenge) {
        return res.status(400).json({ message: "Challenge expired, try again" });
      }
      webauthnChallenges.delete(userId);
      const cred = await storage.createWebauthnCredential({
        userId,
        credentialId,
        publicKey,
        counter: 0,
        deviceName: deviceName || "This device",
      });
      return res.json({ message: "Biometric registered successfully", credential: cred });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/webauthn/login-options", async (req, res) => {
    try {
      const { username } = req.body;
      let credentials: any[] = [];
      if (username) {
        const user = await storage.getUserByUsername(username);
        if (user) {
          credentials = await storage.getWebauthnCredentialsByUser(user.id);
        }
      }
      const challenge = crypto.randomBytes(32).toString("base64url");
      const sessionId = crypto.randomUUID();
      webauthnChallenges.set(sessionId, challenge);
      setTimeout(() => webauthnChallenges.delete(sessionId), 5 * 60 * 1000);
      return res.json({
        challenge,
        sessionId,
        rpId: req.hostname,
        timeout: 60000,
        userVerification: "required",
        allowCredentials: credentials.map(c => ({ type: "public-key" as const, id: c.credentialId })),
      });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/webauthn/login-verify", async (req, res) => {
    try {
      const { sessionId, credentialId } = req.body;
      if (!sessionId || !credentialId) {
        return res.status(400).json({ message: "Missing authentication data" });
      }
      const storedChallenge = webauthnChallenges.get(sessionId);
      if (!storedChallenge) {
        return res.status(400).json({ message: "Challenge expired, try again" });
      }
      webauthnChallenges.delete(sessionId);
      const cred = await storage.getWebauthnCredentialByCredentialId(credentialId);
      if (!cred) {
        return res.status(401).json({ message: "Credential not found" });
      }
      await storage.updateWebauthnCredentialCounter(cred.id, (cred.counter || 0) + 1);
      const user = await storage.getUser(cred.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      return res.json(user);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/webauthn/credentials/:userId", async (req, res) => {
    const creds = await storage.getWebauthnCredentialsByUser(req.params.userId);
    return res.json(creds);
  });

  app.delete("/api/webauthn/credentials/:id", async (req, res) => {
    await storage.deleteWebauthnCredential(req.params.id);
    return res.json({ message: "Credential removed" });
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

  // Driver verifies rider's trip PIN before starting trip
  app.post("/api/trips/:id/verify-pin", async (req, res) => {
    const trip = await storage.getTrip(req.params.id);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    // If no PIN was set on this trip, verification passes automatically
    if (!trip.tripPin) return res.json({ success: true, noPinRequired: true });
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ message: "PIN required" });
    if (String(pin).trim() !== String(trip.tripPin).trim()) {
      return res.status(401).json({ message: "Incorrect PIN — ask the rider to check their app" });
    }
    return res.json({ success: true });
  });

  // Driver confirms cash payment for failed card trip
  app.post("/api/trips/:id/confirm-cash", async (req, res) => {
    try {
      const trip = await storage.getTrip(req.params.id);
      if (!trip) return res.status(404).json({ message: "Trip not found" });
      await storage.updateTrip(req.params.id, { paymentStatus: "paid" as any });
      // Clear rider pending balance
      try {
        const rider = await storage.getUser(trip.riderId);
        if (rider && (rider.pendingBalance || 0) > 0) {
          await storage.updateUser(trip.riderId, { pendingBalance: 0 } as any);
        }
      } catch {}
      // Update driver earnings
      if (trip.driverId) {
        try {
          const driver = await storage.getUser(trip.driverId);
          if (driver) {
            const driverShare = Math.round((trip.fare || 0) * 0.85 * 100) / 100;
            await storage.updateUser(trip.driverId, {
              earnings: (driver.earnings || 0) + driverShare,
              totalTrips: (driver.totalTrips || 0) + 1,
            } as any);
          }
        } catch {}
      }
      // Update rider total trips
      try {
        const rider = await storage.getUser(trip.riderId);
        if (rider) {
          await storage.updateUser(trip.riderId, { totalTrips: (rider.totalTrips || 0) + 1 } as any);
        }
      } catch {}
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Receipt data for a trip (used by PDF generator)
  app.get("/api/trips/:id/receipt", async (req, res) => {
    try {
      const trip = await storage.getTrip(req.params.id);
      if (!trip) return res.status(404).json({ message: "Trip not found" });
      const rider = await storage.getUser(trip.riderId);
      const driver = trip.driverId ? await storage.getUser(trip.driverId) : null;
      return res.json({
        trip,
        riderName: rider?.fullName || "Rider",
        driverName: driver?.fullName || "Driver",
        driverVehicle: driver ? `${driver.vehicleMake || ""} ${driver.vehicleModel || ""} ${driver.vehicleColor || ""}`.trim() : "",
        licensePlate: driver?.licensePlate || "",
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
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
  app.patch("/api/drivers/:id/location", async (req, res) => {
    const { lat, lng } = req.body;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ message: "lat and lng required" });
    }
    await storage.updateUser(req.params.id, {
      currentLat: lat,
      currentLng: lng,
      locationUpdatedAt: new Date(),
    } as any);
    return res.json({ ok: true });
  });

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

  // Driver earnings statement for a specific month
  app.get("/api/admin/driver-statement", async (req, res) => {
    try {
      const { driverId, month, year } = req.query as { driverId: string; month: string; year: string };
      if (!driverId || !month || !year) return res.status(400).json({ message: "driverId, month and year required" });
      const driver = await storage.getUser(driverId);
      if (!driver) return res.status(404).json({ message: "Driver not found" });
      const allDriverTrips = await storage.getTripsByDriver(driverId);
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      const monthTrips = allDriverTrips.filter(t => {
        const d = new Date(t.createdAt!);
        return d.getFullYear() === y && d.getMonth() + 1 === m;
      });
      const completed = monthTrips.filter(t => t.status === "completed");
      const totalFare = completed.reduce((s, t) => s + (t.fare || 0), 0);
      const platformFee = Math.round(totalFare * 0.15 * 100) / 100;
      const driverPayout = Math.round(totalFare * 0.85 * 100) / 100;
      return res.json({
        driver,
        month: m,
        year: y,
        trips: monthTrips,
        summary: {
          totalTrips: monthTrips.length,
          completedTrips: completed.length,
          cancelledTrips: monthTrips.filter(t => t.status === "cancelled").length,
          totalFare: Math.round(totalFare * 100) / 100,
          platformFee,
          driverPayout,
          cashTrips: completed.filter(t => t.paymentMethod === "cash").length,
          cardTrips: completed.filter(t => t.paymentMethod === "card").length,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Messages ──
  app.get("/api/messages/:tripId", async (req, res) => {
    const msgs = await storage.getMessagesByTrip(req.params.tripId);
    return res.json(msgs);
  });

  app.post("/api/messages", async (req, res) => {
    const { tripId, senderId, senderRole, text } = req.body;
    if (!tripId || !senderId || !senderRole || !text) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const msg = await storage.createMessage({ tripId, senderId, senderRole, text });
    return res.json(msg);
  });

  // ── SOS Alerts ──
  app.post("/api/sos", async (req, res) => {
    const { tripId, userId, userRole, lat, lng } = req.body;
    if (!userId || !userRole) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const alert = await storage.createSosAlert({ tripId: tripId || null, userId, userRole, lat: lat || null, lng: lng || null, status: "active" });
    return res.json(alert);
  });

  app.get("/api/sos", async (_req, res) => {
    const alerts = await storage.getSosAlerts();
    return res.json(alerts);
  });

  app.get("/api/sos/active", async (_req, res) => {
    const alerts = await storage.getActiveSosAlerts();
    return res.json(alerts);
  });

  app.patch("/api/sos/:id", async (req, res) => {
    const { status, adminNotes } = req.body;
    const updateData: any = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (status === "resolved") updateData.resolvedAt = new Date();
    const alert = await storage.updateSosAlert(req.params.id, updateData);
    if (!alert) return res.status(404).json({ message: "SOS alert not found" });
    return res.json(alert);
  });

  // ── Initialize App Data ──
  app.post("/api/seed", async (req, res) => {
    try {
      const existingAdmin = await storage.getUserByUsername("drnkateko");
      if (!existingAdmin) {
        await storage.createUser({ username: "drnkateko", password: "drin123!", fullName: "Dr Nkateko", phone: "068 642 7644", role: "admin" as const, rating: 5.0, totalTrips: 0, avatarUrl: null });
      }

      const existingVehicleTypes = await storage.getVehicleTypes();
      if (existingVehicleTypes.length === 0) {
        const vTypes = [
          { name: "GY Standard", description: "Affordable everyday rides", basePrice: 10, pricePerKm: 8, pricePerMin: 1.5, minimumFare: 25, seats: 4, icon: "car", isActive: true },
          { name: "GY Premium", description: "Comfortable newer vehicles", basePrice: 15, pricePerKm: 10, pricePerMin: 1.8, minimumFare: 35, seats: 4, icon: "star", isActive: true },
          { name: "GY XL", description: "Larger vehicles for groups", basePrice: 15, pricePerKm: 11, pricePerMin: 1.8, minimumFare: 40, seats: 7, icon: "truck", isActive: true },
          { name: "GY Health", description: "Hospital & clinic transport", basePrice: 10, pricePerKm: 8, pricePerMin: 1.2, minimumFare: 50, seats: 4, icon: "medical", isActive: true },
          { name: "GY Parcel", description: "Same-day parcel delivery", basePrice: 10, pricePerKm: 7, pricePerMin: 1.0, minimumFare: 25, seats: 1, icon: "package", isActive: true },
        ];
        for (const v of vTypes) {
          await storage.createVehicleType(v);
        }
      }

      const existingRoutes = await storage.getTaxiRoutes();
      if (existingRoutes.length === 0) {
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
      }

      return res.json({ message: "App initialized" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
