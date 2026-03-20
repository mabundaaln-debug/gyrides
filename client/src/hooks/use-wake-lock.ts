import { useEffect, useRef } from "react";

/**
 * Keeps the device screen awake while the component is mounted.
 * Uses the Screen Wake Lock API (supported on Chrome/Android/Safari 16.4+).
 * Automatically re-acquires the lock when the tab becomes visible again
 * (the browser releases it automatically on page hide).
 */
export function useWakeLock() {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  const acquire = async () => {
    if (!("wakeLock" in navigator)) return;
    if (document.visibilityState !== "visible") return;
    try {
      lockRef.current = await (navigator as any).wakeLock.request("screen");
    } catch {
      // Device denied or not supported — silently ignore
    }
  };

  const release = () => {
    lockRef.current?.release().catch(() => {});
    lockRef.current = null;
  };

  useEffect(() => {
    acquire();

    // Re-acquire when tab becomes visible (browser auto-releases on hide)
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        acquire();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      release();
    };
  }, []);
}
