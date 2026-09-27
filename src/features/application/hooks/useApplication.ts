import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { applicationApi } from "@/features/application/api/application";
import {
  streamCurrentAssistantNarrative,
  studentAssistantApi,
} from "@/features/application/api/student-assistant";
import type { Level, MetricInput, MetricType, VerificationStatus } from "@/lib/api/types";
import { notificationKeys } from "@/features/notifications/hooks/useNotifications";

export const applicationKeys = {
  all: ["applications"] as const,
  current: () => ["application", "current"] as const,
  assistantContext: (schoolYear?: string) =>
    ["application", "current", "assistant-context", schoolYear ?? ""] as const,
  timeline: (id: string) => ["application", id, "timeline"] as const,
  latestPrecheck: (id: string) => ["application", id, "precheck", "latest"] as const,
  criteriaCompletion: (id: string) => ["application", id, "criteria-completion"] as const,
  metrics: (id: string) => ["application", id, "metrics"] as const,
  cityEligibility: (id: string) => ["application", id, "city-eligibility"] as const,
  submissionDeadline: (id: string) => ["application", id, "submission-deadline"] as const,
};

export function useCurrentApplication(schoolYear?: string) {
  return useQuery({
    queryKey: [...applicationKeys.current(), { schoolYear }],
    queryFn: async () => {
      const res = await applicationApi.getCurrentApplication(schoolYear);
      return res.data;
    },
    retry: false,
  });
}

export function useCitySubmissionEligibility(applicationId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: applicationKeys.cityEligibility(applicationId ?? ""),
    queryFn: async () => {
      if (!applicationId) return null;
      const response = await applicationApi.getCitySubmissionEligibility(applicationId);
      return response.data;
    },
    enabled: Boolean(applicationId && enabled),
    retry: false,
    staleTime: 0,
  });
}

export function useStudentSubmissionDeadline(applicationId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: applicationKeys.submissionDeadline(applicationId ?? ""),
    queryFn: async () => {
      if (!applicationId) return null;
      const response = await applicationApi.getSubmissionDeadline(applicationId);
      return response.data;
    },
    enabled: Boolean(applicationId && enabled),
    retry: false,
    staleTime: 0,
  });
}

export function useStartApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      schoolYear?: string;
      applicationType?: "individual" | "collective";
      targetLevel?: Level;
    }) => {
      const res = await applicationApi.startCurrentApplication(data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.assistantContext() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (err: Error) => {
      toast.error(`Không thể tạo hồ sơ: ${err.message}`);
    },
  });
}

export function useUpdateTargetLevel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, targetLevel }: { id: string; targetLevel: Level }) => {
      const res = await applicationApi.updateTargetLevel(id, targetLevel);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.assistantContext() });
    },
  });
}

export function useSaveApplicationDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      draftData,
      draftPayload,
      step,
    }: {
      id: string;
      draftData?: Record<string, unknown>;
      draftPayload?: Record<string, unknown>;
      step?: string;
    }) => {
      const res = await applicationApi.saveDraft(id, {
        draftData: draftData ?? draftPayload ?? {},
        step,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.assistantContext() });
    },
  });
}

export const useSaveDraft = useSaveApplicationDraft;

