import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenText,
  Bot,
  LoaderCircle,
  MessageCircleQuestion,
  MessageSquareText,
  RefreshCw,
  Send,
  Square,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { STUDENT_ASSISTANT_UI_ENABLED } from "@/lib/student-assistant-ui";
import { cn } from "@/lib/utils";
import {
  useStudentAssistantContext,
  useStudentAssistantConversation,
} from "../hooks/useStudentAssistant";
import type {
  StudentAssistantAction,
  StudentAssistantContext,
  StudentAssistantContextParams,
  StudentAssistantMessage,
} from "../api/student-assistant";

type Props = {
  params: StudentAssistantContextParams;
  title?: string;
  compact?: boolean;
  className?: string;
  enabled?: boolean;
  onAction?: (action: StudentAssistantAction) => void;
};

export function StudentAssistantExplanation({
  className,
  compact,
  enabled = true,
  onAction,
  params,
  title = "Hỏi trợ lý",
}: Props) {
  const assistantEnabled = enabled && STUDENT_ASSISTANT_UI_ENABLED;
  const contextQuery = useStudentAssistantContext(params, assistantEnabled);
  const context = contextQuery.data ?? null;
  const conversation = useStudentAssistantConversation({
    context,
    params,
    enabled: assistantEnabled,
  });
  const reducedMotion = usePrefersReducedMotion();

  if (!STUDENT_ASSISTANT_UI_ENABLED) return null;

  return (
    <motion.section
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.2 }}
      className={cn("rounded-md border bg-background p-4", className)}
      aria-labelledby={`student-assistant-${params.contextType}-${params.contextId ?? "current"}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <MessageSquareText className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            id={`student-assistant-${params.contextType}-${params.contextId ?? "current"}`}
            className="text-sm font-semibold text-foreground"
          >
            {title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {contextQuery.isLoading
              ? "Đang chuẩn bị câu trả lời..."
              : context?.deterministicSummary ||
                "Trợ lý chỉ giải thích dữ liệu đang có trong hồ sơ của bạn."}
          </p>
        </div>
      </div>

      {context ? (
        <div className={cn("mt-4 space-y-3", compact && "space-y-2")}>
          <StudentAssistantActionCard context={context} onAction={onAction} />
          <StudentAssistantMessageList
            messages={conversation.messages}
            fallbackText={context.deterministicSummary}
            streaming={conversation.isSending}
          />
          <StudentAssistantSourceRefs context={context} />
          <StudentAssistantSuggestedQuestions
            questions={conversation.suggestedQuestions}
            onSelect={(question) => void conversation.send(question)}
          />
          <StudentAssistantComposer
            draft={conversation.draft}
            disabled={conversation.isSending}
            status={conversation.status}
            onChange={conversation.setDraft}
            onSend={() => void conversation.send()}
            onStop={conversation.stop}
            onRetry={conversation.retry}
          />
        </div>
      ) : contextQuery.isError ? (
        <p className="mt-3 text-sm text-amber-700">
          Chưa tải được trợ lý cho mục này. Bạn vẫn có thể tiếp tục thao tác chính.
        </p>
      ) : null}
    </motion.section>
  );
}

export function StudentAssistantActionCard({
  context,
  onAction,
}: {
  context: StudentAssistantContext;
  onAction?: (action: StudentAssistantAction) => void;
}) {
  const navigate = useNavigate();
  const action = context.primaryAction;
  if (!action) return null;

  const handleClick = () => {
    if (!action.allowed) return;
    if (onAction) {
      onAction(action);
      return;
    }
    void navigate({
      to: action.destination.route as never,
      search: (action.destination.query ?? {}) as never,
    });
  };

  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        <ArrowRight className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        Hành động được phép
      </div>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{action.label}</p>
          <p className="text-xs leading-5 text-muted-foreground">
            {action.allowed
              ? action.description || "Hành động này dựa trên trạng thái hồ sơ hiện tại."
              : action.disabledReason || "Chưa thể thực hiện hành động này."}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!action.allowed}
          onClick={handleClick}
          className="shrink-0"
        >
          Mở
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export function StudentAssistantMessageList({
  fallbackText,
  messages,
  streaming,
}: {
  fallbackText: string;
  messages: StudentAssistantMessage[];
  streaming?: boolean;
}) {
  const visibleMessages = messages.length
    ? messages
    : [{ role: "assistant" as const, content: fallbackText }];

  return (
    <div
      className="max-h-56 space-y-2 overflow-y-auto rounded-md border bg-muted/20 p-3"
      aria-live="polite"
    >
      {visibleMessages.map((message, index) => (
        <div
          key={`${message.role}-${index}`}
          className={cn(
            "flex max-w-[92%] items-start gap-2 text-sm leading-6",
            message.role === "user" && "ml-auto flex-row-reverse",
          )}
        >
          <span
            className={cn(
              "mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
              message.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary",
            )}
          >
            {message.role === "user" ? (
              <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Bot className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </span>
          <div
            className={cn(
              "min-w-0 rounded-md px-3 py-2",
              message.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground",
            )}
          >
            {message.content || (streaming ? "Đang chuẩn bị câu trả lời..." : "")}
          </div>
        </div>
      ))}
    </div>
  );
}

export function StudentAssistantSourceRefs({ context }: { context: StudentAssistantContext }) {
  const refs = context.facts.slice(0, 4);
  if (!refs.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {refs.map((fact) => (
        <span
          key={fact.id}
          className="inline-flex min-h-7 items-center gap-1.5 rounded-full border bg-background px-2.5 text-xs text-muted-foreground"
        >
          <BookOpenText className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          {fact.label}
        </span>
      ))}
    </div>
  );
}

export function StudentAssistantSuggestedQuestions({
  onSelect,
  questions,
}: {
  questions: string[];
  onSelect: (question: string) => void;
}) {
  if (!questions.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {questions.slice(0, 4).map((question) => (
        <button
          key={question}
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-background px-3 text-left text-xs font-medium text-muted-foreground transition hover:bg-muted"
          onClick={() => onSelect(question)}
        >
          <MessageCircleQuestion className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          {question}
        </button>
      ))}
    </div>
  );
}

export function StudentAssistantComposer({
  disabled,
  draft,
  onChange,
  onRetry,
  onSend,
  onStop,
  status,
}: {
  draft: string;
  disabled?: boolean;
  status: "idle" | "connecting" | "streaming" | "complete" | "error";
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onRetry: () => void;
}) {
  const canSend = draft.trim().length > 0 && !disabled;
  return (
    <div className="space-y-2">
      {status === "connecting" ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
          Đang chuẩn bị câu trả lời...
        </p>
      ) : null}
      <div className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Hỏi về mục này..."
          className="min-h-11 resize-none text-sm"
          rows={1}
          maxLength={600}
          disabled={disabled}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey) return;
            event.preventDefault();
            if (canSend) onSend();
          }}
        />
        {disabled ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="min-h-11 min-w-11"
            onClick={onStop}
          >
            <Square className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Dừng</span>
          </Button>
        ) : status === "error" ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="min-h-11 min-w-11"
            onClick={onRetry}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Thử lại</span>
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            className="min-h-11 min-w-11"
            disabled={!canSend}
            onClick={onSend}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Gửi</span>
          </Button>
        )}
      </div>
    </div>
  );
}
