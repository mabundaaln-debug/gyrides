import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/Home";
import RiderApp from "@/pages/RiderApp";
import DriverApp from "@/pages/DriverApp";
import AdminApp from "@/pages/AdminApp";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home}/>
      <Route path="/rider/*?" component={RiderApp} />
      <Route path="/driver/*?" component={DriverApp} />
      <Route path="/admin/*?" component={AdminApp} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background flex justify-center w-full">
          {/* Mobile constraint container for desktop view */}
          <div className="w-full max-w-md bg-white min-h-[100dvh] relative shadow-2xl overflow-hidden flex flex-col">
            <Router />
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
