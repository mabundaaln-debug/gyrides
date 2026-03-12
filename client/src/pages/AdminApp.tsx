import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Users, Car, DollarSign, BarChart3, LogOut, ChevronRight, ChevronLeft, Star, MapPin, TrendingUp, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { User, Trip, VehicleType } from "@shared/schema";

export default function AdminApp() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<"dashboard" | "drivers" | "trips" | "pricing">("dashboard");

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setLocation("/");
    }
  }, [user]);

  const { data: stats } = useQuery<{ totalDrivers: number; totalRiders: number; totalTrips: number; totalRevenue: number; onlineDrivers: number; activeTrips: number }>({
    queryKey: ["/api/admin/stats"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: drivers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/role/driver"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: allTrips = [] } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: vehicleTypes = [] } = useQuery<VehicleType[]>({
    queryKey: ["/api/vehicle-types"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  if (!user) return null;

  // ── Drivers List ──
  if (view === "drivers") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setView("dashboard")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Drivers ({drivers.length})</h1>
        </div>
        <div className="p-4 space-y-3 overflow-auto">
          {drivers.map(d => (
            <div key={d.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4" data-testid={`driver-card-${d.id}`}>
              <Avatar className="h-12 w-12 border-2 border-yellow-400">
                <AvatarFallback className="bg-yellow-400 text-black font-bold">{d.fullName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-bold">{d.fullName}</div>
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {d.rating?.toFixed(1)} · {d.totalTrips} trips
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{d.vehicleColor} {d.vehicleMake} {d.vehicleModel} · {d.licensePlate}</div>
              </div>
              <div className="text-right">
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${d.isOnline ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {d.isOnline ? "Online" : "Offline"}
                </span>
                <div className="text-sm font-bold mt-1">R{(d.earnings ?? 0).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Trips List ──
  if (view === "trips") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setView("dashboard")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">All Trips ({allTrips.length})</h1>
        </div>
        <div className="p-4 space-y-3 overflow-auto">
          {allTrips.map(trip => (
            <div key={trip.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100" data-testid={`admin-trip-${trip.id}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="text-xs text-gray-500">{trip.createdAt ? new Date(trip.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${trip.status === "completed" ? "bg-green-100 text-green-700" : trip.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {trip.status}
                </span>
              </div>
              <div className="space-y-2 mb-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>{trip.pickupName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-black rounded-full" />
                  <span>{trip.dropoffName}</span>
                </div>
              </div>
              <div className="flex justify-between text-sm mt-3 pt-3 border-t border-gray-50">
                <span className="text-gray-500">{trip.vehicleType} · {trip.paymentMethod}</span>
                <span className="font-bold">R{trip.fare}</span>
              </div>
            </div>
          ))}
          {allTrips.length === 0 && (
            <div className="text-center py-16 text-gray-400">No trips yet</div>
          )}
        </div>
      </div>
    );
  }

  // ── Pricing ──
  if (view === "pricing") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setView("dashboard")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Vehicle Types & Pricing</h1>
        </div>
        <div className="p-4 space-y-4">
          {vehicleTypes.map(vt => (
            <div key={vt.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                  <Car className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{vt.name}</h3>
                  <p className="text-sm text-gray-500">{vt.description}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${vt.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {vt.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-lg font-bold">R{vt.basePrice}</div>
                  <div className="text-xs text-gray-500">Base Price</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-lg font-bold">R{vt.pricePerKm}/km</div>
                  <div className="text-xs text-gray-500">Per Km</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-lg font-bold">{vt.seats}</div>
                  <div className="text-xs text-gray-500">Seats</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Dashboard ──
  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      <div className="bg-black text-white pt-8 pb-6 px-6 rounded-b-3xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-black tracking-tight">GY Admin</h1>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full" onClick={() => { logout(); setLocation("/"); }} data-testid="btn-admin-logout">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-white/10 border-none shadow-none text-white">
            <CardContent className="p-4 flex flex-col items-start gap-2">
              <div className="p-2 bg-yellow-400/20 rounded-lg text-yellow-400">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">R{stats ? stats.totalRevenue.toLocaleString() : "..."}</div>
                <div className="text-xs opacity-70">Total Revenue</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-none shadow-none text-white">
            <CardContent className="p-4 flex flex-col items-start gap-2">
              <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats?.activeTrips ?? 0}</div>
                <div className="text-xs opacity-70">Active Trips</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold">{stats?.totalDrivers ?? 0}</div>
            <div className="text-xs text-gray-500">Drivers</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold">{stats?.totalRiders ?? 0}</div>
            <div className="text-xs text-gray-500">Riders</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold text-green-600">{stats?.onlineDrivers ?? 0}</div>
            <div className="text-xs text-gray-500">Online</div>
          </div>
        </div>

        <h2 className="font-bold text-lg">Management</h2>

        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-between h-16 rounded-2xl bg-white border-gray-100 shadow-sm px-4" onClick={() => setView("drivers")} data-testid="btn-manage-drivers">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-xl text-blue-600"><Users className="h-5 w-5" /></div>
              <div className="text-left">
                <div className="font-bold">Drivers</div>
                <div className="text-xs text-gray-500">{stats?.onlineDrivers ?? 0} online now</div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </Button>

          <Button variant="outline" className="w-full justify-between h-16 rounded-2xl bg-white border-gray-100 shadow-sm px-4" onClick={() => setView("trips")} data-testid="btn-manage-trips">
            <div className="flex items-center gap-3">
              <div className="bg-purple-50 p-2 rounded-xl text-purple-600"><MapPin className="h-5 w-5" /></div>
              <div className="text-left">
                <div className="font-bold">Trips</div>
                <div className="text-xs text-gray-500">{stats?.totalTrips ?? 0} total</div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </Button>

          <Button variant="outline" className="w-full justify-between h-16 rounded-2xl bg-white border-gray-100 shadow-sm px-4" onClick={() => setView("pricing")} data-testid="btn-manage-pricing">
            <div className="flex items-center gap-3">
              <div className="bg-orange-50 p-2 rounded-xl text-orange-600"><Car className="h-5 w-5" /></div>
              <div className="text-left">
                <div className="font-bold">Vehicles & Pricing</div>
                <div className="text-xs text-gray-500">{vehicleTypes.length} categories</div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </Button>
        </div>
      </div>
    </div>
  );
}
