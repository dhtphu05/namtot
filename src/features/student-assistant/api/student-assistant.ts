import { useAuth } from "@/features/auth/store/auth-store";
import { apiClient, API_BASE_URL } from "@/lib/api/client";
import type { Criterion } from "@/lib/api/types";

export type StudentAssistantContextType =
  "dashboard" | "evidence_card" | "precheck" | "event_registry" | "supplement";

export type StudentAssistantDestination = {
  route: string;
  query?: Record<string, string>;
};

export type StudentAssistantFact = {
  id: string;
  type: string;
  label: string;
  value: string;
  sourceId?: string;
  destination?: StudentAssistantDestination;
  verified: boolean;
};

export type StudentAssistantAction = {
  id: string;
  type:
    | "start_application"
    | "open_application"
    | "open_evidence"
    | "confirm_evidence"
    | "correct_evidence"
    | "replace_evidence_file"
    | "retry_evidence_analysis"
    | "open_precheck"
    | "open_criterion"
    | "replace_file"
    | "retry_analysis"
    | "add_evidence"
    | "open_event"
    | "check_participant"
    | "import_event"
    | "run_precheck"
    | "rerun_precheck"
    | "resolve_precheck_issue"
    | "open_supplement"
    | "resubmit_supplement"
    | "submit_application"
    | "contact_officer";
  label: string;
  description?: string;
  destination: StudentAssistantDestination;
  allowed: boolean;
  disabledReason?: string;
};

export type StudentAssistantContext = {
  contextType: StudentAssistantContextType;
  contextId: string;
  contextVersion: string;
  generatedAt: string;
  title: string;
  deterministicSummary: string;
  facts: StudentAssistantFact[];
  warnings: Array<{
    code: string;
    severity: "info" | "warning" | "blocking";
    message: string;
    sourceId?: string;
  }>;
  primaryAction: StudentAssistantAction | null;
  allowedActions: StudentAssistantAction[];
  suggestedQuestions: string[];
  boundaries: {
    canAnswerAboutCriteria: boolean;
    canAnswerAboutEvidence: boolean;
    canAnswerAboutEvents: boolean;
    canAnswerAboutSupplement: boolean;
    requiresOfficerForOfficialDecision: boolean;
  };
};

export type StudentAssistantAnswer = {
  answer: string;
  finalText?: string;
  intent: string;
  sourceRefs: Array<{
    factId: string;
    label: string;
    destination?: StudentAssistantDestination;
  }>;
  suggestedActionId?: string;
  navigation?: StudentAssistantAction | null;
  fallback?: boolean;
  requiresOfficerClarification: boolean;
  contextVersion: string;
};

export type StudentAssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export type StudentAssistantContextParams = {
  contextType: StudentAssistantContextType;
  contextId?: string;
  applicationId?: string;
  criterion?: Criterion;
  evidenceId?: string;
  eventId?: string;
  reviewTaskId?: string;
  schoolYear?: string;
};

export type StudentAssistantStreamHandlers = {
  onMeta?: (data: { requestId?: string; sequence?: number }) => void;
  onStatus?: (data: { stage: string }) => void;
  onDelta?: (data: { text: string }) => void;
  onSources?: (data: { sourceRefs: StudentAssistantAnswer["sourceRefs"] }) => void;
  onAction?: (data: { suggestedActionId: string | null }) => void;
  onNavigation?: (data: {
    selectedActionId: string | null;
    action: StudentAssistantAction | null;
  }) => void;
  onComplete?: (data: StudentAssistantAnswer) => void;
  onError?: (data: { code: string; recoverable: boolean }) => void;
};

