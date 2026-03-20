import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Users, Car, DollarSign, LogOut, ChevronRight, ChevronLeft, Star, MapPin, TrendingUp, Activity, AlertCircle, CheckCircle, Shield, XCircle, FileText, Eye, User as UserIcon, AlertTriangle, Phone, MessageCircle, KeyRound, ShieldCheck, ShieldX, Lock, EyeOff, Clock, Download, BarChart3, Navigation, ClipboardList, Award, Zap, ThumbsUp, ThumbsDown, Banknote, Upload, CheckSquare, Square, ExternalLink, Plus, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { approveDriver, rejectDriver, updateSosAlert, getUser, adminResetUserPassword, verifyUser, getPendingPasswordResetRequests, updatePasswordResetRequest } from "@/lib/api";
import { generateStatementPDF } from "@/lib/generateStatement";
import { useToast } from "@/hooks/use-toast";
import TripChat from "@/components/TripChat";
import GiyaniMap from "@/components/GiyaniMap";
import type { User, Trip, VehicleType, SosAlert, DriverReimbursement } from "@shared/schema";

// ── Live location map for an SOS alert ──
function SosLiveMap({ alert }: { alert: SosAlert }) {
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [riderPos, setRiderPos] = useState<{ lat: number; lng: number } | null>(null);
  const [driverName, setDriverName] = useState<string>("");
  const [riderName, setRiderName] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [riderId, setRiderId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  // Step 1: fetch the trip once to get rider/driver IDs
  useEffect(() => {
    if (!alert.tripId) return;
    cancelledRef.current = false;
    fetch(`/api/trips/${alert.tripId}`, { credentials: "include" })
      .then(r => r.json())
      .then((trip: Trip) => {
        if (cancelledRef.current) return;
        setRiderId(trip.riderId ?? null);
        setDriverId(trip.driverId ?? null);
      })
      .catch(() => {});
    return () => { cancelledRef.current = true; };
  }, [alert.tripId]);

  // Step 2: poll both users' GPS every 4 seconds
  useEffect(() => {
    if (!riderId && !driverId) return;
    cancelledRef.current = false;

    const pollUser = async (userId: string, role: "rider" | "driver") => {
      try {
        const res = await fetch(`/api/users/${userId}`, { credentials: "include" });
        const data = await res.json();
        if (cancelledRef.current) return;
        if (typeof data.currentLat === "number" && typeof data.currentLng === "number") {
          const pos = { lat: data.currentLat, lng: data.currentLng };
          if (role === "driver") { setDriverPos(pos); setDriverName(data.fullName || "Driver"); }
          else { setRiderPos(pos); setRiderName(data.fullName || "Rider"); }
          setLastUpdated(new Date());
        }
      } catch {}
    };

    const poll = () => {
      if (driverId) pollUser(driverId, "driver");
      if (riderId) pollUser(riderId, "rider");
    };

    poll();
    const interval = setInterval(poll, 4000);
    return () => { cancelledRef.current = true; clearInterval(interval); };
  }, [riderId, driverId]);

  const hasAnyLocation = driverPos || riderPos;

  return (
    <div className="mb-3 rounded-xl overflow-hidden border border-gray-200 bg-white" data-testid="sos-live-map">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-gray-700">Live Locations</span>
        </div>
        {lastUpdated && (
          <span className="text-[10px] text-gray-400">Updated {lastUpdated.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
        )}
      </div>

      {hasAnyLocation ? (
        <>
          <GiyaniMap
            pickup={riderPos ? { lat: riderPos.lat, lng: riderPos.lng, name: `Rider: ${riderName}` } : null}
            driverLocation={driverPos}
            className="h-48"
            showRoute={false}
          />
          <div className="flex gap-2 px-3 py-2 border-t border-gray-100">
            {driverPos && (
              <a
                href={`https://www.google.com/maps?q=${driverPos.lat},${driverPos.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-lg py-1.5 text-xs font-bold text-yellow-800"
                data-testid="link-driver-maps"
              >
                <Car className="h-3.5 w-3.5" /> Driver in Maps
              </a>
            )}
            {riderPos && (
              <a
                href={`https://www.google.com/maps?q=${riderPos.lat},${riderPos.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg py-1.5 text-xs font-bold text-blue-800"
                data-testid="link-rider-maps"
              >
                <Navigation className="h-3.5 w-3.5" /> Rider in Maps
              </a>
            )}
          </div>
        </>
      ) : (
        <div className="h-24 flex items-center justify-center text-gray-400 text-xs">
          <div className="text-center">
            <div className="animate-pulse mb-1">
              <MapPin className="h-5 w-5 mx-auto text-gray-300" />
            </div>
            {alert.tripId ? "Waiting for live GPS..." : "No trip linked to this alert"}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminApp() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<"dashboard" | "drivers" | "trips" | "pricing" | "approvals" | "review-driver" | "sos" | "users" | "statements" | "inspect-driver" | "reimbursements" | "verify">("dashboard");
  const [reviewingDriver, setReviewingDriver] = useState<User | null>(null);
  const [inspectingDriver, setInspectingDriver] = useState<User | null>(null);
  const [inspSubmitting, setInspSubmitting] = useState(false);

  // Inspection checklist state
  const [inspExterior, setInspExterior] = useState(3);
  const [inspInterior, setInspInterior] = useState(3);
  const [inspCleanliness, setInspCleanliness] = useState(3);
  const [inspSeats, setInspSeats] = useState(3);
  const [inspAC, setInspAC] = useState<"working" | "not_working" | "none">("working");
  const [inspVehicleType, setInspVehicleType] = useState("Sedan");
  const [inspSeatingCapacity, setInspSeatingCapacity] = useState(4);
  const [inspVehicleAge, setInspVehicleAge] = useState<"<3" | "3-5" | "5-10" | ">10">("<3");
  const [inspEntertainment, setInspEntertainment] = useState<"none" | "bluetooth" | "full">("none");
  const [inspCharging, setInspCharging] = useState(false);
  const [inspTinting, setInspTinting] = useState(false);
  const [inspABS, setInspABS] = useState(true);
  const [inspAirbags, setInspAirbags] = useState(true);
  const [inspSeatbelts, setInspSeatbelts] = useState(true);
  const [inspBodyDamage, setInspBodyDamage] = useState<"none" | "minor" | "major">("none");
  const [inspNotes, setInspNotes] = useState("");
  const [inspCategoryOverride, setInspCategoryOverride] = useState<"standard" | "premium" | "xl" | "">("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [viewedDocs, setViewedDocs] = useState<Set<string>>(new Set());
  const [sosNotes, setSosNotes] = useState<Record<string, string>>({});
  const [chatTripId, setChatTripId] = useState<string | null>(null);
  const [chatLabel, setChatLabel] = useState("");
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [stmtDriverId, setStmtDriverId] = useState("");
  const [stmtMonth, setStmtMonth] = useState(() => new Date().getMonth() + 1);
  const [stmtYear, setStmtYear] = useState(() => new Date().getFullYear());
  const [stmtData, setStmtData] = useState<any>(null);
  const [stmtLoading, setStmtLoading] = useState(false);

  // Reimbursements state
  const [rmbDriverFilter, setRmbDriverFilter] = useState("");
  const [rmbNewAmount, setRmbNewAmount] = useState("");
  const [rmbNewPeriod, setRmbNewPeriod] = useState(() => { const n = new Date(); return `${n.toLocaleString("default", { month: "long" })} ${n.getFullYear()}`; });
  const [rmbNewDriver, setRmbNewDriver] = useState("");
  const [rmbNewNotes, setRmbNewNotes] = useState("");
  const [rmbCreating, setRmbCreating] = useState(false);
  const [rmbShowCreate, setRmbShowCreate] = useState(false);
  const [rmbUploadingId, setRmbUploadingId] = useState<string | null>(null);
  const [rmbMarkingId, setRmbMarkingId] = useState<string | null>(null);

  // Verify document state
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

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
    refetchInterval: 10000,
  });

  const { data: pendingDrivers = [] } = useQuery<User[]>({
    queryKey: ["/api/drivers/pending"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 10000,
  });

  const { data: allTrips = [] } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 10000,
  });

  const { data: vehicleTypes = [] } = useQuery<VehicleType[]>({
    queryKey: ["/api/vehicle-types"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: sosAlerts = [] } = useQuery<SosAlert[]>({
    queryKey: ["/api/sos"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 5000,
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 10000,
  });

  const { data: pendingResetRequests = [] } = useQuery<any[]>({
    queryKey: ["/api/password-reset-requests/pending"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 10000,
  });

  const { data: reimbursements = [] } = useQuery<DriverReimbursement[]>({
    queryKey: ["/api/admin/reimbursements"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 30000,
  });

  const activeSosAlerts = sosAlerts.filter(a => a.status === "active" || a.status === "acknowledged");

  if (!user) return null;

  const completedTrips = allTrips.filter(t => t.status === "completed");
  const cancelledTrips = allTrips.filter(t => t.status === "cancelled");
  const whatsappTrips = allTrips.filter(t => t.bookingChannel === "whatsapp");
  const activeWhatsappTrips = whatsappTrips.filter(t => t.status !== "completed" && t.status !== "cancelled");

  const handleApprove = async (driverId: string) => {
    try {
      await approveDriver(driverId);
      toast({ title: "Driver Approved", description: "The driver can now start accepting rides" });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/role/driver"] });
      setReviewingDriver(null);
      setView("approvals");
    } catch {
      toast({ title: "Failed to approve", variant: "destructive" });
    }
  };

  const handleReject = async (driverId: string) => {
    try {
      await rejectDriver(driverId, rejectReason || "Application does not meet requirements");
      toast({ title: "Driver Rejected", description: "The driver has been notified" });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/role/driver"] });
      setReviewingDriver(null);
      setShowRejectInput(false);
      setRejectReason("");
      setView("approvals");
    } catch {
      toast({ title: "Failed to reject", variant: "destructive" });
    }
  };

  // ── Inspection scoring ──
  const computeInspectionScore = () => {
    let s = 0;
    s += inspExterior * 8;
    s += inspInterior * 8;
    s += inspCleanliness * 7;
    s += inspSeats * 5;
    if (inspBodyDamage === "none") s += 10; else if (inspBodyDamage === "major") s -= 20;
    if (inspAC === "working") s += 25;
    if (inspVehicleAge === "<3") s += 25; else if (inspVehicleAge === "3-5") s += 15; else if (inspVehicleAge === "5-10") s += 5;
    if (inspEntertainment === "bluetooth") s += 8; else if (inspEntertainment === "full") s += 18;
    if (inspCharging) s += 5;
    if (inspTinting) s += 5;
    if (inspABS) s += 8;
    if (inspAirbags) s += 8;
    if (inspSeatbelts) s += 8;
    return Math.max(0, Math.min(s, 210));
  };

  const computeSuggestedCategory = (): "standard" | "premium" | "xl" => {
    const score = computeInspectionScore();
    const bigVehicle = ["SUV", "Crossover", "Minivan", "Minibus"].includes(inspVehicleType);
    if (inspSeatingCapacity >= 6 && bigVehicle && score >= 60) return "xl";
    if (score >= 110 && inspAC === "working" && inspExterior >= 3 && inspInterior >= 3) return "premium";
    return "standard";
  };

  const handleSubmitInspection = async () => {
    if (!inspectingDriver) return;
    setInspSubmitting(true);
    try {
      const score = computeInspectionScore();
      const suggested = computeSuggestedCategory();
      const category = inspCategoryOverride || suggested;
      const checklistData = {
        exterior: inspExterior, interior: inspInterior, cleanliness: inspCleanliness,
        seats: inspSeats, bodyDamage: inspBodyDamage, ac: inspAC,
        vehicleType: inspVehicleType, seatingCapacity: inspSeatingCapacity,
        vehicleAge: inspVehicleAge, entertainment: inspEntertainment,
        charging: inspCharging, tinting: inspTinting, abs: inspABS,
        airbags: inspAirbags, seatbelts: inspSeatbelts,
      };
      const res = await fetch("/api/inspections", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: inspectingDriver.id, inspectorId: user?.id, category, score, checklistData, notes: inspNotes, passed: true }),
      });
      if (!res.ok) throw new Error("Failed to save inspection");
      queryClient.invalidateQueries({ queryKey: ["/api/users/role/driver"] });
      toast({ title: "Inspection saved!", description: `Vehicle categorised as GY ${category.charAt(0).toUpperCase() + category.slice(1)} (score: ${score}/210)` });
      setView("drivers");
      setInspectingDriver(null);
    } catch (e: any) {
      toast({ title: "Error saving inspection", description: e.message, variant: "destructive" });
    } finally {
      setInspSubmitting(false);
    }
  };

  const resetInspectionForm = () => {
    setInspExterior(3); setInspInterior(3); setInspCleanliness(3); setInspSeats(3);
    setInspAC("working"); setInspVehicleType("Sedan"); setInspSeatingCapacity(4);
    setInspVehicleAge("<3"); setInspEntertainment("none"); setInspCharging(false);
    setInspTinting(false); setInspABS(true); setInspAirbags(true); setInspSeatbelts(true);
    setInspBodyDamage("none"); setInspNotes(""); setInspCategoryOverride("");
  };

  // ── Inspect Driver View ──
  if (view === "inspect-driver" && inspectingDriver) {
    const score = computeInspectionScore();
    const suggested = computeSuggestedCategory();
    const finalCategory = inspCategoryOverride || suggested;
    const catColor = finalCategory === "xl" ? "bg-purple-500" : finalCategory === "premium" ? "bg-yellow-500" : "bg-blue-500";
    const catLabel = finalCategory === "xl" ? "GY XL" : finalCategory === "premium" ? "GY Premium" : "GY Standard";
    const ScoreRow = ({ label, value, max }: { label: string; value: number; max: number }) => (
      <div className="flex items-center justify-between text-xs text-gray-500 py-1 border-b border-gray-50">
        <span>{label}</span>
        <span className="font-bold text-gray-700">{value} / {max}</span>
      </div>
    );
    const StarPicker = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
      <div className="flex gap-1">
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => onChange(n)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${n <= value ? "bg-yellow-400 text-black" : "bg-gray-100 text-gray-400"}`}
            data-testid={`star-${n}`}>
            <Star className="h-4 w-4 fill-current" />
          </button>
        ))}
      </div>
    );
    const ToggleGroup = ({ options, value, onChange, testPrefix }: { options: {val: string; label: string}[]; value: string; onChange: (v: string) => void; testPrefix: string }) => (
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o.val} onClick={() => onChange(o.val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${value === o.val ? "bg-yellow-400 text-black" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            data-testid={`${testPrefix}-${o.val}`}>
            {o.label}
          </button>
        ))}
      </div>
    );
    const Toggle = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
      <button onClick={() => onChange(!value)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-colors ${value ? "border-green-400 bg-green-50 text-green-700" : "border-gray-200 bg-white text-gray-500"}`}>
        {value ? <ThumbsUp className="h-4 w-4" /> : <ThumbsDown className="h-4 w-4" />}
        <span className="text-xs font-bold">{label}: {value ? "Yes" : "No"}</span>
      </button>
    );

    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-black text-white px-4 pt-8 pb-4 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" className="text-gray-400 h-8 w-8" onClick={() => { setView("drivers"); setInspectingDriver(null); }}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-black text-lg leading-tight">Vehicle Inspection</h1>
              <p className="text-gray-400 text-xs">{inspectingDriver.fullName} · {inspectingDriver.vehicleColor} {inspectingDriver.vehicleMake} {inspectingDriver.vehicleModel}</p>
            </div>
            <div className={`${catColor} text-white px-3 py-1 rounded-xl text-xs font-black`} data-testid="insp-category-badge">{catLabel}</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-[10px] uppercase tracking-wider">Score</p>
              <p className="text-2xl font-black">{score}<span className="text-sm text-gray-400">/210</span></p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-[10px] uppercase tracking-wider">Suggested</p>
              <p className="font-bold text-yellow-400 text-sm">{suggested === "xl" ? "GY XL" : suggested === "premium" ? "GY Premium" : "GY Standard"}</p>
            </div>
            <div className="w-16 h-16 relative">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ffffff20" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#facc15" strokeWidth="3"
                  strokeDasharray={`${(score / 210) * 100} 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">{Math.round((score / 210) * 100)}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Section 1: Vehicle Classification */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2"><Car className="h-4 w-4 text-yellow-500" /> Vehicle Classification</h3>
            <div>
              <p className="text-xs text-gray-500 mb-2">Vehicle Type</p>
              <ToggleGroup testPrefix="vtype" options={[
                {val:"Sedan",label:"Sedan"},{val:"Hatchback",label:"Hatchback"},{val:"SUV",label:"SUV"},
                {val:"Crossover",label:"Crossover"},{val:"Minivan",label:"Minivan"},{val:"Minibus",label:"Minibus"},
              ]} value={inspVehicleType} onChange={setInspVehicleType} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">Seating Capacity</p>
              <ToggleGroup testPrefix="seats-cap" options={[
                {val:"4",label:"4"},{val:"5",label:"5"},{val:"6",label:"6"},{val:"7",label:"7"},{val:"8",label:"8+"},{val:"10",label:"10+"},
              ]} value={String(inspSeatingCapacity)} onChange={v => setInspSeatingCapacity(Number(v))} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">Vehicle Age</p>
              <ToggleGroup testPrefix="vage" options={[
                {val:"<3",label:"< 3 years"},{val:"3-5",label:"3–5 years"},{val:"5-10",label:"5–10 years"},{val:">10",label:"> 10 years"},
              ]} value={inspVehicleAge} onChange={v => setInspVehicleAge(v as any)} />
            </div>
          </div>

          {/* Section 2: Exterior */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-yellow-500" /> Exterior Condition</h3>
            <div>
              <p className="text-xs text-gray-500 mb-2">Paint & Bodywork Quality</p>
              <StarPicker value={inspExterior} onChange={setInspExterior} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">Body Damage</p>
              <ToggleGroup testPrefix="damage" options={[{val:"none",label:"None"},{val:"minor",label:"Minor dents/scratches"},{val:"major",label:"Major damage"}]} value={inspBodyDamage} onChange={v => setInspBodyDamage(v as any)} />
            </div>
          </div>

          {/* Section 3: Interior */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2"><Star className="h-4 w-4 text-yellow-500" /> Interior Condition</h3>
            <div>
              <p className="text-xs text-gray-500 mb-2">Overall Cleanliness</p>
              <StarPicker value={inspCleanliness} onChange={setInspCleanliness} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">Interior Condition (dash, panels)</p>
              <StarPicker value={inspInterior} onChange={setInspInterior} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">Seat Condition</p>
              <StarPicker value={inspSeats} onChange={setInspSeats} />
            </div>
          </div>

          {/* Section 4: Features */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-500" /> Features & Amenities</h3>
            <div>
              <p className="text-xs text-gray-500 mb-2">Air Conditioning</p>
              <ToggleGroup testPrefix="ac" options={[{val:"working",label:"Working"},{val:"not_working",label:"Not Working"},{val:"none",label:"None"}]} value={inspAC} onChange={v => setInspAC(v as any)} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">Entertainment System</p>
              <ToggleGroup testPrefix="ent" options={[{val:"none",label:"None"},{val:"bluetooth",label:"Bluetooth / AUX"},{val:"full",label:"Full System"}]} value={inspEntertainment} onChange={v => setInspEntertainment(v as any)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Toggle value={inspCharging} onChange={setInspCharging} label="USB Charging" />
              <Toggle value={inspTinting} onChange={setInspTinting} label="Window Tinting" />
            </div>
          </div>

          {/* Section 5: Safety */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-yellow-500" /> Safety Compliance</h3>
            <div className="flex flex-wrap gap-2">
              <Toggle value={inspABS} onChange={setInspABS} label="ABS Brakes" />
              <Toggle value={inspAirbags} onChange={setInspAirbags} label="Airbags" />
              <Toggle value={inspSeatbelts} onChange={setInspSeatbelts} label="All Seatbelts" />
            </div>
          </div>

          {/* Score breakdown */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-yellow-500" /> Score Breakdown</h3>
            <ScoreRow label="Exterior (×8)" value={inspExterior * 8} max={40} />
            <ScoreRow label="Interior (×8)" value={inspInterior * 8} max={40} />
            <ScoreRow label="Cleanliness (×7)" value={inspCleanliness * 7} max={35} />
            <ScoreRow label="Seat Condition (×5)" value={inspSeats * 5} max={25} />
            <ScoreRow label="Air Conditioning" value={inspAC === "working" ? 25 : 0} max={25} />
            <ScoreRow label="Vehicle Age" value={inspVehicleAge === "<3" ? 25 : inspVehicleAge === "3-5" ? 15 : inspVehicleAge === "5-10" ? 5 : 0} max={25} />
            <ScoreRow label="Features & Safety" value={(inspCharging?5:0)+(inspTinting?5:0)+(inspABS?8:0)+(inspAirbags?8:0)+(inspSeatbelts?8:0)+(inspEntertainment==="bluetooth"?8:inspEntertainment==="full"?18:0)} max={52} />
          </div>

          {/* Category override */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2"><Award className="h-4 w-4 text-yellow-500" /> Category Assignment</h3>
            <p className="text-xs text-gray-500">System suggests <strong>{suggested === "xl" ? "GY XL" : suggested === "premium" ? "GY Premium" : "GY Standard"}</strong> based on the checklist. You can override below.</p>
            <div className="grid grid-cols-3 gap-2">
              {([["","Use Suggested"],["standard","GY Standard"],["premium","GY Premium"],["xl","GY XL"]] as [string,string][]).map(([val, label]) => (
                <button key={val} onClick={() => setInspCategoryOverride(val as any)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border-2 transition-colors ${inspCategoryOverride === val ? "border-yellow-400 bg-yellow-50 text-yellow-800" : "border-gray-200 bg-white text-gray-500"} ${val === "" ? "col-span-3" : ""}`}
                  data-testid={`override-${val || "auto"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
            <h3 className="font-bold text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-yellow-500" /> Inspector Notes</h3>
            <textarea
              className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none min-h-[80px]"
              placeholder="Any observations, defects, or remarks..."
              value={inspNotes}
              onChange={e => setInspNotes(e.target.value)}
              data-testid="input-insp-notes"
            />
          </div>
        </div>

        <div className="shrink-0 bg-white border-t border-gray-100 p-4">
          <Button onClick={handleSubmitInspection} disabled={inspSubmitting}
            className="w-full h-14 rounded-2xl bg-black text-yellow-400 hover:bg-gray-900 font-black text-base"
            data-testid="btn-submit-inspection">
            {inspSubmitting ? "Saving..." : `Save Inspection — ${catLabel} (${score}/210)`}
          </Button>
        </div>
      </div>
    );
  }

  // ── Review Driver Application ──
  if (view === "review-driver" && reviewingDriver) {
    const d = reviewingDriver;
    const DOCS = [
      { label: "Driver's License", doc: d.driverLicenseDoc },
      { label: "Vehicle License Disc", doc: d.vehicleLicenseDoc },
      { label: "Roadworthy Certificate", doc: d.roadworthyCertDoc },
      { label: "Proof of Insurance", doc: d.proofOfInsuranceDoc },
      { label: "Profile Photo", doc: d.profilePhotoDoc },
    ];
    const uploadedDocs = DOCS.filter(x => x.doc);
    const allDocsViewed = uploadedDocs.length > 0 && uploadedDocs.every(x => viewedDocs.has(x.label));
    const unviewedCount = uploadedDocs.filter(x => !viewedDocs.has(x.label)).length;

    const PRESET_REASONS = [
      "Documents are expired",
      "Documents are unreadable or blurry",
      "Documents do not match the application details",
      "Vehicle does not meet requirements",
      "Incomplete or incorrect information",
    ];

    const openDoc = (label: string, doc: string) => {
      setViewedDocs(prev => new Set([...prev, label]));
      if (doc.startsWith("data:")) {
        const win = window.open();
        if (win) { win.document.write(`<html><body style="margin:0;background:#000;display:flex;justify-content:center;align-items:center;min-height:100vh"><img src="${doc}" style="max-width:100%;height:auto" /></body></html>`); }
      } else {
        window.open(doc, "_blank");
      }
    };

    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => { setView("approvals"); setReviewingDriver(null); setShowRejectInput(false); setViewedDocs(new Set()); }} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Review Application</h1>
            {uploadedDocs.length > 0 && (
              <p className="text-xs text-gray-500">{viewedDocs.size}/{uploadedDocs.length} documents reviewed</p>
            )}
          </div>
          {!allDocsViewed && uploadedDocs.length > 0 && (
            <span className="text-[11px] bg-orange-100 text-orange-700 font-bold px-2 py-1 rounded-full">{unviewedCount} doc{unviewedCount > 1 ? "s" : ""} to review</span>
          )}
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-auto pb-28">
          {/* Applicant profile */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
            <Avatar className="h-16 w-16 mx-auto mb-3 border-2 border-yellow-400">
              {d.profilePhotoDoc ? (
                <img src={d.profilePhotoDoc} alt={d.fullName} className="w-full h-full object-cover rounded-full" />
              ) : (
                <AvatarFallback className="bg-yellow-400 text-black text-xl font-bold">{d.fullName[0]}</AvatarFallback>
              )}
            </Avatar>
            <h2 className="text-lg font-bold">{d.fullName}</h2>
            <p className="text-gray-500 text-sm">{d.phone}</p>
            {d.email && <p className="text-gray-500 text-xs">{d.email}</p>}
            <span className="inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">Pending Approval</span>
          </div>

          {/* Personal Details */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
            <h3 className="font-bold text-sm text-gray-600 flex items-center gap-2"><UserIcon className="h-4 w-4" /> Personal Details</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-gray-500">ID Number</span><span className="font-medium">{d.idNumber || "—"}</span>
              <span className="text-gray-500">Address</span><span className="font-medium">{d.address || "—"}</span>
              <span className="text-gray-500">Phone</span><span className="font-medium">{d.phone}</span>
              {d.email && <><span className="text-gray-500">Email</span><span className="font-medium">{d.email}</span></>}
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
            <h3 className="font-bold text-sm text-gray-600 flex items-center gap-2"><Car className="h-4 w-4" /> Vehicle Details</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-gray-500">Make</span><span className="font-medium">{d.vehicleMake || "—"}</span>
              <span className="text-gray-500">Model</span><span className="font-medium">{d.vehicleModel || "—"}</span>
              <span className="text-gray-500">Color</span><span className="font-medium">{d.vehicleColor || "—"}</span>
              <span className="text-gray-500">Year</span><span className="font-medium">{d.vehicleYear || "—"}</span>
              <span className="text-gray-500">Plate</span><span className="font-medium">{d.licensePlate || "—"}</span>
              <span className="text-gray-500">Reg. Number</span><span className="font-medium">{d.vehicleRegistrationNumber || "—"}</span>
            </div>
          </div>

          {/* License Info */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
            <h3 className="font-bold text-sm text-gray-600 flex items-center gap-2"><FileText className="h-4 w-4" /> License Info</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-gray-500">License No.</span><span className="font-medium">{d.driverLicenseNumber || "—"}</span>
              <span className="text-gray-500">Code</span><span className="font-medium">{d.driverLicenseCode || "—"}</span>
              <span className="text-gray-500">License Expiry</span><span className="font-medium">{d.driverLicenseExpiry || "—"}</span>
              <span className="text-gray-500">Vehicle Disc Expiry</span><span className="font-medium">{d.vehicleLicenseExpiry || "—"}</span>
              <span className="text-gray-500">Roadworthy Expiry</span><span className="font-medium">{d.roadworthyCertExpiry || "—"}</span>
            </div>
          </div>

          {/* Documents — must open each to unlock approve */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-600 flex items-center gap-2"><FileText className="h-4 w-4" /> Uploaded Documents</h3>
              {!allDocsViewed && uploadedDocs.length > 0 && (
                <span className="text-[10px] text-orange-600 font-medium">Open each document to enable approval</span>
              )}
              {allDocsViewed && <span className="text-[10px] text-green-600 font-bold flex items-center gap-1"><CheckCircle className="h-3 w-3" /> All reviewed</span>}
            </div>
            {DOCS.map(({ label, doc }) => {
              const viewed = viewedDocs.has(label);
              return (
                <div key={label} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${doc ? (viewed ? "bg-green-50" : "bg-orange-50") : "bg-gray-50"}`}>
                  {doc ? (
                    <>
                      {viewed
                        ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        : <Eye className="h-4 w-4 text-orange-400 shrink-0" />
                      }
                      <span className="text-sm flex-1">{label}</span>
                      {(!doc.endsWith(".pdf") && !doc.startsWith("data:application/pdf")) && (
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                          <img src={doc} alt={label} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        </div>
                      )}
                      <button
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${viewed ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700 hover:bg-orange-200"}`}
                        onClick={() => openDoc(label, doc)}
                        data-testid={`view-doc-${label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {viewed ? "Reviewed" : "Open"}
                      </button>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-gray-300 shrink-0" />
                      <span className="text-sm text-gray-400 flex-1">{label} — not uploaded</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Rejection panel */}
          {showRejectInput && (
            <div className="bg-red-50 rounded-xl p-4 border border-red-200 space-y-3">
              <p className="text-sm font-bold text-red-700 flex items-center gap-2"><XCircle className="h-4 w-4" /> Rejection Feedback</p>
              <p className="text-xs text-gray-500">Select a reason or write a custom message. This will be shown to the applicant.</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_REASONS.map(r => (
                  <button
                    key={r}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${rejectReason === r ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-600 border-gray-300 hover:border-red-400"}`}
                    onClick={() => setRejectReason(r)}
                    data-testid={`preset-reason-${r.slice(0, 20)}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Or write a custom message to the applicant..."
                className="w-full h-24 rounded-lg border border-red-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                data-testid="input-reject-reason"
              />
              <p className="text-[11px] text-gray-400">The applicant will see this message and can resubmit after addressing the issue.</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => { setShowRejectInput(false); setRejectReason(""); }}>Cancel</Button>
                <Button
                  className="flex-1 rounded-xl h-11 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleReject(d.id)}
                  disabled={!rejectReason.trim()}
                  data-testid="btn-confirm-reject"
                >
                  Send Feedback & Reject
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!showRejectInput && (
          <div className="bg-white border-t border-gray-100 p-4 space-y-2 fixed bottom-0 left-0 right-0">
            {!allDocsViewed && uploadedDocs.length > 0 && (
              <p className="text-center text-xs text-orange-600 font-medium">
                Open all documents above to enable approval
              </p>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-14 rounded-2xl text-red-600 border-red-200" onClick={() => setShowRejectInput(true)} data-testid="btn-reject-driver">
                <XCircle className="h-4 w-4 mr-2" /> Reject
              </Button>
              <Button
                className={`flex-1 h-14 rounded-2xl font-bold transition-all ${allDocsViewed || uploadedDocs.length === 0 ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
                onClick={() => { if (allDocsViewed || uploadedDocs.length === 0) handleApprove(d.id); }}
                disabled={!allDocsViewed && uploadedDocs.length > 0}
                data-testid="btn-approve-driver"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {allDocsViewed || uploadedDocs.length === 0 ? "Approve" : `Review ${unviewedCount} doc${unviewedCount > 1 ? "s" : ""} first`}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Pending Approvals ──
  if (view === "approvals") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setView("dashboard")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Pending Approvals ({pendingDrivers.length})</h1>
        </div>
        <div className="p-4 space-y-3 overflow-auto">
          {pendingDrivers.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-4" />
              <p className="font-medium text-gray-500">All caught up!</p>
              <p className="text-sm text-gray-400">No pending driver applications</p>
            </div>
          ) : pendingDrivers.map(d => (
            <button
              key={d.id}
              className="w-full text-left bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3"
              onClick={() => { setReviewingDriver(d); setView("review-driver"); setViewedDocs(new Set()); setShowRejectInput(false); setRejectReason(""); }}
              data-testid={`pending-driver-${d.id}`}
            >
              <Avatar className="h-11 w-11 border-2 border-yellow-400">
                <AvatarFallback className="bg-yellow-400 text-black font-bold">{d.fullName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{d.fullName}</div>
                <div className="text-xs text-gray-500">{d.phone}</div>
                <div className="text-[10px] text-gray-400">{d.vehicleColor} {d.vehicleMake} {d.vehicleModel} · {d.licensePlate}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Pending</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Drivers List ──
  if (view === "drivers") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setView("dashboard")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Drivers ({drivers.length})</h1>
        </div>
        <div className="p-4 space-y-2 overflow-auto">
          {drivers.map(d => {
            const catLabel = d.vehicleCategory === "xl" ? "GY XL" : d.vehicleCategory === "premium" ? "GY Premium" : "GY Standard";
            const catColor = d.vehicleCategory === "xl" ? "bg-purple-100 text-purple-700" : d.vehicleCategory === "premium" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700";
            const needsInspection = d.approvalStatus === "approved" && d.inspectionStatus !== "inspected";
            return (
              <div key={d.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100" data-testid={`driver-card-${d.id}`}>
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 border-2 border-yellow-400">
                    <AvatarFallback className="bg-yellow-400 text-black font-bold">{d.fullName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{d.fullName}</span>
                      {d.approvalStatus === "approved" && <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${catColor}`}>{catLabel}</span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {d.rating?.toFixed(1)} · {d.totalTrips} trips
                      {d.inspectionScore != null && <span className="ml-1 text-gray-400">· Score {d.inspectionScore}/210</span>}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{d.vehicleColor} {d.vehicleMake} {d.vehicleModel} · {d.licensePlate}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.approvalStatus === "approved" ? (d.isOnline ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500") : d.approvalStatus === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                      {d.approvalStatus === "approved" ? (d.isOnline ? "Online" : "Offline") : d.approvalStatus}
                    </span>
                    <div className="text-sm font-bold mt-1">R{(d.earnings ?? 0).toLocaleString()}</div>
                  </div>
                </div>
                {needsInspection && (
                  <button
                    onClick={() => { resetInspectionForm(); setInspectingDriver(d); setView("inspect-driver"); }}
                    className="mt-3 w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xs rounded-xl py-2 transition-colors"
                    data-testid={`btn-inspect-${d.id}`}
                  >
                    <ClipboardList className="h-3.5 w-3.5" /> Inspect Vehicle
                  </button>
                )}
                {d.inspectionStatus === "inspected" && (
                  <button
                    onClick={() => { resetInspectionForm(); setInspectingDriver(d); setView("inspect-driver"); }}
                    className="mt-3 w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs rounded-xl py-2 transition-colors"
                    data-testid={`btn-re-inspect-${d.id}`}
                  >
                    <ClipboardList className="h-3.5 w-3.5" /> Re-Inspect Vehicle
                  </button>
                )}
              </div>
            );
          })}
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
        <div className="p-3 flex gap-2 flex-wrap sticky top-14 bg-gray-50 z-10">
          <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full">{completedTrips.length} completed</span>
          <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full">{cancelledTrips.length} cancelled</span>
          <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded-full">{allTrips.length - completedTrips.length - cancelledTrips.length} active</span>
          {whatsappTrips.length > 0 && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full" data-testid="badge-whatsapp-trips">{whatsappTrips.length} WhatsApp</span>}
        </div>
        <div className="p-3 space-y-2 overflow-auto">
          {allTrips.map(trip => (
            <div key={trip.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" data-testid={`admin-trip-${trip.id}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-500">{trip.createdAt ? new Date(trip.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</span>
                  {trip.bookingChannel === "whatsapp" && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700" data-testid={`badge-wa-${trip.id}`}>WhatsApp</span>}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trip.status === "completed" ? "bg-green-100 text-green-700" : trip.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {trip.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm mb-1">
                <div className="w-2 h-2 bg-green-500 rounded-full shrink-0" /><span className="truncate">{trip.pickupName}</span>
                <span className="text-gray-300">→</span>
                <div className="w-2 h-2 bg-black rounded-full shrink-0" /><span className="truncate">{trip.dropoffName}</span>
              </div>
              <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-gray-50">
                <span className="text-gray-500">{trip.vehicleType} · {trip.distance?.toFixed(1)} km · {trip.paymentMethod}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold">R{trip.fare}</span>
                  <button
                    onClick={() => { setChatTripId(trip.id); setChatLabel(`Trip: ${trip.pickupName} → ${trip.dropoffName}`); }}
                    className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center shrink-0"
                    data-testid={`btn-admin-chat-trip-${trip.id}`}
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {allTrips.length === 0 && <div className="text-center py-16 text-gray-400 text-sm">No trips yet</div>}
        </div>
        {chatTripId && user && (
          <TripChat tripId={chatTripId} userId={user.id} userRole="admin" otherName={chatLabel} onClose={() => { setChatTripId(null); setChatLabel(""); }} />
        )}
      </div>
    );
  }

  // ── Pricing ──
  if (view === "users") {
    const nonAdminUsers = allUsers.filter(u => u.role !== "admin");
    const riders = nonAdminUsers.filter(u => u.role === "rider");
    const driverUsers = nonAdminUsers.filter(u => u.role === "driver");
    const verifiedCount = nonAdminUsers.filter(u => u.isVerified).length;

    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setView("dashboard")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Users & Accounts</h1>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
              <div className="text-lg font-bold text-blue-600">{riders.length}</div>
              <div className="text-[10px] text-gray-500">Riders</div>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
              <div className="text-lg font-bold text-green-600">{driverUsers.length}</div>
              <div className="text-[10px] text-gray-500">Drivers</div>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
              <div className="text-lg font-bold text-violet-600">{verifiedCount}</div>
              <div className="text-[10px] text-gray-500">Verified</div>
            </div>
          </div>

          {pendingResetRequests.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-violet-500" />
                Password Reset Requests
              </h3>
              {pendingResetRequests.map((req: any) => (
                <div key={req.id} className="bg-white rounded-xl p-4 shadow-sm border border-violet-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-violet-100 p-1.5 rounded-full">
                        <Lock className="h-3.5 w-3.5 text-violet-600" />
                      </div>
                      <div>
                        <div className="font-bold text-sm">{req.username}</div>
                        <div className="text-[10px] text-gray-500">{req.phone}</div>
                      </div>
                    </div>
                    <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Pending</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mb-3">Requested {new Date(req.createdAt).toLocaleString()}</div>
                  <div className="flex gap-2">
                    <button
                      className="flex-1 h-9 rounded-lg text-xs font-bold bg-violet-500 text-white hover:bg-violet-600 transition-colors"
                      onClick={async () => {
                        const tempPassword = "Reset" + Math.floor(1000 + Math.random() * 9000);
                        try {
                          await adminResetUserPassword(req.userId, tempPassword);
                          await updatePasswordResetRequest(req.id, { status: "approved", adminNotes: `Reset to: ${tempPassword}`, resolvedAt: new Date() });
                          queryClient.invalidateQueries({ queryKey: ["/api/password-reset-requests/pending"] });
                          toast({ title: "Password reset", description: `New password for ${req.username}: ${tempPassword}` });
                        } catch {
                          toast({ title: "Error", description: "Failed to reset password", variant: "destructive" });
                        }
                      }}
                      data-testid={`btn-approve-reset-${req.id}`}
                    >
                      Reset & Generate Password
                    </button>
                    <button
                      className="h-9 px-3 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                      onClick={async () => {
                        try {
                          await updatePasswordResetRequest(req.id, { status: "rejected", resolvedAt: new Date() });
                          queryClient.invalidateQueries({ queryKey: ["/api/password-reset-requests/pending"] });
                          toast({ title: "Request dismissed" });
                        } catch {
                          toast({ title: "Error", variant: "destructive" });
                        }
                      }}
                      data-testid={`btn-dismiss-reset-${req.id}`}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3 className="font-bold text-sm">All Users</h3>
          <div className="space-y-2">
            {nonAdminUsers.map(u => (
              <div key={u.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100" data-testid={`user-card-${u.id}`}>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={u.role === "driver" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                      {u.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm truncate">{u.fullName}</span>
                      {u.isVerified && <ShieldCheck className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                    </div>
                    <div className="text-[10px] text-gray-500">@{u.username} · {u.phone}</div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${u.role === "driver" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                        {u.role === "driver" ? "Driver" : "Rider"}
                      </span>
                      {u.role === "driver" && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${u.approvalStatus === "approved" ? "bg-green-100 text-green-700" : u.approvalStatus === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {u.approvalStatus === "approved" ? "Approved" : u.approvalStatus === "rejected" ? "Rejected" : "Pending"}
                        </span>
                      )}
                      {u.role === "driver" && !u.onboardingComplete && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          Onboarding incomplete
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  {u.role === "driver" && !u.onboardingComplete ? (
                    <div className="flex-1 h-8 rounded-lg text-[11px] font-bold bg-orange-50 text-orange-600 flex items-center justify-center">
                      <Clock className="inline h-3 w-3 mr-1" />Awaiting documents
                    </div>
                  ) : u.role === "driver" && u.approvalStatus !== "approved" ? (
                    <button
                      className="flex-1 h-8 rounded-lg text-[11px] font-bold bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors"
                      onClick={() => { setReviewingDriver(u); setView("review-driver"); setViewedDocs(new Set()); setShowRejectInput(false); setRejectReason(""); }}
                      data-testid={`btn-review-${u.id}`}
                    >
                      <Eye className="inline h-3 w-3 mr-1" />Review Application
                    </button>
                  ) : (
                    <button
                      className={`flex-1 h-8 rounded-lg text-[11px] font-bold transition-colors ${u.isVerified ? "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600" : "bg-green-50 text-green-600 hover:bg-green-100"}`}
                      onClick={async () => {
                        try {
                          await verifyUser(u.id, !u.isVerified);
                          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
                          toast({ title: u.isVerified ? "Verification removed" : "Account verified", description: u.fullName });
                        } catch {
                          toast({ title: "Error", variant: "destructive" });
                        }
                      }}
                      data-testid={`btn-verify-${u.id}`}
                    >
                      {u.isVerified ? (
                        <><ShieldX className="inline h-3 w-3 mr-1" />Unverify</>
                      ) : (
                        <><ShieldCheck className="inline h-3 w-3 mr-1" />Verify</>
                      )}
                    </button>
                  )}
                  <button
                    className="flex-1 h-8 rounded-lg text-[11px] font-bold bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors"
                    onClick={() => {
                      setResetPasswordUserId(u.id);
                      setResetPasswordValue("");
                      setShowResetPassword(true);
                    }}
                    data-testid={`btn-admin-reset-${u.id}`}
                  >
                    <KeyRound className="inline h-3 w-3 mr-1" />Reset Password
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {showResetPassword && resetPasswordUserId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setShowResetPassword(false)}>
            <div className="bg-white w-full max-w-md rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg">Reset Password</h3>
              <p className="text-sm text-gray-500">Set a new password for {allUsers.find(u => u.id === resetPasswordUserId)?.fullName}</p>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full h-12 rounded-xl border border-gray-200 px-4 pr-12 text-sm"
                  placeholder="New password (min 4 characters)"
                  value={resetPasswordValue}
                  onChange={e => setResetPasswordValue(e.target.value)}
                  data-testid="input-admin-new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                className="w-full h-12 rounded-xl font-bold bg-violet-500 text-white hover:bg-violet-600 transition-colors disabled:opacity-50"
                disabled={resetPasswordValue.length < 4}
                onClick={async () => {
                  try {
                    await adminResetUserPassword(resetPasswordUserId, resetPasswordValue);
                    setShowResetPassword(false);
                    toast({ title: "Password reset", description: `Password updated for ${allUsers.find(u => u.id === resetPasswordUserId)?.fullName}` });
                  } catch {
                    toast({ title: "Error", description: "Failed to reset password", variant: "destructive" });
                  }
                }}
                data-testid="btn-confirm-admin-reset"
              >
                Reset Password
              </button>
              <button
                className="w-full h-10 rounded-xl text-sm text-gray-500"
                onClick={() => setShowResetPassword(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === "pricing") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setView("dashboard")} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Vehicles & Pricing</h1>
        </div>
        <div className="p-4 space-y-3">
          {vehicleTypes.map(vt => (
            <div key={vt.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                  <Car className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{vt.name}</h3>
                  <p className="text-xs text-gray-500">{vt.description}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${vt.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {vt.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-sm font-bold">R{vt.basePrice}</div>
                  <div className="text-[10px] text-gray-500">Base</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-sm font-bold">R{vt.pricePerKm}/km</div>
                  <div className="text-[10px] text-gray-500">Per Km</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-sm font-bold">{vt.seats}</div>
                  <div className="text-[10px] text-gray-500">Seats</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── SOS Alerts ──
  if (view === "sos") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-red-600 text-white p-4 flex items-center gap-3 sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setView("dashboard")} className="rounded-full text-white hover:bg-white/20"><ChevronLeft className="h-6 w-6" /></Button>
          <AlertTriangle className="h-5 w-5" />
          <h1 className="text-xl font-bold">SOS Alerts ({sosAlerts.length})</h1>
        </div>
        <div className="p-3 flex gap-2 sticky top-14 bg-gray-50 z-10">
          <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full">{sosAlerts.filter(a => a.status === "active").length} active</span>
          <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded-full">{sosAlerts.filter(a => a.status === "acknowledged").length} acknowledged</span>
          <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full">{sosAlerts.filter(a => a.status === "resolved").length} resolved</span>
        </div>
        <div className="p-3 space-y-3 overflow-auto flex-1">
          {sosAlerts.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-4" />
              <p className="font-medium text-gray-500">No SOS alerts</p>
              <p className="text-sm text-gray-400">All clear</p>
            </div>
          ) : sosAlerts.map(alert => (
            <div key={alert.id} className={`rounded-xl p-4 shadow-sm border ${
              alert.status === "active" ? "bg-red-50 border-red-200" : alert.status === "acknowledged" ? "bg-yellow-50 border-yellow-200" : "bg-white border-gray-100"
            }`} data-testid={`sos-alert-${alert.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    alert.status === "active" ? "bg-red-500 animate-pulse" : alert.status === "acknowledged" ? "bg-yellow-500" : "bg-green-500"
                  }`}>
                    <AlertTriangle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">{alert.userRole === "rider" ? "Rider" : "Driver"} SOS</div>
                    <div className="text-[10px] text-gray-500">{alert.createdAt ? new Date(alert.createdAt).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</div>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  alert.status === "active" ? "bg-red-100 text-red-700" : alert.status === "acknowledged" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                }`}>{alert.status}</span>
              </div>

              <div className="space-y-1.5 text-xs mb-3">
                <div className="flex items-center gap-2"><span className="text-gray-500 w-16">User ID:</span><span className="font-mono text-gray-700 truncate">{alert.userId}</span></div>
                {alert.tripId && <div className="flex items-center gap-2"><span className="text-gray-500 w-16">Trip ID:</span><span className="font-mono text-gray-700 truncate">{alert.tripId}</span></div>}
                {alert.lat && alert.lng && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-16">Location:</span>
                    <a href={`https://www.google.com/maps?q=${alert.lat},${alert.lng}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline flex items-center gap-1">
                      {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)} <MapPin className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Live GPS map — always shown for active/acknowledged alerts */}
              {(alert.status === "active" || alert.status === "acknowledged") && (
                <SosLiveMap alert={alert} />
              )}

              {alert.adminNotes && (
                <div className="bg-white/80 rounded-lg px-3 py-2 mb-3 text-xs text-gray-700 border border-gray-100">
                  <span className="font-bold text-gray-500">Notes: </span>{alert.adminNotes}
                </div>
              )}

              {alert.tripId && (
                <button
                  onClick={() => { setChatTripId(alert.tripId!); setChatLabel(`SOS: ${alert.userRole === "rider" ? "Rider" : "Driver"} Alert`); }}
                  className="w-full mb-3 flex items-center justify-center gap-2 bg-red-600 text-white rounded-lg py-2 text-xs font-bold"
                  data-testid={`btn-admin-chat-sos-${alert.id}`}
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Chat with Trip Participants
                </button>
              )}

              {alert.status !== "resolved" && (
                <div className="space-y-2">
                  <textarea
                    value={sosNotes[alert.id] || ""}
                    onChange={e => setSosNotes(prev => ({ ...prev, [alert.id]: e.target.value }))}
                    placeholder="Add notes..."
                    className="w-full h-16 rounded-lg border border-gray-200 p-2 text-xs resize-none"
                    data-testid={`input-sos-notes-${alert.id}`}
                  />
                  <div className="flex gap-2">
                    {alert.status === "active" && (
                      <Button size="sm" className="flex-1 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-xs h-9" onClick={async () => {
                        await updateSosAlert(alert.id, { status: "acknowledged", adminNotes: sosNotes[alert.id] || undefined });
                        queryClient.invalidateQueries({ queryKey: ["/api/sos"] });
                        toast({ title: "Alert Acknowledged" });
                      }} data-testid={`btn-ack-sos-${alert.id}`}>Acknowledge</Button>
                    )}
                    <Button size="sm" className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs h-9" onClick={async () => {
                      await updateSosAlert(alert.id, { status: "resolved", adminNotes: sosNotes[alert.id] || undefined });
                      queryClient.invalidateQueries({ queryKey: ["/api/sos"] });
                      toast({ title: "Alert Resolved" });
                    }} data-testid={`btn-resolve-sos-${alert.id}`}>Resolve</Button>
                  </div>
                </div>
              )}

              {alert.resolvedAt && (
                <div className="text-[10px] text-gray-400 mt-2">Resolved: {new Date(alert.resolvedAt).toLocaleString("en-ZA")}</div>
              )}
            </div>
          ))}
        </div>
        {chatTripId && user && (
          <TripChat tripId={chatTripId} userId={user.id} userRole="admin" otherName={chatLabel} onClose={() => { setChatTripId(null); setChatLabel(""); }} />
        )}
      </div>
    );
  }

  // ── Driver Statements ──
  if (view === "statements") {
    const approvedDrivers = drivers.filter(d => d.approvalStatus === "approved");
    const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const years = [new Date().getFullYear(), new Date().getFullYear() - 1];

    const fetchStatement = async () => {
      if (!stmtDriverId) { toast({ title: "Select a driver", variant: "destructive" }); return; }
      setStmtLoading(true);
      setStmtData(null);
      try {
        const res = await fetch(`/api/admin/driver-statement?driverId=${stmtDriverId}&month=${stmtMonth}&year=${stmtYear}`, { credentials: "include" });
        if (!res.ok) throw new Error(await res.text());
        setStmtData(await res.json());
      } catch (err: any) {
        toast({ title: "Failed to load statement", description: err.message, variant: "destructive" });
      } finally {
        setStmtLoading(false);
      }
    };

    const handleDownload = async () => {
      if (!stmtData) return;
      try {
        // Register the statement to get a unique verification code
        let verificationCode: string | undefined;
        try {
          const issueRes = await fetch("/api/admin/issue-statement", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              driverId: stmtDriverId,
              driverName: stmtData.driver.fullName,
              month: stmtMonth,
              year: stmtYear,
              period: `${MONTH_NAMES[stmtMonth - 1]} ${stmtYear}`,
              totalFare: stmtData.summary.totalFare,
              driverPayout: stmtData.summary.driverPayout,
              completedTrips: stmtData.summary.completedTrips,
              issuedByAdminId: user.id,
            }),
          });
          if (issueRes.ok) {
            const issued = await issueRes.json();
            verificationCode = issued.verificationCode;
          }
        } catch {}
        await generateStatementPDF({ ...stmtData, verificationCode });
      } catch (err: any) {
        toast({ title: "PDF error", description: err.message, variant: "destructive" });
      }
    };

    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => { setView("dashboard"); setStmtData(null); }} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Driver Statements</h1>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-auto pb-8">
          {/* Filters */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h2 className="font-bold text-sm">Generate Statement</h2>

            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Driver</label>
              <select
                data-testid="stmt-driver-select"
                value={stmtDriverId}
                onChange={e => { setStmtDriverId(e.target.value); setStmtData(null); }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="">— Select a driver —</option>
                {approvedDrivers.map(d => (
                  <option key={d.id} value={d.id}>{d.fullName} · {d.phone}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 font-medium block mb-1">Month</label>
                <select
                  data-testid="stmt-month-select"
                  value={stmtMonth}
                  onChange={e => { setStmtMonth(Number(e.target.value)); setStmtData(null); }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 font-medium block mb-1">Year</label>
                <select
                  data-testid="stmt-year-select"
                  value={stmtYear}
                  onChange={e => { setStmtYear(Number(e.target.value)); setStmtData(null); }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <button
              data-testid="btn-generate-statement"
              onClick={fetchStatement}
              disabled={stmtLoading || !stmtDriverId}
              className="w-full h-12 rounded-xl bg-black text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-gray-900 transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              {stmtLoading ? "Loading..." : "Generate Statement"}
            </button>
          </div>

          {/* Statement Preview */}
          {stmtData && (
            <>
              {/* Driver card */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center font-bold text-lg text-black">
                    {stmtData.driver.fullName[0]}
                  </div>
                  <div>
                    <div className="font-bold">{stmtData.driver.fullName}</div>
                    <div className="text-xs text-gray-500">{stmtData.driver.phone}</div>
                    {stmtData.driver.vehicleMake && (
                      <div className="text-xs text-gray-500">{stmtData.driver.vehicleMake} {stmtData.driver.vehicleModel} · {stmtData.driver.licensePlate || "No plate"}</div>
                    )}
                  </div>
                </div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{MONTH_NAMES[stmtData.month - 1]} {stmtData.year} Statement</div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                  <div className="text-xs text-gray-500 mb-1">Completed Trips</div>
                  <div className="text-2xl font-bold">{stmtData.summary.completedTrips}</div>
                  <div className="text-[10px] text-gray-400">{stmtData.summary.cancelledTrips} cancelled</div>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                  <div className="text-xs text-gray-500 mb-1">Gross Fares</div>
                  <div className="text-2xl font-bold">R{stmtData.summary.totalFare.toFixed(2)}</div>
                  <div className="text-[10px] text-gray-400">Cash: {stmtData.summary.cashTrips} · Card: {stmtData.summary.cardTrips}</div>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                  <div className="text-xs text-gray-500 mb-1">Platform Fee (15%)</div>
                  <div className="text-xl font-bold text-red-600">R{stmtData.summary.platformFee.toFixed(2)}</div>
                </div>
                <div className="bg-yellow-400 rounded-xl p-3 shadow-sm">
                  <div className="text-xs font-semibold text-yellow-900 mb-1">Driver Payout (85%)</div>
                  <div className="text-2xl font-bold text-black">R{stmtData.summary.driverPayout.toFixed(2)}</div>
                </div>
              </div>

              {/* Trip list */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-sm">Trip Log ({stmtData.trips.length})</h3>
                  <span className="text-xs text-gray-500">{MONTH_NAMES[stmtData.month - 1]} {stmtData.year}</span>
                </div>
                {stmtData.trips.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">No trips found for this period</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {stmtData.trips.map((trip: any) => (
                      <div key={trip.id} className="px-4 py-3 flex items-start gap-3" data-testid={`stmt-trip-${trip.id}`}>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-500 mb-0.5">
                            {trip.createdAt ? new Date(trip.createdAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" }) : "—"}
                            {" · "}
                            {trip.createdAt ? new Date(trip.createdAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }) : ""}
                          </div>
                          <div className="text-sm font-medium truncate">{trip.pickupName} → {trip.dropoffName}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-400 capitalize">{trip.paymentMethod}</span>
                            {trip.duration && <span className="text-[10px] text-gray-400">{trip.duration} min</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-sm">R{trip.fare.toFixed(2)}</div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            trip.status === "completed" ? "bg-green-100 text-green-700" :
                            trip.status === "cancelled" ? "bg-red-100 text-red-600" :
                            "bg-gray-100 text-gray-500"
                          }`}>
                            {trip.status === "completed" ? "Done" : trip.status === "cancelled" ? "Cancelled" : trip.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Download button */}
              <button
                data-testid="btn-download-statement"
                onClick={handleDownload}
                className="w-full h-14 rounded-2xl bg-black text-white font-bold text-base flex items-center justify-center gap-3 hover:bg-gray-900 transition-colors shadow-lg"
              >
                <Download className="h-5 w-5" />
                Download PDF Statement
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Verify Document ──
  if (view === "verify") {
    const handleVerify = async () => {
      if (!verifyCode.trim()) return;
      setVerifyLoading(true);
      setVerifyResult(null);
      setVerifyError("");
      try {
        const res = await fetch(`/api/admin/verify?code=${encodeURIComponent(verifyCode.trim())}`, { credentials: "include" });
        if (!res.ok) {
          const err = await res.json();
          setVerifyError(err.message || "Document not found");
        } else {
          setVerifyResult(await res.json());
        }
      } catch {
        setVerifyError("Network error. Please try again.");
      } finally {
        setVerifyLoading(false);
      }
    };

    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-black text-white px-4 pt-8 pb-5 rounded-b-3xl">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setView("dashboard"); setVerifyResult(null); setVerifyError(""); setVerifyCode(""); }} className="text-white rounded-full hover:bg-white/20"><ChevronLeft className="h-6 w-6" /></Button>
            <div>
              <h1 className="text-xl font-bold">Verify Document</h1>
              <p className="text-xs text-gray-400">Authenticate any GY Rides receipt or statement</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-auto pb-12">
          {/* Search input */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <label className="text-xs font-bold text-gray-600 block mb-2">Enter Verification Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="GYR-XXXXXXXX  or  GYS-XXXXXXXX"
                value={verifyCode}
                onChange={e => { setVerifyCode(e.target.value.toUpperCase()); setVerifyResult(null); setVerifyError(""); }}
                onKeyDown={e => e.key === "Enter" && handleVerify()}
                className="flex-1 h-11 rounded-xl border border-gray-200 px-3 text-sm font-mono tracking-wider"
                data-testid="input-verify-code"
              />
              <Button
                className="bg-black text-white rounded-xl h-11 px-5 font-bold"
                onClick={handleVerify}
                disabled={verifyLoading || !verifyCode.trim()}
                data-testid="btn-verify-submit"
              >
                {verifyLoading ? "…" : "Verify"}
              </Button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              Codes starting with <span className="font-mono font-bold">GYR-</span> are trip receipts · <span className="font-mono font-bold">GYS-</span> are driver statements
            </p>
          </div>

          {/* Error */}
          {verifyError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3" data-testid="verify-error">
              <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm text-red-700">Document Not Found</div>
                <div className="text-xs text-red-600 mt-0.5">{verifyError}</div>
              </div>
            </div>
          )}

          {/* Receipt result */}
          {verifyResult?.type === "receipt" && (
            <div className="space-y-3" data-testid="verify-receipt-result">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm text-green-800">✓ Authentic Receipt</div>
                  <div className="text-xs text-green-700 font-mono mt-0.5">{verifyResult.code}</div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <h3 className="font-bold text-sm">Trip Details</h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div><div className="text-[10px] text-gray-400 uppercase">Rider</div><div className="font-semibold">{verifyResult.riderName}</div></div>
                  <div><div className="text-[10px] text-gray-400 uppercase">Driver</div><div className="font-semibold">{verifyResult.driverName}</div></div>
                  <div className="col-span-2"><div className="text-[10px] text-gray-400 uppercase">From</div><div className="font-semibold">{verifyResult.trip.pickupName}</div></div>
                  <div className="col-span-2"><div className="text-[10px] text-gray-400 uppercase">To</div><div className="font-semibold">{verifyResult.trip.dropoffName}</div></div>
                  <div><div className="text-[10px] text-gray-400 uppercase">Fare</div><div className="font-black text-lg">R{verifyResult.trip.fare?.toFixed(2)}</div></div>
                  <div><div className="text-[10px] text-gray-400 uppercase">Payment</div><div className="font-semibold capitalize">{verifyResult.trip.paymentMethod}</div></div>
                  <div><div className="text-[10px] text-gray-400 uppercase">Status</div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${verifyResult.trip.status === "completed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {verifyResult.trip.status}
                    </span>
                  </div>
                  <div><div className="text-[10px] text-gray-400 uppercase">Date</div><div className="font-semibold">{verifyResult.trip.completedAt ? new Date(verifyResult.trip.completedAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</div></div>
                </div>
              </div>
            </div>
          )}

          {/* Statement result */}
          {verifyResult?.type === "statement" && (
            <div className="space-y-3" data-testid="verify-statement-result">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm text-green-800">✓ Authentic Statement</div>
                  <div className="text-xs text-green-700 font-mono mt-0.5">{verifyResult.code}</div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <h3 className="font-bold text-sm">Statement Details</h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div className="col-span-2"><div className="text-[10px] text-gray-400 uppercase">Driver</div><div className="font-semibold">{verifyResult.statement.driverName}</div></div>
                  <div><div className="text-[10px] text-gray-400 uppercase">Period</div><div className="font-semibold">{verifyResult.statement.period}</div></div>
                  <div><div className="text-[10px] text-gray-400 uppercase">Trips</div><div className="font-semibold">{verifyResult.statement.completedTrips} completed</div></div>
                  <div><div className="text-[10px] text-gray-400 uppercase">Gross Fares</div><div className="font-black text-lg">R{verifyResult.statement.totalFare?.toFixed(2)}</div></div>
                  <div><div className="text-[10px] text-gray-400 uppercase">Driver Payout (85%)</div><div className="font-black text-lg text-green-600">R{verifyResult.statement.driverPayout?.toFixed(2)}</div></div>
                  <div className="col-span-2"><div className="text-[10px] text-gray-400 uppercase">Issued On</div><div className="font-semibold">{verifyResult.statement.issuedAt ? new Date(verifyResult.statement.issuedAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</div></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Reimbursements ──
  if (view === "reimbursements") {
    const approvedDrivers = drivers.filter(d => d.approvalStatus === "approved");
    const filtered = rmbDriverFilter
      ? reimbursements.filter(r => r.driverId === rmbDriverFilter)
      : reimbursements;

    const pendingTotal = reimbursements.filter(r => r.status === "pending").reduce((s, r) => s + r.amount, 0);
    const reimbursedTotal = reimbursements.filter(r => r.status === "reimbursed").reduce((s, r) => s + r.amount, 0);

    const driverName = (id: string) => {
      const d = drivers.find(d => d.id === id);
      return d?.fullName || "Unknown Driver";
    };

    const handleCreate = async () => {
      if (!rmbNewDriver || !rmbNewAmount || !rmbNewPeriod) {
        toast({ title: "Please fill in driver, amount, and period", variant: "destructive" });
        return;
      }
      setRmbCreating(true);
      try {
        const res = await fetch("/api/admin/reimbursements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ driverId: rmbNewDriver, amount: parseFloat(rmbNewAmount), period: rmbNewPeriod, notes: rmbNewNotes || null, createdByAdminId: user.id }),
        });
        if (!res.ok) throw new Error(await res.text());
        toast({ title: "Reimbursement record created" });
        setRmbNewAmount(""); setRmbNewNotes(""); setRmbShowCreate(false);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/reimbursements"] });
      } catch (err: any) {
        toast({ title: "Failed to create", description: err.message, variant: "destructive" });
      } finally {
        setRmbCreating(false);
      }
    };

    const handleMarkReimbursed = async (id: string, current: string) => {
      const newStatus = current === "reimbursed" ? "pending" : "reimbursed";
      setRmbMarkingId(id);
      try {
        const res = await fetch(`/api/admin/reimbursements/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error(await res.text());
        toast({ title: newStatus === "reimbursed" ? "Marked as reimbursed ✓" : "Marked as pending" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/reimbursements"] });
      } catch (err: any) {
        toast({ title: "Update failed", description: err.message, variant: "destructive" });
      } finally {
        setRmbMarkingId(null);
      }
    };

    const handleUploadProof = async (id: string, file: File) => {
      setRmbUploadingId(id);
      try {
        const fd = new FormData();
        fd.append("proof", file);
        const res = await fetch(`/api/admin/reimbursements/${id}/proof`, {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        if (!res.ok) throw new Error(await res.text());
        toast({ title: "Proof of payment uploaded ✓" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/reimbursements"] });
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      } finally {
        setRmbUploadingId(null);
      }
    };

    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-black text-white px-4 pt-8 pb-5 rounded-b-3xl">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => setView("dashboard")} className="text-white rounded-full hover:bg-white/20"><ChevronLeft className="h-6 w-6" /></Button>
            <div>
              <h1 className="text-xl font-bold">Driver Reimbursements</h1>
              <p className="text-xs text-gray-400">Track bank transfers to drivers</p>
            </div>
          </div>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-2xl p-3">
              <div className="text-xs text-yellow-400 font-bold mb-1">PENDING PAYOUT</div>
              <div className="text-2xl font-black text-yellow-400">R{pendingTotal.toFixed(2)}</div>
              <div className="text-[10px] text-gray-400">{reimbursements.filter(r => r.status === "pending").length} record{reimbursements.filter(r => r.status === "pending").length !== 1 ? "s" : ""}</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-3">
              <div className="text-xs text-green-400 font-bold mb-1">TOTAL PAID OUT</div>
              <div className="text-2xl font-black text-green-400">R{reimbursedTotal.toFixed(2)}</div>
              <div className="text-[10px] text-gray-400">{reimbursements.filter(r => r.status === "reimbursed").length} completed</div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-auto pb-24">
          {/* Controls */}
          <div className="flex items-center gap-2">
            <select
              value={rmbDriverFilter}
              onChange={e => setRmbDriverFilter(e.target.value)}
              className="flex-1 h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
              data-testid="select-rmb-driver-filter"
            >
              <option value="">All Drivers</option>
              {approvedDrivers.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
            </select>
            <Button
              size="sm"
              className="bg-black text-white rounded-xl h-10 px-4 gap-1.5"
              onClick={() => setRmbShowCreate(v => !v)}
              data-testid="btn-rmb-create-toggle"
            >
              {rmbShowCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {rmbShowCreate ? "Cancel" : "New"}
            </Button>
          </div>

          {/* Create form */}
          {rmbShowCreate && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
              <h3 className="font-bold text-sm">Create Reimbursement Record</h3>
              <select
                value={rmbNewDriver}
                onChange={e => setRmbNewDriver(e.target.value)}
                className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm"
                data-testid="select-rmb-new-driver"
              >
                <option value="">Select driver…</option>
                {approvedDrivers.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-gray-500 font-medium">Amount (R)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={rmbNewAmount}
                    onChange={e => setRmbNewAmount(e.target.value)}
                    className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm mt-1"
                    data-testid="input-rmb-amount"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 font-medium">Period</label>
                  <input
                    type="text"
                    placeholder="e.g. March 2026"
                    value={rmbNewPeriod}
                    onChange={e => setRmbNewPeriod(e.target.value)}
                    className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm mt-1"
                    data-testid="input-rmb-period"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-gray-500 font-medium">Notes (optional)</label>
                <input
                  type="text"
                  placeholder="Reference number, bank, etc."
                  value={rmbNewNotes}
                  onChange={e => setRmbNewNotes(e.target.value)}
                  className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm mt-1"
                  data-testid="input-rmb-notes"
                />
              </div>
              <Button
                className="w-full bg-black text-white rounded-xl h-11 font-bold"
                onClick={handleCreate}
                disabled={rmbCreating}
                data-testid="btn-rmb-create-submit"
              >
                {rmbCreating ? "Creating…" : "Create Record"}
              </Button>
            </div>
          )}

          {/* Per-driver owed summary */}
          {!rmbDriverFilter && (() => {
            const pendingByDriver = approvedDrivers
              .map(d => ({ driver: d, amount: reimbursements.filter(r => r.driverId === d.id && r.status === "pending").reduce((s, r) => s + r.amount, 0) }))
              .filter(x => x.amount > 0)
              .sort((a, b) => b.amount - a.amount);
            if (pendingByDriver.length === 0) return null;
            return (
              <div className="bg-white rounded-2xl border border-yellow-200 shadow-sm overflow-hidden">
                <div className="bg-yellow-50 px-4 py-2.5 border-b border-yellow-100">
                  <h3 className="font-bold text-sm text-yellow-800">Outstanding Amounts Owed</h3>
                </div>
                {pendingByDriver.map(({ driver, amount }) => (
                  <div key={driver.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0"
                    onClick={() => setRmbDriverFilter(driver.id)} data-testid={`rmb-owed-${driver.id}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                        {driver.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{driver.fullName}</div>
                        <div className="text-[10px] text-gray-400">{reimbursements.filter(r => r.driverId === driver.id && r.status === "pending").length} pending</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-yellow-600">R{amount.toFixed(2)}</div>
                      <ChevronRight className="h-3.5 w-3.5 text-gray-400 ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Records list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm text-gray-700">
                {rmbDriverFilter ? `${driverName(rmbDriverFilter)} — Records` : "All Records"}
                <span className="text-gray-400 font-normal ml-1">({filtered.length})</span>
              </h3>
              {rmbDriverFilter && (
                <button onClick={() => setRmbDriverFilter("")} className="text-xs text-blue-600 underline">Show all</button>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm border border-gray-100">
                No reimbursement records{rmbDriverFilter ? " for this driver" : ""} yet.
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(r => {
                  const isPending = r.status === "pending";
                  return (
                    <div key={r.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isPending ? "border-yellow-200" : "border-green-200"}`} data-testid={`rmb-card-${r.id}`}>
                      {/* Status stripe */}
                      <div className={`h-1 w-full ${isPending ? "bg-yellow-400" : "bg-green-500"}`} />

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <div className="font-bold text-base">R{r.amount.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">{r.period} · {driverName(r.driverId)}</div>
                            {r.notes && <div className="text-xs text-gray-400 mt-0.5 italic">"{r.notes}"</div>}
                            <div className="text-[10px] text-gray-300 mt-0.5">Created {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-ZA") : "—"}</div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isPending ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                            {isPending ? "PENDING" : "REIMBURSED"}
                          </span>
                        </div>

                        {/* Reimbursed timestamp */}
                        {!isPending && r.reimbursedAt && (
                          <div className="text-xs text-green-600 font-medium mb-3">
                            ✓ Paid on {new Date(r.reimbursedAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}
                          </div>
                        )}

                        {/* Proof of payment */}
                        <div className="border border-gray-100 rounded-xl p-3 mb-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-gray-600">Proof of Payment</span>
                            {r.proofOfPaymentUrl && (
                              <a
                                href={r.proofOfPaymentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-600 font-medium"
                                data-testid={`rmb-proof-view-${r.id}`}
                              >
                                <ExternalLink className="h-3 w-3" /> View
                              </a>
                            )}
                          </div>
                          {r.proofOfPaymentUrl ? (
                            <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" /> Document uploaded
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 mb-2">No proof uploaded yet</div>
                          )}
                          <label className="cursor-pointer" data-testid={`rmb-proof-upload-${r.id}`}>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              disabled={rmbUploadingId === r.id}
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadProof(r.id, file);
                                e.target.value = "";
                              }}
                            />
                            <div className={`flex items-center justify-center gap-2 h-9 rounded-lg border-2 border-dashed text-xs font-medium transition-colors ${
                              rmbUploadingId === r.id ? "border-gray-200 text-gray-300" : "border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600"
                            }`}>
                              <Upload className="h-3.5 w-3.5" />
                              {rmbUploadingId === r.id ? "Uploading…" : r.proofOfPaymentUrl ? "Replace proof" : "Upload proof (image or PDF)"}
                            </div>
                          </label>
                        </div>

                        {/* Mark reimbursed toggle */}
                        <Button
                          variant="outline"
                          className={`w-full h-11 rounded-xl font-bold text-sm gap-2 ${
                            !isPending ? "bg-green-50 border-green-300 text-green-700 hover:bg-green-100" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                          disabled={rmbMarkingId === r.id}
                          onClick={() => handleMarkReimbursed(r.id, r.status)}
                          data-testid={`btn-rmb-mark-${r.id}`}
                        >
                          {rmbMarkingId === r.id ? (
                            "Updating…"
                          ) : !isPending ? (
                            <><CheckSquare className="h-4.5 w-4.5" /> Mark as Pending (undo)</>
                          ) : (
                            <><Square className="h-4.5 w-4.5" /> Mark as Reimbursed</>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ──
  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      <div className="bg-black text-white pt-8 pb-6 px-5 rounded-b-3xl">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h1 className="text-xl font-black tracking-tight">GY Admin</h1>
            <p className="text-xs text-gray-400">Platform Management</p>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full" onClick={() => { logout(); setLocation("/"); }} data-testid="btn-admin-logout">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-white/10 border-none shadow-none text-white">
            <CardContent className="p-3 flex flex-col items-start gap-1.5">
              <div className="p-1.5 bg-yellow-400/20 rounded-lg text-yellow-400"><DollarSign className="h-4 w-4" /></div>
              <div>
                <div className="text-xl font-bold">R{stats ? stats.totalRevenue.toLocaleString() : "..."}</div>
                <div className="text-[10px] opacity-70">Total Revenue</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-none shadow-none text-white">
            <CardContent className="p-3 flex flex-col items-start gap-1.5">
              <div className="p-1.5 bg-green-500/20 rounded-lg text-green-400"><Activity className="h-4 w-4" /></div>
              <div>
                <div className="text-xl font-bold">{stats?.activeTrips ?? 0}</div>
                <div className="text-[10px] opacity-70">Active Trips</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="p-5 space-y-5 flex-1">
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <div className="text-lg font-bold">{stats?.totalDrivers ?? 0}</div>
            <div className="text-[10px] text-gray-500">Drivers</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <div className="text-lg font-bold">{stats?.totalRiders ?? 0}</div>
            <div className="text-[10px] text-gray-500">Riders</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <div className="text-lg font-bold text-green-600">{stats?.onlineDrivers ?? 0}</div>
            <div className="text-[10px] text-gray-500">Online</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <div className="text-lg font-bold">{stats?.totalTrips ?? 0}</div>
            <div className="text-[10px] text-gray-500">Trips</div>
          </div>
        </div>

        {activeWhatsappTrips.length > 0 && (
          <button
            className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-left"
            onClick={() => setView("trips")}
            data-testid="btn-whatsapp-bookings"
          >
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm text-emerald-800">{activeWhatsappTrips.length} WhatsApp Booking{activeWhatsappTrips.length > 1 ? "s" : ""} Pending</div>
              <div className="text-[10px] text-emerald-600">Tap to view and assign drivers</div>
            </div>
            <ChevronRight className="h-4 w-4 text-emerald-400" />
          </button>
        )}

        {activeSosAlerts.length > 0 && (
          <button
            className="w-full bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-center gap-3 text-left animate-pulse"
            onClick={() => setView("sos")}
            data-testid="btn-active-sos"
          >
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm text-red-800">{activeSosAlerts.length} Active SOS Alert{activeSosAlerts.length > 1 ? "s" : ""}!</div>
              <div className="text-[10px] text-red-600">Immediate attention required</div>
            </div>
            <ChevronRight className="h-4 w-4 text-red-400" />
          </button>
        )}

        {pendingResetRequests.length > 0 && (
          <button
            className="w-full bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center gap-3 text-left"
            onClick={() => setView("users")}
            data-testid="btn-pending-resets"
          >
            <div className="w-10 h-10 bg-violet-500 rounded-full flex items-center justify-center shrink-0">
              <KeyRound className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm text-violet-800">{pendingResetRequests.length} Password Reset Request{pendingResetRequests.length > 1 ? "s" : ""}</div>
              <div className="text-[10px] text-violet-600">Users need help accessing their accounts</div>
            </div>
            <ChevronRight className="h-4 w-4 text-violet-400" />
          </button>
        )}

        {pendingDrivers.length > 0 && (
          <button
            className="w-full bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3 text-left"
            onClick={() => setView("approvals")}
            data-testid="btn-pending-approvals"
          >
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-orange-500" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm text-orange-800">{pendingDrivers.length} Pending Driver Application{pendingDrivers.length > 1 ? "s" : ""}</div>
              <div className="text-[10px] text-orange-600">Tap to review and approve or reject</div>
            </div>
            <ChevronRight className="h-4 w-4 text-orange-400" />
          </button>
        )}

        <h2 className="font-bold">Management</h2>

        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-between h-14 rounded-xl bg-white border-gray-100 shadow-sm px-4" onClick={() => setView("sos")} data-testid="btn-manage-sos">
            <div className="flex items-center gap-3">
              <div className="bg-red-50 p-2 rounded-lg text-red-600"><AlertTriangle className="h-4 w-4" /></div>
              <div className="text-left">
                <div className="font-bold text-sm">SOS Alerts</div>
                <div className="text-[10px] text-gray-500">{activeSosAlerts.length} active</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeSosAlerts.length > 0 && <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{activeSosAlerts.length}</span>}
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </Button>

          <Button variant="outline" className="w-full justify-between h-14 rounded-xl bg-white border-gray-100 shadow-sm px-4" onClick={() => setView("approvals")} data-testid="btn-manage-approvals">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-50 p-2 rounded-lg text-yellow-600"><Shield className="h-4 w-4" /></div>
              <div className="text-left">
                <div className="font-bold text-sm">Driver Approvals</div>
                <div className="text-[10px] text-gray-500">{pendingDrivers.length} pending</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pendingDrivers.length > 0 && <span className="w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{pendingDrivers.length}</span>}
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </Button>

          <Button variant="outline" className="w-full justify-between h-14 rounded-xl bg-white border-gray-100 shadow-sm px-4" onClick={() => setView("drivers")} data-testid="btn-manage-drivers">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Users className="h-4 w-4" /></div>
              <div className="text-left">
                <div className="font-bold text-sm">All Drivers</div>
                <div className="text-[10px] text-gray-500">{stats?.onlineDrivers ?? 0} online now</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Button>

          <Button variant="outline" className="w-full justify-between h-14 rounded-xl bg-white border-gray-100 shadow-sm px-4" onClick={() => setView("trips")} data-testid="btn-manage-trips">
            <div className="flex items-center gap-3">
              <div className="bg-purple-50 p-2 rounded-lg text-purple-600"><MapPin className="h-4 w-4" /></div>
              <div className="text-left">
                <div className="font-bold text-sm">Trips</div>
                <div className="text-[10px] text-gray-500">{completedTrips.length} completed · {cancelledTrips.length} cancelled</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Button>

          <Button variant="outline" className="w-full justify-between h-14 rounded-xl bg-white border-gray-100 shadow-sm px-4" onClick={() => setView("pricing")} data-testid="btn-manage-pricing">
            <div className="flex items-center gap-3">
              <div className="bg-orange-50 p-2 rounded-lg text-orange-600"><Car className="h-4 w-4" /></div>
              <div className="text-left">
                <div className="font-bold text-sm">Vehicles & Pricing</div>
                <div className="text-[10px] text-gray-500">{vehicleTypes.length} categories</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Button>

          <Button variant="outline" className="w-full justify-between h-14 rounded-xl bg-white border-gray-100 shadow-sm px-4" onClick={() => setView("statements")} data-testid="btn-manage-statements">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-50 p-2 rounded-lg text-yellow-600"><BarChart3 className="h-4 w-4" /></div>
              <div className="text-left">
                <div className="font-bold text-sm">Driver Statements</div>
                <div className="text-[10px] text-gray-500">Monthly earnings & PDF export</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Button>

          <Button variant="outline" className="w-full justify-between h-14 rounded-xl bg-white border-gray-100 shadow-sm px-4" onClick={() => { setView("verify"); setVerifyResult(null); setVerifyError(""); setVerifyCode(""); }} data-testid="btn-verify-document">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><ShieldCheck className="h-4 w-4" /></div>
              <div className="text-left">
                <div className="font-bold text-sm">Verify Document</div>
                <div className="text-[10px] text-gray-500">Check authenticity of receipts & statements</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Button>

          <Button variant="outline" className="w-full justify-between h-14 rounded-xl bg-white border-gray-100 shadow-sm px-4" onClick={() => { setView("reimbursements"); queryClient.invalidateQueries({ queryKey: ["/api/admin/reimbursements"] }); }} data-testid="btn-manage-reimbursements">
            <div className="flex items-center gap-3">
              <div className="bg-green-50 p-2 rounded-lg text-green-600"><Banknote className="h-4 w-4" /></div>
              <div className="text-left">
                <div className="font-bold text-sm">Reimbursements</div>
                <div className="text-[10px] text-gray-500">Track bank transfers & proof of payment</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {reimbursements.filter(r => r.status === "pending").length > 0 && (
                <span className="bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                  R{reimbursements.filter(r => r.status === "pending").reduce((s, r) => s + r.amount, 0).toFixed(0)} owed
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </Button>

          <Button variant="outline" className="w-full justify-between h-14 rounded-xl bg-white border-gray-100 shadow-sm px-4" onClick={() => setView("users")} data-testid="btn-manage-users">
            <div className="flex items-center gap-3">
              <div className="bg-violet-50 p-2 rounded-lg text-violet-600"><KeyRound className="h-4 w-4" /></div>
              <div className="text-left">
                <div className="font-bold text-sm">Users & Accounts</div>
                <div className="text-[10px] text-gray-500">{allUsers.filter(u => u.role !== "admin").length} users · {pendingResetRequests.length} reset requests</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {pendingResetRequests.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingResetRequests.length}</span>
              )}
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </Button>
        </div>

        <h2 className="font-bold">Platform Health</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-xs font-bold">Revenue</span>
            </div>
            <div className="text-lg font-bold">R{stats ? stats.totalRevenue.toLocaleString() : "0"}</div>
            <div className="text-[10px] text-gray-500">{completedTrips.length} paid trips</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold">Completion Rate</span>
            </div>
            <div className="text-lg font-bold">{allTrips.length > 0 ? Math.round((completedTrips.length / allTrips.length) * 100) : 0}%</div>
            <div className="text-[10px] text-gray-500">{cancelledTrips.length} cancellations</div>
          </div>
        </div>
      </div>

      {chatTripId && user && (
        <TripChat
          tripId={chatTripId}
          userId={user.id}
          userRole="admin"
          otherName={chatLabel}
          onClose={() => { setChatTripId(null); setChatLabel(""); }}
        />
      )}
      <div className="py-4 text-[10px] text-gray-400 text-center leading-tight">
        © {new Date().getFullYear()} Mpfuno Medical Services (PTY) LTD & Dr NI Mabunda. All rights reserved.
      </div>
    </div>
  );
}
