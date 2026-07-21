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
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  useCurrentApplication,
  useCriteriaCompletion,
  useAddIntegrationPathResponse,
  useAddPhysicalPathEvidence,
  useAddVolunteerActivity,
  useDeclareAcademicGpa,
  useDeclareEthicsConductScore,
  useDeclarePhysicalCourseResult,
  useLatestPrecheck,
  usePrecheck,
  useStartApplication,
  useSubmitApplication,
  useUpdateTargetLevel,
  useUpsertMetric,
} from "@/features/application/hooks/useApplication";
import { SubmitConfirmationModal } from "@/features/application/components/SubmitConfirmationModal";
import {
  applyActionPresentationToUiAction,
  applyCriterionDisplayToUiState,
  formatSourceList,
  getRequirementChipLabel,
  getRequirementFieldLabel,
  getRequirementPresentation,
  getResponseSourcePresentation,
  getStudentCriterionDisplayState,
} from "@/features/application/presentation";
import { useAuth } from "@/features/auth/store/auth-store";
import { AddEvidenceDrawer } from "@/features/evidence/components/AddEvidenceDrawer";
import { EvidenceDetailModal } from "@/features/evidence/components/EvidenceDetailModal";
import { StudentEvidenceCard } from "@/features/evidence/components/StudentEvidenceCard";
import { useDeleteEvidence, useEvidences } from "@/features/evidence/hooks/useEvidence";
import { OfficialEventLibraryDialog } from "@/features/event/components/OfficialEventLibraryStudent";
import { officialEventLibraryTitleForCriterion } from "@/features/event/components/official-event-library-copy";
import { StudentAssistantExplanation } from "@/features/student-assistant/components/StudentAssistantExplanation";
import { SupplementCoachWorkspace } from "@/features/student-assistant/components/SupplementCoachWorkspace";
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
import { PRESENTATION_SEMANTICS_V2 } from "@/lib/presentation-semantics";
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
  CriterionCompletionItem,
  Criterion,
  EvidenceResponse,
  Level,
  MetricType,
  PrecheckResult,
  RequirementItem,
  RequirementResponse,
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

type CriteriaState = ReturnType<typeof getCriteriaUiState> & {
  completionText?: string;
  completionSource?: "criteria_completion";
};
type NextAction = ReturnType<typeof getNextActions>[number] & { isInteractive?: boolean };

type SupplementRequest = {
  id: string;
  criterion: Criterion;
  reason: string;
  deadline?: string | null;
  requestedFields: string[];
};

type EvidenceDrawerContext = {
  criterion: Criterion;
  requirementKey?: string;
  requirementLabel?: string;
  suggestedEventId?: string;
};

