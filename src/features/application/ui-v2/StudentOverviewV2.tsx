import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BookOpenCheck, Clock3, Loader2, Plus, RefreshCw } from "lucide-react";
import { useCallback, useMemo } from "react";
import {
  useAssistantNarrativeStream,
  useCriteriaCompletion,
  useCurrentApplication,
  useLatestPrecheck,
  useStartApplication,
  useStudentAssistantContext,
} from "@/features/application/hooks/useApplication";
import type {
  StudentAssistantContext,
  StudentNextBestAction,
} from "@/features/application/api/student-assistant";
import { buildDashboardAssistantFallback } from "@/features/application/components/student-assistant-fallback";
import {
  applyActionPresentationToUiAction,
  getStudentCriterionDisplayState,
} from "@/features/application/presentation";
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
  applyCompletionToCriteriaState,
  criterionLabels,
  getCriteriaUiState,
  getFeedbackUiItems,
  getNextActions,
  getStudentApplicationSummary,
} from "@/features/student/selectors/student-ui";
import {
  ButtonV2,
  CompactEmptyState,
  FiveCriteriaSpineV2,
  HairlineList,
  InlineStateMessage,
  SectionHeading,
  StatusPillV2,
  mapStudentDisplayStatusToV2ProgressStatus,
  type FiveCriteriaSpineV2Item,
  type StudentApplicationV2ProgressStatus,
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

type NextAction = ReturnType<typeof getNextActions>[number] & {
  isInteractive?: boolean;
  routeSearch?: Record<string, string>;
};

const overviewActionLinkClassName = "inline-flex min-h-11 items-center justify-center gap-2";

type AssistantSearch = {
  source: "overview";
  applicationId?: string;
  status?: string;
  nextActions?: string;
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
  const assistantContext = useStudentAssistantContext(SCHOOL_YEAR);
  const notifications = useNotifications({ page: 1, limit: 20 });
  const startApplication = useStartApplication();
  const { trackClick } = useSmartUXTracking();

  const firstName = getFirstName(user?.fullName);
  const evidences = useMemo(() => normalizeEvidences(evidencesQuery.data), [evidencesQuery.data]);
  const feedbackItems = useMemo(() => getFeedbackUiItems(notifications.data), [notifications.data]);
  const precheck = (latestPrecheck.data ??
    application?.latestPrecheckResult ??
    null) as PrecheckResult | null;
  const completionItems = useMemo(
    () => criteriaCompletion.data?.items ?? [],
    [criteriaCompletion.data?.items],
  );
  const applicationForSummary = useMemo(
    () => (application ? { ...application, evidences } : null),
    [application, evidences],
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
  const criteriaUiStates = useMemo(
    () =>
      coreStudentCriteria.map((criterion) =>
        applyCompletionToCriteriaState(
          getCriteriaUiState(criterion, evidences, precheck, feedbackItems),
          completionItems.find((item) => item.criterion === criterion),
        ),
      ),
    [completionItems, evidences, feedbackItems, precheck],
  );

  const summary = getStudentApplicationSummary(
    applicationForSummary,
    precheck,
    null,
    feedbackItems,
    criteriaUiStates,
  );

  const localNextActions = useMemo(
    () =>
      getNextActions(applicationForSummary, criteriaUiStates, feedbackItems, precheck).map(
        (action) => applyActionPresentationToUiAction(action),
      ),
    [applicationForSummary, criteriaUiStates, feedbackItems, precheck],
  );
  const assistantDisplayContext =
    assistantContext.data ??
    (assistantContext.isError
      ? buildDashboardAssistantFallback({
          application,
          firstName,
          schoolYear: SCHOOL_YEAR,
        })
      : null);
  const assistantPrimaryAction = assistantDisplayContext?.nextBestAction ?? null;
  const assistantNarrative = useAssistantNarrativeStream({
    schoolYear: SCHOOL_YEAR,
    contextVersion: assistantDisplayContext?.contextVersion,
    fallbackText: assistantDisplayContext?.narrative.fallbackText,
    enabled: Boolean(
      assistantDisplayContext?.narrative.streamingAvailable &&
      assistantDisplayContext.contextVersion &&
      !assistantContext.isError,
    ),
  });
  const nextActions = useMemo(
    () => mergeAssistantActionIntoNextActions(assistantPrimaryAction, localNextActions),
    [assistantPrimaryAction, localNextActions],
  );

  const updates = useMemo(
    () => buildOverviewUpdates(notifications.data, feedbackItems, precheck),
    [notifications.data, feedbackItems, precheck],
  );

  const assistantSearch = buildAssistantSearch({
    applicationId,
    nextActions: nextActions.map((action) => action.title),
    status: application?.status ?? summary.statusBadge.label,
  });

  const handleStart = useCallback(() => {
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
  }, [startApplication, trackClick]);

  const handleAssistantPrimaryAction = useCallback(() => {
    const action = assistantPrimaryAction;
    if (!action || action.type === "none") return;
    if (action.type === "start_application" || !application) {
      handleStart();
      return;
    }
    navigate({
      to: toStudentRoute(action.destination.route),
      search: action.destination.query as never,
    });
  }, [application, assistantPrimaryAction, handleStart, navigate]);

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

      <PrimaryStatusStrip
        application={application ?? null}
        isStarting={startApplication.isPending}
        onStart={handleStart}
        assistantSearch={assistantSearch}
        assistantAction={assistantPrimaryAction}
        summary={summary}
      />

      <DashboardAssistantPanel
        context={assistantDisplayContext}
        isError={assistantContext.isError}
        isLoading={assistantContext.isLoading && !assistantDisplayContext}
        isStarting={startApplication.isPending}
        narrativeText={assistantNarrative.text}
        onPrimaryAction={handleAssistantPrimaryAction}
        onRetryNarrative={assistantNarrative.retry}
        streamStatus={assistantNarrative.status}
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

      <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(300px,1fr)]">
        <ActionList actions={nextActions} />
        <UpdateLedger updates={updates} />
      </section>
    </div>
  );
}

