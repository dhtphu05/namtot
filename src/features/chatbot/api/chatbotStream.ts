import { useAuth } from "@/features/auth/store/auth-store";
import { API_BASE_URL } from "@/lib/api/client";
import type { ChatbotMessageRequest, ChatbotResponse, SmartbotAction, SmartbotMessageCard } from "../types";

export type ChatbotStreamHandlers = {
  onMeta?: (data: { sessionId: string; mode: "stream" }) => void;
  onDelta?: (data: { text: string }) => void;
  onCard?: (data: {
    messages: SmartbotMessageCard[];
    cards: SmartbotMessageCard[];
    actions: SmartbotAction[];
  }) => void;
  onFinal?: (data: ChatbotResponse) => void;
  onError?: (data: { message: string }) => void;
};

type ParsedSseEvent = {
  event: string;
  data: unknown;
};

export async function streamChatbotMessage(
  payload: ChatbotMessageRequest,
  handlers: ChatbotStreamHandlers,
): Promise<ChatbotResponse> {
  const headers = new Headers({
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  });
  const token = useAuth.getState().accessToken;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}/api/chatbot/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    throw new Error("Không thể mở luồng trả lời Smartbot.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResponse: ChatbotResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseBuffer(buffer);
    buffer = parsed.remainder;
    for (const event of parsed.events) {
      finalResponse = dispatchStreamEvent(event, handlers) ?? finalResponse;
    }
  }

  const tail = parseSseBuffer(buffer, true);
  for (const event of tail.events) {
    finalResponse = dispatchStreamEvent(event, handlers) ?? finalResponse;
  }

  if (!finalResponse) {
    throw new Error("Luồng Smartbot kết thúc nhưng chưa có phản hồi hoàn chỉnh.");
  }
  return finalResponse;
}

export function parseSseBuffer(input: string, flush = false): {
  events: ParsedSseEvent[];
  remainder: string;
} {
  const frames = input.split(/\r?\n\r?\n/);
  const remainder = flush ? "" : (frames.pop() ?? "");
  const events = frames.map(parseSseFrame).filter((event): event is ParsedSseEvent => Boolean(event));
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

function dispatchStreamEvent(
  event: ParsedSseEvent,
  handlers: ChatbotStreamHandlers,
): ChatbotResponse | null {
  if (event.event === "meta") {
    handlers.onMeta?.(event.data as { sessionId: string; mode: "stream" });
    return null;
  }
  if (event.event === "delta") {
    handlers.onDelta?.(event.data as { text: string });
    return null;
  }
  if (event.event === "card") {
    handlers.onCard?.(
      event.data as {
        messages: SmartbotMessageCard[];
        cards: SmartbotMessageCard[];
        actions: SmartbotAction[];
      },
    );
    return null;
  }
  if (event.event === "error") {
    handlers.onError?.(event.data as { message: string });
    throw new Error((event.data as { message?: string }).message ?? "Luồng Smartbot bị gián đoạn.");
  }
  if (event.event === "final") {
    const finalResponse = event.data as ChatbotResponse;
    handlers.onFinal?.(finalResponse);
    return finalResponse;
  }
  return null;
}
