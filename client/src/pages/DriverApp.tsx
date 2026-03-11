import { useState } from "react";
import { Link } from "wouter";
import { User, MapPin, DollarSign, Settings, Bell, Check, X, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import riderAvatar from "@/assets/images/rider-avatar.jpg";
import driverAvatar from "@/assets/images/driver-avatar.jpg";

export default function DriverApp() {
  const [isOnline, setIsOnline] = useState(false);
  const [requestActive, setRequestActive] = useState(false);
  const [onTrip, setOnTrip] = useState(false);

  // Mock a request coming in
  const toggleOnline = () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    
    if (newStatus) {
      setTimeout(() => {
        setRequestActive(true);
      }, 3000);
    } else {
      setRequestActive(false);
    }
  };

  const acceptRequest = () => {
    setRequestActive(false);
    setOnTrip(true);
  };

  const declineRequest = () => {
    setRequestActive(false);
    // Maybe show another request after a delay
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative map-bg">
      {/* Top Header */}
      <div className="absolute top-0 w-full z-10 p-4">
        <div className="flex justify-between items-center bg-white/90 backdrop-blur-md p-2 pl-3 pr-2 rounded-full shadow-sm">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Menu className="h-6 w-6" />
          </Button>
          
          <div className="bg-black text-white px-4 py-1.5 rounded-full font-bold text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            R450.00
          </div>
          
          <Avatar className="h-10 w-10 border-2 border-transparent">
            <AvatarImage src={driverAvatar} />
            <AvatarFallback>SD</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 w-full flex flex-col items-center justify-center relative">
        {!isOnline && !onTrip && (
          <div className="bg-white/80 backdrop-blur px-6 py-3 rounded-full shadow-lg font-bold text-lg mb-8 animate-in fade-in">
            You're offline
          </div>
        )}

        {isOnline && !requestActive && !onTrip && (
          <div className="flex flex-col items-center">
            <div className="bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg font-bold text-lg mb-8 animate-pulse-slow">
              Finding trips in Giyani...
            </div>
            
            <div className="absolute w-[300px] h-[300px] border-[1px] border-primary/20 rounded-full animate-[ping_3s_ease-in-out_infinite]" />
            <div className="absolute w-[200px] h-[200px] border-[2px] border-primary/40 rounded-full animate-[ping_2s_ease-in-out_infinite]" />
            <div className="w-16 h-16 bg-primary rounded-full shadow-[0_0_20px_rgba(255,200,0,0.5)] flex items-center justify-center z-10">
               <img src="https://api.iconify.design/noto:oncoming-automobile.svg" className="w-8 h-8" />
            </div>
          </div>
        )}
      </div>

      {/* Floating GO Button (Offline State) */}
      {!isOnline && !onTrip && (
        <div className="absolute bottom-[100px] left-1/2 -translate-x-1/2 z-20">
          <button 
            onClick={toggleOnline}
            className="w-24 h-24 bg-primary text-primary-foreground rounded-full shadow-[0_10px_30px_rgba(255,200,0,0.4)] flex items-center justify-center text-2xl font-black border-4 border-white transition-transform active:scale-95"
          >
            GO
          </button>
        </div>
      )}

      {/* Online/Offline Bottom Bar */}
      {!requestActive && !onTrip && (
        <div className="glass-panel w-full z-20 flex absolute bottom-0 h-20 items-center justify-around px-6">
          <Link href="/">
             <Button variant="ghost" className="flex flex-col gap-1 text-muted-foreground h-auto py-2">
               <User className="h-5 w-5" />
               <span className="text-[10px]">Back</span>
             </Button>
          </Link>
          
          <Button 
            variant="ghost" 
            className="flex flex-col gap-1 text-primary h-auto py-2"
          >
            <MapPin className="h-5 w-5" />
            <span className="text-[10px]">Map</span>
          </Button>

          <Button 
            variant="ghost" 
            className={`flex flex-col gap-1 h-auto py-2 ${isOnline ? 'text-red-500' : 'text-muted-foreground'}`}
            onClick={toggleOnline}
          >
            <Settings className="h-5 w-5" />
            <span className="text-[10px]">{isOnline ? 'Go Offline' : 'Preferences'}</span>
          </Button>
        </div>
      )}

      {/* Incoming Request Modal */}
      {requestActive && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-end justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 mb-4">
            <div className="bg-primary p-4 text-center">
              <h3 className="font-black text-xl text-primary-foreground">GY Standard</h3>
              <p className="text-primary-foreground/80 text-sm">3 mins away</p>
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="text-3xl font-black">R45</div>
                  <div className="text-muted-foreground text-sm">Cash trip • Est. 12 mins</div>
                </div>
                <Avatar className="h-16 w-16">
                  <AvatarImage src={riderAvatar} />
                  <AvatarFallback>J</AvatarFallback>
                </Avatar>
              </div>
              
              <div className="space-y-4 mb-8 relative">
                <div className="absolute left-3.5 top-5 bottom-5 w-0.5 bg-gray-200" />
                
                <div className="flex items-start gap-4">
                  <div className="bg-primary w-7 h-7 rounded-full flex items-center justify-center z-10 shrink-0 border-2 border-white">
                    <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                  </div>
                  <div>
                    <div className="font-bold">Masingita Mall</div>
                    <div className="text-xs text-muted-foreground">Pickup</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-foreground w-7 h-7 rounded-full flex items-center justify-center z-10 shrink-0 border-2 border-white">
                    <MapPin className="w-3.5 h-3.5 text-background" />
                  </div>
                  <div>
                    <div className="font-bold">Section A</div>
                    <div className="text-xs text-muted-foreground">Drop-off</div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="flex-1 h-14 rounded-2xl border-gray-300 text-gray-500"
                  onClick={declineRequest}
                >
                  <X className="mr-2" /> Decline
                </Button>
                <Button 
                  size="lg" 
                  className="flex-1 h-14 rounded-2xl bg-foreground hover:bg-foreground/90 text-background text-lg"
                  onClick={acceptRequest}
                >
                  <Check className="mr-2" /> Accept
                </Button>
              </div>
            </div>
            
            <div className="h-1 bg-gray-100">
               <div className="h-full bg-primary animate-[shrink_15s_linear_forwards]" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      )}

      {/* On Trip View */}
      {onTrip && (
        <>
          <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2">
             <div className="bg-foreground text-background text-xs font-bold px-3 py-1 rounded-full shadow-lg mb-1 whitespace-nowrap">
               Heading to Pickup
             </div>
             <div className="w-12 h-12 bg-primary rounded-full shadow-lg flex items-center justify-center border-4 border-white mx-auto">
               <img src="https://api.iconify.design/noto:oncoming-automobile.svg" className="w-6 h-6" />
             </div>
          </div>
        
          <div className="glass-panel w-full z-20 flex flex-col absolute bottom-0 rounded-t-3xl pb-8 pt-4 px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />
            
            <div className="bg-gray-100 rounded-2xl p-4 flex items-center gap-4 mb-6">
               <div className="bg-primary/20 p-3 rounded-full">
                 <Navigation className="h-6 w-6 text-primary" />
               </div>
               <div>
                 <div className="font-bold text-lg text-green-600">3 mins away</div>
                 <div className="font-bold">Turn right on Main Road</div>
               </div>
            </div>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={riderAvatar} />
                  <AvatarFallback>J</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold">Jane D.</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Star className="h-3 w-3 fill-primary text-primary" /> 4.8
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" className="rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </Button>
              </div>
            </div>
            
            <Button 
              size="lg" 
              className="w-full h-16 rounded-2xl bg-foreground hover:bg-foreground/90 text-background text-lg font-bold"
              onClick={() => {
                setOnTrip(false);
                setIsOnline(true);
              }}
            >
              Start Trip
            </Button>
          </div>
        </>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}} />
    </div>
  );
}
