import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { applicationKeys } from "@/features/application/hooks/useApplication";
import { evidenceKeys } from "@/features/evidence/hooks/useEvidence";
import { officialEventLibraryKeys } from "@/features/event/hooks/useApprovedEvidenceSearch";
import { notificationKeys } from "@/features/notifications/hooks/useNotifications";
import {
  streamStudentAssistantAnswer,
  studentCommunicationAssistantApi,
  type StudentAssistantAnswer,
  type StudentAssistantContext,
  type StudentAssistantContextParams,
  type StudentAssistantMessage,
} from "../api/student-assistant";

export const studentAssistantKeys = {
  all: ["student-assistant"] as const,
  context: (params: StudentAssistantContextParams) =>
    [
      ...studentAssistantKeys.all,
      "context",
      {
        contextType: params.contextType,
        contextId: params.contextId ?? null,
        applicationId: params.applicationId ?? null,
        criterion: params.criterion ?? null,
        evidenceId: params.evidenceId ?? null,
        eventId: params.eventId ?? null,
        reviewTaskId: params.reviewTaskId ?? null,
        schoolYear: params.schoolYear ?? null,
      },
    ] as const,
};

export function useStudentAssistantContext(params: StudentAssistantContextParams, enabled = true) {
  return useQuery({
    queryKey: studentAssistantKeys.context(params),
    queryFn: async () => {
      const response = await studentCommunicationAssistantApi.getStudentAssistantContext(params);
      return response.data;
    },
    enabled,
    retry: false,
    staleTime: 15_000,
  });
}

export function useStudentAssistantConversation({
  context,
  params,
  enabled = true,
}: {
  context?: StudentAssistantContext | null;
  params: StudentAssistantContextParams;
  enabled?: boolean;
}) {
  const [messages, setMessages] = useState<StudentAssistantMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [streamText, setStreamText] = useState("");
  const [status, setStatus] = useState<"idle" | "connecting" | "streaming" | "complete" | "error">(
    "idle",
  );
  const [newMessagePending, setNewMessagePending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const chunksRef = useRef<string[]>([]);
  const timerRef = useRef<number | null>(null);
  const lastQuestionRef = useRef("");
  const lastTurnIdRef = useRef("");
  const conversationIdRef = useRef(createClientId("conversation"));

  const contextKey = context
    ? `${context.contextType}:${context.contextId}:${context.contextVersion}`
    : "";

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flushChunks = useCallback(() => {
    if (!chunksRef.current.length) return;
    const joined = chunksRef.current.join("");
    chunksRef.current = [];
    setStreamText((current) => current + joined);
  }, []);

  const enqueueChunk = useCallback(
    (chunk: string) => {
      chunksRef.current.push(chunk);
      if (timerRef.current !== null) return;
      timerRef.current = window.setInterval(() => {
        const next = chunksRef.current.shift();
        if (!next) {
          stopTimer();
          return;
        }
        setStreamText((current) => current + next);
      }, 35);
    },
    [stopTimer],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    chunksRef.current = [];
    stopTimer();
    setStatus("idle");
  }, [stopTimer]);

  useEffect(() => {
    stop();
    setMessages([]);
    setDraft("");
    setStreamText("");
    setNewMessagePending(false);
  }, [contextKey, stop]);

  const send = useCallback(
    async (rawMessage?: string) => {
      const message = (rawMessage ?? draft).trim();
      if (!context || !message || !enabled || status === "connecting" || status === "streaming") {
        return;
      }
      const recentMessages = messages.slice(-6);
      const retryingLastQuestion = Boolean(
        rawMessage && rawMessage === lastQuestionRef.current && lastTurnIdRef.current,
      );
      const turnId = retryingLastQuestion ? lastTurnIdRef.current : createClientId("turn");
      const attemptId = createClientId("attempt");
      lastQuestionRef.current = message;
      lastTurnIdRef.current = turnId;
      const userMessage: StudentAssistantMessage = { role: "user", content: message };
      setMessages((current) => [...current, userMessage]);
      setDraft("");
      setStreamText("");
      setStatus("connecting");
      setNewMessagePending(true);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const answer = await streamStudentAssistantAnswer({
          context: { ...params, contextVersion: context.contextVersion },
          message,
          recentMessages,
          clientConversationId: conversationIdRef.current,
          clientTurnId: turnId,
          clientAttemptId: attemptId,
          signal: controller.signal,
          handlers: {
            onDelta: (data) => {
              setStatus("streaming");
              enqueueChunk(data.text);
            },
            onComplete: (data) => {
              stopTimer();
              flushChunks();
              const text = data.finalText || data.answer || context.deterministicSummary;
              setStreamText(text);
              setMessages((current) => [...current, { role: "assistant", content: text }]);
              setStatus("complete");
            },
            onError: () => {
              stopTimer();
              chunksRef.current = [];
              setStreamText(context.deterministicSummary);
              setStatus("error");
            },
          },
        });
        if (!answer) return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        stopTimer();
        chunksRef.current = [];
        setStreamText(context.deterministicSummary);
        setStatus("error");
      } finally {
        abortRef.current = null;
      }
    },
    [context, draft, enabled, enqueueChunk, flushChunks, messages, params, status, stopTimer],
  );

  const retry = useCallback(() => {
    void send(lastQuestionRef.current);
  }, [send]);

  const displayAnswer = streamText || context?.deterministicSummary || "";
  const assistantMessages = useMemo<StudentAssistantMessage[]>(
    () =>
      status === "streaming" || status === "connecting" || status === "error"
        ? [...messages, { role: "assistant", content: displayAnswer }]
        : messages,
    [displayAnswer, messages, status],
  );

  return {
    messages: assistantMessages,
    draft,
    setDraft,
    send,
    stop,
    retry,
    status,
    isSending: status === "connecting" || status === "streaming",
    newMessagePending,
    setNewMessagePending,
    suggestedQuestions: messages.some((message) => message.role === "user")
      ? []
      : (context?.suggestedQuestions ?? []),
  };
}

export function useResubmitSupplement(applicationId?: string, reviewTaskId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contextVersion?: string) => {
      if (!reviewTaskId) throw new Error("Missing reviewTaskId");
      const response = await studentCommunicationAssistantApi.resubmitSupplement(
        reviewTaskId,
        contextVersion,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.assistantContext() });
      queryClient.invalidateQueries({ queryKey: studentAssistantKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      if (applicationId) {
        queryClient.invalidateQueries({ queryKey: evidenceKeys.list(applicationId) });
        queryClient.invalidateQueries({ queryKey: applicationKeys.latestPrecheck(applicationId) });
        queryClient.invalidateQueries({
          queryKey: applicationKeys.criteriaCompletion(applicationId),
        });
      }
      queryClient.invalidateQueries({ queryKey: officialEventLibraryKeys.all });
      toast.success("Đã gửi lại yêu cầu bổ sung.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Chưa thể gửi lại bổ sung.");
    },
  });
}

export type { StudentAssistantAnswer };

function createClientId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}
