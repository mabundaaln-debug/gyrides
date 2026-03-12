import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MapPin, DollarSign, Star, Check, X, Menu, LogOut, Navigation, Car, Clock, TrendingUp, User, ChevronLeft, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { updateTrip, updateUser } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import GiyaniMap from "@/components/GiyaniMap";
import type { Trip, User as UserType } from "@shared/schema";

export default function DriverApp() {
  const { user, setUser, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<"home" | "trip" | "earnings" | "profile" | "menu">("home");
  const [onTrip, setOnTrip] = useState<Trip | null>(null);
  const [tripRider, setTripRider] = useState<UserType | null>(null);
  const [tripPhase, setTripPhase] = useState<"arriving" | "pickup" | "inprogress">("arriving");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || user.role !== "driver") {
      setLocation("/");
    }
  }, [user]);

  const { data: requestedTrips = [], refetch: refetchRequested } = useQuery<Trip[]>({
    queryKey: ["/api/trips/requested"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 5000,
  });

  const { data: myTrips = [] } = useQuery<Trip[]>({
    queryKey: ["/api/trips/driver", user?.id ?? ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  if (!user) return null;

  const isOnline = user.isOnline ?? false;
  const completedTrips = myTrips.filter(t => t.status === "completed");
  const todayEarnings = completedTrips.reduce((sum, t) => sum + (t.fare || 0), 0);

  const toggleOnline = async () => {
    const updated = await updateUser(user.id, { isOnline: !isOnline } as any);
    setUser(updated);
  };

  const acceptTrip = async (trip: Trip) => {
    const updated = await updateTrip(trip.id, { status: "accepted", driverId: user.id });
    setOnTrip(updated);
    setTripPhase("arriving");
    setView("trip");

    try {
      const res = await fetch(`/api/users/${trip.riderId}`, { credentials: "include" });
      const rider = await res.json();
      setTripRider(rider);
    } catch {}

    refetchRequested();
  };

  const advanceTrip = async () => {
    if (!onTrip) return;
    if (tripPhase === "arriving") {
      await updateTrip(onTrip.id, { status: "arriving" });
      setTripPhase("pickup");
    } else if (tripPhase === "pickup") {
      await updateTrip(onTrip.id, { status: "in_progress" });
      setTripPhase("inprogress");
    } else {
      await updateTrip(onTrip.id, { status: "completed" });
      setOnTrip(null);
      setTripRider(null);
      setView("home");
      queryClient.invalidateQueries({ queryKey: ["/api/trips/driver"] });
    }
  };

  const declineTrip = () => {
    refetchRequested();
  };

  // ── Menu ──
  if (view === "menu") {
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col">
        <div className="bg-black text-white p-6 pb-8">
          <Button variant="ghost" size="icon" className="text-white mb-4 -ml-2" onClick={() => setView("home")}>
            <X className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-yellow-400">
              <AvatarFallback className="bg-yellow-400 text-black text-xl font-bold">{user.fullName[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{user.fullName}</h2>
              <div className="text-yellow-400 text-sm flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" /> {user.rating?.toFixed(1)} · {user.totalTrips} trips
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 space-y-2">
          {[
            { icon: <Car className="h-5 w-5" />, label: "Dashboard", action: () => setView("home") },
            { icon: <DollarSign className="h-5 w-5" />, label: "Earnings", action: () => setView("earnings") },
            { icon: <History className="h-5 w-5" />, label: "Trip History", action: () => setView("profile") },
            { icon: <User className="h-5 w-5" />, label: "Profile", action: () => setView("profile") },
          ].map((item, i) => (
            <Button key={i} variant="ghost" className="w-full justify-start h-14 text-base rounded-xl gap-4" onClick={item.action}>
              {item.icon} {item.label}
            </Button>
          ))}
        </div>
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start h-14 text-base rounded-xl gap-4 text-red-500" onClick={() => { logout(); setLocation("/"); }}>
            <LogOut className="h-5 w-5" /> Sign Out
          </Button>
        </div>
      </div>
    );
  }

  // ── Earnings ──
  if (view === "earnings") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b">
          <Button variant="ghost" size="icon" onClick={() => setView("home")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Earnings</h1>
        </div>
        <div className="p-6">
          <div className="bg-black rounded-3xl p-6 text-white text-center mb-6">
            <p className="text-sm text-gray-400 mb-1">Total Earnings</p>
            <p className="text-4xl font-black">R{(user.earnings ?? 0).toLocaleString()}</p>
            <p className="text-sm text-gray-400 mt-2">{completedTrips.length} completed trips</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <DollarSign className="h-5 w-5 text-green-600 mx-auto mb-2" />
              <div className="text-xl font-bold">R{todayEarnings}</div>
              <div className="text-xs text-gray-500">Today</div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <TrendingUp className="h-5 w-5 text-blue-600 mx-auto mb-2" />
              <div className="text-xl font-bold">{completedTrips.length}</div>
              <div className="text-xs text-gray-500">Trips</div>
            </div>
          </div>

          <h3 className="font-bold mb-3">Recent Trips</h3>
          <div className="space-y-3">
            {completedTrips.slice(0, 5).map(trip => (
              <div key={trip.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <div className="font-medium">{trip.pickupName} → {trip.dropoffName}</div>
                  <div className="text-xs text-gray-500">{trip.createdAt ? new Date(trip.createdAt).toLocaleDateString("en-ZA") : ""}</div>
                </div>
                <div className="font-bold text-green-600">R{trip.fare}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Profile / Trip History ──
  if (view === "profile") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b">
          <Button variant="ghost" size="icon" onClick={() => setView("home")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Profile & History</h1>
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
            {user.vehicleMake && (
              <p className="text-sm text-gray-500 mt-2">{user.vehicleColor} {user.vehicleMake} {user.vehicleModel} · {user.licensePlate}</p>
            )}
          </div>

          <h3 className="font-bold mb-3">All Trips</h3>
          <div className="space-y-3">
            {myTrips.map(trip => (
              <div key={trip.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs text-gray-500">{trip.createdAt ? new Date(trip.createdAt).toLocaleDateString("en-ZA") : ""}</div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${trip.status === "completed" ? "bg-green-100 text-green-700" : trip.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {trip.status}
                  </span>
                </div>
                <div className="font-medium text-sm">{trip.pickupName} → {trip.dropoffName}</div>
                <div className="text-sm font-bold mt-1">R{trip.fare}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Active Trip ──
  if (view === "trip" && onTrip) {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col relative">
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setOnTrip(null); setView("home"); }} className="rounded-full bg-white shadow-md"><ChevronLeft className="h-6 w-6" /></Button>
          <span className="font-bold text-lg bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-sm">
            {tripPhase === "arriving" ? "Navigate to Pickup" : tripPhase === "pickup" ? "At Pickup" : "Trip in Progress"}
          </span>
        </div>

        <div className="flex-1 relative">
          <GiyaniMap
            pickup={{ lat: onTrip.pickupLat ?? -23.31, lng: onTrip.pickupLng ?? 30.72, name: onTrip.pickupName }}
            dropoff={{ lat: onTrip.dropoffLat ?? -23.32, lng: onTrip.dropoffLng ?? 30.71, name: onTrip.dropoffName }}
            driverLocation={{ lat: (onTrip.pickupLat ?? -23.31) + (tripPhase === "arriving" ? 0.006 : 0.001), lng: (onTrip.pickupLng ?? 30.72) - 0.003 }}
            className="h-full absolute inset-0"
            showRoute={true}
          />
        </div>

        <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.08)] p-6 space-y-5">
          {tripRider && (
            <div className="flex items-center gap-4 pb-5 border-b border-gray-100">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-gray-200 font-bold">{tripRider.fullName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-bold">{tripRider.fullName}</h3>
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {tripRider.rating?.toFixed(1)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold">R{onTrip.fare}</div>
                <div className="text-xs text-gray-500">Cash</div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
              <span className="font-medium">{onTrip.pickupName}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2.5 h-2.5 bg-black rounded-full" />
              <span className="font-medium">{onTrip.dropoffName}</span>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full h-16 rounded-2xl text-lg font-bold bg-black hover:bg-gray-900"
            onClick={advanceTrip}
            data-testid="btn-advance-trip"
          >
            {tripPhase === "arriving" ? "Arrived at Pickup" : tripPhase === "pickup" ? "Start Trip" : "Complete Trip"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Home / Dashboard ──
  const pendingRequest = requestedTrips[0];

  return (
    <div className="min-h-[100dvh] bg-gray-100 flex flex-col relative">
      {/* Map background */}
      <div className="absolute inset-0 z-0">
        <GiyaniMap pickup={null} dropoff={null} className="h-full" />
      </div>

      {/* Header overlay */}
      <div className="relative z-10 p-4 flex justify-between items-center">
        <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-md" onClick={() => setView("menu")} data-testid="btn-driver-menu">
          <Menu className="h-6 w-6" />
        </Button>
        <div className="bg-black text-white backdrop-blur px-4 py-1.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-md">
          <DollarSign className="h-4 w-4 text-yellow-400" />
          R{todayEarnings}
        </div>
        <Avatar className="h-10 w-10 border-2 border-yellow-400 shadow-md">
          <AvatarFallback className="bg-yellow-400 text-black font-bold">{user.fullName[0]}</AvatarFallback>
        </Avatar>
      </div>

      <div className="relative z-10 px-6 pt-2">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-sm">
          <h2 className="text-xl font-bold mb-0.5">Hey, {user.fullName.split(" ")[0]}</h2>
          <p className="text-gray-500 text-sm">{isOnline ? "You're online and ready for trips" : "Go online to start earning"}</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative z-10">
        {!isOnline && (
          <button
            onClick={toggleOnline}
            className="w-28 h-28 bg-yellow-400 text-black rounded-full shadow-[0_10px_40px_rgba(250,204,21,0.4)] flex items-center justify-center text-3xl font-black border-4 border-white/20 transition-transform active:scale-95"
            data-testid="btn-go-online"
          >
            GO
          </button>
        )}

        {isOnline && !pendingRequest && (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-yellow-400/20 rounded-full flex items-center justify-center animate-pulse mb-4">
              <div className="w-14 h-14 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                <Car className="h-7 w-7 text-black" />
              </div>
            </div>
            <p className="text-gray-400 font-medium">Looking for trips in Giyani...</p>
            <Button variant="ghost" className="text-red-400 mt-4" onClick={toggleOnline} data-testid="btn-go-offline">
              Go Offline
            </Button>
          </div>
        )}

        {isOnline && pendingRequest && (
          <div className="absolute inset-x-4 bottom-4 top-auto bg-white rounded-3xl overflow-hidden shadow-2xl text-black animate-in slide-in-from-bottom-8">
            <div className="bg-yellow-400 p-4 text-center">
              <h3 className="font-black text-xl">New Ride Request</h3>
              <p className="text-black/60 text-sm">{pendingRequest.vehicleType}</p>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="text-3xl font-black">R{pendingRequest.fare}</div>
                  <div className="text-gray-500 text-sm">{pendingRequest.paymentMethod} · Est. {pendingRequest.duration || "?"} mins</div>
                </div>
              </div>

              <div className="space-y-4 mb-6 relative">
                <div className="absolute left-3 top-5 bottom-5 w-0.5 bg-gray-200" />
                <div className="flex items-start gap-4">
                  <div className="bg-green-500 w-6 h-6 rounded-full flex items-center justify-center z-10 shrink-0 border-2 border-white">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <div>
                    <div className="font-bold">{pendingRequest.pickupName}</div>
                    <div className="text-xs text-gray-500">Pickup</div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-black w-6 h-6 rounded-full flex items-center justify-center z-10 shrink-0 border-2 border-white">
                    <MapPin className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <div className="font-bold">{pendingRequest.dropoffName}</div>
                    <div className="text-xs text-gray-500">Drop-off</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button size="lg" variant="outline" className="flex-1 h-14 rounded-2xl" onClick={declineTrip} data-testid="btn-decline-trip">
                  <X className="mr-2" /> Decline
                </Button>
                <Button size="lg" className="flex-1 h-14 rounded-2xl bg-black text-white hover:bg-gray-900" onClick={() => acceptTrip(pendingRequest)} data-testid="btn-accept-trip">
                  <Check className="mr-2" /> Accept
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom stats bar when online */}
      {isOnline && !pendingRequest && (
        <div className="bg-black/80 backdrop-blur-md mx-4 mb-6 rounded-2xl p-4 flex justify-around relative z-10 shadow-lg">
          <div className="text-center text-white">
            <div className="text-xl font-bold text-yellow-400">{completedTrips.length}</div>
            <div className="text-xs text-gray-300">Trips</div>
          </div>
          <div className="text-center text-white">
            <div className="text-xl font-bold text-yellow-400">{user.rating?.toFixed(1)}</div>
            <div className="text-xs text-gray-300">Rating</div>
          </div>
          <div className="text-center text-white">
            <div className="text-xl font-bold text-yellow-400">R{todayEarnings}</div>
            <div className="text-xs text-gray-300">Earned</div>
          </div>
        </div>
      )}
    </div>
  );
}
