import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, MessageSquareText, RefreshCw, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
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
  const contextQuery = useStudentAssistantContext(params, enabled);
  const context = contextQuery.data ?? null;
  const conversation = useStudentAssistantConversation({ context, params, enabled });
  const reducedMotion = usePrefersReducedMotion();

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
      <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
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
            "rounded-md px-3 py-2 text-sm leading-6",
            message.role === "user"
              ? "ml-auto max-w-[86%] bg-primary text-primary-foreground"
              : "mr-auto max-w-[92%] bg-background text-foreground",
          )}
        >
          {message.content || (streaming ? "Đang chuẩn bị câu trả lời..." : "")}
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
          className="inline-flex min-h-7 items-center rounded-full border bg-background px-2.5 text-xs text-muted-foreground"
        >
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
          className="min-h-11 rounded-full border bg-background px-3 text-left text-xs font-medium text-muted-foreground transition hover:bg-muted"
          onClick={() => onSelect(question)}
        >
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
        <p className="text-xs text-muted-foreground">Đang chuẩn bị câu trả lời...</p>
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
