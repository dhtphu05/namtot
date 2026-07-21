import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  useAssistantNarrativeStream,
  useCriteriaCompletion,
  useCurrentApplication,
  useLatestPrecheck,
  useStartApplication,
  useStudentAssistantContext,
} from "@/features/application/hooks/useApplication";
import { getStudentCriterionDisplayState } from "@/features/application/presentation";
import { StudentAssistantSurface } from "@/features/application/components/StudentAssistantSurface";
import { buildDashboardAssistantFallback } from "@/features/application/components/student-assistant-fallback";
import { useAuth } from "@/features/auth/store/auth-store";
import { useEvidences } from "@/features/evidence/hooks/useEvidence";
import type { Notification } from "@/features/notifications/api/notifications";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { useSmartUXTracking } from "@/hooks/useSmartUXTracking";
import type {
  ApplicationState,
  Criterion,
  CriterionCompletionItem,
  EvidenceResponse,
  PrecheckResult,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import {
  coreStudentCriteria,
  criterionLabels,
  getFeedbackUiItems,
} from "@/features/student/selectors/student-ui";
import {
  ButtonV2,
  CompactEmptyState,
  FiveCriteriaSpineV2,
  HairlineList,
  InlineStateMessage,
  mapStudentDisplayStatusToV2ProgressStatus,
  type FiveCriteriaSpineV2Item,
} from "./components";

const SCHOOL_YEAR = "2025-2026";

type ApplicationWithOverviewData = ApplicationState & {
  deadline?: string | null;
  submitDeadline?: string | null;
  dueDate?: string | null;
  summary?: {
    deadline?: string | null;
  };
  latestPrecheckResult?: PrecheckResult | null;
  reviewTasks?: Array<{
    criterion?: Criterion;
    status?: string | null;
    decision?: string | null;
    officerNote?: string | null;
    decisionReason?: string | null;
    supplementRequestJson?: {
      reason?: string;
      deadline?: string | null;
      requestedFields?: string[];
      [key: string]: unknown;
    } | null;
  }>;
};

type OverviewUpdate = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
};

