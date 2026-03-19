import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Car, User, FileText, ChevronRight, ChevronLeft, CheckCircle, Clock, XCircle, Upload, Shield, CreditCard, LogOut, MessageCircle, Landmark, Users, Plus, Trash2, Camera, RefreshCw, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { submitOnboarding } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type Step = "personal" | "vehicle" | "license" | "documents" | "banking" | "review";

const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: "personal", label: "Personal Info", icon: <User className="h-4 w-4" /> },
  { key: "vehicle", label: "Vehicle Details", icon: <Car className="h-4 w-4" /> },
  { key: "license", label: "Licenses", icon: <CreditCard className="h-4 w-4" /> },
  { key: "documents", label: "Documents", icon: <FileText className="h-4 w-4" /> },
  { key: "banking", label: "Banking & Financial", icon: <Landmark className="h-4 w-4" /> },
  { key: "review", label: "Review", icon: <CheckCircle className="h-4 w-4" /> },
];

export default function DriverOnboarding() {
  const { user, setUser, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("personal");
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [idNumber, setIdNumber] = useState(user?.idNumber || "");
  const [address, setAddress] = useState(user?.address || "");

  const [vehicleMake, setVehicleMake] = useState(user?.vehicleMake || "");
  const [vehicleModel, setVehicleModel] = useState(user?.vehicleModel || "");
  const [vehicleColor, setVehicleColor] = useState(user?.vehicleColor || "");
  const [vehicleYear, setVehicleYear] = useState(user?.vehicleYear || "");
  const [licensePlate, setLicensePlate] = useState(user?.licensePlate || "");
  const [vehicleRegistrationNumber, setVehicleRegistrationNumber] = useState("");

  const [driverLicenseNumber, setDriverLicenseNumber] = useState("");
  const [driverLicenseExpiry, setDriverLicenseExpiry] = useState("");
  const [driverLicenseCode, setDriverLicenseCode] = useState("B");
  const [vehicleLicenseExpiry, setVehicleLicenseExpiry] = useState("");
  const [roadworthyCertExpiry, setRoadworthyCertExpiry] = useState("");

  const [driverLicenseDoc, setDriverLicenseDoc] = useState("");
  const [vehicleLicenseDoc, setVehicleLicenseDoc] = useState("");
  const [roadworthyCertDoc, setRoadworthyCertDoc] = useState("");
  const [proofOfInsuranceDoc, setProofOfInsuranceDoc] = useState("");
  const [profilePhotoDoc, setProfilePhotoDoc] = useState("");

  // Banking & financial details
  const [bankName, setBankName] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState(user?.fullName || "");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountType, setBankAccountType] = useState("Cheque");
  const [bankBranchCode, setBankBranchCode] = useState("");
  const [statementEmail, setStatementEmail] = useState(user?.email || "");
  const [statementPhone, setStatementPhone] = useState(user?.phone || "");

  // Nominee 1
  const [nominee1Name, setNominee1Name] = useState("");
  const [nominee1Phone, setNominee1Phone] = useState("");
  const [nominee1Email, setNominee1Email] = useState("");
  const [nominee1Relation, setNominee1Relation] = useState("");
  const [showNominee2, setShowNominee2] = useState(false);

  // Nominee 2
  const [nominee2Name, setNominee2Name] = useState("");
  const [nominee2Phone, setNominee2Phone] = useState("");
  const [nominee2Email, setNominee2Email] = useState("");
  const [nominee2Relation, setNominee2Relation] = useState("");

  if (!user || user.role !== "driver") {
    return null;
  }

  if (user.approvalStatus === "approved" && user.onboardingComplete) {
    setLocation("/driver");
    return null;
  }

  const stepIndex = STEPS.findIndex(s => s.key === step);

  const canProceedPersonal = fullName && phone && idNumber && address && profilePhotoDoc;
  const canProceedVehicle = vehicleMake && vehicleModel && vehicleColor && vehicleYear && licensePlate;
  const canProceedLicense = driverLicenseNumber && driverLicenseExpiry && driverLicenseCode;
  const canProceedDocs = driverLicenseDoc && vehicleLicenseDoc && roadworthyCertDoc;
  const canProceedBanking = bankName && bankAccountNumber && bankAccountType && bankBranchCode && bankAccountHolder;

  const handleNext = () => {
    const keys = STEPS.map(s => s.key);
    const idx = keys.indexOf(step);
    if (idx < keys.length - 1) setStep(keys[idx + 1]);
  };

  const handleBack = () => {
    const keys = STEPS.map(s => s.key);
    const idx = keys.indexOf(step);
    if (idx > 0) setStep(keys[idx - 1]);
  };

  const [uploading, setUploading] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (file: File) => {
    setUploading("profilePhotoDoc");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/document", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setProfilePhotoDoc(url);
    } catch (err: any) {
      toast({ title: "Photo upload failed", description: err.message || "Please try again", variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const handleFileUpload = (fieldName: string, setter: (val: string) => void) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.pdf";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(fieldName);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload/document", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Upload failed" }));
          throw new Error(err.message || "Upload failed");
        }
        const { url } = await res.json();
        setter(url);
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message || "Could not upload file. Try again.", variant: "destructive" });
      } finally {
        setUploading(null);
      }
    };
    input.click();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const updated = await submitOnboarding(user.id, {
        fullName,
        phone,
        email: email || null,
        idNumber,
        address,
        vehicleMake,
        vehicleModel,
        vehicleColor,
        vehicleYear,
        licensePlate,
        vehicleRegistrationNumber: vehicleRegistrationNumber || null,
        driverLicenseNumber,
        driverLicenseExpiry,
        driverLicenseCode,
        vehicleLicenseExpiry: vehicleLicenseExpiry || null,
        roadworthyCertExpiry: roadworthyCertExpiry || null,
        driverLicenseDoc,
        vehicleLicenseDoc,
        roadworthyCertDoc,
        proofOfInsuranceDoc: proofOfInsuranceDoc || null,
        profilePhotoDoc: profilePhotoDoc || null,
        // Banking
        bankName,
        bankAccountHolder,
        bankAccountNumber,
        bankAccountType,
        bankBranchCode,
        statementEmail: statementEmail || null,
        statementPhone: statementPhone || null,
        // Nominees
        nominee1Name: nominee1Name || null,
        nominee1Phone: nominee1Phone || null,
        nominee1Email: nominee1Email || null,
        nominee1Relation: nominee1Relation || null,
        nominee2Name: showNominee2 ? (nominee2Name || null) : null,
        nominee2Phone: showNominee2 ? (nominee2Phone || null) : null,
        nominee2Email: showNominee2 ? (nominee2Email || null) : null,
        nominee2Relation: showNominee2 ? (nominee2Relation || null) : null,
      });
      setUser(updated);
      toast({ title: "Application submitted!", description: "Your documents are under review. We'll notify you once approved." });
    } catch (err: any) {
      const msg = err?.message || "Please check your connection and try again.";
      toast({ title: "Submission failed", description: msg, variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (user.onboardingComplete && user.approvalStatus === "pending") {
    return (
      <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-yellow-400/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <Clock className="h-10 w-10 text-yellow-400" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Application Under Review</h1>
        <p className="text-gray-400 mb-2 max-w-xs">Your documents have been submitted and are being reviewed by our team.</p>
        <p className="text-gray-500 text-sm mb-8">This usually takes 24-48 hours. You'll be notified once your account is approved.</p>
        <div className="bg-white/5 rounded-2xl p-5 w-full max-w-sm border border-white/10 space-y-3 mb-6">
          <div className="flex justify-between text-sm"><span className="text-gray-400">Status</span><span className="text-yellow-400 font-bold">Pending Review</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-400">Name</span><span className="text-white">{user.fullName}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-400">Vehicle</span><span className="text-white">{user.vehicleColor} {user.vehicleMake} {user.vehicleModel}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-400">License Plate</span><span className="text-white">{user.licensePlate}</span></div>
        </div>
        <Button variant="ghost" className="text-gray-400" onClick={() => { logout(); setLocation("/"); }} data-testid="btn-logout-pending">
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </div>
    );
  }

  if (user.onboardingComplete && user.approvalStatus === "rejected") {
    return (
      <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
          <XCircle className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Application Not Approved</h1>
        <p className="text-gray-400 mb-5 max-w-xs">Our team has reviewed your application and could not approve it at this time.</p>

        {user.rejectionReason && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 mb-6 w-full max-w-sm text-left">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="h-4 w-4 text-red-400 shrink-0" />
              <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Feedback from our team</p>
            </div>
            <p className="text-sm text-white leading-relaxed">{user.rejectionReason}</p>
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 w-full max-w-sm text-left space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">What to do next</p>
          <p className="text-sm text-gray-300">Address the feedback above, update your documents, and resubmit your application.</p>
          <p className="text-xs text-gray-500">Your previous details have been saved — only update what needs to change.</p>
        </div>

        <Button className="bg-yellow-400 text-black hover:bg-yellow-500 font-bold rounded-2xl h-14 px-8 w-full max-w-sm" onClick={() => {
          setStep("documents");
          setUser({ ...user, onboardingComplete: false, approvalStatus: "pending" } as any);
        }} data-testid="btn-resubmit">
          Update & Resubmit
        </Button>
        <Button variant="ghost" className="text-gray-400 mt-4" onClick={() => { logout(); setLocation("/"); }}>
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </div>
    );
  }

  const DocUploadButton = ({ label, fieldName, value, setter, required = true }: { label: string; fieldName: string; value: string; setter: (v: string) => void; required?: boolean }) => {
    const isLoading = uploading === fieldName;
    const isImage = value && !value.endsWith(".pdf") && !value.startsWith("data:application/pdf");
    return (
      <button
        className={`w-full p-4 rounded-xl border-2 border-dashed flex items-center gap-3 text-left transition-all ${value ? "border-green-400 bg-green-50" : "border-gray-300 bg-gray-50 hover:border-yellow-400"} ${isLoading ? "opacity-60 pointer-events-none" : ""}`}
        onClick={() => handleFileUpload(fieldName, setter)}
        disabled={isLoading}
        data-testid={`upload-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {isLoading ? (
          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center shrink-0 animate-spin">
            <Upload className="h-5 w-5 text-yellow-600" />
          </div>
        ) : value ? (
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0"><CheckCircle className="h-5 w-5 text-green-600" /></div>
        ) : (
          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center shrink-0"><Upload className="h-5 w-5 text-gray-500" /></div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{label} {required && <span className="text-red-500">*</span>}</div>
          <div className="text-xs text-gray-500">{isLoading ? "Uploading..." : value ? "Uploaded ✓ — tap to replace" : "Tap to upload (photo or PDF)"}</div>
        </div>
        {value && !isLoading && (
          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-100">
            {isImage ? (
              <img src={value} alt="" className="w-full h-full object-cover" />
            ) : (
              <FileText className="h-5 w-5 text-gray-500 m-2.5" />
            )}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      <div className="bg-black text-white px-5 pt-8 pb-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-black">Driver Registration</h1>
          <Button variant="ghost" size="sm" className="text-gray-400 h-8" onClick={() => { logout(); setLocation("/"); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <button key={s.key} className={`flex-1 h-1.5 rounded-full transition-colors ${i <= stepIndex ? "bg-yellow-400" : "bg-white/20"}`} onClick={() => { if (i <= stepIndex) setStep(s.key); }} />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          {STEPS[stepIndex].icon}
          <span className="text-sm font-medium text-yellow-400">Step {stepIndex + 1} of {STEPS.length}: {STEPS[stepIndex].label}</span>
        </div>
      </div>

      <div className="flex-1 p-5 overflow-auto">
        {step === "personal" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold">Personal Information</h2>
              <p className="text-sm text-gray-500 mt-1">Start with your profile photo — riders will see this during every trip.</p>
            </div>

            {/* ── Profile Photo Capture ── */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Camera className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-bold">Profile Photo <span className="text-red-500">*</span></span>
                {!profilePhotoDoc && <span className="text-[10px] text-red-500 font-medium ml-auto">Required</span>}
                {profilePhotoDoc && <span className="text-[10px] text-green-600 font-bold ml-auto flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Done</span>}
              </div>

              {/* Hidden inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); e.target.value = ""; }}
                data-testid="input-camera-capture"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); e.target.value = ""; }}
                data-testid="input-gallery-upload"
              />

              {profilePhotoDoc ? (
                /* Photo preview */
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <img
                      src={profilePhotoDoc}
                      alt="Profile photo"
                      className="w-36 h-36 rounded-full object-cover border-4 border-yellow-400 shadow-lg"
                      data-testid="img-profile-preview"
                    />
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-white shadow">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-700">Looking good! This is what riders will see.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={uploading === "profilePhotoDoc"}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-yellow-400 text-xs font-bold"
                      data-testid="btn-retake-camera"
                    >
                      <Camera className="h-3.5 w-3.5" /> Retake
                    </button>
                    <button
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={uploading === "profilePhotoDoc"}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold"
                      data-testid="btn-choose-gallery"
                    >
                      <ImagePlus className="h-3.5 w-3.5" /> Gallery
                    </button>
                  </div>
                </div>
              ) : (
                /* Camera capture prompt */
                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={uploading === "profilePhotoDoc"}
                    className="w-36 h-36 rounded-full border-4 border-dashed border-yellow-400 bg-yellow-50 flex flex-col items-center justify-center gap-2 transition-colors hover:bg-yellow-100 active:scale-95"
                    data-testid="btn-take-photo"
                  >
                    {uploading === "profilePhotoDoc" ? (
                      <RefreshCw className="h-10 w-10 text-yellow-500 animate-spin" />
                    ) : (
                      <>
                        <Camera className="h-10 w-10 text-yellow-500" />
                        <span className="text-xs font-bold text-yellow-700">Tap to take photo</span>
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 text-center">Take a clear selfie — face must be visible.<br />Good lighting makes a big difference.</p>
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={uploading === "profilePhotoDoc"}
                    className="flex items-center gap-2 text-xs text-gray-500 font-medium underline"
                    data-testid="btn-upload-gallery"
                  >
                    <ImagePlus className="h-3.5 w-3.5" /> Choose from gallery instead
                  </button>
                </div>
              )}
            </div>

            {/* Personal details */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Full Name *</label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g., Sipho Maluleke" className="h-12 rounded-xl" data-testid="input-onboard-fullname" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">SA ID Number *</label>
                <Input value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="13-digit ID number" maxLength={13} className="h-12 rounded-xl" data-testid="input-onboard-id" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Phone Number *</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g., 074 567 8901" className="h-12 rounded-xl" data-testid="input-onboard-phone" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email (optional)</label>
                <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" type="email" className="h-12 rounded-xl" data-testid="input-onboard-email" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Residential Address *</label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g., Section A, Giyani" className="h-12 rounded-xl" data-testid="input-onboard-address" />
              </div>
            </div>
          </div>
        )}

        {step === "vehicle" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Vehicle Details</h2>
            <p className="text-sm text-gray-500">Tell us about the vehicle you'll be driving.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Vehicle Make *</label>
                <Input value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} placeholder="e.g., Toyota" className="h-12 rounded-xl" data-testid="input-onboard-make" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Vehicle Model *</label>
                <Input value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} placeholder="e.g., Etios" className="h-12 rounded-xl" data-testid="input-onboard-model" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Year *</label>
                  <Input value={vehicleYear} onChange={e => setVehicleYear(e.target.value)} placeholder="e.g., 2020" className="h-12 rounded-xl" data-testid="input-onboard-year" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Color *</label>
                  <Input value={vehicleColor} onChange={e => setVehicleColor(e.target.value)} placeholder="e.g., White" className="h-12 rounded-xl" data-testid="input-onboard-color" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">License Plate Number *</label>
                <Input value={licensePlate} onChange={e => setLicensePlate(e.target.value)} placeholder="e.g., LGP 123 L" className="h-12 rounded-xl" data-testid="input-onboard-plate" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Vehicle Registration Number</label>
                <Input value={vehicleRegistrationNumber} onChange={e => setVehicleRegistrationNumber(e.target.value)} placeholder="Registration number" className="h-12 rounded-xl" data-testid="input-onboard-reg" />
              </div>
            </div>
          </div>
        )}

        {step === "license" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">License Information</h2>
            <p className="text-sm text-gray-500">Enter your driver's license and vehicle license details.</p>
            <div className="space-y-3">
              <h3 className="font-bold text-sm mt-2">Driver's License</h3>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">License Number *</label>
                <Input value={driverLicenseNumber} onChange={e => setDriverLicenseNumber(e.target.value)} placeholder="Your license number" className="h-12 rounded-xl" data-testid="input-onboard-license-num" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Expiry Date *</label>
                  <Input type="date" value={driverLicenseExpiry} onChange={e => setDriverLicenseExpiry(e.target.value)} className="h-12 rounded-xl" data-testid="input-onboard-license-exp" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">License Code *</label>
                  <select value={driverLicenseCode} onChange={e => setDriverLicenseCode(e.target.value)} className="h-12 rounded-xl border border-gray-200 bg-white px-3 w-full" data-testid="select-license-code">
                    <option value="A">A - Motorcycle</option>
                    <option value="A1">A1 - Light Motorcycle</option>
                    <option value="B">B - Light Motor Vehicle</option>
                    <option value="C">C - Heavy Vehicle</option>
                    <option value="C1">C1 - Heavy Vehicle</option>
                    <option value="EB">EB - Articulated</option>
                    <option value="EC">EC - Extra Heavy</option>
                    <option value="EC1">EC1 - Extra Heavy</option>
                  </select>
                </div>
              </div>
              <h3 className="font-bold text-sm mt-4">Vehicle License & Roadworthy</h3>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Vehicle License Disc Expiry</label>
                <Input type="date" value={vehicleLicenseExpiry} onChange={e => setVehicleLicenseExpiry(e.target.value)} className="h-12 rounded-xl" data-testid="input-onboard-vehicle-exp" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Roadworthy Certificate Expiry</label>
                <Input type="date" value={roadworthyCertExpiry} onChange={e => setRoadworthyCertExpiry(e.target.value)} className="h-12 rounded-xl" data-testid="input-onboard-roadworthy-exp" />
              </div>
            </div>
          </div>
        )}

        {step === "documents" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Upload Documents</h2>
            <p className="text-sm text-gray-500">Upload clear photos or scans of the following documents.</p>
            <div className="space-y-3">
              <DocUploadButton label="Driver's License" fieldName="driverLicenseDoc" value={driverLicenseDoc} setter={setDriverLicenseDoc} />
              <DocUploadButton label="Vehicle License Disc" fieldName="vehicleLicenseDoc" value={vehicleLicenseDoc} setter={setVehicleLicenseDoc} />
              <DocUploadButton label="Roadworthy Certificate" fieldName="roadworthyCertDoc" value={roadworthyCertDoc} setter={setRoadworthyCertDoc} />
              <DocUploadButton label="Proof of Insurance" fieldName="proofOfInsuranceDoc" value={proofOfInsuranceDoc} setter={setProofOfInsuranceDoc} required={false} />
            </div>
          </div>
        )}

        {step === "banking" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold">Banking & Financial Details</h2>
              <p className="text-sm text-gray-500 mt-1">Your earnings (85% of each fare) will be paid to this account. All information is securely stored.</p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2"><Landmark className="h-4 w-4 text-yellow-500" /> Bank Account Details</h3>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Bank Name *</label>
                <select value={bankName} onChange={e => setBankName(e.target.value)} className="h-12 rounded-xl border border-gray-200 bg-white px-3 w-full text-sm" data-testid="select-bank-name">
                  <option value="">Select your bank</option>
                  <option>ABSA</option>
                  <option>FNB (First National Bank)</option>
                  <option>Standard Bank</option>
                  <option>Nedbank</option>
                  <option>Capitec Bank</option>
                  <option>African Bank</option>
                  <option>Investec</option>
                  <option>TymeBank</option>
                  <option>Discovery Bank</option>
                  <option>Bidvest Bank</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Account Holder Name *</label>
                <Input value={bankAccountHolder} onChange={e => setBankAccountHolder(e.target.value)} placeholder="Full name as it appears on the account" className="h-12 rounded-xl" data-testid="input-bank-holder" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Account Number *</label>
                <Input value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} placeholder="Your account number" className="h-12 rounded-xl" inputMode="numeric" data-testid="input-bank-account" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Account Type *</label>
                  <select value={bankAccountType} onChange={e => setBankAccountType(e.target.value)} className="h-12 rounded-xl border border-gray-200 bg-white px-3 w-full text-sm" data-testid="select-account-type">
                    <option>Cheque</option>
                    <option>Savings</option>
                    <option>Current</option>
                    <option>Transmission</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Branch Code *</label>
                  <Input value={bankBranchCode} onChange={e => setBankBranchCode(e.target.value)} placeholder="e.g. 632005" className="h-12 rounded-xl" inputMode="numeric" data-testid="input-branch-code" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-yellow-500" /> Statement Delivery</h3>
              <p className="text-xs text-gray-500">Where should we send your monthly earnings statements?</p>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email for Statements</label>
                <Input value={statementEmail} onChange={e => setStatementEmail(e.target.value)} placeholder="statements@example.com" type="email" className="h-12 rounded-xl" data-testid="input-statement-email" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">WhatsApp / Phone for Statements</label>
                <Input value={statementPhone} onChange={e => setStatementPhone(e.target.value)} placeholder="e.g. 074 567 8901" className="h-12 rounded-xl" data-testid="input-statement-phone" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2"><Users className="h-4 w-4 text-yellow-500" /> Financial Nominees</h3>
              <p className="text-xs text-gray-500">Nominees can view your vehicle's financial statements and earnings history. They cannot withdraw or make changes.</p>

              <div className="border border-gray-100 rounded-xl p-3 space-y-3 bg-gray-50">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Nominee 1</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Full Name</label>
                    <Input value={nominee1Name} onChange={e => setNominee1Name(e.target.value)} placeholder="e.g. Thandi Maluleke" className="h-11 rounded-xl" data-testid="input-nominee1-name" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Relation</label>
                    <select value={nominee1Relation} onChange={e => setNominee1Relation(e.target.value)} className="h-11 rounded-xl border border-gray-200 bg-white px-3 w-full text-sm" data-testid="select-nominee1-relation">
                      <option value="">Select</option>
                      <option>Spouse</option>
                      <option>Partner</option>
                      <option>Parent</option>
                      <option>Sibling</option>
                      <option>Child</option>
                      <option>Accountant</option>
                      <option>Business Partner</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Phone</label>
                    <Input value={nominee1Phone} onChange={e => setNominee1Phone(e.target.value)} placeholder="074 567 8901" className="h-11 rounded-xl" data-testid="input-nominee1-phone" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email</label>
                    <Input value={nominee1Email} onChange={e => setNominee1Email(e.target.value)} placeholder="nominee@example.com" type="email" className="h-11 rounded-xl" data-testid="input-nominee1-email" />
                  </div>
                </div>
              </div>

              {!showNominee2 ? (
                <button onClick={() => setShowNominee2(true)} className="flex items-center gap-2 text-sm text-yellow-600 font-bold py-2" data-testid="btn-add-nominee2">
                  <Plus className="h-4 w-4" /> Add a second nominee
                </button>
              ) : (
                <div className="border border-gray-100 rounded-xl p-3 space-y-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Nominee 2</p>
                    <button onClick={() => { setShowNominee2(false); setNominee2Name(""); setNominee2Phone(""); setNominee2Email(""); setNominee2Relation(""); }} className="text-red-400" data-testid="btn-remove-nominee2">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Full Name</label>
                      <Input value={nominee2Name} onChange={e => setNominee2Name(e.target.value)} placeholder="e.g. John Mabunda" className="h-11 rounded-xl" data-testid="input-nominee2-name" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Relation</label>
                      <select value={nominee2Relation} onChange={e => setNominee2Relation(e.target.value)} className="h-11 rounded-xl border border-gray-200 bg-white px-3 w-full text-sm" data-testid="select-nominee2-relation">
                        <option value="">Select</option>
                        <option>Spouse</option>
                        <option>Partner</option>
                        <option>Parent</option>
                        <option>Sibling</option>
                        <option>Child</option>
                        <option>Accountant</option>
                        <option>Business Partner</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Phone</label>
                      <Input value={nominee2Phone} onChange={e => setNominee2Phone(e.target.value)} placeholder="074 567 8901" className="h-11 rounded-xl" data-testid="input-nominee2-phone" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email</label>
                      <Input value={nominee2Email} onChange={e => setNominee2Email(e.target.value)} placeholder="nominee2@example.com" type="email" className="h-11 rounded-xl" data-testid="input-nominee2-email" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Review Your Application</h2>
            <p className="text-sm text-gray-500">Please review all your details before submitting.</p>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-bold text-sm text-yellow-600 flex items-center gap-2"><User className="h-4 w-4" /> Personal Details</h3>
              {profilePhotoDoc && (
                <div className="flex items-center gap-4 pb-2 border-b border-gray-100">
                  <img src={profilePhotoDoc} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-yellow-400" data-testid="img-review-photo" />
                  <div>
                    <p className="text-sm font-bold">{fullName}</p>
                    <p className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Profile photo uploaded</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-gray-500">Name</span><span className="font-medium">{fullName}</span>
                <span className="text-gray-500">ID Number</span><span className="font-medium">{idNumber}</span>
                <span className="text-gray-500">Phone</span><span className="font-medium">{phone}</span>
                {email && <><span className="text-gray-500">Email</span><span className="font-medium">{email}</span></>}
                <span className="text-gray-500">Address</span><span className="font-medium">{address}</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
              <h3 className="font-bold text-sm text-yellow-600 flex items-center gap-2"><Car className="h-4 w-4" /> Vehicle</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-gray-500">Vehicle</span><span className="font-medium">{vehicleColor} {vehicleMake} {vehicleModel} ({vehicleYear})</span>
                <span className="text-gray-500">Plate</span><span className="font-medium">{licensePlate}</span>
                {vehicleRegistrationNumber && <><span className="text-gray-500">Reg. No.</span><span className="font-medium">{vehicleRegistrationNumber}</span></>}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
              <h3 className="font-bold text-sm text-yellow-600 flex items-center gap-2"><CreditCard className="h-4 w-4" /> Licenses</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-gray-500">License No.</span><span className="font-medium">{driverLicenseNumber}</span>
                <span className="text-gray-500">Code</span><span className="font-medium">{driverLicenseCode}</span>
                <span className="text-gray-500">Expires</span><span className="font-medium">{driverLicenseExpiry}</span>
                {vehicleLicenseExpiry && <><span className="text-gray-500">Vehicle Disc</span><span className="font-medium">{vehicleLicenseExpiry}</span></>}
                {roadworthyCertExpiry && <><span className="text-gray-500">Roadworthy</span><span className="font-medium">{roadworthyCertExpiry}</span></>}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
              <h3 className="font-bold text-sm text-yellow-600 flex items-center gap-2"><FileText className="h-4 w-4" /> Documents</h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">{driverLicenseDoc ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}<span>Driver's License</span></div>
                <div className="flex items-center gap-2">{vehicleLicenseDoc ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}<span>Vehicle License Disc</span></div>
                <div className="flex items-center gap-2">{roadworthyCertDoc ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}<span>Roadworthy Certificate</span></div>
                <div className="flex items-center gap-2">{proofOfInsuranceDoc ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <span className="text-gray-300">—</span>}<span className="text-gray-500">Proof of Insurance (optional)</span></div>
                <div className="flex items-center gap-2">{profilePhotoDoc ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <span className="text-gray-300">—</span>}<span className="text-gray-500">Profile Photo (optional)</span></div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
              <h3 className="font-bold text-sm text-yellow-600 flex items-center gap-2"><Landmark className="h-4 w-4" /> Banking</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-gray-500">Bank</span><span className="font-medium">{bankName}</span>
                <span className="text-gray-500">Account Holder</span><span className="font-medium">{bankAccountHolder}</span>
                <span className="text-gray-500">Account No.</span><span className="font-medium">••••{bankAccountNumber.slice(-4)}</span>
                <span className="text-gray-500">Type</span><span className="font-medium">{bankAccountType}</span>
                <span className="text-gray-500">Branch Code</span><span className="font-medium">{bankBranchCode}</span>
                {statementEmail && <><span className="text-gray-500">Statement Email</span><span className="font-medium truncate">{statementEmail}</span></>}
              </div>
            </div>

            {nominee1Name && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
                <h3 className="font-bold text-sm text-yellow-600 flex items-center gap-2"><Users className="h-4 w-4" /> Financial Nominees</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="font-medium">{nominee1Name} <span className="text-gray-400 text-xs">({nominee1Relation})</span></p>
                    <p className="text-gray-500 text-xs">{nominee1Phone}{nominee1Email ? ` · ${nominee1Email}` : ""}</p>
                  </div>
                  {showNominee2 && nominee2Name && (
                    <div>
                      <p className="font-medium">{nominee2Name} <span className="text-gray-400 text-xs">({nominee2Relation})</span></p>
                      <p className="text-gray-500 text-xs">{nominee2Phone}{nominee2Email ? ` · ${nominee2Email}` : ""}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200 flex items-start gap-3">
              <Shield className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-bold mb-1">By submitting, you confirm that:</p>
                <ul className="space-y-0.5 text-xs">
                  <li>• All information provided is accurate</li>
                  <li>• Your vehicle is in safe working condition</li>
                  <li>• You hold a valid driver's license</li>
                  <li>• Your banking details are correct for payout purposes</li>
                  <li>• You agree to GY Rides' terms and conditions</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border-t border-gray-100 p-4 flex gap-3">
        {stepIndex > 0 && (
          <Button variant="outline" className="h-14 px-6 rounded-2xl" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        )}
        {step === "review" ? (
          <Button
            className="flex-1 h-14 rounded-2xl bg-yellow-400 text-black hover:bg-yellow-500 font-bold text-lg"
            onClick={handleSubmit}
            disabled={submitting || !canProceedDocs}
            data-testid="btn-submit-onboarding"
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </Button>
        ) : (
          <Button
            className="flex-1 h-14 rounded-2xl bg-black text-white hover:bg-gray-900 font-bold text-base"
            onClick={handleNext}
            disabled={
              (step === "personal" && !canProceedPersonal) ||
              (step === "vehicle" && !canProceedVehicle) ||
              (step === "license" && !canProceedLicense) ||
              (step === "documents" && !canProceedDocs) ||
              (step === "banking" && !canProceedBanking)
            }
            data-testid="btn-next-step"
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
