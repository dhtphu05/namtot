import { useAuth } from "@/features/auth/store/auth-store";
import { apiClient, API_BASE_URL } from "@/lib/api/client";
import type { Criterion, Level } from "@/lib/api/types";

export type StudentAssistantState =
  | "new_user"
  | "draft_in_progress"
  | "processing_evidence"
  | "evidence_confirmation_required"
  | "needs_attention"
  | "ready_to_submit"
  | "supplement_required"
  | "under_review"
  | "completed";

export type AssistantActionType =
  | "start_application"
  | "continue_application"
  | "resolve_supplement"
  | "confirm_evidence"
  | "retry_evidence_analysis"
  | "replace_evidence_file"
  | "resolve_precheck_issue"
  | "import_event"
  | "add_evidence"
  | "run_precheck"
  | "rerun_precheck"
  | "submit_application"
  | "view_review_status"
  | "view_result"
  | "none";

export type AssistantDestination = {
  route: string;
  query?: Record<string, string>;
};

export type StudentNextBestAction = {
  id: string;
  type: AssistantActionType;
  priority: number;
  title: string;
  deterministicDescription: string;
  ctaLabel: string;
  destination: AssistantDestination;
  applicationId: string;
  criterion?: Criterion;
  evidenceId?: string;
  eventId?: string;
  reviewTaskId?: string;
  notificationId?: string;
  dueAt?: string;
  urgency?: "normal" | "important" | "urgent";
  reasonCode: string;
};

export type StudentAssistantContext = {
  contextVersion: string;
  generatedAt: string;
  state: StudentAssistantState;
  greeting: {
    title: string;
    deterministicMessage: string;
  };
  application: {
    id: string | null;
    status: string;
    targetLevel: Level | null;
    readinessScore: number | null;
    precheckIsStale: boolean;
  };
  criterionSummary: Array<{
    criterion: Criterion;
    status:
      | "ready"
      | "missing"
      | "processing"
      | "needs_confirmation"
      | "needs_attention"
      | "under_review";
    label: string;
  }>;
  nextBestAction: StudentNextBestAction | null;
  secondaryInsights: Array<{
    id: string;
    type: string;
    title: string;
    destination?: AssistantDestination;
  }>;
  narrative: {
    streamingAvailable: boolean;
    fallbackText: string;
    streamEndpoint?: string;
    cacheKey?: string;
  };
};

export type AssistantStreamHandlers = {
  onMeta?: (data: {
    contextVersion: string;
    requestId: string;
    cached: boolean;
    sequence?: number;
  }) => void;
  onStatus?: (data: { stage: string }) => void;
  onDelta?: (data: { text: string }) => void;
  onComplete?: (data: {
    text: string;
    finalText?: string;
    contextVersion: string;
    fallback?: boolean;
  }) => void;
  onError?: (data: { code: string; recoverable: boolean }) => void;
};

type ParsedSseEvent = {
  event: string;
  data: unknown;
};

type DispatchState = {
  terminal: boolean;
  requestId: string | null;
};

export const studentAssistantApi = {
  getCurrentAssistantContext: async (schoolYear?: string) => {
    const query = schoolYear ? `?schoolYear=${encodeURIComponent(schoolYear)}` : "";
    return apiClient<StudentAssistantContext>(
      `/api/applications/current/assistant-context${query}`,
      {
        method: "GET",
      },
    );
  },
};

export async function streamCurrentAssistantNarrative({
  contextVersion,
  handlers,
  schoolYear,
  signal,
}: {
  schoolYear?: string;
  contextVersion: string;
  handlers: AssistantStreamHandlers;
  signal?: AbortSignal;
}): Promise<string> {
  const params = new URLSearchParams({ contextVersion });
  if (schoolYear) params.set("schoolYear", schoolYear);
  const headers = new Headers({ Accept: "text/event-stream" });
  const token = useAuth.getState().accessToken;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(
    `${API_BASE_URL}/api/applications/current/assistant-context/stream?${params.toString()}`,
    { method: "GET", headers, signal },
  );

  if (!response.ok || !response.body) {
    throw new Error("Không thể mở luồng hướng dẫn hồ sơ.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalText = "";
  const state: DispatchState = { terminal: false, requestId: null };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseBuffer(buffer);
    buffer = parsed.remainder;
    for (const event of parsed.events) {
      finalText = dispatchAssistantStreamEvent(event, handlers, state) ?? finalText;
    }
    if (state.terminal) break;
  }

  const tail = parseSseBuffer(buffer, true);
  for (const event of tail.events) {
    finalText = dispatchAssistantStreamEvent(event, handlers, state) ?? finalText;
  }

  return finalText;
}

export function parseSseBuffer(input: string, flush = false) {
  const frames = input.split(/\r?\n\r?\n/);
  const remainder = flush ? "" : (frames.pop() ?? "");
  const events = frames
    .map(parseSseFrame)
    .filter((event): event is ParsedSseEvent => Boolean(event));
  if (flush && remainder.trim()) {
    const tail = parseSseFrame(remainder);
    if (tail) events.push(tail);
  }
  return { events, remainder };
}

function parseSseFrame(frame: string): ParsedSseEvent | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const rawLine of frame.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (!dataLines.length) return null;
  try {
    return { event, data: JSON.parse(dataLines.join("\n")) };
  } catch {
    return null;
  }
}

function dispatchAssistantStreamEvent(
  event: ParsedSseEvent,
  handlers: AssistantStreamHandlers,
  state: DispatchState,
): string | null {
  const requestId = readRequestId(event.data);
  if (state.terminal) return null;
  if (event.event === "meta") {
    state.requestId = requestId ?? state.requestId;
    handlers.onMeta?.(event.data as { contextVersion: string; requestId: string; cached: boolean });
    return null;
  }
  if (state.requestId && requestId && requestId !== state.requestId) return null;
  if (event.event === "status") {
    handlers.onStatus?.(event.data as { stage: string });
    return null;
  }
  if (event.event === "delta") {
    handlers.onDelta?.(event.data as { text: string });
    return null;
  }
  if (event.event === "error") {
    state.terminal = true;
    handlers.onError?.(event.data as { code: string; recoverable: boolean });
    throw new Error("Luồng hướng dẫn bị gián đoạn.");
  }
  if (event.event === "complete") {
    const data = event.data as { text: string; finalText?: string; contextVersion: string };
    state.terminal = true;
    handlers.onComplete?.(data);
    return data.finalText || data.text;
  }
  return null;
}

function readRequestId(data: unknown) {
  return data && typeof data === "object" && "requestId" in data
    ? String((data as { requestId?: unknown }).requestId ?? "")
    : null;
}
