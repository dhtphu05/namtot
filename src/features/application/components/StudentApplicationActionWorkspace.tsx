import { Link } from "@tanstack/react-router";
import {
  BookOpenCheck,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Dumbbell,
  FileText,
  Globe2,
  GraduationCap,
  HeartHandshake,
  Loader2,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useCurrentApplication,
  useLatestPrecheck,
  usePrecheck,
  useStartApplication,
  useSubmitApplication,
  useUpdateTargetLevel,
  useUpsertMetric,
} from "@/features/application/hooks/useApplication";
import { SubmitConfirmationModal } from "@/features/application/components/SubmitConfirmationModal";
import { useAuth } from "@/features/auth/store/auth-store";
import { AddEvidenceDrawer } from "@/features/evidence/components/AddEvidenceDrawer";
import { EvidenceDetailModal } from "@/features/evidence/components/EvidenceDetailModal";
import { StudentEvidenceCard } from "@/features/evidence/components/StudentEvidenceCard";
import { useDeleteEvidence, useEvidences } from "@/features/evidence/hooks/useEvidence";
import {
  AppButton,
  EmptyState,
  InlineAlert,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "@/features/student/components/primitives";
import {
  coreStudentCriteria,
  criterionLabels,
  getCriteriaUiState,
  getNextActions,
  getStudentApplicationStatus,
  getStudentApplicationSummary,
} from "@/features/student/selectors/student-ui";
import {
  criteriaLevelSummaries,
  criterionInputFields,
  getCriterionMatrixItem,
  getPrimaryMetricInput,
  type CoreCriterion,
} from "@/lib/criteria-matrix";
import { cn } from "@/lib/utils";
import type {
  ApplicationMetric,
  ApplicationReviewTaskSummary,
  ApplicationState,
  Criterion,
  EvidenceResponse,
  Level,
  MetricType,
  PrecheckResult,
} from "@/lib/api/types";

const SCHOOL_YEAR = "2025-2026";

type ApplicationWithWorkspaceData = ApplicationState & {
  summary?: {
    deadline?: string | null;
    totalEvidences?: number;
    evidenceByCriterion?: Partial<Record<Criterion, number>>;
  };
  latestPrecheckResult?: PrecheckResult | null;
};

type CriteriaState = ReturnType<typeof getCriteriaUiState>;
type NextAction = ReturnType<typeof getNextActions>[number];

type SupplementRequest = {
  id: string;
  criterion: Criterion;
  reason: string;
  deadline?: string | null;
  requestedFields: string[];
};

const levelLabels: Record<Level, string> = {
  school: "Cấp Trường",
  university: "Cấp Đại học Đà Nẵng",
  city: "Cấp Thành phố",
  central: "Cấp Trung ương",
};

const criterionIcons: Partial<Record<Criterion, LucideIcon>> = {
  ethics: ShieldCheck,
  academic: GraduationCap,
  physical: Dumbbell,
  volunteer: HeartHandshake,
  integration: Globe2,
};

const criterionGuide: Record<
  CoreCriterion,
  { main: string[]; valid: string[]; mistakes: string[] }
> = {
  ethics: {
    main: ["Điểm rèn luyện đạt yêu cầu.", "Không vi phạm quy định trong năm học."],
    valid: [
      "Bảng điểm rèn luyện.",
      "Xác nhận không vi phạm.",
      "Giấy khen hoặc xác nhận Đoàn - Hội.",
    ],
    mistakes: ["Thiếu xác nhận.", "Sai năm học.", "File không thể đọc rõ."],
  },
  academic: {
    main: ["GPA hoặc điểm học tập đạt ngưỡng.", "Dữ liệu học tập đúng năm xét."],
    valid: ["Bảng điểm.", "Giấy xác nhận học tập.", "Giải thưởng học thuật."],
    mistakes: ["Thiếu GPA.", "File mờ.", "Không có xác nhận."],
  },
  physical: {
    main: [
      "Có minh chứng thể lực hoặc hoạt động thể thao phù hợp.",
      "Thời gian nằm trong năm xét.",
    ],
    valid: ["Sinh viên khỏe.", "Giấy chứng nhận thể thao.", "Xác nhận CLB."],
    mistakes: ["Thiếu thời gian.", "Thiếu đơn vị xác nhận.", "Minh chứng không liên quan."],
  },
  volunteer: {
    main: [
      "Có hoạt động tình nguyện hợp lệ theo quy định.",
      "Thể hiện rõ vai trò hoặc số ngày tham gia.",
    ],
    valid: ["Giấy chứng nhận.", "Danh sách xác nhận.", "Giấy khen tình nguyện."],
    mistakes: ["Thiếu số ngày.", "Thiếu đơn vị tổ chức.", "Sai thời gian xét."],
  },
  integration: {
    main: [
      "Có ngoại ngữ, kỹ năng hoặc hoạt động hội nhập phù hợp.",
      "Minh chứng còn giá trị khi xét.",
    ],
    valid: ["Chứng chỉ ngoại ngữ.", "Hoạt động hội nhập.", "Tập huấn kỹ năng."],
    mistakes: ["Thiếu thời hạn.", "Thiếu trình độ.", "Không rõ cấp tổ chức."],
  },
};

const editableStatuses = [
  "draft",
  "prechecked",
  "ready_to_submit",
  "supplement_required",
  "draft_supplement",
];
const readonlyStatuses = [
  "submitted",
  "under_review",
  "resolution_needed",
  "completed",
  "rejected",
];

export function StudentApplicationActionWorkspace() {
  const user = useAuth((state) => state.user);
  const current = useCurrentApplication(SCHOOL_YEAR);
  const startApplication = useStartApplication();
  const updateTargetLevel = useUpdateTargetLevel();
  const upsertMetric = useUpsertMetric();
  const runPrecheck = usePrecheck();
  const submitApplication = useSubmitApplication();
  const deleteEvidence = useDeleteEvidence();

  const application = current.data?.application as ApplicationWithWorkspaceData | null | undefined;
  const applicationId = application?.id;
  const evidencesQuery = useEvidences(applicationId, { limit: 100 });
  const latestPrecheck = useLatestPrecheck(applicationId);
  const [selectedCriterion, setSelectedCriterion] = useState<Criterion>(
    () => getCriterionFromLocation() ?? "ethics",
  );
  const [evidenceDrawerCriterion, setEvidenceDrawerCriterion] = useState<Criterion | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceResponse | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [optimisticEvidences, setOptimisticEvidences] = useState<EvidenceResponse[]>([]);
  const [metricDrafts, setMetricDrafts] = useState<Partial<Record<MetricType, string>>>({});
  const initializedCriterionRef = useRef(false);

  const serverEvidences = useMemo(
    () => normalizeEvidences(evidencesQuery.data),
    [evidencesQuery.data],
  );
  const evidences = useMemo(
    () => mergeOptimisticEvidences(serverEvidences, optimisticEvidences, applicationId),
    [applicationId, optimisticEvidences, serverEvidences],
  );
  const precheck = (latestPrecheck.data ??
    application?.latestPrecheckResult ??
    null) as PrecheckResult | null;
  const metrics = useMemo(() => application?.metrics ?? [], [application?.metrics]);
  const supplementRequests = useMemo(
    () => mapSupplementRequests(application?.reviewTasks ?? []),
    [application?.reviewTasks],
  );
  const supplementCriteria = useMemo(
    () => new Set(supplementRequests.map((item) => item.criterion)),
    [supplementRequests],
  );
  const isSupplementMode =
    application?.status === "supplement_required" ||
    String(application?.status) === "draft_supplement";
  const isReadonlyStatus = Boolean(application && readonlyStatuses.includes(application.status));
  const canEditApplication = Boolean(
    application && editableStatuses.includes(String(application.status)) && !isReadonlyStatus,
  );
  const canSubmitApplication = Boolean(
    application &&
    !["submitted", "under_review", "completed", "rejected", "resolution_needed"].includes(
      application.status,
    ),
  );
  const criteriaStates = useMemo(
    () =>
      coreStudentCriteria.map((criterion) =>
        getCriteriaUiState(criterion, evidences, precheck, []),
      ),
    [evidences, precheck],
  );
  const summary = getStudentApplicationSummary(
    application ? { ...application, evidences } : null,
    precheck,
    null,
    [],
  );
  const nextActions = useMemo(
    () =>
      getNextActions(
        application ? { ...application, evidences } : null,
        criteriaStates,
        [],
        precheck,
      ),
    [application, criteriaStates, evidences, precheck],
  );
  const selectedState =
    criteriaStates.find((item) => item.key === selectedCriterion) ?? criteriaStates[0];
  const selectedEvidences = useMemo(
    () => evidences.filter((item) => item.criterion === selectedCriterion),
    [evidences, selectedCriterion],
  );
  const selectedMetric = getPrimaryMetricInput(selectedCriterion);
  const selectedSupplementRequest = supplementRequests.find(
    (item) => item.criterion === selectedCriterion,
  );
  const isSelectedLocked = isCriterionLockedForSupplement(
    selectedCriterion,
    isSupplementMode,
    supplementCriteria,
  );
  const canEditSelectedCriterion = canEditApplication && !isSelectedLocked;
  const completedCriteria = criteriaStates.filter((item) => item.status === "ok").length;
  const hasSubmitCta =
    application?.status === "ready_to_submit" ||
    (canSubmitApplication && completedCriteria === coreStudentCriteria.length);

  useEffect(() => {
    setOptimisticEvidences([]);
  }, [applicationId]);

  useEffect(() => {
    if (!application || initializedCriterionRef.current) return;
    const fromQuery = getCriterionFromLocation();
    const fromAction = nextActions.find((item) => item.criterionKey)?.criterionKey;
    const nextCriterion = fromQuery ?? fromAction ?? coreStudentCriteria[0];
    initializedCriterionRef.current = true;
    selectCriterion(nextCriterion, setSelectedCriterion);
  }, [application, nextActions]);

  const openEvidenceDrawer = (criterion: Criterion) => {
    if (!canEditApplication) {
      toast.error("Hồ sơ đã nộp. Bạn chỉ có thể bổ sung khi cán bộ yêu cầu.");
      return;
    }
    if (isCriterionLockedForSupplement(criterion, isSupplementMode, supplementCriteria)) {
      toast.error("Tiêu chí này không được mở bổ sung trong đợt này.");
      return;
    }
    setEvidenceDrawerCriterion(criterion);
  };

  const saveMetric = async () => {
    if (!application || !selectedMetric || !canEditSelectedCriterion) return;
    const rawValue = metricDrafts[selectedMetric.metricType] ?? "";
    const value = Number(rawValue);
    if (!rawValue || !Number.isFinite(value)) {
      toast.error("Vui lòng nhập giá trị hợp lệ.");
      return;
    }
    const validationError = validateMetricValue(
      selectedMetric.metricType,
      value,
      selectedMetric.scale,
    );
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      await upsertMetric.mutateAsync({
        id: application.id,
        metricType: selectedMetric.metricType,
        value,
        scale: selectedMetric.scale,
      });
      setMetricDrafts((current) => ({ ...current, [selectedMetric.metricType]: "" }));
      toast.success("Đã lưu chỉ số.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu chỉ số.");
    }
  };

  const precheckNow = () => {
    if (!application) return;
    runPrecheck.mutate({ id: application.id, level: application.targetLevel });
  };

  const submitNow = () => {
    if (!application) return;
    if (!isSupplementMode && !hasSubmitCta) {
      toast.error("Bạn cần kiểm tra và hoàn thiện hồ sơ trước khi nộp.");
      return;
    }
    setConfirmSubmitOpen(true);
  };

  const confirmSubmit = () => {
    if (!application) return;
    const isSupplement =
      application.status === "supplement_required" ||
      String(application.status) === "draft_supplement";
    submitApplication.mutate(
      {
        id: application.id,
        allowSubmitWithWarnings: true,
        studentNote: isSupplement
          ? "Sinh viên đã bổ sung hồ sơ theo phản hồi."
          : "Sinh viên nộp hồ sơ xét duyệt.",
        successMessage: isSupplement
          ? "Đã gửi lại hồ sơ bổ sung. Cán bộ sẽ tiếp tục xét duyệt."
          : "Đã nộp hồ sơ thành công. Hồ sơ đang chờ cán bộ xét duyệt.",
      },
      { onSuccess: () => setConfirmSubmitOpen(false) },
    );
  };

  if (current.isLoading) {
    return <WorkspaceSkeleton />;
  }

  if (current.isError) {
    return (
      <>
        <PageHeader
          title="Hồ sơ & minh chứng"
          description="Hoàn thiện từng tiêu chí bằng cách thêm minh chứng phù hợp."
        />
        <EmptyState
          variant="error"
          title="Chưa tải được hồ sơ"
          description="Dữ liệu có thể đang mất kết nối tạm thời. Vui lòng thử lại."
          primaryAction={
            <AppButton size="sm" onClick={() => current.refetch()}>
              Thử tải lại
            </AppButton>
          }
        />
      </>
    );
  }

  if (!application) {
    return (
      <>
        <PageHeader
          title="Hồ sơ & minh chứng"
          description="Hoàn thiện từng tiêu chí bằng cách thêm minh chứng phù hợp."
        />
        <EmptyState
          title={`Chưa có hồ sơ Sinh viên 5 tốt năm học ${SCHOOL_YEAR}`}
          description="Tạo hồ sơ để bắt đầu chọn cấp đăng ký, thêm minh chứng và kiểm tra trước khi nộp."
          primaryAction={
            <AppButton
              onClick={() =>
                startApplication.mutate({
                  schoolYear: SCHOOL_YEAR,
                  applicationType: "individual",
                  targetLevel: "school",
                })
              }
              disabled={startApplication.isPending}
            >
              {startApplication.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Bắt đầu hồ sơ
            </AppButton>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Hồ sơ & minh chứng"
        description="Hoàn thiện từng tiêu chí bằng cách thêm minh chứng phù hợp."
        rightAction={
          <HeaderAction
            applicationStatus={application.status}
            canSubmit={canSubmitApplication}
            isPrechecking={runPrecheck.isPending}
            isSubmitting={submitApplication.isPending}
            onPrecheck={precheckNow}
            onSubmit={submitNow}
          />
        }
      />

      <div className="space-y-5 pb-8">
        <ApplicationMiniStatusBar
          application={application}
          completedCriteria={completedCriteria}
          isSupplementMode={isSupplementMode}
          onFeedbackClick={() => {
            const target = supplementRequests[0]?.criterion ?? selectedCriterion;
            selectCriterion(target, setSelectedCriterion);
          }}
          selectedLevel={application.targetLevel}
          canChangeLevel={canEditApplication && !isSupplementMode}
          onLevelChange={(targetLevel) =>
            updateTargetLevel.mutate({ id: application.id, targetLevel })
          }
          isChangingLevel={updateTargetLevel.isPending}
          statusBadge={summary.statusBadge}
        />

        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
          <CriteriaSidebar
            criteriaStates={criteriaStates}
            activeCriterion={selectedCriterion}
            onSelect={(criterion) => selectCriterion(criterion, setSelectedCriterion)}
          />

          <CriterionWorkspace
            applicationId={application.id}
            criterion={selectedCriterion}
            state={selectedState}
            evidences={selectedEvidences}
            evidenceLoading={evidencesQuery.isLoading}
            evidenceError={evidencesQuery.isError}
            canEdit={canEditSelectedCriterion}
            readonlyReason={getReadonlyReason({
              applicationStatus: application.status,
              isSupplementMode,
              isLockedForSupplement: isSelectedLocked,
            })}
            supplementRequest={selectedSupplementRequest}
            selectedMetric={selectedMetric}
            metricValue={metricDrafts[selectedMetric?.metricType ?? "gpa"] ?? ""}
            existingMetricValue={getMetricValue(metrics, selectedMetric?.metricType)}
            savingMetric={upsertMetric.isPending}
            onMetricChange={(value) =>
              selectedMetric
                ? setMetricDrafts((current) => ({
                    ...current,
                    [selectedMetric.metricType]: value,
                  }))
                : undefined
            }
            onSaveMetric={() => void saveMetric()}
            onAddEvidence={() => openEvidenceDrawer(selectedCriterion)}
            onViewEvidence={setSelectedEvidence}
            onDeleteEvidence={(evidence) => {
              if (!canEditSelectedCriterion) {
                toast.error("Tiêu chí này đang ở chế độ chỉ xem.");
                return;
              }
              setOptimisticEvidences((current) =>
                current.filter((item) => item.id !== evidence.id),
              );
              deleteEvidence.mutate({ id: evidence.id, applicationId: application.id });
            }}
          />

          <QuickGuidePanel
            applicationId={application.id}
            criterion={selectedCriterion}
            targetLevel={application.targetLevel}
            state={selectedState}
          />
        </div>

        <BottomActionBar
          nextActions={nextActions}
          isReadonly={isReadonlyStatus && !isSupplementMode}
          isPrechecking={runPrecheck.isPending}
          isSubmitting={submitApplication.isPending}
          canSubmit={canSubmitApplication}
          showSubmit={hasSubmitCta || isSupplementMode}
          onAction={(action) => {
            if (action.criterionKey) {
              selectCriterion(action.criterionKey, setSelectedCriterion);
              return;
            }
            precheckNow();
          }}
          onPrecheck={precheckNow}
          onSubmit={submitNow}
        />
      </div>

      {application.id && evidenceDrawerCriterion && canEditApplication ? (
        <AddEvidenceDrawer
          applicationId={application.id}
          open={Boolean(evidenceDrawerCriterion)}
          onOpenChange={(open) => {
            if (!open) setEvidenceDrawerCriterion(null);
          }}
          initialCriterion={evidenceDrawerCriterion}
          onCreated={(created) => {
            const nextEvidence = normalizeOptimisticEvidence(created, application.id);
            setOptimisticEvidences((current) => upsertEvidence(current, nextEvidence));
            selectCriterion(nextEvidence.criterion, setSelectedCriterion);
            void evidencesQuery.refetch();
          }}
        />
      ) : null}

      <EvidenceDetailModal evidence={selectedEvidence} onClose={() => setSelectedEvidence(null)} />

      {confirmSubmitOpen ? (
        <SubmitConfirmationModal
          application={application}
          precheck={precheck}
          evidenceCounts={
            Object.fromEntries(
              coreStudentCriteria.map((criterion) => [
                criterion,
                evidences.filter((item) => item.criterion === criterion).length,
              ]),
            ) as Partial<Record<Criterion, number>>
          }
          onCancel={() => setConfirmSubmitOpen(false)}
          onConfirm={confirmSubmit}
          pending={submitApplication.isPending}
        />
      ) : null}
    </>
  );
}

function HeaderAction({
  applicationStatus,
  canSubmit,
  isPrechecking,
  isSubmitting,
  onPrecheck,
  onSubmit,
}: {
  applicationStatus: string;
  canSubmit: boolean;
  isPrechecking: boolean;
  isSubmitting: boolean;
  onPrecheck: () => void;
  onSubmit: () => void;
}) {
  if (applicationStatus === "ready_to_submit") {
    return (
      <AppButton onClick={onSubmit} disabled={!canSubmit || isSubmitting} size="sm">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Nộp hồ sơ
      </AppButton>
    );
  }
  if (
    applicationStatus === "draft" ||
    applicationStatus === "prechecked" ||
    applicationStatus === "supplement_required"
  ) {
    return (
      <AppButton onClick={onPrecheck} disabled={isPrechecking} variant="secondary" size="sm">
        {isPrechecking ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ClipboardCheck className="h-4 w-4" />
        )}
        Kiểm tra hồ sơ
      </AppButton>
    );
  }
  if (applicationStatus === "under_review" || applicationStatus === "submitted") {
    return <StatusBadge tone="info" label="Hồ sơ đang được xét duyệt" />;
  }
  return null;
}

function ApplicationMiniStatusBar({
  application,
  completedCriteria,
  isSupplementMode,
  onFeedbackClick,
  selectedLevel,
  canChangeLevel,
  onLevelChange,
  isChangingLevel,
  statusBadge,
}: {
  application: ApplicationWithWorkspaceData;
  completedCriteria: number;
  isSupplementMode: boolean;
  onFeedbackClick: () => void;
  selectedLevel: Level;
  canChangeLevel: boolean;
  onLevelChange: (level: Level) => void;
  isChangingLevel: boolean;
  statusBadge: { label: string; tone: "good" | "warning" | "danger" | "neutral" | "info" };
}) {
  return (
    <SectionCard className="p-4">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={statusBadge.tone} label={statusBadge.label} />
            <span className="line-clamp-1 text-sm font-semibold text-slate-700">
              Hồ sơ SV5T cá nhân · {application.schoolYear} · Cấp đăng ký:{" "}
              {levelLabels[application.targetLevel]}
            </span>
          </div>
          <div className="mt-2 text-sm text-[var(--text-secondary)]">
            {completedCriteria}/5 tiêu chí tạm ổn
          </div>
        </div>
        {canChangeLevel ? (
          <label className="flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-700">
            <Target className="h-4 w-4 text-[#0057C2]" />
            <select
              value={selectedLevel}
              disabled={isChangingLevel}
              onChange={(event) => onLevelChange(event.target.value as Level)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#0057C2]"
            >
              {Object.keys(criteriaLevelSummaries).map((level) => (
                <option key={level} value={level}>
                  {levelLabels[level as Level]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {isSupplementMode ? (
        <div className="mt-3">
          <InlineAlert
            type="warning"
            title="Bạn có phản hồi cần xử lý"
            description="Vui lòng bổ sung đúng tiêu chí được yêu cầu."
            action={
              <AppButton onClick={onFeedbackClick} size="sm" variant="secondary">
                Xem phản hồi
              </AppButton>
            }
          />
        </div>
      ) : null}
    </SectionCard>
  );
}

function CriteriaSidebar({
  criteriaStates,
  activeCriterion,
  onSelect,
}: {
  criteriaStates: CriteriaState[];
  activeCriterion: Criterion;
  onSelect: (criterion: Criterion) => void;
}) {
  return (
    <aside className="min-w-0 xl:sticky xl:top-4">
      <div className="xl:hidden">
        <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:thin]">
          <div className="flex min-w-max gap-2">
            {criteriaStates.map((state) => (
              <CriterionNavItem
                key={state.key}
                state={state}
                active={state.key === activeCriterion}
                compact
                onClick={() => onSelect(state.key)}
              />
            ))}
          </div>
        </div>
      </div>
      <SectionCard title="5 tiêu chí" className="hidden p-3 xl:block">
        <div className="space-y-2">
          {criteriaStates.map((state) => (
            <CriterionNavItem
              key={state.key}
              state={state}
              active={state.key === activeCriterion}
              onClick={() => onSelect(state.key)}
            />
          ))}
        </div>
      </SectionCard>
    </aside>
  );
}

function CriterionNavItem({
  state,
  active,
  compact = false,
  onClick,
}: {
  state: CriteriaState;
  active: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  const Icon = criterionIcons[state.key] ?? FileText;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-w-0 rounded-2xl border text-left transition-colors",
        active
          ? "border-[#0057C2] bg-[#F1F7FD]"
          : "border-slate-200 bg-white hover:border-[#9FC4EA]",
        compact ? "w-[190px] shrink-0 p-3" : "w-full p-3",
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#0057C2]">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-[var(--text-primary)]">{state.label}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            <StatusBadge tone={state.tone} label={state.statusLabel} />
          </div>
          <p className="mt-2 truncate text-xs text-[var(--text-secondary)]">
            {state.evidenceCount} minh chứng
          </p>
        </div>
      </div>
    </button>
  );
}

function CriterionWorkspace({
  applicationId,
  criterion,
  state,
  evidences,
  evidenceLoading,
  evidenceError,
  canEdit,
  readonlyReason,
  supplementRequest,
  selectedMetric,
  metricValue,
  existingMetricValue,
  savingMetric,
  onMetricChange,
  onSaveMetric,
  onAddEvidence,
  onViewEvidence,
  onDeleteEvidence,
}: {
  applicationId: string;
  criterion: Criterion;
  state: CriteriaState;
  evidences: EvidenceResponse[];
  evidenceLoading: boolean;
  evidenceError: boolean;
  canEdit: boolean;
  readonlyReason?: string;
  supplementRequest?: SupplementRequest;
  selectedMetric: ReturnType<typeof getPrimaryMetricInput>;
  metricValue: string;
  existingMetricValue?: string;
  savingMetric: boolean;
  onMetricChange: (value: string) => void;
  onSaveMetric: () => void;
  onAddEvidence: () => void;
  onViewEvidence: (evidence: EvidenceResponse) => void;
  onDeleteEvidence: (evidence: EvidenceResponse) => void;
}) {
  const assistantHref = buildAssistantHref({
    applicationId,
    criterionKey: criterion,
    criterionLabel: state.label,
    source: "criterion",
  });

  return (
    <main className="min-w-0">
      <SectionCard className="min-w-0">
        <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{state.label}</h2>
              <StatusBadge tone={state.tone} label={state.statusLabel} />
            </div>
            <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              {state.description || getCriterionShortDescription(state)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            {canEdit ? (
              <AppButton onClick={onAddEvidence}>
                <Plus className="h-4 w-4" />
                Thêm minh chứng
              </AppButton>
            ) : null}
            <AppButton asChild variant="secondary">
              <Link to="/app/event-library">
                <Search className="h-4 w-4" />
                Tìm trong danh sách đã xác nhận
              </Link>
            </AppButton>
            <AppButton asChild variant="ghost">
              <Link to={toStudentAssistantHref(assistantHref)}>
                <Sparkles className="h-4 w-4" />
                Hỏi trợ lý
              </Link>
            </AppButton>
          </div>
        </div>

        {readonlyReason ? (
          <div className="mt-4">
            <InlineAlert type="info" title={readonlyReason} />
          </div>
        ) : null}

        {supplementRequest ? (
          <div className="mt-4">
            <InlineAlert
              type="warning"
              title="Cán bộ yêu cầu bổ sung tiêu chí này"
              description={[
                supplementRequest.reason,
                supplementRequest.deadline
                  ? `Hạn xử lý: ${formatDate(supplementRequest.deadline)}`
                  : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          </div>
        ) : null}

        {selectedMetric ? (
          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  {selectedMetric.label}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">
                  {existingMetricValue
                    ? `Đã ghi nhận: ${existingMetricValue}`
                    : "Nhập chỉ số nếu bạn có dữ liệu phù hợp."}
                </p>
              </div>
              {canEdit ? (
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                  <input
                    value={metricValue}
                    onChange={(event) => onMetricChange(event.target.value)}
                    inputMode="decimal"
                    placeholder={selectedMetric.placeholder}
                    className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0057C2]"
                  />
                  <AppButton onClick={onSaveMetric} disabled={savingMetric} size="sm">
                    {savingMetric ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Lưu chỉ số
                  </AppButton>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Minh chứng đã có" className="mt-5 min-w-0">
        {evidenceLoading ? (
          <EvidenceSkeletonList />
        ) : evidenceError ? (
          <EmptyState
            variant="error"
            title="Chưa tải được minh chứng"
            description="Vui lòng thử tải lại hoặc quay lại sau."
          />
        ) : evidences.length === 0 ? (
          <EmptyState
            variant="noData"
            title="Chưa có minh chứng cho tiêu chí này"
            description="Bạn cần thêm minh chứng để cán bộ có căn cứ xét tiêu chí."
            primaryAction={
              canEdit ? (
                <AppButton onClick={onAddEvidence} size="sm">
                  Thêm minh chứng
                </AppButton>
              ) : undefined
            }
            secondaryAction={
              <AppButton asChild variant="secondary" size="sm">
                <Link to="/app/event-library">Tìm trong danh sách đã xác nhận</Link>
              </AppButton>
            }
          />
        ) : (
          <div className="grid min-w-0 gap-3">
            {evidences.map((evidence) => (
              <StudentEvidenceCard
                key={evidence.id}
                evidence={evidence}
                applicationId={applicationId}
                canEdit={canEdit}
                onViewDetails={onViewEvidence}
                onDelete={onDeleteEvidence}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </main>
  );
}

function QuickGuidePanel({
  applicationId,
  criterion,
  targetLevel,
  state,
}: {
  applicationId: string;
  criterion: Criterion;
  targetLevel: Level;
  state: CriteriaState;
}) {
  const coreCriterion = criterion as CoreCriterion;
  const guide = criterionGuide[coreCriterion];
  const matrixItem = getCriterionMatrixItem(targetLevel, criterion);
  const assistantHref = buildAssistantHref({
    applicationId,
    criterionKey: criterion,
    criterionLabel: state.label,
    source: "criterion",
  });

  return (
    <aside className="min-w-0 xl:sticky xl:top-4">
      <SectionCard title="Hướng dẫn nhanh" className="min-w-0">
        <div className="space-y-4">
          <GuideBlock title="Yêu cầu chính" items={guide.main} />
          <GuideBlock title="Minh chứng hợp lệ" items={guide.valid} />
          <GuideBlock title="Lỗi thường gặp" items={guide.mistakes} />
          <AppButton asChild variant="secondary" size="sm" className="w-full">
            <Link to={toStudentAssistantHref(assistantHref)}>
              <Sparkles className="h-4 w-4" />
              Hỏi trợ lý về tiêu chí này
            </Link>
          </AppButton>
          <details className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <summary className="cursor-pointer text-sm font-bold text-[var(--text-primary)]">
              Xem điều kiện chi tiết
            </summary>
            <div className="mt-3 space-y-3 text-sm text-[var(--text-secondary)]">
              <p className="font-semibold text-slate-700">
                Trạng thái hiện tại: {state.statusLabel}
              </p>
              <ul className="space-y-2">
                {(matrixItem?.hardRequirements ?? []).map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0057C2]" />
                    <span>{item}</span>
                  </li>
                ))}
                {(matrixItem?.additionalRequirements ?? []).map((item) => (
                  <li key={item} className="flex gap-2">
                    <BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0057C2]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </div>
      </SectionCard>
    </aside>
  );
}

function GuideBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-sm leading-5 text-[var(--text-secondary)]">
        {items.slice(0, 3).map((item) => (
          <li key={item} className="line-clamp-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BottomActionBar({
  nextActions,
  isReadonly,
  isPrechecking,
  isSubmitting,
  canSubmit,
  showSubmit,
  onAction,
  onPrecheck,
  onSubmit,
}: {
  nextActions: NextAction[];
  isReadonly: boolean;
  isPrechecking: boolean;
  isSubmitting: boolean;
  canSubmit: boolean;
  showSubmit: boolean;
  onAction: (action: NextAction) => void;
  onPrecheck: () => void;
  onSubmit: () => void;
}) {
  if (isReadonly) {
    return (
      <InlineAlert
        type="info"
        title="Hồ sơ đã nộp"
        description="Bạn chỉ có thể bổ sung khi cán bộ yêu cầu."
      />
    );
  }
  return (
    <SectionCard className="p-4">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-bold text-[var(--text-primary)]">Bước tiếp theo</div>
          <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">
            {nextActions[0]?.title ?? "Kiểm tra nhanh trước khi nộp chính thức."}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {nextActions[0] ? (
            <AppButton onClick={() => onAction(nextActions[0])} variant="secondary" size="sm">
              {nextActions[0].actionLabel}
            </AppButton>
          ) : null}
          <AppButton onClick={onPrecheck} disabled={isPrechecking} variant="secondary" size="sm">
            {isPrechecking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ClipboardCheck className="h-4 w-4" />
            )}
            Kiểm tra hồ sơ
          </AppButton>
          {showSubmit ? (
            <AppButton onClick={onSubmit} disabled={!canSubmit || isSubmitting} size="sm">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Nộp hồ sơ
            </AppButton>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}

function WorkspaceSkeleton() {
  return (
    <>
      <PageHeader
        title="Hồ sơ & minh chứng"
        description="Hoàn thiện từng tiêu chí bằng cách thêm minh chứng phù hợp."
      />
      <div className="space-y-5">
        <SkeletonBlock className="h-24" />
        <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
          <SkeletonBlock className="h-80" />
          <SkeletonBlock className="h-96" />
          <SkeletonBlock className="h-80" />
        </div>
      </div>
    </>
  );
}

function EvidenceSkeletonList() {
  return (
    <div className="grid gap-3">
      <SkeletonBlock className="h-28" />
      <SkeletonBlock className="h-28" />
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-slate-200/70", className)} />;
}

function mapSupplementRequests(tasks: ApplicationReviewTaskSummary[]): SupplementRequest[] {
  return tasks
    .filter((task) => task.status === "supplement_required")
    .map((task) => ({
      id: task.id,
      criterion: task.criterion,
      reason:
        task.supplementRequestJson?.reason ??
        task.decisionReason ??
        task.officerNote ??
        "Cán bộ yêu cầu bổ sung minh chứng cho tiêu chí này.",
      deadline: task.supplementRequestJson?.deadline ?? task.dueDate ?? null,
      requestedFields: task.supplementRequestJson?.requestedFields ?? [],
    }));
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

function mergeOptimisticEvidences(
  serverEvidences: EvidenceResponse[],
  optimisticEvidences: EvidenceResponse[],
  applicationId?: string,
) {
  if (!optimisticEvidences.length) return serverEvidences;
  const merged = new Map<string, EvidenceResponse>();
  serverEvidences.forEach((item) => item.id && merged.set(item.id, item));
  optimisticEvidences.forEach((item) => {
    if (!item.id) return;
    if (applicationId && item.applicationId && item.applicationId !== applicationId) return;
    merged.set(item.id, { ...merged.get(item.id), ...item });
  });
  return Array.from(merged.values()).sort((left, right) =>
    String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")),
  );
}

function normalizeOptimisticEvidence(
  evidence: EvidenceResponse,
  applicationId: string,
): EvidenceResponse {
  return {
    ...evidence,
    applicationId: evidence.applicationId ?? applicationId,
    criterion: evidence.criterion ?? "academic",
    createdAt: evidence.createdAt || new Date().toISOString(),
    updatedAt: evidence.updatedAt || new Date().toISOString(),
  };
}

function upsertEvidence(list: EvidenceResponse[], evidence: EvidenceResponse) {
  const next = new Map(list.map((item) => [item.id, item]));
  next.set(evidence.id, { ...next.get(evidence.id), ...evidence });
  return Array.from(next.values());
}

function selectCriterion(
  criterion: Criterion,
  setSelectedCriterion: (criterion: Criterion) => void,
) {
  if (!coreStudentCriteria.includes(criterion)) return;
  setSelectedCriterion(criterion);
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("criterion", criterion);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function getCriterionFromLocation(): Criterion | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("criterion") as Criterion | null;
  return raw && coreStudentCriteria.includes(raw) ? raw : null;
}

function buildAssistantHref({
  applicationId,
  criterionKey,
  criterionLabel,
  source,
}: {
  applicationId?: string;
  criterionKey?: string;
  criterionLabel?: string;
  source: "criterion";
}) {
  const params = new URLSearchParams({ source });
  if (applicationId) params.set("applicationId", applicationId);
  if (criterionKey) params.set("criterionKey", criterionKey);
  if (criterionLabel) params.set("criterionLabel", criterionLabel);
  return `/app/assistant?${params.toString()}`;
}

function toStudentAssistantHref(href: string) {
  return href as "/app/assistant";
}

function isCriterionLockedForSupplement(
  criterion: Criterion,
  isSupplementMode: boolean,
  supplementCriteria: Set<Criterion>,
) {
  return isSupplementMode && supplementCriteria.size > 0 && !supplementCriteria.has(criterion);
}

function getReadonlyReason({
  applicationStatus,
  isSupplementMode,
  isLockedForSupplement,
}: {
  applicationStatus: string;
  isSupplementMode: boolean;
  isLockedForSupplement: boolean;
}) {
  if (isLockedForSupplement) return "Tiêu chí này không nằm trong yêu cầu bổ sung hiện tại.";
  if (isSupplementMode) return undefined;
  if (readonlyStatuses.includes(applicationStatus)) {
    return "Hồ sơ đã nộp. Bạn chỉ có thể bổ sung khi cán bộ yêu cầu.";
  }
  return undefined;
}

function getCriterionShortDescription(state: CriteriaState) {
  if (state.evidenceCount === 0) {
    return "Tiêu chí này chưa có minh chứng. Hãy thêm minh chứng để cán bộ có căn cứ xét.";
  }
  if (state.warningCount > 0) {
    return `Có ${state.warningCount} mục đang cần kiểm tra. Bạn có thể xem lại hoặc hỏi trợ lý.`;
  }
  return "Tiêu chí đã có dữ liệu cơ bản. Bạn có thể kiểm tra lại trước khi nộp.";
}

function getMetricValue(metrics: ApplicationMetric[], metricType?: MetricType) {
  if (!metricType) return undefined;
  const metric = metrics.find((item) => item.metricType === metricType);
  if (!metric) return undefined;
  return String(metric.value ?? metric.valueNumber ?? metric.valueText ?? "");
}

function validateMetricValue(metricType: MetricType, value: number, scale?: number) {
  if (!Number.isFinite(value)) return "Vui lòng nhập giá trị hợp lệ.";
  if (scale && (value < 0 || value > scale)) return `Giá trị phải nằm trong khoảng 0-${scale}.`;
  if (metricType === "gpa" && value < 0) return "GPA không được nhỏ hơn 0.";
  if (metricType === "conduct_score" && (value < 0 || value > 100))
    return "Điểm rèn luyện phải nằm trong khoảng 0-100.";
  if (metricType === "physical_score" && (value < 0 || value > 10))
    return "Điểm thể lực phải nằm trong khoảng 0-10.";
  return null;
}

function formatDate(value?: string | null) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