type IntegrationRequirementKey =
  | "foreign_language"
  | "skills_or_union_training"
  | "international_exchange"
  | "foreign_language_or_integration_competition"
  | "student_union_achievement";

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
  const declareEthicsConductScore = useDeclareEthicsConductScore();
  const declareAcademicGpa = useDeclareAcademicGpa();
  const declarePhysicalCourseResult = useDeclarePhysicalCourseResult();
  const addPhysicalPathEvidence = useAddPhysicalPathEvidence();
  const addVolunteerActivity = useAddVolunteerActivity();
  const addIntegrationPathResponse = useAddIntegrationPathResponse();
  const runPrecheck = usePrecheck();
  const submitApplication = useSubmitApplication();
  const deleteEvidence = useDeleteEvidence();

  const application = current.data?.application as ApplicationWithWorkspaceData | null | undefined;
  const applicationId = application?.id;
  const evidencesQuery = useEvidences(applicationId, { limit: 100 });
  const latestPrecheck = useLatestPrecheck(applicationId);
  const criteriaCompletion = useCriteriaCompletion(applicationId);
  const [selectedCriterion, setSelectedCriterion] = useState<Criterion>(
    () => getCriterionFromLocation() ?? "ethics",
  );
  const [evidenceDrawerContext, setEvidenceDrawerContext] = useState<EvidenceDrawerContext | null>(
    null,
  );
  const [eventLibraryOpen, setEventLibraryOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceResponse | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [optimisticEvidences, setOptimisticEvidences] = useState<EvidenceResponse[]>([]);
  const [metricDrafts, setMetricDrafts] = useState<Partial<Record<MetricType, string>>>({});
  const [gpaScale, setGpaScale] = useState<4 | 10>(4);
  const initializedCriterionRef = useRef(false);
  const handledUploadEvidenceRequestRef = useRef(false);
  const handledEvidenceConfirmRequestRef = useRef(false);
  const handledSuggestedImportRequestRef = useRef(false);

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
  const completionItems = useMemo(
    () => normalizeCriteriaCompletionItems(criteriaCompletion.data),
    [criteriaCompletion.data],
  );
  const criteriaStates = useMemo(
    () =>
      coreStudentCriteria.map((criterion) =>
        buildWorkspaceCriterionState({
          application,
          completion: completionItems.find((item) => item.criterion === criterion),
          criterion,
          evidences,
          precheck,
          supplementRequest: supplementRequests.find((item) => item.criterion === criterion),
        }),
      ),
    [application, completionItems, evidences, precheck, supplementRequests],
  );
  const summary = getStudentApplicationSummary(
    application ? { ...application, evidences } : null,
    precheck,
    null,
    [],
    criteriaStates,
  );
  const nextActions = useMemo(
    () =>
      getNextActions(
        application ? { ...application, evidences } : null,
        criteriaStates,
        [],
        precheck,
      ).map((action) =>
        PRESENTATION_SEMANTICS_V2 ? applyActionPresentationToUiAction(action) : action,
      ),
    [application, criteriaStates, evidences, precheck],
  );
  const selectedState =
    criteriaStates.find((item) => item.key === selectedCriterion) ?? criteriaStates[0];
  const selectedCompletion = completionItems.find((item) => item.criterion === selectedCriterion);
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
  const selectedSupportsOfficialEventImport = supportsOfficialEventImport(selectedCompletion);
  const completedCriteria = criteriaStates.filter((item) => item.status === "ok").length;
  const canSubmitPrecheckedApplication = application?.status === "prechecked";
  const hasSubmitCta =
    application?.status === "ready_to_submit" ||
    canSubmitPrecheckedApplication ||
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

  const openEvidenceDrawer = useCallback(
    (criterion: Criterion, context?: Omit<EvidenceDrawerContext, "criterion">) => {
      if (!canEditApplication) {
        toast.error("Hồ sơ đã nộp. Bạn chỉ có thể bổ sung khi cán bộ yêu cầu.");
        return;
      }
      if (isCriterionLockedForSupplement(criterion, isSupplementMode, supplementCriteria)) {
        toast.error("Tiêu chí này không được mở bổ sung trong đợt này.");
        return;
      }
      setEvidenceDrawerContext({ criterion, ...context });
    },
    [canEditApplication, isSupplementMode, supplementCriteria],
  );

  useEffect(() => {
    if (!application || handledUploadEvidenceRequestRef.current) return;
    const requestedCriterion = getUploadEvidenceCriterionFromLocation();
    if (!requestedCriterion) return;
    handledUploadEvidenceRequestRef.current = true;
    selectCriterion(requestedCriterion, setSelectedCriterion);
    clearUploadEvidenceRequestFromLocation();
    openEvidenceDrawer(requestedCriterion);
  }, [application, canEditApplication, isSupplementMode, openEvidenceDrawer, supplementCriteria]);

  useEffect(() => {
    if (!application || handledEvidenceConfirmRequestRef.current) return;
    const evidenceId = getEvidenceConfirmRequestFromLocation();
    if (!evidenceId) return;
    const evidence = evidences.find((item) => item.id === evidenceId);
    if (!evidence) return;
    handledEvidenceConfirmRequestRef.current = true;
    selectCriterion(evidence.criterion, setSelectedCriterion);
    setSelectedEvidence(evidence);
  }, [application, evidences]);

  useEffect(() => {
    if (!application || handledSuggestedImportRequestRef.current) return;
    const request = getSuggestedEventImportRequestFromLocation();
    if (!request) return;
    handledSuggestedImportRequestRef.current = true;
    selectCriterion(request.criterion, setSelectedCriterion);
    openEvidenceDrawer(request.criterion, { suggestedEventId: request.eventId });
  }, [application, openEvidenceDrawer]);

  const openOfficialEventLibrary = () => {
    if (!selectedSupportsOfficialEventImport) {
      toast.error("Tiêu chí này chưa hỗ trợ tìm minh chứng từ kho chính thức.");
      return;
    }
    if (!canEditSelectedCriterion) {
      toast.error("Tiêu chí này đang ở chế độ chỉ xem.");
      return;
    }
    setEventLibraryOpen(true);
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
      selectedMetric.metricType === "gpa" ? gpaScale : selectedMetric.scale,
    );
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      if (selectedMetric.metricType === "conduct_score") {
        await declareEthicsConductScore.mutateAsync({
          id: application.id,
          value,
          scale: typeof selectedMetric.scale === "number" ? selectedMetric.scale : 100,
          schoolYear: application.schoolYear,
        });
      } else if (selectedMetric.metricType === "gpa") {
        await declareAcademicGpa.mutateAsync({
          id: application.id,
          value,
          scale: gpaScale,
          schoolYear: application.schoolYear,
        });
      } else {
        await upsertMetric.mutateAsync({
          id: application.id,
          metricType: selectedMetric.metricType,
          value,
          scale: selectedMetric.scale,
        });
      }
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

      <div className="space-y-4 pb-6">
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

        {criteriaCompletion.isLoading ? (
          <InlineAlert type="info" title="Đang tải trạng thái điều kiện của từng tiêu chí." />
        ) : criteriaCompletion.isError ? (
          <InlineAlert
            type="warning"
            title="Chưa tải được trạng thái điều kiện"
            description="Màn hình đang tạm dùng dữ liệu minh chứng và tiền kiểm hiện có."
          />
        ) : criteriaCompletion.data && completionItems.length === 0 ? (
          <InlineAlert
            type="info"
            title="Chưa có cấu hình điều kiện để hiển thị"
            description="Bạn vẫn có thể bổ sung chỉ số và minh chứng như bình thường."
          />
        ) : null}

        <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[220px_minmax(0,1fr)_280px] 2xl:grid-cols-[240px_minmax(0,1fr)_300px]">
          <CriteriaSidebar
            criteriaStates={criteriaStates}
            activeCriterion={selectedCriterion}
            onSelect={(criterion) => selectCriterion(criterion, setSelectedCriterion)}
          />

          <CriterionWorkspace
            applicationId={application.id}
            schoolYear={application.schoolYear}
            criterion={selectedCriterion}
            state={selectedState}
            completion={selectedCompletion}
            precheck={precheck}
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
            gpaScale={gpaScale}
            onGpaScaleChange={setGpaScale}
            savingMetric={
              upsertMetric.isPending ||
              declareEthicsConductScore.isPending ||
              declareAcademicGpa.isPending
            }
            savingCourseResult={declarePhysicalCourseResult.isPending}
            onDeclareCourseResult={(input) =>
              declarePhysicalCourseResult.mutateAsync({
                id: application.id,
                ...input,
              })
            }
            savingActivity={addVolunteerActivity.isPending}
            onAddActivity={(input) =>
              addVolunteerActivity.mutateAsync({
                id: application.id,
                ...input,
              })
            }
            savingIntegrationPath={addIntegrationPathResponse.isPending}
            onAddIntegrationPath={(input) =>
              addIntegrationPathResponse.mutateAsync({
                id: application.id,
                ...input,
              })
            }
            onMetricChange={(value) =>
              selectedMetric
                ? setMetricDrafts((current) => ({
                    ...current,
                    [selectedMetric.metricType]: value,
                  }))
                : undefined
            }
            onSaveMetric={() => void saveMetric()}
            onAddEvidence={(context) => openEvidenceDrawer(selectedCriterion, context)}
            canFindOfficialEvent={canEditSelectedCriterion && selectedSupportsOfficialEventImport}
            onFindOfficialEvent={openOfficialEventLibrary}
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
          activeCriterion={selectedCriterion}
          activeState={selectedState}
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

      {application.id ? (
        <OfficialEventLibraryDialog
          open={eventLibraryOpen}
          applicationId={application.id}
          title={officialEventLibraryTitleForCriterion(selectedCriterion)}
          criterion={selectedCriterion}
          hideCriterionFilters
          onOpenChange={setEventLibraryOpen}
          onManualUpload={(criterion) => openEvidenceDrawer(criterion)}
          onImported={(evidence, item) => {
            selectCriterion(item.criterion, setSelectedCriterion);
            if (evidence) {
              const nextEvidence = normalizeOptimisticEvidence(evidence, application.id);
              setOptimisticEvidences((current) => upsertEvidence(current, nextEvidence));
              setSelectedEvidence(nextEvidence);
            }
            void evidencesQuery.refetch();
          }}
        />
      ) : null}

      {application.id && evidenceDrawerContext && canEditApplication ? (
        <AddEvidenceDrawer
          applicationId={application.id}
          open={Boolean(evidenceDrawerContext)}
          onOpenChange={(open) => {
            if (!open) {
              setEvidenceDrawerContext(null);
              clearSuggestedEventImportRequestFromLocation();
            }
          }}
          initialCriterion={evidenceDrawerContext.criterion}
          initialRequirementKey={
            PRESENTATION_SEMANTICS_V2 ? evidenceDrawerContext.requirementKey : undefined
          }
          initialRequirementLabel={
            PRESENTATION_SEMANTICS_V2 ? evidenceDrawerContext.requirementLabel : undefined
          }
          preselectedEventId={evidenceDrawerContext.suggestedEventId}
          onCreated={(created) => {
            const nextEvidence = normalizeOptimisticEvidence(created, application.id);
            setOptimisticEvidences((current) => upsertEvidence(current, nextEvidence));
            selectCriterion(nextEvidence.criterion, setSelectedCriterion);
            if (
              nextEvidence.criterion === "physical" &&
              isPhysicalPathRequirementKey(evidenceDrawerContext.requirementKey)
            ) {
              addPhysicalPathEvidence.mutate({
                id: application.id,
                requirementKey: evidenceDrawerContext.requirementKey,
                evidenceId: nextEvidence.id,
              });
            }
            void evidencesQuery.refetch();
          }}
        />
      ) : null}

      <EvidenceDetailModal
        evidence={selectedEvidence}
        applicationId={application.id}
        canEdit={canEditApplication}
        initialMode={getEvidenceConfirmRequestFromLocation() ? "confirm" : "view"}
        onChanged={() => {
          void evidencesQuery.refetch();
          void latestPrecheck.refetch();
          void criteriaCompletion.refetch();
        }}
        onClose={() => {
          setSelectedEvidence(null);
          clearEvidenceConfirmRequestFromLocation();
        }}
      />

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

function buildWorkspaceCriterionState({
  application,
  completion,
  criterion,
  evidences,
  precheck,
  supplementRequest,
}: {
  application?: ApplicationWithWorkspaceData | null;
  completion?: CriterionCompletionItem;
  criterion: Criterion;
  evidences: EvidenceResponse[];
  precheck: PrecheckResult | null;
  supplementRequest?: SupplementRequest;
}) {
  const base = applyCompletionToCriteriaState(
    getCriteriaUiState(criterion, evidences, precheck, []),
    completion,
  );
  if (!PRESENTATION_SEMANTICS_V2) return base;
  const display = getStudentCriterionDisplayState({
    criterion,
    application,
    completion,
    reviewTask: application?.reviewTasks?.find((item) => item.criterion === criterion),
    supplementRequest,
    precheckAction: precheck?.criteriaResults?.find((item) => item.criterion === criterion)
      ?.nextAction,
  });
  return applyCriterionDisplayToUiState(base, display);
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
            {completedCriteria}/5 tiêu chí sẵn sàng kiểm tra
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
            {state.completionText ?? `${state.evidenceCount} minh chứng`}
          </p>
        </div>
      </div>
    </button>
  );
}

