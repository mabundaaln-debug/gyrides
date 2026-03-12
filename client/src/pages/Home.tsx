import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Car, User, Settings, ArrowRight, LogIn, UserPlus } from "lucide-react";
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
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"rider" | "driver">("rider");
  const [loading, setLoading] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!seeded) {
      seedData().catch(() => {});
      setSeeded(true);
    }
  }, [seeded]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const u = await login(username, password);
      setUser(u);
      if (u.role === "rider") setLocation("/rider");
      else if (u.role === "driver") setLocation("/driver");
      else setLocation("/admin");
    } catch {
      toast({ title: "Login failed", description: "Check your username and password", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const u = await register({ username, password, fullName, phone, role });
      setUser(u);
      if (u.role === "rider") setLocation("/rider");
      else setLocation("/driver");
    } catch {
      toast({ title: "Registration failed", description: "Username may already be taken", variant: "destructive" });
    }
    setLoading(false);
  };

  if (user) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full max-w-sm mx-auto text-center">
          <div className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center shadow-lg mb-6 mx-auto">
            <Car size={40} className="text-yellow-400" />
          </div>
          <h1 className="text-3xl font-black mb-2">Welcome back, {user.fullName.split(" ")[0]}!</h1>
          <p className="text-gray-500 mb-8">Signed in as {user.role}</p>

          <div className="space-y-3">
            {user.role === "rider" && (
              <Button size="lg" className="w-full h-14 rounded-2xl text-lg bg-black hover:bg-gray-900" onClick={() => setLocation("/rider")}>
                <Car className="mr-3" /> Book a Ride <ArrowRight className="ml-auto" size={18} />
              </Button>
            )}
            {user.role === "driver" && (
              <Button size="lg" className="w-full h-14 rounded-2xl text-lg bg-black hover:bg-gray-900" onClick={() => setLocation("/driver")}>
                <Car className="mr-3" /> Driver Dashboard <ArrowRight className="ml-auto" size={18} />
              </Button>
            )}
            {user.role === "admin" && (
              <Button size="lg" className="w-full h-14 rounded-2xl text-lg bg-black hover:bg-gray-900" onClick={() => setLocation("/admin")}>
                <Settings className="mr-3" /> Admin Panel <ArrowRight className="ml-auto" size={18} />
              </Button>
            )}
            <Button variant="ghost" className="w-full text-gray-500" onClick={() => { setUser(null); }}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (showLogin) {
    return (
      <div className="min-h-[100dvh] flex flex-col p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center shadow-lg mb-8 mx-auto">
            <Car size={32} className="text-yellow-400" />
          </div>
          <h2 className="text-2xl font-black text-center mb-2">{isRegister ? "Create Account" : "Sign In"}</h2>
          <p className="text-gray-500 text-center mb-8">{isRegister ? "Join GY Rides today" : "Welcome back to GY Rides"}</p>

          <div className="space-y-4">
            <Input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="h-14 rounded-2xl bg-white border-gray-200 px-5 text-lg" data-testid="input-username" />
            <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="h-14 rounded-2xl bg-white border-gray-200 px-5 text-lg" data-testid="input-password" />

            {isRegister && (
              <>
                <Input placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} className="h-14 rounded-2xl bg-white border-gray-200 px-5 text-lg" data-testid="input-fullname" />
                <Input placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} className="h-14 rounded-2xl bg-white border-gray-200 px-5 text-lg" data-testid="input-phone" />
                <div className="flex gap-3">
                  <Button variant={role === "rider" ? "default" : "outline"} className="flex-1 h-12 rounded-2xl" onClick={() => setRole("rider")} data-testid="btn-role-rider">
                    <User className="mr-2 h-4 w-4" /> Rider
                  </Button>
                  <Button variant={role === "driver" ? "default" : "outline"} className="flex-1 h-12 rounded-2xl" onClick={() => setRole("driver")} data-testid="btn-role-driver">
                    <Car className="mr-2 h-4 w-4" /> Driver
                  </Button>
                </div>
              </>
            )}

            <Button
              size="lg"
              className="w-full h-14 rounded-2xl text-lg font-bold bg-black hover:bg-gray-900"
              onClick={isRegister ? handleRegister : handleLogin}
              disabled={loading}
              data-testid="btn-submit-auth"
            >
              {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
            </Button>

            {!isRegister && (
              <div className="bg-blue-50 rounded-2xl p-4 text-sm text-blue-800">
                <p className="font-bold mb-1">Demo Accounts:</p>
                <p>Rider: <span className="font-mono">jane / demo</span></p>
                <p>Driver: <span className="font-mono">sipho / demo</span></p>
                <p>Admin: <span className="font-mono">admin / admin</span></p>
              </div>
            )}

            <Button variant="ghost" className="w-full text-gray-500" onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? "Already have an account? Sign In" : "New here? Create Account"}
            </Button>
            <Button variant="ghost" className="w-full text-gray-400" onClick={() => setShowLogin(false)}>
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mx-auto">
        <div className="w-24 h-24 bg-black rounded-3xl flex items-center justify-center shadow-xl mb-8">
          <Car size={48} className="text-yellow-400" />
        </div>

        <h1 className="text-4xl font-black text-center mb-2 tracking-tight">GY Rides</h1>
        <p className="text-gray-500 text-center mb-12 text-lg">Local transport for Giyani</p>

        <div className="space-y-4 w-full">
          <button
            className="w-full h-16 text-lg rounded-2xl shadow-sm flex items-center justify-between px-6 font-bold"
            style={{ backgroundColor: "#000000", color: "#FFFFFF" }}
            onClick={() => setShowLogin(true)}
            data-testid="btn-get-started"
          >
            <span className="flex items-center gap-3">
              <LogIn size={24} color="#FFFFFF" />
              Sign In
            </span>
            <ArrowRight size={20} color="#FFFFFF" />
          </button>
        </div>
      </div>

      <div className="mt-8 text-sm text-gray-400 text-center">
        Giyani, Limpopo
      </div>
    </div>
  );
}