export function useSubmitApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      allowSubmitWithWarnings,
      studentNote,
      successMessage,
    }: {
      id: string;
      allowSubmitWithWarnings?: boolean;
      studentNote?: string;
      successMessage?: string;
    }) => {
      const res = await applicationApi.submitApplication(id, {
        allowSubmitWithWarnings: !!allowSubmitWithWarnings,
        studentNote,
      });
      return res.data;
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationKeys.current() }),
        queryClient.invalidateQueries({ queryKey: applicationKeys.latestPrecheck(variables.id) }),
        queryClient.invalidateQueries({
          queryKey: applicationKeys.criteriaCompletion(variables.id),
        }),
        queryClient.invalidateQueries({ queryKey: applicationKeys.timeline(variables.id) }),
        queryClient.invalidateQueries({ queryKey: ["evidences", variables.id] }),
        queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
        queryClient.invalidateQueries({ queryKey: applicationKeys.assistantContext() }),
      ]);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: applicationKeys.current(), type: "active" }),
        queryClient.refetchQueries({ queryKey: ["evidences", variables.id], type: "active" }),
        queryClient.refetchQueries({ queryKey: notificationKeys.all, type: "active" }),
      ]);
      toast.success(
        variables.successMessage ?? "Đã nộp hồ sơ thành công. Hồ sơ đang chờ cán bộ xét duyệt.",
      );
    },
    onError: (err: Error) => {
      const code = "code" in err ? String(err.code) : "";
      if (code === "CITY_SUBMISSION_NOT_ELIGIBLE") {
        toast.error(
          "Hồ sơ hiện chưa đủ điều kiện nộp hồ sơ cấp Thành phố. Bạn vẫn có thể tiếp tục hoàn thiện hồ sơ và minh chứng.",
        );
        return;
      }
      if (code === "CITY_SUBMISSION_NEEDS_VERIFICATION") {
        toast.error(
          "Điều kiện nộp hồ sơ cấp Thành phố đang chờ cán bộ xác minh. Bạn vẫn có thể tiếp tục hoàn thiện hồ sơ.",
        );
        return;
      }
      if (code === "CITY_SUBMISSION_NOT_OPEN") {
        toast.error("Chưa đến thời gian tiếp nhận hồ sơ cấp Thành phố.");
        return;
      }
      if (code === "CITY_SUBMISSION_CLOSED") {
        toast.error("Đã hết thời hạn nộp hồ sơ cấp Thành phố.");
        return;
      }
      if (code === "CITY_SUBMISSION_WINDOW_NOT_CONFIGURED") {
        toast.error("Chưa cấu hình thời hạn nộp hồ sơ cấp Thành phố cho năm học này.");
        return;
      }
      toast.error(`Không thể nộp hồ sơ: ${err.message}`);
    },
  });
}

export function useLatestPrecheck(applicationId: string | undefined) {
  return useQuery({
    queryKey: applicationKeys.latestPrecheck(applicationId ?? ""),
    queryFn: async () => {
      if (!applicationId) return null;
      const res = await applicationApi.getLatestPrecheck(applicationId);
      return res.data;
    },
    enabled: !!applicationId,
  });
}

export function useCriteriaCompletion(applicationId: string | undefined) {
  return useQuery({
    queryKey: applicationKeys.criteriaCompletion(applicationId ?? ""),
    queryFn: async () => {
      if (!applicationId) return null;
      const res = await applicationApi.getCriteriaCompletion(applicationId);
      return res.data;
    },
    enabled: !!applicationId,
    retry: false,
  });
}

export function usePrecheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, level }: { id: string; level?: Level }) => {
      const res = await applicationApi.precheck(id, { level, runMode: "sync" });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.latestPrecheck(variables.id) });
      queryClient.invalidateQueries({ queryKey: applicationKeys.assistantContext() });
      queryClient.invalidateQueries({
        queryKey: applicationKeys.criteriaCompletion(variables.id),
      });
    },
  });
}

export function useStudentAssistantContext(schoolYear?: string) {
  return useQuery({
    queryKey: applicationKeys.assistantContext(schoolYear),
    queryFn: async () => {
      const res = await studentAssistantApi.getCurrentAssistantContext(schoolYear);
      return res.data;
    },
    retry: false,
    staleTime: 15_000,
  });
}

export function useAssistantNarrativeStream({
  contextVersion,
  enabled,
  fallbackText,
  schoolYear,
}: {
  schoolYear?: string;
  contextVersion?: string;
  fallbackText?: string;
  enabled: boolean;
}) {
  const [text, setText] = useState(fallbackText ?? "");
  const [status, setStatus] = useState<"idle" | "connecting" | "streaming" | "complete" | "error">(
    "idle",
  );
  const [attempt, setAttempt] = useState(0);
  const pendingChunksRef = useRef<string[]>([]);
  const timerRef = useRef<number | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const enqueueChunk = useCallback(
    (chunk: string) => {
      pendingChunksRef.current.push(chunk);
      if (timerRef.current !== null) return;
      timerRef.current = window.setInterval(() => {
        const next = pendingChunksRef.current.shift();
        if (!next) {
          stopTimer();
          return;
        }
        setText((current) => current + next);
      }, 35);
    },
    [stopTimer],
  );

  useEffect(() => {
    setText(fallbackText ?? "");
    pendingChunksRef.current = [];
    stopTimer();
    if (!enabled || !contextVersion) {
      setStatus("idle");
      return;
    }

    const controller = new AbortController();
    setStatus("connecting");
    void streamCurrentAssistantNarrative({
      schoolYear,
      contextVersion,
      signal: controller.signal,
      handlers: {
        onDelta: (data) => {
          setStatus("streaming");
          enqueueChunk(data.text);
        },
        onComplete: (data) => {
          stopTimer();
          pendingChunksRef.current = [];
          setText(data.finalText || data.text || fallbackText || "");
          setStatus("complete");
        },
        onError: () => {
          stopTimer();
          pendingChunksRef.current = [];
          setText(fallbackText ?? "");
          setStatus("error");
        },
      },
    }).catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      stopTimer();
      pendingChunksRef.current = [];
      setText(fallbackText ?? "");
      setStatus("error");
    });

    return () => {
      controller.abort();
      stopTimer();
    };
  }, [attempt, contextVersion, enabled, enqueueChunk, fallbackText, schoolYear, stopTimer]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);
  const abort = useCallback(() => {
    stopTimer();
    pendingChunksRef.current = [];
    setStatus("idle");
  }, [stopTimer]);

  return { text, status, retry, abort };
}