function CriterionWorkspace({
  applicationId,
  schoolYear,
  criterion,
  state,
  completion,
  precheck,
  evidences,
  evidenceLoading,
  evidenceError,
  canEdit,
  readonlyReason,
  supplementRequest,
  selectedMetric,
  metricValue,
  existingMetricValue,
  gpaScale,
  onGpaScaleChange,
  savingMetric,
  savingCourseResult,
  onDeclareCourseResult,
  savingActivity,
  onAddActivity,
  savingIntegrationPath,
  onAddIntegrationPath,
  onMetricChange,
  onSaveMetric,
  onAddEvidence,
  canFindOfficialEvent,
  onFindOfficialEvent,
  onViewEvidence,
  onDeleteEvidence,
}: {
  applicationId: string;
  schoolYear: string;
  criterion: Criterion;
  state: CriteriaState;
  completion?: CriterionCompletionItem;
  precheck: PrecheckResult | null;
  evidences: EvidenceResponse[];
  evidenceLoading: boolean;
  evidenceError: boolean;
  canEdit: boolean;
  readonlyReason?: string;
  supplementRequest?: SupplementRequest;
  selectedMetric: ReturnType<typeof getPrimaryMetricInput>;
  metricValue: string;
  existingMetricValue?: string;
  gpaScale: 4 | 10;
  onGpaScaleChange: (scale: 4 | 10) => void;
  savingMetric: boolean;
  savingCourseResult: boolean;
  onDeclareCourseResult: (input: {
    resultType: "score" | "classification";
    value?: number;
    classification?: string;
    schoolYear: string;
    replaceExisting?: boolean;
  }) => Promise<unknown>;
  savingActivity: boolean;
  onAddActivity: (input: {
    requirementKey: "accumulated_volunteer_days" | "activity_count";
    activityType: string;
    activityName: string;
    organizer?: string;
    organizerLevel?: string;
    startDate?: string;
    endDate?: string;
    declaredValue?: number;
    declaredUnit?: "day" | "session" | "event" | "donation";
  }) => Promise<unknown>;
  savingIntegrationPath: boolean;
  onAddIntegrationPath: (input: {
    requirementKey: IntegrationRequirementKey;
    payloadJson: Record<string, unknown>;
  }) => Promise<unknown>;
  onMetricChange: (value: string) => void;
  onSaveMetric: () => void;
  onAddEvidence: (context?: { requirementKey?: string; requirementLabel?: string }) => void;
  canFindOfficialEvent: boolean;
  onFindOfficialEvent: () => void;
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
      <SectionCard className="min-w-0 p-4">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{state.label}</h2>
              <StatusBadge tone={state.tone} label={state.statusLabel} />
            </div>
            <p className="mt-1 line-clamp-2 max-w-3xl text-sm leading-5 text-[var(--text-secondary)]">
              {state.description || getCriterionShortDescription(state)}
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap gap-2">
            {canEdit && canFindOfficialEvent ? (
              <AppButton onClick={onFindOfficialEvent} className="w-full sm:w-auto">
                <Search className="h-4 w-4" />
                Tìm trong kho
              </AppButton>
            ) : null}
            {canEdit ? (
              <AppButton
                onClick={() => onAddEvidence()}
                variant={canFindOfficialEvent ? "secondary" : "primary"}
                className="w-full sm:w-auto"
              >
                <Upload className="h-4 w-4" />
                Tải minh chứng từ máy
              </AppButton>
            ) : null}
            <AppButton asChild variant="ghost" className="w-full sm:w-auto">
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
          <div className="mt-4 space-y-3">
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
            <SupplementCoachWorkspace
              applicationId={applicationId}
              reviewTaskId={supplementRequest.id}
              criterion={criterion}
              officialMessage={supplementRequest.reason}
              deadline={supplementRequest.deadline}
              requestedFields={supplementRequest.requestedFields}
            />
          </div>
        ) : null}

        {precheck ? (
          <div className="mt-4">
            <StudentAssistantExplanation
              params={{
                contextType: "precheck",
                contextId: applicationId,
                applicationId,
                criterion,
                schoolYear,
              }}
              title="Giải thích tiền kiểm"
              compact
            />
          </div>
        ) : null}

        {criterion === "ethics" && completion ? (
          <EthicsRequirementPanel
            completion={completion}
            selectedMetric={selectedMetric}
            metricValue={metricValue}
            existingMetricValue={existingMetricValue}
            canEdit={canEdit}
            savingMetric={savingMetric}
            onMetricChange={onMetricChange}
            onSaveMetric={onSaveMetric}
            onAddEvidence={onAddEvidence}
          />
        ) : criterion === "academic" && completion ? (
          <AcademicRequirementPanel
            completion={completion}
            selectedMetric={selectedMetric}
            metricValue={metricValue}
            existingMetricValue={existingMetricValue}
            gpaScale={gpaScale}
            onGpaScaleChange={onGpaScaleChange}
            canEdit={canEdit}
            savingMetric={savingMetric}
            onMetricChange={onMetricChange}
            onSaveMetric={onSaveMetric}
            onAddEvidence={onAddEvidence}
          />
        ) : criterion === "physical" && completion ? (
          <PhysicalRequirementPanel
            schoolYear={schoolYear}
            completion={completion}
            canEdit={canEdit}
            savingCourseResult={savingCourseResult}
            onDeclareCourseResult={onDeclareCourseResult}
            onAddEvidence={onAddEvidence}
          />
        ) : criterion === "volunteer" && completion ? (
          <VolunteerRequirementPanel
            completion={completion}
            canEdit={canEdit}
            savingActivity={savingActivity}
            onAddActivity={onAddActivity}
            onAddEvidence={onAddEvidence}
          />
        ) : criterion === "integration" && completion ? (
          <IntegrationRequirementPanel
            completion={completion}
            canEdit={canEdit}
            savingPath={savingIntegrationPath}
            onAddPath={onAddIntegrationPath}
            onAddEvidence={onAddEvidence}
          />
        ) : selectedMetric ? (
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

      <SectionCard title="Minh chứng đã có" className="mt-4 min-w-0 p-4">
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
                <AppButton onClick={() => onAddEvidence()} size="sm">
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
          <div className="grid min-w-0 gap-2.5">
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

function EthicsRequirementPanel({
  completion,
  selectedMetric,
  metricValue,
  existingMetricValue,
  canEdit,
  savingMetric,
  onMetricChange,
  onSaveMetric,
  onAddEvidence,
}: {
  completion: CriterionCompletionItem;
  selectedMetric: ReturnType<typeof getPrimaryMetricInput>;
  metricValue: string;
  existingMetricValue?: string;
  canEdit: boolean;
  savingMetric: boolean;
  onMetricChange: (value: string) => void;
  onSaveMetric: () => void;
  onAddEvidence: (context?: { requirementKey?: string; requirementLabel?: string }) => void;
}) {
  const conduct = findRequirement(completion, "conduct_score");
  const noViolation = findRequirement(completion, "no_violation");
  const additionalGroup = (completion.requirementGroups ?? []).find(
    (group) => group.key === "ethics_additional_achievements",
  );

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
        <div className="text-sm font-bold text-[var(--text-primary)]">Dữ liệu nền</div>
        <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
          <EthicsRequirementRow
            title="Điểm rèn luyện"
            requirement={conduct}
            value={
              getRequirementDisplayValue(conduct) ??
              (existingMetricValue ? `${existingMetricValue}/100` : "Chưa có")
            }
            source={getDisplayRequirementSourceLabel(conduct)}
            action={
              canEdit && selectedMetric ? (
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
                    Lưu điểm
                  </AppButton>
                </div>
              ) : (
                (conduct?.nextAction?.label ?? "Nhập hoặc liên kết điểm rèn luyện")
              )
            }
          />
          <EthicsRequirementRow
            title="Tình trạng vi phạm"
            requirement={noViolation}
            value={getRequirementDisplayValue(noViolation) ?? "Chưa có xác nhận"}
            source={getDisplayRequirementSourceLabel(noViolation)}
            action={noViolationActionLabel(noViolation)}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-bold text-[var(--text-primary)]">
              Thành tích đạo đức bổ sung
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {additionalGroup?.optional
                ? "Không bắt buộc ở cấp hiện tại"
                : "Cần bổ sung theo cấu hình hiện tại"}
            </p>
          </div>
          {canEdit ? (
            <AppButton onClick={() => onAddEvidence()} variant="secondary" size="sm">
              <Upload className="h-4 w-4" />
              Bổ sung giấy xác nhận
            </AppButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AcademicRequirementPanel({
  completion,
  selectedMetric,
  metricValue,
  existingMetricValue,
  gpaScale,
  onGpaScaleChange,
  canEdit,
  savingMetric,
  onMetricChange,
  onSaveMetric,
  onAddEvidence,
}: {
  completion: CriterionCompletionItem;
  selectedMetric: ReturnType<typeof getPrimaryMetricInput>;
  metricValue: string;
  existingMetricValue?: string;
  gpaScale: 4 | 10;
  onGpaScaleChange: (scale: 4 | 10) => void;
  canEdit: boolean;
  savingMetric: boolean;
  onMetricChange: (value: string) => void;
  onSaveMetric: () => void;
  onAddEvidence: (context?: { requirementKey?: string; requirementLabel?: string }) => void;
}) {
  const gpa = findRequirement(completion, "academic_gpa");
  const noFGrade = findRequirement(completion, "no_f_grade");
  const period = findRequirement(completion, "academic_period_valid");
  const additionalGroup = (completion.requirementGroups ?? []).find(
    (group) => group.key === "academic_additional_achievement",
  );
  const gpaPayload = toRecord(getLatestRequirementResponse(gpa)?.payloadJson);
  const evidenceTypes = getGroupEvidenceTypes(additionalGroup);

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
        <div className="text-sm font-bold text-[var(--text-primary)]">Kết quả học tập</div>
        <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
          <AcademicInfoRow
            label="Thang điểm"
            value={formatPayloadNumber(gpaPayload.rawScale) ?? String(gpaScale)}
          />
          <AcademicInfoRow
            label="GPA/ĐTB"
            value={
              getRequirementDisplayValue(gpa) ??
              (existingMetricValue ? `${existingMetricValue}/${gpaScale}` : "Chưa có")
            }
          />
          <AcademicInfoRow
            label="Năm học"
            value={stringFromPayload(gpaPayload.schoolYear) ?? "Cần xác minh"}
          />
          <AcademicInfoRow label="Nguồn dữ liệu" value={getDisplayRequirementSourceLabel(gpa)} />
          <AcademicInfoRow
            label="Trạng thái xác minh"
            value={academicGpaStatusLabel(gpa)}
            badgeTone={mapRequirementStatus(gpa?.status ?? "not_started").tone}
          />
          <AcademicInfoRow
            label="Tình trạng điểm F"
            value={noFGradeActionLabel(noFGrade)}
            badgeTone={mapRequirementStatus(noFGrade?.status ?? "not_started").tone}
          />
          <AcademicInfoRow
            label="Xác minh năm học"
            value={academicPeriodLabel(period)}
            badgeTone={mapRequirementStatus(period?.status ?? "not_started").tone}
          />
        </div>

        {canEdit && selectedMetric ? (
          <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row">
            <select
              value={gpaScale}
              onChange={(event) => onGpaScaleChange(Number(event.target.value) === 10 ? 10 : 4)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0057C2]"
            >
              <option value={4}>Thang 4</option>
              <option value={10}>Thang 10</option>
            </select>
            <input
              value={metricValue}
              onChange={(event) => onMetricChange(event.target.value)}
              inputMode="decimal"
              placeholder={selectedMetric.placeholder}
              className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0057C2]"
            />
            <AppButton onClick={onSaveMetric} disabled={savingMetric} size="sm">
              {savingMetric ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Lưu GPA
            </AppButton>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-bold text-[var(--text-primary)]">
              Thành tích học thuật bổ sung
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {additionalGroup?.optional
                ? "Không bắt buộc ở cấp hiện tại"
                : "Bổ sung thành tích học thuật theo yêu cầu cấp đăng ký"}
            </p>
            {evidenceTypes.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {evidenceTypes.map((type) => (
                  <span
                    key={type}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600"
                  >
                    {type}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          {canEdit ? (
            <AppButton onClick={() => onAddEvidence()} variant="secondary" size="sm">
              <Upload className="h-4 w-4" />
              Bổ sung thành tích
            </AppButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PhysicalRequirementPanel({
  schoolYear,
  completion,
  canEdit,
  savingCourseResult,
  onDeclareCourseResult,
  onAddEvidence,
}: {
  schoolYear: string;
  completion: CriterionCompletionItem;
  canEdit: boolean;
  savingCourseResult: boolean;
  onDeclareCourseResult: (input: {
    resultType: "score" | "classification";
    value?: number;
    classification?: string;
    schoolYear: string;
    replaceExisting?: boolean;
  }) => Promise<unknown>;
  onAddEvidence: (context?: { requirementKey?: string; requirementLabel?: string }) => void;
}) {
  const pathGroup = (completion.requirementGroups ?? []).find(
    (group) => group.key === "physical_path",
  );
  const paths = pathGroup?.requirements ?? [];
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [resultType, setResultType] = useState<"score" | "classification">("score");
  const [courseValue, setCourseValue] = useState("");
  const [classification, setClassification] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const activePath = paths.find((path) => path.key === selectedPath);

  const saveCourseResult = async () => {
    if (!canEdit || !activePath || activePath.key !== "physical_course_result") return;
    const value = Number(courseValue);
    if (resultType === "score" && (!courseValue || !Number.isFinite(value))) {
      toast.error("Vui lòng nhập điểm Giáo dục thể chất hợp lệ.");
      return;
    }
    if (resultType === "classification" && !classification.trim()) {
      toast.error("Vui lòng nhập xếp loại Giáo dục thể chất.");
      return;
    }
    await onDeclareCourseResult({
      resultType,
      value: resultType === "score" ? value : undefined,
      classification: resultType === "classification" ? classification.trim() : undefined,
      schoolYear,
      replaceExisting,
    });
    setCourseValue("");
    setClassification("");
    toast.success("Đã ghi nhận cách chứng minh Thể lực tốt.");
  };

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-bold text-[var(--text-primary)]">
              Chọn cách chứng minh Thể lực tốt
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Chỉ cần một nhánh phù hợp theo cấu hình tiêu chí hiện tại.
            </p>
          </div>
          <AppButton asChild variant="secondary" size="sm">
            <Link to="/app/event-library">
              <Search className="h-4 w-4" />
              Tìm dữ liệu đã xác nhận
            </Link>
          </AppButton>
        </div>

        <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
          {paths.map((path) => (
            <PhysicalPathRow
              key={path.key}
              requirement={path}
              selected={selectedPath === path.key}
              onSelect={() => setSelectedPath(path.key)}
            />
          ))}
        </div>
      </div>

      {activePath ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-bold text-[var(--text-primary)]">
                {getDisplayRequirementLabel(activePath)}
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Nguồn: {getDisplayAcceptedSourcesLabel(activePath)}
              </p>
            </div>
            <StatusBadge
              tone={mapRequirementStatus(activePath.status).tone}
              label={mapRequirementStatus(activePath.status).label}
            />
          </div>

          {activePath.key === "physical_course_result" ? (
            <div className="mt-4 grid gap-3 md:grid-cols-[160px_1fr_auto] md:items-end">
              <label className="text-sm font-semibold text-[var(--text-primary)]">
                Kết quả GDTC
                <select
                  value={resultType}
                  onChange={(event) =>
                    setResultType(
                      event.target.value === "classification" ? "classification" : "score",
                    )
                  }
                  disabled={!canEdit}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0057C2]"
                >
                  <option value="score">Điểm</option>
                  <option value="classification">Xếp loại</option>
                </select>
              </label>
              {resultType === "score" ? (
                <label className="text-sm font-semibold text-[var(--text-primary)]">
                  Điểm / 10
                  <input
                    value={courseValue}
                    onChange={(event) => setCourseValue(event.target.value)}
                    inputMode="decimal"
                    disabled={!canEdit}
                    placeholder="Ví dụ: 8.0"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0057C2]"
                  />
                </label>
              ) : (
                <label className="text-sm font-semibold text-[var(--text-primary)]">
                  Xếp loại
                  <input
                    value={classification}
                    onChange={(event) => setClassification(event.target.value)}
                    disabled={!canEdit}
                    placeholder="Ví dụ: Đạt"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0057C2]"
                  />
                </label>
              )}
              {canEdit ? (
                <AppButton onClick={saveCourseResult} disabled={savingCourseResult} size="sm">
                  {savingCourseResult ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Lưu kết quả
                </AppButton>
              ) : null}
              {canEdit ? (
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] md:col-span-3">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(event) => setReplaceExisting(event.target.checked)}
                  />
                  Thay thế cách chứng minh đang nộp trước đó
                </label>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {getFormFields(activePath).map((field) => (
                  <span
                    key={field}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600"
                  >
                    {PRESENTATION_SEMANTICS_V2 ? getRequirementFieldLabel(field) : field}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <AppButton asChild variant="secondary" size="sm">
                  <Link to="/app/event-library">
                    <Search className="h-4 w-4" />
                    Tìm hoạt động/dữ liệu đã xác nhận
                  </Link>
                </AppButton>
                {canEdit ? (
                  <AppButton
                    onClick={() =>
                      onAddEvidence({
                        requirementKey: activePath.key,
                        requirementLabel: getRequirementPresentation(activePath).label,
                      })
                    }
                    size="sm"
                  >
                    <Upload className="h-4 w-4" />
                    Tự khai báo và tải minh chứng
                  </AppButton>
                ) : null}
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="text-sm font-bold text-[var(--text-primary)]">Danh sách đã thêm</div>
        <div className="mt-3 grid gap-2">
          {paths.some((path) => getRequirementResponses(path).length > 0) ? (
            paths
              .filter((path) => getRequirementResponses(path).length > 0)
              .map((path) => (
                <div
                  key={path.key}
                  className="flex min-w-0 flex-col gap-2 rounded-xl border border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {getDisplayRequirementLabel(path)}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {PRESENTATION_SEMANTICS_V2
                        ? getDisplayRequirementSourceLabel(path)
                        : path.key}
                    </div>
                  </div>
                  <StatusBadge
                    tone={mapRequirementStatus(path.status).tone}
                    label={mapRequirementStatus(path.status).label}
                  />
                </div>
              ))
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">
              Chưa chọn cách chứng minh Thể lực tốt.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function VolunteerRequirementPanel({
  completion,
  canEdit,
  savingActivity,
  onAddActivity,
  onAddEvidence,
}: {
  completion: CriterionCompletionItem;
  canEdit: boolean;
  savingActivity: boolean;
  onAddActivity: (input: {
    requirementKey: "accumulated_volunteer_days" | "activity_count";
    activityType: string;
    activityName: string;
    organizer?: string;
    organizerLevel?: string;
    startDate?: string;
    endDate?: string;
    declaredValue?: number;
    declaredUnit?: "day" | "session" | "event" | "donation";
  }) => Promise<unknown>;
  onAddEvidence: (context?: { requirementKey?: string; requirementLabel?: string }) => void;
}) {
  const days = findRequirement(completion, "accumulated_volunteer_days");
  const count = findRequirement(completion, "activity_count");
  const campaign = findRequirement(completion, "recognized_campaign");
  const award = findRequirement(completion, "volunteer_award");
  const aggregation = days?.aggregation ?? count?.aggregation;
  const activities = [
    ...(days?.aggregation?.activities ?? []),
    ...(count?.aggregation?.activities ?? []),
  ];
  const [activityName, setActivityName] = useState("");
  const [activityType, setActivityType] = useState("volunteer_activity");
  const [declaredValue, setDeclaredValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const saveActivity = async () => {
    const value = declaredValue ? Number(declaredValue) : undefined;
    if (!activityName.trim()) {
      toast.error("Vui lòng nhập tên hoạt động tình nguyện.");
      return;
    }
    if (declaredValue && !Number.isFinite(value)) {
      toast.error("Số ngày khai báo không hợp lệ.");
      return;
    }
    await onAddActivity({
      requirementKey: "accumulated_volunteer_days",
      activityType,
      activityName: activityName.trim(),
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      declaredValue: value,
      declaredUnit: "day",
    });
    setActivityName("");
    setDeclaredValue("");
    setStartDate("");
    setEndDate("");
    toast.success("Đã thêm hoạt động tình nguyện, chờ xác minh.");
  };

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-bold text-[var(--text-primary)]">
              Sổ hoạt động tình nguyện
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Không nhập tổng ngày thủ công; từng hoạt động có nguồn và trạng thái xác minh riêng.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AppButton asChild variant="secondary" size="sm">
              <Link to="/app/event-library" search={{ criterion: "volunteer" } as never}>
                <Search className="h-4 w-4" />
                Tìm hoạt động đã xác nhận
              </Link>
            </AppButton>
            {canEdit ? (
              <AppButton onClick={() => onAddEvidence()} variant="secondary" size="sm">
                <Upload className="h-4 w-4" />
                Tải giấy xác nhận
              </AppButton>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <VolunteerTotalCard
            label="Đã xác nhận"
            value={aggregation?.verifiedTotal ?? 0}
            unit={aggregation?.unit ?? "day"}
            tone="good"
          />
          <VolunteerTotalCard
            label="Chờ xác minh"
            value={aggregation?.pendingVerificationTotal ?? 0}
            unit={aggregation?.unit ?? "day"}
            tone="warning"
          />
          <VolunteerTotalCard
            label="Mục tiêu"
            value={aggregation?.threshold ?? 0}
            unit={aggregation?.unit ?? "day"}
            tone="neutral"
          />
        </div>
      </div>

      {canEdit ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <div className="text-sm font-bold text-[var(--text-primary)]">
            Khai báo hoạt động tình nguyện
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-5">
            <input
              value={activityName}
              onChange={(event) => setActivityName(event.target.value)}
              placeholder="Tên hoạt động"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0057C2] md:col-span-2"
            />
            <select
              value={activityType}
              onChange={(event) => setActivityType(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0057C2]"
            >
              <option value="volunteer_activity">Tình nguyện</option>
              <option value="blood_donation">Hiến máu</option>
              <option value="green_sunday">Chủ nhật xanh</option>
            </select>
            <input
              value={declaredValue}
              onChange={(event) => setDeclaredValue(event.target.value)}
              inputMode="decimal"
              placeholder="Số ngày"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0057C2]"
            />
            <AppButton onClick={saveActivity} disabled={savingActivity} size="sm">
              {savingActivity ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Thêm hoạt động
            </AppButton>
            <input
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0057C2]"
            />
            <input
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              type="date"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0057C2]"
            />
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-bold text-[var(--text-primary)]">Hoạt động đã ghi nhận</div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              tone={mapRequirementStatus(campaign?.status ?? "not_started").tone}
              label={`Chiến dịch: ${mapRequirementStatus(campaign?.status ?? "not_started").label}`}
            />
            <StatusBadge
              tone={mapRequirementStatus(award?.status ?? "not_started").tone}
              label={`Khen thưởng: ${mapRequirementStatus(award?.status ?? "not_started").label}`}
            />
          </div>
        </div>
        <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100">
          {activities.length ? (
            activities.map((activity) => (
              <VolunteerActivityRow key={activity.id} activity={activity} />
            ))
          ) : (
            <p className="px-3 py-3 text-sm text-[var(--text-secondary)]">
              Chưa có hoạt động tình nguyện trong sổ.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function IntegrationRequirementPanel({
  completion,
  canEdit,
  savingPath,
  onAddPath,
  onAddEvidence,
}: {
  completion: CriterionCompletionItem;
  canEdit: boolean;
  savingPath: boolean;
  onAddPath: (input: {
    requirementKey: IntegrationRequirementKey;
    payloadJson: Record<string, unknown>;
  }) => Promise<unknown>;
  onAddEvidence: (context?: { requirementKey?: string; requirementLabel?: string }) => void;
}) {
  const pathGroup =
    (completion.requirementGroups ?? []).find((group) => group.key === "integration_path") ??
    (completion.requirementGroups ?? []).find((group) =>
      group.requirements.some((requirement) => isIntegrationPathKey(requirement.key)),
    );
  const paths =
    pathGroup?.requirements.filter((requirement) => isIntegrationPathKey(requirement.key)) ?? [];
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const activePath = paths.find((path) => path.key === selectedPath);
  const fields = activePath ? getFormFields(activePath) : [];

  const updateField = (field: string, value: string) => {
    setFormValues((current) => ({ ...current, [field]: value }));
  };

  const selectPath = (key: string) => {
    setSelectedPath(key);
    setFormValues({});
  };

  const savePath = async () => {
    if (!canEdit || !activePath || !isIntegrationPathKey(activePath.key)) return;
    const payloadJson = Object.fromEntries(
      Object.entries(formValues)
        .map(([key, value]) => [key, normalizeIntegrationFieldValue(key, value)] as const)
        .filter(([, value]) => value !== undefined && value !== ""),
    );
    if (activePath.key === "foreign_language" && !payloadJson.issuedDate) {
      toast.error("Vui lòng bổ sung ngày cấp chứng chỉ.");
      return;
    }
    await onAddPath({ requirementKey: activePath.key, payloadJson });
    setFormValues({});
    toast.success("Đã ghi nhận hình thức đáp ứng Hội nhập tốt.");
  };

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-bold text-[var(--text-primary)]">
              Chọn hình thức đáp ứng Hội nhập tốt
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Cấu hình hiện tại được lấy từ CriteriaVersion, có thể nộp nhiều hình thức nếu cần.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AppButton asChild variant="secondary" size="sm">
              <Link to="/app/event-library" search={{ criterion: "integration" } as never}>
                <Search className="h-4 w-4" />
                Tìm hoạt động/dữ liệu đã xác nhận
              </Link>
            </AppButton>
            {canEdit ? (
              <AppButton onClick={() => onAddEvidence()} variant="secondary" size="sm">
                <Upload className="h-4 w-4" />
                Tự khai báo và tải minh chứng
              </AppButton>
            ) : null}
          </div>
        </div>

        <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
          {paths.length ? (
            paths.map((path) => (
              <PhysicalPathRow
                key={path.key}
                requirement={path}
                selected={selectedPath === path.key}
                onSelect={() => selectPath(path.key)}
              />
            ))
          ) : (
            <p className="px-3 py-3 text-sm text-[var(--text-secondary)]">
              Chưa có path Hội nhập tốt trong cấu hình hiện tại.
            </p>
          )}
        </div>
      </div>

      {activePath ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-bold text-[var(--text-primary)]">
                {getDisplayRequirementLabel(activePath)}
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Nguồn: {getDisplayAcceptedSourcesLabel(activePath)}
              </p>
            </div>
            <StatusBadge
              tone={mapRequirementStatus(activePath.status).tone}
              label={mapRequirementStatus(activePath.status).label}
            />
          </div>

          {fields.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {fields.map((field) => (
                <IntegrationFieldInput
                  key={field}
                  field={field}
                  value={formValues[field] ?? ""}
                  disabled={!canEdit}
                  onChange={(value) => updateField(field, value)}
                />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Path này chưa có formSchema chi tiết từ backend.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {canEdit ? (
              <AppButton onClick={savePath} disabled={savingPath} size="sm">
                {savingPath ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Lưu khai báo
              </AppButton>
            ) : null}
            {canEdit ? (
              <AppButton
                onClick={() =>
                  onAddEvidence({
                    requirementKey: activePath.key,
                    requirementLabel: getRequirementPresentation(activePath).label,
                  })
                }
                variant="secondary"
                size="sm"
              >
                <Upload className="h-4 w-4" />
                Tải minh chứng
              </AppButton>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="text-sm font-bold text-[var(--text-primary)]">Hình thức đã thêm</div>
        <div className="mt-3 grid gap-2">
          {paths.some((path) => getRequirementResponses(path).length > 0) ? (
            paths
              .filter((path) => getRequirementResponses(path).length > 0)
              .map((path) => (
                <div
                  key={path.key}
                  className="flex min-w-0 flex-col gap-2 rounded-xl border border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {getDisplayRequirementLabel(path)}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {getDisplayRequirementSourceLabel(path)}
                    </div>
                  </div>
                  <StatusBadge
                    tone={mapRequirementStatus(path.status).tone}
                    label={mapRequirementStatus(path.status).label}
                  />
                </div>
              ))
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">
              Chưa chọn hình thức đáp ứng Hội nhập tốt.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function IntegrationFieldInput({
  field,
  value,
  disabled,
  onChange,
}: {
  field: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const inputType = integrationFieldInputType(field);
  return (
    <label className="text-sm font-semibold text-[var(--text-primary)]">
      {integrationFieldLabel(field)}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={inputType}
        inputMode={inputType === "number" ? "decimal" : undefined}
        disabled={disabled}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0057C2]"
      />
    </label>
  );
}

function VolunteerTotalCard({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: number;
  unit: string;
  tone: CriteriaState["tone"];
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 flex items-end gap-2">
        <span className="text-2xl font-bold text-[var(--text-primary)]">{value}</span>
        <span className="pb-1 text-sm text-[var(--text-secondary)]">{unit}</span>
      </div>
      <StatusBadge tone={tone} label={label} />
    </div>
  );
}

function VolunteerActivityRow({
  activity,
}: {
  activity: NonNullable<RequirementItem["aggregation"]>["activities"][number];
}) {
  const status = mapRequirementStatus(
    activity.status === "verified"
      ? "verified"
      : activity.status === "rejected"
        ? "rejected"
        : "needs_verification",
  );
  return (
    <div className="grid min-w-0 gap-3 px-3 py-3 md:grid-cols-[1fr_120px_140px] md:items-center">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
          {activity.activityName ?? "Hoạt động tình nguyện"}
        </div>
        <div className="mt-1 truncate text-sm text-[var(--text-secondary)]">
          {[activity.sourceType, activity.conversionSource, activity.exclusionReason]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
      <div className="text-sm font-semibold text-[var(--text-primary)]">
        {activity.countedValue || activity.convertedValue || 0} {activity.convertedUnit}
      </div>
      <StatusBadge tone={status.tone} label={status.label} />
    </div>
  );
}

function PhysicalPathRow({
  requirement,
  selected,
  onSelect,
}: {
  requirement: RequirementItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const status = mapRequirementStatus(requirement.status);
  const response = getLatestRequirementResponse(requirement);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "grid w-full min-w-0 gap-3 px-3 py-3 text-left md:grid-cols-[1fr_120px_140px] md:items-center",
        selected ? "bg-blue-50/70" : "hover:bg-slate-50",
      )}
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-[var(--text-primary)]">
          {getDisplayRequirementLabel(requirement)}
        </div>
        <div className="mt-1 truncate text-sm text-[var(--text-secondary)]">
          {response
            ? getDisplayRequirementSourceLabel(requirement)
            : (requirement.nextAction?.label ?? "Chọn cách chứng minh")}
        </div>
      </div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {PRESENTATION_SEMANTICS_V2
          ? getDisplayRequirementSourceLabel(requirement)
          : requirement.key}
      </div>
      <StatusBadge tone={status.tone} label={status.label} />
    </button>
  );
}

function AcademicInfoRow({
  label,
  value,
  badgeTone,
}: {
  label: string;
  value: string;
  badgeTone?: CriteriaState["tone"];
}) {
  return (
    <div className="grid min-w-0 gap-2 px-3 py-3 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center">
      <div className="text-sm font-semibold text-[var(--text-primary)]">{label}</div>
      {badgeTone ? (
        <StatusBadge tone={badgeTone} label={value} />
      ) : (
        <div className="truncate text-sm text-[var(--text-secondary)]">{value}</div>
      )}
    </div>
  );
}

function EthicsRequirementRow({
  title,
  requirement,
  value,
  source,
  action,
}: {
  title: string;
  requirement?: RequirementItem;
  value: string;
  source: string;
  action: ReactNode;
}) {
  const status =
    requirement?.key === "no_violation"
      ? mapNoViolationRequirementStatus(requirement)
      : mapRequirementStatus(requirement?.status ?? "not_started");
  return (
    <div className="grid min-w-0 gap-3 px-3 py-3 md:grid-cols-[1fr_120px_120px_minmax(170px,1.3fr)] md:items-center">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
        <div className="mt-1 truncate text-sm text-[var(--text-secondary)]">{value}</div>
      </div>
      <div className="min-w-0 text-sm text-[var(--text-secondary)]">{source}</div>
      <StatusBadge tone={status.tone} label={status.label} />
      <div className="min-w-0 text-sm font-medium text-[var(--text-primary)]">{action}</div>
    </div>
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
  activeCriterion,
  activeState,
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
  activeCriterion: Criterion;
  activeState: CriteriaState;
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
  const criterionAction = nextActions.find((action) => action.criterionKey === activeCriterion);
  const displayedAction = criterionAction ?? nextActions[0];
  const shouldShowDisplayedAction = Boolean(
    displayedAction && (criterionAction || activeState.status !== "ok"),
  );
  const title =
    criterionAction?.title ??
    (activeState.status === "ok"
      ? `${activeState.label} đã có đủ dữ liệu. Bạn có thể kiểm tra hồ sơ hoặc chuyển sang tiêu chí còn thiếu.`
      : (displayedAction?.title ?? "Kiểm tra nhanh trước khi nộp chính thức."));

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
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-bold text-[var(--text-primary)]">Bước tiếp theo</div>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--text-secondary)]">
            {title}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {shouldShowDisplayedAction && displayedAction?.isInteractive === false ? (
            <StatusBadge tone="info" label={displayedAction.actionLabel} />
          ) : shouldShowDisplayedAction && displayedAction ? (
            <AppButton onClick={() => onAction(displayedAction)} variant="secondary" size="sm">
              {displayedAction.actionLabel}
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
    </div>
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
        <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)_280px] 2xl:grid-cols-[240px_minmax(0,1fr)_300px]">
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

function findRequirement(completion: CriterionCompletionItem, requirementKey: string) {
  return (completion.requirementGroups ?? [])
    .flatMap((group) => group.requirements)
    .find((requirement) => requirement.key === requirementKey);
}

function getRequirementDisplayValue(requirement?: RequirementItem) {
  const response = getLatestRequirementResponse(requirement);
  const payload = response ? toRecord(response.payloadJson) : {};
  if (typeof payload.value === "number") {
    const scale = typeof payload.scale === "number" ? payload.scale : 100;
    return `${payload.value}/${scale}`;
  }
  if (requirement?.key === "no_violation") {
    if (requirement.status === "verified") return "Không vi phạm đã được xác minh";
    if (requirement.status === "rejected") return "Có ghi nhận cần xử lý";
    if (isReviewerOwnedRequirement(requirement)) return "Cán bộ xét duyệt xác minh";
    if (requirement.status === "needs_verification") return "Đang chờ xác minh";
  }
  return undefined;
}

function getDisplayRequirementLabel(requirement?: RequirementItem) {
  if (!requirement) return "Điều kiện theo cấu hình hiện tại";
  return PRESENTATION_SEMANTICS_V2
    ? getRequirementPresentation(requirement).label
    : requirement.title;
}

function getDisplayRequirementSourceLabel(requirement?: RequirementItem) {
  if (!PRESENTATION_SEMANTICS_V2) return getRequirementSourceLabel(requirement);
  const response = getLatestRequirementResponse(requirement);
  return response ? getResponseSourcePresentation(response) : "Chưa có";
}

function getRequirementSourceLabel(requirement?: RequirementItem) {
  const response = getLatestRequirementResponse(requirement);
  if (!response && isReviewerOwnedRequirement(requirement)) return "Cán bộ xét duyệt";
  if (!response) return "Chưa có";
  const payload = toRecord(response.payloadJson);
  const sourceType = typeof payload.sourceType === "string" ? payload.sourceType : undefined;
  if (sourceType === "system_data") return "Dữ liệu hệ thống";
  if (sourceType === "manual_metric") return "Sinh viên khai báo";
  if (sourceType === "manual_evidence") return "File minh chứng";
  if (response.responseKind === "legacy_event" || response.responseKind === "official_event") {
    return "Sự kiện xác nhận";
  }
  if (response.responseKind === "system_confirmation") return "Cán bộ xét duyệt";
  return response.source === "legacy" ? "Dữ liệu đã có" : "Khai báo";
}

function noViolationActionLabel(requirement?: RequirementItem) {
  if (requirement?.status === "rejected") return "Bổ sung giấy xác nhận theo yêu cầu cán bộ";
  if (requirement?.status === "verified") return "Đã được cán bộ xác minh";
  if (isReviewerOwnedRequirement(requirement)) {
    return "Cán bộ xét duyệt sẽ xác minh sau khi nộp hồ sơ";
  }
  return requirement?.nextAction?.label ?? "Chờ cán bộ xác minh tình trạng vi phạm";
}

function mapNoViolationRequirementStatus(requirement?: RequirementItem): {
  label: string;
  tone: CriteriaState["tone"];
} {
  if (requirement?.status === "verified") return { label: "Đã xác minh", tone: "good" };
  if (requirement?.status === "rejected") return { label: "Cần xử lý", tone: "danger" };
  if (isReviewerOwnedRequirement(requirement)) return { label: "Chờ cán bộ", tone: "info" };
  return mapRequirementStatus(requirement?.status ?? "not_started");
}

function isReviewerOwnedRequirement(requirement?: RequirementItem) {
  return (
    requirement?.blocksSubmission === false &&
    (requirement.responsibility === "reviewer" || requirement.responsibility === "committee")
  );
}

function academicGpaStatusLabel(requirement?: RequirementItem) {
  if (requirement?.status === "verified") return "Đáp ứng ngưỡng sơ bộ";
  if (requirement?.status === "declared" || requirement?.status === "needs_verification") {
    return "Cần xác minh";
  }
  if (requirement?.status === "rejected") return "Chưa đáp ứng ngưỡng dữ liệu hiện tại";
  return "Chưa có dữ liệu";
}

function noFGradeActionLabel(requirement?: RequirementItem) {
  if (requirement?.status === "verified") return "Đã được xác nhận";
  if (requirement?.status === "rejected") return "Có điểm F cần cán bộ xử lý";
  return requirement?.nextAction?.label ?? "Xác nhận tình trạng điểm F";
}

function academicPeriodLabel(requirement?: RequirementItem) {
  if (requirement?.status === "verified") return "Đúng năm học xét";
  if (requirement?.status === "rejected") return "Không khớp năm học xét";
  return requirement?.nextAction?.label ?? "Tải bảng điểm để xác minh GPA";
}

function mapRequirementStatus(status: RequirementItem["status"]): {
  label: string;
  tone: CriteriaState["tone"];
} {
  if (status === "verified") return { label: "Đã xác nhận", tone: "good" };
  if (status === "declared") return { label: "Đã khai báo", tone: "warning" };
  if (status === "needs_verification") return { label: "Cần xác minh", tone: "warning" };
  if (status === "rejected") return { label: "Không đạt", tone: "danger" };
  return { label: "Chưa có", tone: "neutral" };
}

function getLatestRequirementResponse(
  requirement?: RequirementItem,
): RequirementResponse | undefined {
  return getRequirementResponses(requirement).find((response) => response.status !== "superseded");
}

function getRequirementResponses(requirement?: RequirementItem): RequirementResponse[] {
  return Array.isArray(requirement?.currentResponses) ? requirement.currentResponses : [];
}

function getAcceptedSourcesLabel(requirement: RequirementItem) {
  return requirement.acceptedSources?.length
    ? requirement.acceptedSources.join(", ")
    : "Theo cau hinh";
}

function getDisplayAcceptedSourcesLabel(requirement: RequirementItem) {
  return PRESENTATION_SEMANTICS_V2
    ? formatSourceList(requirement.acceptedSources)
    : getAcceptedSourcesLabel(requirement);
}

function normalizeCriteriaCompletionItems(value: unknown): CriterionCompletionItem[] {
  if (!value || typeof value !== "object") return [];
  const record = value as { items?: unknown; data?: unknown };
  if (Array.isArray(record.items)) return record.items as CriterionCompletionItem[];
  const data = record.data as { items?: unknown } | undefined;
  if (data && Array.isArray(data.items)) return data.items as CriterionCompletionItem[];
  return [];
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getGroupEvidenceTypes(group?: { formSchema?: unknown; requirements?: RequirementItem[] }) {
  const formSchema = toRecord(group?.formSchema);
  const evidenceTypes = Array.isArray(formSchema.evidenceTypes)
    ? formSchema.evidenceTypes.filter((item): item is string => typeof item === "string")
    : [];
  if (evidenceTypes.length) {
    return PRESENTATION_SEMANTICS_V2 ? evidenceTypes.map(getRequirementChipLabel) : evidenceTypes;
  }
  const keys = group?.requirements?.map((requirement) => requirement.key) ?? [];
  return PRESENTATION_SEMANTICS_V2 ? keys.map(getRequirementChipLabel) : keys;
}

function getFormFields(requirement: RequirementItem) {
  const formSchema = toRecord(requirement.formSchema);
  return Array.isArray(formSchema.fields)
    ? formSchema.fields.filter((item): item is string => typeof item === "string")
    : [];
}

function isIntegrationPathKey(value: string): value is IntegrationRequirementKey {
  return (
    value === "foreign_language" ||
    value === "skills_or_union_training" ||
    value === "international_exchange" ||
    value === "foreign_language_or_integration_competition" ||
    value === "student_union_achievement"
  );
}

function integrationFieldInputType(field: string): "text" | "date" | "number" {
  if (field.toLowerCase().includes("date")) return "date";
  if (field === "score" || field === "studyYear") return "number";
  return "text";
}

function integrationFieldLabel(field: string) {
  const labels: Record<string, string> = {
    language: "Ngôn ngữ",
    resultForm: "Hình thức kết quả",
    certificateType: "Loại chứng chỉ",
    score: "Điểm",
    level: "Trình độ",
    equivalentLevel: "Mức tương đương",
    issuedDate: "Ngày cấp",
    expiryDate: "Ngày hết hạn",
    schoolYear: "Năm học",
    validityPeriod: "Thời hạn hiệu lực",
    source: "Nguồn dữ liệu",
    programName: "Tên khóa học",
    trainingType: "Loại tập huấn",
    skillCategory: "Nhóm kỹ năng",
    organizer: "Đơn vị tổ chức",
    organizerLevel: "Cấp tổ chức",
    startDate: "Ngày bắt đầu",
    endDate: "Ngày kết thúc",
    completionStatus: "Trạng thái hoàn thành",
    evidence: "Minh chứng",
    activityName: "Tên hoạt động",
    activityType: "Loại hoạt động",
    domesticOrInternational: "Trong nước/quốc tế",
    participationRole: "Vai trò tham gia",
    competitionName: "Tên cuộc thi",
    competitionType: "Loại cuộc thi",
    languageUsed: "Ngôn ngữ sử dụng",
    achievement: "Thành tích",
    achievementName: "Tên thành tích",
    issuingUnit: "Đơn vị cấp",
    issuingLevel: "Cấp đơn vị cấp",
  };
  if (PRESENTATION_SEMANTICS_V2) return getRequirementFieldLabel(field);
  return labels[field] ?? field;
}

function normalizeIntegrationFieldValue(field: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (field === "score" || field === "studyYear") {
    const numberValue = Number(trimmed);
    return Number.isFinite(numberValue) ? numberValue : trimmed;
  }
  return trimmed;
}

function formatPayloadNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : undefined;
}

function stringFromPayload(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function applyCompletionToCriteriaState(
  state: ReturnType<typeof getCriteriaUiState>,
  completion?: CriterionCompletionItem,
): CriteriaState {
  if (!completion) return state;
  const required = completion.completion.required;
  const completionText =
    required > 0
      ? `${completion.completion.satisfied}/${required} điều kiện có dữ liệu`
      : "Chưa có điều kiện bắt buộc";
  const status = mapCompletionStatus(completion.status);
  const needsVerification = completion.completion.needsVerification;
  return {
    ...state,
    status: status.status,
    statusLabel: status.label,
    tone: status.tone,
    evidenceCount: completion.evidenceCount,
    warningCount: needsVerification || state.warningCount,
    description:
      required > 0
        ? `${completionText}${needsVerification ? ` · ${needsVerification} mục cần xác minh` : ""}.`
        : state.description,
    primaryMissingReason: completion.nextAction?.label ?? state.primaryMissingReason,
    completionText,
    completionSource: "criteria_completion",
  };
}

function mapCompletionStatus(status: CriterionCompletionItem["status"]): {
  status: CriteriaState["status"];
  label: string;
  tone: CriteriaState["tone"];
} {
  if (status === "accepted") return { status: "ok", label: "Đã xác nhận", tone: "good" };
  if (status === "ready_for_precheck") {
    return { status: "ok", label: "Đủ dữ liệu", tone: "good" };
  }
  if (status === "needs_verification") {
    return { status: "needs_review", label: "Cần xác minh", tone: "warning" };
  }
  if (status === "under_review") {
    return { status: "processing", label: "Đang xét", tone: "info" };
  }
  if (status === "supplement_required") {
    return { status: "missing", label: "Cần bổ sung", tone: "warning" };
  }
  if (status === "rejected") {
    return { status: "needs_review", label: "Chưa phù hợp", tone: "danger" };
  }
  if (status === "precheck_warning") {
    return { status: "needs_review", label: "Có cảnh báo", tone: "warning" };
  }
  if (status === "in_progress") {
    return { status: "missing", label: "Đang thiếu", tone: "warning" };
  }
  return { status: "empty", label: "Chưa bắt đầu", tone: "neutral" };
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

function isPhysicalPathRequirementKey(
  value?: string,
): value is
  | "healthy_student_title"
  | "sports_activity_or_award"
  | "sports_team_member"
  | "regular_sports_training" {
  return (
    value === "healthy_student_title" ||
    value === "sports_activity_or_award" ||
    value === "sports_team_member" ||
    value === "regular_sports_training"
  );
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

function getUploadEvidenceCriterionFromLocation(): Criterion | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get("uploadEvidence") !== "1") return null;
  return getCriterionFromLocation() ?? "academic";
}

function clearUploadEvidenceRequestFromLocation() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("uploadEvidence");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function getEvidenceConfirmRequestFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get("mode") !== "confirm") return null;
  return params.get("evidenceId");
}

function clearEvidenceConfirmRequestFromLocation() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.searchParams.get("mode") === "confirm") {
    url.searchParams.delete("mode");
    url.searchParams.delete("evidenceId");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }
}

function getSuggestedEventImportRequestFromLocation(): {
  eventId: string;
  criterion: Criterion;
} | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get("mode") !== "suggested-import") return null;
  const eventId = params.get("eventId");
  const criterion = params.get("criterion") as Criterion | null;
  if (!eventId || !criterion || !coreStudentCriteria.includes(criterion)) return null;
  return { eventId, criterion };
}

function clearSuggestedEventImportRequestFromLocation() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.searchParams.get("mode") === "suggested-import") {
    url.searchParams.delete("mode");
    url.searchParams.delete("eventId");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }
}

function supportsOfficialEventImport(completion?: CriterionCompletionItem) {
  if (!completion) return false;
  const groups = completion.requirementGroups ?? [];
  return groups.some(
    (group) =>
      formSchemaSupportsOfficialEvent(group.formSchema) ||
      (group.requirements ?? []).some((requirement) =>
        requirementSupportsOfficialEvent(requirement),
      ),
  );
}

function requirementSupportsOfficialEvent(requirement: RequirementItem) {
  if (requirement.acceptedSources?.includes("official_event")) return true;
  if (
    getRequirementResponses(requirement).some(
      (response) =>
        response.responseKind === "official_event" || response.responseKind === "legacy_event",
    )
  ) {
    return true;
  }

  return formSchemaSupportsOfficialEvent(requirement.formSchema);
}

function formSchemaSupportsOfficialEvent(value: unknown) {
  const formSchema = toRecord(value);
  const evidenceTypes = Array.isArray(formSchema.evidenceTypes) ? formSchema.evidenceTypes : [];
  return evidenceTypes.some((type) => {
    const normalized = String(type).toLowerCase();
    return normalized.includes("official_event") || normalized.includes("event_import");
  });
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
