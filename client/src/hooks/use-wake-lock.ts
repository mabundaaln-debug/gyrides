import { useEffect, useRef } from "react";

/**
 * Keeps the device screen awake while `enabled` is true.
 * Uses the Screen Wake Lock API (supported on Chrome/Android/Safari 16.4+).
 * Automatically re-acquires the lock when the tab becomes visible again
 * (the browser releases it automatically on page hide).
 *
 * Pass `enabled = false` to release the lock immediately (e.g. when the
 * active trip ends) so the screen can dim normally outside of tracking.
 */

interface WakeLockSentinel extends EventTarget {
  readonly released: boolean;
  readonly type: "screen";
  release(): Promise<void>;
}

interface NavigatorWithWakeLock extends Navigator {
  wakeLock?: {
    request(type: "screen"): Promise<WakeLockSentinel>;
  };
}

export function useWakeLock(enabled: boolean = true) {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  const acquire = async () => {
    const nav = navigator as NavigatorWithWakeLock;
    if (!nav.wakeLock) return;
    if (document.visibilityState !== "visible") return;
    if (lockRef.current && !lockRef.current.released) return;
    try {
      lockRef.current = await nav.wakeLock.request("screen");
    } catch {
      // Device denied or not supported — silently ignore
    }
  };

  const release = () => {
    lockRef.current?.release().catch(() => {});
    lockRef.current = null;
  };

  useEffect(() => {
    if (!enabled) {
      release();
      return;
    }

    acquire();

    // Re-acquire when tab becomes visible (browser auto-releases on hide)
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        acquire();
      } else {
        release();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      release();
    };
  }, [enabled]);
}
