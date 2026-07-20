import { Link } from "@tanstack/react-router";
import { BookOpenCheck, ChevronRight, Loader2, Plus, Search, Send, Upload } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  ActivityLedgerV2,
  ButtonV2,
  CompactEmptyStateV2,
  CriteriaNavigationRowV2,
  DefinitionTableV2,
  EvidenceCardV2,
  EvidenceGallery,
  GuideSheetTriggerV2,
  InlineErrorStateV2,
  InlineStateMessage,
  PathSelectorListV2,
  SectionHeading,
  StatusPillV2,
  StickyNextActionBarV2,
  mapStudentDisplayStatusToV2ProgressStatus,
  type ActivityLedgerV2Row,
  type DefinitionTableV2Row,
  type PathSelectorListV2Item,
  type StudentApplicationV2ProgressStatus,
} from "@/features/application/ui-v2/components";
import { SubmitConfirmationModal } from "@/features/application/components/SubmitConfirmationModal";
import {
  applyActionPresentationToUiAction,
  formatSourceList,
  getRequirementFieldLabel,
  getRequirementPresentation,
  getResponseSourcePresentation,
  getStudentCriterionDisplayState,
} from "@/features/application/presentation";
import {
  getOptionalAchievementCopy,
  getSafeRequirementLabel,
  validateAcademicGpaValue,
  validateConductScoreValue,
} from "@/features/application/ui-v2/view-models/criterion-data";
import {
  useCriteriaCompletion,
  useAddIntegrationPathResponse,
  useAddVolunteerActivity,
  useCurrentApplication,
  useDeclareAcademicGpa,
  useDeclareEthicsConductScore,
  useDeclarePhysicalCourseResult,
  useLatestPrecheck,
  usePrecheck,
  useStartApplication,
  useSubmitApplication,
  useUpsertMetric,
} from "@/features/application/hooks/useApplication";
import { AddEvidenceDrawer } from "@/features/evidence/components/AddEvidenceDrawer";
import { EvidenceDetailModal } from "@/features/evidence/components/EvidenceDetailModal";
import {
  formatStudentDate,
  getFileName,
  getPrimaryFile,
  studentCriterionLabel,
} from "@/features/evidence/components/student-evidence-utils";
import { useDeleteEvidence, useEvidences } from "@/features/evidence/hooks/useEvidence";
import { OfficialEventLibraryDialog } from "@/features/event/components/OfficialEventLibraryStudent";
import { officialEventLibraryTitleForCriterion } from "@/features/event/components/official-event-library-copy";
import {
  applyCompletionToCriteriaState,
  coreStudentCriteria,
  criterionLabels,
  getCriteriaUiState,
  getNextActions,
  getStudentApplicationStatus,
  getStudentApplicationSummary,
} from "@/features/student/selectors/student-ui";
import { PRESENTATION_SEMANTICS_V2 } from "@/lib/presentation-semantics";
import { getPrimaryMetricInput, type CoreCriterion } from "@/lib/criteria-matrix";
import { cn } from "@/lib/utils";
import type {
  ApplicationMetric,
  ApplicationReviewTaskSummary,
  ApplicationState,
  CriteriaCompletionResponse,
  Criterion,
  CriterionCompletionItem,
  EvidenceResponse,
  Level,
  MetricType,
  PrecheckResult,
  RequirementGroup,
  RequirementItem,
  RequirementResponse,
} from "@/lib/api/types";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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
  progressStatus: StudentApplicationV2ProgressStatus;
  displayLabel: string;
  displayDescription: string;
};

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
};

type AssistantSearch = {
  source: "criterion";
  applicationId?: string;
  criterionKey?: string;
  criterionLabel?: string;
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

const levelLabels: Record<Level, string> = {
  school: "Cấp Trường",
  university: "Cấp Đại học Đà Nẵng",
  city: "Cấp Thành phố",
  central: "Cấp Trung ương",
};

const criterionGuide: Record<CoreCriterion, { main: string[]; source: string }> = {
  ethics: {
    main: [
      "Điểm rèn luyện đạt yêu cầu của cấp đăng ký.",
      "Không có vi phạm pháp luật, quy chế hoặc kỷ luật trong năm học xét.",
    ],
    source: "Quy định tiêu chí Đạo đức tốt",
  },
  academic: {
    main: [
      "GPA hoặc kết quả học tập đạt ngưỡng theo cấp đăng ký.",
      "Dữ liệu học tập thuộc đúng năm học xét hoặc có xác nhận hợp lệ.",
    ],
    source: "Quy định tiêu chí Học tập tốt",
  },
  physical: {
    main: [
      "Có dữ liệu thể lực, danh hiệu sinh viên khỏe hoặc hoạt động thể thao phù hợp.",
      "Minh chứng thể hiện rõ thời gian, đơn vị tổ chức và kết quả.",
    ],
    source: "Quy định tiêu chí Thể lực tốt",
  },
  volunteer: {
    main: [
      "Hoạt động tình nguyện hợp lệ theo số ngày, số buổi hoặc số hoạt động quy định.",
      "Minh chứng cần thể hiện vai trò, đơn vị tổ chức và thời gian tham gia.",
    ],
    source: "Quy định tiêu chí Tình nguyện tốt",
  },
  integration: {
    main: [
      "Có ngoại ngữ, kỹ năng, hoạt động hội nhập hoặc thành tích Hội phù hợp.",
      "Minh chứng còn hiệu lực và đúng phạm vi cấp xét.",
    ],
    source: "Quy định tiêu chí Hội nhập tốt",
  },
};

export function StudentApplicationWorkspaceV2() {
  const current = useCurrentApplication(SCHOOL_YEAR);
  const startApplication = useStartApplication();
  const runPrecheck = usePrecheck();
  const submitApplication = useSubmitApplication();
  const upsertMetric = useUpsertMetric();
  const declareEthicsConductScore = useDeclareEthicsConductScore();
  const declareAcademicGpa = useDeclareAcademicGpa();
  const declarePhysicalCourseResult = useDeclarePhysicalCourseResult();
  const addVolunteerActivity = useAddVolunteerActivity();
  const addIntegrationPathResponse = useAddIntegrationPathResponse();
  const deleteEvidence = useDeleteEvidence();

  const application = current.data?.application as ApplicationWithWorkspaceData | null | undefined;
  const applicationId = application?.id;
  const evidencesQuery = useEvidences(applicationId, { limit: 100 });
  const criteriaCompletion = useCriteriaCompletion(applicationId);
  const latestPrecheck = useLatestPrecheck(applicationId);

  const [selectedCriterion, setSelectedCriterion] = useState<Criterion>(
    () => getCriterionFromLocation() ?? "ethics",
  );
  const [evidenceDrawerContext, setEvidenceDrawerContext] = useState<EvidenceDrawerContext | null>(
    null,
  );
  const [eventLibraryOpen, setEventLibraryOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceResponse | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [optimisticEvidences, setOptimisticEvidences] = useState<EvidenceResponse[]>([]);
  const [metricDrafts, setMetricDrafts] = useState<Partial<Record<MetricType, string>>>({});
  const [gpaScale, setGpaScale] = useState<4 | 10>(4);
  const initializedCriterionRef = useRef(false);
  const handledUploadEvidenceRequestRef = useRef(false);
  const handledEvidenceConfirmRequestRef = useRef<string | null>(null);

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
  const completionItems = useMemo(
    () => normalizeCriteriaCompletionItems(criteriaCompletion.data),
    [criteriaCompletion.data],
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
  const selectedState =
    criteriaStates.find((item) => item.key === selectedCriterion) ?? criteriaStates[0];
  const selectedCompletion = completionItems.find((item) => item.criterion === selectedCriterion);
  const selectedEvidences = useMemo(
    () => evidences.filter((item) => item.criterion === selectedCriterion),
    [evidences, selectedCriterion],
  );
  const isSelectedLocked =
    isSupplementMode && supplementCriteria.size > 0 && !supplementCriteria.has(selectedCriterion);
  const canEditSelectedCriterion = canEditApplication && !isSelectedLocked;
  const selectedSupportsOfficialEventImport = supportsOfficialEventImport(selectedCompletion);
  const selectedMetric = getPrimaryMetricInput(selectedCriterion);
  const completedCriteria = criteriaStates.filter((item) => item.status === "ok").length;
  const hasSubmitCta =
    application?.status === "ready_to_submit" ||
    (canSubmitApplication && completedCriteria === coreStudentCriteria.length) ||
    isSupplementMode;
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
      )
        .map((action) =>
          PRESENTATION_SEMANTICS_V2 ? applyActionPresentationToUiAction(action) : action,
        )
        .filter((action) => action.criterionKey || action.route),
    [application, criteriaStates, evidences, precheck],
  );
  const assistantSearch = useMemo<AssistantSearch>(
    () => ({
      source: "criterion",
      applicationId: application?.id,
      criterionKey: selectedCriterion,
      criterionLabel: criterionLabels[selectedCriterion],
    }),
    [application?.id, selectedCriterion],
  );

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
    (criterion: Criterion, context?: { requirementKey?: string; requirementLabel?: string }) => {
      if (!canEditApplication) {
        toast.error("Hồ sơ đã nộp. Bạn chỉ có thể bổ sung khi cán bộ yêu cầu.");
        return;
      }
      if (isSupplementMode && supplementCriteria.size > 0 && !supplementCriteria.has(criterion)) {
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
  }, [application, openEvidenceDrawer]);

  useEffect(() => {
    const request = getEvidenceConfirmRequestFromLocation();
    if (!request || handledEvidenceConfirmRequestRef.current === request.evidenceId) return;
    const target = evidences.find((item) => item.id === request.evidenceId);
    if (!target) return;
    handledEvidenceConfirmRequestRef.current = request.evidenceId;
    selectCriterion(target.criterion, setSelectedCriterion);
    setSelectedEvidence(target);
  }, [evidences]);

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
    if (!application || !selectedMetric || !canEditSelectedCriterion) return false;
    const rawValue = metricDrafts[selectedMetric.metricType] ?? "";
    const value = Number(rawValue);
    if (!rawValue || !Number.isFinite(value)) {
      toast.error("Vui lòng nhập giá trị hợp lệ.");
      return false;
    }
    const scale = selectedMetric.metricType === "gpa" ? gpaScale : selectedMetric.scale;
    const validationError = validateMetricValue(selectedMetric.metricType, value, scale);
    if (validationError) {
      toast.error(validationError);
      return false;
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
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu chỉ số.");
      return false;
    }
  };

  const precheckNow = () => {
    if (!application) return;
    runPrecheck.mutate({ id: application.id, level: application.targetLevel });
  };

  const submitNow = () => {
    if (!application) return;
    if (!hasSubmitCta) {
      toast.error("Bạn cần kiểm tra và hoàn thiện hồ sơ trước khi nộp.");
      return;
    }
    setConfirmSubmitOpen(true);
  };

  const confirmSubmit = () => {
    if (!application) return;
    submitApplication.mutate(
      {
        id: application.id,
        allowSubmitWithWarnings: true,
        studentNote: isSupplementMode
          ? "Sinh viên đã bổ sung hồ sơ theo phản hồi."
          : "Sinh viên nộp hồ sơ xét duyệt.",
        successMessage: isSupplementMode
          ? "Đã gửi lại hồ sơ bổ sung. Cán bộ sẽ tiếp tục xét duyệt."
          : "Đã nộp hồ sơ thành công. Hồ sơ đang chờ cán bộ xét duyệt.",
      },
      { onSuccess: () => setConfirmSubmitOpen(false) },
    );
  };

  if (current.isLoading) {
    return <WorkspaceSkeletonV2 />;
  }

  if (current.isError) {
    return (
      <div className="mx-auto flex w-full max-w-[1280px] min-w-0 flex-col gap-6">
        <WorkspaceContextBarShell
          title="Hồ sơ & minh chứng"
          helper="Hoàn thiện từng tiêu chí bằng dữ liệu và minh chứng phù hợp."
        />
        <InlineErrorStateV2
          title="Chưa tải được hồ sơ"
          description="Dữ liệu có thể đang mất kết nối tạm thời. Vui lòng thử lại."
          onRetry={() => void current.refetch()}
        />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="mx-auto flex w-full max-w-[1280px] min-w-0 flex-col gap-6">
        <WorkspaceContextBarShell
          title="Hồ sơ & minh chứng"
          helper="Tạo hồ sơ để bắt đầu chọn cấp đăng ký, thêm minh chứng và kiểm tra trước khi nộp."
        />
        <CompactEmptyStateV2
          title={`Chưa có hồ sơ Sinh viên 5 tốt năm học ${SCHOOL_YEAR}`}
          description="Sau khi tạo hồ sơ, bạn có thể hoàn thiện từng tiêu chí theo dữ liệu hiện có."
          action={
            <ButtonV2
              type="button"
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
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              Bắt đầu hồ sơ
            </ButtonV2>
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1280px] min-w-0 flex-col gap-6">
        <ApplicationWorkspaceContextBar
          title="Hồ sơ & minh chứng"
          helper="Hoàn thiện hồ sơ Sinh viên 5 tốt theo từng tiêu chí và kiểm tra trước khi nộp."
          schoolYear={application.schoolYear}
          targetLevel={application.targetLevel}
          statusLabel={getStudentApplicationStatus(application.status).label}
          onPrecheck={precheckNow}
          isPrechecking={runPrecheck.isPending}
        />

        {criteriaCompletion.isLoading ? (
          <InlineStateMessage
            tone="info"
            title="Đang tải trạng thái điều kiện của từng tiêu chí."
          />
        ) : criteriaCompletion.isError ? (
          <InlineStateMessage
            tone="warning"
            title="Chưa tải được trạng thái điều kiện"
            description="Màn hình đang tạm dùng dữ liệu minh chứng và tiền kiểm hiện có."
          />
        ) : null}

        <section className="grid min-w-0 items-start gap-6 lg:grid-cols-[232px_minmax(0,1fr)]">
          <CriteriaNavigationV2
            criteriaStates={criteriaStates}
            activeCriterion={selectedCriterion}
            onSelect={(criterion) => selectCriterion(criterion, setSelectedCriterion)}
          />

          <main className="min-w-0">
            <div className="flex min-w-0 flex-col gap-6 pb-28">
              <CriterionHeaderV2 state={selectedState} onOpenGuide={() => setGuideOpen(true)} />

              {isSelectedLocked ? (
                <InlineStateMessage
                  tone="warning"
                  title="Tiêu chí này không nằm trong yêu cầu bổ sung hiện tại."
                  description="Bạn có thể xem dữ liệu, nhưng chỉ bổ sung các tiêu chí được cán bộ yêu cầu."
                />
              ) : null}

              <CriterionActionRow
                assistantSearch={assistantSearch}
                canEdit={canEditSelectedCriterion}
                canFindOfficialEvent={
                  canEditSelectedCriterion &&
                  selectedSupportsOfficialEventImport &&
                  selectedCriterion !== "physical" &&
                  selectedCriterion !== "integration"
                }
                onFindOfficialEvent={openOfficialEventLibrary}
                onManualUpload={() =>
                  openEvidenceDrawer(selectedCriterion, {
                    requirementLabel: selectedState.label,
                  })
                }
              />

              <CriterionDataSection
                completion={selectedCompletion}
                criterion={selectedCriterion}
                canEdit={canEditSelectedCriterion}
                metrics={metrics}
                metricValue={metricDrafts[selectedMetric?.metricType ?? "gpa"] ?? ""}
                selectedMetric={selectedMetric}
                schoolYear={application.schoolYear}
                gpaScale={gpaScale}
                onGpaScaleChange={setGpaScale}
                onMetricChange={(value) =>
                  selectedMetric
                    ? setMetricDrafts((current) => ({
                        ...current,
                        [selectedMetric.metricType]: value,
                      }))
                    : undefined
                }
                onSaveMetric={saveMetric}
                savingMetric={
                  upsertMetric.isPending ||
                  declareEthicsConductScore.isPending ||
                  declareAcademicGpa.isPending
                }
                savingPhysical={declarePhysicalCourseResult.isPending}
                onDeclarePhysicalCourseResult={(input) =>
                  declarePhysicalCourseResult.mutateAsync({
                    id: application.id,
                    ...input,
                  })
                }
                savingVolunteerActivity={addVolunteerActivity.isPending}
                onAddVolunteerActivity={(input) =>
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
                onFindOfficialEvent={openOfficialEventLibrary}
                onRequirementAction={(requirement) =>
                  openEvidenceDrawer(selectedCriterion, {
                    requirementKey: requirement.key,
                    requirementLabel: getRequirementPresentation(requirement).label,
                  })
                }
              />

              <EvidenceGallerySection
                applicationId={application.id}
                canEdit={canEditSelectedCriterion}
                evidences={selectedEvidences}
                isLoading={evidencesQuery.isLoading}
                isError={evidencesQuery.isError}
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
            </div>

            <StickyNextActionBarV2
              className="min-h-[72px] px-4 sm:px-6"
              title={hasSubmitCta ? "Sẵn sàng gửi hồ sơ" : getBottomActionTitle(nextActions)}
              description={
                hasSubmitCta
                  ? "Kiểm tra lần cuối trước khi gửi hồ sơ cho cán bộ xét duyệt."
                  : getBottomActionDescription(nextActions)
              }
              secondaryAction={
                <ButtonV2
                  type="button"
                  variant="secondary"
                  onClick={precheckNow}
                  disabled={runPrecheck.isPending}
                >
                  {runPrecheck.isPending ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <BookOpenCheck aria-hidden="true" />
                  )}
                  Kiểm tra hồ sơ
                </ButtonV2>
              }
              primaryAction={
                hasSubmitCta ? (
                  <ButtonV2
                    type="button"
                    onClick={submitNow}
                    disabled={submitApplication.isPending}
                  >
                    {submitApplication.isPending ? (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Send aria-hidden="true" />
                    )}
                    Nộp hồ sơ
                  </ButtonV2>
                ) : nextActions[0]?.criterionKey ? (
                  <ButtonV2
                    type="button"
                    onClick={() =>
                      selectCriterion(nextActions[0].criterionKey!, setSelectedCriterion)
                    }
                  >
                    {nextActions[0].actionLabel}
                    <ChevronRight aria-hidden="true" />
                  </ButtonV2>
                ) : null
              }
            />
          </main>
        </section>
      </div>

      <GuideSheet
        open={guideOpen}
        onOpenChange={setGuideOpen}
        criterion={selectedCriterion as CoreCriterion}
        completion={selectedCompletion}
      />

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
          initialCriterion={evidenceDrawerContext.criterion}
          initialEvidenceName={getDefaultEvidenceName(evidenceDrawerContext.criterion)}
          initialRequirementKey={evidenceDrawerContext.requirementKey}
          initialRequirementLabel={evidenceDrawerContext.requirementLabel}
          onOpenChange={(open) => {
            if (!open) setEvidenceDrawerContext(null);
          }}
          onCreated={(created) => {
            const nextEvidence = normalizeOptimisticEvidence(created, application.id);
            setOptimisticEvidences((current) => upsertEvidence(current, nextEvidence));
            setEvidenceDrawerContext(null);
            selectCriterion(nextEvidence.criterion, setSelectedCriterion);
          }}
        />
      ) : null}

      <EvidenceDetailModal
        evidence={selectedEvidence}
        applicationId={application.id}
        canEdit={canEditApplication}
        initialMode={
          getEvidenceConfirmRequestFromLocation()?.evidenceId === selectedEvidence?.id
            ? "confirm"
            : "view"
        }
        onClose={() => {
          setSelectedEvidence(null);
          clearEvidenceConfirmRequestFromLocation();
        }}
        onChanged={() => {
          void evidencesQuery.refetch();
        }}
      />

      {confirmSubmitOpen ? (
        <SubmitConfirmationModal
          application={application}
          precheck={precheck}
          evidenceCounts={countEvidencesByCriterion(evidences)}
          onCancel={() => setConfirmSubmitOpen(false)}
          onConfirm={confirmSubmit}
          pending={submitApplication.isPending}
        />
      ) : null}
    </>
  );
}

