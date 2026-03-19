import { useState, useEffect } from "react";
import { X, Share, Plus } from "lucide-react";

export default function IOSInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandalone = (window.navigator as any).standalone === true;
    const dismissed = localStorage.getItem("gy-ios-install-dismissed");

    if (isIOS && !isInStandalone && !dismissed) {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("gy-ios-install-dismissed", "1");
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center pointer-events-none">
      <div
        className="w-full max-w-md pointer-events-auto animate-in slide-in-from-bottom-4 duration-300"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-3 mb-3 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-black px-5 pt-5 pb-4 flex items-center gap-3">
            <img src="/gy-logo-192.png" alt="GY Rides" className="w-12 h-12 rounded-2xl border-2 border-yellow-400 object-cover" />
            <div className="flex-1">
              <p className="text-white font-black text-base leading-tight">Add GY Rides to your iPhone</p>
              <p className="text-gray-400 text-xs mt-0.5">Install the app for the best experience</p>
            </div>
            <button onClick={dismiss} className="text-gray-500 hover:text-white transition-colors p-1" data-testid="ios-banner-close">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Steps */}
          <div className="px-5 py-4 space-y-4">
            <Step number={1} icon={
              <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center">
                <Share className="h-4 w-4 text-white" />
              </div>
            }>
              Tap the <strong>Share</strong> button at the bottom of Safari
            </Step>

            <div className="border-l-2 border-dashed border-gray-200 ml-4 h-3" />

            <Step number={2} icon={
              <div className="w-8 h-8 bg-gray-800 rounded-xl flex items-center justify-center">
                <Plus className="h-4 w-4 text-white" />
              </div>
            }>
              Scroll down and tap <strong>"Add to Home Screen"</strong>
            </Step>

            <div className="border-l-2 border-dashed border-gray-200 ml-4 h-3" />

            <Step number={3} icon={
              <div className="w-8 h-8 bg-yellow-400 rounded-xl flex items-center justify-center">
                <img src="/gy-logo-192.png" alt="" className="w-5 h-5 rounded-lg object-cover" />
              </div>
            }>
              Tap <strong>"Add"</strong> — GY Rides will appear on your home screen
            </Step>
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 flex gap-2">
            <button
              onClick={dismiss}
              className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-500 text-sm font-bold"
              data-testid="ios-banner-later"
            >
              Later
            </button>
            <button
              onClick={dismiss}
              className="flex-1 py-3 rounded-2xl bg-black text-yellow-400 text-sm font-black"
              data-testid="ios-banner-got-it"
            >
              Got it!
            </button>
          </div>
        </div>

        {/* Arrow pointing down to Safari share button */}
        <div className="flex justify-center mb-1">
          <div className="bg-black text-yellow-400 text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
            <Share className="h-3 w-3" />
            Tap the share icon below ↓
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ number, icon, children }: { number: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      {icon}
      <div className="flex-1 pt-1">
        <p className="text-sm text-gray-700 leading-snug">{children}</p>
      </div>
    </div>
  );
}
