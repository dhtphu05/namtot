import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { Bot, Send, User } from "lucide-react";
import { Button, Card } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import { useSmartUXTracking } from "@/hooks/useSmartUXTracking";
import { chatbotApi } from "../api/chatbot";
import { streamChatbotMessage } from "../api/chatbotStream";
import type {
  ChatbotContextScope,
  ChatbotPageContext,
  ChatbotResponse,
  SmartbotAction,
  SmartbotMessageCard,
} from "../types";
import { SmartbotActionButton } from "./SmartbotActionButton";
import { SmartbotCardRenderer } from "./SmartbotCardRenderer";

type ChatMessage =
  | { id: string; from: "user"; text: string }
  | {
      id: string;
      from: "bot";
      text: string;
      cards: SmartbotMessageCard[];
      response?: ChatbotResponse;
    };

type Props = {
  title?: string;
  subtitle?: string;
  contextScope?: ChatbotContextScope;
  pageContext?: ChatbotPageContext;
  applicationId?: string;
  compact?: boolean;
  quickPrompts?: string[];
  defaultPrompts?: string[];
  initialPrompt?: string;
};

const defaultSuggestions = [
  "Hồ sơ em còn thiếu gì?",
  "Minh chứng tình nguyện như thế nào là hợp lệ?",
  "Hạn bổ sung minh chứng là khi nào?",
  "Em cần cán bộ hỗ trợ",
];
const streamingPlaceholder = "Đang kiểm tra...";

