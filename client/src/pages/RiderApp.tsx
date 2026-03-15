import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { MapPin, Search, Clock, CreditCard, ChevronLeft, Star, Home as HomeIcon, Briefcase, ShoppingBag, User, History, BookmarkPlus, Car, LogOut, Menu, X, Navigation, Share2, Crosshair, Phone, MessageCircle, Shield, AlertTriangle, Edit2, Tag, StickyNote, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { createTrip, updateTrip } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import GiyaniMap from "@/components/GiyaniMap";
import type { Trip, SavedPlace, VehicleType, User as UserType } from "@shared/schema";

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
];

const QUICK_DESTINATIONS = [
  { name: "Home", icon: "home" },
  { name: "Work", icon: "briefcase" },
  { name: "Hospital", icon: "hospital" },
  { name: "Mall", icon: "shopping" },
  { name: "Taxi Rank", icon: "taxi" },
];

function generateTripPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function RiderApp() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<"home" | "search" | "pickmap" | "confirm" | "searching" | "tracking" | "completed" | "history" | "profile" | "menu">("home");
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

  if (!user) return null;

  const calcDistance = () => {
    if (!pickup || !dropoff) return 3;
    return Math.sqrt(Math.pow((pickup.lat - dropoff.lat) * 111, 2) + Math.pow((pickup.lng - dropoff.lng) * 111 * Math.cos(pickup.lat * Math.PI / 180), 2));
  };

  const calcFare = (vt: VehicleType) => {
    return Math.round(vt.basePrice + vt.pricePerKm * calcDistance());
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
        paymentMethod: "cash",
        status: "requested",
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
    setView("home");
    toast({ title: "Trip completed!", description: "Thanks for riding with GY Rides" });
  };

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`);
      const data = await res.json();
      if (data.display_name) {
        return data.display_name.split(",").slice(0, 3).join(",").trim();
      }
    } catch {}
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }, []);

  const handlePinDrop = useCallback((lat: number, lng: number) => {
    setPinDrop({ lat, lng });
  }, []);

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

  const handleSOS = () => {
    toast({ title: "SOS Alert Sent", description: "Emergency contacts have been notified with your location" });
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
      case "hospital": return <Shield className="h-5 w-5" />;
      case "shopping": return <ShoppingBag className="h-5 w-5" />;
      case "taxi": return <Car className="h-5 w-5" />;
      default: return <MapPin className="h-5 w-5" />;
    }
  };

  const BottomNav = () => (
    <div className="bg-white border-t border-gray-100 px-4 py-2 flex justify-around items-center safe-area-bottom" data-testid="bottom-nav">
      <button className={`flex flex-col items-center gap-1 py-1 px-3 ${activeTab === "home" ? "text-black" : "text-gray-400"}`} onClick={() => { setActiveTab("home"); setView("home"); }} data-testid="tab-home">
        <HomeIcon className="h-5 w-5" />
        <span className="text-[10px] font-medium">Home</span>
      </button>
      <button className={`flex flex-col items-center gap-1 py-1 px-3 ${activeTab === "activity" ? "text-black" : "text-gray-400"}`} onClick={() => { setActiveTab("activity"); setView("history"); }} data-testid="tab-activity">
        <Clock className="h-5 w-5" />
        <span className="text-[10px] font-medium">Activity</span>
      </button>
      <button className={`flex flex-col items-center gap-1 py-1 px-3 ${activeTab === "profile" ? "text-black" : "text-gray-400"}`} onClick={() => { setActiveTab("profile"); setView("profile"); }} data-testid="tab-profile">
        <User className="h-5 w-5" />
        <span className="text-[10px] font-medium">Profile</span>
      </button>
    </div>
  );

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
            { icon: <BookmarkPlus className="h-5 w-5" />, label: "Saved Places", action: () => setView("profile") },
            { icon: <CreditCard className="h-5 w-5" />, label: "Payment Methods", action: () => toast({ title: "Coming Soon", description: "Card payments will be available soon" }) },
            { icon: <Shield className="h-5 w-5" />, label: "Safety", action: () => toast({ title: "Safety Center", description: "Emergency contacts and safety settings" }) },
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
                  setView("confirm");
                }
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="text-sm text-gray-500">{trip.createdAt ? new Date(trip.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : ""}</div>
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
            <Input
              placeholder="Search Giyani locations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-14 pl-12 rounded-2xl bg-gray-100 border-none text-lg"
              autoFocus
              data-testid="input-search-location"
            />
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
          <h1 className="text-xl font-bold">Confirm Ride</h1>
        </div>

        <div className="relative h-44 overflow-hidden">
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
                <div className="text-[10px] text-gray-500">Est. Duration</div>
              </div>
              <div className="flex-1 text-center">
                <div className="text-sm font-bold text-green-600">Cash</div>
                <div className="text-[10px] text-gray-500">Payment</div>
              </div>
            </div>
          </div>

          <h3 className="font-bold text-base mb-2">Choose your ride</h3>
          <div className="space-y-2 mb-4">
            {vehicleTypes.map((vt) => {
              const fare = calcFare(vt);
              const isSelected = selectedVehicle?.id === vt.id;
              const eta = Math.round(Math.random() * 4 + 2);
              return (
                <button key={vt.id} className={`w-full bg-white rounded-xl p-3 flex items-center justify-between border-2 transition-all ${isSelected ? "border-black shadow-md" : "border-gray-100 shadow-sm"}`}
                  onClick={() => setSelectedVehicle(vt)} data-testid={`vehicle-${vt.name.replace(/\s+/g, '-').toLowerCase()}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? "bg-black" : "bg-gray-100"}`}>
                      <Car className={`h-5 w-5 ${isSelected ? "text-yellow-400" : "text-gray-600"}`} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm">{vt.name}</div>
                      <div className="text-[10px] text-gray-500">{vt.seats} seats · {eta} min away</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">R{fare}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-2 mb-4">
            <div className="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3">
              <StickyNote className="h-4 w-4 text-gray-400 shrink-0" />
              <input
                placeholder="Add a note (e.g., Call when you arrive)"
                value={rideNote}
                onChange={e => setRideNote(e.target.value)}
                className="flex-1 text-sm outline-none bg-transparent"
                data-testid="input-ride-note"
              />
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3">
              <Tag className="h-4 w-4 text-gray-400 shrink-0" />
              <input
                placeholder="Promo code"
                value={promoCode}
                onChange={e => setPromoCode(e.target.value)}
                className="flex-1 text-sm outline-none bg-transparent"
                data-testid="input-promo-code"
              />
              {promoCode && <button className="text-xs font-bold text-yellow-600">Apply</button>}
            </div>
          </div>

          <Button size="lg" className="w-full h-14 rounded-2xl text-lg font-bold bg-black text-white hover:bg-gray-900" disabled={!selectedVehicle} onClick={handleBookRide} data-testid="btn-confirm-ride">
            {selectedVehicle ? `Book ${selectedVehicle.name} · R${calcFare(selectedVehicle)}` : "Select a ride"}
          </Button>
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
              <h2 className="text-xl font-bold">Finding your driver</h2>
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
                <h3 className="font-bold">{driver.fullName}</h3>
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
              <div className="text-xs text-gray-500">Cash · {currentTrip?.duration || calcDuration()} min</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1 h-12 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 font-bold text-sm" variant="ghost" onClick={handleCancelTrip} data-testid="btn-cancel-ride">Cancel</Button>
            <Button variant="outline" className="h-12 px-4 rounded-2xl font-bold text-sm gap-2" onClick={handleShareLocation} data-testid="btn-share-trip">
              <Share2 className="h-4 w-4" /> Share
            </Button>
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
            <h2 className="text-2xl font-bold mb-1">Trip Complete!</h2>
            <p className="text-gray-500">You've arrived at your destination</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-5 mb-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">From</span><span className="font-medium">{currentTrip?.pickupName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">To</span><span className="font-medium">{currentTrip?.dropoffName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Distance</span><span className="font-medium">{currentTrip?.distance?.toFixed(1)} km</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Duration</span><span className="font-medium">{currentTrip?.duration} min</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-3 border-gray-200">
              <span className="text-gray-500">Fare</span><span className="text-xl font-bold">R{currentTrip?.fare}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Payment</span><span className="font-medium text-green-600">Cash</span>
            </div>
          </div>

          {assignedDriver && (
            <div className="mb-6">
              <p className="text-center text-gray-500 mb-3">Rate your driver</p>
              <div className="flex items-center justify-center gap-4 mb-3">
                <Avatar className="h-12 w-12 border-2 border-yellow-400">
                  <AvatarFallback className="bg-yellow-400 text-black font-bold">{assignedDriver.fullName[0]}</AvatarFallback>
                </Avatar>
                <span className="font-bold">{assignedDriver.fullName}</span>
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
              }} data-testid="btn-download-receipt">
                <Download className="h-4 w-4" /> Receipt
              </Button>
              <Button variant="outline" className="flex-1 h-12 rounded-2xl text-sm gap-2" onClick={() => {
                setView("confirm");
              }} data-testid="btn-rebook">
                <RotateCcw className="h-4 w-4" /> Rebook
              </Button>
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
              <div className="font-bold">Where to?</div>
              <div className="text-xs text-gray-500">Enter your destination</div>
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
                  <div className="font-medium text-xs">{p.name}</div>
                  <div className="text-[10px] text-gray-500 truncate w-full">{p.address}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-sm">Recent Trips</h3>
            <Button variant="link" className="text-black font-bold p-0 h-auto text-xs" onClick={() => setView("history")}>See All</Button>
          </div>
          <div className="space-y-2">
            {tripHistory.slice(0, 3).map((trip) => (
              <button key={trip.id} className="w-full text-left bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3" data-testid={`recent-trip-${trip.id}`} onClick={() => {
                const loc = GIYANI_LOCATIONS.find(l => l.name === trip.dropoffName);
                if (loc) { setDropoff(loc); if (!pickup) setPickup(GIYANI_LOCATIONS[2]); setView("confirm"); }
              }}>
                <div className="bg-gray-100 p-2 rounded-lg"><Navigation className="h-4 w-4 text-gray-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{trip.dropoffName}</div>
                  <div className="text-[10px] text-gray-500">{trip.pickupName} · R{trip.fare}</div>
                </div>
                <RotateCcw className="h-3.5 w-3.5 text-gray-300 shrink-0" />
              </button>
            ))}
            {tripHistory.length === 0 && (
              <div className="text-center py-6 text-gray-400">
                <p className="text-sm">No trips yet. Book your first ride!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
