import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Dumbbell,
  FileText,
  Globe2,
  GraduationCap,
  HeartHandshake,
  Loader2,
  MessageSquareText,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useMemo } from "react";
import {
  useCurrentApplication,
  useLatestPrecheck,
  useStartApplication,
} from "@/features/application/hooks/useApplication";
import { useAuth } from "@/features/auth/store/auth-store";
import { useEvidences } from "@/features/evidence/hooks/useEvidence";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { useSmartUXTracking } from "@/hooks/useSmartUXTracking";
import {
  AppButton,
  EmptyState,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "@/features/student/components/primitives";
import {
  coreStudentCriteria,
  criterionLabels,
  getCriteriaUiState,
  getFeedbackUiItems,
  getNextActions,
  getStudentApplicationSummary,
} from "@/features/student/selectors/student-ui";
import { cn } from "@/lib/utils";
import type {
  ApplicationState,
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
};

type CriteriaState = ReturnType<typeof getCriteriaUiState>;
type FeedbackItem = ReturnType<typeof getFeedbackUiItems>[number];
type NextAction = ReturnType<typeof getNextActions>[number];

const criterionIcons: Partial<Record<Criterion, LucideIcon>> = {
  ethics: ShieldCheck,
  academic: GraduationCap,
  physical: Dumbbell,
  volunteer: HeartHandshake,
  integration: Globe2,
};

export function StudentOverview() {
  const user = useAuth((state) => state.user);
  const current = useCurrentApplication(SCHOOL_YEAR);
  const application = current.data?.application as ApplicationWithDashboardData | null | undefined;
  const applicationId = application?.id;
  const latestPrecheck = useLatestPrecheck(applicationId);
  const evidencesQuery = useEvidences(applicationId, { limit: 100 });
  const notifications = useNotifications({ page: 1, limit: 20 });
  const startApplication = useStartApplication();
  const { trackClick } = useSmartUXTracking();

  const firstName = getFirstName(user?.fullName);
  const evidences = useMemo(() => normalizeEvidences(evidencesQuery.data), [evidencesQuery.data]);
  const feedbackItems = useMemo(() => getFeedbackUiItems(notifications.data), [notifications.data]);
  const precheck = (latestPrecheck.data ??
    application?.latestPrecheckResult ??
    null) as PrecheckResult | null;
  const applicationForSummary = useMemo(
    () => (application ? { ...application, evidences } : null),
    [application, evidences],
  );
  const summary = getStudentApplicationSummary(
    applicationForSummary,
    precheck,
    null,
    feedbackItems,
  );
  const criteriaStates = useMemo(
    () =>
      application
        ? coreStudentCriteria.map((criterion) =>
            getCriteriaUiState(criterion, evidences, precheck, feedbackItems),
          )
        : [],
    [application, evidences, precheck, feedbackItems],
  );
  const nextActions = useMemo(
    () => getNextActions(applicationForSummary, criteriaStates, feedbackItems, precheck),
    [applicationForSummary, criteriaStates, feedbackItems, precheck],
  );
  const actionableFeedback = useMemo(
    () => feedbackItems.filter((item) => item.isActionable).slice(0, 2),
    [feedbackItems],
  );

  const isInitialLoading = current.isLoading;
  const isDashboardError = current.isError;

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
        <ApplicationHeroCard
          applicationId={application?.id}
          applicationStatus={application?.status}
          hasApplication={Boolean(application)}
          isStarting={startApplication.isPending}
          nextActions={nextActions.map((action) => action.title)}
          onStart={() => {
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
          }}
          summary={summary}
        />

        {application ? <CriteriaProgressCards criteriaStates={criteriaStates} /> : null}

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <NextActionsCard actions={nextActions} />
          <LatestFeedbackCard feedbackItems={actionableFeedback} hasFeedbackRoute />
        </div>

        <CompactHelpCard
          applicationId={application?.id}
          applicationStatus={application?.status}
          nextActions={nextActions.map((action) => action.title)}
        />
      </div>
    </>
  );
}

