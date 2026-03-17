import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Users, Car, DollarSign, LogOut, ChevronRight, ChevronLeft, Star, MapPin, TrendingUp, Activity, AlertCircle, CheckCircle, Shield, XCircle, FileText, Eye, User as UserIcon, AlertTriangle, Phone, MessageCircle, KeyRound, ShieldCheck, ShieldX, Lock, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { approveDriver, rejectDriver, updateSosAlert, getUser, adminResetUserPassword, verifyUser, getPendingPasswordResetRequests, updatePasswordResetRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import TripChat from "@/components/TripChat";
import type { User, Trip, VehicleType, SosAlert } from "@shared/schema";

export default function AdminApp() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<"dashboard" | "drivers" | "trips" | "pricing" | "approvals" | "review-driver" | "sos" | "users">("dashboard");
  const [reviewingDriver, setReviewingDriver] = useState<User | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [sosNotes, setSosNotes] = useState<Record<string, string>>({});
  const [chatTripId, setChatTripId] = useState<string | null>(null);
  const [chatLabel, setChatLabel] = useState("");
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  // ── Review Driver Application ──
  if (view === "review-driver" && reviewingDriver) {
    const d = reviewingDriver;
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-white p-4 flex items-center gap-3 border-b sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => { setView("approvals"); setReviewingDriver(null); setShowRejectInput(false); }} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold">Review Application</h1>
        </div>
        <div className="flex-1 p-4 space-y-4 overflow-auto">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
            <Avatar className="h-16 w-16 mx-auto mb-3 border-2 border-yellow-400">
              <AvatarFallback className="bg-yellow-400 text-black text-xl font-bold">{d.fullName[0]}</AvatarFallback>
            </Avatar>
            <h2 className="text-lg font-bold">{d.fullName}</h2>
            <p className="text-gray-500 text-sm">{d.phone}</p>
            {d.email && <p className="text-gray-500 text-xs">{d.email}</p>}
            <span className="inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">Pending Approval</span>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
            <h3 className="font-bold text-sm text-gray-600 flex items-center gap-2"><UserIcon className="h-4 w-4" /> Personal Details</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-gray-500">ID Number</span><span className="font-medium">{d.idNumber || "—"}</span>
              <span className="text-gray-500">Address</span><span className="font-medium">{d.address || "—"}</span>
              <span className="text-gray-500">Phone</span><span className="font-medium">{d.phone}</span>
              {d.email && <><span className="text-gray-500">Email</span><span className="font-medium">{d.email}</span></>}
            </div>
          </div>

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

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h3 className="font-bold text-sm text-gray-600 flex items-center gap-2"><FileText className="h-4 w-4" /> Uploaded Documents</h3>
            {[
              { label: "Driver's License", doc: d.driverLicenseDoc },
              { label: "Vehicle License Disc", doc: d.vehicleLicenseDoc },
              { label: "Roadworthy Certificate", doc: d.roadworthyCertDoc },
              { label: "Proof of Insurance", doc: d.proofOfInsuranceDoc },
              { label: "Profile Photo", doc: d.profilePhotoDoc },
            ].map(({ label, doc }) => (
              <div key={label} className="flex items-center gap-3">
                {doc ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-sm flex-1">{label}</span>
                    {doc.startsWith("data:image") && (
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        <img src={doc} alt={label} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <button className="text-xs text-blue-600 font-medium" onClick={() => {
                      if (doc.startsWith("data:")) {
                        const win = window.open();
                        if (win) { win.document.write(`<img src="${doc}" style="max-width:100%" />`); }
                      }
                    }}>
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-gray-300 shrink-0" />
                    <span className="text-sm text-gray-400 flex-1">{label} — not uploaded</span>
                  </>
                )}
              </div>
            ))}
          </div>

          {showRejectInput && (
            <div className="bg-red-50 rounded-xl p-4 border border-red-200 space-y-3">
              <p className="text-sm font-bold text-red-700">Rejection Reason</p>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Explain why the application is rejected..."
                className="w-full h-24 rounded-lg border border-red-200 p-3 text-sm resize-none"
                data-testid="input-reject-reason"
              />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => { setShowRejectInput(false); setRejectReason(""); }}>Cancel</Button>
                <Button className="flex-1 rounded-xl h-11 bg-red-600 hover:bg-red-700 text-white" onClick={() => handleReject(d.id)} data-testid="btn-confirm-reject">Confirm Reject</Button>
              </div>
            </div>
          )}
        </div>

        {!showRejectInput && (
          <div className="bg-white border-t border-gray-100 p-4 flex gap-3">
            <Button variant="outline" className="flex-1 h-14 rounded-2xl text-red-600 border-red-200" onClick={() => setShowRejectInput(true)} data-testid="btn-reject-driver">
              <XCircle className="h-4 w-4 mr-2" /> Reject
            </Button>
            <Button className="flex-1 h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => handleApprove(d.id)} data-testid="btn-approve-driver">
              <CheckCircle className="h-4 w-4 mr-2" /> Approve
            </Button>
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
              onClick={() => { setReviewingDriver(d); setView("review-driver"); }}
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
          {drivers.map(d => (
            <div key={d.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3" data-testid={`driver-card-${d.id}`}>
              <Avatar className="h-11 w-11 border-2 border-yellow-400">
                <AvatarFallback className="bg-yellow-400 text-black font-bold">{d.fullName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{d.fullName}</span>
                  {d.approvalStatus === "approved" && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {d.rating?.toFixed(1)} · {d.totalTrips} trips
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
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${u.role === "driver" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                        {u.role === "driver" ? "Driver" : "Rider"}
                      </span>
                      {u.role === "driver" && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${u.approvalStatus === "approved" ? "bg-green-100 text-green-700" : u.approvalStatus === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {u.approvalStatus}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
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
        © {new Date().getFullYear()} Mpfuno Medical Services & Dr NI Mabunda. All rights reserved.
      </div>
    </div>
  );
}