function OverviewHeading({ firstName }: { firstName: string }) {
  return (
    <header className="min-w-0">
      <h1 className="m-0 truncate text-[28px] font-bold leading-9 text-[var(--student-v2-text-primary)]">
        Chào {firstName}, mình bắt đầu nhé
      </h1>
      <p className="mt-1 line-clamp-1 max-w-3xl text-[14px] leading-[22px] text-[var(--student-v2-text-secondary)]">
        Trợ lý 5Tốt sẽ theo dõi tiến độ và hướng dẫn bạn ở từng bước hoàn thiện hồ sơ.
      </p>
    </header>
  );
}

function PrimaryStatusStrip({
  application,
  assistantAction,
  assistantSearch,
  isStarting,
  onStart,
  summary,
}: {
  application: ApplicationWithOverviewData | null;
  assistantAction?: StudentNextBestAction | null;
  assistantSearch: AssistantSearch;
  isStarting: boolean;
  onStart: () => void;
  summary: ReturnType<typeof getStudentApplicationSummary>;
}) {
  const progressStatus = mapApplicationStatusToProgress(application?.status);
  const secondaryAction = summary.secondaryAction ?? {
    label: "Kiểm tra hồ sơ",
    route: "/app/application",
  };
  const primaryActionLabel = assistantAction?.ctaLabel ?? summary.primaryAction.label;
  const primaryActionRoute = assistantAction?.destination.route ?? summary.primaryAction.route;
  const primaryActionSearch = assistantAction?.destination.query;

  return (
    <section
      className="relative flex min-h-[144px] w-full min-w-0 overflow-hidden rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] p-5 sm:p-6"
      aria-labelledby="student-overview-status-heading"
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-[var(--student-v2-institutional-cyan)]" />
      <div className="flex min-w-0 flex-1 flex-col justify-center pl-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold uppercase leading-[17px] text-[var(--student-v2-text-muted)]">
            Trợ lý theo hồ sơ
          </span>
          <StatusPillV2 status={progressStatus} label={summary.statusBadge.label} />
        </div>
        <h2
          id="student-overview-status-heading"
          className="mt-2 line-clamp-2 max-w-4xl text-[22px] font-bold leading-7 text-[var(--student-v2-text-primary)] sm:text-[24px] sm:leading-8"
        >
          {application ? summary.headline : "Tạo hồ sơ để bắt đầu"}
        </h2>
        <p className="mt-1 line-clamp-2 max-w-3xl text-[14px] leading-[22px] text-[var(--student-v2-text-secondary)]">
          {application
            ? summary.description
            : "Sau khi bạn tạo hồ sơ, trợ lý sẽ giúp đọc minh chứng, tiền kiểm thông tin và hướng dẫn bước tiếp theo."}
        </p>
        <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {application ? (
            <ButtonV2 asChild>
              <Link
                to={toStudentRoute(primaryActionRoute)}
                search={primaryActionSearch as never}
                className={overviewActionLinkClassName}
              >
                {primaryActionLabel}
                <ArrowRight aria-hidden="true" />
              </Link>
            </ButtonV2>
          ) : (
            <ButtonV2 type="button" onClick={onStart} disabled={isStarting}>
              {isStarting ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              {primaryActionLabel}
            </ButtonV2>
          )}
          {application ? (
            <ButtonV2 asChild variant="secondary">
              <Link
                to={toStudentRoute(secondaryAction.route)}
                className={overviewActionLinkClassName}
              >
                <BookOpenCheck aria-hidden="true" />
                {secondaryAction.label}
              </Link>
            </ButtonV2>
          ) : (
            <ButtonV2 type="button" variant="secondary" disabled>
              <BookOpenCheck aria-hidden="true" />
              Kiểm tra hồ sơ
            </ButtonV2>
          )}
          <ButtonV2 asChild variant="tertiary">
            <Link
              to="/app/assistant"
              search={assistantSearch}
              className={overviewActionLinkClassName}
            >
              Hỏi trợ lý
            </Link>
          </ButtonV2>
        </div>
      </div>
    </section>
  );
}

function DashboardAssistantPanel({
  context,
  isError,
  isLoading,
  isStarting,
  narrativeText,
  onPrimaryAction,
  onRetryNarrative,
  streamStatus,
}: {
  context?: StudentAssistantContext | null;
  isError: boolean;
  isLoading: boolean;
  isStarting: boolean;
  narrativeText?: string;
  onPrimaryAction: () => void;
  onRetryNarrative: () => void;
  streamStatus: "idle" | "connecting" | "streaming" | "complete" | "error";
}) {
  if (isLoading) {
    return (
      <section
        className="min-h-[132px] rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] p-5"
        aria-busy="true"
      >
        <SkeletonLine className="h-4 w-28" />
        <SkeletonLine className="mt-4 h-6 w-64" />
        <SkeletonLine className="mt-3 h-4 w-3/5" />
      </section>
    );
  }

  const action = context?.nextBestAction ?? null;
  const isNewUser = context?.state === "new_user";
  const displayText =
    (isNewUser
      ? "AI có thể đọc minh chứng, tạo Thẻ minh chứng, tiền kiểm thông tin và hướng dẫn bạn đến bước tiếp theo."
      : narrativeText) ||
    context?.narrative.fallbackText ||
    "Hệ thống sẽ gợi ý bước tiếp theo khi hồ sơ có dữ liệu mới.";
  const showConnecting = streamStatus === "connecting" && !narrativeText;

  return (
    <section
      className="grid min-w-0 gap-4 rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]"
      aria-labelledby="student-dashboard-assistant-heading"
    >
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold uppercase leading-[17px] text-[var(--student-v2-text-muted)]">
            Gợi ý theo tiến độ
          </span>
          {streamStatus === "streaming" ? (
            <StatusPillV2 status="waiting" label="Đang cập nhật" />
          ) : null}
        </div>
        <h2
          id="student-dashboard-assistant-heading"
          className="mt-2 line-clamp-1 text-[20px] font-bold leading-7 text-[var(--student-v2-text-primary)]"
        >
          {isNewUser
            ? "Trợ lý sẽ đồng hành sau khi bạn tạo hồ sơ"
            : (context?.greeting.title ?? "Trợ lý hồ sơ")}
        </h2>
        <p className="mt-1 line-clamp-2 text-[14px] leading-[22px] text-[var(--student-v2-text-secondary)]">
          {context?.greeting.deterministicMessage ?? "Hệ thống đang tải trạng thái hồ sơ mới nhất."}
        </p>
        <p
          className="mt-3 min-h-[44px] max-w-4xl text-[14px] leading-[22px] text-[var(--student-v2-text-primary)]"
          aria-live={streamStatus === "complete" || streamStatus === "error" ? "polite" : "off"}
        >
          {showConnecting ? "Đang chuẩn bị gợi ý phù hợp với hồ sơ của bạn..." : displayText}
        </p>
        {isError ? (
          <p className="mt-2 text-[12px] leading-[17px] text-[var(--student-v2-progress-supplement-text)]">
            Chưa tải được gợi ý mới nhất. Dashboard vẫn dùng dữ liệu hiện có.
          </p>
        ) : null}
      </div>

      <div className="min-w-0 rounded-[calc(var(--student-v2-radius-section)-4px)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-secondary)] p-4">
        <p className="text-[12px] font-semibold uppercase leading-[17px] text-[var(--student-v2-text-muted)]">
          Việc nên làm
        </p>
        <h3 className="mt-1 line-clamp-2 text-[16px] font-bold leading-6 text-[var(--student-v2-text-primary)]">
          {action?.title ?? "Không có việc cần xử lý ngay"}
        </h3>
        <p className="mt-1 min-h-10 text-[13px] leading-[20px] text-[var(--student-v2-text-secondary)]">
          {action?.deterministicDescription ??
            "Khi hồ sơ có yêu cầu mới, hệ thống sẽ hiển thị tại đây."}
        </p>
        <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row lg:flex-col">
          {action && action.type !== "none" ? (
            <ButtonV2 type="button" onClick={onPrimaryAction} disabled={isStarting}>
              {isStarting ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight aria-hidden="true" />
              )}
              {action.ctaLabel}
            </ButtonV2>
          ) : null}
          {streamStatus === "error" ? (
            <ButtonV2 type="button" variant="tertiary" size="compact" onClick={onRetryNarrative}>
              <RefreshCw aria-hidden="true" />
              Cập nhật gợi ý
            </ButtonV2>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ActionList({ actions }: { actions: NextAction[] }) {
  const visibleActions = actions.slice(0, 3);

  return (
    <section className="min-w-0">
      <SectionHeading title="Việc bạn có thể làm" />
      <div className="mt-3 overflow-hidden rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)]">
        {visibleActions.length ? (
          <>
            <HairlineList className="border-y-0">
              {visibleActions.map((action, index) => (
                <TaskRow
                  key={`${action.title}-${index}`}
                  action={action}
                  index={index}
                  className={index >= 2 ? "hidden sm:flex" : undefined}
                />
              ))}
            </HairlineList>
            {actions.length > 2 ? (
              <div className="border-t border-[var(--student-v2-divider)] px-4 py-3">
                <ButtonV2 asChild variant="tertiary" size="compact">
                  <Link to="/app/application" className={overviewActionLinkClassName}>
                    Xem tất cả
                  </Link>
                </ButtonV2>
              </div>
            ) : null}
          </>
        ) : (
          <CompactEmptyState
            title="Bạn chưa có việc cần xử lý"
            description="Khi hồ sơ cần bổ sung hoặc có phản hồi mới, hệ thống sẽ hiển thị tại đây."
            className="border-0"
          />
        )}
      </div>
    </section>
  );
}

function TaskRow({
  action,
  className,
  index,
}: {
  action: NextAction;
  className?: string;
  index: number;
}) {
  return (
    <div
      className={cn(
        "flex min-h-16 min-w-0 items-center gap-3 px-4 py-3 sm:min-h-[72px]",
        className,
      )}
    >
      <Clock3
        className="hidden h-4 w-4 shrink-0 text-[var(--student-v2-text-muted)] sm:block"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 text-[15px] font-semibold leading-[23px] text-[var(--student-v2-text-primary)]">
          {action.title}
        </h3>
        <p className="line-clamp-1 text-[13px] leading-[18px] text-[var(--student-v2-text-secondary)]">
          {action.description}
        </p>
      </div>
      {action.isInteractive === false ? (
        <StatusPillV2 status="waiting" />
      ) : (
        <ButtonV2 asChild variant={index === 0 ? "secondary" : "tertiary"} size="compact">
          <Link
            to={action.criterionKey ? "/app/application" : toStudentRoute(action.route)}
            search={
              action.routeSearch
                ? (action.routeSearch as never)
                : action.criterionKey
                  ? ({ criterion: action.criterionKey } as never)
                  : undefined
            }
            className={overviewActionLinkClassName}
          >
            {action.actionLabel}
          </Link>
        </ButtonV2>
      )}
    </div>
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

function mapApplicationStatusToProgress(
  status?: string | null,
): StudentApplicationV2ProgressStatus {
  if (status === "ready_to_submit" || status === "completed") return "complete";
  if (status === "supplement_required") return "supplement";
  if (status === "submitted" || status === "under_review" || status === "resolution_needed") {
    return "waiting";
  }
  if (status === "draft" || status === "prechecked") return "waiting";
  return "not-started";
}

function buildAssistantSearch({
  applicationId,
  nextActions,
  status,
}: {
  applicationId?: string;
  nextActions?: string[];
  status?: string;
}): AssistantSearch {
  return {
    source: "overview",
    applicationId,
    status,
    nextActions: nextActions?.length ? nextActions.slice(0, 3).join("|") : undefined,
  };
}

type StudentOverviewRoute = "/app/application" | "/app/feedback" | "/app/result";

function toStudentRoute(route: string): StudentOverviewRoute {
  if (route === "/app/feedback") return "/app/feedback";
  if (route === "/app/result") return "/app/result";
  return "/app/application";
}

function mergeAssistantActionIntoNextActions(
  assistantAction: StudentNextBestAction | null,
  localActions: NextAction[],
): NextAction[] {
  if (!assistantAction || assistantAction.type === "none") return localActions;
  const mapped = mapAssistantActionToNextAction(assistantAction);
  return [mapped, ...localActions.filter((action) => action.title !== mapped.title)];
}

function mapAssistantActionToNextAction(action: StudentNextBestAction): NextAction {
  return {
    title: action.title,
    description: action.deterministicDescription,
    actionLabel: action.ctaLabel,
    route: action.destination.route,
    criterionKey: action.criterion,
    isInteractive: action.type !== "none",
    routeSearch:
      action.destination.query ?? (action.criterion ? { criterion: action.criterion } : undefined),
  } as NextAction;
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