function WorkspaceContextBarShell({ title, helper }: { title: string; helper: string }) {
  return (
    <section className="flex min-h-20 min-w-0 items-center rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <h1 className="m-0 text-[24px] font-bold leading-8 text-[var(--student-v2-text-primary)]">
          {title}
        </h1>
        <p className="mt-1 line-clamp-2 text-[14px] leading-[22px] text-[var(--student-v2-text-secondary)]">
          {helper}
        </p>
      </div>
    </section>
  );
}

function ApplicationWorkspaceContextBar({
  title,
  helper,
  schoolYear,
  targetLevel,
  statusLabel,
  isPrechecking,
  onPrecheck,
}: {
  title: string;
  helper: string;
  schoolYear: string;
  targetLevel: Level;
  statusLabel: string;
  isPrechecking: boolean;
  onPrecheck: () => void;
}) {
  return (
    <section
      className="flex min-h-20 min-w-0 flex-col gap-4 rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-5 py-4 sm:px-6 lg:min-h-24 lg:flex-row lg:items-center lg:justify-between"
      aria-labelledby="application-workspace-title"
    >
      <div className="min-w-0">
        <h1
          id="application-workspace-title"
          className="m-0 text-[24px] font-bold leading-8 text-[var(--student-v2-text-primary)]"
        >
          {title}
        </h1>
        <p className="mt-1 line-clamp-1 text-[14px] leading-[22px] text-[var(--student-v2-text-secondary)]">
          {helper}
        </p>
        <div className="mt-2 flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-[13px] leading-[18px] text-[var(--student-v2-text-secondary)]">
          <span>Năm học {schoolYear}</span>
          <span>Cấp đăng ký: {levelLabels[targetLevel]}</span>
          <span>Trạng thái: {statusLabel}</span>
        </div>
      </div>
      <ButtonV2 type="button" variant="secondary" onClick={onPrecheck} disabled={isPrechecking}>
        {isPrechecking ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <BookOpenCheck aria-hidden="true" />
        )}
        Kiểm tra hồ sơ
      </ButtonV2>
    </section>
  );
}

function CriteriaNavigationV2({
  criteriaStates,
  activeCriterion,
  onSelect,
}: {
  criteriaStates: CriteriaState[];
  activeCriterion: Criterion;
  onSelect: (criterion: Criterion) => void;
}) {
  return (
    <aside
      className="sticky top-0 z-10 -mx-4 overflow-x-auto bg-[var(--student-v2-surface-app)] px-4 py-1 sm:-mx-6 sm:px-6 lg:top-6 lg:z-auto lg:mx-0 lg:overflow-visible lg:bg-transparent lg:px-0 lg:py-0"
      aria-label="Chọn tiêu chí"
    >
      <div className="flex min-w-max snap-x snap-mandatory overflow-hidden rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] lg:block lg:min-w-0">
        {criteriaStates.map((state, index) => (
          <div
            key={state.key}
            className={cn(
              "w-[190px] shrink-0 snap-start lg:w-auto",
              index > 0
                ? "border-l border-[var(--student-v2-divider)] lg:border-l-0 lg:border-t"
                : "",
            )}
          >
            <CriteriaNavigationRowV2
              number={String(index + 1).padStart(2, "0")}
              title={state.label}
              status={state.progressStatus}
              detail={state.completionText ?? `${state.evidenceCount} minh chứng`}
              active={state.key === activeCriterion}
              onClick={() => onSelect(state.key)}
              className="min-h-[68px] px-3 py-3 lg:px-4"
            />
          </div>
        ))}
      </div>
    </aside>
  );
}

function CriterionHeaderV2({
  state,
  onOpenGuide,
}: {
  state: CriteriaState;
  onOpenGuide: () => void;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-5 py-5 sm:px-6">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="m-0 text-[22px] font-bold leading-7 text-[var(--student-v2-text-primary)]">
            {state.label}
          </h2>
          <p className="mt-2 max-w-3xl text-[14px] leading-[22px] text-[var(--student-v2-text-secondary)]">
            {state.displayDescription}
          </p>
        </div>
        <GuideSheetTriggerV2
          criterionName={state.label}
          onClick={onOpenGuide}
          className="shrink-0 self-start"
        />
      </div>
    </section>
  );
}

function CriterionActionRow({
  assistantSearch,
  canEdit,
  canFindOfficialEvent,
  onFindOfficialEvent,
  onManualUpload,
}: {
  assistantSearch: AssistantSearch;
  canEdit: boolean;
  canFindOfficialEvent: boolean;
  onFindOfficialEvent: () => void;
  onManualUpload: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center min-[900px]:gap-3">
      <ButtonV2 type="button" onClick={onFindOfficialEvent} disabled={!canFindOfficialEvent}>
        <Search aria-hidden="true" />
        Dùng dữ liệu chính thức
      </ButtonV2>
      <ButtonV2 type="button" variant="secondary" onClick={onManualUpload} disabled={!canEdit}>
        <Upload aria-hidden="true" />
        Tải minh chứng
      </ButtonV2>
      <ButtonV2 asChild variant="tertiary">
        <Link to="/app/assistant" search={assistantSearch}>
          Hỏi trợ lý
        </Link>
      </ButtonV2>
    </div>
  );
}

