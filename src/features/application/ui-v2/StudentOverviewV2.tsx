import { useCallback, useMemo } from "react";
import {
  useCriteriaCompletion,
  useCurrentApplication,
  useCitySubmissionEligibility,
  useLatestPrecheck,
  useStartApplication,
  useStudentSubmissionDeadline,
} from "@/features/application/hooks/useApplication";
import {
  applyActionPresentationToUiAction,
  getStudentCriterionDisplayState,
  type StudentCriterionDisplayState,
} from "@/features/application/presentation";
import {
  StudentAttentionPanel,
  StudentCriteriaError,
  StudentCriteriaOverview,
  StudentHomeHero,
  StudentHomeSkeleton,
  type StudentHomeAttentionItem,
} from "@/features/application/ui-v2/components/StudentHomeSections";
import { useAuth } from "@/features/auth/store/auth-store";
import { useEvidences } from "@/features/evidence/hooks/useEvidence";
import { useSmartUXTracking } from "@/hooks/useSmartUXTracking";
import type {
  ApplicationReviewTaskSummary,
  ApplicationState,
  Criterion,
  CriterionCompletionItem,
  EvidenceResponse,
  PrecheckResult,
} from "@/lib/api/types";
import { formatVietnamDateTime } from "@/lib/datetime-vietnam";
import { getCoreCriterionLabel } from "@/lib/criteria-presentation";
import { getStatusPresentation } from "@/lib/status-labels";
import {
  applyCompletionToCriteriaState,
  coreStudentCriteria,
  getCriteriaUiState,
  getNextActions,
} from "@/features/student/selectors/student-ui";
import {
  getStudentHomeSupplementTasks,
  selectStudentHomeAction,
  type StudentHomeApplication,
} from "@/features/student/selectors/student-home";
import { ButtonV2, InlineStateMessage } from "./components";

type OverviewApplication = ApplicationState & {
  latestPrecheckResult?: PrecheckResult | null;
  reviewTasks?: ApplicationReviewTaskSummary[];
};

const EMPTY_COMPLETION_ITEMS: CriterionCompletionItem[] = [];