export function StudentOverviewV2() {
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);
  const current = useCurrentApplication(SCHOOL_YEAR);
  const application = current.data?.application as ApplicationWithOverviewData | null | undefined;
  const applicationId = application?.id;
  const latestPrecheck = useLatestPrecheck(applicationId);
  const criteriaCompletion = useCriteriaCompletion(applicationId);
  const evidencesQuery = useEvidences(applicationId, { limit: 100 });
  const notifications = useNotifications({ page: 1, limit: 20 });
  const assistantContext = useStudentAssistantContext(SCHOOL_YEAR);
  const startApplication = useStartApplication();
  const { trackClick } = useSmartUXTracking();
  const narrative = useAssistantNarrativeStream({
    schoolYear: SCHOOL_YEAR,
    contextVersion: assistantContext.data?.contextVersion,
    fallbackText: assistantContext.data?.narrative.fallbackText,
    enabled: Boolean(
      assistantContext.data?.contextVersion && assistantContext.data.narrative.streamingAvailable,
    ),
  });

  const firstName = getFirstName(user?.fullName);
  const assistantDisplayContext = useMemo(
    () =>
      assistantContext.data ??
      (assistantContext.isError
        ? buildDashboardAssistantFallback({
            application,
            firstName,
            schoolYear: SCHOOL_YEAR,
          })
        : null),
    [application, assistantContext.data, assistantContext.isError, firstName],
  );
  const evidences = useMemo(() => normalizeEvidences(evidencesQuery.data), [evidencesQuery.data]);
  const feedbackItems = useMemo(() => getFeedbackUiItems(notifications.data), [notifications.data]);
  const precheck = (latestPrecheck.data ??
    application?.latestPrecheckResult ??
    null) as PrecheckResult | null;
  const completionItems = useMemo(
    () => criteriaCompletion.data?.items ?? [],
    [criteriaCompletion.data?.items],
  );

  const criteriaStates = useMemo(
    () =>
      coreStudentCriteria.map((criterion, index) =>
        buildSpineItem({
          application,
          completion: completionItems.find((item) => item.criterion === criterion),
          criterion,
          index,
          precheck,
        }),
      ),
    [application, completionItems, precheck],
  );
  const updates = useMemo(
    () => buildOverviewUpdates(notifications.data, feedbackItems, precheck),
    [notifications.data, feedbackItems, precheck],
  );

  const handleStart = () => {
    trackClick("student_start_application", {
      role: "student",
      page: "overview_v2",
      target_level: "school",
    });
    startApplication.mutate({
      schoolYear: SCHOOL_YEAR,
      targetLevel: "school",
      applicationType: "individual",
    });
  };

  const handleAssistantAction = () => {
    const action = assistantDisplayContext?.nextBestAction;
    if (!action) return;
    trackClick("assistant_primary_action_clicked", {
      role: "student",
      page: "overview_v2",
      action: action.type,
      status: action.reasonCode,
    });
    if (action.type === "start_application") {
      handleStart();
      return;
    }
    navigate({
      to: action.destination.route as never,
      search: (action.destination.query ?? {}) as never,
    });
  };

  if (current.isLoading) {
    return <StudentOverviewV2Skeleton firstName={firstName} />;
  }

  if (current.isError) {
    return (
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-0 py-5">
        <OverviewHeading firstName={firstName} />
        <InlineStateMessage
          tone="critical"
          title="Chưa tải được tổng quan hồ sơ"
          description="Dữ liệu có thể đang mất kết nối tạm thời. Vui lòng thử lại."
          action={
            <ButtonV2
              type="button"
              variant="tertiary"
              size="compact"
              onClick={() => current.refetch()}
            >
              Thử tải lại
            </ButtonV2>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-0 py-5">
      <OverviewHeading firstName={firstName} />

      <StudentAssistantSurface
        context={assistantDisplayContext}
        isError={assistantContext.isError}
        isLoading={assistantContext.isLoading}
        isStarting={startApplication.isPending}
        narrativeText={narrative.text}
        streamStatus={narrative.status}
        onPrimaryAction={handleAssistantAction}
        onRetryNarrative={narrative.retry}
        communicationParams={{
          contextType: "dashboard",
          applicationId,
          schoolYear: SCHOOL_YEAR,
        }}
        className="border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)]"
      />

      <FiveCriteriaSpineV2
        items={criteriaStates}
        onSelect={(key) =>
          navigate({
            to: "/app/application",
            search: { criterion: key as Criterion },
          })
        }
      />

      <section className="grid min-w-0 gap-6">
        <UpdateLedger updates={updates} />
      </section>
    </div>
  );
}

function OverviewHeading({ firstName }: { firstName: string }) {
  return (
    <header className="min-w-0">
      <h1 className="m-0 truncate text-[28px] font-bold leading-9 text-[var(--student-v2-text-primary)]">
        Xin chào, {firstName}
      </h1>
      <p className="mt-1 line-clamp-1 max-w-3xl text-[14px] leading-[22px] text-[var(--student-v2-text-secondary)]">
        Hoàn thiện hồ sơ Sinh viên 5 tốt theo đúng yêu cầu đang áp dụng tại đơn vị của bạn.
      </p>
    </header>
  );
}

function UpdateLedger({ updates }: { updates: OverviewUpdate[] }) {
  return (
    <section className="min-w-0">
      <SectionHeading title="Cập nhật hồ sơ" />
      <div className="mt-3 overflow-hidden rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)]">
        {updates.length ? (
          <HairlineList className="border-y-0">
            {updates.slice(0, 4).map((update) => (
              <div key={update.id} className="min-h-16 px-4 py-3">
                <div className="text-[12px] font-medium leading-[17px] text-[var(--student-v2-text-muted)]">
                  {update.timestamp}
                </div>
                <h3 className="mt-1 line-clamp-1 text-[14px] font-semibold leading-[22px] text-[var(--student-v2-text-primary)]">
                  {update.title}
                </h3>
                <p className="line-clamp-1 text-[13px] leading-[18px] text-[var(--student-v2-text-secondary)]">
                  {update.description}
                </p>
              </div>
            ))}
          </HairlineList>
        ) : (
          <CompactEmptyState
            title="Chưa có cập nhật mới"
            description="Các thay đổi về kiểm tra và phản hồi hồ sơ sẽ xuất hiện tại đây."
            className="min-h-28 border-0"
          />
        )}
      </div>
    </section>
  );
}

function StudentOverviewV2Skeleton({ firstName }: { firstName: string }) {
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-0 py-5" aria-busy="true">
      <OverviewHeading firstName={firstName} />
      <div className="min-h-[144px] rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] p-6">
        <SkeletonLine className="h-4 w-36" />
        <SkeletonLine className="mt-4 h-7 w-2/3" />
        <SkeletonLine className="mt-3 h-4 w-1/2" />
        <div className="mt-5 flex gap-2">
          <SkeletonLine className="h-10 w-36" />
          <SkeletonLine className="h-10 w-32" />
        </div>
      </div>
      <div className="min-h-[104px] rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)]" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(300px,1fr)]">
        <SkeletonPanel />
        <SkeletonPanel />
      </div>
    </div>
  );
}