function ApplicationHeroCard({
  applicationId,
  applicationStatus,
  hasApplication,
  isStarting,
  nextActions,
  onStart,
  summary,
}: {
  applicationId?: string;
  applicationStatus?: string;
  hasApplication: boolean;
  isStarting: boolean;
  nextActions: string[];
  onStart: () => void;
  summary: ReturnType<typeof getStudentApplicationSummary>;
}) {
  const assistantSearch = buildAssistantSearch({
    applicationId,
    nextActions,
    source: "overview",
    status: applicationStatus ?? summary.statusBadge.label,
  });

  return (
    <SectionCard className="overflow-hidden border-[#BBD7F3] bg-[#F8FBFE] p-0">
      <div className="grid min-w-0 gap-5 p-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-center md:p-6">
        <div className="min-w-0">
          <StatusBadge tone={summary.statusBadge.tone} label={summary.statusBadge.label} />
          <h2 className="mt-3 max-w-3xl text-2xl font-bold leading-tight text-[var(--text-primary)] md:text-3xl">
            {summary.headline}
          </h2>
          <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            {summary.description}
          </p>
          <p className="mt-3 line-clamp-2 text-sm font-medium text-slate-600">
            {summary.metadataLine}
          </p>

          <div className="mt-5 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
            {hasApplication ? (
              <AppButton asChild className="sm:w-auto">
                <Link
                  to={toStudentRoute(summary.primaryAction.route)}
                  data-smartux-tag="student_continue_application"
                >
                  {summary.primaryAction.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </AppButton>
            ) : (
              <AppButton
                onClick={onStart}
                disabled={isStarting}
                className="sm:w-auto"
                data-smartux-tag="student_start_application"
              >
                {isStarting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {summary.primaryAction.label}
              </AppButton>
            )}
            <AppButton asChild variant="secondary" className="sm:w-auto">
              <Link
                to="/app/assistant"
                search={assistantSearch}
                data-smartux-tag="student_open_chatbot"
              >
                <Sparkles className="h-4 w-4" />
                Hỏi trợ lý
              </Link>
            </AppButton>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Tiến độ tiêu chí
          </div>
          <div className="mt-3 flex items-end gap-1">
            <span className="text-4xl font-bold text-[#0057C2]">
              {summary.completedCriteriaCount}
            </span>
            <span className="pb-1 text-sm font-semibold text-slate-500">
              /{summary.totalCriteriaCount} tiêu chí
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
            {summary.pendingActionCount > 0
              ? `${summary.pendingActionCount} mục cần bạn xem tiếp.`
              : "Không có mục cần xử lý ngay."}
          </p>
        </div>
      </div>
    </SectionCard>
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

function NextActionsCard({ actions }: { actions: NextAction[] }) {
  return (
    <SectionCard title="Việc cần làm" className="h-full">
      {actions.length ? (
        <div className="space-y-3">
          {actions.slice(0, 3).map((action, index) => (
            <ActionRow action={action} index={index} key={`${action.title}-${index}`} />
          ))}
        </div>
      ) : (
        <EmptyState
          variant="noData"
          title="Bạn chưa có việc cần xử lý"
          description="Khi hồ sơ cần bổ sung hoặc có phản hồi mới, hệ thống sẽ hiển thị tại đây."
        />
      )}
    </SectionCard>
  );
}

function ActionRow({ action, index }: { action: NextAction; index: number }) {
  const Icon = index === 0 ? CircleAlert : index === 1 ? Clock3 : BookOpenCheck;
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          index === 0 ? "bg-amber-100 text-amber-700" : "bg-white text-[#0057C2]",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold text-[var(--text-primary)]">{action.title}</h3>
        <p className="line-clamp-1 text-sm text-[var(--text-secondary)]">{action.description}</p>
      </div>
      <AppButton asChild size="sm" variant={index === 0 ? "primary" : "secondary"}>
        <Link
          to={action.criterionKey ? "/app/application" : toStudentRoute(action.route)}
          search={action.criterionKey ? { criterion: action.criterionKey } : undefined}
          data-smartux-tag={getStudentActionTag(action)}
        >
          {action.actionLabel}
        </Link>
      </AppButton>
    </div>
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

function CompactHelpCard({
  applicationId,
  applicationStatus,
  nextActions,
}: {
  applicationId?: string;
  applicationStatus?: string;
  nextActions: string[];
}) {
  const assistantSearch = buildAssistantSearch({
    applicationId,
    nextActions,
    source: "overview",
    status: applicationStatus,
  });

  return (
    <SectionCard className="bg-white">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-[var(--text-primary)]">Cần hỗ trợ?</h2>
          <p className="line-clamp-2 text-sm leading-5 text-[var(--text-secondary)]">
            Trợ lý có thể giúp bạn tìm bước tiếp theo trong hồ sơ.
          </p>
        </div>
        <AppButton asChild variant="secondary" size="sm" className="shrink-0">
          <Link
            to="/app/assistant"
            search={assistantSearch}
            data-smartux-tag="student_open_chatbot"
          >
            <Sparkles className="h-4 w-4" />
            Hỏi trợ lý
          </Link>
        </AppButton>
      </div>
    </SectionCard>
  );
}

type StudentOverviewRoute = "/app/application" | "/app/feedback";

type AssistantSearch = {
  source: "overview" | "criterion" | "feedback";
  applicationId?: string;
  status?: string;
  criterionKey?: string;
  criterionLabel?: string;
  feedbackId?: string;
  message?: string;
  nextActions?: string;
};

function buildAssistantSearch({
  applicationId,
  criterionKey,
  criterionLabel,
  feedbackId,
  message,
  nextActions,
  source,
  status,
}: {
  applicationId?: string;
  criterionKey?: string;
  criterionLabel?: string;
  feedbackId?: string;
  message?: string;
  nextActions?: string[];
  source: "overview" | "criterion" | "feedback";
  status?: string;
}): AssistantSearch {
  return {
    source,
    applicationId,
    status,
    criterionKey,
    criterionLabel,
    feedbackId,
    message,
    nextActions: nextActions?.length ? nextActions.slice(0, 3).join("|") : undefined,
  };
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

function toStudentRoute(route: string): StudentOverviewRoute {
  return route === "/app/feedback" ? "/app/feedback" : "/app/application";
}

function getStudentActionTag(action: NextAction) {
  if (action.criterionKey) return "student_open_criterion";
  if (action.route === "/app/feedback") return "student_view_gap_analysis";
  return "student_continue_application";
}

function getFirstName(fullName?: string | null) {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.at(-1) ?? "bạn";
}
