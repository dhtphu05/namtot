type SmartUXPayload = Record<string, unknown>;
type SmartUXTrackFunction = (eventName: string, payload?: SmartUXPayload) => void;

type SmartUXTrackable = {
  track?: SmartUXTrackFunction;
  trackPageView?: (payload?: SmartUXPayload) => void;
};

declare global {
  interface Window {
    SmartUX?: SmartUXTrackable;
    smartUX?: SmartUXTrackable;
    _smartux?: SmartUXTrackable;
  }
}

const allowedPayloadKeys = new Set([
  "role",
  "page",
  "action",
  "criterion",
  "target_level",
  "status",
  "error_code",
  "duration_ms",
  "source_type",
  "file_type",
  "count",
  "step",
  "flow",
  "result_type",
]);

const sensitivePayloadKeys = new Set([
  "fullName",
  "full_name",
  "name",
  "studentName",
  "student_name",
  "studentCode",
  "student_code",
  "mssv",
  "email",
  "phone",
  "phoneNumber",
  "fileName",
  "file_name",
  "originalName",
  "ocrText",
  "ocr_text",
  "rawText",
  "raw_text",
  "evidenceText",
  "evidence_text",
  "evidenceContent",
  "evidence_content",
  "identityNumber",
  "citizenId",
  "address",
  "signedUrl",
  "publicUrl",
]);

const smartUXEnv = import.meta.env.VITE_SMARTUX_ENV || "production";

export function isSmartUXEnabled(): boolean {
  return import.meta.env.VITE_SMARTUX_ENABLED === "true";
}

export function getSmartUXGlobal(): SmartUXTrackable | null {
  if (typeof window === "undefined" || !isSmartUXEnabled()) return null;
  return window.SmartUX ?? window.smartUX ?? window._smartux ?? null;
}

export function trackSmartUXPageView(path?: string): boolean {
  if (typeof window === "undefined" || typeof document === "undefined" || !isSmartUXEnabled()) {
    return false;
  }

  const pagePath = path ?? window.location.pathname;
  const payload = sanitizeSmartUXPayload({
    page: pagePath,
    action: "page_view",
    path: pagePath,
    url: getSafeCurrentUrl(),
    title: document.title,
    env: smartUXEnv,
  });

  return sendSmartUX("page_view", payload, true);
}

export function trackSmartUXEvent(eventName: string, payload: SmartUXPayload = {}): boolean {
  if (typeof window === "undefined" || !isSmartUXEnabled()) return false;

  const safePayload = sanitizeSmartUXPayload({
    event_name: eventName,
    path: window.location.pathname,
    env: smartUXEnv,
    ...payload,
  });

  return sendSmartUX(eventName, safePayload, false);
}

export function sanitizeSmartUXPayload(payload: unknown): SmartUXPayload {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};

  const safePayload: SmartUXPayload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (sensitivePayloadKeys.has(key)) continue;
    if (!allowedPayloadKeys.has(key) && !isInternalSafeKey(key)) continue;

    const safeValue = sanitizeSmartUXValue(value);
    if (safeValue !== undefined) {
      safePayload[key] = safeValue;
    }
  }

  return safePayload;
}

function sendSmartUX(eventName: string, payload: SmartUXPayload, isPageView: boolean): boolean {
  const sdk = getSmartUXGlobal();
  const tracked = dispatchToSdk(sdk, eventName, payload, isPageView);

  if (!tracked && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("smartux:event", {
        detail: { eventName, payload, type: isPageView ? "pageview" : "event" },
      }),
    );
  }

  if (!tracked && smartUXEnv !== "production") {
    console.debug("[SmartUX] SDK unavailable, event dispatched locally", {
      eventName,
      payload,
    });
  }

  return tracked;
}

function dispatchToSdk(
  sdk: SmartUXTrackable | null,
  eventName: string,
  payload: SmartUXPayload,
  isPageView: boolean,
): boolean {
  try {
    if (isPageView && typeof sdk?.trackPageView === "function") {
      sdk.trackPageView(payload);
      return true;
    }

    if (typeof sdk?.track === "function") {
      sdk.track(eventName, payload);
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function isInternalSafeKey(key: string): boolean {
  return (
    key === "event_name" || key === "path" || key === "env" || key === "url" || key === "title"
  );
}

function sanitizeSmartUXValue(value: unknown): string | number | boolean | null | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value.slice(0, 160);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value;
  return undefined;
}

function getSafeCurrentUrl(): string {
  try {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return window.location.pathname;
  }
}
