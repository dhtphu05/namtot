import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { trackSmartUXPageView } from "@/lib/smartux";

export function SmartUXRouteTracker() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (lastTrackedPath.current === pathname) return;

    lastTrackedPath.current = pathname;
    const timeoutId = window.setTimeout(() => {
      trackSmartUXPageView(pathname);
    }, 100);

    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  return null;
}
