import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Car, User, Settings, ArrowRight, LogIn, UserPlus, Eye, EyeOff, Download, ArrowLeft, Phone, KeyRound, CheckCircle2, ShieldCheck, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { login, register, forgotPassword, resetPassword, googleAuth, getWebauthnLoginOptions, verifyWebauthnLogin } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { user, setUser } = useAuth();
  const [, setLocation] = useLocation();
  const [showLogin, setShowLogin] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"rider" | "driver">("rider");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState<"verify" | "newPassword" | "success">("verify");
  const [resetPhone, setResetPhone] = useState("");
  const [resetUsername, setResetUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);


  const handleLogin = async () => {
    if (!username || !password) {
      toast({ title: "Missing fields", description: "Please enter username and password", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const u = await login(username, password);
      setUser(u);
      if (u.role === "rider") setLocation("/rider");
      else if (u.role === "driver") {
        if (u.approvalStatus === "approved") setLocation("/driver");
        else setLocation("/driver/onboarding");
      }
      else setLocation("/admin");
    } catch {
      toast({ title: "Login failed", description: "Check your username and password", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!username || !password || !fullName || !phone) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please confirm your password", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const u = await register({ username, password, fullName, phone, role });
      setUser(u);
      if (u.role === "rider") setLocation("/rider");
      else setLocation("/driver/onboarding");
    } catch {
      toast({ title: "Registration failed", description: "Username may already be taken", variant: "destructive" });
    }
    setLoading(false);
  };

  const navigateByRole = (u: any) => {
    if (u.role === "rider") setLocation("/rider");
    else if (u.role === "driver") {
      if (u.approvalStatus === "approved") setLocation("/driver");
      else setLocation("/driver/onboarding");
    } else setLocation("/admin");
  };

  const handleGoogleSignIn = async () => {
    if (!(window as any).google?.accounts?.id) {
      toast({ title: "Google Sign-In not available", description: "Google Client ID has not been configured yet", variant: "destructive" });
      return;
    }
    (window as any).google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        toast({ title: "Google Sign-In", description: "Please allow popups for Google Sign-In", variant: "destructive" });
      }
    });
  };

  const handleBiometricLogin = async () => {
    if (!window.PublicKeyCredential) {
      toast({ title: "Not supported", description: "Biometric login is not supported on this device", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const options = await getWebauthnLoginOptions(username || undefined);
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: Uint8Array.from(atob(options.challenge.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)),
          rpId: options.rpId,
          timeout: options.timeout,
          userVerification: options.userVerification,
          allowCredentials: options.allowCredentials?.map((c: any) => ({
            type: c.type,
            id: Uint8Array.from(atob(c.id.replace(/-/g, "+").replace(/_/g, "/")), ch => ch.charCodeAt(0)),
          })) || [],
        },
      }) as PublicKeyCredential;
      if (!credential) throw new Error("No credential");
      const rawId = Array.from(new Uint8Array(credential.rawId));
      const credentialId = btoa(String.fromCharCode(...rawId)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
      const u = await verifyWebauthnLogin({ sessionId: options.sessionId, credentialId });
      setUser(u);
      navigateByRole(u);
      toast({ title: "Welcome back!", description: `Signed in as ${u.fullName}` });
    } catch (e: any) {
      toast({ title: "Biometric login failed", description: "Could not authenticate. Try signing in with your password.", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const clientId = (window as any).__GOOGLE_CLIENT_ID;
      if (clientId && (window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            try {
              const payload = JSON.parse(atob(response.credential.split(".")[1]));
              const u = await googleAuth({
                googleId: payload.sub,
                email: payload.email,
                fullName: payload.name,
                avatarUrl: payload.picture,
              });
              setUser(u);
              navigateByRole(u);
              toast({ title: "Welcome!", description: `Signed in with Google as ${u.fullName}` });
            } catch {
              toast({ title: "Google Sign-In failed", variant: "destructive" });
            }
          },
        });
      }
    };
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);

  if (user) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-black">
        <div className="w-full max-w-sm mx-auto text-center">
          <img src="/gy-logo.png" alt="GY Rides" className="w-24 h-24 object-contain mb-6 mx-auto drop-shadow-2xl" />
          <h1 className="text-3xl font-black mb-2 text-white">Welcome back, {user.fullName.split(" ")[0]}!</h1>
          <p className="text-gray-400 mb-8">Signed in as {user.role}</p>

          <div className="space-y-3">
            {user.role === "rider" && (
              <Button size="lg" className="w-full h-14 rounded-2xl text-lg bg-yellow-400 hover:bg-yellow-500 text-black font-bold" onClick={() => setLocation("/rider")} data-testid="btn-go-rider">
                <Car className="mr-3" /> Book a Ride <ArrowRight className="ml-auto" size={18} />
              </Button>
            )}
            {user.role === "driver" && (
              <Button size="lg" className="w-full h-14 rounded-2xl text-lg bg-yellow-400 hover:bg-yellow-500 text-black font-bold" onClick={() => setLocation("/driver")} data-testid="btn-go-driver">
                <Car className="mr-3" /> Driver Dashboard <ArrowRight className="ml-auto" size={18} />
              </Button>
            )}
            {user.role === "admin" && (
              <Button size="lg" className="w-full h-14 rounded-2xl text-lg bg-yellow-400 hover:bg-yellow-500 text-black font-bold" onClick={() => setLocation("/admin")} data-testid="btn-go-admin">
                <Settings className="mr-3" /> Admin Panel <ArrowRight className="ml-auto" size={18} />
              </Button>
            )}
            <Button variant="ghost" className="w-full text-gray-400 hover:text-white" onClick={() => { setUser(null); }}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleVerifyIdentity = async () => {
    if (!resetUsername || !resetPhone) {
      toast({ title: "Missing fields", description: "Please enter your username and phone number", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(resetUsername, resetPhone);
      setResetStep("newPassword");
      toast({ title: "Identity verified", description: "You can now set a new password" });
    } catch (e: any) {
      const msg = e?.message || "Verification failed";
      try {
        const parsed = JSON.parse(msg);
        toast({ title: "Verification failed", description: parsed.message || msg, variant: "destructive" });
      } catch {
        toast({ title: "Verification failed", description: "Username and phone number don't match our records", variant: "destructive" });
      }
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      toast({ title: "Missing password", description: "Please enter a new password", variant: "destructive" });
      return;
    }
    if (newPassword.length < 4) {
      toast({ title: "Too short", description: "Password must be at least 4 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Passwords don't match", description: "Please confirm your new password", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await resetPassword(resetUsername, resetPhone, newPassword);
      setResetStep("success");
      toast({ title: "Password reset!", description: "You can now sign in with your new password" });
    } catch {
      toast({ title: "Reset failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    }
    setLoading(false);
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-[100dvh] flex flex-col p-6 bg-black">
        <div className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center">
          <img src="/gy-logo.png" alt="GY Rides" className="w-20 h-20 object-contain mb-8 mx-auto drop-shadow-2xl" />

          {resetStep === "verify" && (
            <>
              <div className="w-16 h-16 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Phone className="h-8 w-8 text-yellow-400" />
              </div>
              <h2 className="text-2xl font-black text-center mb-1 text-white" data-testid="text-forgot-title">Reset Password</h2>
              <p className="text-gray-400 text-center mb-8 text-sm">Enter your username and the phone number linked to your account</p>

              <div className="space-y-3">
                <Input
                  placeholder="Username"
                  value={resetUsername}
                  onChange={e => setResetUsername(e.target.value)}
                  className="h-14 rounded-2xl bg-white/10 border-white/20 px-5 text-lg text-white placeholder:text-gray-500"
                  data-testid="input-reset-username"
                />
                <Input
                  placeholder="Phone Number (e.g. 071 234 5678)"
                  value={resetPhone}
                  onChange={e => setResetPhone(e.target.value)}
                  className="h-14 rounded-2xl bg-white/10 border-white/20 px-5 text-lg text-white placeholder:text-gray-500"
                  data-testid="input-reset-phone"
                />
                <button
                  className="w-full h-14 rounded-2xl text-lg font-bold bg-yellow-400 hover:bg-yellow-500 text-black transition-colors disabled:opacity-50"
                  onClick={handleVerifyIdentity}
                  disabled={loading}
                  data-testid="btn-verify-identity"
                >
                  {loading ? "Verifying..." : "Verify Identity"}
                </button>
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-sm text-gray-400 text-center">
                  Can't remember your phone number? Contact admin on WhatsApp:
                </p>
                <a
                  href="https://wa.me/27686427644?text=Hi%20GY%20Rides%2C%20I%20need%20help%20resetting%20my%20password"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm bg-green-500 hover:bg-green-600 text-white transition-colors"
                  data-testid="btn-whatsapp-help"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.359 0-4.543-.813-6.265-2.175l-.436-.352-3.2 1.073 1.073-3.2-.352-.436A9.956 9.956 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                  WhatsApp Support
                </a>
              </div>
            </>
          )}

          {resetStep === "newPassword" && (
            <>
              <div className="w-16 h-16 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <KeyRound className="h-8 w-8 text-yellow-400" />
              </div>
              <h2 className="text-2xl font-black text-center mb-1 text-white">Set New Password</h2>
              <p className="text-gray-400 text-center mb-2 text-sm">Identity verified for <span className="text-yellow-400 font-bold">{resetUsername}</span></p>
              <div className="flex items-center justify-center gap-1 mb-8">
                <ShieldCheck className="h-4 w-4 text-green-400" />
                <span className="text-green-400 text-xs font-medium">Phone number verified</span>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="New Password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="h-14 rounded-2xl bg-white/10 border-white/20 px-5 pr-12 text-lg text-white placeholder:text-gray-500"
                    data-testid="input-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm New Password"
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  className="h-14 rounded-2xl bg-white/10 border-white/20 px-5 text-lg text-white placeholder:text-gray-500"
                  data-testid="input-confirm-new-password"
                />
                <button
                  className="w-full h-14 rounded-2xl text-lg font-bold bg-yellow-400 hover:bg-yellow-500 text-black transition-colors disabled:opacity-50"
                  onClick={handleResetPassword}
                  disabled={loading}
                  data-testid="btn-set-new-password"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </>
          )}

          {resetStep === "success" && (
            <>
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-400" />
              </div>
              <h2 className="text-2xl font-black text-center mb-2 text-white">Password Reset!</h2>
              <p className="text-gray-400 text-center mb-8 text-sm">Your password has been changed successfully. You can now sign in with your new password.</p>
              <button
                className="w-full h-14 rounded-2xl text-lg font-bold bg-yellow-400 hover:bg-yellow-500 text-black transition-colors"
                onClick={() => {
                  setShowForgotPassword(false);
                  setShowLogin(true);
                  setIsRegister(false);
                  setResetStep("verify");
                  setResetUsername("");
                  setResetPhone("");
                  setNewPassword("");
                  setConfirmNewPassword("");
                }}
                data-testid="btn-back-to-login"
              >
                Sign In Now
              </button>
            </>
          )}

          {resetStep !== "success" && (
            <button
              className="w-full text-gray-500 text-sm mt-6 py-3"
              onClick={() => {
                setShowForgotPassword(false);
                setShowLogin(true);
                setResetStep("verify");
                setResetUsername("");
                setResetPhone("");
                setNewPassword("");
                setConfirmNewPassword("");
              }}
              data-testid="btn-back-from-reset"
            >
              <ArrowLeft className="inline h-4 w-4 mr-1" /> Back to Sign In
            </button>
          )}
        </div>
      </div>
    );
  }

  if (showLogin) {
    return (
      <div className="min-h-[100dvh] flex flex-col p-6 bg-black">
        <div className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center">
          <img src="/gy-logo.png" alt="GY Rides" className="w-20 h-20 object-contain mb-8 mx-auto drop-shadow-2xl" />
          <h2 className="text-2xl font-black text-center mb-1 text-white">{isRegister ? "Create Account" : "Welcome Back"}</h2>
          <p className="text-gray-400 text-center mb-8">{isRegister ? "Join GY Rides today" : "Sign in to continue"}</p>

          <div className="space-y-3">
            <Input
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="h-14 rounded-2xl bg-white/10 border-white/20 px-5 text-lg text-white placeholder:text-gray-500"
              data-testid="input-username"
            />

            {isRegister && (
              <>
                <Input
                  placeholder="Full Name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="h-14 rounded-2xl bg-white/10 border-white/20 px-5 text-lg text-white placeholder:text-gray-500"
                  data-testid="input-fullname"
                />
                <Input
                  placeholder="Phone Number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="h-14 rounded-2xl bg-white/10 border-white/20 px-5 text-lg text-white placeholder:text-gray-500"
                  data-testid="input-phone"
                />
                <Input
                  placeholder="Email (optional)"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="h-14 rounded-2xl bg-white/10 border-white/20 px-5 text-lg text-white placeholder:text-gray-500"
                  data-testid="input-email"
                />
              </>
            )}

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-14 rounded-2xl bg-white/10 border-white/20 px-5 pr-12 text-lg text-white placeholder:text-gray-500"
                data-testid="input-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                data-testid="btn-toggle-password"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {isRegister && (
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="h-14 rounded-2xl bg-white/10 border-white/20 px-5 text-lg text-white placeholder:text-gray-500"
                data-testid="input-confirm-password"
              />
            )}

            {isRegister && (
              <div className="flex gap-3">
                <button
                  className={`flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm border-2 transition-all ${role === "rider" ? "bg-yellow-400 text-black border-yellow-400" : "bg-transparent text-gray-400 border-white/20"}`}
                  onClick={() => setRole("rider")}
                  data-testid="btn-role-rider"
                >
                  <User className="h-4 w-4" /> Passenger
                </button>
                <button
                  className={`flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm border-2 transition-all ${role === "driver" ? "bg-yellow-400 text-black border-yellow-400" : "bg-transparent text-gray-400 border-white/20"}`}
                  onClick={() => setRole("driver")}
                  data-testid="btn-role-driver"
                >
                  <Car className="h-4 w-4" /> Driver
                </button>
              </div>
            )}

            {!isRegister && (
              <div className="text-right">
                <button
                  className="text-yellow-400 text-sm font-medium"
                  onClick={() => { setShowLogin(false); setShowForgotPassword(true); setResetStep("verify"); }}
                  data-testid="btn-forgot-password"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              className="w-full h-14 rounded-2xl text-lg font-bold bg-yellow-400 hover:bg-yellow-500 text-black transition-colors disabled:opacity-50"
              onClick={isRegister ? handleRegister : handleLogin}
              disabled={loading}
              data-testid="btn-submit-auth"
            >
              {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
            </button>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-gray-500 text-xs">or continue with</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <div className="flex gap-3">
              <button
                className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm bg-white text-gray-800 hover:bg-gray-100 transition-colors"
                onClick={handleGoogleSignIn}
                data-testid="btn-google-signin"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              {!isRegister && (
                <button
                  className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors"
                  onClick={handleBiometricLogin}
                  disabled={loading}
                  data-testid="btn-biometric-login"
                >
                  <Fingerprint className="h-5 w-5" />
                  Biometrics
                </button>
              )}
            </div>


            <button className="w-full text-gray-400 text-sm py-3" onClick={() => { setIsRegister(!isRegister); setConfirmPassword(""); }}>
              {isRegister ? "Already have an account? Sign In" : "New here? Create Account"}
            </button>
            <button className="w-full text-gray-500 text-sm" onClick={() => setShowLogin(false)}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-black relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-40 h-40 bg-yellow-400 rounded-full blur-3xl" />
        <div className="absolute bottom-32 right-8 w-56 h-56 bg-yellow-400 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mx-auto relative z-10">
        <img src="/gy-logo.png" alt="GY Rides" className="w-32 h-32 object-contain mb-6 drop-shadow-2xl" />

        <h1 className="text-4xl font-black text-center mb-2 tracking-tight text-white">GY Rides</h1>
        <p className="text-yellow-400 text-center mb-2 text-lg font-medium">Your local ride, anytime.</p>
        <p className="text-gray-500 text-center mb-12 text-sm">Transport made easy in Giyani</p>

        <div className="space-y-3 w-full">
          <button
            className="w-full h-14 text-lg rounded-2xl shadow-lg flex items-center justify-between px-6 font-bold bg-yellow-400 text-black transition-colors hover:bg-yellow-500"
            onClick={() => { setShowLogin(true); setIsRegister(false); }}
            data-testid="btn-get-started"
          >
            <span className="flex items-center gap-3">
              <LogIn size={22} />
              Sign In
            </span>
            <ArrowRight size={20} />
          </button>

          <button
            className="w-full h-14 text-lg rounded-2xl flex items-center justify-between px-6 font-bold border-2 border-white/20 text-white transition-colors hover:border-yellow-400 hover:text-yellow-400"
            onClick={() => { setShowLogin(true); setIsRegister(true); }}
            data-testid="btn-create-account"
          >
            <span className="flex items-center gap-3">
              <UserPlus size={22} />
              Create Account
            </span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>

      {installPrompt && (
        <button
          className="mb-4 flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 border border-white/20 text-white font-semibold text-sm transition-all hover:bg-yellow-400 hover:text-black hover:border-yellow-400 relative z-10"
          onClick={async () => {
            installPrompt.prompt();
            const result = await installPrompt.userChoice;
            if (result.outcome === "accepted") {
              setInstallPrompt(null);
              toast({ title: "App installed!", description: "GY Rides has been added to your home screen" });
            }
          }}
          data-testid="btn-install-app"
        >
          <Download size={18} />
          Install GY Rides App
        </button>
      )}

      <div className="mt-4 text-sm text-gray-600 text-center relative z-10">
        Giyani, Limpopo, South Africa
      </div>
    </div>
  );
}