export function SmartbotPanel({
  title = "Trợ lý SV5T · Cấp Trường",
  subtitle = "VNPT Smartbot hỗ trợ theo ngữ cảnh quy trình. Cán bộ/Hội đồng xác nhận kết quả chính thức.",
  contextScope,
  pageContext,
  applicationId,
  compact = false,
  quickPrompts,
  defaultPrompts: providedDefaultPrompts,
  initialPrompt = "Mình có thể hỗ trợ tiêu chí, minh chứng, trạng thái hồ sơ và bước tiếp theo trong quy trình 5TOT.",
}: Props) {
  const location = useLocation();
  const inferredPageContext = useMemo(
    () => pageContext ?? inferPageContext(location.pathname),
    [location.pathname, pageContext],
  );
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "m-0", from: "bot", text: initialPrompt, cards: [] },
  ]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const composerId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { trackAction, trackClick } = useSmartUXTracking();
  const suggestions = quickPrompts ?? providedDefaultPrompts ?? defaultSuggestions;
  const hasConversationStarted = messages.some((message) => message.from === "user");
  const smartUXRole = contextScope === "reviewer_copilot" ? "officer" : "student";
  const smartUXOpenTag =
    contextScope === "reviewer_copilot" ? "officer_use_ai_draft" : "student_open_chatbot";
  const smartUXQuestionEvent =
    contextScope === "reviewer_copilot" ? "officer_use_ai_draft" : "student_send_chatbot_question";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending, isStreaming]);

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || isSending || isStreaming) return;

    setInput("");
    setError(null);
    setIsSending(true);
    setIsStreaming(true);
    trackAction(smartUXQuestionEvent, {
      role: smartUXRole,
      page: inferredPageContext.page,
    });
    const userMessageId = `u-${Date.now()}`;
    const botMessageId = `b-${Date.now()}`;
    const payload = {
      text: clean,
      sessionId,
      applicationId,
      contextScope,
      pageContext: inferredPageContext,
    };
    setMessages((current) => [
      ...current,
      { id: userMessageId, from: "user", text: clean },
      { id: botMessageId, from: "bot", text: streamingPlaceholder, cards: [] },
    ]);
    let hasReceivedStreamEvent = false;
    let streamProducedContent = false;
    let streamCompleted = false;

    try {
      await streamChatbotMessage(payload, {
        onMeta: (data) => {
          hasReceivedStreamEvent = true;
          setSessionId(data.sessionId);
        },
        onDelta: (data) => {
          hasReceivedStreamEvent = true;
          streamProducedContent = true;
          updateBotMessage(botMessageId, (message) => ({
            ...message,
            text: appendDelta(message.text, data.text),
          }));
        },
        onCard: (data) => {
          hasReceivedStreamEvent = true;
          streamProducedContent = true;
          updateBotMessage(botMessageId, (message) => ({
            ...message,
            cards: data.messages,
          }));
        },
        onFinal: (data) => {
          hasReceivedStreamEvent = true;
          streamProducedContent = true;
          streamCompleted = true;
          setSessionId(data.sessionId);
          updateBotMessage(botMessageId, (message) => ({
            ...message,
            text: data.answer,
            cards: data.messages,
            response: data,
          }));
        },
        onError: () => {
          hasReceivedStreamEvent = true;
        },
      });
    } catch (err) {
      if (hasReceivedStreamEvent || streamProducedContent) {
        if (!streamCompleted) {
          setError(err instanceof Error ? err.message : "Luồng trả lời bị gián đoạn.");
        }
        return;
      }
      try {
        const response = await chatbotApi.sendMessage(payload);
        setSessionId(response.data.sessionId);
        updateBotMessage(botMessageId, () => ({
          id: botMessageId,
          from: "bot",
          text: response.data.answer,
          cards: response.data.messages,
          response: response.data,
        }));
      } catch (fallbackErr) {
        setError(
          fallbackErr instanceof Error ? fallbackErr.message : "Không thể gửi câu hỏi tới trợ lý.",
        );
        updateBotMessage(botMessageId, (message) => ({
          ...message,
          text: "Mình chưa thể kết nối trợ lý hội thoại ngay lúc này.",
        }));
      }
    } finally {
      setIsSending(false);
      setIsStreaming(false);
    }
  };

  const updateBotMessage = (
    messageId: string,
    updater: (
      message: Extract<ChatMessage, { from: "bot" }>,
    ) => Extract<ChatMessage, { from: "bot" }>,
  ) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId && message.from === "bot" ? updater(message) : message,
      ),
    );
  };

  const handlePostback = (payload: string, label: string) => {
    void send(payload.startsWith("fivetot://action/") ? label : payload);
  };

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col",
        compact ? "h-full" : "h-[calc(100vh-128px)] max-h-[calc(100vh-128px)]",
      )}
    >
      <Card
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden !p-0 !shadow-none",
          compact ? "h-full min-h-[520px]" : "h-full",
        )}
      >
        {!compact ? (
          <header className="shrink-0 border-b border-[var(--student-v2-divider)] bg-[var(--student-v2-surface-primary)] px-5 py-4">
            <h1 className="text-[24px] font-semibold leading-tight text-[var(--student-v2-text-primary)]">
              {title}
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--student-v2-text-secondary)]">
              {subtitle}
            </p>
          </header>
        ) : null}

        <div
          ref={scrollRef}
          role="log"
          aria-live={isStreaming ? "off" : "polite"}
          aria-relevant="additions"
          className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5"
        >
          {messages.map((message) => {
            const renderableCards =
              message.from === "bot" ? getRenderableCards(message.cards, message.text) : [];
            const visibleActions =
              message.from === "bot" && message.response
                ? getNonCardActions(message.response.actions, renderableCards)
                : [];
            return (
              <div
                key={message.id}
                className={cn("flex max-w-full gap-3", message.from === "user" && "justify-end")}
              >
                {message.from === "bot" && <Avatar icon={<Bot className="h-4 w-4" />} />}
                <div
                  className={cn(
                    "max-w-[min(100%,760px)] space-y-3",
                    message.from === "user" && "items-end",
                  )}
                >
                  <div
                    className={cn(
                      "rounded-lg px-4 py-3 text-sm leading-6",
                      message.from === "user"
                        ? "bg-[var(--student-v2-primary-action-blue)] text-[var(--student-v2-text-inverse)]"
                        : "bg-[var(--student-v2-surface-selected)] text-[var(--student-v2-text-primary)]",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.text}</p>
                  </div>
                  {message.from === "bot" && renderableCards.length > 0 && (
                    <div className="space-y-3 rounded-lg border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] p-3">
                      {renderableCards.map((card, index) => (
                        <SmartbotCardRenderer
                          key={`${card.type}-${index}`}
                          card={card}
                          onPostback={handlePostback}
                        />
                      ))}
                    </div>
                  )}
                  {message.from === "bot" && visibleActions.length ? (
                    <div className="flex max-w-full flex-wrap gap-2">
                      {visibleActions.map((action) => (
                        <SmartbotActionButton
                          key={action.id}
                          action={action}
                          onPostback={handlePostback}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
                {message.from === "user" && <Avatar icon={<User className="h-4 w-4" />} />}
              </div>
            );
          })}
          {isStreaming && (
            <div className="flex gap-3" aria-live="polite">
              <Avatar icon={<Bot className="h-4 w-4" />} />
              <div className="rounded-lg bg-[var(--student-v2-surface-selected)] px-4 py-3 text-sm text-[var(--student-v2-text-muted)]">
                Đang trả lời...
              </div>
            </div>
          )}
        </div>

        <form
          className="sticky bottom-0 z-10 shrink-0 border-t border-[var(--student-v2-divider)] bg-[var(--student-v2-surface-primary)] p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
        >
          {error && (
            <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
          {!hasConversationStarted ? (
            <div
              className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible"
              data-assistant-quick-suggestions="mobile-scroll"
            >
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    trackClick(smartUXOpenTag, {
                      role: smartUXRole,
                      page: inferredPageContext.page,
                    });
                    void send(suggestion);
                  }}
                  className="chip min-h-11 shrink-0 hover:bg-[var(--student-v2-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--student-v2-focus-ring)]"
                  data-smartux-tag={smartUXOpenTag}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex gap-2">
            <label htmlFor={composerId} className="sr-only">
              Nhập câu hỏi cho trợ lý
            </label>
            <input
              id={composerId}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={isSending || isStreaming}
              placeholder="Hỏi về hồ sơ cấp Trường, minh chứng hoặc bước tiếp theo..."
              className="min-h-11 min-w-0 flex-1 rounded-lg bg-[var(--student-v2-surface-secondary)] px-4 py-3 text-sm text-[var(--student-v2-text-primary)] outline-none ring-[var(--student-v2-focus-ring)] focus:ring-2"
            />
            <Button
              type="submit"
              disabled={isSending || isStreaming}
              className="min-h-11 min-w-11"
              data-smartux-tag={smartUXQuestionEvent}
            >
              <Send className="h-4 w-4" /> Gửi
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}

function appendDelta(current: string, delta: string): string {
  if (!delta) return current;
  if (current === streamingPlaceholder) return delta;
  const needsLineBreak = current.endsWith("...") || delta.startsWith("Đã ");
  return `${current}${needsLineBreak ? "\n" : ""}${delta}`;
}

function getNonCardActions(
  actions: SmartbotAction[],
  cards: SmartbotMessageCard[],
): SmartbotAction[] {
  const cardActionKeys = new Set(cards.flatMap(collectCardActionKeys));
  return actions.filter((action) => !cardActionKeys.has(actionKey(action)));
}

function getRenderableCards(cards: SmartbotMessageCard[], answer: string): SmartbotMessageCard[] {
  return cards.filter((card) => !isDuplicateTextCard(card, answer));
}

function isDuplicateTextCard(card: SmartbotMessageCard, answer: string): boolean {
  if (card.type !== "text" || card.buttons?.length || card.items?.length) return false;
  const cardText = normalizeDisplayText(card.text ?? card.title ?? "");
  return Boolean(cardText) && cardText === normalizeDisplayText(answer);
}

function normalizeDisplayText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function collectCardActionKeys(card: SmartbotMessageCard): string[] {
  return [
    ...(card.buttons ?? []).map(actionKey),
    ...(card.items ?? []).flatMap(collectCardActionKeys),
  ];
}

function actionKey(action: SmartbotAction): string {
  return [action.type, action.route ?? "", action.payload ?? "", action.label].join("|");
}

function Avatar({ icon }: { icon: React.ReactNode }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--student-v2-primary-action-blue)] text-[var(--student-v2-text-inverse)]">
      {icon}
    </div>
  );
}

function inferPageContext(pathname: string): ChatbotPageContext {
  if (pathname.includes("evidence")) return { page: "evidence" };
  if (pathname.includes("ai-precheck")) return { page: "precheck" };
  if (pathname.includes("event-library")) return { page: "matching_hub" };
  if (pathname.includes("chatbot")) return { page: "chatbot" };
  if (pathname.includes("cascade")) return { page: "cascade" };
  if (pathname.includes("review")) return { page: "review_task" };
  if (pathname.includes("resolution")) return { page: "resolution_hub" };
  if (pathname.includes("manager") || pathname.includes("analytics"))
    return { page: "manager_dashboard" };
  return { page: "dashboard" };
}
