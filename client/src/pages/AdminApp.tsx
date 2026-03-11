import { Link } from "wouter";
import { Users, Car, Map, DollarSign, BarChart3, Settings, LogOut, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminApp() {
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto">
      <div className="bg-foreground text-background pt-12 pb-6 px-6 rounded-b-3xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-black tracking-tight">GY Admin</h1>
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-background hover:bg-white/20 rounded-full">
              <LogOut className="h-5 w-5" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-white/10 border-none shadow-none text-background">
            <CardContent className="p-4 flex flex-col items-start gap-2">
              <div className="p-2 bg-primary/20 rounded-lg text-primary">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">R12.4k</div>
                <div className="text-xs opacity-70">Today's Revenue</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-none shadow-none text-background">
            <CardContent className="p-4 flex flex-col items-start gap-2">
              <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                <Map className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">142</div>
                <div className="text-xs opacity-70">Active Trips</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1">
        <h2 className="font-bold text-lg mb-2">Management</h2>
        
        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-between h-16 rounded-2xl bg-white border-gray-100 shadow-sm px-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <div className="text-left">
                <div className="font-bold">Drivers</div>
                <div className="text-xs text-muted-foreground">45 online now</div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Button>
          
          <Button variant="outline" className="w-full justify-between h-16 rounded-2xl bg-white border-gray-100 shadow-sm px-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-50 p-2 rounded-xl text-purple-600">
                <Car className="h-5 w-5" />
              </div>
              <div className="text-left">
                <div className="font-bold">Vehicles & Pricing</div>
                <div className="text-xs text-muted-foreground">Manage categories</div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Button>

          <Button variant="outline" className="w-full justify-between h-16 rounded-2xl bg-white border-gray-100 shadow-sm px-4">
            <div className="flex items-center gap-3">
              <div className="bg-orange-50 p-2 rounded-xl text-orange-600">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div className="text-left">
                <div className="font-bold">Reports</div>
                <div className="text-xs text-muted-foreground">Earnings & metrics</div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>

        <h2 className="font-bold text-lg mb-2 mt-8">Recent Alerts</h2>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-start gap-3 pb-4 border-b border-gray-50">
            <div className="w-2 h-2 mt-2 bg-red-500 rounded-full shrink-0" />
            <div>
              <div className="font-medium text-sm">High demand in Section B</div>
              <div className="text-xs text-muted-foreground mt-1">Surge pricing activated (1.5x)</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 mt-2 bg-gray-300 rounded-full shrink-0" />
            <div>
              <div className="font-medium text-sm">Driver application pending</div>
              <div className="text-xs text-muted-foreground mt-1">3 new profiles require review</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