export function StudentOverviewV2() {
  const user = useAuth((state) => state.user);
  const current = useCurrentApplication();
  const application = (current.data?.application ?? null) as OverviewApplication | null;
  const applicationId = application?.id;
  const latestPrecheck = useLatestPrecheck(applicationId);
  const criteriaCompletion = useCriteriaCompletion(applicationId);
  const evidencesQuery = useEvidences(applicationId, { limit: 100 });
  const isCityIndividual = Boolean(
    application?.applicationType === "individual" && application.targetLevel === "city",
  );
  const needsInitialGate = Boolean(
    isCityIndividual &&
    !application?.submittedAt &&
    ["draft", "prechecked", "ready_to_submit", "supplement_required"].includes(
      application?.status ?? "",
    ),
  );
  const eligibility = useCitySubmissionEligibility(applicationId, needsInitialGate);
  const deadline = useStudentSubmissionDeadline(applicationId, isCityIndividual);
  const startApplication = useStartApplication();
  const { trackClick } = useSmartUXTracking();

  const firstName = getFirstName(user?.fullName);
  const evidences = useMemo(() => normalizeEvidences(evidencesQuery.data), [evidencesQuery.data]);
  const precheck = (latestPrecheck.data ??
    application?.latestPrecheckResult ??
    null) as PrecheckResult | null;
  const completionItems = criteriaCompletion.data?.items ?? EMPTY_COMPLETION_ITEMS;
  const criterionDataLoading = Boolean(
    applicationId && (criteriaCompletion.isLoading || evidencesQuery.isLoading),
  );
  const criterionDataUnavailable = Boolean(
    applicationId && criteriaCompletion.isError && evidencesQuery.isError,
  );

  const evidenceCounts = useMemo(
    () => getEvidenceCounts(completionItems, evidences, Boolean(evidencesQuery.data)),
    [completionItems, evidences, evidencesQuery.data],
  );
  const displayStates = useMemo(
    () =>
      getCriterionDisplayStates({
        application,
        completionItems,
        evidences,
        precheck,
        unavailable: criterionDataUnavailable,
      }),
    [application, completionItems, evidences, precheck, criterionDataUnavailable],
  );
  const criteriaUiStates = useMemo(
    () =>
      coreStudentCriteria.map((criterion) =>
        applyCompletionToCriteriaState(
          getCriteriaUiState(criterion, evidences, precheck, []),
          completionItems.find((item) => item.criterion === criterion),
        ),
      ),
    [completionItems, evidences, precheck],
  );
  const actionCandidates = useMemo(() => {
    if (!application || criterionDataLoading || criterionDataUnavailable) return [];
    return getNextActions({ ...application, evidences }, criteriaUiStates, [], precheck).map(
      (action) => applyActionPresentationToUiAction(action),
    );
  }, [
    application,
    evidences,
    criteriaUiStates,
    precheck,
    criterionDataLoading,
    criterionDataUnavailable,
  ]);
  const nextAction = selectStudentHomeAction({
    application: application as StudentHomeApplication | null,
    cityGateRequired: isCityIndividual,
    eligibility: eligibility.data,
    eligibilityResolved: Boolean(
      eligibility.data && !eligibility.isError && !eligibility.isLoading,
    ),
    deadline: deadline.data,
    deadlineResolved: Boolean(deadline.data && !deadline.isError && !deadline.isLoading),
    candidates: actionCandidates,
  });
  const finalStatus = application?.finalStatus;
  const isFinal = Boolean(finalStatus && finalStatus !== "pending");
  const heroStatus = isFinal
    ? getStatusPresentation("final", finalStatus)
    : getStatusPresentation("application", application?.status ?? "not_started");
  const evidenceSummary = getEvidenceSummary(
    applicationId,
    completionItems,
    evidences,
    Boolean(evidencesQuery.data),
    evidencesQuery.isError,
  );
  const attentionItems = useMemo(
    () =>
      buildAttentionItems({
        application,
        eligibility: eligibility.data,
        deadline: deadline.data,
        evidences,
      }),
    [application, eligibility.data, deadline.data, evidences],
  );
  const contextDescription = [
    "Hồ sơ Sinh viên 5 tốt cấp Thành phố",
    user?.workspace?.shortName || user?.workspace?.name,
    application?.schoolYear ? `Năm học ${application.schoolYear}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  const handleStart = useCallback(() => {
    trackClick("student_start_application", {
      role: "student",
      page: "overview_v2",
    });
    startApplication.mutate({});
  }, [startApplication, trackClick]);

  if (current.isLoading) return <StudentHomeSkeleton firstName={firstName} />;

  if (current.isError) {
    return (
      <div className="mx-auto flex min-w-0 flex-col gap-4 py-5 sm:py-6">
        <HomeHeading firstName={firstName} description={contextDescription} />
        <InlineStateMessage
          tone="critical"
          title="Chưa tải được hồ sơ của bạn"
          description="Dữ liệu hồ sơ chưa sẵn sàng. Vui lòng thử tải lại."
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
    <div className="mx-auto flex min-w-0 flex-col gap-4 py-5 sm:gap-5 sm:py-6">
      <HomeHeading firstName={firstName} description={contextDescription} />
      <StudentHomeHero
        action={nextAction}
        status={heroStatus}
        isStarting={startApplication.isPending}
        onStart={handleStart}
        evidenceSummary={evidenceSummary}
      />
      <StudentCriteriaOverview
        applicationId={applicationId}
        displayStates={displayStates}
        completionItems={completionItems}
        evidenceCounts={evidenceCounts}
        isLoading={criterionDataLoading}
      />
      {criterionDataUnavailable ? (
        <StudentCriteriaError
          onRetry={() => {
            void criteriaCompletion.refetch();
            void evidencesQuery.refetch();
          }}
        />
      ) : null}
      <StudentAttentionPanel items={attentionItems} />
    </div>
  );
}

function HomeHeading({ firstName, description }: { firstName: string; description: string }) {
  return (
    <header className="min-w-0">
      <h1 className="m-0 text-[25px] font-bold leading-8 text-[var(--student-v2-text-primary)] sm:text-[27px] sm:leading-9">
        Chào {firstName}
      </h1>
      <p className="mt-1 line-clamp-2 text-[13px] leading-[20px] text-[var(--student-v2-text-secondary)]">
        {description}
      </p>
    </header>
  );
}

function getCriterionDisplayStates({
  application,
  completionItems,
  evidences,
  precheck,
  unavailable,
}: {
  application: OverviewApplication | null;
  completionItems: CriterionCompletionItem[];
  evidences: EvidenceResponse[];
  precheck: PrecheckResult | null;
  unavailable: boolean;
}): Partial<Record<Criterion, StudentCriterionDisplayState>> {
  if (!application || unavailable) return {};

  return Object.fromEntries(
    coreStudentCriteria.map((criterion) => [
      criterion,
      getStudentCriterionDisplayState({
        criterion,
        application,
        completion: completionItems.find((item) => item.criterion === criterion),
        reviewTask: application.reviewTasks?.find((item) => item.criterion === criterion),
        precheckAction: precheck?.criteriaResults?.find((item) => item.criterion === criterion)
          ?.nextAction,
      }),
    ]),
  );
}

function getEvidenceCounts(
  completionItems: CriterionCompletionItem[],
  evidences: EvidenceResponse[],
  hasEvidenceList: boolean,
) {
  const counts: Partial<Record<Criterion, number>> = {};
  for (const criterion of coreStudentCriteria) {
    const completion = completionItems.find((item) => item.criterion === criterion);
    if (typeof completion?.evidenceCount === "number") {
      counts[criterion] = completion.evidenceCount;
    } else if (hasEvidenceList) {
      counts[criterion] = evidences.filter((evidence) => evidence.criterion === criterion).length;
    }
  }
  return counts;
}

function getEvidenceSummary(
  applicationId: string | undefined,
  completionItems: CriterionCompletionItem[],
  evidences: EvidenceResponse[],
  hasEvidenceList: boolean,
  evidenceError: boolean,
) {
  if (!applicationId) return undefined;
  const allCompletionCountsPresent = coreStudentCriteria.every((criterion) =>
    completionItems.some(
      (item) => item.criterion === criterion && typeof item.evidenceCount === "number",
    ),
  );
  const countEvidenceCriteria = (countFor: (criterion: Criterion) => number) =>
    coreStudentCriteria.filter((criterion) => countFor(criterion) > 0).length;

  if (allCompletionCountsPresent) {
    return `${countEvidenceCriteria(
      (criterion) =>
        completionItems.find((item) => item.criterion === criterion)?.evidenceCount ?? 0,
    )}/5 tiêu chí đã có minh chứng`;
  }
  if (hasEvidenceList && !evidenceError) {
    return `${countEvidenceCriteria(
      (criterion) => evidences.filter((item) => item.criterion === criterion).length,
    )}/5 tiêu chí đã có minh chứng`;
  }
  return undefined;
}

function buildAttentionItems({
  application,
  eligibility,
  deadline,
  evidences,
}: {
  application: OverviewApplication | null;
  eligibility?: { status: "ELIGIBLE" | "NOT_ELIGIBLE" | "NEEDS_VERIFICATION" } | null;
  deadline?: {
    submission: {
      status: string;
      opensAt: string | null;
      closesAt: string | null;
      effectiveClosesAt: string | null;
      exceptionValidUntil: string | null;
    };
    review: { status: string; deadlineAt: string | null };
  } | null;
  evidences: EvidenceResponse[];
}): StudentHomeAttentionItem[] {
  const items: StudentHomeAttentionItem[] = [];

  for (const task of getStudentHomeSupplementTasks(application as StudentHomeApplication | null)) {
    const criterion = isCoreCriterion(task.criterion)
      ? getCoreCriterionLabel(task.criterion)
      : "Tiêu chí trong hồ sơ";
    const request = task.supplementRequestJson;
    const dueDate = request?.deadline ?? task.dueDate ?? null;
    const detail = [
      request?.reason?.trim(),
      dueDate ? `Hạn đề nghị: ${formatVietnamDateTime(dueDate)}. Đây là mốc theo dõi.` : undefined,
    ]
      .filter(Boolean)
      .join("\n");
    items.push({
      id: `supplement-${task.id}`,
      title: `Yêu cầu bổ sung · ${criterion}`,
      description: detail || "Mở hồ sơ để xem nội dung cần bổ sung.",
      tone: "warning",
    });
  }

  if (eligibility && eligibility.status !== "ELIGIBLE") {
    items.push({
      id: "eligibility",
      title: "Điều kiện nộp hồ sơ",
      description:
        eligibility.status === "NEEDS_VERIFICATION"
          ? "Thông tin cần được cán bộ xác minh trước khi gửi hồ sơ. Bạn vẫn có thể tiếp tục hoàn thiện."
          : "Thông tin hiện tại chưa đáp ứng điều kiện nộp lần đầu. Bạn vẫn có thể tiếp tục hoàn thiện hồ sơ.",
      tone: "warning",
    });
  }

  if (application && !application.submittedAt && deadline?.submission) {
    const submission = deadline.submission;
    const endDate = submission.effectiveClosesAt ?? submission.closesAt;
    if (submission.status === "NOT_CONFIGURED") {
      items.push({
        id: "submission-window",
        title: "Chưa có thời hạn gửi hồ sơ",
        description: "Thời hạn tiếp nhận hồ sơ cho năm học này chưa được cấu hình.",
        tone: "info",
      });
    } else if (submission.status === "NOT_OPEN") {
      items.push({
        id: "submission-window",
        title: "Chưa đến hạn gửi hồ sơ",
        description: submission.opensAt
          ? `Mở nhận hồ sơ: ${formatVietnamDateTime(submission.opensAt)}.`
          : "Thời gian tiếp nhận hồ sơ chưa bắt đầu.",
        tone: "info",
      });
    } else if (submission.status === "CLOSED") {
      items.push({
        id: "submission-window",
        title: "Đã hết thời hạn gửi hồ sơ",
        description: endDate
          ? `Thời hạn kết thúc: ${formatVietnamDateTime(endDate)}.`
          : "Thời hạn tiếp nhận hồ sơ đã kết thúc.",
        tone: "warning",
      });
    } else if (submission.status === "OPEN" && endDate) {
      items.push({
        id: "submission-window",
        title: "Hạn gửi hồ sơ",
        description: `${formatVietnamDateTime(endDate)} · ${getTimeRemainingLabel(endDate)}.`,
        tone: "info",
      });
    } else if (submission.status === "EXCEPTION_ACTIVE") {
      const exceptionEnd = endDate ?? submission.exceptionValidUntil;
      items.push({
        id: "submission-window",
        title: "Thời hạn nộp hồ sơ được gia hạn",
        description: exceptionEnd
          ? `Ngoại lệ có hiệu lực đến ${formatVietnamDateTime(exceptionEnd)}.`
          : "Ngoại lệ nộp hồ sơ đang có hiệu lực.",
        tone: "info",
      });
    }
  }

  if (application?.submittedAt && deadline?.review?.deadlineAt) {
    items.push({
      id: "review-deadline",
      title: "Mốc dự kiến xử lý",
      description: `${formatVietnamDateTime(deadline.review.deadlineAt)}${deadline.review.status === "OVERDUE" ? " · Đã quá mốc theo dõi." : " · Mốc tham khảo tiến độ."}`,
      tone: deadline.review.status === "OVERDUE" ? "warning" : "info",
    });
  }

  const failedCount = evidences.filter((item) =>
    ["failed", "needs_manual_review"].includes(item.indexingStatus),
  ).length;
  const processingCount = evidences.filter((item) =>
    ["uploaded", "pending_indexing", "ocr_processing", "extracting", "checking_registry"].includes(
      item.indexingStatus,
    ),
  ).length;
  if (failedCount) {
    items.push({
      id: "evidence-check",
      title: `${failedCount} tài liệu cần kiểm tra`,
      description: "Hãy mở tiêu chí liên quan để xem lại tài liệu gốc.",
      tone: "warning",
    });
  } else if (processingCount) {
    items.push({
      id: "evidence-processing",
      title: `${processingCount} tài liệu đang được phân tích`,
      description: "Trạng thái sẽ cập nhật khi quá trình đọc tài liệu hoàn tất.",
      tone: "info",
    });
  }

  return items;
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

function getTimeRemainingLabel(date: string) {
  const remaining = Date.parse(date) - Date.now();
  if (!Number.isFinite(remaining)) return "theo thời hạn đã công bố";
  if (remaining <= 0) return "đến hạn hôm nay";
  const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
  return days === 1 ? "còn dưới 1 ngày" : `còn ${days} ngày`;
}

function getFirstName(fullName?: string | null) {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.at(-1) ?? "bạn";
}

function isCoreCriterion(criterion?: Criterion | null) {
  return coreStudentCriteria.includes(criterion as Criterion);
}