export const studentCommunicationAssistantApi = {
  getStudentAssistantContext: (params: StudentAssistantContextParams) =>
    apiClient<StudentAssistantContext>(`/api/student-assistant/context${toQuery(params)}`, {
      method: "GET",
    }),

  resubmitSupplement: (reviewTaskId: string, contextVersion?: string) =>
    apiClient<{
      supplementRequest: { id: string; status: string; resubmittedAt: string | null };
      reviewTask: { id: string; status: string };
      application: { id: string; status: string };
    }>(`/api/student-assistant/supplements/${reviewTaskId}/resubmit`, {
      method: "POST",
      body: { contextVersion },
    }),
};

export async function streamStudentAssistantAnswer({
  context,
  message,
  recentMessages,
  clientConversationId,
  clientTurnId,
  clientAttemptId,
  handlers,
  signal,
}: {
  context: StudentAssistantContextParams & { contextVersion: string };
  message: string;
  recentMessages?: StudentAssistantMessage[];
  clientConversationId?: string;
  clientTurnId?: string;
  clientAttemptId?: string;
  handlers: StudentAssistantStreamHandlers;
  signal?: AbortSignal;
}): Promise<StudentAssistantAnswer | null> {
  const headers = new Headers({
    Accept: "text/event-stream",
    "Content-Type": "application/json",
  });
  const token = useAuth.getState().accessToken;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}/api/student-assistant/stream`, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({
      ...context,
      message,
      recentMessages: recentMessages?.slice(-6),
      clientConversationId,
      clientTurnId,
      clientAttemptId,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error("Không thể mở trợ lý hồ sơ.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalAnswer: StudentAssistantAnswer | null = null;
  const state: DispatchState = { terminal: false, requestId: null };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseBuffer(buffer);
    buffer = parsed.remainder;
    for (const event of parsed.events) {
      finalAnswer = dispatchStudentAssistantEvent(event, handlers, state) ?? finalAnswer;
    }
    if (state.terminal) break;
  }

  const tail = parseSseBuffer(buffer, true);
  for (const event of tail.events) {
    finalAnswer = dispatchStudentAssistantEvent(event, handlers, state) ?? finalAnswer;
  }

  return finalAnswer;
}

type ParsedSseEvent = {
  event: string;
  data: unknown;
};

type DispatchState = {
  terminal: boolean;
  requestId: string | null;
};

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
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (!dataLines.length) return null;
  try {
    return { event, data: JSON.parse(dataLines.join("\n")) };
  } catch {
    return null;
  }
}

function dispatchStudentAssistantEvent(
  event: ParsedSseEvent,
  handlers: StudentAssistantStreamHandlers,
  state: DispatchState,
): StudentAssistantAnswer | null {
  const requestId = readRequestId(event.data);
  if (state.terminal) return null;
  if (event.event === "meta") {
    state.requestId = requestId ?? state.requestId;
    handlers.onMeta?.(event.data as { requestId?: string; sequence?: number });
    return null;
  }
  if (state.requestId && requestId && requestId !== state.requestId) return null;
  if (event.event === "status") handlers.onStatus?.(event.data as { stage: string });
  if (event.event === "delta") handlers.onDelta?.(event.data as { text: string });
  if (event.event === "sources") {
    handlers.onSources?.(event.data as { sourceRefs: StudentAssistantAnswer["sourceRefs"] });
  }
  if (event.event === "action") {
    handlers.onAction?.(event.data as { suggestedActionId: string | null });
  }
  if (event.event === "navigation") {
    handlers.onNavigation?.(
      event.data as { selectedActionId: string | null; action: StudentAssistantAction | null },
    );
  }
  if (event.event === "error") {
    state.terminal = true;
    handlers.onError?.(event.data as { code: string; recoverable: boolean });
  }
  if (event.event === "complete") {
    const data = event.data as StudentAssistantAnswer;
    state.terminal = true;
    handlers.onComplete?.(data);
    return data;
  }
  return null;
}

function readRequestId(data: unknown) {
  return data && typeof data === "object" && "requestId" in data
    ? String((data as { requestId?: unknown }).requestId ?? "")
    : null;
}

function toQuery(params: StudentAssistantContextParams) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === "string" && value.trim()) query.set(key, value);
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}
