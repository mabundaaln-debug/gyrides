import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import IOSInstallBanner from "@/components/IOSInstallBanner";
import RiderApp from "@/pages/RiderApp";
import DriverApp from "@/pages/DriverApp";
import DriverOnboarding from "@/pages/DriverOnboarding";
import AdminApp from "@/pages/AdminApp";

function PaymentResult() {
  const [, setLocation] = useLocation();
  const path = window.location.pathname;
  const status = path.includes("success") ? "success" : path.includes("failure") ? "failure" : "cancel";
  return (
    <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 shadow-sm border text-center max-w-sm w-full">
        {status === "success" ? (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Payment Successful!</h2>
            <p className="text-gray-500 text-sm mb-6">Your Yoco payment has been processed. Your ride is being confirmed.</p>
          </>
        ) : status === "failure" ? (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Payment Failed</h2>
            <p className="text-gray-500 text-sm mb-6">Your payment could not be processed. You can try again or choose a different payment method.</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Payment Cancelled</h2>
            <p className="text-gray-500 text-sm mb-6">You cancelled the payment. Your ride has been saved — you can pay with cash or try again.</p>
          </>
        )}
        <button className="w-full bg-black text-yellow-400 font-bold py-3 rounded-xl" onClick={() => setLocation("/rider")} data-testid="btn-back-to-app">
          Back to GY Rides
        </button>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Home} />
      <Route path="/payment/success" component={PaymentResult} />
      <Route path="/payment/failure" component={PaymentResult} />
      <Route path="/payment/cancel" component={PaymentResult} />
      <Route path="/rider/:rest*" component={RiderApp} />
      <Route path="/rider" component={RiderApp} />
      <Route path="/driver/onboarding" component={DriverOnboarding} />
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
          <IOSInstallBanner />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