function SkeletonPanel() {
  return (
    <div className="rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] p-4">
      <SkeletonLine className="h-5 w-36" />
      <SkeletonLine className="mt-5 h-16 w-full" />
      <SkeletonLine className="mt-3 h-16 w-full" />
    </div>
  );
}

function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-full bg-[var(--student-v2-surface-secondary)]",
        className,
      )}
    />
  );
}

function buildSpineItem({
  application,
  completion,
  criterion,
  index,
  precheck,
}: {
  application?: ApplicationWithOverviewData | null;
  completion?: CriterionCompletionItem;
  criterion: Criterion;
  index: number;
  precheck: PrecheckResult | null;
}): FiveCriteriaSpineV2Item {
  if (!application) {
    return {
      key: criterion,
      number: String(index + 1).padStart(2, "0"),
      title: criterionLabels[criterion],
      status: "not-started",
    };
  }

  const display = getStudentCriterionDisplayState({
    criterion,
    application,
    completion,
    reviewTask: application.reviewTasks?.find((item) => item.criterion === criterion),
    precheckAction: precheck?.criteriaResults?.find((item) => item.criterion === criterion)
      ?.nextAction,
  });

  return {
    key: criterion,
    number: String(index + 1).padStart(2, "0"),
    title: criterionLabels[criterion],
    status: mapStudentDisplayStatusToV2ProgressStatus(display),
  };
}

function buildOverviewUpdates(
  notifications: Notification[] | undefined,
  feedbackItems: ReturnType<typeof getFeedbackUiItems>,
  precheck: PrecheckResult | null,
): OverviewUpdate[] {
  const actionableIds = new Set(
    feedbackItems.filter((item) => item.isActionable).map((item) => item.id),
  );
  const notificationUpdates = (notifications ?? [])
    .filter((item) => !actionableIds.has(item.id))
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      title: item.title,
      description: item.message || "Có cập nhật mới về hồ sơ.",
      timestamp: formatTimestamp(item.createdAt),
    }));

  const precheckUpdate = precheck?.createdAt
    ? [
        {
          id: `precheck-${precheck.createdAt}`,
          title: "Đã ghi nhận lần kiểm tra sơ bộ",
          description: precheck.readyToSubmit
            ? "Hồ sơ đã sẵn sàng cho bước nộp chính thức."
            : "Hệ thống đã cập nhật kết quả kiểm tra gần nhất.",
          timestamp: formatTimestamp(precheck.createdAt),
        },
      ]
    : [];

  return [...precheckUpdate, ...notificationUpdates].slice(0, 4);
}

function normalizeEvidences(value: unknown): EvidenceResponse[] {
  if (Array.isArray(value)) return value as EvidenceResponse[];
  if (value && typeof value === "object") {
    const record = value as { evidences?: unknown; items?: unknown; data?: unknown };
    if (Array.isArray(record.evidences)) return record.evidences as EvidenceResponse[];
    if (Array.isArray(record.items)) return record.items as EvidenceResponse[];
    if (Array.isArray(record.data)) return record.data as EvidenceResponse[];
  }
  return [];
}

function formatTimestamp(value?: string | null) {
  if (!value) return "Chưa rõ thời gian";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getFirstName(fullName?: string | null) {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.at(-1) ?? "bạn";
}
