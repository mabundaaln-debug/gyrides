import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { MapPin, Search, Clock, CreditCard, ChevronLeft, Star, Home as HomeIcon, Briefcase, ShoppingBag, User, History, BookmarkPlus, Car, LogOut, Menu, X, Navigation, Share2, Crosshair, Phone, MessageCircle, Shield, AlertTriangle, Edit2, Tag, StickyNote, RotateCcw, Download, Users, Package, Heart, Bus, Banknote, Wallet, Upload, CheckCircle, UserPlus, Minus, Plus, BadgeCheck, LocateFixed } from "lucide-react";
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
  { name: "Masingita Mall", address: "R81 Main Road, Giyani", lat: -23.2993, lng: 30.6844 },
  { name: "Giyani CBD", address: "Central Business District, Giyani", lat: -23.3153, lng: 30.7256 },
  { name: "Section A", address: "Giyani Section A", lat: -23.3060, lng: 30.7180 },
  { name: "Section B", address: "Giyani Section B", lat: -23.3010, lng: 30.7310 },
  { name: "Section C", address: "Giyani Section C", lat: -23.3200, lng: 30.7100 },
  { name: "Section D", address: "Giyani Section D", lat: -23.2930, lng: 30.7390 },
  { name: "Section E", address: "Giyani Section E", lat: -23.2870, lng: 30.7280 },
  { name: "Giyani Hospital", address: "Hospital Road, Giyani", lat: -23.3180, lng: 30.7140 },
  { name: "Giyani Plaza", address: "Main Street, Giyani", lat: -23.3096, lng: 30.6926 },
  { name: "Giyani Stadium", address: "Stadium Road, Giyani", lat: -23.3222, lng: 30.7191 },
  { name: "Giyani Taxi Rank", address: "Main Taxi Rank, CBD", lat: -23.3140, lng: 30.7230 },
  { name: "Thohoyandou Road", address: "R81 Highway Exit", lat: -23.2750, lng: 30.7500 },
  { name: "Giyani Clinic", address: "Section B Clinic, Giyani", lat: -23.3030, lng: 30.7340 },
  { name: "Nkhensani Hospital", address: "Nkhensani Hospital Complex", lat: -23.3170, lng: 30.7170 },
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
  const [locatingGPS, setLocatingGPS] = useState(false);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [tripEta, setTripEta] = useState<number | null>(null);
  const [tripStartTime, setTripStartTime] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          if (data.display_name) {
            const parts = data.display_name.split(",");
            name = parts.slice(0, 2).join(",").trim();
            address = parts.slice(0, 3).join(",").trim();
          }
        } catch {}
        const loc = { name, address, lat: latitude, lng: longitude };
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

  useEffect(() => {
    if (view !== "tracking" || !currentTrip || !assignedDriver) return;

    const pLat = currentTrip.pickupLat ?? -23.306;
    const pLng = currentTrip.pickupLng ?? 30.718;
    const dLat = currentTrip.dropoffLat ?? -23.315;
    const dLng = currentTrip.dropoffLng ?? 30.726;

    let startLat: number, startLng: number, endLat: number, endLng: number;

    if (rideStatus === "on_the_way") {
      startLat = pLat + 0.008;
      startLng = pLng - 0.006;
      endLat = pLat;
      endLng = pLng;
      setTripEta(prev => prev ?? (currentTrip.duration ?? 5));
    } else if (rideStatus === "in_progress") {
      startLat = pLat;
      startLng = pLng;
      endLat = dLat;
      endLng = dLng;
      setTripStartTime(prev => prev ?? Date.now());
    } else {
      setDriverPos({ lat: pLat, lng: pLng });
      return;
    }

    let step = 0;
    const totalSteps = 40;
    const interval = setInterval(() => {
      step++;
      const progress = Math.min(step / totalSteps, 1);
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const lat = startLat + (endLat - startLat) * eased;
      const lng = startLng + (endLng - startLng) * eased;
      setDriverPos({ lat, lng });

      const totalDur = currentTrip.duration ?? 5;
      if (rideStatus === "on_the_way") {
        setTripEta(Math.max(1, Math.round(totalDur * (1 - progress) * 0.4)));
      } else if (rideStatus === "in_progress") {
        setTripEta(Math.max(1, Math.round(totalDur * (1 - progress))));
      }

      if (step >= totalSteps) clearInterval(interval);
    }, 2000);

    return () => clearInterval(interval);
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

  const calcFare = (vt: VehicleType) => {
    let fare = Math.round(vt.basePrice + vt.pricePerKm * calcDistance());
    if (rideType === "shared") fare = Math.round(fare * 0.6 * sharedSeats);
    return fare;
  };

  const calcDuration = () => {
    if (routeInfo) return routeInfo.duration;
    return Math.round(calcDistance() * 2.5 + 3);
  };

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
            {filteredVehicleTypes.map((vt, idx) => {
              const fare = calcFare(vt);
              const isSelected = selectedVehicle?.id === vt.id;
              const eta = routeInfo ? Math.max(2, Math.round(routeInfo.duration * 0.3 + idx + 1)) : (3 + idx);
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
