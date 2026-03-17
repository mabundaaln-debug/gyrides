import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { MapPin, DollarSign, Star, Check, X, Menu, LogOut, Navigation, Car, Clock, TrendingUp, User, ChevronLeft, History, Phone, MessageCircle, AlertTriangle, Shield, ExternalLink, BadgeCheck, Heart, Package, Users, Bus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { updateTrip, updateUser, sendSosAlert, uploadProfilePicture, getWebauthnRegisterOptions, verifyWebauthnRegistration } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import GiyaniMap from "@/components/GiyaniMap";
import TripChat from "@/components/TripChat";
import type { Trip, User as UserType } from "@shared/schema";

export default function DriverApp() {
  const { user, setUser, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<"home" | "trip" | "earnings" | "history" | "profile" | "menu">("home");
  const [onTrip, setOnTrip] = useState<Trip | null>(null);
  const [tripRider, setTripRider] = useState<UserType | null>(null);
  const [tripPhase, setTripPhase] = useState<"arriving" | "pickup" | "inprogress">("arriving");
  const [showChat, setShowChat] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [activeTab, setActiveTab] = useState<"home" | "trips" | "earnings" | "profile">("home");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || user.role !== "driver") {
      setLocation("/");
    } else if (user.role === "driver" && user.approvalStatus !== "approved") {
      setLocation("/driver/onboarding");
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

  const pendingRequest = requestedTrips[0];

  useEffect(() => {
    if (!pendingRequest) { setCountdown(30); return; }
    setCountdown(30);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); refetchRequested(); return 30; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pendingRequest?.id]);

  if (!user) return null;
  if (user.role !== "driver" || user.approvalStatus !== "approved") return null;

  const isOnline = user.isOnline ?? false;
  const completedTrips = myTrips.filter(t => t.status === "completed");
  const todayEarnings = completedTrips.reduce((sum, t) => sum + (t.fare || 0), 0);
  const weeklyEarnings = Math.round(todayEarnings * 5.2);
  const cashCollected = Math.round(todayEarnings * 0.85);

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
      toast({ title: "Trip completed!", description: `Fare: R${onTrip.fare}` });
    }
  };

  const declineTrip = () => {
    refetchRequested();
  };

  const openNavigation = useCallback(() => {
    if (!onTrip) return;
    const lat = tripPhase === "inprogress" ? onTrip.dropoffLat : onTrip.pickupLat;
    const lng = tripPhase === "inprogress" ? onTrip.dropoffLng : onTrip.pickupLng;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
  }, [onTrip, tripPhase]);

  const BottomNav = () => (
    <div className="bg-white border-t border-gray-100 px-4 py-2 flex justify-around items-center" data-testid="driver-bottom-nav">
      <button className={`flex flex-col items-center gap-1 py-1 px-3 ${activeTab === "home" ? "text-black" : "text-gray-400"}`} onClick={() => { setActiveTab("home"); setView("home"); }} data-testid="driver-tab-home">
        <Car className="h-5 w-5" /><span className="text-[10px] font-medium">Home</span>
      </button>
      <button className={`flex flex-col items-center gap-1 py-1 px-3 ${activeTab === "trips" ? "text-black" : "text-gray-400"}`} onClick={() => { setActiveTab("trips"); setView("history"); }} data-testid="driver-tab-trips">
        <History className="h-5 w-5" /><span className="text-[10px] font-medium">Trips</span>
      </button>
      <button className={`flex flex-col items-center gap-1 py-1 px-3 ${activeTab === "earnings" ? "text-black" : "text-gray-400"}`} onClick={() => { setActiveTab("earnings"); setView("earnings"); }} data-testid="driver-tab-earnings">
        <DollarSign className="h-5 w-5" /><span className="text-[10px] font-medium">Earnings</span>
      </button>
      <button className={`flex flex-col items-center gap-1 py-1 px-3 ${activeTab === "profile" ? "text-black" : "text-gray-400"}`} onClick={() => { setActiveTab("profile"); setView("profile"); }} data-testid="driver-tab-profile">
        <User className="h-5 w-5" /><span className="text-[10px] font-medium">Profile</span>
      </button>
    </div>
  );

  // ── Menu ──
  if (view === "menu") {
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col">
        <div className="bg-black text-white p-6 pb-8">
          <Button variant="ghost" size="icon" className="text-white mb-4 -ml-2" onClick={() => setView("home")}><X className="h-6 w-6" /></Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-yellow-400">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} />}
              <AvatarFallback className="bg-yellow-400 text-black text-xl font-bold">{user.fullName[0]}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-xl font-bold">{user.fullName}</h2>
                {user.isVerified && <BadgeCheck className="h-5 w-5 text-blue-400" />}
              </div>
              <div className="text-yellow-400 text-sm flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" /> {user.rating?.toFixed(1)} · {user.totalTrips} trips
              </div>
              {user.vehicleMake && <div className="text-xs text-gray-400 mt-1">{user.vehicleColor} {user.vehicleMake} {user.vehicleModel} · {user.licensePlate}</div>}
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 space-y-1">
          {[
            { icon: <Car className="h-5 w-5" />, label: "Dashboard", action: () => setView("home") },
            { icon: <DollarSign className="h-5 w-5" />, label: "Earnings", action: () => setView("earnings") },
            { icon: <History className="h-5 w-5" />, label: "Trip History", action: () => setView("history") },
            { icon: <User className="h-5 w-5" />, label: "Profile", action: () => setView("profile") },
            { icon: <Shield className="h-5 w-5" />, label: "Safety", action: () => toast({ title: "Safety Center", description: "Emergency settings available here" }) },
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
        <div className="flex-1 p-5 pb-20 overflow-auto">
          <div className="bg-black rounded-3xl p-6 text-white text-center mb-5">
            <p className="text-xs text-gray-400 mb-1">Total Earnings (85% of fares)</p>
            <p className="text-4xl font-black">R{(user.earnings ?? 0).toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-2">{completedTrips.length} completed trips · 15% platform fee</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
              <div className="text-lg font-bold">R{todayEarnings}</div>
              <div className="text-[10px] text-gray-500">Today</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
              <div className="text-lg font-bold">R{weeklyEarnings}</div>
              <div className="text-[10px] text-gray-500">This Week</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
              <div className="text-lg font-bold text-green-600">R{cashCollected}</div>
              <div className="text-[10px] text-gray-500">Cash</div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-5 space-y-3" data-testid="driver-bonus-section">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> Driver Bonuses
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Daily Target</div>
                  <div className="text-[10px] text-gray-500">Complete 20 rides today</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-yellow-700">+R100</div>
                  <div className="text-[10px] text-gray-500">{Math.min(completedTrips.length, 20)}/20 trips</div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-yellow-400 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (completedTrips.length / 20) * 100)}%` }} />
              </div>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-sm font-medium">Weekly Target</div>
                  <div className="text-[10px] text-gray-500">Complete 100 rides this week</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-yellow-700">+R500</div>
                  <div className="text-[10px] text-gray-500">{Math.min(completedTrips.length, 100)}/100 trips</div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-yellow-400 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (completedTrips.length / 100) * 100)}%` }} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-5" data-testid="commission-info">
            <h3 className="font-bold text-sm mb-2">How Your Earnings Work</h3>
            <div className="space-y-1.5 text-[11px] text-gray-600">
              <div className="flex justify-between"><span>Your share per trip</span><span className="font-bold text-green-600">85%</span></div>
              <div className="flex justify-between"><span>GY Rides platform fee</span><span className="font-bold">15%</span></div>
              <div className="flex justify-between"><span>Rural trip surcharge (you keep 100%)</span><span className="font-bold text-green-600">+R8</span></div>
              <p className="text-[10px] text-gray-400 pt-1.5 border-t border-gray-100">GY Rides charges only 15% — less than Uber (25%) or Bolt (20%). You keep more of every fare.</p>
            </div>
          </div>

          <h3 className="font-bold mb-3 text-sm">Trip Breakdown</h3>
          <div className="space-y-2">
            {completedTrips.slice(0, 8).map(trip => {
              const driverEarnings = Math.round(trip.fare * 0.85);
              return (
                <div key={trip.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex justify-between items-center">
                  <div>
                    <div className="font-medium text-sm">{trip.pickupName} → {trip.dropoffName}</div>
                    <div className="text-[10px] text-gray-500">{trip.createdAt ? new Date(trip.createdAt).toLocaleDateString("en-ZA") : ""} · {trip.distance?.toFixed(1)} km</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">R{driverEarnings}</div>
                    <div className="text-[9px] text-gray-400">of R{trip.fare}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Trip History ──
  if (view === "history") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b">
          <Button variant="ghost" size="icon" onClick={() => setView("home")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Trip History</h1>
        </div>
        <div className="flex-1 p-4 space-y-2 overflow-auto pb-20">
          {myTrips.map(trip => (
            <div key={trip.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{trip.createdAt ? new Date(trip.createdAt).toLocaleDateString("en-ZA") : ""}</span>
                  {trip.rideType && trip.rideType !== "private" && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">{trip.rideType}</span>
                  )}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trip.status === "completed" ? "bg-green-100 text-green-700" : trip.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {trip.status}
                </span>
              </div>
              <div className="font-medium text-sm">{trip.pickupName} → {trip.dropoffName}</div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-gray-500">{trip.vehicleType} · {trip.distance?.toFixed(1)} km</span>
                <span className="text-sm font-bold">R{trip.fare}</span>
              </div>
            </div>
          ))}
          {myTrips.length === 0 && <div className="text-center py-16 text-gray-400 text-sm">No trips yet</div>}
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Profile ──
  if (view === "profile") {
    const handleDriverPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const result = await uploadProfilePicture(user.id, file);
        setUser({ ...user, avatarUrl: result.avatarUrl });
        toast({ title: "Photo updated!" });
      } catch {
        toast({ title: "Upload failed", variant: "destructive" });
      }
    };

    const setupDriverBiometric = async () => {
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
        toast({ title: "Setup failed", variant: "destructive" });
      }
    };

    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b">
          <Button variant="ghost" size="icon" onClick={() => setView("home")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Profile</h1>
        </div>
        <div className="flex-1 p-5 pb-20 overflow-auto">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center mb-5">
            <div className="relative inline-block">
              <Avatar className="h-20 w-20 mx-auto border-2 border-yellow-400">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} />}
                <AvatarFallback className="bg-yellow-400 text-black text-2xl font-bold">{user.fullName[0]}</AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 bg-black text-white rounded-full p-1.5 cursor-pointer shadow-lg hover:bg-gray-800 transition-colors" data-testid="btn-driver-upload-photo">
                <Upload className="h-3.5 w-3.5" />
                <input type="file" accept="image/*" className="hidden" onChange={handleDriverPhotoUpload} />
              </label>
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-3">
              <h2 className="text-xl font-bold">{user.fullName}</h2>
              {user.isVerified && <BadgeCheck className="h-5 w-5 text-blue-500" />}
            </div>
            <p className="text-gray-500 text-sm">{user.phone}</p>
            {user.isVerified && (
              <div className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full mt-1">
                <BadgeCheck className="h-3 w-3" /> Verified Driver
              </div>
            )}
            <div className="flex items-center justify-center gap-1 mt-2 text-sm">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> {user.rating?.toFixed(1)} · {user.totalTrips} trips
            </div>
            {user.vehicleMake && (
              <div className="mt-3 bg-gray-50 rounded-xl p-3 text-sm">
                <span className="font-medium">{user.vehicleColor} {user.vehicleMake} {user.vehicleModel}</span>
                <span className="text-gray-500"> · {user.licensePlate}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
              <div className="text-xl font-bold">{completedTrips.length}</div>
              <div className="text-[10px] text-gray-500">Trips</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
              <div className="text-xl font-bold">{user.rating?.toFixed(1)}</div>
              <div className="text-[10px] text-gray-500">Rating</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
              <div className="text-xl font-bold text-green-600">R{(user.earnings ?? 0).toLocaleString()}</div>
              <div className="text-[10px] text-gray-500">Earned</div>
            </div>
          </div>

          <button
            className="w-full bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border border-gray-100 text-left"
            onClick={setupDriverBiometric}
            data-testid="btn-driver-setup-biometric"
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
          <div className="mt-6 text-[10px] text-gray-400 text-center leading-tight">
            © {new Date().getFullYear()} Mpfuno Medical Services & Dr NI Mabunda. All rights reserved.
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Active Trip ──
  if (view === "trip" && onTrip) {
    const isParcel = onTrip.rideType === "parcel";
    const isMedical = onTrip.rideType === "medical";
    const phaseLabel = tripPhase === "arriving" ? (isParcel ? "Navigate to Pickup" : "Navigate to Pickup") : tripPhase === "pickup" ? (isParcel ? "Collect Parcel" : "Passenger Pickup") : (isParcel ? "Delivering Parcel" : "Trip in Progress");
    const phaseColor = tripPhase === "arriving" ? "bg-blue-100 text-blue-700" : tripPhase === "pickup" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700";

    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col relative">
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setOnTrip(null); setView("home"); }} className="rounded-full bg-white shadow-md"><ChevronLeft className="h-6 w-6" /></Button>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-sm ${phaseColor}`}>{phaseLabel}</span>
            {onTrip.rideType && onTrip.rideType !== "private" && (
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full shadow-sm ${
                isMedical ? "bg-red-100 text-red-700" : isParcel ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
              }`}>{onTrip.rideType}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openNavigation} className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg" data-testid="btn-navigate">
              <ExternalLink className="h-5 w-5 text-white" />
            </button>
            <button onClick={async () => {
              try {
                await sendSosAlert({ tripId: onTrip.id, userId: user.id, userRole: "driver", lat: onTrip.pickupLat ?? undefined, lng: onTrip.pickupLng ?? undefined });
                toast({ title: "SOS Alert Sent!", description: "Admin has been notified.", variant: "destructive" });
              } catch { toast({ title: "SOS sent" }); }
            }} className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg" data-testid="btn-driver-sos">
              <AlertTriangle className="h-5 w-5 text-white" />
            </button>
          </div>
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

        <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.08)] p-5 space-y-4">
          {onTrip.medicalNotes && (
            <div className="bg-red-50 rounded-lg px-3 py-2 flex items-center gap-2">
              <Heart className="h-3.5 w-3.5 text-red-500" />
              <span className="text-xs text-red-700 font-medium">{onTrip.medicalNotes}</span>
            </div>
          )}
          {onTrip.parcelDescription && (
            <div className="bg-blue-50 rounded-lg px-3 py-2 flex items-center gap-2">
              <Package className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs text-blue-700 font-medium">{onTrip.parcelDescription}</span>
            </div>
          )}

          {tripRider && (
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <Avatar className="h-11 w-11">
                <AvatarFallback className="bg-gray-200 font-bold">{tripRider.fullName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm">{tripRider.fullName}</h3>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {tripRider.rating?.toFixed(1)}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center" data-testid="btn-call-rider"><Phone className="h-4 w-4 text-green-700" /></button>
                <button onClick={() => setShowChat(true)} className="w-9 h-9 bg-yellow-100 rounded-full flex items-center justify-center" data-testid="btn-chat-rider"><MessageCircle className="h-4 w-4 text-yellow-700" /></button>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">R{onTrip.fare}</div>
                <div className="text-[10px] text-gray-500 capitalize">{onTrip.paymentMethod}</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 flex-1"><div className="w-2 h-2 bg-green-500 rounded-full" /><span className="font-medium truncate">{onTrip.pickupName}</span></div>
            <span className="text-gray-300">→</span>
            <div className="flex items-center gap-2 flex-1"><div className="w-2 h-2 bg-black rounded-full" /><span className="font-medium truncate">{onTrip.dropoffName}</span></div>
          </div>

          <Button size="lg" className="w-full h-14 rounded-2xl text-lg font-bold bg-black text-white hover:bg-gray-900" onClick={advanceTrip} data-testid="btn-advance-trip">
            {tripPhase === "arriving" ? "Arrived at Pickup" : tripPhase === "pickup" ? (isParcel ? "Collected Parcel" : "Start Trip") : (isParcel ? "Delivered" : "Complete Trip")}
          </Button>
        </div>

        {showChat && onTrip && tripRider && (
          <TripChat
            tripId={onTrip.id}
            userId={user.id}
            userRole="driver"
            otherName={tripRider.fullName}
            onClose={() => setShowChat(false)}
          />
        )}
      </div>
    );
  }

  // ── Home / Dashboard ──
  return (
    <div className="min-h-[100dvh] bg-gray-100 flex flex-col relative">
      <div className="absolute inset-0 z-0">
        <GiyaniMap pickup={null} dropoff={null} className="h-full" />
      </div>

      <div className="relative z-10 p-4 flex justify-between items-center">
        <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-md" onClick={() => setView("menu")} data-testid="btn-driver-menu">
          <Menu className="h-6 w-6" />
        </Button>
        <div className="bg-black text-white backdrop-blur px-4 py-1.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-md">
          <DollarSign className="h-4 w-4 text-yellow-400" /> R{todayEarnings}
        </div>
        <Avatar className="h-10 w-10 border-2 border-yellow-400 shadow-md">
          <AvatarFallback className="bg-yellow-400 text-black font-bold">{user.fullName[0]}</AvatarFallback>
        </Avatar>
      </div>

      <div className="relative z-10 px-5 pt-2">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 shadow-sm">
          <h2 className="text-lg font-bold mb-0.5">Hey, {user.fullName.split(" ")[0]}</h2>
          <p className="text-gray-500 text-sm">{isOnline ? "You're online and ready for trips" : "Go online to start earning"}</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative z-10">
        {!isOnline && (
          <button onClick={toggleOnline} className="w-28 h-28 bg-yellow-400 text-black rounded-full shadow-[0_10px_40px_rgba(250,204,21,0.4)] flex items-center justify-center text-3xl font-black border-4 border-white/20 transition-transform active:scale-95" data-testid="btn-go-online">
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
            <p className="text-white font-medium bg-black/50 px-4 py-1.5 rounded-full text-sm backdrop-blur">Looking for trips...</p>
            <Button variant="ghost" className="text-red-400 mt-4 bg-white/80 rounded-full" onClick={toggleOnline} data-testid="btn-go-offline">Go Offline</Button>
          </div>
        )}

        {isOnline && pendingRequest && (
          <div className="absolute inset-x-4 bottom-4 top-auto bg-white rounded-3xl overflow-hidden shadow-2xl text-black animate-in slide-in-from-bottom-8">
            <div className="bg-yellow-400 p-4 flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg">
                  {pendingRequest.rideType === "medical" ? "Medical Transport" :
                   pendingRequest.rideType === "parcel" ? "Parcel Delivery" :
                   pendingRequest.rideType === "shared" ? "Shared Ride" :
                   "New Ride Request"}
                </h3>
                <p className="text-black/60 text-xs">{pendingRequest.vehicleType}</p>
              </div>
              <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                <span className="text-yellow-400 font-black text-lg" data-testid="text-countdown">{countdown}</span>
              </div>
            </div>
            <div className="p-5">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <div className="text-3xl font-black">R{pendingRequest.fare}</div>
                  <div className="text-gray-500 text-xs">{pendingRequest.paymentMethod} · {pendingRequest.duration || "?"} min · {pendingRequest.distance?.toFixed(1)} km</div>
                </div>
                {pendingRequest.rideType && pendingRequest.rideType !== "private" && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    pendingRequest.rideType === "medical" ? "bg-red-100 text-red-700" :
                    pendingRequest.rideType === "parcel" ? "bg-blue-100 text-blue-700" :
                    pendingRequest.rideType === "shared" ? "bg-purple-100 text-purple-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`} data-testid="text-ride-type">
                    {pendingRequest.rideType === "medical" ? "🏥 Medical" :
                     pendingRequest.rideType === "parcel" ? "📦 Parcel" :
                     pendingRequest.rideType === "shared" ? `👥 ${pendingRequest.seatsBooked || 1} seat${(pendingRequest.seatsBooked || 1) > 1 ? "s" : ""}` :
                     pendingRequest.rideType}
                  </span>
                )}
              </div>

              {pendingRequest.medicalNotes && (
                <div className="bg-red-50 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                  <Heart className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-xs text-red-700">{pendingRequest.medicalNotes}</span>
                </div>
              )}
              {pendingRequest.parcelDescription && (
                <div className="bg-blue-50 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-xs text-blue-700">{pendingRequest.parcelDescription}</span>
                </div>
              )}
              {pendingRequest.rideNote && (
                <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3 text-xs text-gray-600">
                  Note: {pendingRequest.rideNote}
                </div>
              )}

              <div className="space-y-3 mb-5 relative">
                <div className="absolute left-3 top-5 bottom-5 w-0.5 bg-gray-200" />
                <div className="flex items-start gap-4">
                  <div className="bg-green-500 w-6 h-6 rounded-full flex items-center justify-center z-10 shrink-0 border-2 border-white"><div className="w-2 h-2 bg-white rounded-full" /></div>
                  <div><div className="font-bold text-sm">{pendingRequest.pickupName}</div><div className="text-[10px] text-gray-500">Pickup</div></div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-black w-6 h-6 rounded-full flex items-center justify-center z-10 shrink-0 border-2 border-white"><MapPin className="w-3 h-3 text-white" /></div>
                  <div><div className="font-bold text-sm">{pendingRequest.dropoffName}</div><div className="text-[10px] text-gray-500">Drop-off</div></div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button size="lg" variant="outline" className="flex-1 h-13 rounded-2xl" onClick={declineTrip} data-testid="btn-decline-trip">
                  <X className="mr-2 h-4 w-4" /> Decline
                </Button>
                <Button size="lg" className="flex-1 h-13 rounded-2xl bg-black text-white hover:bg-gray-900" onClick={() => acceptTrip(pendingRequest)} data-testid="btn-accept-trip">
                  <Check className="mr-2 h-4 w-4" /> Accept
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isOnline && !pendingRequest && (
        <div className="bg-black/80 backdrop-blur-md mx-4 mb-16 rounded-2xl p-4 flex justify-around relative z-10 shadow-lg">
          <div className="text-center text-white">
            <div className="text-xl font-bold text-yellow-400">{completedTrips.length}</div>
            <div className="text-[10px] text-gray-300">Trips</div>
          </div>
          <div className="text-center text-white">
            <div className="text-xl font-bold text-yellow-400">{user.rating?.toFixed(1)}</div>
            <div className="text-[10px] text-gray-300">Rating</div>
          </div>
          <div className="text-center text-white">
            <div className="text-xl font-bold text-yellow-400">R{todayEarnings}</div>
            <div className="text-[10px] text-gray-300">Earned</div>
          </div>
        </div>
      )}

      {view === "home" && !onTrip && <BottomNav />}
    </div>
  );
}
