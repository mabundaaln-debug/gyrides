import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MapPin, Search, Clock, CreditCard, ChevronLeft, Star, Home as HomeIcon, Briefcase, ShoppingBag, User, History, BookmarkPlus, Car, LogOut, Menu, X, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { createTrip, updateTrip } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { Trip, SavedPlace, VehicleType, User as UserType } from "@shared/schema";

const GIYANI_LOCATIONS = [
  { name: "Masingita Mall", address: "Main Road, Giyani", lat: -23.30, lng: 30.73 },
  { name: "Giyani CBD", address: "Central Business District", lat: -23.32, lng: 30.71 },
  { name: "Section A", address: "Giyani Section A", lat: -23.31, lng: 30.72 },
  { name: "Section B", address: "Giyani Section B", lat: -23.29, lng: 30.74 },
  { name: "Section C", address: "Giyani Section C", lat: -23.33, lng: 30.70 },
  { name: "Section D", address: "Giyani Section D", lat: -23.28, lng: 30.75 },
  { name: "Giyani Hospital", address: "Hospital Road", lat: -23.315, lng: 30.715 },
  { name: "Giyani Plaza", address: "Plaza Street", lat: -23.325, lng: 30.725 },
  { name: "Giyani Stadium", address: "Stadium Road", lat: -23.305, lng: 30.735 },
  { name: "Thohoyandou Road", address: "R81 Highway", lat: -23.27, lng: 30.76 },
];

