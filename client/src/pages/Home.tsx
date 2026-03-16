import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Car, User, Settings, ArrowRight, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { login, register, seedData } from "@/lib/api";
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
  const [seeded, setSeeded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!seeded) {
      seedData().catch(() => {});
      setSeeded(true);
    }
  }, [seeded]);

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
                <button className="text-yellow-400 text-sm font-medium" data-testid="btn-forgot-password">
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

            {!isRegister && (
              <div className="bg-white/5 rounded-2xl p-4 text-sm text-gray-400 border border-white/10">
                <p className="font-bold mb-1 text-gray-300">Demo Accounts:</p>
                <p>Rider: <span className="font-mono text-yellow-400">jane / demo</span></p>
                <p>Driver: <span className="font-mono text-yellow-400">sipho / demo</span></p>
                <p>Admin: <span className="font-mono text-yellow-400">admin / admin</span></p>
              </div>
            )}

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

      <div className="mt-8 text-sm text-gray-600 text-center relative z-10">
        Giyani, Limpopo, South Africa
      </div>
    </div>
  );
}
