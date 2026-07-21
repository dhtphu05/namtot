import { Link, useNavigate } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Dumbbell,
  FileText,
  Globe2,
  GraduationCap,
  HeartHandshake,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import { useMemo } from "react";
import {
  useAssistantNarrativeStream,
  useCriteriaCompletion,
  useCurrentApplication,
  useLatestPrecheck,
  useStartApplication,
  useStudentAssistantContext,
} from "@/features/application/hooks/useApplication";
import { useAuth } from "@/features/auth/store/auth-store";
import { useEvidences } from "@/features/evidence/hooks/useEvidence";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { useSmartUXTracking } from "@/hooks/useSmartUXTracking";
import {
  applyCriterionDisplayToUiState,
  getStudentCriterionDisplayState,
} from "@/features/application/presentation";
import { StudentAssistantSurface } from "@/features/application/components/StudentAssistantSurface";
import { buildDashboardAssistantFallback } from "@/features/application/components/student-assistant-fallback";
import {
  AppButton,
  EmptyState,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "@/features/student/components/primitives";
import {
  applyCompletionToCriteriaState,
  coreStudentCriteria,
  criterionLabels,
  getCriteriaUiState,
  getFeedbackUiItems,
} from "@/features/student/selectors/student-ui";
import { PRESENTATION_SEMANTICS_V2 } from "@/lib/presentation-semantics";
import { cn } from "@/lib/utils";
import type {
  ApplicationState,
  CriterionCompletionItem,
  Criterion,
  EvidenceResponse,
  PrecheckResult,
} from "@/lib/api/types";

const SCHOOL_YEAR = "2025-2026";

type ApplicationWithDashboardData = ApplicationState & {
  deadline?: string | null;
  submitDeadline?: string | null;
  dueDate?: string | null;
  summary?: {
    deadline?: string | null;
    totalEvidences?: number;
    evidenceByCriterion?: Partial<Record<Criterion, number>>;
  };
  evidences?: EvidenceResponse[];
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

type CriteriaState = ReturnType<typeof getCriteriaUiState>;
type FeedbackItem = ReturnType<typeof getFeedbackUiItems>[number];

const criterionIcons: Partial<Record<Criterion, LucideIcon>> = {
  ethics: ShieldCheck,
  academic: GraduationCap,
  physical: Dumbbell,
  volunteer: HeartHandshake,
  integration: Globe2,
};

export function StudentOverview() {
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);
  const current = useCurrentApplication(SCHOOL_YEAR);
  const application = current.data?.application as ApplicationWithDashboardData | null | undefined;
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
  const criteriaStates = useMemo(
    () =>
      application
        ? coreStudentCriteria.map((criterion) =>
            buildOverviewCriterionState({
              criterion,
              application,
              completion: criteriaCompletion.data?.items.find(
                (item) => item.criterion === criterion,
              ),
              evidences,
              precheck,
              feedbackItems,
            }),
          )
        : [],
    [application, criteriaCompletion.data?.items, evidences, precheck, feedbackItems],
  );
  const actionableFeedback = useMemo(
    () => feedbackItems.filter((item) => item.isActionable).slice(0, 2),
    [feedbackItems],
  );

  const isInitialLoading = current.isLoading;
  const isDashboardError = current.isError;

  const handleStart = () => {
    trackClick("student_start_application", {
      role: "student",
      page: "overview",
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
      page: "overview",
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

  if (isInitialLoading) {
    return (
      <>
        <PageHeader
          title={`Xin chào, ${firstName}`}
          description="Hoàn thiện hồ sơ Sinh viên 5 tốt của bạn theo từng bước đơn giản."
        />
        <OverviewSkeleton />
      </>
    );
  }

  if (isDashboardError) {
    return (
      <>
        <PageHeader
          title={`Xin chào, ${firstName}`}
          description="Hoàn thiện hồ sơ Sinh viên 5 tốt của bạn theo từng bước đơn giản."
        />
        <EmptyState
          variant="error"
          title="Chưa tải được tổng quan hồ sơ"
          description="Dữ liệu có thể đang mất kết nối tạm thời. Vui lòng thử lại."
          primaryAction={
            <AppButton onClick={() => current.refetch()} size="sm">
              Thử tải lại
            </AppButton>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Xin chào, ${firstName}`}
        description="Hoàn thiện hồ sơ Sinh viên 5 tốt của bạn theo từng bước đơn giản."
      />

      <div className="space-y-5 pb-6">
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
        />

        {application ? <CriteriaProgressCards criteriaStates={criteriaStates} /> : null}

        <LatestFeedbackCard feedbackItems={actionableFeedback} hasFeedbackRoute />
      </div>
    </>
  );
}

function CriteriaProgressCards({ criteriaStates }: { criteriaStates: CriteriaState[] }) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
        <h2 className="truncate text-base font-bold text-[var(--text-primary)]">
          Tiến độ 5 tiêu chí
        </h2>
        <AppButton asChild variant="ghost" size="sm">
          <Link to="/app/application">Mở hồ sơ</Link>
        </AppButton>
      </div>
      <div className="min-w-0 overflow-x-auto pb-1 [scrollbar-width:thin]">
        <div className="grid min-w-[760px] grid-cols-5 gap-3 md:min-w-0">
          {criteriaStates.map((state) => {
            const Icon = criterionIcons[state.key] ?? FileText;
            return (
              <Link
                key={state.key}
                to="/app/application"
                search={{ criterion: state.key }}
                data-smartux-tag="student_open_criterion"
                className="min-w-0 scroll-ml-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)] transition hover:border-[#91BCEB] hover:shadow-sm"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F1F7FD] text-[#0057C2]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <StatusBadge tone={state.tone} label={state.statusLabel} />
                </div>
                <h3 className="mt-3 truncate text-sm font-bold text-[var(--text-primary)]">
                  {state.label}
                </h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {state.evidenceCount} minh chứng
                </p>
                {state.warningCount > 0 ? (
                  <p className="mt-2 line-clamp-1 text-xs font-semibold text-amber-700">
                    {state.warningCount} cần xem
                  </p>
                ) : (
                  <p className="mt-2 line-clamp-1 text-xs text-slate-500">Đang theo dõi</p>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function LatestFeedbackCard({
  feedbackItems,
  hasFeedbackRoute,
}: {
  feedbackItems: FeedbackItem[];
  hasFeedbackRoute: boolean;
}) {
  return (
    <SectionCard
      title="Phản hồi mới nhất"
      footer={
        hasFeedbackRoute ? (
          <AppButton asChild variant="ghost" size="sm">
            <Link to="/app/feedback">Xem tất cả phản hồi</Link>
          </AppButton>
        ) : null
      }
      className="h-full"
    >
      {feedbackItems.length ? (
        <div className="space-y-3">
          {feedbackItems.map((item) => (
            <div key={item.id} className="min-w-0 rounded-2xl border border-slate-100 p-3">
              <div className="flex min-w-0 items-center gap-2">
                <MessageSquareText className="h-4 w-4 shrink-0 text-[#0057C2]" />
                <h3 className="truncate text-sm font-bold text-[var(--text-primary)]">
                  {item.title}
                </h3>
                {item.criterionKey ? (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                    {criterionLabels[item.criterionKey]}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-5 text-[var(--text-secondary)]">
                {item.message}
              </p>
              <div className="mt-3">
                <AppButton asChild size="sm" variant="secondary">
                  <Link
                    to={item.criterionKey ? "/app/application" : "/app/feedback"}
                    search={item.criterionKey ? { criterion: item.criterionKey } : undefined}
                  >
                    {item.criterionKey ? "Đi đến tiêu chí" : "Xem phản hồi"}
                  </Link>
                </AppButton>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
          Không có phản hồi cần xử lý.
        </p>
      )}
    </SectionCard>
  );
}

function buildOverviewCriterionState({
  application,
  completion,
  criterion,
  evidences,
  feedbackItems,
  precheck,
}: {
  application: ApplicationWithDashboardData;
  completion?: CriterionCompletionItem;
  criterion: Criterion;
  evidences: EvidenceResponse[];
  feedbackItems: FeedbackItem[];
  precheck: PrecheckResult | null;
}) {
  const base = applyCompletionToCriteriaState(
    getCriteriaUiState(criterion, evidences, precheck, feedbackItems),
    completion,
  );
  if (!PRESENTATION_SEMANTICS_V2) return base;
  const display = getStudentCriterionDisplayState({
    criterion,
    application,
    completion,
    reviewTask: application.reviewTasks?.find((item) => item.criterion === criterion),
    precheckAction: precheck?.criteriaResults?.find((item) => item.criterion === criterion)
      ?.nextAction,
  });
  return applyCriterionDisplayToUiState(base, display);
}

function OverviewSkeleton() {
  return (
    <div className="space-y-5 pb-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <SkeletonLine className="h-5 w-28" />
        <SkeletonLine className="mt-4 h-8 w-3/4" />
        <SkeletonLine className="mt-3 h-4 w-1/2" />
        <div className="mt-5 flex gap-2">
          <SkeletonLine className="h-10 w-36" />
          <SkeletonLine className="h-10 w-28" />
        </div>
      </div>
      <div className="grid min-w-0 gap-3 md:grid-cols-5">
        {coreStudentCriteria.map((criterion) => (
          <div key={criterion} className="rounded-2xl border border-slate-200 bg-white p-4">
            <SkeletonLine className="h-9 w-9 rounded-xl" />
            <SkeletonLine className="mt-4 h-4 w-24" />
            <SkeletonLine className="mt-2 h-4 w-16" />
          </div>
        ))}
      </div>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <SkeletonLine className="h-5 w-28" />
          <SkeletonLine className="mt-4 h-12 w-full" />
          <SkeletonLine className="mt-3 h-12 w-full" />
          <SkeletonLine className="mt-3 h-12 w-full" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <SkeletonLine className="h-5 w-32" />
          <SkeletonLine className="mt-4 h-20 w-full" />
          <SkeletonLine className="mt-3 h-20 w-full" />
        </div>
      </div>
    </div>
  );
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-full bg-slate-200", className)} />;
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

function getFirstName(fullName?: string | null) {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.at(-1) ?? "bạn";
}