export default function RiderApp() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<"home" | "search" | "confirm" | "searching" | "tracking" | "history" | "profile" | "menu">("home");
  const [pickup, setPickup] = useState<typeof GIYANI_LOCATIONS[0] | null>(null);
  const [dropoff, setDropoff] = useState<typeof GIYANI_LOCATIONS[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFor, setSearchFor] = useState<"pickup" | "dropoff">("dropoff");
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(null);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [assignedDriver, setAssignedDriver] = useState<UserType | null>(null);
  const queryClient = useQueryClient();

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

  const calcFare = (vt: VehicleType) => {
    const dist = pickup && dropoff ? Math.sqrt(Math.pow((pickup.lat - dropoff.lat) * 111, 2) + Math.pow((pickup.lng - dropoff.lng) * 111 * Math.cos(pickup.lat * Math.PI / 180), 2)) : 3;
    return Math.round(vt.basePrice + vt.pricePerKm * dist);
  };

  const filteredLocations = GIYANI_LOCATIONS.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.address.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleBookRide = async () => {
    if (!pickup || !dropoff || !selectedVehicle || !user) return;
    setView("searching");

    try {
      const driver = onlineDrivers[0];
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
        distance: Math.sqrt(Math.pow((pickup.lat - dropoff.lat) * 111, 2) + Math.pow((pickup.lng - dropoff.lng) * 111 * Math.cos(pickup.lat * Math.PI / 180), 2)),
        duration: Math.round(Math.random() * 10 + 5),
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
        }
        setView("tracking");
      }, 2500);
    } catch (err) {
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
    setView("home");
    queryClient.invalidateQueries({ queryKey: ["/api/trips/rider"] });
  };

  const iconForPlace = (icon: string | null) => {
    switch (icon) {
      case "home": return <HomeIcon className="h-4 w-4" />;
      case "briefcase": return <Briefcase className="h-4 w-4" />;
      case "shopping-bag": return <ShoppingBag className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

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

        <div className="flex-1 p-4 space-y-2">
          {[
            { icon: <HomeIcon className="h-5 w-5" />, label: "Home", action: () => setView("home") },
            { icon: <History className="h-5 w-5" />, label: "Trip History", action: () => setView("history") },
            { icon: <BookmarkPlus className="h-5 w-5" />, label: "Saved Places", action: () => setView("profile") },
            { icon: <CreditCard className="h-5 w-5" />, label: "Payment Methods", action: () => {} },
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
        <div className="flex-1 p-4 space-y-3 overflow-auto">
          {tripHistory.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Car className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="font-medium">No trips yet</p>
              <p className="text-sm">Your completed rides will appear here</p>
            </div>
          ) : tripHistory.map((trip) => (
            <div key={trip.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100" data-testid={`trip-history-${trip.id}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="text-sm text-gray-500">{trip.createdAt ? new Date(trip.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : ""}</div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${trip.status === "completed" ? "bg-green-100 text-green-700" : trip.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {trip.status}
                </span>
              </div>
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="font-medium">{trip.pickupName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-black rounded-full" />
                  <span className="font-medium">{trip.dropoffName}</span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{trip.vehicleType}</span>
                <span className="font-bold">R{trip.fare}</span>
              </div>
            </div>
          ))}
        </div>
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
        <div className="p-6">
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
          <div className="space-y-2">
            {savedPlaces.map((p) => (
              <div key={p.id} className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border border-gray-100">
                <div className="bg-gray-100 p-2 rounded-xl">{iconForPlace(p.icon)}</div>
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.address}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
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

  // ── Confirm Ride ──
  if (view === "confirm") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => { setView("home"); setDropoff(null); }} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Confirm Ride</h1>
        </div>

        <div className="bg-gradient-to-b from-green-50 to-gray-50 p-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 pt-1">
                <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-green-200" />
                <div className="w-0.5 h-8 bg-gray-200" />
                <div className="w-3 h-3 bg-black rounded-full border-2 border-gray-300" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <div className="text-xs text-gray-500 uppercase">Pickup</div>
                  <div className="font-bold">{pickup?.name || "Current Location"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Drop-off</div>
                  <div className="font-bold">{dropoff?.name}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 px-6 pb-6">
          <h3 className="font-bold text-lg mb-3">Choose your ride</h3>
          <div className="space-y-3">
            {vehicleTypes.map((vt) => {
              const fare = calcFare(vt);
              const isSelected = selectedVehicle?.id === vt.id;
              return (
                <button
                  key={vt.id}
                  className={`w-full bg-white rounded-2xl p-4 flex items-center justify-between border-2 transition-all ${isSelected ? "border-black shadow-md" : "border-gray-100 shadow-sm"}`}
                  onClick={() => setSelectedVehicle(vt)}
                  data-testid={`vehicle-${vt.name.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isSelected ? "bg-black" : "bg-gray-100"}`}>
                      <Car className={`h-6 w-6 ${isSelected ? "text-yellow-400" : "text-gray-600"}`} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">{vt.name}</div>
                      <div className="text-xs text-gray-500">{vt.description} · {vt.seats} seats</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">R{fare}</div>
                    <div className="text-xs text-gray-500">{Math.round(Math.random() * 5 + 3)} min</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-6 px-2">
            <div className="flex items-center gap-2 text-gray-600">
              <CreditCard className="h-5 w-5" />
              <span className="font-medium">Cash</span>
            </div>
            <Button variant="link" className="text-black font-bold p-0">Change</Button>
          </div>

          <Button
            size="lg"
            className="w-full h-16 rounded-2xl text-lg font-bold mt-6 bg-black hover:bg-gray-900"
            disabled={!selectedVehicle}
            onClick={handleBookRide}
            data-testid="btn-confirm-ride"
          >
            {selectedVehicle ? `Confirm ${selectedVehicle.name} · R${calcFare(selectedVehicle)}` : "Select a ride"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Searching for Driver ──
  if (view === "searching") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-yellow-400/20 rounded-full flex items-center justify-center mb-8 animate-pulse">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center shadow-lg">
            <Search className="h-7 w-7 text-yellow-400 animate-spin" style={{ animationDuration: "3s" }} />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">Finding your driver</h2>
        <p className="text-gray-500 mb-8">Connecting to nearby drivers in Giyani...</p>
        <Button variant="outline" className="rounded-2xl h-12 px-8 text-red-500 border-red-200" onClick={handleCancelTrip}>
          Cancel
        </Button>
      </div>
    );
  }

  // ── Tracking ──
  if (view === "tracking") {
    const driver = assignedDriver;
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-green-50 to-gray-50 flex flex-col">
        <div className="p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleCancelTrip} className="rounded-full bg-white shadow-sm"><ChevronLeft className="h-6 w-6" /></Button>
          <span className="font-bold text-lg">Your Ride</span>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 relative">
          <div className="text-center">
            <div className="w-16 h-16 bg-black rounded-full mx-auto mb-4 flex items-center justify-center shadow-xl animate-bounce" style={{ animationDuration: "2s" }}>
              <Car className="h-8 w-8 text-yellow-400" />
            </div>
            <div className="bg-white rounded-2xl px-6 py-3 shadow-sm border inline-block">
              <p className="font-bold text-green-600">Driver is on the way</p>
              <p className="text-sm text-gray-500">Arriving in ~{Math.round(Math.random() * 5 + 2)} minutes</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.08)] p-6 space-y-5">
          {driver && (
            <div className="flex items-center gap-4 pb-5 border-b border-gray-100">
              <Avatar className="h-14 w-14 border-2 border-yellow-400">
                <AvatarFallback className="bg-yellow-400 text-black font-bold text-xl">{driver.fullName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{driver.fullName}</h3>
                <div className="flex items-center text-sm text-gray-500 gap-1">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium text-black">{driver.rating?.toFixed(1)}</span>
                  · {driver.totalTrips} trips
                </div>
              </div>
              <div className="bg-gray-100 rounded-xl px-3 py-2 text-center">
                <div className="text-sm font-bold">{driver.licensePlate}</div>
                <div className="text-xs text-gray-500">{driver.vehicleColor} {driver.vehicleModel}</div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
              <span>{currentTrip?.pickupName}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2.5 h-2.5 bg-black rounded-full" />
              <span>{currentTrip?.dropoffName}</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <div>
              <div className="text-2xl font-bold">R{currentTrip?.fare}</div>
              <div className="text-xs text-gray-500">Cash payment</div>
            </div>
          </div>

          <Button className="w-full h-14 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 font-bold text-base" variant="ghost" onClick={handleCancelTrip} data-testid="btn-cancel-ride">
            Cancel Ride
          </Button>
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

      <div className="px-6 pt-4 pb-6">
        <h2 className="text-2xl font-bold mb-1">Hi, {user.fullName.split(" ")[0]}!</h2>
        <p className="text-gray-500">Where are you heading?</p>
      </div>

      <div className="px-6 mb-6">
        <button
          className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 text-left"
          onClick={() => { setSearchFor("dropoff"); setPickup(GIYANI_LOCATIONS[2]); setView("search"); }}
          data-testid="btn-where-to"
        >
          <div className="bg-black p-3 rounded-xl">
            <Search className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <div className="font-bold text-lg">Where to?</div>
            <div className="text-sm text-gray-500">Enter your destination</div>
          </div>
        </button>
      </div>

      {savedPlaces.length > 0 && (
        <div className="px-6 mb-6">
          <h3 className="font-bold mb-3">Saved Places</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {savedPlaces.map((p) => (
              <button
                key={p.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex-shrink-0 min-w-[140px] flex flex-col items-start gap-2"
                onClick={() => { setDropoff({ name: p.name, address: p.address, lat: p.lat ?? -23.31, lng: p.lng ?? 30.72 }); setPickup(GIYANI_LOCATIONS[2]); setView("confirm"); }}
              >
                <div className="bg-gray-100 p-2 rounded-xl">{iconForPlace(p.icon)}</div>
                <div className="font-medium text-sm">{p.name}</div>
                <div className="text-xs text-gray-500 truncate w-full">{p.address}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-6 flex-1">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold">Recent Trips</h3>
          <Button variant="link" className="text-black font-bold p-0 h-auto" onClick={() => setView("history")}>See All</Button>
        </div>
        <div className="space-y-3">
          {tripHistory.slice(0, 3).map((trip) => (
            <div key={trip.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4" data-testid={`recent-trip-${trip.id}`}>
              <div className="bg-gray-100 p-2.5 rounded-xl">
                <Navigation className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{trip.dropoffName}</div>
                <div className="text-xs text-gray-500">{trip.pickupName} · R{trip.fare}</div>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${trip.status === "completed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {trip.status}
              </span>
            </div>
          ))}
          {tripHistory.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No trips yet. Book your first ride!</p>
            </div>
          )}
        </div>
      </div>

      <div className="h-6" />
    </div>
  );
}
