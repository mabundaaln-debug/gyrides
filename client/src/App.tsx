import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import RiderApp from "@/pages/RiderApp";
import DriverApp from "@/pages/DriverApp";
import AdminApp from "@/pages/AdminApp";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Home} />
      <Route path="/rider/:rest*" component={RiderApp} />
      <Route path="/rider" component={RiderApp} />
      <Route path="/driver/:rest*" component={DriverApp} />
      <Route path="/driver" component={DriverApp} />
      <Route path="/admin/:rest*" component={AdminApp} />
      <Route path="/admin" component={AdminApp} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
