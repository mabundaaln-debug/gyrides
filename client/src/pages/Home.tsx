import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Car, User, Settings, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 map-bg bg-blend-overlay bg-white/90">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mx-auto animate-in slide-in-from-bottom-4 duration-500">
        <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center shadow-lg mb-8 transform rotate-3">
          <Car size={48} className="text-primary-foreground -rotate-3" />
        </div>
        
        <h1 className="text-4xl font-black text-center mb-2 tracking-tight">GY Rides</h1>
        <p className="text-muted-foreground text-center mb-12 text-lg">Local transport for Giyani.</p>

        <div className="space-y-4 w-full">
          <Link href="/rider">
            <Button size="lg" className="w-full h-16 text-lg rounded-2xl shadow-sm justify-between px-6 bg-foreground text-background hover:bg-foreground/90">
              <span className="flex items-center gap-3">
                <User size={24} />
                I'm a Rider
              </span>
              <ArrowRight size={20} />
            </Button>
          </Link>
          
          <Link href="/driver">
            <Button size="lg" variant="outline" className="w-full h-16 text-lg rounded-2xl shadow-sm justify-between px-6 border-2">
              <span className="flex items-center gap-3">
                <Car size={24} />
                I'm a Driver
              </span>
              <ArrowRight size={20} />
            </Button>
          </Link>

          <Link href="/admin">
            <Button size="lg" variant="ghost" className="w-full h-14 text-base rounded-2xl justify-between px-6 text-muted-foreground mt-4">
              <span className="flex items-center gap-3">
                <Settings size={20} />
                Admin Panel
              </span>
              <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="mt-8 text-sm text-muted-foreground text-center">
        Prototype Mode
      </div>
    </div>
  );
}