function CriterionDataSection({
  completion,
  criterion,
  canEdit,
  metrics,
  metricValue,
  selectedMetric,
  schoolYear,
  gpaScale,
  onGpaScaleChange,
  onMetricChange,
  onSaveMetric,
  savingMetric,
  savingPhysical,
  onDeclarePhysicalCourseResult,
  savingVolunteerActivity,
  onAddVolunteerActivity,
  savingIntegrationPath,
  onAddIntegrationPath,
  onFindOfficialEvent,
  onRequirementAction,
}: {
  completion?: CriterionCompletionItem;
  criterion: Criterion;
  canEdit: boolean;
  metrics: ApplicationMetric[];
  metricValue: string;
  selectedMetric?: ReturnType<typeof getPrimaryMetricInput>;
  schoolYear?: string | null;
  gpaScale: 4 | 10;
  onGpaScaleChange: (value: 4 | 10) => void;
  onMetricChange: (value: string) => void;
  onSaveMetric: () => Promise<boolean>;
  savingMetric: boolean;
  savingPhysical: boolean;
  onDeclarePhysicalCourseResult: (input: {
    resultType: "score" | "classification";
    value?: number;
    classification?: string;
    schoolYear: string;
    replaceExisting?: boolean;
  }) => Promise<unknown>;
  savingVolunteerActivity: boolean;
  onAddVolunteerActivity: (input: {
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
    requirementKey: string;
    payloadJson: Record<string, unknown>;
  }) => Promise<unknown>;
  onFindOfficialEvent: () => void;
  onRequirementAction: (requirement: RequirementItem) => void;
}) {
  const groups = completion?.requirementGroups ?? [];
  const requirements = groups.flatMap((group) => group.requirements ?? []);
  const aggregationRows = buildAggregationRows(requirements);
  const oneOfGroup = groups.find(
    (group) => group.operator === "one_of" && group.requirements?.length,
  );
  const hasDynamicSchema = groups.some((group) => Boolean(group.formSchema));
  const metricRows = buildDefinitionRows({
    requirements,
    metrics,
    selectedMetric,
    metricValue,
    gpaScale,
    canEdit,
    savingMetric,
    onGpaScaleChange,
    onMetricChange,
    onSaveMetric,
    onRequirementAction,
  });

  let content: ReactNode;
  if (criterion === "ethics" && completion) {
    content = (
      <EthicsDataSectionV2
        completion={completion}
        metrics={metrics}
        metricValue={metricValue}
        selectedMetric={selectedMetric}
        schoolYear={schoolYear}
        canEdit={canEdit}
        savingMetric={savingMetric}
        onMetricChange={onMetricChange}
        onSaveMetric={onSaveMetric}
        onRequirementAction={onRequirementAction}
      />
    );
  } else if (criterion === "academic" && completion) {
    content = (
      <AcademicDataSectionV2
        completion={completion}
        metrics={metrics}
        metricValue={metricValue}
        selectedMetric={selectedMetric}
        schoolYear={schoolYear}
        gpaScale={gpaScale}
        canEdit={canEdit}
        savingMetric={savingMetric}
        onGpaScaleChange={onGpaScaleChange}
        onMetricChange={onMetricChange}
        onSaveMetric={onSaveMetric}
        onRequirementAction={onRequirementAction}
      />
    );
  } else if (criterion === "physical" && completion) {
    content = (
      <PhysicalDataSectionV2
        completion={completion}
        schoolYear={schoolYear || SCHOOL_YEAR}
        canEdit={canEdit}
        saving={savingPhysical}
        onDeclareCourseResult={onDeclarePhysicalCourseResult}
        onFindOfficialEvent={onFindOfficialEvent}
        onRequirementAction={onRequirementAction}
      />
    );
  } else if (criterion === "volunteer" && completion) {
    content = (
      <VolunteerDataSectionV2
        completion={completion}
        canEdit={canEdit}
        saving={savingVolunteerActivity}
        onAddActivity={onAddVolunteerActivity}
        onFindOfficialEvent={onFindOfficialEvent}
        onRequirementAction={onRequirementAction}
      />
    );
  } else if (criterion === "integration" && completion) {
    content = (
      <IntegrationDataSectionV2
        completion={completion}
        canEdit={canEdit}
        saving={savingIntegrationPath}
        onAddPath={onAddIntegrationPath}
        onFindOfficialEvent={onFindOfficialEvent}
        onRequirementAction={onRequirementAction}
      />
    );
  } else if (aggregationRows.length) {
    content = <ActivityLedgerV2 rows={aggregationRows} />;
  } else if (oneOfGroup) {
    content = (
      <PathSelectorListV2
        items={buildPathItems(oneOfGroup)}
        onSelect={(id) => {
          const requirement = oneOfGroup.requirements.find((item) => item.key === id);
          if (requirement && canEdit) onRequirementAction(requirement);
        }}
      />
    );
  } else if (metricRows.length) {
    content = <DefinitionTableV2 rows={metricRows} />;
  } else {
    content = (
      <DynamicFormDisclosure
        criterion={criterion}
        hasDynamicSchema={hasDynamicSchema}
        onAdd={() => requirements[0] && onRequirementAction(requirements[0])}
        canEdit={canEdit}
      />
    );
  }

  return (
    <section className="min-w-0">
      <SectionHeading
        title="Dữ liệu điều kiện"
        description="Mục này hiển thị đúng một dạng dữ liệu phù hợp với tiêu chí đang chọn."
        className="mb-3"
      />
      {content}
    </section>
  );
}

