import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { MapPin, Search, Clock, CreditCard, ChevronLeft, Star, Home as HomeIcon, Briefcase, ShoppingBag, User, History, BookmarkPlus, Car, LogOut, Menu, X, Navigation, Share2, Crosshair, Phone, MessageCircle, Shield, AlertTriangle, Edit2, Tag, StickyNote, RotateCcw, Download, Users, Package, Heart, Bus, Banknote, Wallet, Upload, CheckCircle, Check, UserPlus, Minus, Plus, BadgeCheck, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { createTrip, updateTrip, updateUser, sendSosAlert, uploadProfilePicture, getWebauthnRegisterOptions, verifyWebauthnRegistration, getWebauthnCredentials, deleteWebauthnCredential, createYocoCheckout, getPublicConfig, chargeYocoToken, getRiderPendingBalance, getTripReceipt } from "@/lib/api";
import { generateReceiptPDF } from "@/lib/generateReceipt";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWakeLock } from "@/hooks/use-wake-lock";
import GiyaniMap from "@/components/GiyaniMap";
import TripChat from "@/components/TripChat";
import type { Trip, SavedPlace, VehicleType, User as UserType, TaxiRoute } from "@shared/schema";

const GIYANI_LOCATIONS = [
  { name: "Masingita Mall", address: "R81, Giyani", lat: -23.3096, lng: 30.6926, rural: false },
  { name: "Giyani CBD", address: "Central Business District, Giyani", lat: -23.3153, lng: 30.7256, rural: false },
  { name: "Section A", address: "Giyani Section A", lat: -23.3060, lng: 30.7180, rural: false },
  { name: "Section B", address: "Giyani Section B", lat: -23.3010, lng: 30.7310, rural: false },
  { name: "Section C", address: "Giyani Section C", lat: -23.3200, lng: 30.7100, rural: false },
  { name: "Section D", address: "Giyani Section D", lat: -23.2930, lng: 30.7390, rural: false },
  { name: "Section E", address: "Giyani Section E", lat: -23.2870, lng: 30.7280, rural: true },
  { name: "Giyani Hospital", address: "Hospital Road, Giyani", lat: -23.3180, lng: 30.7140, rural: false },
  { name: "Giyani Plaza", address: "Main Street, Giyani", lat: -23.3096, lng: 30.6926, rural: false },
  { name: "Giyani Stadium", address: "D3641, Giyani", lat: -23.3222, lng: 30.7191, rural: false },
  { name: "Giyani Taxi Rank", address: "Main Taxi Rank, CBD", lat: -23.3140, lng: 30.7230, rural: false },
  { name: "Thohoyandou Road", address: "R81 Highway Exit", lat: -23.2750, lng: 30.7500, rural: false },
  { name: "Giyani Clinic", address: "Section B Clinic, Giyani", lat: -23.3030, lng: 30.7340, rural: false },
  { name: "Nkhensani Hospital", address: "Nkhensani Hospital Complex", lat: -23.3170, lng: 30.7170, rural: false },
  { name: "Ka-Homu", address: "Ka-Homu, Greater Giyani", lat: -23.3319, lng: 30.7817, rural: true },
  { name: "Ka-Dzumeri", address: "Ka-Dzumeri, Greater Giyani", lat: -23.5716, lng: 30.6973, rural: true },
  { name: "Ka-Nkuri", address: "Ka-Nkuri, Greater Giyani", lat: -23.2528, lng: 30.5397, rural: true },
  { name: "Ndhambi", address: "Ndhambi Village, Greater Giyani", lat: -23.3500, lng: 30.7500, rural: true },
  { name: "Risinga", address: "Risinga Village, Greater Giyani", lat: -23.3300, lng: 30.6500, rural: true },
  { name: "Muyexe", address: "Muyexe, Greater Giyani", lat: -23.1976, lng: 30.9160, rural: true },
  { name: "Xikukwani", address: "Xikukwani Village, Greater Giyani", lat: -23.2500, lng: 30.7100, rural: true },
  { name: "Gawula", address: "Gawula Village, Greater Giyani", lat: -23.3600, lng: 30.7100, rural: true },
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
  useWakeLock();
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
  const [preferredCategory, setPreferredCategory] = useState<"standard" | "premium" | "xl">("standard");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [sharedSeats, setSharedSeats] = useState(1);
  const [medicalNotes, setMedicalNotes] = useState("");
  const [parcelDescription, setParcelDescription] = useState("");
  const [liveSearchResults, setLiveSearchResults] = useState<{name: string; address: string; lat: number; lng: number}[]>([]);
  const [searchingLive, setSearchingLive] = useState(false);
  const [trustedContactInput, setTrustedContactInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [locatingGPS, setLocatingGPS] = useState(false);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [tripEta, setTripEta] = useState<number | null>(null);
  const [tripStartTime, setTripStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [searchWaitSecs, setSearchWaitSecs] = useState(0);
  const searchStartRef = useRef<number | null>(null);
  const [yocoPublicKey, setYocoPublicKey] = useState("");
  const [cardCharged, setCardCharged] = useState(false);
  const [cardChargeId, setCardChargeId] = useState("");
  const [cardVerifying, setCardVerifying] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);
  const [customTipInput, setCustomTipInput] = useState("");
  const [tipCharged, setTipCharged] = useState(false);
  const [tipSubmitting, setTipSubmitting] = useState(false);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── Rider GPS tracking refs and state ──
  const riderGpsWatchRef = useRef<number | null>(null);
  const riderLastSentRef = useRef<number>(0);
  const currentTripRef = useRef<typeof currentTrip>(null);
  const [riderOwnGps, setRiderOwnGps] = useState<{ lat: number; lng: number } | null>(null);

  // Keep ref in sync so GPS callback can read latest trip status without stale closure
  useEffect(() => { currentTripRef.current = currentTrip; }, [currentTrip]);

  // ── Persistent GPS — starts immediately on login, always live ──
  useEffect(() => {
    if (!user) return;
    if (!navigator.geolocation) return;
    if (riderGpsWatchRef.current !== null) return; // already watching

    let firstFix = true;

    riderGpsWatchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setRiderOwnGps({ lat, lng });

        // Auto-fill pickup on the very first GPS fix (if none selected yet)
        if (firstFix) {
          firstFix = false;
          try {
            const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
            const data = await res.json();
            const name = data.name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            setPickup(prev => prev ? prev : { name, address: data.address || name, lat, lng, rural: false });
          } catch {
            setPickup(prev => prev ? prev : { name: "My location", address: "Current location", lat, lng, rural: false });
          }
        }

        // Send location to server only during active trips
        const now = Date.now();
        if (now - riderLastSentRef.current < 5000) return;
        riderLastSentRef.current = now;
        const tripActive = ["requested", "accepted", "arriving", "in_progress"].includes((currentTripRef.current?.status) ?? "");
        if (!tripActive) return;
        try {
          await fetch(`/api/drivers/${user.id}/location`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ lat, lng }),
          });
        } catch {}
      },
      (err) => { console.warn("Rider GPS error:", err.message); },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );

    return () => {
      if (riderGpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(riderGpsWatchRef.current);
        riderGpsWatchRef.current = null;
      }
    };
  }, [user?.id]); // Only re-run if user changes — GPS runs for the whole session

  // ── Real-time trip status polling ──
  // Polls every 3s whenever rider has an active trip (searching or tracking)
  // This is how driver actions (accept, arrive, start, complete) reach the rider
  useEffect(() => {
    if (!currentTrip?.id) return;
    if (!["searching", "tracking"].includes(view)) return;

    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/trips/${currentTrip.id}`, { credentials: "include" });
        if (!res.ok || cancelled) return;
        const updated: Trip = await res.json();
        if (cancelled) return;

        setCurrentTrip(updated);

        // ── Status machine: react to server-side status changes ──
        if (updated.status === "accepted" && rideStatus === "searching") {
          // Driver has accepted — fetch their info and move to tracking
          if (updated.driverId) {
            try {
              const dRes = await fetch(`/api/users/${updated.driverId}`, { credentials: "include" });
              const driver = await dRes.json();
              setAssignedDriver(driver);
            } catch {}
          }
          setRideStatus("on_the_way");
          setTripEta(updated.duration ?? null);
          setView("tracking");
          toast({ title: "Driver found!", description: "Your driver is on the way." });
        } else if (updated.status === "arriving" && rideStatus === "on_the_way") {
          setRideStatus("arrived");
          toast({ title: "Driver arrived!", description: "Your driver is at the pickup point." });
        } else if (updated.status === "in_progress" && rideStatus !== "in_progress") {
          setRideStatus("in_progress");
          setTripStartTime(prev => prev ?? Date.now());
        } else if (updated.status === "completed" && view !== "completed") {
          cancelled = true;
          setView("completed");
        } else if (updated.status === "cancelled" && view !== "home") {
          cancelled = true;
          setCurrentTrip(null);
          setAssignedDriver(null);
          setView("home");
          toast({ title: "Trip cancelled", variant: "destructive" });
        }

        // Timeout: no driver accepted after 5 minutes → auto-cancel
        if (view === "searching" && searchStartRef.current && Date.now() - searchStartRef.current > 300000) {
          cancelled = true;
          try { await updateTrip(currentTrip.id, { status: "cancelled" }); } catch {}
          setCurrentTrip(null);
          setView("home");
          toast({ title: "No drivers available", description: "Try again or book via WhatsApp.", variant: "destructive" });
        }
      } catch {}
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [currentTrip?.id, view, rideStatus]);

  // ── Wait timer displayed on searching screen ──
  useEffect(() => {
    if (view !== "searching") { setSearchWaitSecs(0); searchStartRef.current = null; return; }
    searchStartRef.current = Date.now();
    setSearchWaitSecs(0);
    const interval = setInterval(() => setSearchWaitSecs(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [view]);

  // ── Live elapsed timer during in_progress ──
  useEffect(() => {
    if (rideStatus !== "in_progress") { setElapsedSeconds(0); return; }
    const interval = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [rideStatus]);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const useCurrentLocation = useCallback((target: "pickup" | "dropoff") => {
    if (!navigator.geolocation) {
      toast({ title: "Not supported", description: "GPS is not available on this device", variant: "destructive" });
      return;
    }
    setLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let name = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        let address = "Current location";
        try {
          const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`);
          const data = await res.json();
          if (data.name) {
            name = data.name;
            address = data.address;
          }
        } catch {}
        const loc = { name, address, lat: latitude, lng: longitude, rural: false };
        if (target === "pickup") {
          setPickup(loc);
          toast({ title: "Pickup set", description: name });
        } else {
          setDropoff(loc);
          toast({ title: "Drop-off set", description: name });
        }
        setLocatingGPS(false);
        if (target === "pickup" && view === "search") {
          setSearchFor("dropoff");
          setSearchQuery("");
        } else if (target === "dropoff" && pickup) {
          setView("confirm");
        }
      },
      (error) => {
        setLocatingGPS(false);
        let msg = "Could not get your location";
        if (error.code === 1) msg = "Location access denied. Please enable GPS in your browser settings.";
        else if (error.code === 2) msg = "Location unavailable. Try again.";
        else if (error.code === 3) msg = "Location request timed out. Try again.";
        toast({ title: "Location error", description: msg, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [pickup, view, toast]);

  useEffect(() => {
    if (!user || user.role !== "rider") {
      setLocation("/");
    }
  }, [user]);

  // ── Resume active trip on login / page reload ──
  // If the rider has a non-completed trip (from a previous session), pick it up automatically
  useEffect(() => {
    if (!user?.id || currentTrip || view !== "home") return;
    let cancelled = false;
    const resume = async () => {
      try {
        const res = await fetch(`/api/trips/rider/${user.id}`, { credentials: "include" });
        if (!res.ok || cancelled) return;
        const trips: Trip[] = await res.json();
        const active = trips.find(t =>
          ["requested", "accepted", "arriving", "in_progress"].includes(t.status)
        );
        if (!active || cancelled) return;
        setCurrentTrip(active);
        // Map DB status → rideStatus
        if (active.status === "requested") {
          setRideStatus("searching");
          setView("searching");
        } else if (active.status === "accepted") {
          setRideStatus("on_the_way");
          setView("tracking");
          if (active.driverId) {
            try {
              const dRes = await fetch(`/api/users/${active.driverId}`, { credentials: "include" });
              const driver = await dRes.json();
              if (!cancelled) {
                setAssignedDriver(driver);
                if (driver.currentLat && driver.currentLng) {
                  setDriverPos({ lat: driver.currentLat, lng: driver.currentLng });
                }
              }
            } catch {}
          }
          if ((active as any).tripPin) setTripPin((active as any).tripPin);
          toast({ title: "Trip resumed", description: "Your driver is on the way." });
        } else if (active.status === "arriving") {
          setRideStatus("arrived");
          setView("tracking");
          if (active.driverId) {
            try {
              const dRes = await fetch(`/api/users/${active.driverId}`, { credentials: "include" });
              const driver = await dRes.json();
              if (!cancelled) setAssignedDriver(driver);
            } catch {}
          }
          if ((active as any).tripPin) setTripPin((active as any).tripPin);
          toast({ title: "Driver has arrived!", description: "Your driver is at the pickup point." });
        } else if (active.status === "in_progress") {
          setRideStatus("in_progress");
          setView("tracking");
          setTripStartTime(prev => prev ?? Date.now());
          if (active.driverId) {
            try {
              const dRes = await fetch(`/api/users/${active.driverId}`, { credentials: "include" });
              const driver = await dRes.json();
              if (!cancelled) {
                setAssignedDriver(driver);
                if (driver.currentLat && driver.currentLng) {
                  setDriverPos({ lat: driver.currentLat, lng: driver.currentLng });
                }
              }
            } catch {}
          }
          toast({ title: "Trip in progress", description: "You're on your way!" });
        }
      } catch {}
    };
    resume();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Load Yoco SDK, public key and pending balance
  useEffect(() => {
    getPublicConfig().then(cfg => {
      if (cfg.yocoPublicKey) setYocoPublicKey(cfg.yocoPublicKey);
    }).catch(() => {});
    if (!document.getElementById("yoco-sdk")) {
      const s = document.createElement("script");
      s.id = "yoco-sdk";
      s.src = "https://js.yoco.com/sdk/v1/yoco-sdk-web.js";
      document.head.appendChild(s);
    }
    if (user?.id) {
      getRiderPendingBalance(user.id).then(bal => setPendingBalance(bal)).catch(() => {});
    }
  }, [user?.id]);

  const handleYocoVerify = useCallback((fare: number, onSuccess: () => void, tripId?: string) => {
    const YocoSDK = (window as any).YocoSDK;
    if (!YocoSDK || !yocoPublicKey) {
      toast({ title: "Yoco not ready", description: "Payment SDK is loading, please try again in a moment.", variant: "destructive" });
      return;
    }
    setCardVerifying(true);
    const yoco = new YocoSDK({ publicKey: yocoPublicKey });
    yoco.showPopup({
      amountInCents: Math.round(fare * 100),
      currency: "ZAR",
      name: "GY Rides",
      description: "Card verification & payment",
      callback: async (result: any) => {
        setCardVerifying(false);
        if (result.error) {
          toast({ title: "Card declined", description: result.error.message || "Please check your card details and try again.", variant: "destructive" });
          return;
        }
        try {
          const charge = await chargeYocoToken({ token: result.id, amountInCents: Math.round(fare * 100), tripId, riderId: user?.id });
          setCardCharged(true);
          setCardChargeId(charge.chargeId);
          toast({ title: "Card verified ✓", description: `R${fare} charged successfully. Your ride is confirmed.` });
          onSuccess();
        } catch (err: any) {
          // Immediate failure notification
          toast({
            title: "⚠️ Payment failed",
            description: `R${fare} could not be charged. The amount has been added to your account balance and will be collected on your next trip.`,
            variant: "destructive",
          });
          // Refresh pending balance
          if (user?.id) getRiderPendingBalance(user.id).then(bal => setPendingBalance(bal)).catch(() => {});
        }
      },
    });
  }, [yocoPublicKey, toast, user?.id]);

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
    const n = vt.name.toLowerCase();
    if (rideType === "medical") return n.includes("health") || n.includes("medical") || n.includes("standard");
    if (rideType === "parcel") return n.includes("parcel") || n.includes("standard");
    if (rideType === "shared") return !n.includes("parcel") && !n.includes("health") && !n.includes("medical");
    return !n.includes("parcel") && !n.includes("health") && !n.includes("medical");
  });

  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);

  useEffect(() => {
    if (!pickup || !dropoff) { setRouteInfo(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/route-info?originLat=${pickup.lat}&originLng=${pickup.lng}&destLat=${dropoff.lat}&destLng=${dropoff.lng}`);
        const data = await res.json();
        if (!cancelled && data.distance > 0) {
          setRouteInfo({ distance: data.distance, duration: data.duration });
        }
      } catch {
        if (!cancelled) {
          const d = haversineDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
          setRouteInfo({ distance: d, duration: Math.round(d * 2.5 + 3) });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]);

  // ── Real GPS polling: fetch driver's live position every 4 seconds ──
  useEffect(() => {
    if (view !== "tracking" || !currentTrip || !assignedDriver) return;

    const pLat = currentTrip.pickupLat ?? -23.306;
    const pLng = currentTrip.pickupLng ?? 30.718;
    const dLat = currentTrip.dropoffLat ?? -23.315;
    const dLng = currentTrip.dropoffLng ?? 30.726;

    if (rideStatus === "in_progress") {
      setTripStartTime(prev => prev ?? Date.now());
    }

    // Set ETA
    if (rideStatus === "on_the_way") {
      setTripEta(prev => prev ?? (currentTrip.duration ?? 5));
    }

    let cancelled = false;

    const pollDriverLocation = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/users/${assignedDriver.id}`, { credentials: "include" });
        const driverData = await res.json();

        if (cancelled) return;

        const hasRealGps = typeof driverData.currentLat === "number" && typeof driverData.currentLng === "number";

        if (hasRealGps) {
          setDriverPos({ lat: driverData.currentLat, lng: driverData.currentLng });

          // Update ETA based on distance to destination
          const totalDur = currentTrip.duration ?? 5;
          if (rideStatus === "on_the_way") {
            const distToPickup = Math.sqrt(Math.pow(driverData.currentLat - pLat, 2) + Math.pow(driverData.currentLng - pLng, 2));
            const eta = Math.max(1, Math.round(distToPickup * 5000));
            setTripEta(Math.min(eta, totalDur));
          } else if (rideStatus === "in_progress") {
            const distToDropoff = Math.sqrt(Math.pow(driverData.currentLat - dLat, 2) + Math.pow(driverData.currentLng - dLng, 2));
            setTripEta(Math.max(1, Math.round(distToDropoff * 5000)));
          }
        } else {
          // Fallback: show pickup location if no GPS
          if (rideStatus === "on_the_way") {
            setDriverPos({ lat: pLat + 0.003, lng: pLng - 0.003 });
          } else if (rideStatus === "in_progress") {
            setDriverPos({ lat: pLat, lng: pLng });
          } else {
            setDriverPos({ lat: pLat, lng: pLng });
          }
        }
      } catch {
        // Network error — keep existing position
      }
    };

    pollDriverLocation();
    const interval = setInterval(pollDriverLocation, 4000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [view, rideStatus, currentTrip?.id, assignedDriver?.id]);

  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const calcDistance = () => {
    if (routeInfo) return routeInfo.distance;
    if (!pickup || !dropoff) return 3;
    return haversineDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
  };

  const PLATFORM_COMMISSION = 0.15;
  const RURAL_SURCHARGE = 8;

  const isRuralTrip = () => {
    const pickupRural = pickup && GIYANI_LOCATIONS.find(l => l.name === pickup.name)?.rural;
    const dropoffRural = dropoff && GIYANI_LOCATIONS.find(l => l.name === dropoff.name)?.rural;
    return !!(pickupRural || dropoffRural);
  };

  const calcFareBreakdown = (vt: VehicleType) => {
    const dist = calcDistance();
    const dur = calcDuration();
    const baseFare = vt.basePrice;
    const distFare = vt.pricePerKm * dist;
    const timeFare = (vt.pricePerMin ?? 1.5) * dur;
    let subtotal = Math.round(baseFare + distFare + timeFare);
    const rural = isRuralTrip() ? RURAL_SURCHARGE : 0;
    subtotal += rural;

    if (rideType === "shared") {
      const perSeat = Math.round(subtotal * 0.55);
      subtotal = perSeat * sharedSeats;
    }

    const minFare = vt.minimumFare ?? 25;
    const total = Math.max(subtotal, minFare);
    const driverEarns = Math.round(total * (1 - PLATFORM_COMMISSION));
    return { baseFare, distFare: Math.round(distFare), timeFare: Math.round(timeFare), rural, total, driverEarns, minApplied: subtotal < minFare };
  };

  const calcFare = (vt: VehicleType) => calcFareBreakdown(vt).total;

  const calcDuration = () => {
    if (routeInfo) return routeInfo.duration;
    return Math.round(calcDistance() * 2.5 + 3);
  };

  const filteredLocations = GIYANI_LOCATIONS.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.address.toLowerCase().includes(searchQuery.toLowerCase()));

  useEffect(() => {
    if (searchQuery.length < 3) { setLiveSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingLive(true);
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(searchQuery + " Giyani")}`);
        const data = await res.json();
        setLiveSearchResults(data);
      } catch { setLiveSearchResults([]); }
      setSearchingLive(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleBookRide = async () => {
    if (!pickup || !dropoff || !selectedVehicle || !user) return;
    const pin = generateTripPin();
    setTripPin(pin);
    setRideStatus("searching");
    setView("searching");

    try {
      const dist = calcDistance();
      const fare = calcFare(selectedVehicle);
      const totalFare = fare + (pendingBalance > 0 && paymentMethod === "card" ? pendingBalance : 0);
      const trip = await createTrip({
        riderId: user.id,
        driverId: null,          // No pre-assignment — driver accepts from their app
        rideType,
        pickupName: pickup.name,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropoffName: dropoff.name,
        dropoffLat: dropoff.lat,
        dropoffLng: dropoff.lng,
        fare: totalFare,
        distance: dist,
        duration: calcDuration(),
        vehicleType: selectedVehicle.name,
        paymentMethod: paymentMethod as any,
        paymentStatus: "pending" as any,
        status: "requested",
        seatsBooked: rideType === "shared" ? sharedSeats : 1,
        medicalNotes: rideType === "medical" ? medicalNotes : null,
        parcelDescription: rideType === "parcel" ? parcelDescription : null,
        rideNote,
        tripPin: pin,
        requestedCategory: preferredCategory,
      } as any);
      setCurrentTrip(trip);
      // Polling effect (below) watches this trip and reacts when a driver accepts
    } catch (err: any) {
      setView("home");
      const isAuthErr = err?.message?.includes("not found") || err?.message?.includes("401") || err?.message?.includes("404");
      toast({
        title: "Booking failed",
        description: isAuthErr
          ? "Your session has expired. Please sign out and sign in again."
          : "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleWhatsAppBooking = async () => {
    const pickupText = pickup?.name || "My location";
    const dropoffText = dropoff?.name || "Not set";
    const typeLabel = rideType === "medical" ? "Medical Transport" : rideType === "parcel" ? "Parcel Delivery" : rideType === "shared" ? `Shared Ride (${sharedSeats} seat${sharedSeats > 1 ? "s" : ""})` : "Private Ride";
    const waPin = generateTripPin();
    setTripPin(waPin);

    try {
      const tripData: any = {
        riderId: user.id,
        rideType,
        pickupName: pickupText,
        pickupLat: pickup?.lat ?? null,
        pickupLng: pickup?.lng ?? null,
        dropoffName: dropoffText,
        dropoffLat: dropoff?.lat ?? null,
        dropoffLng: dropoff?.lng ?? null,
        status: "requested",
        fare: selectedVehicle ? calcFare(selectedVehicle) : 0,
        distance: currentTrip?.distance ?? null,
        duration: currentTrip?.duration ?? null,
        paymentMethod,
        vehicleType: selectedVehicle?.name ?? "GY Standard",
        seatsBooked: rideType === "shared" ? sharedSeats : 1,
        medicalNotes: medicalNotes || null,
        parcelDescription: parcelDescription || null,
        bookingChannel: "whatsapp",
        tripPin: waPin,
      };
      const trip = await createTrip(tripData);
      setCurrentTrip(trip);
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
    } catch {}

    const fareText = selectedVehicle ? `R${calcFare(selectedVehicle)}` : "";
    const msg = `Hi GY Rides! I'd like to book a ride:\n\nType: ${typeLabel}\nPickup: ${pickupText}\nDrop-off: ${dropoffText}\nFare: ${fareText}\nPhone: ${user.phone}\nName: ${user.fullName}\nPayment: ${paymentMethod}${medicalNotes ? `\nMedical notes: ${medicalNotes}` : ""}${parcelDescription ? `\nParcel: ${parcelDescription}` : ""}`;
    window.open(`https://wa.me/27686427644?text=${encodeURIComponent(msg)}`, "_blank");
    toast({ title: "WhatsApp Booking Sent", description: "Your booking has been logged. We'll confirm via WhatsApp." });
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

  // Poll trip data on completion screen (for cash confirmation + actual duration)
  useEffect(() => {
    if (view !== "completed" || !currentTrip?.id) return;
    if (currentTrip.paymentStatus === "paid" && currentTrip.duration != null) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/trips/${currentTrip.id}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setCurrentTrip(prev => prev ? {
            ...prev,
            paymentStatus: data.paymentStatus ?? prev.paymentStatus,
            duration: data.duration ?? prev.duration,
          } : prev);
          if (data.paymentStatus === "paid") clearInterval(interval);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [view, currentTrip?.id, currentTrip?.paymentMethod, currentTrip?.paymentStatus]);

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

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<{name: string; address: string}> => {
    try {
      const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      if (data.name) return { name: data.name, address: data.address };
    } catch {}
    return { name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, address: "Giyani area" };
  }, []);

  const handlePinDrop = useCallback((lat: number, lng: number) => { setPinDrop({ lat, lng }); }, []);

  const handleConfirmPin = useCallback(async () => {
    if (!pinDrop) return;
    const geo = await reverseGeocode(pinDrop.lat, pinDrop.lng);
    const loc = { name: geo.name, address: geo.address, lat: pinDrop.lat, lng: pinDrop.lng, rural: false };
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

  const handleSOS = async () => {
    try {
      const loc = pickup || pinDrop;
      await sendSosAlert({
        tripId: currentTrip?.id,
        userId: user.id,
        userRole: "rider",
        lat: loc?.lat,
        lng: loc?.lng,
      });
      toast({ title: "SOS Alert Sent!", description: "Admin has been notified. Help is on the way.", variant: "destructive" });
      if (trustedContacts.length > 0) handleShareWithContacts();
    } catch {
      toast({ title: "SOS Alert Sent", description: "Emergency contacts have been notified with your location" });
    }
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
      case "card": return "Yoco";
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
                     "Pay with card via Yoco"}
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
                  setPickup({ name: route.fromLocation, address: route.routeName, lat: route.fromLat ?? -23.318, lng: route.fromLng ?? 30.718, rural: false });
                  setDropoff({ name: route.toLocation, address: route.routeName, lat: route.toLat ?? -23.32, lng: route.toLng ?? 30.71, rural: false });
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
              window.open(`https://wa.me/27686427644?text=${encodeURIComponent("Hi GY Rides! I need a taxi from Giyani. Can you help?")}`, "_blank");
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
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} />}
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

  const downloadHistoryReceipt = async (tripId: string) => {
    setDownloadingReceiptId(tripId);
    try {
      const receiptData = await getTripReceipt(tripId);
      await generateReceiptPDF(receiptData);
      toast({ title: "Receipt downloaded!", description: "Check your downloads folder." });
    } catch (err: any) {
      toast({ title: "Download failed", description: err?.message || "Could not generate receipt.", variant: "destructive" });
    } finally {
      setDownloadingReceiptId(null);
    }
  };

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
            <div key={trip.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" data-testid={`trip-history-${trip.id}`}>
              {/* Main card — tap to re-book */}
              <button
                className="w-full text-left p-4"
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-500">{trip.createdAt ? new Date(trip.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : ""}</span>
                    {trip.rideType && trip.rideType !== "private" && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 capitalize">{trip.rideType}</span>
                    )}
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${trip.status === "completed" ? "bg-green-100 text-green-700" : trip.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {trip.status}
                  </span>
                </div>
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-sm"><div className="w-2 h-2 bg-green-500 rounded-full shrink-0" /><span className="font-medium truncate">{trip.pickupName}</span></div>
                  <div className="flex items-center gap-2 text-sm"><div className="w-2 h-2 bg-black rounded-full shrink-0" /><span className="font-medium truncate">{trip.dropoffName}</span></div>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-500">{trip.vehicleType} · {trip.distance?.toFixed(1)} km · {trip.paymentMethod}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold">R{trip.fare}</span>
                    <RotateCcw className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </div>
              </button>

              {/* Receipt download — only for completed trips */}
              {trip.status === "completed" && (
                <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between bg-gray-50">
                  <span className="text-xs text-gray-500">Receipt available</span>
                  <button
                    data-testid={`btn-receipt-${trip.id}`}
                    disabled={downloadingReceiptId === trip.id}
                    onClick={() => downloadHistoryReceipt(trip.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-black bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 px-3 py-1.5 rounded-xl transition-colors active:scale-95"
                  >
                    <Download className="h-3 w-3" />
                    {downloadingReceiptId === trip.id ? "Generating..." : "Download PDF"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Profile ──
  if (view === "profile") {
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const result = await uploadProfilePicture(user.id, file);
        setUser({ ...user, avatarUrl: result.avatarUrl });
        toast({ title: "Photo updated!", description: "Your profile picture has been changed" });
      } catch {
        toast({ title: "Upload failed", description: "Please try again with a smaller image", variant: "destructive" });
      }
    };

    const setupBiometric = async () => {
      try {
        if (!window.PublicKeyCredential) {
          toast({ title: "Not supported", description: "Biometric login is not available on this device", variant: "destructive" });
          return;
        }
        const options = await getWebauthnRegisterOptions(user.id);
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge: Uint8Array.from(atob(options.challenge.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)),
            rp: options.rp,
            user: {
              id: Uint8Array.from(atob(options.user.id.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)),
              name: options.user.name,
              displayName: options.user.displayName,
            },
            pubKeyCredParams: options.pubKeyCredParams,
            authenticatorSelection: options.authenticatorSelection,
            timeout: options.timeout,
          },
        }) as PublicKeyCredential;
        if (!credential) return;
        const rawId = Array.from(new Uint8Array(credential.rawId));
        const credentialId = btoa(String.fromCharCode(...rawId)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
        const response = credential.response as AuthenticatorAttestationResponse;
        const publicKey = btoa(String.fromCharCode(...new Uint8Array(response.getPublicKey?.() || new ArrayBuffer(0)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
        await verifyWebauthnRegistration({ userId: user.id, credentialId, publicKey, deviceName: "This device" });
        toast({ title: "Biometric setup complete!", description: "You can now use fingerprint or face ID to sign in" });
      } catch {
        toast({ title: "Setup failed", description: "Could not set up biometric login", variant: "destructive" });
      }
    };

    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setView("home")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Profile</h1>
        </div>
        <div className="flex-1 p-6 pb-20 overflow-auto">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center mb-6">
            <div className="relative inline-block">
              <Avatar className="h-20 w-20 mx-auto border-2 border-yellow-400">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} />}
                <AvatarFallback className="bg-yellow-400 text-black text-2xl font-bold">{user.fullName[0]}</AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 bg-black text-white rounded-full p-1.5 cursor-pointer shadow-lg hover:bg-gray-800 transition-colors" data-testid="btn-upload-photo">
                <Upload className="h-3.5 w-3.5" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            <h2 className="text-xl font-bold mt-3">{user.fullName}</h2>
            <p className="text-gray-500">{user.phone}</p>
            {user.isVerified && (
              <div className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full mt-1">
                <BadgeCheck className="h-3 w-3" /> Verified Account
              </div>
            )}
            <div className="flex items-center justify-center gap-1 mt-2 text-sm">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> {user.rating?.toFixed(1)} · {user.totalTrips} trips
            </div>
            <div className="mt-3 bg-yellow-50 rounded-xl px-3 py-2 inline-flex items-center gap-2 text-sm">
              <Wallet className="h-4 w-4 text-yellow-600" />
              <span className="font-bold">R{(user.walletBalance ?? 0).toFixed(0)}</span>
              <span className="text-gray-500 text-xs">wallet</span>
            </div>
          </div>

          <h3 className="font-bold mb-3">Security</h3>
          <div className="space-y-2 mb-6">
            <button
              className="w-full bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border border-gray-100 text-left"
              onClick={setupBiometric}
              data-testid="btn-setup-biometric"
            >
              <div className="bg-blue-50 p-2 rounded-xl">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-blue-600">
                  <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" /><path d="M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2" /><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" /><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" /><path d="M8.65 22c.21-.66.45-1.32.57-2" /><path d="M14 13.12c0 2.38 0 6.38-1 8.88" /><path d="M2 16h.01" /><path d="M21.8 16c.2-2 .131-5.354 0-6" /><path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-sm">Set Up Biometric Login</div>
                <div className="text-[10px] text-gray-500">Use fingerprint or face ID to sign in</div>
              </div>
            </button>
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
          <div className="mt-6 text-[10px] text-gray-400 text-center leading-tight">
            © {new Date().getFullYear()} Mpfuno Medical Services (PTY) LTD & Dr NI Mabunda. All rights reserved.
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
            <div className="px-4 pb-2 space-y-1">
              <Button variant="ghost" className="w-full justify-start h-14 rounded-xl gap-3 text-base" onClick={() => useCurrentLocation(searchFor)} disabled={locatingGPS} data-testid="btn-use-current-location">
                <div className="bg-blue-100 p-2 rounded-lg"><LocateFixed className={`h-4 w-4 text-blue-600 ${locatingGPS ? "animate-pulse" : ""}`} /></div>
                <div className="text-left">
                  <div className="font-medium">{locatingGPS ? "Getting your location..." : "Use current location"}</div>
                  <div className="text-xs text-gray-500">Use GPS to set your {searchFor === "pickup" ? "pickup" : "drop-off"}</div>
                </div>
              </Button>
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
                  const loc = { name: p.name, address: p.address, lat: p.lat ?? -23.31, lng: p.lng ?? 30.72, rural: false };
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
            <p className="text-xs text-gray-500 uppercase font-bold mb-2 px-1">{searchQuery ? "Results" : "Popular Locations"}</p>
            {filteredLocations.map((loc, i) => (
              <Button key={i} variant="ghost" className="w-full justify-start h-14 rounded-xl gap-3 text-base" onClick={() => {
                if (searchFor === "pickup") { setPickup(loc); setSearchFor("dropoff"); setSearchQuery(""); }
                else { setDropoff(loc); setView("confirm"); setSearchQuery(""); }
              }} data-testid={`location-${loc.name.replace(/\s+/g, '-').toLowerCase()}`}>
                <div className={`p-2 rounded-lg ${loc.rural ? "bg-orange-100" : "bg-gray-100"}`}><MapPin className={`h-4 w-4 ${loc.rural ? "text-orange-600" : ""}`} /></div>
                <div className="text-left flex-1">
                  <div className="font-medium flex items-center gap-1.5">{loc.name}{loc.rural && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600">Rural</span>}</div>
                  <div className="text-xs text-gray-500">{loc.address}</div>
                </div>
              </Button>
            ))}

            {searchQuery.length >= 3 && (
              <>
                {searchingLive && <p className="text-xs text-gray-400 text-center py-3">Searching nearby places...</p>}
                {liveSearchResults.length > 0 && (
                  <>
                    <p className="text-xs text-gray-500 uppercase font-bold mb-2 px-1 mt-4">Nearby Places</p>
                    {liveSearchResults.map((loc, i) => (
                      <Button key={`live-${i}`} variant="ghost" className="w-full justify-start h-14 rounded-xl gap-3 text-base" onClick={() => {
                        const l = { name: loc.name, address: loc.address, lat: loc.lat, lng: loc.lng, rural: false };
                        if (searchFor === "pickup") { setPickup(l); setSearchFor("dropoff"); setSearchQuery(""); }
                        else { setDropoff(l); setView("confirm"); setSearchQuery(""); }
                      }} data-testid={`live-location-${i}`}>
                        <div className="p-2 rounded-lg bg-blue-50"><Search className="h-4 w-4 text-blue-600" /></div>
                        <div className="text-left flex-1">
                          <div className="font-medium text-sm">{loc.name}</div>
                          <div className="text-[10px] text-gray-500 truncate max-w-[250px]">{loc.address}</div>
                        </div>
                      </Button>
                    ))}
                  </>
                )}
                {!searchingLive && filteredLocations.length === 0 && liveSearchResults.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-3">No locations found. Try a different search or drop a pin on the map.</p>
                )}
              </>
            )}
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
          {pendingBalance > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-start gap-2 mb-3" data-testid="pending-balance-warning">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-700">Outstanding balance: R{pendingBalance.toFixed(2)}</p>
                <p className="text-xs text-red-600">A previous card payment failed. This amount will be added to your fare.</p>
              </div>
            </div>
          )}
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

          {(rideType === "private" || rideType === "medical") && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2 font-medium">Service Tier</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { val: "standard", label: "GY Standard", desc: "Affordable", color: "bg-blue-500" },
                  { val: "premium", label: "GY Premium", desc: "Comfort+", color: "bg-yellow-400" },
                  { val: "xl", label: "GY XL", desc: "Spacious", color: "bg-purple-500" },
                ] as {val:"standard"|"premium"|"xl";label:string;desc:string;color:string}[]).map(tier => (
                  <button key={tier.val}
                    onClick={() => setPreferredCategory(tier.val)}
                    className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border-2 transition-all ${preferredCategory === tier.val ? "border-black shadow-md bg-white" : "border-gray-100 bg-white/80"}`}
                    data-testid={`tier-${tier.val}`}>
                    <div className={`${tier.color} rounded-lg w-8 h-8 flex items-center justify-center`}>
                      <Car className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-[10px] font-black leading-tight">{tier.label}</span>
                    <span className="text-[9px] text-gray-400">{tier.desc}</span>
                    {preferredCategory === tier.val && <div className="w-4 h-1 bg-black rounded-full" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isRuralTrip() && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-orange-600 shrink-0" />
              <span className="text-[11px] text-orange-700">Rural area — R{RURAL_SURCHARGE} surcharge applied for gravel road wear & fuel</span>
            </div>
          )}
          <div className="space-y-2 mb-4">
            {filteredVehicleTypes.map((vt, idx) => {
              const fare = calcFare(vt);
              const breakdown = calcFareBreakdown(vt);
              const isSelected = selectedVehicle?.id === vt.id;
              const eta = routeInfo ? Math.max(2, Math.round(routeInfo.duration * 0.3 + idx + 1)) : (3 + idx);
              return (
                <div key={vt.id}>
                  <button className={`w-full bg-white rounded-xl p-3 flex items-center justify-between border-2 transition-all ${isSelected ? "border-black shadow-md" : "border-gray-100 shadow-sm"}`}
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
                      {breakdown.minApplied && <div className="text-[10px] text-orange-500">min fare</div>}
                    </div>
                  </button>
                  {isSelected && (
                    <div className="bg-gray-50 rounded-b-xl border border-t-0 border-gray-200 px-4 py-2.5 -mt-1 space-y-1" data-testid="fare-breakdown">
                      <div className="flex justify-between text-[11px] text-gray-500"><span>Base fare</span><span>R{breakdown.baseFare}</span></div>
                      <div className="flex justify-between text-[11px] text-gray-500"><span>Distance ({calcDistance().toFixed(1)} km × R{vt.pricePerKm})</span><span>R{breakdown.distFare}</span></div>
                      <div className="flex justify-between text-[11px] text-gray-500"><span>Time ({calcDuration()} min × R{(vt.pricePerMin ?? 1.5).toFixed(1)})</span><span>R{breakdown.timeFare}</span></div>
                      {breakdown.rural > 0 && <div className="flex justify-between text-[11px] text-orange-600"><span>Rural surcharge</span><span>+R{breakdown.rural}</span></div>}
                      {breakdown.minApplied && <div className="flex justify-between text-[11px] text-orange-500"><span>Minimum fare applied</span><span>R{vt.minimumFare ?? 25}</span></div>}
                      <div className="flex justify-between text-xs font-bold pt-1 border-t border-gray-200"><span>Total</span><span>R{breakdown.total}</span></div>
                      <div className="flex justify-between text-[10px] text-green-600"><span>Driver earns (85%)</span><span>R{breakdown.driverEarns}</span></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {(["cash", "ewallet", "eft", "card"] as PaymentMethod[]).map(m => (
              <button key={m} className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold border-2 flex items-center gap-1.5 ${paymentMethod === m ? "border-yellow-400 bg-yellow-50" : "border-gray-100 bg-white"}`}
                onClick={() => setPaymentMethod(m)} data-testid={`pay-${m}`}>
                {m === "cash" ? <Banknote className="h-3.5 w-3.5" /> : m === "ewallet" ? <Wallet className="h-3.5 w-3.5" /> : m === "eft" ? <Upload className="h-3.5 w-3.5" /> : <CreditCard className="h-3.5 w-3.5 text-blue-600" />}
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

          <Button
            size="lg"
            className="w-full h-14 rounded-2xl text-lg font-bold bg-black text-white hover:bg-gray-900"
            disabled={!selectedVehicle}
            onClick={() => {
              if (!selectedVehicle) return;
              handleBookRide();
            }}
            data-testid="btn-confirm-ride"
          >
            {selectedVehicle ? `Book ${selectedVehicle.name} · R${calcFare(selectedVehicle)}` : "Select a ride"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Searching for Driver ──
  if (view === "searching") {
    const waitMins = Math.floor(searchWaitSecs / 60);
    const waitSecs = searchWaitSecs % 60;
    const waitLabel = waitMins > 0 ? `${waitMins}m ${waitSecs}s` : `${waitSecs}s`;
    return (
      <div className="min-h-[100dvh] bg-black flex flex-col">
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={handleCancelTrip} className="rounded-full bg-white/10 text-white"><X className="h-5 w-5" /></Button>
          <div className="bg-white/10 rounded-full px-3 py-1.5 flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            <span className="text-white text-xs font-bold tabular-nums">{waitLabel}</span>
          </div>
        </div>
        <div className="flex-1 relative opacity-50">
          <GiyaniMap pickup={pickup} dropoff={dropoff} className="h-full absolute inset-0" showRoute={true} />
        </div>
        <div className="bg-white rounded-t-3xl p-6 space-y-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-14 h-14 bg-yellow-400/20 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Search className="h-5 w-5 text-black animate-spin" style={{ animationDuration: "3s" }} />
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {rideType === "medical" ? "Finding medical transport" : rideType === "parcel" ? "Finding delivery driver" : "Finding your driver"}
              </h2>
              <p className="text-gray-500 text-sm">
                {onlineDrivers.length > 0
                  ? `${onlineDrivers.length} driver${onlineDrivers.length > 1 ? "s" : ""} online — waiting for acceptance`
                  : "Broadcasting your request..."}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full shrink-0" />
              <span className="truncate font-medium">{pickup?.name}</span>
            </div>
            <div className="border-l-2 border-dashed border-gray-300 ml-1 h-3" />
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2.5 h-2.5 bg-black rounded-full shrink-0" />
              <span className="truncate font-medium">{dropoff?.name}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-yellow-50 rounded-xl p-2">
              <div className="text-base font-black">R{selectedVehicle ? calcFare(selectedVehicle).toFixed(0) : "—"}</div>
              <div className="text-[10px] text-gray-500">Fare</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-2">
              <div className="text-base font-black">{calcDuration()} min</div>
              <div className="text-[10px] text-gray-500">Est. time</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-2">
              <div className="text-base font-black">{calcDistance().toFixed(1)} km</div>
              <div className="text-[10px] text-gray-500">Distance</div>
            </div>
          </div>

          {searchWaitSecs >= 60 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs text-blue-700">
              Still searching... Tap "WhatsApp" below to get a driver faster.
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 rounded-2xl h-12 text-red-500 border-red-200" onClick={handleCancelTrip} data-testid="btn-cancel-search">Cancel</Button>
            <button onClick={handleWhatsAppBooking} className="flex-1 h-12 rounded-2xl bg-green-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-700 transition-colors" data-testid="btn-whatsapp-book">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "tracking") {
    const driver = assignedDriver;
    const statusLabel = rideStatus === "on_the_way" ? "Driver on the way" : rideStatus === "arrived" ? "Driver arrived" : rideStatus === "in_progress" ? "Trip in progress" : "Finding driver...";
    const statusColor = rideStatus === "on_the_way" ? "bg-blue-100 text-blue-700" : rideStatus === "arrived" ? "bg-green-100 text-green-700" : rideStatus === "in_progress" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700";
    const etaText = tripEta ? `${tripEta} min` : `${currentTrip?.duration || calcDuration()} min`;

    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => {}} className="rounded-full bg-white shadow-md"><ChevronLeft className="h-6 w-6" /></Button>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-sm ${statusColor}`} data-testid="text-ride-status">{statusLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white shadow-md rounded-full px-3 py-1.5 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-yellow-500" />
              <span className="text-xs font-bold" data-testid="text-eta">ETA: {etaText}</span>
            </div>
            {riderOwnGps && (
              <div className="bg-blue-500 shadow-md rounded-full px-2.5 py-1.5 flex items-center gap-1.5" data-testid="rider-gps-badge">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-xs font-bold text-white">GPS Live</span>
              </div>
            )}
            <button onClick={handleSOS} className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg" data-testid="btn-sos">
              <AlertTriangle className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 relative">
          <GiyaniMap
            pickup={currentTrip ? { lat: currentTrip.pickupLat ?? -23.306, lng: currentTrip.pickupLng ?? 30.718, name: currentTrip.pickupName } : null}
            dropoff={currentTrip ? { lat: currentTrip.dropoffLat ?? -23.315, lng: currentTrip.dropoffLng ?? 30.726, name: currentTrip.dropoffName } : null}
            driverLocation={driverPos}
            riderLocation={rideStatus === "in_progress" ? riderOwnGps : null}
            className="h-full absolute inset-0"
            showRoute={true}
          />
        </div>

        <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.08)] p-5 space-y-4">

          {/* ── Trip progress stepper ── */}
          <div className="flex items-center" data-testid="trip-progress-stepper">
            {[
              { key: "on_the_way", label: "On the way" },
              { key: "arrived",    label: "At pickup" },
              { key: "in_progress", label: "Riding" },
            ].map((step, i, arr) => {
              const statusOrder: Record<string, number> = { on_the_way: 0, arrived: 1, in_progress: 2 };
              const cur = statusOrder[rideStatus] ?? 0;
              const done = i < cur;
              const active = i === cur;
              return (
                <div key={step.key} className={`flex items-center ${i < arr.length - 1 ? "flex-1" : ""}`}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${done ? "bg-green-500 text-white" : active ? "bg-black text-yellow-400" : "bg-gray-100 text-gray-400"}`}>
                      {done ? <Check className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
                    </div>
                    <span className={`text-[9px] font-semibold whitespace-nowrap ${active ? "text-black" : done ? "text-green-600" : "text-gray-400"}`}>{step.label}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className={`flex-1 h-0.5 mb-3.5 mx-1.5 transition-all ${done ? "bg-green-500" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── In-progress live banner ── */}
          {rideStatus === "in_progress" && (
            <div className="bg-black rounded-2xl px-4 py-3 flex items-center justify-between" data-testid="inprogress-banner">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-yellow-400 rounded-xl flex items-center justify-center shrink-0">
                  <Navigation className="h-5 w-5 text-black" />
                </div>
                <div>
                  <p className="text-white text-sm font-bold">Trip in progress</p>
                  <p className="text-gray-400 text-[11px]">Heading to {currentTrip?.dropoffName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-yellow-400 font-black text-lg tabular-nums" data-testid="elapsed-time">{formatElapsed(elapsedSeconds)}</p>
                <p className="text-gray-500 text-[10px]">elapsed</p>
              </div>
            </div>
          )}

          {tripPin && (
            <div className="bg-black rounded-2xl px-4 py-3" data-testid="trip-pin-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-yellow-400 font-bold uppercase tracking-wide flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> Trip Safety PIN
                </span>
                <span className="text-[10px] text-gray-400">Share only with your driver</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-3 mt-1">
                  {tripPin.split("").map((digit, i) => (
                    <div key={i} className="w-11 h-12 bg-yellow-400 rounded-xl flex items-center justify-center">
                      <span className="text-2xl font-black text-black">{digit}</span>
                    </div>
                  ))}
                </div>
                <span className="text-[10px] text-gray-400 text-right max-w-[80px]" data-testid="text-trip-pin">{tripPin}</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                {rideStatus === "arrived"
                  ? "Your driver has arrived — tell them this PIN before getting in"
                  : "When your driver arrives, tell them this PIN to verify your identity"}
              </p>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <Navigation className="h-4 w-4 text-black" />
              </div>
              <div>
                <div className="text-xs text-gray-500">{rideStatus === "in_progress" ? "Arriving in" : rideStatus === "arrived" ? "Driver is here" : "Driver arrives in"}</div>
                <div className="text-lg font-black" data-testid="text-eta-large">{rideStatus === "arrived" ? "Now" : etaText}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Distance</div>
              <div className="text-sm font-bold">{currentTrip?.distance?.toFixed(1)} km</div>
            </div>
          </div>

          {driver && (
            <div className="pb-4 border-b border-gray-100">
              <div className="flex items-center gap-4">
                {/* Driver photo — large and prominent */}
                <div className="relative shrink-0">
                  <Avatar className="h-20 w-20 border-[3px] border-yellow-400 shadow-md">
                    {(driver.profilePhotoDoc || driver.avatarUrl) && (
                      <AvatarImage
                        src={driver.profilePhotoDoc || driver.avatarUrl || ""}
                        alt={driver.fullName}
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback className="bg-yellow-400 text-black font-black text-3xl">
                      {driver.fullName[0]}
                    </AvatarFallback>
                  </Avatar>
                  {driver.isVerified && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white shadow">
                      <BadgeCheck className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="font-black text-base">{driver.fullName}</h3>
                  </div>
                  <div className="flex items-center text-sm gap-1 mb-1">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold text-black">{driver.rating?.toFixed(1)}</span>
                    <span className="text-gray-400">· {driver.totalTrips} trips</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-lg">{driver.vehicleColor} {driver.vehicleMake} {driver.vehicleModel}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 font-bold tracking-wider">{driver.licensePlate}</div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center" data-testid="btn-call-driver">
                    <Phone className="h-4 w-4 text-green-700" />
                  </button>
                  <button onClick={() => setShowChat(true)} className="w-10 h-10 bg-yellow-100 rounded-2xl flex items-center justify-center" data-testid="btn-chat-driver">
                    <MessageCircle className="h-4 w-4 text-yellow-700" />
                  </button>
                </div>
              </div>

              {/* Vehicle category badge */}
              {(driver as any).vehicleCategory && (
                <div className="mt-3">
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${(driver as any).vehicleCategory === "xl" ? "bg-purple-100 text-purple-700" : (driver as any).vehicleCategory === "premium" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`} data-testid="tracking-driver-category">
                    {(driver as any).vehicleCategory === "xl" ? "GY XL" : (driver as any).vehicleCategory === "premium" ? "GY Premium" : "GY Standard"}
                  </span>
                </div>
              )}
            </div>
          )}

          {showChat && currentTrip && assignedDriver && (
            <TripChat
              tripId={currentTrip.id}
              userId={user.id}
              userRole="rider"
              otherName={assignedDriver.fullName}
              onClose={() => setShowChat(false)}
            />
          )}

          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 flex-1"><div className="w-2 h-2 bg-green-500 rounded-full" /><span className="truncate">{currentTrip?.pickupName}</span></div>
            <span className="text-gray-300">→</span>
            <div className="flex items-center gap-2 flex-1"><div className="w-2 h-2 bg-black rounded-full" /><span className="truncate">{currentTrip?.dropoffName}</span></div>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <div className="text-2xl font-bold">R{currentTrip?.fare}</div>
              <div className="text-xs text-gray-500">{paymentLabel(paymentMethod)} · {currentTrip?.duration || calcDuration()} min trip</div>
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
    const isCash = currentTrip?.paymentMethod === "cash";
    const isCard = currentTrip?.paymentMethod === "card";
    const isPaid = currentTrip?.paymentStatus === "paid" || cardCharged;
    const fare = currentTrip?.fare ?? 0;

    return (
      <div className="min-h-[100dvh] bg-white flex flex-col p-6 overflow-y-auto">
        <div className="w-full max-w-sm mx-auto">

          {/* ── Payment section — top and prominent ── */}
          <div className="mb-6">
            {/* Arrival celebration header */}
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Navigation className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-0.5">
                {currentTrip?.rideType === "parcel" ? "Parcel Delivered!" : currentTrip?.rideType === "medical" ? "Medical Trip Complete!" : "You've arrived!"}
              </h2>
              <p className="text-gray-500 text-sm">
                {currentTrip?.rideType === "parcel" ? "Your parcel has been delivered safely" : `Welcome to ${currentTrip?.dropoffName}`}
              </p>
            </div>

            {/* Big payment card */}
            {isCash && !isPaid && (
              <div className="bg-black rounded-3xl p-5 text-center mb-4" data-testid="payment-due-card">
                <p className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-1">Amount due</p>
                <p className="text-white text-5xl font-black mb-1" data-testid="fare-amount">R{fare}</p>
                <p className="text-gray-400 text-sm mb-4">Pay this amount in cash to your driver</p>
                <div className="flex items-center justify-center gap-2 bg-yellow-400 rounded-2xl py-3 px-4">
                  <Banknote className="h-5 w-5 text-black" />
                  <span className="text-black font-bold text-base">Pay R{fare} cash to driver</span>
                </div>
              </div>
            )}

            {isCash && isPaid && (
              <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-5 text-center mb-4" data-testid="payment-confirmed-card">
                <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                <p className="text-green-700 font-black text-xl mb-0.5">R{fare} paid</p>
                <p className="text-green-600 text-sm">Cash payment confirmed by driver</p>
              </div>
            )}

            {isCard && !isPaid && (
              <div className="mb-4">
                <div className="bg-black rounded-3xl p-5 text-center mb-3" data-testid="payment-due-card">
                  <p className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-1">Amount due</p>
                  <p className="text-white text-5xl font-black mb-1" data-testid="fare-amount">R{fare}</p>
                  <p className="text-gray-400 text-sm">Pay with your card now</p>
                </div>
                <button
                  className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base flex items-center justify-center gap-2 transition-colors"
                  data-testid="btn-pay-yoco"
                  onClick={() => {
                    if (!currentTrip) return;
                    handleYocoVerify(currentTrip.fare || 0, () => {
                      if (currentTrip?.id) updateTrip(currentTrip.id, { paymentStatus: "paid" as any }).catch(() => {});
                    }, currentTrip?.id);
                  }}
                >
                  <CreditCard className="h-5 w-5" />
                  Pay R{fare} with Yoco
                </button>
              </div>
            )}

            {isCard && isPaid && (
              <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-5 text-center mb-4" data-testid="payment-confirmed-card">
                <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                <p className="text-green-700 font-black text-xl mb-0.5">R{fare} paid by card</p>
                <p className="text-green-600 text-sm">Payment confirmed</p>
              </div>
            )}
          </div>

          {/* ── Trip summary ── */}
          <div className="bg-gray-50 rounded-2xl p-5 mb-6 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-gray-500">From</span><span className="font-medium">{currentTrip?.pickupName}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">To</span><span className="font-medium">{currentTrip?.dropoffName}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Distance</span><span className="font-medium">{currentTrip?.distance?.toFixed(1)} km</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Duration</span><span className="font-medium">{currentTrip?.duration} min</span></div>
            {currentTrip?.rideType && currentTrip.rideType !== "private" && (
              <div className="flex justify-between text-sm"><span className="text-gray-500">Type</span><span className="font-medium capitalize">{currentTrip.rideType}</span></div>
            )}
            <div className="flex justify-between text-sm border-t pt-3 border-gray-200"><span className="text-gray-500">Fare</span><span className="text-xl font-bold">R{fare}</span></div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-500">Payment</span>
              <span className="font-medium text-green-600 capitalize">{currentTrip?.paymentMethod === "card" ? "Yoco (card)" : currentTrip?.paymentMethod || "Cash"}</span>
            </div>
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

          {assignedDriver && !tipCharged && (
            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <p className="text-sm font-semibold text-center text-gray-700 mb-3">
                Add a tip for {assignedDriver.fullName.split(" ")[0]}
              </p>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[5, 10, 20, 50].map(amt => (
                  <button
                    key={amt}
                    data-testid={`tip-preset-${amt}`}
                    className={`h-10 rounded-xl text-sm font-bold border-2 transition-all ${tipAmount === amt ? "bg-yellow-400 border-yellow-400 text-black" : "bg-white border-gray-200 text-gray-700"}`}
                    onClick={() => { setTipAmount(tipAmount === amt ? 0 : amt); setCustomTipInput(""); }}
                  >
                    R{amt}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mb-3">
                <input
                  type="number"
                  placeholder="Custom amount (R)"
                  value={customTipInput}
                  min={1}
                  data-testid="input-custom-tip"
                  onChange={e => { setCustomTipInput(e.target.value); setTipAmount(parseFloat(e.target.value) || 0); }}
                  className="flex-1 h-10 rounded-xl border-2 border-gray-200 px-3 text-sm outline-none focus:border-yellow-400"
                />
              </div>
              {tipAmount > 0 && (
                <button
                  data-testid="btn-send-tip"
                  disabled={tipSubmitting}
                  className="w-full h-11 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-sm transition-colors disabled:opacity-60"
                  onClick={async () => {
                    if (currentTrip?.paymentMethod === "card") {
                      handleYocoVerify(tipAmount, () => {
                        setTipCharged(true);
                        toast({ title: `Tip sent!`, description: `R${tipAmount} tip sent to ${assignedDriver.fullName.split(" ")[0]} via card.` });
                      });
                    } else {
                      setTipSubmitting(true);
                      await new Promise(r => setTimeout(r, 400));
                      setTipCharged(true);
                      setTipSubmitting(false);
                      toast({ title: "Tip noted!", description: `Please hand R${tipAmount} cash to ${assignedDriver.fullName.split(" ")[0]}.` });
                    }
                  }}
                >
                  {tipSubmitting ? "Processing..." : currentTrip?.paymentMethod === "card" ? `Pay R${tipAmount} tip with Yoco` : `Give R${tipAmount} cash tip`}
                </button>
              )}
            </div>
          )}

          {tipCharged && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-yellow-600 shrink-0" />
              <span className="text-sm font-semibold text-yellow-800">Tip of R{tipAmount} sent — thank you!</span>
            </div>
          )}

          <div className="space-y-3">
            <Button className="w-full h-14 rounded-2xl bg-black text-white hover:bg-gray-900 font-bold text-lg" onClick={handleSubmitRating} data-testid="btn-submit-rating">
              {driverRating > 0 ? `Submit ${driverRating}-Star Rating` : "Done"}
            </Button>
            {pendingBalance > 0 && currentTrip?.paymentMethod === "card" && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-orange-800">Outstanding balance: R{pendingBalance.toFixed(2)}</p>
                  <p className="text-xs text-orange-700 mt-0.5">Your card payment failed. Please pay your driver cash — they will confirm receipt on their app and your receipt will be ready.</p>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-2xl text-sm gap-2"
                disabled={downloadingReceipt}
                data-testid="btn-download-receipt"
                onClick={async () => {
                  if (!currentTrip) return;
                  setDownloadingReceipt(true);
                  try {
                    const receiptData = await getTripReceipt(currentTrip.id);
                    await generateReceiptPDF(receiptData);
                    toast({ title: "Receipt downloaded!", description: "Check your downloads folder." });
                  } catch (err: any) {
                    toast({ title: "Download failed", description: err.message || "Could not generate receipt.", variant: "destructive" });
                  } finally {
                    setDownloadingReceipt(false);
                  }
                }}
              >
                <Download className="h-4 w-4" />
                {downloadingReceipt ? "Generating..." : "Receipt PDF"}
              </Button>
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
        <img src="/gy-logo.png" alt="GY Rides" className="h-9 w-9 object-contain" />
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
          <div className="flex gap-2">
            <button className="flex-1 bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 flex items-center gap-3 text-left" onClick={() => { setSearchFor("pickup"); setView("search"); }} data-testid="btn-set-pickup">
              <div className="bg-green-500 p-2.5 rounded-xl"><Crosshair className="h-4 w-4 text-white" /></div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{pickup ? pickup.name : "Set pickup"}</div>
                <div className="text-xs text-gray-500 truncate">{pickup ? pickup.address : "Tap to choose location"}</div>
              </div>
              {pickup && <div className="w-2.5 h-2.5 bg-green-500 rounded-full shrink-0" />}
            </button>
            <button
              className="bg-blue-500 hover:bg-blue-600 rounded-2xl p-3.5 shadow-sm flex items-center justify-center transition-colors disabled:opacity-50"
              onClick={() => useCurrentLocation("pickup")}
              disabled={locatingGPS}
              data-testid="btn-gps-pickup"
              title="Use GPS location"
            >
              <LocateFixed className={`h-5 w-5 text-white ${locatingGPS ? "animate-pulse" : ""}`} />
            </button>
          </div>

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
                  const dest = matchedSaved ? { name: matchedSaved.name, address: matchedSaved.address, lat: matchedSaved.lat ?? -23.31, lng: matchedSaved.lng ?? 30.72, rural: false }
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
                  setDropoff({ name: p.name, address: p.address, lat: p.lat ?? -23.31, lng: p.lng ?? 30.72, rural: false });
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