export function useApplicationTimeline(id: string | undefined) {
  return useQuery({
    queryKey: applicationKeys.timeline(id ?? ""),
    queryFn: async () => {
      if (!id) return [];
      const res = await applicationApi.getApplicationTimeline(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useApplicationMetrics(id: string | undefined) {
  return useQuery({
    queryKey: applicationKeys.metrics(id ?? ""),
    queryFn: async () => {
      if (!id) return [];
      const res = await applicationApi.getMetrics(id);
      return res.data || [];
    },
    enabled: !!id,
  });
}

export function useUpsertMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      metricType,
      value,
      scale,
    }: {
      id: string;
      metricType: MetricType;
      value: number;
      scale?: number | string;
    }) => {
      const res = await applicationApi.createApplicationMetric(id, {
        criterion: metricType === "gpa" ? "academic" : "ethics",
        metricType: metricType as MetricInput["metricType"],
        valueNumber: value,
        unit: typeof scale === "string" ? scale : undefined,
        source: "student_input",
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.metrics(variables.id) });
      queryClient.invalidateQueries({ queryKey: applicationKeys.assistantContext() });
      queryClient.invalidateQueries({
        queryKey: applicationKeys.criteriaCompletion(variables.id),
      });
    },
  });
}

export function useDeclareEthicsConductScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      value,
      scale,
      schoolYear,
    }: {
      id: string;
      value: number;
      scale?: number;
      schoolYear?: string;
    }) => {
      const res = await applicationApi.declareEthicsConductScore(id, {
        value,
        scale,
        schoolYear,
        sourceType: "manual_metric",
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.metrics(variables.id) });
      queryClient.invalidateQueries({ queryKey: applicationKeys.assistantContext() });
      queryClient.invalidateQueries({
        queryKey: applicationKeys.criteriaCompletion(variables.id),
      });
    },
  });
}

export function useDeclareAcademicGpa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      value,
      scale,
      schoolYear,
    }: {
      id: string;
      value: number;
      scale: 4 | 10;
      schoolYear: string;
    }) => {
      const res = await applicationApi.declareAcademicGpa(id, {
        value,
        scale,
        schoolYear,
        sourceType: "manual_metric",
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.metrics(variables.id) });
      queryClient.invalidateQueries({ queryKey: applicationKeys.assistantContext() });
      queryClient.invalidateQueries({
        queryKey: applicationKeys.criteriaCompletion(variables.id),
      });
    },
  });
}

export function useDeclarePhysicalCourseResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      resultType,
      value,
      classification,
      schoolYear,
      replaceExisting,
    }: {
      id: string;
      resultType: "score" | "classification";
      value?: number;
      classification?: string;
      schoolYear: string;
      replaceExisting?: boolean;
    }) => {
      const res = await applicationApi.declarePhysicalCourseResult(id, {
        resultType,
        value,
        classification,
        schoolYear,
        sourceType: "manual_metric",
        replaceExisting,
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.metrics(variables.id) });
      queryClient.invalidateQueries({ queryKey: applicationKeys.assistantContext() });
      queryClient.invalidateQueries({
        queryKey: applicationKeys.criteriaCompletion(variables.id),
      });
    },
  });
}

