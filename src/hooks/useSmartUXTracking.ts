import { useCallback } from "react";
import { trackSmartUXEvent } from "@/lib/smartux";

type SmartUXActionPayload = Record<string, unknown>;

export function useSmartUXTracking() {
  const trackAction = useCallback((eventName: string, payload?: SmartUXActionPayload) => {
    return trackSmartUXEvent(eventName, payload);
  }, []);

  const trackClick = useCallback((eventName: string, payload?: SmartUXActionPayload) => {
    return trackSmartUXEvent(eventName, {
      action: "click",
      ...payload,
    });
  }, []);

  const trackTiming = useCallback(
    (eventName: string, durationMs: number, payload?: SmartUXActionPayload) => {
      return trackSmartUXEvent(eventName, {
        duration_ms: durationMs,
        ...payload,
      });
    },
    [],
  );

  return { trackAction, trackClick, trackTiming };
}
