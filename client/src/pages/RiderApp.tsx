import { useState } from "react";
import { useLocation, Route, Switch, Link } from "wouter";
import { MapPin, Navigation, Menu, Search, Clock, CreditCard, ChevronLeft, Star, StarHalf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import riderAvatar from "@/assets/images/rider-avatar.jpg";
import driverAvatar from "@/assets/images/driver-avatar.jpg";

export default function RiderApp() {
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative">
      <Switch>
        <Route path="/rider" component={BookingFlow} />
        <Route path="/rider/tracking" component={TrackingView} />
      </Switch>
    </div>
  );
}

function BookingFlow() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"search" | "confirm" | "searching">("search");
  
  return (
    <div className="flex-1 flex flex-col h-full relative map-bg">
      {/* Header */}
      <div className="absolute top-0 w-full z-10 p-4">
        <div className="flex justify-between items-center bg-white/90 backdrop-blur-md p-3 rounded-full shadow-sm">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Menu className="h-6 w-6" />
          </Button>
          <span className="font-bold text-lg">GY Rides</span>
          <Avatar className="h-10 w-10 border-2 border-primary">
            <AvatarImage src={riderAvatar} />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 w-full flex items-center justify-center relative">
        {step === "confirm" && (
          <>
            <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-in zoom-in duration-300">
              <div className="bg-foreground text-background text-xs font-bold px-3 py-1 rounded-full shadow-lg mb-1">
                Pickup
              </div>
              <MapPin className="h-8 w-8 text-foreground" fill="currentColor" />
            </div>
            
            <div className="absolute top-[30%] left-[30%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-70">
              <div className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-lg mb-1">
                Drop-off
              </div>
              <MapPin className="h-8 w-8 text-primary" fill="currentColor" />
            </div>
            
            {/* Dashed line connecting points (rough mockup) */}
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
               <line x1="50%" y1="40%" x2="30%" y2="30%" stroke="black" strokeWidth="3" strokeDasharray="5,5" />
            </svg>
          </>
        )}
      </div>

      {/* Bottom Sheet */}
      <div className="glass-panel rounded-t-3xl w-full z-20 flex flex-col absolute bottom-0 max-h-[80vh] animate-in slide-in-from-bottom-1/2 duration-300 ease-out">
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-3" />
        
        {step === "search" && (
          <div className="px-6 pb-8 pt-2 flex flex-col gap-4">
            <h2 className="text-2xl font-bold">Where to, Jane?</h2>
            
            <div className="relative mt-2">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <Input 
                placeholder="Enter destination in Giyani" 
                className="h-14 pl-12 rounded-2xl bg-gray-100/80 border-none text-lg shadow-inner"
                onClick={() => setStep("confirm")}
              />
            </div>
            
            <div className="flex gap-3 mt-4 overflow-x-auto pb-2 scrollbar-hide">
              <Button variant="outline" className="rounded-2xl h-12 flex-shrink-0 bg-white border-gray-200">
                <Clock className="mr-2 h-4 w-4" /> Home
              </Button>
              <Button variant="outline" className="rounded-2xl h-12 flex-shrink-0 bg-white border-gray-200">
                <Clock className="mr-2 h-4 w-4" /> Giyani Section A
              </Button>
              <Button variant="outline" className="rounded-2xl h-12 flex-shrink-0 bg-white border-gray-200">
                <Clock className="mr-2 h-4 w-4" /> Masingita Mall
              </Button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="px-6 pb-8 pt-2 flex flex-col gap-5 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setStep("search")} className="-ml-3">
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <h2 className="text-xl font-bold">Confirm Ride</h2>
            </div>
            
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src="https://api.iconify.design/noto:taxi.svg" alt="Taxi" className="w-12 h-12" />
                <div>
                  <h3 className="font-bold text-lg">GY Standard</h3>
                  <p className="text-muted-foreground text-sm">4 mins away • 4 seats</p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-xl">R45</div>
                <div className="text-xs text-muted-foreground line-through">R55</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Cash</span>
              </div>
              <Button variant="link" className="text-primary font-bold">Change</Button>
            </div>
            
            <Button 
              size="lg" 
              className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg"
              onClick={() => setStep("searching")}
            >
              Confirm GY Standard
            </Button>
          </div>
        )}

        {step === "searching" && (
          <div className="px-6 py-12 flex flex-col items-center justify-center gap-6 animate-in fade-in duration-300 text-center">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
              <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg">
                <Search className="h-6 w-6 text-primary-foreground animate-spin" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Finding your driver</h2>
              <p className="text-muted-foreground">Connecting to nearby drivers in Giyani...</p>
            </div>
            
            {/* Mock auto-redirect after short delay */}
            <div className="hidden">
               {setTimeout(() => setLocation("/rider/tracking"), 2000)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TrackingView() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="flex-1 flex flex-col h-full relative map-bg">
       <div className="absolute top-0 w-full z-10 p-4">
        <Button 
          variant="secondary" 
          size="icon" 
          className="rounded-full shadow-md bg-white/90 backdrop-blur-sm"
          onClick={() => setLocation("/rider")}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      </div>

      <div className="flex-1 w-full flex items-center justify-center relative">
        <div className="absolute top-[45%] left-[45%] -translate-x-1/2 -translate-y-1/2 animate-in slide-in-from-bottom-10 duration-1000">
           <div className="bg-white rounded-full p-2 shadow-xl border-2 border-primary">
             <img src="https://api.iconify.design/noto:oncoming-automobile.svg" className="w-8 h-8 -rotate-45" />
           </div>
        </div>
      </div>

      <div className="glass-panel rounded-t-3xl w-full z-20 flex flex-col absolute bottom-0 max-h-[80vh] px-6 pb-8 pt-4">
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Arriving in 3 mins</h2>
            <p className="text-muted-foreground text-sm">Your driver is completing a nearby trip</p>
          </div>
          <div className="bg-gray-100 rounded-xl px-4 py-2 text-center">
            <div className="text-sm font-bold">LGP 123 L</div>
            <div className="text-xs text-muted-foreground">Toyota Etios</div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 border-t border-b border-gray-100 py-4 mb-6">
          <Avatar className="h-14 w-14 border-2 border-primary">
            <AvatarImage src={driverAvatar} />
            <AvatarFallback>SM</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-bold text-lg">Sipho M.</h3>
            <div className="flex items-center text-sm text-muted-foreground gap-1">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span className="font-medium text-foreground">4.9</span>
              <span>• 1,240 trips</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="icon" variant="outline" className="rounded-full h-10 w-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </Button>
            <Button size="icon" variant="outline" className="rounded-full h-10 w-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </Button>
          </div>
        </div>
        
        <Button variant="secondary" className="w-full h-14 rounded-2xl text-red-500 font-bold bg-red-50 hover:bg-red-100">
          Cancel Ride
        </Button>
      </div>
    </div>
  );
}