function EthicsDataSectionV2({
  completion,
  metrics,
  metricValue,
  selectedMetric,
  schoolYear,
  canEdit,
  savingMetric,
  onMetricChange,
  onSaveMetric,
  onRequirementAction,
}: {
  completion: CriterionCompletionItem;
  metrics: ApplicationMetric[];
  metricValue: string;
  selectedMetric?: ReturnType<typeof getPrimaryMetricInput>;
  schoolYear?: string | null;
  canEdit: boolean;
  savingMetric: boolean;
  onMetricChange: (value: string) => void;
  onSaveMetric: () => Promise<boolean>;
  onRequirementAction: (requirement: RequirementItem) => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const conduct = findRequirement(completion, "conduct_score");
  const noViolation = findRequirement(completion, "no_violation");
  const conductMetric = getApplicationMetric(metrics, "conduct_score");
  const existingConductValue = conductMetric?.value != null ? String(conductMetric.value) : "";
  const additionalGroup = findRequirementGroup(completion, "ethics_additional_achievements");
  const canEditConduct = canEdit && selectedMetric?.metricType === "conduct_score";

  const openForm = () => {
    onMetricChange(existingConductValue);
    setFormError(null);
    setFormOpen(true);
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateConductScoreValue(metricValue);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    const saved = await onSaveMetric();
    if (saved) {
      setFormOpen(false);
      setFormError(null);
    }
  };

  const rows: DefinitionTableV2Row[] = [
    {
      label: "Điểm rèn luyện",
      value:
        getRequirementDisplayValue(conduct) ??
        (existingConductValue ? `${existingConductValue}/100` : "Chưa có"),
      source: getDisplayRequirementSourceLabel(conduct, existingConductValue),
      status: (
        <StatusPillV2
          status={mapRequirementStatus(
            conduct?.status ?? (existingConductValue ? "declared" : "not_started"),
          )}
          label={getRequirementStatusLabel(
            conduct?.status ?? (existingConductValue ? "declared" : "not_started"),
          )}
        />
      ),
      action: canEditConduct ? (
        <ButtonV2 type="button" variant="secondary" size="compact" onClick={openForm}>
          {existingConductValue ? "Chỉnh điểm" : "Khai báo"}
        </ButtonV2>
      ) : null,
    },
    {
      label: "Tình trạng vi phạm",
      value: getRequirementDisplayValue(noViolation) ?? "Chờ nhà trường xác minh",
      source: getDisplayRequirementSourceLabel(noViolation),
      status: (
        <StatusPillV2
          status={mapRequirementStatus(noViolation?.status ?? "needs_verification")}
          label={getRequirementStatusLabel(noViolation?.status ?? "needs_verification")}
        />
      ),
      action: <LongTextValue value={noViolationPassiveCopy(noViolation)} />,
    },
    {
      label: "Năm học",
      value: schoolYear || getRequirementPayloadString(conduct, "schoolYear") || "Chưa có",
      source: schoolYear ? "Hồ sơ hiện tại" : getDisplayRequirementSourceLabel(conduct),
      status: (
        <StatusPillV2
          status={schoolYear ? "complete" : "not-started"}
          label={schoolYear ? "Đã ghi nhận" : "Chưa có"}
        />
      ),
    },
  ];

  return (
    <div className="grid min-w-0 gap-4">
      <DefinitionTableV2 rows={rows} />

      {formOpen ? (
        <form
          className="min-w-0 rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-5 py-4"
          onSubmit={submitForm}
        >
          <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(180px,1fr)_auto_auto] md:items-end">
            <label className="min-w-0 text-[14px] font-medium leading-5 text-[var(--student-v2-text-primary)]">
              Điểm rèn luyện
              <input
                value={metricValue}
                onChange={(event) => {
                  onMetricChange(event.target.value);
                  setFormError(null);
                }}
                inputMode="decimal"
                placeholder={selectedMetric?.placeholder ?? "Ví dụ 90"}
                aria-describedby={formError ? "ethics-conduct-error" : undefined}
                className="mt-1 min-h-11 w-full min-w-0 rounded-[var(--student-v2-radius-control)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--student-v2-focus-ring)]"
                disabled={!canEditConduct || savingMetric}
              />
            </label>
            <ButtonV2 type="submit" variant="primary" disabled={!canEditConduct || savingMetric}>
              {savingMetric ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Lưu điểm
            </ButtonV2>
            <ButtonV2
              type="button"
              variant="tertiary"
              onClick={() => {
                onMetricChange(existingConductValue);
                setFormOpen(false);
                setFormError(null);
              }}
              disabled={savingMetric}
            >
              Hủy thay đổi
            </ButtonV2>
          </div>
          {formError ? (
            <p
              id="ethics-conduct-error"
              className="mt-2 text-[13px] leading-[18px] text-[var(--student-v2-critical-text)]"
            >
              {formError}
            </p>
          ) : null}
        </form>
      ) : null}

      {noViolation && noViolation.status !== "verified" ? (
        <InlineStateMessage
          tone="info"
          title="Chờ nhà trường xác minh tình trạng vi phạm"
          description="Sinh viên không tự xác minh mục này. Bạn có thể tiếp tục hoàn thiện các tiêu chí khác trong khi chờ dữ liệu chính thức."
        />
      ) : null}

      <AchievementDisclosureV2
        title="Thành tích đạo đức bổ sung"
        group={additionalGroup}
        canEdit={canEdit}
        actionLabel="Bổ sung giấy xác nhận"
        onRequirementAction={onRequirementAction}
      />
    </div>
  );
}

function AcademicDataSectionV2({
  completion,
  metrics,
  metricValue,
  selectedMetric,
  schoolYear,
  gpaScale,
  canEdit,
  savingMetric,
  onGpaScaleChange,
  onMetricChange,
  onSaveMetric,
  onRequirementAction,
}: {
  completion: CriterionCompletionItem;
  metrics: ApplicationMetric[];
  metricValue: string;
  selectedMetric?: ReturnType<typeof getPrimaryMetricInput>;
  schoolYear?: string | null;
  gpaScale: 4 | 10;
  canEdit: boolean;
  savingMetric: boolean;
  onGpaScaleChange: (value: 4 | 10) => void;
  onMetricChange: (value: string) => void;
  onSaveMetric: () => Promise<boolean>;
  onRequirementAction: (requirement: RequirementItem) => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const gpa = findRequirement(completion, "academic_gpa");
  const noFGrade = findRequirement(completion, "no_f_grade");
  const period = findRequirement(completion, "academic_period_valid");
  const gpaMetric = getApplicationMetric(metrics, "gpa");
  const existingGpaValue = gpaMetric?.value != null ? String(gpaMetric.value) : "";
  const existingScale =
    numericPayloadValue(getLatestRequirementResponse(gpa)?.payloadJson, "rawScale") ??
    gpaMetric?.scale ??
    gpaScale;
  const additionalGroup = findRequirementGroup(completion, "academic_additional_achievement");
  const canEditGpa = canEdit && selectedMetric?.metricType === "gpa";

  const openForm = () => {
    onMetricChange(existingGpaValue);
    onGpaScaleChange(existingScale === 10 ? 10 : 4);
    setFormError(null);
    setFormOpen(true);
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateAcademicGpaValue(metricValue, gpaScale);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    const saved = await onSaveMetric();
    if (saved) {
      setFormOpen(false);
      setFormError(null);
    }
  };

  const rows: DefinitionTableV2Row[] = [
    {
      label: "Thang điểm",
      value: String(existingScale),
      source: getDisplayRequirementSourceLabel(gpa, existingGpaValue),
      status: (
        <StatusPillV2
          status={mapRequirementStatus(
            gpa?.status ?? (existingGpaValue ? "declared" : "not_started"),
          )}
          label={getRequirementStatusLabel(
            gpa?.status ?? (existingGpaValue ? "declared" : "not_started"),
          )}
        />
      ),
    },
    {
      label: "GPA/ĐTB",
      value:
        getRequirementDisplayValue(gpa) ??
        (existingGpaValue ? `${existingGpaValue}/${existingScale}` : "Chưa có"),
      source: getDisplayRequirementSourceLabel(gpa, existingGpaValue),
      status: (
        <StatusPillV2
          status={mapRequirementStatus(
            gpa?.status ?? (existingGpaValue ? "declared" : "not_started"),
          )}
          label={academicGpaStatusLabel(gpa)}
        />
      ),
      action: canEditGpa ? (
        <ButtonV2 type="button" variant="secondary" size="compact" onClick={openForm}>
          {existingGpaValue ? "Chỉnh kết quả" : "Tự khai báo kết quả"}
        </ButtonV2>
      ) : null,
    },
    {
      label: "Năm học",
      value: schoolYear || getRequirementPayloadString(gpa, "schoolYear") || "Cần xác minh",
      source: schoolYear ? "Hồ sơ hiện tại" : getDisplayRequirementSourceLabel(gpa),
      status: (
        <StatusPillV2
          status={schoolYear ? "complete" : "waiting"}
          label={schoolYear ? "Đã ghi nhận" : "Cần xác minh"}
        />
      ),
    },
    {
      label: "Nguồn dữ liệu",
      value: getDisplayRequirementSourceLabel(gpa, existingGpaValue),
      source: "Hệ thống",
      status: (
        <StatusPillV2
          status={existingGpaValue || gpa ? "waiting" : "not-started"}
          label={existingGpaValue || gpa ? "Đã ghi nhận" : "Chưa có"}
        />
      ),
    },
    {
      label: "Tình trạng điểm F",
      value: noFGradeStatusCopy(noFGrade),
      source: getDisplayRequirementSourceLabel(noFGrade),
      status: (
        <StatusPillV2
          status={mapRequirementStatus(noFGrade?.status ?? "needs_verification")}
          label={getRequirementStatusLabel(noFGrade?.status ?? "needs_verification")}
        />
      ),
    },
    {
      label: "Xác minh năm học",
      value: academicPeriodLabel(period),
      source: getDisplayRequirementSourceLabel(period),
      status: (
        <StatusPillV2
          status={mapRequirementStatus(period?.status ?? "needs_verification")}
          label={getRequirementStatusLabel(period?.status ?? "needs_verification")}
        />
      ),
    },
  ];

  return (
    <div className="grid min-w-0 gap-4">
      <DefinitionTableV2 rows={rows} />

      {formOpen ? (
        <form
          className="min-w-0 rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-5 py-4"
          onSubmit={submitForm}
        >
          <div className="grid min-w-0 gap-3 md:grid-cols-[140px_minmax(180px,1fr)_auto_auto] md:items-end">
            <label className="text-[14px] font-medium leading-5 text-[var(--student-v2-text-primary)]">
              Thang điểm
              <select
                value={gpaScale}
                onChange={(event) => {
                  onGpaScaleChange(Number(event.target.value) === 10 ? 10 : 4);
                  setFormError(null);
                }}
                className="mt-1 min-h-11 w-full rounded-[var(--student-v2-radius-control)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--student-v2-focus-ring)]"
                disabled={!canEditGpa || savingMetric}
              >
                <option value={4}>Thang 4</option>
                <option value={10}>Thang 10</option>
              </select>
            </label>
            <label className="min-w-0 text-[14px] font-medium leading-5 text-[var(--student-v2-text-primary)]">
              GPA/ĐTB
              <input
                value={metricValue}
                onChange={(event) => {
                  onMetricChange(event.target.value);
                  setFormError(null);
                }}
                inputMode="decimal"
                placeholder={
                  selectedMetric?.placeholder ?? (gpaScale === 10 ? "Ví dụ 8.5" : "Ví dụ 3.4")
                }
                aria-describedby={formError ? "academic-gpa-error" : undefined}
                className="mt-1 min-h-11 w-full min-w-0 rounded-[var(--student-v2-radius-control)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--student-v2-focus-ring)]"
                disabled={!canEditGpa || savingMetric}
              />
            </label>
            <ButtonV2 type="submit" variant="primary" disabled={!canEditGpa || savingMetric}>
              {savingMetric ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Lưu GPA
            </ButtonV2>
            <ButtonV2
              type="button"
              variant="tertiary"
              onClick={() => {
                onMetricChange(existingGpaValue);
                setFormOpen(false);
                setFormError(null);
              }}
              disabled={savingMetric}
            >
              Hủy thay đổi
            </ButtonV2>
          </div>
          {formError ? (
            <p
              id="academic-gpa-error"
              className="mt-2 text-[13px] leading-[18px] text-[var(--student-v2-critical-text)]"
            >
              {formError}
            </p>
          ) : null}
        </form>
      ) : null}

      {gpa && ["declared", "needs_verification"].includes(gpa.status) ? (
        <InlineStateMessage
          tone="info"
          title="Đang chờ xác minh kết quả học tập"
          description="Trạng thái chờ xác minh là thụ động. Bạn có thể tiếp tục bổ sung minh chứng hoặc hoàn thiện tiêu chí khác."
        />
      ) : null}

      <AchievementDisclosureV2
        title="Thành tích học thuật bổ sung"
        group={additionalGroup}
        canEdit={canEdit}
        actionLabel="Bổ sung thành tích"
        onRequirementAction={onRequirementAction}
      />
    </div>
  );
}

function PhysicalDataSectionV2({
  completion,
  schoolYear,
  canEdit,
  saving,
  onDeclareCourseResult,
  onFindOfficialEvent,
  onRequirementAction,
}: {
  completion: CriterionCompletionItem;
  schoolYear: string;
  canEdit: boolean;
  saving: boolean;
  onDeclareCourseResult: (input: {
    resultType: "score" | "classification";
    value?: number;
    classification?: string;
    schoolYear: string;
    replaceExisting?: boolean;
  }) => Promise<unknown>;
  onFindOfficialEvent: () => void;
  onRequirementAction: (requirement: RequirementItem) => void;
}) {
  const paths = getPathRequirements(completion, "physical_path");
  const existingPath = paths.find((path) => hasRequirementResponse(path));
  const [selectedPathKey, setSelectedPathKey] = useState(existingPath?.key ?? "");
  const [selectorOpen, setSelectorOpen] = useState(!existingPath);
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [resultType, setResultType] = useState<"score" | "classification">("score");
  const [courseValue, setCourseValue] = useState("");
  const [classification, setClassification] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const selectedPath = paths.find((path) => path.key === selectedPathKey);
  const hasUnsavedData = courseValue.trim() || classification.trim();

  const selectPath = (pathKey: string) => {
    if (hasUnsavedData && !confirmUnsavedPathChange()) return;
    setSelectedPathKey(pathKey);
    setSelectorOpen(false);
    setCourseFormOpen(false);
    setCourseValue("");
    setClassification("");
    setReplaceExisting(false);
    setFormError(null);
  };

  const submitCourseResult = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPath || selectedPath.key !== "physical_course_result") return;
    const value = Number(courseValue);
    if (resultType === "score" && (!courseValue || !Number.isFinite(value))) {
      setFormError("Vui lòng nhập điểm Giáo dục thể chất hợp lệ.");
      return;
    }
    if (resultType === "classification" && !classification.trim()) {
      setFormError("Vui lòng nhập xếp loại Giáo dục thể chất.");
      return;
    }
    try {
      await onDeclareCourseResult({
        resultType,
        value: resultType === "score" ? value : undefined,
        classification: resultType === "classification" ? classification.trim() : undefined,
        schoolYear,
        replaceExisting,
      });
      setCourseFormOpen(false);
      setCourseValue("");
      setClassification("");
      setReplaceExisting(false);
      setFormError(null);
      toast.success("Đã lưu cách chứng minh Thể lực tốt.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu kết quả thể lực.");
    }
  };

  if (!paths.length) {
    return (
      <InlineStateMessage
        tone="warning"
        title="Chưa có cấu hình hình thức thể lực"
        description="Tiêu chí này chưa trả về nhóm one_of từ backend. Bạn vẫn có thể tải minh chứng thủ công nếu được phép."
      />
    );
  }

  return (
    <div className="grid min-w-0 gap-4">
      {selectorOpen || !selectedPath ? (
        <PathSelectionSurfaceV2
          title="Chọn cách chứng minh Thể lực tốt"
          description="Chỉ cần chọn một hình thức phù hợp theo cấu hình hiện tại."
          paths={paths}
          selectedPathKey={selectedPathKey}
          onSelect={selectPath}
          readonly={!canEdit}
        />
      ) : (
        <SelectedPathSummaryV2
          requirement={selectedPath}
          onChangePath={() => {
            if (hasUnsavedData && !confirmUnsavedPathChange()) return;
            setSelectorOpen(true);
          }}
          canChange={canEdit}
        />
      )}

      {selectedPath && !selectorOpen ? (
        <section className="min-w-0 rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-5 py-4">
          <SectionHeading
            title={getPathTitle(selectedPath)}
            description={`Nguồn: ${getDisplayRequirementSourceLabel(selectedPath)}`}
            action={
              selectedPath.acceptedSources?.includes("official_event") ? (
                <ButtonV2
                  type="button"
                  variant="secondary"
                  size="compact"
                  onClick={onFindOfficialEvent}
                  disabled={!canEdit}
                >
                  <Search aria-hidden="true" />
                  Tìm dữ liệu chính thức
                </ButtonV2>
              ) : null
            }
            className="mb-4"
          />

          {selectedPath.key === "physical_course_result" ? (
            courseFormOpen ? (
              <form onSubmit={submitCourseResult} className="grid min-w-0 gap-3">
                <div className="grid min-w-0 gap-3 md:grid-cols-[160px_minmax(180px,1fr)_auto] md:items-end">
                  <label className="text-[14px] font-medium leading-5 text-[var(--student-v2-text-primary)]">
                    Kết quả GDTC
                    <select
                      value={resultType}
                      onChange={(event) =>
                        setResultType(
                          event.target.value === "classification" ? "classification" : "score",
                        )
                      }
                      disabled={!canEdit || saving}
                      className="mt-1 min-h-11 w-full rounded-[var(--student-v2-radius-control)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--student-v2-focus-ring)]"
                    >
                      <option value="score">Điểm</option>
                      <option value="classification">Xếp loại</option>
                    </select>
                  </label>
                  {resultType === "score" ? (
                    <label className="min-w-0 text-[14px] font-medium leading-5 text-[var(--student-v2-text-primary)]">
                      Điểm / 10
                      <input
                        value={courseValue}
                        onChange={(event) => {
                          setCourseValue(event.target.value);
                          setFormError(null);
                        }}
                        inputMode="decimal"
                        placeholder="Ví dụ 8.0"
                        aria-describedby={formError ? "physical-course-error" : undefined}
                        disabled={!canEdit || saving}
                        className="mt-1 min-h-11 w-full min-w-0 rounded-[var(--student-v2-radius-control)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--student-v2-focus-ring)]"
                      />
                    </label>
                  ) : (
                    <label className="min-w-0 text-[14px] font-medium leading-5 text-[var(--student-v2-text-primary)]">
                      Xếp loại
                      <input
                        value={classification}
                        onChange={(event) => {
                          setClassification(event.target.value);
                          setFormError(null);
                        }}
                        placeholder="Ví dụ Đạt"
                        aria-describedby={formError ? "physical-course-error" : undefined}
                        disabled={!canEdit || saving}
                        className="mt-1 min-h-11 w-full min-w-0 rounded-[var(--student-v2-radius-control)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--student-v2-focus-ring)]"
                      />
                    </label>
                  )}
                  <ButtonV2 type="submit" variant="primary" disabled={!canEdit || saving}>
                    {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                    Lưu kết quả
                  </ButtonV2>
                </div>
                <label className="flex min-h-11 items-center gap-2 text-[14px] leading-5 text-[var(--student-v2-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(event) => setReplaceExisting(event.target.checked)}
                    disabled={!canEdit || saving}
                  />
                  Thay thế cách chứng minh đang nộp trước đó
                </label>
                {formError ? (
                  <p
                    id="physical-course-error"
                    className="text-[13px] leading-[18px] text-[var(--student-v2-critical-text)]"
                  >
                    {formError}
                  </p>
                ) : null}
                <div>
                  <ButtonV2
                    type="button"
                    variant="tertiary"
                    onClick={() => {
                      setCourseFormOpen(false);
                      setCourseValue("");
                      setClassification("");
                      setFormError(null);
                    }}
                    disabled={saving}
                  >
                    Hủy thay đổi
                  </ButtonV2>
                </div>
              </form>
            ) : (
              <ButtonV2
                type="button"
                variant="secondary"
                onClick={() => setCourseFormOpen(true)}
                disabled={!canEdit}
              >
                Khai báo kết quả GDTC
              </ButtonV2>
            )
          ) : (
            <PathActionAreaV2
              requirement={selectedPath}
              canEdit={canEdit}
              onFindOfficialEvent={onFindOfficialEvent}
              onRequirementAction={onRequirementAction}
            />
          )}
        </section>
      ) : null}

      <ExistingPathResponsesV2 title="Hình thức đã ghi nhận" paths={paths} />
    </div>
  );
}

function VolunteerDataSectionV2({
  completion,
  canEdit,
  saving,
  onAddActivity,
  onFindOfficialEvent,
  onRequirementAction,
}: {
  completion: CriterionCompletionItem;
  canEdit: boolean;
  saving: boolean;
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
  onFindOfficialEvent: () => void;
  onRequirementAction: (requirement: RequirementItem) => void;
}) {
  const days = findRequirement(completion, "accumulated_volunteer_days");
  const count = findRequirement(completion, "activity_count");
  const primaryRequirement = days ?? count;
  const aggregation = primaryRequirement?.aggregation;
  const activities = [days, count]
    .flatMap((requirement) => requirement?.aggregation?.activities ?? [])
    .filter((activity, index, all) => all.findIndex((item) => item.id === activity.id) === index);
  const [formOpen, setFormOpen] = useState(false);
  const [activityName, setActivityName] = useState("");
  const [activityType, setActivityType] = useState("volunteer_activity");
  const [organizer, setOrganizer] = useState("");
  const [declaredValue, setDeclaredValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setActivityName("");
    setActivityType("volunteer_activity");
    setOrganizer("");
    setDeclaredValue("");
    setStartDate("");
    setEndDate("");
    setFormError(null);
  };

  const submitActivity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = declaredValue ? Number(declaredValue) : undefined;
    if (!activityName.trim()) {
      setFormError("Vui lòng nhập tên hoạt động tình nguyện.");
      return;
    }
    if (declaredValue && !Number.isFinite(value)) {
      setFormError("Giá trị hoạt động không hợp lệ.");
      return;
    }
    try {
      await onAddActivity({
        requirementKey: "accumulated_volunteer_days",
        activityType,
        activityName: activityName.trim(),
        organizer: organizer.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        declaredValue: value,
        declaredUnit: "day",
      });
      setFormOpen(false);
      resetForm();
      toast.success("Đã thêm hoạt động tình nguyện, chờ xác minh.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể thêm hoạt động tình nguyện.");
    }
  };

  return (
    <div className="grid min-w-0 gap-4">
      <div className="rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-5 py-4">
        <SectionHeading
          title="Sổ hoạt động tình nguyện"
          description="Tiến độ sử dụng tổng hợp từ backend; hệ thống không tính quy đổi ở giao diện sinh viên."
          action={
            <div className="flex flex-wrap gap-2">
              {supportsOfficialEventRequirement(primaryRequirement) ? (
                <ButtonV2
                  type="button"
                  variant="secondary"
                  size="compact"
                  onClick={onFindOfficialEvent}
                >
                  <Search aria-hidden="true" />
                  Tìm hoạt động chính thức
                </ButtonV2>
              ) : null}
              {canEdit ? (
                <ButtonV2
                  type="button"
                  variant="secondary"
                  size="compact"
                  onClick={() => setFormOpen(true)}
                >
                  <Plus aria-hidden="true" />
                  Thêm hoạt động
                </ButtonV2>
              ) : null}
            </div>
          }
          className="mb-4"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <VolunteerSummaryMetricV2
            label="Đã xác minh"
            value={aggregation?.verifiedTotal ?? 0}
            unit={aggregation?.unit ?? "day"}
            status="complete"
          />
          <VolunteerSummaryMetricV2
            label="Chờ xác minh"
            value={aggregation?.pendingVerificationTotal ?? 0}
            unit={aggregation?.unit ?? "day"}
            status="waiting"
          />
          <VolunteerSummaryMetricV2
            label="Mục tiêu"
            value={aggregation?.threshold ?? 0}
            unit={aggregation?.unit ?? "day"}
            status="not-started"
          />
        </div>
      </div>

      {formOpen ? (
        <form
          className="rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-5 py-4"
          onSubmit={submitActivity}
        >
          <div className="grid min-w-0 gap-3 md:grid-cols-3">
            <label className="min-w-0 text-[14px] font-medium leading-5 text-[var(--student-v2-text-primary)] md:col-span-2">
              Tên hoạt động
              <input
                value={activityName}
                onChange={(event) => {
                  setActivityName(event.target.value);
                  setFormError(null);
                }}
                aria-describedby={formError ? "volunteer-activity-error" : undefined}
                className="mt-1 min-h-11 w-full rounded-[var(--student-v2-radius-control)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--student-v2-focus-ring)]"
                disabled={!canEdit || saving}
              />
            </label>
            <label className="text-[14px] font-medium leading-5 text-[var(--student-v2-text-primary)]">
              Loại hoạt động
              <select
                value={activityType}
                onChange={(event) => setActivityType(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-[var(--student-v2-radius-control)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--student-v2-focus-ring)]"
                disabled={!canEdit || saving}
              >
                <option value="volunteer_activity">Tình nguyện</option>
                <option value="blood_donation">Hiến máu</option>
                <option value="green_sunday">Chủ nhật xanh</option>
              </select>
            </label>
            <label className="text-[14px] font-medium leading-5 text-[var(--student-v2-text-primary)]">
              Đơn vị tổ chức
              <input
                value={organizer}
                onChange={(event) => setOrganizer(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-[var(--student-v2-radius-control)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--student-v2-focus-ring)]"
                disabled={!canEdit || saving}
              />
            </label>
            <label className="text-[14px] font-medium leading-5 text-[var(--student-v2-text-primary)]">
              Giá trị
              <input
                value={declaredValue}
                onChange={(event) => {
                  setDeclaredValue(event.target.value);
                  setFormError(null);
                }}
                inputMode="decimal"
                placeholder={aggregation?.unit ?? "day"}
                className="mt-1 min-h-11 w-full rounded-[var(--student-v2-radius-control)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--student-v2-focus-ring)]"
                disabled={!canEdit || saving}
              />
            </label>
            <label className="text-[14px] font-medium leading-5 text-[var(--student-v2-text-primary)]">
              Bắt đầu
              <input
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                type="date"
                className="mt-1 min-h-11 w-full rounded-[var(--student-v2-radius-control)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--student-v2-focus-ring)]"
                disabled={!canEdit || saving}
              />
            </label>
            <label className="text-[14px] font-medium leading-5 text-[var(--student-v2-text-primary)]">
              Kết thúc
              <input
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                type="date"
                className="mt-1 min-h-11 w-full rounded-[var(--student-v2-radius-control)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--student-v2-focus-ring)]"
                disabled={!canEdit || saving}
              />
            </label>
          </div>
          {formError ? (
            <p
              id="volunteer-activity-error"
              className="mt-2 text-[13px] leading-[18px] text-[var(--student-v2-critical-text)]"
            >
              {formError}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonV2 type="submit" variant="primary" disabled={!canEdit || saving}>
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Lưu hoạt động
            </ButtonV2>
            <ButtonV2
              type="button"
              variant="tertiary"
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
              disabled={saving}
            >
              Hủy thay đổi
            </ButtonV2>
          </div>
        </form>
      ) : null}

      <VolunteerLedgerV2
        activities={activities}
        canEdit={canEdit}
        onRequirementAction={() => primaryRequirement && onRequirementAction(primaryRequirement)}
      />
    </div>
  );
}

function IntegrationDataSectionV2({
  completion,
  canEdit,
  saving,
  onAddPath,
  onFindOfficialEvent,
  onRequirementAction,
}: {
  completion: CriterionCompletionItem;
  canEdit: boolean;
  saving: boolean;
  onAddPath: (input: {
    requirementKey: string;
    payloadJson: Record<string, unknown>;
  }) => Promise<unknown>;
  onFindOfficialEvent: () => void;
  onRequirementAction: (requirement: RequirementItem) => void;
}) {
  const paths = getPathRequirements(completion, "integration_path");
  const existingPath = paths.find((path) => hasRequirementResponse(path));
  const [selectedPathKey, setSelectedPathKey] = useState(existingPath?.key ?? "");
  const [selectorOpen, setSelectorOpen] = useState(!existingPath);
  const [formOpen, setFormOpen] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const selectedPath = paths.find((path) => path.key === selectedPathKey);
  const fields = selectedPath ? getFormFields(selectedPath) : [];
  const hasUnsavedData = Object.values(formValues).some((value) => value.trim());

  const selectPath = (pathKey: string) => {
    if (hasUnsavedData && !confirmUnsavedPathChange()) return;
    setSelectedPathKey(pathKey);
    setSelectorOpen(false);
    setFormOpen(false);
    setFormValues({});
    setFormError(null);
  };

  const submitPath = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPath) return;
    const payloadJson = Object.fromEntries(
      Object.entries(formValues)
        .map(([key, value]) => [key, normalizeDynamicFieldValue(key, value)] as const)
        .filter(([, value]) => value !== undefined && value !== ""),
    );
    try {
      await onAddPath({ requirementKey: selectedPath.key, payloadJson });
      setFormOpen(false);
      setFormValues({});
      setFormError(null);
      toast.success("Đã lưu hình thức đáp ứng Hội nhập tốt.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể lưu hình thức hội nhập.");
      toast.error(error instanceof Error ? error.message : "Không thể lưu hình thức hội nhập.");
    }
  };

  if (!paths.length) {
    return (
      <InlineStateMessage
        tone="warning"
        title="Chưa có cấu hình hình thức hội nhập"
        description="Backend chưa trả về path cho tiêu chí này. Không mặc định sang ngoại ngữ nếu cấu hình không có."
      />
    );
  }

  return (
    <div className="grid min-w-0 gap-4">
      {selectorOpen || !selectedPath ? (
        <PathSelectionSurfaceV2
          title="Chọn hình thức đáp ứng Hội nhập tốt"
          description="Các lựa chọn được lấy từ cấu hình backend; không mặc định IELTS/TOEIC hay ngoại ngữ."
          paths={paths}
          selectedPathKey={selectedPathKey}
          onSelect={selectPath}
          readonly={!canEdit}
          unknownLabel="Hình thức khác"
        />
      ) : (
        <SelectedPathSummaryV2
          requirement={selectedPath}
          onChangePath={() => {
            if (hasUnsavedData && !confirmUnsavedPathChange()) return;
            setSelectorOpen(true);
          }}
          canChange={canEdit}
          unknownLabel="Hình thức khác"
        />
      )}

      {selectedPath && !selectorOpen ? (
        <section className="min-w-0 rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-5 py-4">
          <SectionHeading
            title={getPathTitle(selectedPath, "Hình thức khác")}
            description={`Nguồn: ${getDisplayRequirementSourceLabel(selectedPath)}`}
            action={
              <div className="flex flex-wrap gap-2">
                {selectedPath.acceptedSources?.includes("official_event") ? (
                  <ButtonV2
                    type="button"
                    variant="secondary"
                    size="compact"
                    onClick={onFindOfficialEvent}
                    disabled={!canEdit}
                  >
                    <Search aria-hidden="true" />
                    Tìm dữ liệu chính thức
                  </ButtonV2>
                ) : null}
                {canEdit ? (
                  <ButtonV2
                    type="button"
                    variant="secondary"
                    size="compact"
                    onClick={() => onRequirementAction(selectedPath)}
                  >
                    <Upload aria-hidden="true" />
                    Tải minh chứng
                  </ButtonV2>
                ) : null}
              </div>
            }
            className="mb-4"
          />

          {formOpen ? (
            <form onSubmit={submitPath} className="grid min-w-0 gap-3">
              {fields.length ? (
                <div className="grid min-w-0 gap-3 md:grid-cols-2">
                  {fields.map((field) => (
                    <DynamicFieldInputV2
                      key={field}
                      field={field}
                      value={formValues[field] ?? ""}
                      disabled={!canEdit || saving}
                      errorId={formError ? "integration-path-error" : undefined}
                      onChange={(value) => {
                        setFormValues((current) => ({ ...current, [field]: value }));
                        setFormError(null);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <InlineStateMessage
                  tone="info"
                  title="Path chưa có biểu mẫu cấu hình"
                  description="Bạn có thể tải minh chứng cho hình thức này; key backend vẫn được giữ nguyên khi gửi."
                />
              )}
              {formError ? (
                <p
                  id="integration-path-error"
                  className="text-[13px] leading-[18px] text-[var(--student-v2-critical-text)]"
                >
                  {formError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <ButtonV2 type="submit" variant="primary" disabled={!canEdit || saving}>
                  {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                  Lưu khai báo
                </ButtonV2>
                <ButtonV2
                  type="button"
                  variant="tertiary"
                  onClick={() => {
                    setFormOpen(false);
                    setFormValues({});
                    setFormError(null);
                  }}
                  disabled={saving}
                >
                  Hủy thay đổi
                </ButtonV2>
              </div>
            </form>
          ) : (
            <ButtonV2
              type="button"
              variant="secondary"
              onClick={() => setFormOpen(true)}
              disabled={!canEdit}
            >
              Khai báo hình thức này
            </ButtonV2>
          )}
        </section>
      ) : null}

      <ExistingPathResponsesV2
        title="Hình thức đã ghi nhận"
        paths={paths}
        unknownLabel="Hình thức khác"
      />
    </div>
  );
}

function AchievementDisclosureV2({
  title,
  group,
  canEdit,
  actionLabel,
  onRequirementAction,
}: {
  title: string;
  group?: RequirementGroup;
  canEdit: boolean;
  actionLabel: string;
  onRequirementAction: (requirement: RequirementItem) => void;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const requirements = group?.requirements ?? [];

  return (
    <details className="min-w-0 rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-5 py-4">
      <summary className="flex min-h-11 cursor-pointer items-center text-[15px] font-semibold leading-[23px] text-[var(--student-v2-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-v2-focus-ring)]">
        {title}
      </summary>
      <div className="mt-1 text-[14px] leading-[22px] text-[var(--student-v2-text-secondary)]">
        {getOptionalAchievementCopy(group)}
      </div>
      {requirements.length ? (
        <div className="mt-3 flex min-w-0 flex-wrap gap-2">
          {requirements.map((requirement) => {
            const selected = selectedKey === requirement.key;
            return (
              <ButtonV2
                key={requirement.key}
                type="button"
                variant={selected ? "secondary" : "tertiary"}
                size="compact"
                onClick={() => {
                  setSelectedKey(requirement.key);
                  onRequirementAction(requirement);
                }}
                disabled={!canEdit}
              >
                {getSafeRequirementLabel(requirement)}
              </ButtonV2>
            );
          })}
        </div>
      ) : null}
      {requirements.length ? (
        <div className="mt-3 text-[13px] leading-[18px] text-[var(--student-v2-text-muted)]">
          {actionLabel}: chọn đúng loại thành tích để mở biểu mẫu phù hợp.
        </div>
      ) : null}
    </details>
  );
}

function LongTextValue({ value }: { value: string }) {
  if (value.length <= 90) return <span>{value}</span>;
  return (
    <details className="min-w-0">
      <summary className="flex min-h-11 cursor-pointer items-center text-[var(--student-v2-institutional-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-v2-focus-ring)]">
        Xem đầy đủ
      </summary>
      <div className="mt-1 text-[13px] leading-[19px] text-[var(--student-v2-text-secondary)]">
        {value}
      </div>
    </details>
  );
}

function PathSelectionSurfaceV2({
  title,
  description,
  paths,
  selectedPathKey,
  readonly,
  unknownLabel,
  onSelect,
}: {
  title: string;
  description: string;
  paths: RequirementItem[];
  selectedPathKey: string;
  readonly: boolean;
  unknownLabel?: string;
  onSelect: (pathKey: string) => void;
}) {
  return (
    <section className="min-w-0 rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-5 py-4">
      <SectionHeading title={title} description={description} className="mb-4" />
      <PathSelectorListV2
        items={paths.map((path) => ({
          id: path.key,
          title: getPathTitle(path, unknownLabel),
          description: getPathDescription(path),
          selected: selectedPathKey === path.key,
          disabled: readonly,
        }))}
        onSelect={onSelect}
      />
    </section>
  );
}

function SelectedPathSummaryV2({
  requirement,
  canChange,
  unknownLabel,
  onChangePath,
}: {
  requirement: RequirementItem;
  canChange: boolean;
  unknownLabel?: string;
  onChangePath: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="text-[13px] font-medium leading-[18px] text-[var(--student-v2-text-muted)]">
          Hình thức đang chọn
        </div>
        <div className="mt-1 text-[16px] font-semibold leading-6 text-[var(--student-v2-text-primary)]">
          {getPathTitle(requirement, unknownLabel)}
        </div>
        <div className="mt-1 text-[14px] leading-[22px] text-[var(--student-v2-text-secondary)]">
          {getDisplayRequirementSourceLabel(requirement)}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <StatusPillV2
          status={mapRequirementStatus(requirement.status)}
          label={getRequirementStatusLabel(requirement.status)}
        />
        {canChange ? (
          <ButtonV2 type="button" variant="tertiary" size="compact" onClick={onChangePath}>
            Đổi hình thức
          </ButtonV2>
        ) : null}
      </div>
    </div>
  );
}

function PathActionAreaV2({
  requirement,
  canEdit,
  onFindOfficialEvent,
  onRequirementAction,
}: {
  requirement: RequirementItem;
  canEdit: boolean;
  onFindOfficialEvent: () => void;
  onRequirementAction: (requirement: RequirementItem) => void;
}) {
  const fields = getFormFields(requirement);
  return (
    <div className="grid min-w-0 gap-3">
      {fields.length ? (
        <div className="flex min-w-0 flex-wrap gap-2">
          {fields.map((field) => (
            <span
              key={field}
              className="rounded-[var(--student-v2-radius-pill)] border border-[var(--student-v2-border-default)] px-3 py-1 text-[13px] leading-[18px] text-[var(--student-v2-text-secondary)]"
            >
              {getRequirementFieldLabel(field)}
            </span>
          ))}
        </div>
      ) : (
        <div className="text-[14px] leading-[22px] text-[var(--student-v2-text-secondary)]">
          Hình thức này dùng minh chứng hoặc dữ liệu chính thức theo cấu hình backend.
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {requirement.acceptedSources?.includes("official_event") ? (
          <ButtonV2
            type="button"
            variant="secondary"
            size="compact"
            onClick={onFindOfficialEvent}
            disabled={!canEdit}
          >
            <Search aria-hidden="true" />
            Tìm dữ liệu chính thức
          </ButtonV2>
        ) : null}
        {canEdit ? (
          <ButtonV2
            type="button"
            variant="secondary"
            size="compact"
            onClick={() => onRequirementAction(requirement)}
          >
            <Upload aria-hidden="true" />
            Tự khai báo và tải minh chứng
          </ButtonV2>
        ) : null}
      </div>
    </div>
  );
}

function ExistingPathResponsesV2({
  title,
  paths,
  unknownLabel,
}: {
  title: string;
  paths: RequirementItem[];
  unknownLabel?: string;
}) {
  const rows = paths.filter(hasRequirementResponse);
  return (
    <section className="min-w-0 rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-5 py-4">
      <SectionHeading title={title} className="mb-3" />
      {rows.length ? (
        <div className="divide-y divide-[var(--student-v2-divider)]">
          {rows.map((path) => (
            <div
              key={path.key}
              className="grid min-w-0 gap-2 py-3 md:grid-cols-[minmax(0,1fr)_160px_auto] md:items-center"
            >
              <div className="min-w-0">
                <div className="text-[15px] font-semibold leading-[23px] text-[var(--student-v2-text-primary)]">
                  {getPathTitle(path, unknownLabel)}
                </div>
                <div className="mt-1 text-[13px] leading-[18px] text-[var(--student-v2-text-secondary)]">
                  {getDisplayRequirementSourceLabel(path)}
                </div>
              </div>
              <div className="text-[13px] leading-[18px] text-[var(--student-v2-text-muted)]">
                {getEvidenceRelationshipCopy(path)}
              </div>
              <StatusPillV2
                status={mapRequirementStatus(path.status)}
                label={getRequirementStatusLabel(path.status)}
              />
            </div>
          ))}
        </div>
      ) : (
        <CompactEmptyStateV2
          title="Chưa có hình thức đã ghi nhận"
          description="Chọn một hình thức phù hợp rồi khai báo hoặc tải minh chứng theo cấu hình hiện tại."
        />
      )}
    </section>
  );
}

function VolunteerSummaryMetricV2({
  label,
  value,
  unit,
  status,
}: {
  label: string;
  value: number;
  unit: string;
  status: StudentApplicationV2ProgressStatus;
}) {
  return (
    <div className="min-w-0 border-l border-[var(--student-v2-divider)] px-4 first:border-l-0 first:pl-0">
      <div className="text-[13px] font-medium leading-[18px] text-[var(--student-v2-text-muted)]">
        {label}
      </div>
      <div className="mt-1 flex min-w-0 items-baseline gap-2">
        <span className="text-[24px] font-semibold leading-8 text-[var(--student-v2-text-primary)]">
          {value}
        </span>
        <span className="text-[14px] leading-5 text-[var(--student-v2-text-secondary)]">
          {unit}
        </span>
      </div>
      <div className="mt-2">
        <StatusPillV2 status={status} label={label} />
      </div>
    </div>
  );
}

function VolunteerLedgerV2({
  activities,
  canEdit,
  onRequirementAction,
}: {
  activities: NonNullable<RequirementItem["aggregation"]>["activities"];
  canEdit: boolean;
  onRequirementAction: () => void;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)]">
      <div className="grid min-h-11 grid-cols-[minmax(180px,1.2fr)_minmax(120px,0.8fr)_minmax(96px,0.55fr)_minmax(120px,0.75fr)_minmax(120px,0.7fr)_96px] items-center gap-3 bg-[var(--student-v2-surface-muted)] px-4 text-[13px] font-medium leading-[18px] text-[var(--student-v2-text-muted)] max-lg:hidden">
        <span>Hoạt động</span>
        <span>Thời gian</span>
        <span>Giá trị</span>
        <span>Nguồn</span>
        <span>Trạng thái</span>
        <span>Hành động</span>
      </div>
      <div className="divide-y divide-[var(--student-v2-divider)]">
        {activities.length ? (
          activities.map((activity) => (
            <VolunteerLedgerRowV2
              key={activity.id}
              activity={activity}
              canEdit={canEdit}
              onRequirementAction={onRequirementAction}
            />
          ))
        ) : (
          <div className="px-4 py-4">
            <CompactEmptyStateV2
              title="Chưa có hoạt động tình nguyện"
              description="Thêm từng hoạt động hoặc tìm trong kho dữ liệu chính thức; không nhập tổng quy đổi thủ công."
            />
          </div>
        )}
      </div>
    </section>
  );
}

function VolunteerLedgerRowV2({
  activity,
  canEdit,
  onRequirementAction,
}: {
  activity: NonNullable<RequirementItem["aggregation"]>["activities"][number];
  canEdit: boolean;
  onRequirementAction: () => void;
}) {
  const status =
    activity.status === "verified"
      ? "complete"
      : activity.status === "rejected"
        ? "supplement"
        : "waiting";
  return (
    <div className="grid min-w-0 gap-2 px-4 py-3 text-[15px] leading-[23px] lg:grid-cols-[minmax(180px,1.2fr)_minmax(120px,0.8fr)_minmax(96px,0.55fr)_minmax(120px,0.75fr)_minmax(120px,0.7fr)_96px] lg:items-center lg:gap-3">
      <div className="min-w-0">
        <div className="font-semibold text-[var(--student-v2-text-primary)]">
          {activity.activityName ?? "Hoạt động tình nguyện"}
        </div>
        {activity.organizer ? (
          <div className="mt-1 text-[13px] leading-[18px] text-[var(--student-v2-text-secondary)]">
            {activity.organizer}
          </div>
        ) : null}
      </div>
      <div className="text-[var(--student-v2-text-secondary)]">
        {[
          formatOptionalStudentDate(activity.startDate),
          formatOptionalStudentDate(activity.endDate),
        ]
          .filter(Boolean)
          .join(" - ") || "Chưa có"}
      </div>
      <div className="font-medium text-[var(--student-v2-text-primary)]">
        {activity.countedValue ?? activity.convertedValue ?? activity.declaredValue ?? 0}{" "}
        {activity.convertedUnit ?? activity.declaredUnit ?? ""}
      </div>
      <div className="text-[var(--student-v2-text-secondary)]">
        {formatActivitySource(activity)}
      </div>
      <StatusPillV2
        status={status}
        label={
          activity.status === "verified"
            ? "Hoàn thành"
            : activity.status === "rejected"
              ? "Cần bổ sung"
              : "Đang chờ"
        }
      />
      <div>
        {canEdit && activity.status !== "verified" ? (
          <ButtonV2 type="button" variant="tertiary" size="compact" onClick={onRequirementAction}>
            Bổ sung
          </ButtonV2>
        ) : null}
      </div>
    </div>
  );
}

function DynamicFieldInputV2({
  field,
  value,
  disabled,
  errorId,
  onChange,
}: {
  field: string;
  value: string;
  disabled: boolean;
  errorId?: string;
  onChange: (value: string) => void;
}) {
  const inputType = dynamicFieldInputType(field);
  return (
    <label className="min-w-0 text-[14px] font-medium leading-5 text-[var(--student-v2-text-primary)]">
      {getRequirementFieldLabel(field)}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={inputType}
        inputMode={inputType === "number" ? "decimal" : undefined}
        aria-describedby={errorId}
        disabled={disabled}
        className="mt-1 min-h-11 w-full min-w-0 rounded-[var(--student-v2-radius-control)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--student-v2-focus-ring)]"
      />
    </label>
  );
}

function EvidenceGallerySection({
  applicationId,
  canEdit,
  evidences,
  isLoading,
  isError,
  onAddEvidence,
  onViewEvidence,
  onDeleteEvidence,
}: {
  applicationId: string;
  canEdit: boolean;
  evidences: EvidenceResponse[];
  isLoading: boolean;
  isError: boolean;
  onAddEvidence: () => void;
  onViewEvidence: (evidence: EvidenceResponse) => void;
  onDeleteEvidence: (evidence: EvidenceResponse) => void;
}) {
  return (
    <section className="min-w-0 rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-5 py-5 sm:px-6">
      <SectionHeading
        title="Minh chứng"
        description={
          evidences.length ? `${evidences.length} minh chứng trong tiêu chí này` : undefined
        }
        action={
          <ButtonV2
            type="button"
            variant="secondary"
            size="compact"
            onClick={onAddEvidence}
            disabled={!canEdit}
          >
            <Plus aria-hidden="true" />
            Thêm
          </ButtonV2>
        }
        className="mb-4"
      />
      {isLoading ? (
        <EvidenceGallery>
          {Array.from({ length: 3 }).map((_, index) => (
            <EvidenceCardV2
              key={index}
              title="Đang tải minh chứng"
              metadata="Hệ thống đang tải dữ liệu"
              status="waiting"
              preview={{ kind: "loading" }}
            />
          ))}
        </EvidenceGallery>
      ) : isError ? (
        <InlineErrorStateV2
          title="Chưa tải được minh chứng"
          description="Vui lòng thử tải lại trang hoặc kiểm tra kết nối."
        />
      ) : evidences.length ? (
        <EvidenceGallery>
          {evidences.map((evidence) => (
            <EvidenceCardV2
              key={evidence.id}
              title={evidence.evidenceName || "Minh chứng chưa đặt tên"}
              metadata={getEvidenceMetadata(evidence, applicationId)}
              context={
                studentCriterionLabel[evidence.criterion] ?? criterionLabels[evidence.criterion]
              }
              processingDetail={getEvidenceProcessingDetail(evidence)}
              status={mapEvidenceToProgressStatus(evidence)}
              preview={getEvidencePreview(evidence)}
              onOpen={() => onViewEvidence(evidence)}
              actionItems={[
                { label: "Xem minh chứng", onSelect: () => onViewEvidence(evidence) },
                ...(canEdit
                  ? [
                      {
                        label: "Xóa minh chứng",
                        onSelect: () => onDeleteEvidence(evidence),
                        destructive: true,
                      },
                    ]
                  : []),
              ]}
            />
          ))}
        </EvidenceGallery>
      ) : (
        <CompactEmptyStateV2
          title="Chưa có minh chứng"
          description="Thêm dữ liệu chính thức hoặc tải minh chứng thủ công cho tiêu chí này."
          action={
            <ButtonV2 type="button" variant="secondary" onClick={onAddEvidence} disabled={!canEdit}>
              <Upload aria-hidden="true" />
              Tải minh chứng
            </ButtonV2>
          }
        />
      )}
    </section>
  );
}

function DynamicFormDisclosure({
  criterion,
  hasDynamicSchema,
  canEdit,
  onAdd,
}: {
  criterion: Criterion;
  hasDynamicSchema: boolean;
  canEdit: boolean;
  onAdd: () => void;
}) {
  return (
    <details className="rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-4 py-3">
      <summary className="flex min-h-11 cursor-pointer items-center text-[15px] font-semibold leading-[23px] text-[var(--student-v2-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-v2-focus-ring)]">
        Biểu mẫu động
      </summary>
      <div className="mt-3 text-[14px] leading-[22px] text-[var(--student-v2-text-secondary)]">
        {hasDynamicSchema
          ? "Tiêu chí này có cấu hình khai báo riêng. Dùng thao tác bên dưới để thêm dữ liệu theo yêu cầu."
          : `Chưa có bảng dữ liệu riêng cho ${criterionLabels[criterion]}. Bạn có thể bổ sung minh chứng thủ công.`}
      </div>
      <ButtonV2
        type="button"
        variant="secondary"
        size="compact"
        className="mt-4"
        onClick={onAdd}
        disabled={!canEdit}
      >
        <Plus aria-hidden="true" />
        Thêm dữ liệu
      </ButtonV2>
    </details>
  );
}

function GuideSheet({
  open,
  onOpenChange,
  criterion,
  completion,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criterion: CoreCriterion;
  completion?: CriterionCompletionItem;
}) {
  const guide = criterionGuide[criterion];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[calc(100vw-24px)] max-w-[420px] overflow-y-auto px-5 py-5 sm:px-6"
      >
        <SheetHeader>
          <SheetTitle>Điều kiện {criterionLabels[criterion]}</SheetTitle>
          <SheetDescription>Tóm tắt yêu cầu đang áp dụng cho tiêu chí này.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-5">
          <section>
            <h3 className="text-[15px] font-semibold leading-[23px] text-[var(--student-v2-text-primary)]">
              Yêu cầu chính
            </h3>
            <ul className="mt-3 space-y-2 text-[14px] leading-[22px] text-[var(--student-v2-text-secondary)]">
              {guide.main.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true">-</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
          {completion?.requirementGroups?.length ? (
            <section>
              <h3 className="text-[15px] font-semibold leading-[23px] text-[var(--student-v2-text-primary)]">
                Nhóm điều kiện
              </h3>
              <div className="mt-3 divide-y divide-[var(--student-v2-divider)] border-y border-[var(--student-v2-divider)]">
                {completion.requirementGroups.map((group) => (
                  <div key={group.key} className="py-3">
                    <div className="text-[14px] font-semibold leading-[22px] text-[var(--student-v2-text-primary)]">
                      {group.title}
                    </div>
                    <div className="mt-1 text-[13px] leading-[18px] text-[var(--student-v2-text-secondary)]">
                      {group.requirements.length} điều kiện
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
        <div className="mt-8 border-t border-[var(--student-v2-divider)] pt-4 text-[13px] leading-[18px] text-[var(--student-v2-text-muted)]">
          Nguồn: {guide.source}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function WorkspaceSkeletonV2() {
  return (
    <div className="mx-auto flex w-full max-w-[1280px] min-w-0 flex-col gap-6">
      <div className="h-24 rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)]" />
      <div className="grid min-w-0 gap-6 lg:grid-cols-[232px_minmax(0,1fr)]">
        <div className="h-[340px] rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)]" />
        <div className="space-y-6">
          <div className="h-36 rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)]" />
          <div className="h-56 rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)]" />
          <div className="h-72 rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)]" />
        </div>
      </div>
    </div>
  );
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
  precheck?: PrecheckResult | null;
  supplementRequest?: SupplementRequest;
}): CriteriaState {
  const base = applyCompletionToCriteriaState(
    getCriteriaUiState(criterion, evidences, precheck, []),
    completion,
  );
  const display = getStudentCriterionDisplayState({
    application,
    completion,
    criterion,
    supplementRequest,
  });
  return {
    ...base,
    progressStatus: mapStudentDisplayStatusToV2ProgressStatus(display),
    displayLabel: display.label,
    displayDescription: display.description || base.description,
  };
}

function buildDefinitionRows({
  requirements,
  metrics,
  selectedMetric,
  metricValue,
  gpaScale,
  canEdit,
  savingMetric,
  onGpaScaleChange,
  onMetricChange,
  onSaveMetric,
  onRequirementAction,
}: {
  requirements: RequirementItem[];
  metrics: ApplicationMetric[];
  selectedMetric?: ReturnType<typeof getPrimaryMetricInput>;
  metricValue: string;
  gpaScale: 4 | 10;
  canEdit: boolean;
  savingMetric: boolean;
  onGpaScaleChange: (value: 4 | 10) => void;
  onMetricChange: (value: string) => void;
  onSaveMetric: () => Promise<boolean>;
  onRequirementAction: (requirement: RequirementItem) => void;
}): DefinitionTableV2Row[] {
  const rows = requirements.slice(0, 8).map((requirement) => ({
    label: getRequirementPresentation(requirement).label,
    value: getRequirementValue(requirement),
    source: formatSourceList(requirement.acceptedSources),
    status: (
      <StatusPillV2
        status={mapRequirementStatus(requirement.status)}
        label={getRequirementStatusLabel(requirement.status)}
      />
    ),
    action: canEdit ? (
      <ButtonV2
        type="button"
        variant="tertiary"
        size="compact"
        onClick={() => onRequirementAction(requirement)}
      >
        Cập nhật
      </ButtonV2>
    ) : null,
  }));

  if (selectedMetric) {
    rows.unshift({
      label: selectedMetric.label,
      value: (
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          {selectedMetric.metricType === "gpa" ? (
            <select
              value={gpaScale}
              onChange={(event) => onGpaScaleChange(Number(event.target.value) === 10 ? 10 : 4)}
              className="min-h-11 rounded-[var(--student-v2-radius-control)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--student-v2-focus-ring)]"
              disabled={!canEdit}
            >
              <option value={4}>Thang 4</option>
              <option value={10}>Thang 10</option>
            </select>
          ) : null}
          <input
            value={metricValue}
            onChange={(event) => onMetricChange(event.target.value)}
            inputMode="decimal"
            placeholder={selectedMetric.placeholder}
            className="min-h-11 min-w-0 rounded-[var(--student-v2-radius-control)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--student-v2-focus-ring)]"
            disabled={!canEdit}
          />
        </div>
      ),
      source: "Sinh viên khai báo",
      status: (
        <StatusPillV2
          status={getMetricValue(metrics, selectedMetric.metricType) ? "waiting" : "not-started"}
          label={
            getMetricValue(metrics, selectedMetric.metricType) ? "Đã có dữ liệu" : "Chưa khai báo"
          }
        />
      ),
      action: (
        <ButtonV2
          type="button"
          variant="secondary"
          size="compact"
          onClick={onSaveMetric}
          disabled={!canEdit || savingMetric}
        >
          {savingMetric ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Lưu
        </ButtonV2>
      ),
    });
  }

  return rows;
}

function getPathRequirements(completion: CriterionCompletionItem, preferredGroupKey: string) {
  const preferredGroup = findRequirementGroup(completion, preferredGroupKey);
  const oneOfGroup = (completion.requirementGroups ?? []).find(
    (group) => group.operator === "one_of" && group.requirements?.length,
  );
  return (preferredGroup ?? oneOfGroup)?.requirements ?? [];
}

function findRequirement(completion: CriterionCompletionItem, requirementKey: string) {
  return (completion.requirementGroups ?? [])
    .flatMap((group) => group.requirements ?? [])
    .find((requirement) => requirement.key === requirementKey);
}

function findRequirementGroup(completion: CriterionCompletionItem, groupKey: string) {
  return (completion.requirementGroups ?? []).find((group) => group.key === groupKey);
}

function getApplicationMetric(metrics: ApplicationMetric[], metricType: MetricType) {
  return metrics.find((metric) => metric.metricType === metricType);
}

function getLatestRequirementResponse(
  requirement?: RequirementItem,
): RequirementResponse | undefined {
  return (requirement?.currentResponses ?? []).find((response) => response.status !== "superseded");
}

function hasRequirementResponse(requirement: RequirementItem) {
  return Boolean(getLatestRequirementResponse(requirement));
}

function getPathTitle(requirement: RequirementItem, unknownLabel = "Hình thức khác") {
  const presentation = getRequirementPresentation(requirement);
  if (presentation.isFallback) return unknownLabel;
  return getSafeRequirementLabel(requirement);
}

function getPathDescription(requirement: RequirementItem) {
  return (
    requirement.description ||
    formatSourceList(requirement.acceptedSources) ||
    "Khai báo hoặc bổ sung minh chứng theo cấu hình hiện tại."
  );
}

function confirmUnsavedPathChange() {
  if (typeof window === "undefined") return true;
  return window.confirm("Bạn có thay đổi chưa lưu. Đổi hình thức sẽ bỏ nội dung đang nhập.");
}

function getRequirementDisplayValue(requirement?: RequirementItem) {
  const response = getLatestRequirementResponse(requirement);
  const payload = toRecord(response?.payloadJson);
  const value = payload?.value ?? payload?.valueNumber ?? payload?.declaredValue;
  if (typeof value === "number" && Number.isFinite(value)) {
    const scale = payload?.scale ?? payload?.rawScale;
    return typeof scale === "number" && Number.isFinite(scale)
      ? `${value}/${scale}`
      : String(value);
  }
  if (typeof value === "string" && value.trim()) return value.trim();
  if (requirement?.key === "no_violation") {
    if (requirement.status === "verified") return "Không vi phạm đã được xác minh";
    if (requirement.status === "rejected") return "Có ghi nhận cần xử lý";
    if (requirement.status === "needs_verification" || requirement.status === "declared") {
      return "Chờ nhà trường xác minh";
    }
  }
  return undefined;
}

function getDisplayRequirementSourceLabel(requirement?: RequirementItem, fallbackValue?: string) {
  const response = getLatestRequirementResponse(requirement);
  if (response) return getResponseSourcePresentation(response);
  if (fallbackValue) return "Sinh viên khai báo";
  if (requirement?.acceptedSources?.length) return formatSourceList(requirement.acceptedSources);
  return "Chưa có";
}

function getEvidenceRelationshipCopy(requirement: RequirementItem) {
  const response = getLatestRequirementResponse(requirement);
  if (!response) return "Chưa liên kết minh chứng";
  if (response.evidenceId) return "Có minh chứng";
  if (response.metricId) return "Có chỉ số";
  return "Đã ghi nhận";
}

function supportsOfficialEventRequirement(requirement?: RequirementItem) {
  return Boolean(requirement?.acceptedSources?.includes("official_event"));
}

function getRequirementPayloadString(requirement: RequirementItem | undefined, field: string) {
  const payload = toRecord(getLatestRequirementResponse(requirement)?.payloadJson);
  const value = payload?.[field];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numericPayloadValue(payloadJson: unknown, field: string) {
  const payload = toRecord(payloadJson);
  const value = payload?.[field];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function noViolationPassiveCopy(requirement?: RequirementItem) {
  if (requirement?.status === "verified") return "Đã được nhà trường xác minh.";
  if (requirement?.status === "rejected") {
    return "Có ghi nhận cần xử lý theo hướng dẫn của cán bộ. Sinh viên bổ sung minh chứng nếu được yêu cầu.";
  }
  return "Chờ nhà trường xác minh tình trạng vi phạm. Sinh viên không tự xác minh mục này.";
}

function academicGpaStatusLabel(requirement?: RequirementItem) {
  if (requirement?.status === "verified") return "Hoàn thành";
  if (requirement?.status === "declared" || requirement?.status === "needs_verification") {
    return "Cần xác minh";
  }
  if (requirement?.status === "rejected") return "Cần bổ sung";
  return "Chưa có dữ liệu";
}

function noFGradeStatusCopy(requirement?: RequirementItem) {
  if (requirement?.status === "verified") return "Không có điểm F đã được xác minh";
  if (requirement?.status === "rejected") return "Có điểm F cần cán bộ xử lý";
  return "Chờ nhà trường xác minh tình trạng điểm F";
}

function academicPeriodLabel(requirement?: RequirementItem) {
  if (requirement?.status === "verified") return "Đúng năm học xét";
  if (requirement?.status === "rejected") return "Không khớp năm học xét";
  return "Chờ xác minh theo năm học xét";
}

function getFormFields(requirement: RequirementItem) {
  const formSchema = toRecord(requirement.formSchema);
  return Array.isArray(formSchema?.fields)
    ? formSchema.fields.filter((item): item is string => typeof item === "string")
    : [];
}

function dynamicFieldInputType(field: string): "text" | "date" | "number" {
  const normalized = field.toLowerCase();
  if (normalized.includes("date")) return "date";
  if (["score", "studyYear", "value", "declaredValue"].includes(field)) return "number";
  return "text";
}

function normalizeDynamicFieldValue(field: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (dynamicFieldInputType(field) === "number") {
    const numberValue = Number(trimmed);
    return Number.isFinite(numberValue) ? numberValue : trimmed;
  }
  return trimmed;
}

function buildPathItems(group: RequirementGroup): PathSelectorListV2Item[] {
  return group.requirements.map((requirement) => ({
    id: requirement.key,
    title: getSafeRequirementLabel(requirement),
    description: requirement.description || formatSourceList(requirement.acceptedSources),
    selected: ["declared", "needs_verification", "verified"].includes(requirement.status),
    disabled: requirement.status === "verified",
  }));
}

function buildAggregationRows(requirements: RequirementItem[]): ActivityLedgerV2Row[] {
  return requirements
    .flatMap((requirement) =>
      (requirement.aggregation?.activities ?? []).map((activity) => ({
        id: activity.id,
        title: activity.activityName || getRequirementPresentation(requirement).label,
        metadata: [
          activity.organizer,
          activity.startDate ? formatStudentDate(activity.startDate) : null,
          activity.countedValue
            ? `${activity.countedValue} ${activity.convertedUnit ?? activity.declaredUnit ?? ""}`
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
        status: (
          <StatusPillV2
            status={activity.status === "verified" ? "complete" : "waiting"}
            label={activity.status === "verified" ? "Đã xác nhận" : "Đang chờ"}
          />
        ),
      })),
    )
    .slice(0, 12);
}

function getRequirementValue(requirement: RequirementItem) {
  const response = requirement.currentResponses?.[0];
  if (!response) return "Chưa có";
  const presentation = getResponseSourcePresentation(response);
  const payload = toRecord(response.payloadJson);
  const declaredValue = payload?.value ?? payload?.valueNumber ?? payload?.declaredValue;
  if (declaredValue !== undefined && declaredValue !== null) return String(declaredValue);
  return presentation || "Đã ghi nhận";
}

function mapRequirementStatus(
  status: RequirementItem["status"],
): StudentApplicationV2ProgressStatus {
  if (status === "verified") return "complete";
  if (status === "declared" || status === "needs_verification") return "waiting";
  if (status === "rejected") return "supplement";
  return "not-started";
}

function getRequirementStatusLabel(status: RequirementItem["status"]) {
  if (status === "verified") return "Hoàn thành";
  if (status === "declared") return "Đã khai báo";
  if (status === "needs_verification") return "Đang chờ";
  if (status === "rejected") return "Cần bổ sung";
  return "Chưa bắt đầu";
}

function getEvidenceMetadata(evidence: EvidenceResponse, applicationId: string) {
  const file = getPrimaryFile(evidence);
  const fileName = getFileName(file);
  const sourceLabel =
    evidence.sourceType === "event_import" ? "Dữ liệu chính thức" : "Minh chứng tải lên";
  return [
    sourceLabel,
    evidence.sourceType !== "event_import" && fileName && fileName !== "Chưa có file"
      ? fileName
      : null,
    applicationId
      ? `Cập nhật ${formatStudentDate(evidence.updatedAt ?? evidence.createdAt)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function getEvidencePreview(evidence: EvidenceResponse) {
  const file = getPrimaryFile(evidence) as {
    mimeType?: string | null;
    fileName?: string | null;
    originalName?: string | null;
  } | null;
  const metadata = getEvidenceMetadataRecord(evidence);
  return {
    mimeType: file?.mimeType,
    fileName: file?.originalName ?? file?.fileName,
    evidenceName: evidence.evidenceName,
    evidenceType:
      getStringRecordValue(metadata, "evidenceType") ?? getStringRecordValue(metadata, "type"),
    requirementKey:
      getStringRecordValue(metadata, "requirementKey") ??
      getStringRecordValue(metadata, "requirement_key"),
    criterion: evidence.criterion,
    sourceType: evidence.sourceType,
    isOfficialData: evidence.sourceType === "event_import",
    isFailed: evidence.indexingStatus === "failed",
    officialData:
      evidence.sourceType === "event_import"
        ? {
            sourceLabel: "Dữ liệu chính thức",
            eventTitle:
              getStringRecordValue(metadata, "eventTitle") ??
              getStringRecordValue(metadata, "eventName") ??
              evidence.evidenceName,
            recordedValue:
              getStringRecordValue(metadata, "recordedValue") ??
              getStringRecordValue(metadata, "convertedValue") ??
              getStringRecordValue(metadata, "value"),
          }
        : undefined,
    alt: evidence.evidenceName,
  };
}

function getEvidenceProcessingDetail(evidence: EvidenceResponse) {
  if (
    ["ocr_processing", "processing", "extracting", "checking_registry"].includes(
      evidence.indexingStatus,
    )
  ) {
    return "Hệ thống đang đọc minh chứng";
  }
  if (evidence.indexingStatus === "failed") return "Không đọc được minh chứng";
  return undefined;
}

function getEvidenceMetadataRecord(evidence: EvidenceResponse): Record<string, unknown> | null {
  const value = evidence.metadata ?? evidence.metadataJson ?? evidence.readableSummary;
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function getStringRecordValue(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function mapEvidenceToProgressStatus(
  evidence: EvidenceResponse,
): StudentApplicationV2ProgressStatus {
  if (evidence.status === "accepted" || evidence.indexingStatus === "indexed") return "complete";
  if (
    ["needs_supplement", "rejected"].includes(evidence.status) ||
    evidence.indexingStatus === "failed"
  ) {
    return "supplement";
  }
  if (evidence.status === "draft" && evidence.indexingStatus === "not_started")
    return "not-started";
  return "waiting";
}

function mapSupplementRequests(tasks: ApplicationReviewTaskSummary[]): SupplementRequest[] {
  return tasks
    .filter((task) => task.supplementRequestJson)
    .map((task) => ({
      id: task.id,
      criterion: task.criterion,
      reason:
        task.supplementRequestJson?.reason ||
        task.officerNote ||
        task.decisionReason ||
        "Cán bộ yêu cầu bổ sung thông tin cho tiêu chí này.",
      deadline: task.supplementRequestJson?.deadline ?? task.dueDate ?? null,
      requestedFields: task.supplementRequestJson?.requestedFields ?? [],
    }));
}

function supportsOfficialEventImport(completion?: CriterionCompletionItem) {
  if (!completion) return false;
  return (completion.requirementGroups ?? []).some((group) =>
    (group.requirements ?? []).some((requirement) =>
      requirement.acceptedSources?.includes("official_event"),
    ),
  );
}

function normalizeCriteriaCompletionItems(value: unknown): CriterionCompletionItem[] {
  const data = unwrapApiData(value) as
    CriteriaCompletionResponse | CriterionCompletionItem[] | null;
  if (Array.isArray(data)) return data;
  return data?.items ?? [];
}

function normalizeEvidences(value: unknown): EvidenceResponse[] {
  if (Array.isArray(value)) return value as EvidenceResponse[];
  const data = unwrapApiData(value);
  if (Array.isArray(data)) return data as EvidenceResponse[];
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.evidences)) return record.evidences as EvidenceResponse[];
    if (Array.isArray(record.items)) return record.items as EvidenceResponse[];
    if (Array.isArray(record.data)) return record.data as EvidenceResponse[];
  }
  return [];
}

function unwrapApiData<T>(payload: T | { data?: T | null } | null | undefined): T | null {
  if (!payload) return null;
  if (typeof payload === "object" && "data" in payload) {
    return (payload as { data?: T | null }).data ?? null;
  }
  return payload as T;
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
    const serverItem = merged.get(item.id);
    merged.set(item.id, serverItem ? { ...item, ...serverItem } : item);
  });
  return Array.from(merged.values());
}

function normalizeOptimisticEvidence(
  evidence: EvidenceResponse,
  applicationId: string,
): EvidenceResponse {
  return {
    ...evidence,
    applicationId: evidence.applicationId ?? applicationId,
  };
}

function upsertEvidence(list: EvidenceResponse[], evidence: EvidenceResponse) {
  const next = new Map(list.map((item) => [item.id, item]));
  next.set(evidence.id, { ...next.get(evidence.id), ...evidence });
  return Array.from(next.values());
}

function countEvidencesByCriterion(evidences: EvidenceResponse[]) {
  return evidences.reduce<Partial<Record<Criterion, number>>>((acc, evidence) => {
    acc[evidence.criterion] = (acc[evidence.criterion] ?? 0) + 1;
    return acc;
  }, {});
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

function getEvidenceConfirmRequestFromLocation(): { evidenceId: string } | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const evidenceId = params.get("evidenceId");
  if (!evidenceId || params.get("mode") !== "confirm") return null;
  return { evidenceId };
}

function clearEvidenceConfirmRequestFromLocation() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("evidenceId");
  url.searchParams.delete("mode");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function getDefaultEvidenceName(criterion: Criterion) {
  return `Minh chứng ${criterionLabels[criterion]}`;
}

function getMetricValue(metrics: ApplicationMetric[], metricType?: MetricType) {
  if (!metricType) return "";
  const metric = metrics.find((item) => item.metricType === metricType);
  if (!metric) return "";
  return String(metric.value ?? "");
}

function formatOptionalStudentDate(value?: string | null) {
  return value ? formatStudentDate(value) : "";
}

function formatActivitySource(
  activity: NonNullable<RequirementItem["aggregation"]>["activities"][number],
) {
  if (activity.sourceType === "official_event" || activity.eventId) return "Sự kiện chính thức";
  if (activity.sourceType === "manual_evidence" || activity.evidenceId) return "Minh chứng tải lên";
  if (activity.sourceType === "manual_metric") return "Sinh viên khai báo";
  if (activity.evidenceId) return "Minh chứng tải lên";
  return "Sinh viên khai báo";
}

function validateMetricValue(
  metricType: MetricType,
  value: number,
  scale?: number | string | null,
) {
  const numericScale = typeof scale === "number" ? scale : undefined;
  if (!Number.isFinite(value)) return "Vui lòng nhập giá trị hợp lệ.";
  if (metricType === "conduct_score") return validateConductScoreValue(String(value));
  if (metricType === "gpa")
    return validateAcademicGpaValue(String(value), numericScale === 10 ? 10 : 4);
  if (numericScale && (value < 0 || value > numericScale)) {
    return `Giá trị phải nằm trong khoảng 0-${numericScale}.`;
  }
  return null;
}

function getBottomActionTitle(actions: Array<{ title: string }>) {
  return actions[0]?.title ?? "Tiếp tục hoàn thiện hồ sơ";
}

function getBottomActionDescription(actions: Array<{ description: string }>) {
  return actions[0]?.description ?? "Chọn tiêu chí cần bổ sung hoặc kiểm tra lại hồ sơ.";
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}