export function useAddPhysicalPathEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      requirementKey,
      evidenceId,
      payloadJson,
      replaceExisting,
    }: {
      id: string;
      requirementKey:
        | "healthy_student_title"
        | "sports_activity_or_award"
        | "sports_team_member"
        | "regular_sports_training";
      evidenceId: string;
      payloadJson?: Record<string, unknown>;
      replaceExisting?: boolean;
    }) => {
      const res = await applicationApi.addPhysicalPathEvidence(id, {
        requirementKey,
        evidenceId,
        payloadJson,
        replaceExisting,
        sourceType: "manual_evidence",
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      queryClient.invalidateQueries({ queryKey: ["evidences", variables.id] });
      queryClient.invalidateQueries({ queryKey: applicationKeys.assistantContext() });
      queryClient.invalidateQueries({
        queryKey: applicationKeys.criteriaCompletion(variables.id),
      });
    },
  });
}

export function useAddVolunteerActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      requirementKey,
      activityType,
      activityName,
      organizer,
      organizerLevel,
      startDate,
      endDate,
      declaredValue,
      declaredUnit,
      evidenceId,
    }: {
      id: string;
      requirementKey: "accumulated_volunteer_days" | "activity_count";
      activityType: string;
      activityName: string;
      organizer?: string;
      organizerLevel?: string;
      startDate?: string;
      endDate?: string;
      declaredValue?: number;
      declaredUnit?: "day" | "session" | "event" | "donation";
      evidenceId?: string;
    }) => {
      const res = await applicationApi.addVolunteerActivity(id, {
        requirementKey,
        activityType,
        activityName,
        organizer,
        organizerLevel,
        startDate,
        endDate,
        declaredValue,
        declaredUnit: declaredUnit ?? "day",
        evidenceId,
        sourceType: "manual_evidence",
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      queryClient.invalidateQueries({ queryKey: ["evidences", variables.id] });
      queryClient.invalidateQueries({ queryKey: applicationKeys.assistantContext() });
      queryClient.invalidateQueries({
        queryKey: applicationKeys.criteriaCompletion(variables.id),
      });
    },
  });
}

export function useAddIntegrationPathResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      requirementKey,
      evidenceId,
      payloadJson,
    }: {
      id: string;
      requirementKey: string;
      evidenceId?: string;
      payloadJson?: Record<string, unknown>;
    }) => {
      const res = await applicationApi.addIntegrationPathResponse(id, {
        requirementKey,
        evidenceId,
        payloadJson,
        sourceType: "manual_evidence",
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      queryClient.invalidateQueries({ queryKey: ["evidences", variables.id] });
      queryClient.invalidateQueries({ queryKey: applicationKeys.assistantContext() });
      queryClient.invalidateQueries({
        queryKey: applicationKeys.criteriaCompletion(variables.id),
      });
    },
  });
}

export function useCreateMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ applicationId, data }: { applicationId: string; data: MetricInput }) => {
      const res = await applicationApi.createApplicationMetric(applicationId, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.metrics(variables.applicationId) });
      queryClient.invalidateQueries({ queryKey: applicationKeys.assistantContext() });
      queryClient.invalidateQueries({
        queryKey: applicationKeys.criteriaCompletion(variables.applicationId),
      });
      toast.success("Đã lưu chỉ số thành công!");
    },
    onError: (err: Error) => {
      toast.error(`Lỗi lưu chỉ số: ${err.message}`);
    },
  });
}

export function useUpdateMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      metricId,
      applicationId,
      value,
      scale,
      verificationStatus,
      data,
    }: {
      metricId: string;
      applicationId?: string;
      value?: number;
      scale?: number | string;
      verificationStatus?: VerificationStatus;
      data?: Partial<MetricInput>;
    }) => {
      const res = await applicationApi.updateMetric(
        metricId,
        data ?? { value, scale, verificationStatus },
      );
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.assistantContext() });
      if (variables.applicationId) {
        queryClient.invalidateQueries({
          queryKey: applicationKeys.metrics(variables.applicationId),
        });
        queryClient.invalidateQueries({
          queryKey: applicationKeys.criteriaCompletion(variables.applicationId),
        });
      }
      toast.success("Đã cập nhật chỉ số thành công!");
    },
    onError: (err: Error) => {
      toast.error(`Lỗi cập nhật chỉ số: ${err.message}`);
    },
  });
}
