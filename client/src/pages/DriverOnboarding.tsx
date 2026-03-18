import { useState } from "react";
import { useLocation } from "wouter";
import { Car, User, FileText, Camera, ChevronRight, ChevronLeft, CheckCircle, Clock, XCircle, Upload, Shield, CreditCard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { submitOnboarding } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type Step = "personal" | "vehicle" | "license" | "documents" | "review";

const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: "personal", label: "Personal Info", icon: <User className="h-4 w-4" /> },
  { key: "vehicle", label: "Vehicle Details", icon: <Car className="h-4 w-4" /> },
  { key: "license", label: "Licenses", icon: <CreditCard className="h-4 w-4" /> },
  { key: "documents", label: "Documents", icon: <FileText className="h-4 w-4" /> },
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

  if (!user || user.role !== "driver") {
    return null;
  }

  if (user.approvalStatus === "approved" && user.onboardingComplete) {
    setLocation("/driver");
    return null;
  }

  const stepIndex = STEPS.findIndex(s => s.key === step);

  const canProceedPersonal = fullName && phone && idNumber && address;
  const canProceedVehicle = vehicleMake && vehicleModel && vehicleColor && vehicleYear && licensePlate;
  const canProceedLicense = driverLicenseNumber && driverLicenseExpiry && driverLicenseCode;
  const canProceedDocs = driverLicenseDoc && vehicleLicenseDoc && roadworthyCertDoc;

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
        <h1 className="text-2xl font-black text-white mb-2">Application Rejected</h1>
        <p className="text-gray-400 mb-2 max-w-xs">Unfortunately your application was not approved.</p>
        {user.rejectionReason && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 w-full max-w-sm">
            <p className="text-sm text-red-400"><strong>Reason:</strong> {user.rejectionReason}</p>
          </div>
        )}
        <p className="text-gray-500 text-sm mb-8">You can update your documents and re-submit.</p>
        <Button className="bg-yellow-400 text-black hover:bg-yellow-500 font-bold rounded-2xl h-14 px-8" onClick={() => {
          setStep("personal");
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
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Personal Information</h2>
            <p className="text-sm text-gray-500">We need your personal details to verify your identity.</p>
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
              <DocUploadButton label="Profile Photo" fieldName="profilePhotoDoc" value={profilePhotoDoc} setter={setProfilePhotoDoc} required={false} />
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Review Your Application</h2>
            <p className="text-sm text-gray-500">Please review all your details before submitting.</p>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
              <h3 className="font-bold text-sm text-yellow-600 flex items-center gap-2"><User className="h-4 w-4" /> Personal Details</h3>
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

            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200 flex items-start gap-3">
              <Shield className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-bold mb-1">By submitting, you confirm that:</p>
                <ul className="space-y-0.5 text-xs">
                  <li>• All information provided is accurate</li>
                  <li>• Your vehicle is in safe working condition</li>
                  <li>• You hold a valid driver's license</li>
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
              (step === "documents" && !canProceedDocs)
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
