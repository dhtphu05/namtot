import { Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  FileText,
  Loader2,
  Plus,
  Send,
  Target,
  Upload,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { CriterionIcon } from "@/components/AppIcon";
import { Button, Card, Chip, Progress } from "@/components/ui-kit";
import { authApi } from "@/features/auth/api/auth";
import { useAuth } from "@/features/auth/store/auth-store";
import {
  useCurrentApplication,
  useLatestPrecheck,
  usePrecheck,
  useStartApplication,
  useSubmitApplication,
  useUpdateTargetLevel,
  useUpsertMetric,
} from "@/features/application/hooks/useApplication";
import { StudentFlowStepper } from "@/features/application/components/StudentFlowStepper";
import { SubmitConfirmationModal } from "@/features/application/components/SubmitConfirmationModal";
import { EvidenceDetailModal } from "@/features/evidence/components/EvidenceDetailModal";
import { evidenceApi } from "@/features/evidence/api/evidence";
import { StudentEvidenceCard } from "@/features/evidence/components/StudentEvidenceCard";
import { AddEvidenceDrawer } from "@/features/evidence/components/AddEvidenceDrawer";
import { useCreateEvidence, useDeleteEvidence, useEvidences, useUploadAndIndex } from "@/features/evidence/hooks/useEvidence";
import { getPrecheckMissingMessage, getUserFacingText } from "@/lib/user-facing-messages";
import { finalStatusTone, getFinalStatusLabel, getStudentApplicationStatusLabel } from "@/lib/status-labels";
import {
  coreCriteria,
  criteriaLevelSummaries,
  criterionInputFields,
  evaluateLevelAgainstMatrix,
  getCriterionMatrixItem,
  getLevelCriteria,
  getPrimaryMetricInput,
  priorityAchievementGroup,
  type CoreCriterion,
} from "@/lib/criteria-matrix";
import type {
  ApplicationMetric,
  ApplicationState,
  ApplicationStatus,
  Criterion,
  EvidenceResponse,
  Level,
  MetricType,
  PrecheckCriterionResult,
  PrecheckResult,
} from "@/lib/api/types";

type WorkspaceTab = "info" | "criteria" | "precheck" | "tracking";

type ApplicationWithDetails = ApplicationState & {
  updatedAt?: string;
  finalStatus?: string | null;
  finalLevel?: Level | null;
  finalNote?: string | null;
  finalizedAt?: string | null;
  finalizedBy?: {
    id: string;
    fullName: string;
  } | null;
  metrics?: ApplicationMetric[];
  summary?: {
    totalEvidences?: number;
    evidenceByCriterion?: Partial<Record<Criterion, number>>;
    metricsCompletion?: { completed?: number; required?: number };
  };
};

type EvidenceUploadForm = {
  criterion: Criterion;
  evidenceName: string;
};

type EvidenceSort = "newest" | "oldest" | "name" | "criterion" | "status" | "review";

const SCHOOL_YEAR = "2025-2026";

const tabLabels: Record<WorkspaceTab, string> = {
  info: "Thông tin & cấp xét",
  criteria: "5 tiêu chí",
  precheck: "Kiểm tra hồ sơ",
  tracking: "Theo dõi sau khi nộp",
};

const levelLabel: Record<Level, string> = {
  school: "Cấp Trường",
  university: "Cấp Đại học Đà Nẵng",
  city: "Cấp Thành phố",
  central: "Cấp Trung ương",
};

const levels = Object.values(criteriaLevelSummaries).map((level) => ({
  ...level,
  key: level.level,
  desc: level.description,
}));
const criteria = coreCriteria;
export function StudentApplicationWorkspace({ initialTab = "info" }: { initialTab?: WorkspaceTab }) {
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const criterionRefs = useRef<Partial<Record<Criterion, HTMLElement | null>>>({});
  const actionSectionRef = useRef<HTMLDivElement | null>(null);
  const trackingSectionRef = useRef<HTMLDivElement | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>(initialTab);
  const [metricValues, setMetricValues] = useState<Record<MetricType, string>>({
    gpa: "",
    conduct_score: "",
    physical_score: "",
    volunteer_days: "",
    foreign_language_score: "",
  });
  const [metricErrors, setMetricErrors] = useState<Partial<Record<MetricType, string>>>({});
  const [savingMetrics, setSavingMetrics] = useState<Partial<Record<MetricType, boolean>>>({});
  const [evidenceForm, setEvidenceForm] = useState<EvidenceUploadForm | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceResponse | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [highlightedCriterion, setHighlightedCriterion] = useState<Criterion | null>(null);
  const [activeCriterion, setActiveCriterion] = useState<Criterion>("ethics");
  const [nextActionsOpen, setNextActionsOpen] = useState(false);
  const [optimisticEvidences, setOptimisticEvidences] = useState<EvidenceResponse[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<Level>("school");
  const [evidenceSort, setEvidenceSort] = useState<EvidenceSort>("newest");
  const [criterionDrafts, setCriterionDrafts] = useState<Record<Criterion, Record<string, string>>>({
    ethics: {},
    academic: {},
    physical: {},
    volunteer: {},
    integration: {},
    priority: {},
    collective: {},
  });
  const lastAutoCheckKeyRef = useRef<string>("");

  const current = useCurrentApplication(SCHOOL_YEAR);
  const startApplication = useStartApplication();
  const updateTargetLevel = useUpdateTargetLevel();
  const upsertMetric = useUpsertMetric();
  const createEvidence = useCreateEvidence();
  const uploadAndIndex = useUploadAndIndex();
  const deleteEvidence = useDeleteEvidence();
  const runPrecheck = usePrecheck();
  const submitApplication = useSubmitApplication();

  const rawApplication = current.data?.application as ApplicationWithDetails | null | undefined;
  const application = rawApplication ? normalizeApplicationLevels(rawApplication) : rawApplication;
  const appId = application?.id;
  const evidencesQuery = useEvidences(appId, { limit: 100 });
  const latestPrecheck = useLatestPrecheck(appId);

  const serverEvidences = useMemo(() => normalizeEvidences(evidencesQuery.data), [evidencesQuery.data]);
  const evidences = useMemo(
    () => mergeOptimisticEvidences(serverEvidences, optimisticEvidences, appId),
    [appId, optimisticEvidences, serverEvidences],
  );
  const precheck = (latestPrecheck.data ?? null) as PrecheckResult | null;
  const metrics = useMemo(() => application?.metrics ?? [], [application?.metrics]);
  const isReadOnlyMode = Boolean(
    application && ["submitted", "under_review", "resolution_needed", "completed", "rejected"].includes(application.status),
  );
  const canEditApplication = application
    ? !isReadOnlyMode && ["draft", "prechecked", "ready_to_submit", "supplement_required", "draft_supplement"].includes(application.status)
    : false;
  const canSubmitApplication = application
    ? !["submitted", "under_review", "completed", "rejected", "resolution_needed"].includes(application.status)
    : false;
  const isSupplementMode = application?.status === "supplement_required" || String(application?.status) === "draft_supplement";
  const hasSubmittedApplication = Boolean(
    application &&
      (application.submittedAt ||
        isSupplementMode ||
        ["submitted", "under_review", "resolution_needed", "completed", "rejected"].includes(application.status)),
  );
  const avatarSrc = useResolvedAvatarUrl(user?.avatarUrl);
  const nextBestAction = getUserFacingText(
    precheck?.nextBestAction,
    "Bạn có thể kiểm tra lại hồ sơ sau khi cập nhật thông tin hoặc thêm minh chứng.",
  );
  const firstName = user?.fullName?.trim().split(/\s+/).slice(-1)[0] ?? "bạn";

  useEffect(() => {
    if (application?.targetLevel) setSelectedLevel(application.targetLevel);
  }, [application?.targetLevel]);

  useEffect(() => {
    setOptimisticEvidences([]);
  }, [appId]);

  useEffect(() => {
    if (!application?.id) return;
    const timer = window.setTimeout(() => {
      if (initialTab === "precheck") {
        actionSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (initialTab === "tracking") {
        trackingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [application?.id, initialTab]);

  useEffect(() => {
    if (!application?.id || !canEditApplication || runPrecheck.isPending) return;
    const key = [
      application.id,
      application.targetLevel,
      metrics.map((item) => `${item.metricType}:${item.value}`).sort().join("|"),
      evidences.map((item) => `${item.id}:${item.updatedAt ?? item.createdAt}`).sort().join("|"),
    ].join("::");
    if (lastAutoCheckKeyRef.current === key) return;

    const timer = window.setTimeout(() => {
      lastAutoCheckKeyRef.current = key;
      runPrecheck.mutate({ id: application.id, level: application.targetLevel });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [application?.id, application?.targetLevel, canEditApplication, evidences, metrics, runPrecheck]);

  const supplementRequests = useMemo(
    () =>
      (application?.reviewTasks ?? [])
        .filter((task) => task.status === "supplement_required")
        .map((task) => {
          const criterionMeta = criteria.find((entry) => entry.key === task.criterion);
          return {
            id: task.id,
            criterion: task.criterion,
            label: criterionMeta?.label ?? task.criterion,
            reason:
              task.supplementRequestJson?.reason ??
              task.decisionReason ??
              task.officerNote ??
              "Cán bộ yêu cầu bổ sung giấy xác nhận cho tiêu chí này.",
            deadline: task.supplementRequestJson?.deadline ?? task.dueDate ?? null,
            requestedFields: task.supplementRequestJson?.requestedFields ?? [],
          };
        }),
    [application?.reviewTasks],
  );

  const evidenceByCriterion = useMemo(() => {
    return criteria.reduce<Record<Criterion, EvidenceResponse[]>>(
      (acc, criterion) => {
        acc[criterion.key] = evidences.filter((item) => item.criterion === criterion.key);
        return acc;
      },
      {
        ethics: [],
        academic: [],
        physical: [],
        volunteer: [],
        integration: [],
        priority: [],
        collective: [],
      },
    );
  }, [evidences]);

  const selectedLevelSuitability = useMemo(
    () => evaluateLevelAgainstMatrix(selectedLevel, { metrics, evidences }),
    [selectedLevel, metrics, evidences],
  );

  const targetLevelSuitability = useMemo(
    () => evaluateLevelAgainstMatrix(application?.targetLevel ?? "school", { metrics, evidences }),
    [application?.targetLevel, metrics, evidences],
  );

  if (current.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0057C2]" />
      </div>
    );
  }

  if (current.isError) {
    return (
      <>
        <TopBar
          title={`Hồ sơ của ${firstName}`}
          subtitle="Hiện chưa thể tải dữ liệu hồ sơ của bạn."
        />
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-1 h-6 w-6 shrink-0 text-amber-700" />
              <div>
                <h2 className="text-xl font-bold text-amber-950">Không thể tải hồ sơ</h2>
                <p className="mt-2 text-sm text-amber-900">
                  {current.error instanceof Error
                    ? current.error.message
                    : "Vui lòng đăng nhập lại hoặc thử tải lại dữ liệu."}
                </p>
              </div>
            </div>
            <Button variant="secondary" onClick={() => current.refetch()}>
              Tải lại
            </Button>
          </div>
        </Card>
      </>
    );
  }

  if (!application) {
    return (
      <>
        <TopBar
          title={`Hồ sơ của ${firstName}`}
          subtitle="Tài khoản này chưa có hồ sơ trong năm học hiện tại."
        />
        <Card className="text-center">
          <FileText className="mx-auto h-12 w-12 text-[#0057C2]" />
          <h2 className="mt-4 text-2xl font-bold text-brand-deep">
            Chưa có hồ sơ Sinh viên 5 tốt năm học {SCHOOL_YEAR}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Đây là trạng thái đúng cho sinh viên mới. Bấm tạo hồ sơ để bắt đầu nhập dữ liệu thật.
          </p>
          <Button
            className="mt-6"
            disabled={startApplication.isPending}
            onClick={() => startApplication.mutate({ schoolYear: SCHOOL_YEAR, targetLevel: "school" })}
          >
            {startApplication.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Bắt đầu tạo hồ sơ
          </Button>
        </Card>
      </>
    );
  }

  const readinessScore = precheck?.readinessScore ?? application.readinessScore ?? 0;
  const supplementCriteria = new Set(supplementRequests.map((item) => item.criterion));
  const criteriaWithEvidence = criteria.filter((criterion) => (evidenceByCriterion[criterion.key]?.length ?? 0) > 0).length;
  const missingCriteriaCount = Math.max(0, 5 - criteriaWithEvidence);
  const metricsRequired = application.summary?.metricsCompletion?.required ?? 5;
  const metricsCompleted = application.summary?.metricsCompletion?.completed ?? metrics.length;
  const missingWorkCount = getWorkspaceMissingWorkCount({
    missingCriteriaCount,
    missingItemsCount: precheck?.missingItems?.length ?? 0,
    metricsCompleted,
    metricsRequired,
  });
  const primaryAction = getPrimaryWorkspaceAction({
    status: application.status,
    criteriaWithEvidence,
    hasPrecheck: Boolean(precheck),
    isSupplementMode,
    readinessScore,
  });
  const workspaceHeadline = getWorkspaceHeadline(application.status, missingCriteriaCount, missingWorkCount, Boolean(precheck));
  const canShowSubmitCta = primaryAction.action === "submit" || isSupplementMode;

  const isCriterionLockedForSupplement = (criterion: Criterion) =>
    isSupplementMode && supplementCriteria.size > 0 && !supplementCriteria.has(criterion);

  const scrollToCriterion = (criterion: Criterion, focusAddEvidence = false) => {
    setActiveCriterion(criterion);
    criterionRefs.current[criterion]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlightedCriterion(criterion);
    window.setTimeout(() => {
      if (focusAddEvidence) {
        document.querySelector<HTMLButtonElement>(`[data-add-evidence="${criterion}"]`)?.focus();
      } else {
        criterionRefs.current[criterion]?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
          "input:not([type='hidden']), select, textarea",
        )?.focus();
      }
    }, 120);
    window.setTimeout(() => setHighlightedCriterion((current) => (current === criterion ? null : current)), 2800);
  };

  const openEvidenceForm = (criterion: Criterion, evidenceName: string) => {
    if (!canEditApplication) {
      toast.error("Hồ sơ đã nộp hoặc đang được xét duyệt, nên chưa thể thêm minh chứng mới.");
      return;
    }
    if (isCriterionLockedForSupplement(criterion)) {
      toast.error("Tiêu chí này không được mở bổ sung trong đợt này.");
      return;
    }
    setEvidenceForm({ criterion, evidenceName });
  };

  const goToSupplementCriterion = () => {
    const target =
      supplementRequests[0]?.criterion ??
      criteria.find((criterion) => !isCriterionLockedForSupplement(criterion.key))?.key ??
      criteria[0].key;

    scrollToCriterion(target, true);
  };

  const checklistItems = buildGuidedChecklist({
    criteria,
    evidenceByCriterion,
    metrics,
    precheck,
    supplementRequests,
  });

  const runChecklistAction = (item: GuidedChecklistItem) => {
    if (item.action === "add_evidence") {
      openEvidenceForm(item.criterion, getDefaultEvidenceName(item.criterion));
      window.setTimeout(() => scrollToCriterion(item.criterion, true), 60);
      return;
    }

    scrollToCriterion(item.criterion, false);
  };

  const handleFirstMissingAction = () => {
    const firstItem = checklistItems[0];
    if (firstItem) {
      runChecklistAction(firstItem);
      return;
    }
    const firstMissingCriterion = criteria.find((criterion) => (evidenceByCriterion[criterion.key]?.length ?? 0) === 0);
    if (firstMissingCriterion) {
      scrollToCriterion(firstMissingCriterion.key, true);
      return;
    }
    actionSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const saveMetric = async (metricType: MetricType, scale?: number) => {
    if (!canEditApplication) {
      toast.error("Hồ sơ đã khóa, không thể sửa chỉ số.");
      return;
    }

    const value = Number(metricValues[metricType]);
    if (!Number.isFinite(value)) {
      const message = "Vui lòng nhập giá trị hợp lệ.";
      setMetricErrors((current) => ({ ...current, [metricType]: message }));
      toast.error(message);
      return;
    }

    const validationError = validateMetricValue(metricType, value, scale);
    if (validationError) {
      setMetricErrors((current) => ({ ...current, [metricType]: validationError }));
      toast.error(validationError);
      return;
    }

    setMetricErrors((current) => ({ ...current, [metricType]: undefined }));
    setSavingMetrics((current) => ({ ...current, [metricType]: true }));
    try {
      await upsertMetric.mutateAsync({ id: application.id, metricType, value, scale });
      toast.success("Đã lưu chỉ số.");
      setMetricValues((current) => ({ ...current, [metricType]: "" }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu chỉ số.");
    } finally {
      setSavingMetrics((current) => ({ ...current, [metricType]: false }));
    }
  };
  const precheckNow = () => {
    runPrecheck.mutate({ id: application.id, level: application.targetLevel });
    actionSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submitNow = () => {
    if (!isSupplementMode && checklistItems.length > 0) {
      toast.error("Bạn cần hoàn thiện phần còn thiếu trước khi nộp hồ sơ.");
      handleFirstMissingAction();
      return;
    }
    setConfirmSubmitOpen(true);
  };

  const confirmSubmit = () => {
    if (!isSupplementMode && checklistItems.length > 0) {
      setConfirmSubmitOpen(false);
      toast.error("Bạn cần hoàn thiện phần còn thiếu trước khi nộp hồ sơ.");
      handleFirstMissingAction();
      return;
    }
    const status = String(application.status);
    const isSupplement = status === "supplement_required" || status === "draft_supplement";
    submitApplication.mutate(
      {
        id: application.id,
        allowSubmitWithWarnings: true,
        studentNote: nextBestAction,
        successMessage: isSupplement
          ? "Đã gửi lại hồ sơ bổ sung. Cán bộ sẽ tiếp tục xét duyệt."
          : "Đã nộp hồ sơ thành công. Hồ sơ đang chờ cán bộ xét duyệt.",
      },
      {
        onSuccess: () => {
          setConfirmSubmitOpen(false);
          trackingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        },
      },
    );
  };

  const handleAvatarSelected = async (file?: File | null) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Ảnh hồ sơ chỉ hỗ trợ JPG, PNG hoặc WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh hồ sơ tối đa 5MB.");
      return;
    }

    try {
      setAvatarUploading(true);
      const response = await authApi.uploadAvatar(file);
      if (response.data) {
        setUser(response.data);
      }
      toast.success("Đã cập nhật ảnh hồ sơ.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật ảnh hồ sơ.");
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handlePrimaryWorkspaceAction = () => {
    if (primaryAction.action === "supplement") {
      goToSupplementCriterion();
      return;
    }
    if (primaryAction.action === "criteria") {
      handleFirstMissingAction();
      return;
    }
    if (primaryAction.action === "precheck") {
      precheckNow();
      return;
    }
    if (primaryAction.action === "submit") {
      submitNow();
      return;
    }
    trackingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <TopBar
        title="Hồ sơ của tôi"
        subtitle="Hoàn thiện 5 tiêu chí, kiểm tra hồ sơ, nộp hồ sơ và theo dõi kết quả."
      />

      <div className="pb-24">
        <Card className="mb-4 border-[#D8E4F2] bg-white shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
            <div className="flex min-w-0 gap-4">
              <div className="h-16 w-16 flex-none overflow-hidden rounded-xl border border-[#DDE8F5] bg-[#EAF3FF]">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={user?.fullName ?? "Ảnh hồ sơ"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-bold text-[#0057C2]">
                    {getInitials(user?.fullName)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[#EEF6FF] px-2 py-1 text-[11px] font-bold text-[#0057C2]">
                    Hồ sơ {application.schoolYear}
                  </span>
                  <Chip tone={application.status === "completed" ? "success" : "warning"}>
                    {getStudentApplicationStatusLabel(application.status)}
                  </Chip>
                </div>
                <h2 className="mt-2 break-words text-xl font-bold text-brand-deep">
                  {workspaceHeadline}
                </h2>
                <div className="mt-3 grid gap-x-6 gap-y-1.5 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <span className="block text-xs text-slate-500">Sinh viên</span>
                    <b className="text-brand-deep">{user?.fullName ?? "Sinh viên"}</b>
                    <span className="ml-1">{user?.studentCode ?? "chưa có MSSV"}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500">Lớp/Khoa</span>
                    {user?.className ?? "Chưa có lớp"} · {user?.faculty ?? "Chưa có khoa"}
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500">Năm học</span>
                    {application.schoolYear}
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500">Cấp đăng ký</span>
                    <b className="text-[#0057C2]">{levelLabel[application.targetLevel]}</b>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Cập nhật: {formatDate(application.lastUpdatedAt ?? application.updatedAt)}
                  </span>
                  {canEditApplication ? (
                  <>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => void handleAvatarSelected(event.target.files?.[0])}
                  />
                  <Button size="sm" variant="outline" disabled={avatarUploading} onClick={() => avatarInputRef.current?.click()}>
                    {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Cập nhật ảnh
                  </Button>
                  <span className="text-xs text-muted-foreground">JPG, PNG, WEBP tối đa 5MB.</span>
                  </>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-[#F8FBFE] p-3">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-brand-deep">Tiêu chí có minh chứng</span>
                <b className="text-brand-deep">{criteriaWithEvidence}/5</b>
              </div>
              <Progress value={(criteriaWithEvidence / 5) * 100} />
              <div className="mt-2 text-xs text-muted-foreground">
                Thanh tiến độ chỉ dùng để tham khảo sau khi hệ thống kiểm tra hồ sơ.
              </div>
            </div>
          </div>
        </Card>

        <div className="hidden">
        <Card className="mb-4 bg-[#F8FBFE]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Bước tiếp theo
              </div>
              <h3 className="mt-1 text-xl font-bold text-brand-deep">{primaryAction.label}</h3>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{primaryAction.description}</p>
              <div className="mt-3 max-w-md">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{criteriaWithEvidence}/5 tiêu chí có minh chứng</span>
                  <b className="text-brand-deep">
                    {missingWorkCount > 0 ? `Còn ${missingWorkCount} việc` : "Đủ dữ liệu để nộp"}
                  </b>
                </div>
                <Progress value={(criteriaWithEvidence / 5) * 100} />
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
              <Button onClick={handlePrimaryWorkspaceAction} disabled={runPrecheck.isPending || submitApplication.isPending}>
                {runPrecheck.isPending || submitApplication.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : primaryAction.icon}
                {primaryAction.cta}
              </Button>
              <Button variant="secondary" onClick={() => setTab("criteria")}>
                Xem điều kiện 5 tiêu chí
              </Button>
            </div>
          </div>
        </Card>

        {isSupplementMode && (
          <Card className="mb-4 border-amber-200 bg-amber-50">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Chip tone="warning">
                  <CircleAlert className="h-3 w-3" /> Cần bổ sung
                </Chip>
                <h3 className="mt-3 text-lg font-bold text-amber-950">
                  Cán bộ đã gửi yêu cầu bổ sung, vui lòng bổ sung rồi gửi lại hồ sơ.
                </h3>
                <p className="mt-1 text-sm text-amber-900">
                  Sau khi gửi lại, cán bộ sẽ tiếp tục kiểm tra các tiêu chí được yêu cầu bổ sung.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                <Button variant="secondary" onClick={goToSupplementCriterion}>
                  <Upload className="h-4 w-4" /> Đi tới tiêu chí cần bổ sung
                </Button>
                <Button disabled={!canSubmitApplication || submitApplication.isPending} onClick={submitNow}>
                  {submitApplication.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Gửi lại hồ sơ
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {supplementRequests.length ? (
                supplementRequests.map((item) => (
                  <div key={item.id} className="rounded-lg border border-amber-200 bg-white px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-brand-deep">{item.label}</div>
                      {item.deadline ? (
                        <Chip tone="warning">Hạn: {formatDate(item.deadline)}</Chip>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{item.reason}</p>
                    {item.requestedFields.length ? (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Mục cần bổ sung: {item.requestedFields.join(", ")}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-amber-200 bg-white px-4 py-3 text-sm text-amber-900">
                  Bạn có thể bổ sung minh chứng liên quan rồi gửi lại hồ sơ.
                </div>
              )}
            </div>
          </Card>
        )}

        <div className="mb-4">
          <StudentFlowStepper
            state={{
              applicationExists: true,
              applicationStatus: application.status,
              evidenceCount: evidences.length,
              criteriaTouched: metrics.length > 0,
              latestPrecheck: precheck,
              missingWorkCount: checklistItems.length,
            }}
            busy={startApplication.isPending || runPrecheck.isPending || submitApplication.isPending}
            onUpload={() => setTab("criteria")}
            onPrecheck={precheckNow}
            onSubmit={submitNow}
            onTrack={() => setTab("tracking")}
          />
        </div>

        {isReadOnlyMode && (
          <Card className="mb-4 border-[#DCE7F2] bg-[#F8FBFE]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <Chip tone={application.status === "completed" ? "success" : "brand"}>
                  {getStudentApplicationStatusLabel(application.status)}
                </Chip>
                <h3 className="mt-3 text-lg font-bold text-brand-deep">Hồ sơ đã được gửi, bạn đang ở chế độ chỉ xem.</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bạn có thể theo dõi quá trình xét duyệt, xem lại hồ sơ đã nộp hoặc kiểm tra thông báo mới.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setTab("tracking")}>Theo dõi xét duyệt</Button>
                <Button variant="secondary" onClick={() => setTab("criteria")}>Xem hồ sơ đã nộp</Button>
                <Link to="/app/notifications">
                  <Button variant="outline">Xem thông báo</Button>
                </Link>
              </div>
            </div>
          </Card>
        )}

        <div className="mb-5 flex min-w-0 flex-wrap gap-2 rounded-lg border border-[#E3ECF6] bg-white p-1">
          {(Object.keys(tabLabels) as WorkspaceTab[]).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`min-w-[min(100%,7rem)] rounded-md px-3 py-2 text-[13px] font-semibold transition-colors ${
                tab === key ? "bg-[#0057C2] text-white" : "text-slate-600 hover:bg-[#F1F7FD] hover:text-brand-deep"
              }`}
            >
              {tabLabels[key]}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <Card className="bg-white/90">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 font-bold text-brand-deep">
                    <Target className="h-4 w-4" /> Hoàn thiện 5 tiêu chí
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Đang xem điều kiện {levelLabel[selectedLevel]}. Chọn từng tiêu chí để nhập dữ liệu và tải minh chứng.
                  </p>
                </div>
                <Chip tone={selectedLevelSuitability.status === "met" ? "success" : selectedLevelSuitability.status === "not_suitable" ? "error" : "warning"}>
                  {selectedLevelSuitability.statusLabel}
                </Chip>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {criteriaLevelSummaries[selectedLevel].overallRequirements.map((item) => (
                  <span key={item} className="rounded-full bg-[#F1F7FD] px-3 py-1 text-xs font-semibold text-brand-deep">
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                {getLevelCriteria(selectedLevel).map((item, index) => {
                  const criterion = criteria.find((entry) => entry.key === item.criterion);
                  const assessment = selectedLevelSuitability.criteria.find((entry) => entry.criterion === item.criterion);
                  const evidenceCount = evidenceByCriterion[item.criterion]?.length ?? 0;
                  return (
                    <button
                      key={item.criterion}
                      className="group w-full rounded-xl border border-[#E3ECF6] bg-[#F8FBFE] px-4 py-3 text-left transition-colors hover:border-[#B8CEE8] hover:bg-white"
                      onClick={() => {
                        setActiveCriterion(item.criterion);
                        setTab("criteria");
                      }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-[#0057C2]">
                              {index + 1}
                            </span>
                            <div className="font-bold text-brand-deep">{criterion?.label}</div>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{criterion?.description}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {item.hardRequirements.slice(0, 3).map((requirement) => (
                              <span key={requirement} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                                {requirement}
                              </span>
                            ))}
                          </div>
                          {item.suggestedEvidenceTypes.length ? (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Minh chứng nên có: {item.suggestedEvidenceTypes.slice(0, 3).join(", ")}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          {assessment ? (
                            <Chip tone={assessment.status === "met" ? "success" : assessment.status === "not_suitable" ? "error" : "warning"}>
                              {assessment.statusLabel}
                            </Chip>
                          ) : null}
                          <span className="text-xs font-semibold text-muted-foreground">{evidenceCount} minh chứng</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            <aside className="space-y-3 xl:sticky xl:top-24 xl:self-start">
              <Card className="bg-white/90">
                <h3 className="flex items-center gap-2 font-bold text-brand-deep">
                  <Target className="h-4 w-4" /> Khả năng đạt cấp xét
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Xem hồ sơ hiện tại đang phù hợp với cấp nào, sau đó xác nhận nếu muốn đổi cấp đăng ký.
                </p>
                <div className="mt-3 space-y-2">
                  {levels.map((level) => {
                    const active = level.key === application.targetLevel;
                    const selected = level.key === selectedLevel;
                    const assessment = evaluateLevelAgainstMatrix(level.key, { metrics, evidences });
                    return (
                      <button
                        key={level.key}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                          selected ? "border-[#0057C2] bg-[#F1F7FD]" : "border-[#E3ECF6] bg-white hover:bg-[#F6F9FC]"
                        }`}
                        onClick={() => setSelectedLevel(level.key)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-brand-deep">{level.label}</div>
                          <Chip tone={assessment.status === "met" ? "success" : assessment.status === "not_suitable" ? "error" : "warning"}>
                            {assessment.statusLabel}
                          </Chip>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{level.desc}</div>
                        {active ? <div className="mt-1 text-xs font-bold text-[#0057C2]">Đang chọn trong hồ sơ</div> : null}
                      </button>
                    );
                  })}
                </div>
                {canEditApplication ? (
                  <Button
                    className="mt-3 w-full"
                    disabled={selectedLevel === application.targetLevel || updateTargetLevel.isPending}
                    onClick={() => updateTargetLevel.mutate({ id: application.id, targetLevel: selectedLevel })}
                  >
                    {updateTargetLevel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                    Chọn cấp này
                  </Button>
                ) : null}
              </Card>

              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
                <div className="font-semibold">So với hồ sơ hiện tại</div>
                <div className="mt-1">{getMissingSummaryForLevel(selectedLevel, selectedLevelSuitability)}</div>
              </div>

              <div className="rounded-xl border border-[#E3ECF6] bg-white/80 px-4 py-3 text-sm">
                <div className="font-semibold text-brand-deep">{priorityAchievementGroup.label}</div>
                <div className="mt-1 text-muted-foreground">
                  Ghi nhận thêm nếu có: {priorityAchievementGroup.examples.join(", ")}.
                </div>
              </div>
            </aside>
          </div>
        )}

        {tab === "criteria" && (
          <div className="space-y-3">
            <div className="flex min-w-0 flex-wrap gap-2 rounded-xl border border-[#E3ECF6] bg-white p-1">
              {criteria.map((criterion) => (
                <button
                  key={criterion.key}
                  onClick={() => setActiveCriterion(criterion.key)}
                  className={`min-w-[min(100%,7rem)] rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                    activeCriterion === criterion.key ? "bg-[#0057C2] text-white" : "text-slate-600 hover:bg-[#F1F7FD]"
                  }`}
                >
                  {criterion.label}
                </button>
              ))}
            </div>

            {(() => {
              const criterion = criteria.find((item) => item.key === activeCriterion) ?? criteria[0];
              const items = evidenceByCriterion[criterion.key] ?? [];
              const sortedItems = sortEvidences(items, evidenceSort);
              const result = precheck?.criteriaResults?.find((item) => item.criterion === criterion.key);
              const score = typeof result?.score === "number" ? result.score : 0;
              const supplementRequest = supplementRequests.find((item) => item.criterion === criterion.key);
              const isLockedForSupplement = isCriterionLockedForSupplement(criterion.key);
              const activeIndex = criteria.findIndex((item) => item.key === criterion.key);
              const isLastCriterion = activeIndex >= criteria.length - 1;
              const nextCriterion = criteria[Math.min(activeIndex + 1, criteria.length - 1)];
              const matrixItem = getCriterionMatrixItem(application.targetLevel, criterion.key);
              const criterionAssessment = targetLevelSuitability.criteria.find((item) => item.criterion === criterion.key);

              return (
                <div
                  ref={(node) => {
                    criterionRefs.current[criterion.key] = node;
                  }}
                  className="scroll-mt-24"
                >
                  <Card
                    className={`transition-colors ${
                      highlightedCriterion === criterion.key
                        ? "border-amber-300 bg-amber-50/70 ring-2 ring-amber-200"
                        : isLockedForSupplement
                          ? "bg-slate-50 opacity-75"
                          : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="h-8 w-8 rounded-lg" style={{ background: criterion.color }} />
                          <h3 className="text-xl font-bold text-brand-deep">{criterion.label}</h3>
                          {supplementRequest ? <Chip tone="warning">Cần bổ sung</Chip> : null}
                          <Chip tone={items.length > 0 ? "success" : "warning"}>
                            {items.length > 0 ? `${items.length} minh chứng` : "Chưa có minh chứng cho tiêu chí này"}
                          </Chip>
                        </div>
                        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{criterion.description}</p>
                      </div>
                      {canEditApplication && !isLockedForSupplement ? (
                        <Button
                          data-add-evidence={criterion.key}
                          variant="secondary"
                          disabled={createEvidence.isPending || uploadAndIndex.isPending}
                          onClick={() => openEvidenceForm(criterion.key, getDefaultEvidenceName(criterion.key))}
                        >
                          <Upload className="h-4 w-4" /> Thêm minh chứng
                        </Button>
                      ) : null}
                    </div>

                    <div className="mt-5 space-y-4">
                      <div className="rounded-xl border border-[#E3ECF6] bg-[#F8FBFE] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                              Điều kiện của {levelLabel[application.targetLevel]}
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {matrixItem?.sourceLabel}
                            </div>
                          </div>
                          {criterionAssessment ? (
                            <Chip tone={criterionAssessment.status === "met" ? "success" : criterionAssessment.status === "not_suitable" ? "error" : "warning"}>
                              {criterionAssessment.statusLabel}
                            </Chip>
                          ) : null}
                        </div>
                        <ul className="mt-3 space-y-2 text-sm font-semibold text-brand-deep">
                          {(matrixItem?.hardRequirements ?? []).map((requirement) => (
                            <li key={requirement}>{requirement}</li>
                          ))}
                        </ul>
                        {matrixItem?.additionalRequirements.length ? (
                          <div className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
                            {matrixItem.additionalRequirements.join(" ")}
                          </div>
                        ) : null}
                        {matrixItem?.suggestedEvidenceTypes.length ? (
                          <div className="mt-3 text-xs text-muted-foreground">
                            Minh chứng nên có: {matrixItem.suggestedEvidenceTypes.join(", ")}
                          </div>
                        ) : null}
                      </div>

                      {canEditApplication && !isLockedForSupplement ? (
                        <StructuredCriterionInputs
                          criterion={criterion.key}
                          metrics={metrics}
                          metricValues={metricValues}
                          metricErrors={metricErrors}
                          savingMetrics={savingMetrics}
                          canEdit={canEditApplication && !isLockedForSupplement}
                          drafts={criterionDrafts[criterion.key] ?? {}}
                          onDraftChange={(field, value) =>
                            setCriterionDrafts((current) => ({
                              ...current,
                              [criterion.key]: { ...(current[criterion.key] ?? {}), [field]: value },
                            }))
                          }
                          onMetricChange={(metric, value) => {
                            setMetricValues((prev) => ({ ...prev, [metric.key]: value }));
                            const numericValue = Number(value);
                            setMetricErrors((prev) => ({
                              ...prev,
                              [metric.key]:
                                value && Number.isFinite(numericValue)
                                  ? validateMetricValue(metric.key, numericValue, metric.scale) ?? undefined
                                  : undefined,
                            }));
                          }}
                          onSaveMetric={saveMetric}
                        />
                      ) : (
                        <ReadOnlyCriterionData criterion={criterion.key} metrics={metrics} drafts={criterionDrafts[criterion.key] ?? {}} />
                      )}
                    </div>

                    <div className="mt-5 rounded-xl border border-[#E3ECF6] bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-brand-deep">Minh chứng liên quan</h4>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Tài liệu được xem ngay trong card, không cần mở chi tiết để kiểm tra nhanh.
                          </p>
                        </div>
                        <select
                          value={evidenceSort}
                          onChange={(event) => setEvidenceSort(event.target.value as EvidenceSort)}
                          className="rounded-lg border border-[#DCE7F2] bg-white px-3 py-2 text-sm font-semibold text-brand-deep outline-none"
                        >
                          <option value="newest">M:i nhất</option>
                          <option value="oldest">Cũ nhất</option>
                          <option value="name">Theo tên A-Z</option>
                          <option value="criterion">Theo tiêu chí</option>
                          <option value="status">Theo trạng thái</option>
                          <option value="review">Theo mức cần kiểm tra</option>
                        </select>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {sortedItems.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-[#B8CEE8] bg-[#F6F9FC] px-3 py-3 text-sm text-muted-foreground">
                            Bạn chưa có minh chứng cho tiêu chí này.
                            {canEditApplication && !isLockedForSupplement ? (
                            <div className="mt-2">
                              <Button
                                data-add-evidence={criterion.key}
                                size="sm"
                                variant="secondary"
                                disabled={!canEditApplication || isLockedForSupplement || createEvidence.isPending || uploadAndIndex.isPending}
                                onClick={() => openEvidenceForm(criterion.key, getDefaultEvidenceName(criterion.key))}
                              >
                                <Upload className="h-4 w-4" /> Thêm minh chứng
                              </Button>
                            </div>
                            ) : null}
                          </div>
                        ) : (
                          sortedItems.map((item) => (
                            <StudentEvidenceCard
                              key={item.id}
                              evidence={item}
                              applicationId={application.id}
                              canEdit={canEditApplication && !isLockedForSupplement}
                              profile={{ fullName: user?.fullName, studentCode: user?.studentCode }}
                              onViewDetails={setSelectedEvidence}
                              onDelete={(target) => {
                                if (isLockedForSupplement) {
                                  toast.error("Tiêu chí này không được mở bổ sung trong đợt này.");
                                  return;
                                }
                                setOptimisticEvidences((current) => current.filter((item) => item.id !== target.id));
                                deleteEvidence.mutate({ id: target.id, applicationId: application.id });
                              }}
                            />
                          ))
                        )}
                      </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-[#E3ECF6] bg-[#F8FBFE] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                            Kết quả kiểm tra hồ sơ
                          </div>
                          <div className="mt-1 text-lg font-bold text-brand-deep">
                            {getCriterionCheckSummary(items.length, result)}
                          </div>
                        </div>
                        <Chip tone={runPrecheck.isPending ? "brand" : result?.warnings?.length ? "warning" : "success"}>
                          {runPrecheck.isPending ? "Đang kiểm tra" : result?.warnings?.length ? "Cần kiểm tra thêm" : "Đã kiểm tra"}
                        </Chip>
                      </div>
                      <Progress value={score || readinessScore} tint={criterion.color} />
                      <div className="mt-2 text-xs text-muted-foreground">
                        {runPrecheck.isPending ? "Đang cập nhật sau thay đổi mới nhất" : "Vừa kiểm tra " + formatRelativeCheckTime(precheck?.createdAt) + " trước"}
                      </div>
                      {supplementRequest ? (
                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                          <div className="font-semibold">Cần bổ sung</div>
                          <div className="mt-1">{supplementRequest.reason}</div>
                          {supplementRequest.deadline ? (
                            <div className="mt-1 text-xs">Hạn bổ sung: {formatDate(supplementRequest.deadline)}</div>
                          ) : null}
                        </div>
                      ) : null}
                      <CriterionChecklist
                        criterion={criterion.key}
                        evidenceCount={items.length}
                        result={result}
                      />
                    </div>

                    {canEditApplication && !isLockedForSupplement ? (
                    <div className="mt-5 flex flex-wrap justify-end gap-2">
                      <Button variant="secondary" onClick={() => savePrimaryMetricForCriterion(criterion.key, saveMetric)}>
                        Lưu
                      </Button>
                      <Button
                        variant="outline"
                        disabled={runPrecheck.isPending}
                        onClick={precheckNow}
                      >
                        {runPrecheck.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                        Kiểm tra lại
                      </Button>
                      <Button onClick={() => {
                        if (isLastCriterion) {
                          precheckNow();
                        } else {
                          setActiveCriterion(nextCriterion.key);
                        }
                      }}>
                        {isLastCriterion ? "Tiếp tục đến bước kiểm tra" : "Sang tiêu chí tiếp theo"}
                      </Button>
                    </div>
                    ) : null}
                  </Card>
                </div>
              );
            })()}
          </div>
        )}

        {tab === "precheck" && (
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Chip tone="brand">
                    <ClipboardCheck className="h-3 w-3" /> Kiểm tra hồ sơ tự động
                  </Chip>
                  <h3 className="mt-3 text-2xl font-bold text-brand-deep">
                    {getPrecheckHeadline(precheck, missingCriteriaCount, missingWorkCount)}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {nextBestAction}
                  </p>
                </div>
                {canEditApplication ? (
                <Button onClick={precheckNow} disabled={runPrecheck.isPending}>
                  {runPrecheck.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                  Kiểm tra lại
                </Button>
                ) : null}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {criteria.map((criterion) => {
                  const result = precheck?.criteriaResults?.find((item) => item.criterion === criterion.key);
                  const evidenceCount = evidenceByCriterion[criterion.key]?.length ?? 0;
                  const summary = getCriterionCheckSummary(evidenceCount, result);
                  return (
                    <div key={criterion.key} className="rounded-lg border border-[#E3ECF6] p-3">
                      <div className="text-sm font-bold text-brand-deep">{criterion.label}</div>
                      <div className="mt-2 text-base font-bold text-brand-deep">
                        {summary}
                      </div>
                      <div className="mt-2">
                        <Progress value={typeof result?.score === "number" ? result.score : 0} tint={criterion.color} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {!precheck && (
                <div className="mt-5 rounded-lg border border-dashed border-[#B8CEE8] bg-[#F6F9FC] p-4 text-sm text-muted-foreground">
                  Hệ thống sẽ tự cập nhật sau khi bạn nhập dữ liệu hoặc thêm minh chứng. Bạn cũng có thể bấm Kiểm tra lại.
                </div>
              )}
              {precheck?.missingItems?.length ? (
                <div className="mt-5">
                  <h4 className="font-bold text-brand-deep">Những điểm còn thiếu</h4>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {precheck.missingItems.map((item, index) => {
                      const criterion = item.criterion && criteria.some((entry) => entry.key === item.criterion)
                        ? item.criterion
                        : "academic";
                      const criterionLabel = criteria.find((entry) => entry.key === criterion)?.label ?? "Hồ sơ";
                      const message = getPrecheckMissingMessage(item);
                      return (
                        <div key={String(item.code ?? index)} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-bold text-amber-950">{message.description}</div>
                            <Chip tone={item.severity === "error" ? "warning" : "muted"}>
                              {item.severity === "error" ? "Bắt buộc" : item.severity === "warning" ? "Nên bổ sung" : "Chờ cán bộ kiểm tra sau khi nộp"}
                            </Chip>
                          </div>
                          <div className="mt-1 text-xs text-amber-800">{criterionLabel}</div>
                          {canEditApplication ? (
                          <Button
                            className="mt-3"
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              openEvidenceForm(
                                criterion,
                                `${criterionLabel} - minh chứng bổ sung`,
                              )
                            }
                          >
                            <Upload className="h-4 w-4" /> Thêm minh chứng
                          </Button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </Card>

            <Card>
              <h3 className="font-bold text-brand-deep">
                {canShowSubmitCta ? (isSupplementMode ? "Gửi lại hồ sơ bổ sung" : "Nộp hồ sơ") : "Chưa nên nộp hồ sơ"}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {!canShowSubmitCta
                  ? "Hãy hoàn thiện các tiêu chí còn thiếu và kiểm tra hồ sơ trước khi nộp."
                  : isSupplementMode
                  ? "Hồ sơ sẽ được gửi lại để cán bộ tiếp tục kiểm tra."
                  : "Hồ sơ sẽ được gửi để cán bộ xét duyệt theo từng tiêu chí."}
              </p>
              {canEditApplication && canShowSubmitCta ? (
              <Button className="mt-5 w-full" disabled={!canSubmitApplication || submitApplication.isPending} onClick={submitNow}>
                {submitApplication.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isSupplementMode ? "Gửi lại hồ sơ bổ sung" : "Nộp hồ sơ"}
              </Button>
              ) : canEditApplication ? (
                <Button className="mt-5 w-full" variant="secondary" onClick={() => setTab("criteria")}>
                  Tiếp tục hoàn thiện
                </Button>
              ) : null}
            </Card>
          </div>
        )}

        {tab === "tracking" && (
          <Card>
            <div className="flex items-start gap-3">
              {application.status === "completed" ? (
                <CheckCircle2 className="mt-1 h-6 w-6 text-emerald-600" />
              ) : (
                <CircleAlert className="mt-1 h-6 w-6 text-[#0057C2]" />
              )}
              <div>
                <h3 className="text-xl font-bold text-brand-deep">{getStudentApplicationStatusLabel(application.status)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Bạn có thể theo dõi trạng thái hồ sơ và phản hồi yêu cầu bổ sung nếu có.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Chip tone={getFinalTone(application.finalStatus)}>
                    {getFinalStatusLabel(application.finalStatus ?? "pending")}
                  </Chip>
                  {application.finalLevel ? (
                    <Chip tone="brand">{levelLabel[application.finalLevel]}</Chip>
                  ) : null}
                </div>
                {application.finalNote ? (
                  <p className="mt-4 max-w-2xl rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    {application.finalNote}
                  </p>
                ) : null}
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <InfoBlock label="Thời điểm nộp" value={formatDate(application.submittedAt)} />
                  <InfoBlock label="Thời điểm chốt" value={formatFinalDate(application.finalizedAt)} />
                  <InfoBlock label="Người chốt" value={application.finalizedBy?.fullName ?? "--"} />
                </div>
                <Link to="/app" className="mt-5 inline-block">
                  <Button variant="secondary">Quay lại tổng quan</Button>
                </Link>
              </div>
            </div>
          </Card>
        )}
      </div>

      {canEditApplication ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E3ECF6] bg-white/95 px-4 py-3 shadow-[0_-12px_36px_-28px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              Hồ sơ đã lưu trong hệ thống. Còn {Math.max(0, 5 - criteriaWithEvidence)} tiêu chí chưa có minh chứng.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" disabled={runPrecheck.isPending} onClick={precheckNow}>
                {runPrecheck.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                Kiểm tra hồ sơ
              </Button>
              {canShowSubmitCta ? (
                <Button disabled={!canSubmitApplication || submitApplication.isPending} onClick={submitNow}>
                  {submitApplication.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isSupplementMode ? "Gửi lại hồ sơ" : "Nộp hồ sơ"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
        </div>

        <section className="mb-5" aria-labelledby="criteria-title">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                5 tiêu chí cần hoàn thiện
              </div>
              <h3 id="criteria-title" className="mt-1 text-xl font-bold text-brand-deep">
                Hoàn thiện từng tiêu chí
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground">
                {checklistItems.length > 0 ? `Còn ${checklistItems.length} việc cần làm` : "Đã đủ dữ liệu cơ bản"}
              </span>
              {checklistItems.length > 0 ? (
                <Button size="sm" variant="outline" onClick={() => setNextActionsOpen((current) => !current)}>
                  {nextActionsOpen ? "Ẩn việc cần làm" : "Xem việc cần làm"}
                </Button>
              ) : null}
            </div>
          </div>

          {nextActionsOpen && checklistItems.length > 0 ? (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <div className="grid gap-2 md:grid-cols-2">
                {checklistItems.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-2 rounded-lg bg-white px-3 py-2 text-sm sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-amber-950">{item.title}</div>
                      <div className="mt-0.5 text-xs text-amber-900">
                        {item.criterionLabel} · {item.reason}
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => runChecklistAction(item)}>
                      Làm ngay
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="-mx-1 overflow-x-auto pb-1">
            <div className="flex min-w-max gap-2 px-1 lg:min-w-0">
              {criteria.map((criterion) => {
                const items = evidenceByCriterion[criterion.key] ?? [];
                const result = precheck?.criteriaResults?.find((item) => item.criterion === criterion.key);
                const assessment = targetLevelSuitability.criteria.find((item) => item.criterion === criterion.key);
                const supplementRequest = supplementRequests.find((item) => item.criterion === criterion.key);
                const status = getGuidedCriterionStatus(items.length, result, assessment, Boolean(supplementRequest));
                const selected = activeCriterion === criterion.key;

                return (
                  <button
                    key={criterion.key}
                    type="button"
                    onClick={() => {
                      setActiveCriterion(criterion.key);
                      window.setTimeout(() => criterionRefs.current[criterion.key]?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);
                    }}
                    className={`flex h-14 min-w-[158px] shrink-0 items-center gap-2 rounded-full border px-3 text-left shadow-sm transition-colors lg:min-w-0 lg:flex-1 ${
                      selected
                        ? "border-[#0057C2] bg-[#0057C2] text-white"
                        : "border-[#E3ECF6] bg-white text-brand-deep hover:border-[#B8CEE8] hover:bg-[#F8FBFE]"
                    }`}
                    aria-pressed={selected}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        selected ? "bg-white/15" : "bg-[#F1F7FD]"
                      }`}
                    >
                        <CriterionIcon criterion={criterion.key} size={16} color={selected ? "#fff" : criterion.color} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{criterion.label}</span>
                      <span className={`mt-0.5 block truncate text-[11px] font-semibold ${selected ? "text-white/80" : "text-slate-500"}`}>
                        {items.length > 0 ? "Đã có" : status.label}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            {([criteria.find((item) => item.key === activeCriterion) ?? criteria[0]]).map((criterion) => {
              const items = evidenceByCriterion[criterion.key] ?? [];
              const sortedItems = sortEvidences(items, evidenceSort);
              const result = precheck?.criteriaResults?.find((item) => item.criterion === criterion.key);
              const matrixItem = getCriterionMatrixItem(application.targetLevel, criterion.key);
              const assessment = targetLevelSuitability.criteria.find((item) => item.criterion === criterion.key);
              const supplementRequest = supplementRequests.find((item) => item.criterion === criterion.key);
              const isLockedForSupplement = isCriterionLockedForSupplement(criterion.key);
              const status = getGuidedCriterionStatus(items.length, result, assessment, Boolean(supplementRequest));
              const needsAttention = status.tone !== "success";

              return (
                <div
                  key={criterion.key}
                  className={`scroll-mt-24 overflow-hidden rounded-xl border bg-white shadow-sm transition-colors ${
                    highlightedCriterion === criterion.key
                      ? "border-[#0057C2] ring-2 ring-[#0057C2]/15"
                      : needsAttention
                        ? "border-amber-200"
                        : "border-[#E3ECF6]"
                  }`}
                  ref={(node) => {
                    criterionRefs.current[criterion.key] = node;
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: criterion.color }}>
                        <CriterionIcon criterion={criterion.key} size={17} color="#fff" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-lg font-bold text-brand-deep">{criterion.label}</div>
                        <div className="mt-0.5 text-sm text-muted-foreground">
                          Hoàn thiện minh chứng và dữ liệu cho tiêu chí này.
                        </div>
                      </div>
                    </div>
                    <Chip tone={status.tone}>{status.label}</Chip>
                  </div>

                  <div className="border-t border-[#E3ECF6] px-5 pb-5 pt-4">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.95fr)]">
                      <div className="min-w-0 space-y-4 xl:order-2">
                        <div className="rounded-xl border border-[#E3ECF6] bg-white px-4 py-4">
                          <div className="space-y-4">
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                              Điều kiện chính
                            </div>
                            <ul className="mt-2 space-y-1 text-sm font-semibold text-brand-deep">
                              {(matrixItem?.hardRequirements ?? []).slice(0, 3).map((requirement) => (
                                <li key={requirement}>{requirement}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                              Minh chứng nên có
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {((matrixItem?.suggestedEvidenceTypes ?? []).slice(0, 3).length
                                ? (matrixItem?.suggestedEvidenceTypes ?? []).slice(0, 3)
                                : ["Giấy xác nhận phù hợp với tiêu chí."]).map((item) => (
                                <span key={item} className="rounded-full bg-[#EEF6FF] px-2.5 py-1 text-xs font-semibold text-[#0057C2]">
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                          </div>
                        </div>

                        {canEditApplication && !isLockedForSupplement ? (
                          <StructuredCriterionInputs
                            criterion={criterion.key}
                            metrics={metrics}
                            metricValues={metricValues}
                            metricErrors={metricErrors}
                            savingMetrics={savingMetrics}
                            canEdit={canEditApplication && !isLockedForSupplement}
                            drafts={criterionDrafts[criterion.key] ?? {}}
                            onDraftChange={(field, value) =>
                              setCriterionDrafts((current) => ({
                                ...current,
                                [criterion.key]: { ...(current[criterion.key] ?? {}), [field]: value },
                              }))
                            }
                            onMetricChange={(metric, value) => {
                              setMetricValues((prev) => ({ ...prev, [metric.key]: value }));
                              const numericValue = Number(value);
                              setMetricErrors((prev) => ({
                                ...prev,
                                [metric.key]:
                                  value && Number.isFinite(numericValue)
                                    ? validateMetricValue(metric.key, numericValue, metric.scale) ?? undefined
                                    : undefined,
                              }));
                            }}
                            onSaveMetric={saveMetric}
                          />
                        ) : (
                          <ReadOnlyCriterionData criterion={criterion.key} metrics={metrics} drafts={criterionDrafts[criterion.key] ?? {}} />
                        )}

                        <CriterionChecklist criterion={criterion.key} evidenceCount={items.length} result={result} />
                      </div>

                      <aside className="space-y-3 xl:order-1">
                        {sortedItems.length > 0 ? (
                          <>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="text-sm font-bold text-brand-deep">Minh chứng đã thêm</div>
                                <div className="mt-0.5 text-xs text-muted-foreground">{items.length} minh chứng</div>
                              </div>
                              <select
                                value={evidenceSort}
                                onChange={(event) => setEvidenceSort(event.target.value as EvidenceSort)}
                                className="rounded-lg border border-[#DCE7F2] bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-deep outline-none"
                              >
                                <option value="newest">Mới nhất</option>
                                <option value="oldest">Cũ nhất</option>
                                <option value="name">Theo tên A-Z</option>
                                <option value="status">Theo trạng thái</option>
                              </select>
                            </div>
                            <div className="space-y-3">
                              {sortedItems.map((item) => (
                                <StudentEvidenceCard
                                  key={item.id}
                                  evidence={item}
                                  applicationId={application.id}
                                  canEdit={canEditApplication && !isLockedForSupplement}
                                  profile={{ fullName: user?.fullName, studentCode: user?.studentCode }}
                                  onViewDetails={setSelectedEvidence}
                                  onDelete={(target) => {
                                    if (isLockedForSupplement) {
                                      toast.error("Tiêu chí này không được mở bổ sung trong đợt này.");
                                      return;
                                    }
                                    setOptimisticEvidences((current) => current.filter((item) => item.id !== target.id));
                                    deleteEvidence.mutate({ id: target.id, applicationId: application.id });
                                  }}
                                />
                              ))}
                            </div>
                            {canEditApplication && !isLockedForSupplement ? (
                              <button
                                type="button"
                                data-add-evidence={criterion.key}
                                disabled={createEvidence.isPending || uploadAndIndex.isPending}
                                onClick={() => openEvidenceForm(criterion.key, getDefaultEvidenceName(criterion.key))}
                                className="flex min-h-28 w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#B8CEE8] bg-white px-4 py-4 text-center text-sm text-brand-deep transition-colors hover:border-[#0057C2] hover:bg-[#F8FBFE] disabled:opacity-60"
                              >
                                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#B8CEE8] text-[#0057C2]">
                                  <Plus className="h-5 w-5" />
                                </span>
                                <span className="mt-2 font-bold">Thêm minh chứng khác cho tiêu chí này</span>
                                <span className="mt-1 text-xs text-muted-foreground">Bạn có thể bổ sung thêm nếu cần thiết.</span>
                              </button>
                            ) : null}
                          </>
                        ) : (
                          <div className="rounded-xl border border-dashed border-[#B8CEE8] bg-white px-5 py-8 text-center text-sm text-muted-foreground">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF6FF] text-[#0057C2]">
                              <Plus className="h-6 w-6" />
                            </div>
                            <div className="font-semibold text-brand-deep">Bạn chưa có minh chứng cho tiêu chí này.</div>
                            <div className="mx-auto mt-1 max-w-md">
                              Bạn có thể tìm trong sự kiện đã xác nhận hoặc tự tải giấy chứng nhận lên.
                            </div>
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                              {canEditApplication && !isLockedForSupplement ? (
                                <Button
                                  data-add-evidence={criterion.key}
                                  size="sm"
                                  variant="secondary"
                                  disabled={createEvidence.isPending || uploadAndIndex.isPending}
                                  onClick={() => openEvidenceForm(criterion.key, getDefaultEvidenceName(criterion.key))}
                                >
                                  <Upload className="h-4 w-4" /> Thêm minh chứng
                                </Button>
                              ) : null}
                              <Link to="/app/event-library">
                                <Button size="sm" variant="outline">
                                  Tìm trong sự kiện đã xác nhận
                                </Button>
                              </Link>
                            </div>
                          </div>
                        )}
                      </aside>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section ref={actionSectionRef} className="mb-5 scroll-mt-24" aria-labelledby="submit-title">
          <Card className={checklistItems.length > 0 ? "border-amber-200 bg-amber-50/60" : "border-emerald-200 bg-emerald-50/60"}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Kiểm tra và nộp
                </div>
                <h3 id="submit-title" className="mt-1 text-xl font-bold text-brand-deep">
                  {getSubmitSectionTitle(application.status, checklistItems.length, Boolean(precheck), canShowSubmitCta)}
                </h3>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Hệ thống kiểm tra dữ liệu đã nhập và các minh chứng đã tải lên. Kết quả này giúp bạn rà soát trước khi nộp;
                  cán bộ vẫn là người xác nhận cuối cùng.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 lg:shrink-0">
                {isReadOnlyMode ? (
                  <Button onClick={() => trackingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                    Theo dõi hồ sơ
                  </Button>
                ) : checklistItems.length > 0 || isSupplementMode ? (
                  <>
                    <Button onClick={isSupplementMode ? goToSupplementCriterion : handleFirstMissingAction}>
                      {isSupplementMode ? "Bổ sung theo yêu cầu" : "Hoàn thiện phần còn thiếu"}
                    </Button>
                    <Button variant="secondary" disabled={runPrecheck.isPending} onClick={precheckNow}>
                      {runPrecheck.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                      Kiểm tra hồ sơ
                    </Button>
                    <Button variant="outline" disabled title="Bạn cần hoàn thiện phần còn thiếu trước khi nộp hồ sơ.">
                      Nộp hồ sơ
                    </Button>
                  </>
                ) : canShowSubmitCta ? (
                  <>
                    <Button variant="secondary" disabled={runPrecheck.isPending} onClick={precheckNow}>
                      {runPrecheck.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                      Kiểm tra hồ sơ
                    </Button>
                    <Button disabled={!canSubmitApplication || submitApplication.isPending} onClick={submitNow}>
                      {submitApplication.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Nộp hồ sơ
                    </Button>
                  </>
                ) : (
                  <Button disabled={runPrecheck.isPending} onClick={precheckNow}>
                    {runPrecheck.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                    Kiểm tra hồ sơ
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </section>

        <section ref={trackingSectionRef} className="mb-5 scroll-mt-24" aria-labelledby="tracking-title">
          <Card>
            <div className="flex items-start gap-3">
              {application.status === "completed" ? (
                <CheckCircle2 className="mt-1 h-6 w-6 text-emerald-600" />
              ) : (
                <CircleAlert className="mt-1 h-6 w-6 text-[#0057C2]" />
              )}
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Theo dõi kết quả
                </div>
                <h3 id="tracking-title" className="mt-1 text-xl font-bold text-brand-deep">
                  {hasSubmittedApplication ? getStudentApplicationStatusLabel(application.status) : "Chưa nộp hồ sơ"}
                </h3>
                {hasSubmittedApplication ? (
                  <>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <InfoBlock label="Đã nộp lúc" value={formatDate(application.submittedAt)} />
                      <InfoBlock label="Trạng thái xét" value={getStudentApplicationStatusLabel(application.status)} />
                      <InfoBlock label="Kết quả cuối" value={getFinalStatusLabel(application.finalStatus ?? "pending")} />
                      <InfoBlock label="Thời điểm chốt" value={formatFinalDate(application.finalizedAt)} />
                    </div>
                    {application.finalNote ? (
                      <p className="mt-4 max-w-3xl rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                        {application.finalNote}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                    Sau khi bạn kiểm tra và nộp hồ sơ, khu vực này sẽ hiển thị thời điểm nộp, trạng thái xét duyệt
                    và yêu cầu bổ sung nếu có.
                  </p>
                )}
              </div>
            </div>
          </Card>
        </section>

        {canEditApplication ? (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E3ECF6] bg-white/95 px-4 py-3 shadow-[0_-12px_36px_-28px_rgba(15,23,42,0.55)] backdrop-blur">
            <div className="mx-auto flex max-w-[1280px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                {isSupplementMode
                  ? "Hồ sơ đang cần bổ sung theo yêu cầu của cán bộ."
                  : checklistItems.length > 0
                    ? `Bạn còn thiếu ${checklistItems.length} việc trước khi nộp hồ sơ.`
                    : "Hồ sơ đã đủ dữ liệu cơ bản để kiểm tra và nộp."}
              </div>
              <div className="flex flex-wrap gap-2">
                {isSupplementMode ? (
                  <Button onClick={goToSupplementCriterion}>Bổ sung theo yêu cầu</Button>
                ) : checklistItems.length > 0 ? (
                  <>
                    <Button onClick={handleFirstMissingAction}>Hoàn thiện phần còn thiếu</Button>
                    <Button variant="secondary" disabled={runPrecheck.isPending} onClick={precheckNow}>
                      Kiểm tra hồ sơ
                    </Button>
                  </>
                ) : canShowSubmitCta ? (
                  <>
                    <Button variant="secondary" disabled={runPrecheck.isPending} onClick={precheckNow}>
                      Kiểm tra hồ sơ
                    </Button>
                    <Button disabled={!canSubmitApplication || submitApplication.isPending} onClick={submitNow}>
                      {submitApplication.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Nộp hồ sơ
                    </Button>
                  </>
                ) : (
                  <Button disabled={runPrecheck.isPending} onClick={precheckNow}>
                    Kiểm tra hồ sơ
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : null}

      {application?.id && evidenceForm && canEditApplication ? (
        <AddEvidenceDrawer
          applicationId={application.id}
          open={Boolean(evidenceForm)}
          onOpenChange={(open) => {
            if (!open) setEvidenceForm(null);
          }}
          initialCriterion={evidenceForm.criterion}
          onCreated={(created) => {
            const nextEvidence = normalizeOptimisticEvidence(created, application.id);
            setOptimisticEvidences((current) => upsertEvidence(current, nextEvidence));
            setEvidenceForm(null);
            void evidencesQuery.refetch();
            scrollToCriterion(nextEvidence.criterion, false);
          }}
        />
      ) : null}

      <EvidenceDetailModal
        evidence={selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
      />

      {confirmSubmitOpen && (
        <SubmitConfirmationModal
          application={application}
          precheck={precheck}
          evidenceCounts={Object.fromEntries(
            criteria.map((criterion) => [criterion.key, evidenceByCriterion[criterion.key]?.length ?? 0]),
          ) as Partial<Record<Criterion, number>>}
          onCancel={() => setConfirmSubmitOpen(false)}
          onConfirm={confirmSubmit}
          pending={submitApplication.isPending}
        />
      )}
    </>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#F6F9FC] px-3 py-3">
      <div className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-bold text-brand-deep">{value}</div>
    </div>
  );
}

type GuidedChecklistItem = {
  id: string;
  action: "input_info" | "add_evidence";
  criterion: Criterion;
  criterionLabel: string;
  reason: string;
  title: string;
};

function buildGuidedChecklist({
  criteria,
  evidenceByCriterion,
  metrics,
  precheck,
  supplementRequests,
}: {
  criteria: typeof coreCriteria;
  evidenceByCriterion: Record<Criterion, EvidenceResponse[]>;
  metrics: ApplicationMetric[];
  precheck: PrecheckResult | null;
  supplementRequests: Array<{ criterion: Criterion; reason: string }>;
}): GuidedChecklistItem[] {
  const tasks: GuidedChecklistItem[] = [];
  const hasMetric = (metricType: MetricType) =>
    metrics.some((item) => item.metricType === metricType && item.value !== null && item.value !== undefined);

  supplementRequests.forEach((request) => {
    const meta = criteria.find((item) => item.key === request.criterion);
    tasks.push({
      id: `supplement-${request.criterion}`,
      action: "add_evidence",
      criterion: request.criterion,
      criterionLabel: meta?.label ?? "Hồ sơ",
      reason: request.reason || "Cán bộ yêu cầu bổ sung minh chứng cho tiêu chí này.",
      title: "Bổ sung theo yêu cầu của cán bộ",
    });
  });

  criteria.forEach((criterion) => {
    const evidenceCount = evidenceByCriterion[criterion.key]?.length ?? 0;
    const primaryMetric = getPrimaryMetricInput(criterion.key);

    if (criterion.key === "ethics" && primaryMetric && !hasMetric(primaryMetric.metricType)) {
      tasks.push({
        id: "metric-conduct_score",
        action: "input_info",
        criterion: criterion.key,
        criterionLabel: criterion.label,
        reason: "Tiêu chí Đạo đức tốt cần điểm rèn luyện để kiểm tra điều kiện.",
        title: "Nhập điểm rèn luyện",
      });
    }

    if (criterion.key === "academic" && primaryMetric && !hasMetric(primaryMetric.metricType)) {
      tasks.push({
        id: "metric-gpa",
        action: "input_info",
        criterion: criterion.key,
        criterionLabel: criterion.label,
        reason: "Tiêu chí Học tập tốt cần GPA hoặc bảng điểm để đối chiếu.",
        title: "Nhập GPA hoặc tải bảng điểm",
      });
    }

    if (criterion.key === "volunteer" && primaryMetric && !hasMetric(primaryMetric.metricType)) {
      tasks.push({
        id: "metric-volunteer_days",
        action: "input_info",
        criterion: criterion.key,
        criterionLabel: criterion.label,
        reason: "Tiêu chí Tình nguyện tốt cần số ngày hoặc hoạt động tình nguyện đã tham gia.",
        title: "Nhập số ngày tình nguyện",
      });
    }

    if (criterion.key === "integration" && primaryMetric && !hasMetric(primaryMetric.metricType) && evidenceCount === 0) {
      tasks.push({
        id: "integration-language",
        action: "add_evidence",
        criterion: criterion.key,
        criterionLabel: criterion.label,
        reason: "Bạn cần thêm chứng chỉ ngoại ngữ hoặc minh chứng hoạt động hội nhập.",
        title: "Bổ sung minh chứng hội nhập",
      });
      return;
    }

    if (evidenceCount === 0) {
      tasks.push({
        id: `evidence-${criterion.key}`,
        action: "add_evidence",
        criterion: criterion.key,
        criterionLabel: criterion.label,
        reason: getMissingEvidenceReason(criterion.key),
        title: getMissingEvidenceTitle(criterion.key),
      });
    }
  });

  precheck?.missingItems?.slice(0, 5).forEach((item, index) => {
    const criterion = criteria.find((entry) => entry.key === item.criterion) ?? criteria[0];
    const message = getPrecheckMissingMessage(item);
    const id = `precheck-${item.code ?? index}-${criterion.key}`;
    if (tasks.some((task) => task.id === id || (task.criterion === criterion.key && task.title === message.description))) return;
    tasks.push({
      id,
      action: "add_evidence",
      criterion: criterion.key,
      criterionLabel: criterion.label,
      reason: "Kết quả kiểm tra hồ sơ cho thấy tiêu chí này cần thêm dữ liệu.",
      title: message.description,
    });
  });

  return tasks;
}

function getMissingEvidenceTitle(criterion: Criterion) {
  const labels: Partial<Record<Criterion, string>> = {
    ethics: "Bổ sung minh chứng đạo đức",
    academic: "Tải bảng điểm hoặc giấy xác nhận học tập",
    physical: "Bổ sung minh chứng thể lực",
    volunteer: "Bổ sung minh chứng tình nguyện",
    integration: "Bổ sung minh chứng hội nhập",
  };
  return labels[criterion] ?? "Bổ sung minh chứng";
}

function getMissingEvidenceReason(criterion: Criterion) {
  const labels: Partial<Record<Criterion, string>> = {
    ethics: "Bạn cần minh chứng điểm rèn luyện hoặc xác nhận không vi phạm.",
    academic: "Bạn cần bảng điểm, giấy xác nhận học tập hoặc minh chứng học thuật.",
    physical: "Bạn cần nhập điểm hoặc minh chứng thể lực.",
    volunteer: "Bạn cần giấy xác nhận hoặc danh sách hoạt động tình nguyện.",
    integration: "Bạn cần thêm chứng chỉ ngoại ngữ hoặc minh chứng hoạt động hội nhập.",
  };
  return labels[criterion] ?? "Bạn cần thêm minh chứng phù hợp với tiêu chí này.";
}

function getGuidedPrimaryCta(action: PrimaryWorkspaceAction["action"], missingCount: number) {
  if (action === "tracking") return "Theo dõi hồ sơ";
  if (action === "supplement") return "Bổ sung theo yêu cầu";
  if (missingCount > 0 || action === "criteria") return "Hoàn thiện tiêu chí còn thiếu";
  if (action === "precheck") return "Kiểm tra hồ sơ";
  return "Nộp hồ sơ";
}

function getSubmitSectionTitle(
  status: ApplicationStatus,
  missingCount: number,
  hasPrecheck: boolean,
  canShowSubmitCta: boolean,
) {
  if (["submitted", "under_review", "resolution_needed", "completed", "rejected"].includes(status)) {
    return "Hồ sơ đã nộp, hãy theo dõi kết quả";
  }
  if (status === "supplement_required") return "Bổ sung hồ sơ theo yêu cầu";
  if (missingCount > 0) return `Bạn còn thiếu ${missingCount} việc trước khi nộp`;
  if (!hasPrecheck || !canShowSubmitCta) return "Đã đủ dữ liệu cơ bản, hãy kiểm tra hồ sơ";
  return "Hồ sơ đã sẵn sàng để nộp";
}

function getGuidedCriterionStatus(
  evidenceCount: number,
  result: PrecheckCriterionResult | undefined,
  assessment: { status?: string } | undefined,
  hasSupplementRequest: boolean,
) {
  if (hasSupplementRequest) {
    return {
      label: "Cần bổ sung",
      description: "Cán bộ đã yêu cầu bổ sung tiêu chí này.",
      tone: "warning" as const,
    };
  }
  if (evidenceCount === 0) {
    return {
      label: "Còn thiếu",
      description: "Bạn chưa có minh chứng cho tiêu chí này.",
      tone: "warning" as const,
    };
  }
  if (result?.status === "failed" || result?.status === "needs_supplement" || result?.passed === false) {
    return {
      label: "Cần kiểm tra file",
      description: "Hệ thống thấy tiêu chí này cần bổ sung hoặc kiểm tra lại file.",
      tone: "warning" as const,
    };
  }
  if (result?.warnings?.length || result?.status === "needs_officer_confirmation" || result?.status === "risky") {
    return {
      label: "Chờ cán bộ xác nhận",
      description: "Thông tin này sẽ được cán bộ kiểm tra sau khi bạn nộp.",
      tone: "warning" as const,
    };
  }
  if (result?.passed || result?.status === "passed" || result?.status === "complete" || assessment?.status === "met") {
    return {
      label: "Đủ dữ liệu",
      description: "Tiêu chí đã có dữ liệu cơ bản.",
      tone: "success" as const,
    };
  }
  return {
    label: "Đủ dữ liệu",
    description: "Đã có minh chứng, có thể kiểm tra lại trước khi nộp.",
    tone: "brand" as const,
  };
}

type PrimaryWorkspaceAction = {
  action: "criteria" | "precheck" | "submit" | "tracking" | "supplement";
  cta: string;
  description: string;
  icon: ReactNode;
  label: string;
};

function getPrimaryWorkspaceAction({
  criteriaWithEvidence,
  hasPrecheck,
  isSupplementMode,
  readinessScore,
  status,
}: {
  criteriaWithEvidence: number;
  hasPrecheck: boolean;
  isSupplementMode: boolean;
  readinessScore: number;
  status: ApplicationStatus;
}): PrimaryWorkspaceAction {
  if (isSupplementMode) {
    return {
      action: "supplement",
      cta: "Bổ sung minh chứng",
      description: "Cán bộ đã yêu cầu bổ sung. Hãy đi thẳng tới tiêu chí cần cập nhật rồi gửi lại hồ sơ.",
      icon: <Upload className="h-4 w-4" />,
      label: "Bổ sung theo yêu cầu của cán bộ",
    };
  }

  if (["submitted", "under_review", "resolution_needed", "completed", "rejected"].includes(status)) {
    return {
      action: "tracking",
      cta: "Theo dõi xét duyệt",
      description: "Hồ sơ đã gửi. Bạn có thể xem trạng thái từng tiêu chí và phản hồi nếu có yêu cầu bổ sung.",
      icon: <CircleAlert className="h-4 w-4" />,
      label: "Theo dõi hồ sơ sau khi nộp",
    };
  }

  if (criteriaWithEvidence < 5) {
    return {
      action: "criteria",
      cta: "Thêm minh chứng còn thiếu",
      description: "Hoàn thiện 5 tiêu chí trước khi kiểm tra và nộp hồ sơ.",
      icon: <Upload className="h-4 w-4" />,
      label: "Hoàn thiện minh chứng cho 5 tiêu chí",
    };
  }

  if (!hasPrecheck || readinessScore < 80) {
    return {
      action: "precheck",
      cta: "Kiểm tra hồ sơ",
      description: "Kiểm tra lại điều kiện, dữ liệu và minh chứng trước khi nộp chính thức.",
      icon: <ClipboardCheck className="h-4 w-4" />,
      label: "Kiểm tra trước khi nộp",
    };
  }

  return {
    action: "submit",
    cta: "Nộp hồ sơ",
    description: "Hồ sơ đã đủ dữ liệu cơ bản. Khi nộp, hồ sơ sẽ khóa cho tới khi cán bộ yêu cầu bổ sung.",
    icon: <Send className="h-4 w-4" />,
      label: "Đủ dữ liệu để nộp hồ sơ",
  };
}

function getWorkspaceMissingWorkCount({
  missingCriteriaCount,
  missingItemsCount,
  metricsCompleted,
  metricsRequired,
}: {
  missingCriteriaCount: number;
  missingItemsCount: number;
  metricsCompleted: number;
  metricsRequired: number;
}) {
  const missingMetrics = Math.max(0, metricsRequired - metricsCompleted);
  return Math.max(missingCriteriaCount, missingItemsCount, missingMetrics);
}

function getWorkspaceHeadline(
  status: ApplicationStatus,
  missingCriteriaCount: number,
  missingWorkCount: number,
  hasPrecheck: boolean,
) {
  if (status === "submitted" || status === "under_review" || status === "resolution_needed") {
    return "Theo dõi hồ sơ đã nộp";
  }
  if (status === "completed" || status === "rejected") return "Đã có kết quả hồ sơ";
  if (status === "supplement_required") {
    return missingWorkCount > 0 ? `Bạn còn ${missingWorkCount} việc cần bổ sung` : "Bạn cần gửi lại hồ sơ bổ sung";
  }
  if (missingCriteriaCount > 0) return `Còn ${missingCriteriaCount}/5 tiêu chí cần bổ sung`;
  if (!hasPrecheck) return "Đã đủ dữ liệu cơ bản để kiểm tra hồ sơ";
  if (missingWorkCount > 0) return `Bạn còn ${missingWorkCount} việc cần hoàn thành`;
  return "Đã đủ dữ liệu cơ bản để nộp hồ sơ";
}

function getPrecheckHeadline(
  precheck: PrecheckResult | null,
  missingCriteriaCount: number,
  missingWorkCount: number,
) {
  if (missingCriteriaCount > 0) return `Còn ${missingCriteriaCount}/5 tiêu chí cần bổ sung`;
  if (!precheck) return "Đang chờ dữ liệu hồ sơ";
  if (missingWorkCount > 0) return `Bạn còn ${missingWorkCount} việc cần hoàn thành`;
  return "Đã đủ dữ liệu cơ bản để nộp hồ sơ";
}

function getCriterionCheckSummary(evidenceCount: number, result?: PrecheckCriterionResult) {
  if (evidenceCount === 0) return "Chưa có minh chứng cho tiêu chí này";
  if (!result) return "Đã có minh chứng, chờ kiểm tra";
  if (result.warnings?.length || result.status === "needs_officer_confirmation" || result.status === "risky") {
    return "Chờ cán bộ kiểm tra sau khi nộp";
  }
  if (result.passed || result.status === "passed" || result.status === "complete") return "Đủ dữ liệu cơ bản";
  if (result.status === "failed" || result.status === "needs_supplement" || result.passed === false) return "Cần bổ sung";
  return "Đã tự kiểm tra trên hệ thống";
}

type MetricInputConfig = {
  key: MetricType;
  label: string;
  placeholder: string;
  scale?: number;
};

function ReadOnlyCriterionData({
  criterion,
  metrics,
  drafts,
}: {
  criterion: Criterion;
  metrics: ApplicationMetric[];
  drafts: Record<string, string>;
}) {
  const rows = getReadOnlyCriterionRows(criterion, metrics, drafts);

  return (
    <div className="rounded-xl border border-[#E3ECF6] bg-white p-4">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Dữ liệu đã nộp</div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-lg bg-[#F8FBFE] px-3 py-2">
            <div className="text-[11px] font-semibold uppercase text-muted-foreground">{row.label}</div>
            <div className="mt-1 text-sm font-semibold text-brand-deep">{row.value || "Chưa ghi nhận"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StructuredCriterionInputs({
  criterion,
  metrics,
  metricValues,
  metricErrors,
  savingMetrics,
  canEdit,
  drafts,
  onDraftChange,
  onMetricChange,
  onSaveMetric,
}: {
  criterion: Criterion;
  metrics: ApplicationMetric[];
  metricValues: Record<MetricType, string>;
  metricErrors: Partial<Record<MetricType, string>>;
  savingMetrics: Partial<Record<MetricType, boolean>>;
  canEdit: boolean;
  drafts: Record<string, string>;
  onDraftChange: (field: string, value: string) => void;
  onMetricChange: (metric: MetricInputConfig, value: string) => void;
  onSaveMetric: (metricType: MetricType, scale?: number) => void;
}) {
  const fields = criterionInputFields[criterion as CoreCriterion] ?? [];

  return (
    <div className="rounded-xl border border-[#E3ECF6] bg-white p-4">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Dữ liệu cần nhập</div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {fields.map((field) => {
          if (field.kind === "metric") {
            const saved = metrics.find((item) => item.metricType === field.metricType);
            const scale = field.metricType === "gpa" ? Number(drafts.gpa_scale || field.scale || 4) : field.scale;
            const metric: MetricInputConfig = {
              key: field.metricType,
              label: field.label,
              placeholder: field.placeholder,
              scale,
            };
            return (
              <div key={field.metricType}>
                <label className="text-xs font-semibold text-muted-foreground">{field.label}</label>
                <div className="mt-1 flex gap-2">
                  <input
                    className={"min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 " + (metricErrors[field.metricType]
                      ? "border-rose-300 bg-rose-50 focus:ring-rose-200"
                      : "border-[#DCE7F2] focus:ring-[#0057C2]/20")}
                    type="number"
                    min={0}
                    max={field.metricType === "gpa" ? scale : field.metricType === "conduct_score" ? 100 : undefined}
                    step={field.metricType === "volunteer_days" ? 1 : 0.01}
                    placeholder={saved ? String(saved.value) : field.placeholder}
                    value={metricValues[field.metricType]}
                    onChange={(event) => onMetricChange(metric, event.target.value)}
                    disabled={!canEdit}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!canEdit || Boolean(metricErrors[field.metricType]) || Boolean(savingMetrics[field.metricType])}
                    onClick={() => onSaveMetric(field.metricType, scale)}
                  >
                    {savingMetrics[field.metricType] ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Lưu
                  </Button>
                </div>
                {metricErrors[field.metricType] ? <div className="mt-1 text-xs text-rose-600">{metricErrors[field.metricType]}</div> : null}
              </div>
            );
          }

          if (field.kind === "select") {
            return (
              <SelectField
                key={field.key}
                label={field.label}
                value={drafts[field.key] || field.defaultValue}
                onChange={(value) => onDraftChange(field.key, value)}
                options={field.options}
                disabled={!canEdit}
              />
            );
          }

          return (
            <TextField
              key={field.key}
              label={field.label}
              type={field.inputType ?? "text"}
              value={drafts[field.key] || ""}
              onChange={(value) => onDraftChange(field.key, value)}
              disabled={!canEdit}
            />
          );
        })}
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        className="mt-1 w-full rounded-lg border border-[#DCE7F2] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0057C2]/20 disabled:bg-slate-50"
        value={value}
        type={type}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <select
        className="mt-1 w-full rounded-lg border border-[#DCE7F2] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0057C2]/20 disabled:bg-slate-50"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function CriterionChecklist({
  criterion,
  evidenceCount,
  result,
}: {
  criterion: Criterion;
  evidenceCount: number;
  result?: PrecheckCriterionResult;
}) {
  const reasons = Array.isArray(result?.reasons) ? result.reasons : [];
  const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
  const status = getCriterionStatus(evidenceCount, result);
  const checklist = [
    {
      label: evidenceCount > 0 ? "Đã có minh chứng liên quan" : "Chưa có minh chứng liên quan",
      state: evidenceCount > 0 ? "completed" : "missing",
      source: evidenceCount > 0 ? String(evidenceCount) + " minh chứng đã được ghi nhận." : "Bạn cần thêm ít nhất một minh chứng cho tiêu chí này.",
    },
    {
      label: result ? "Dữ liệu đã được hệ thống kiểm tra" : "Dữ liệu đủ để kiểm tra hồ sơ",
      state: result ? (warnings.length > 0 ? "warning" : "completed") : "missing",
      source: result ? "Kết quả mới nhất giúp bạn rà soát trước khi nộp." : "Hãy thêm minh chứng hoặc nhập thông tin còn thiếu.",
    },
    ...reasons.slice(0, 1).map((reason) => ({
      label: getUserFacingText(reason),
      state: "missing",
      source: "Việc cần bổ sung trước khi nộp.",
    })),
    ...warnings.slice(0, 1).map((warning) => ({
      label: getUserFacingText(warning),
      state: "warning",
      source: "Cần rà soát thêm trước khi nộp.",
    })),
  ].slice(0, 3);

  return (
    <div className="rounded-xl border border-[#E3ECF6] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold text-brand-deep">Checklist tiêu chí</div>
        <Chip tone={status.tone}>{status.label}</Chip>
      </div>
      <div className="mt-3 grid gap-2">
        {checklist.map((item, index) => (
          <div key={item.label + "-" + index} className="flex items-start justify-between gap-3 rounded-lg bg-[#F8FBFE] px-3 py-2 text-sm">
            <div>
              <div className="font-semibold text-brand-deep">{item.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{item.source}</div>
            </div>
            <Chip tone={item.state === "completed" ? "success" : item.state === "warning" ? "warning" : "muted"}>
              {item.state === "completed" ? "Hoàn tất" : item.state === "warning" ? "Cần rà soát" : "Thiếu"}
            </Chip>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Cán bộ sẽ xác nhận minh chứng sau khi bạn nộp hồ sơ.
      </p>
    </div>
  );
}

function getCriterionStatus(evidenceCount: number, result?: PrecheckCriterionResult) {
  if (!evidenceCount && !result) return { label: "Chưa có dữ liệu", tone: "muted" as const };
  if (!evidenceCount) return { label: "Cần bổ sung", tone: "warning" as const };
  if (result?.warnings?.length) return { label: "Chờ cán bộ xác nhận", tone: "warning" as const };
  if (result?.passed || result?.status === "passed") return { label: "Đủ dữ liệu cơ bản", tone: "success" as const };
  return { label: "Đã có giấy xác nhận", tone: "brand" as const };
}

function getReadOnlyCriterionRows(
  criterion: Criterion,
  metrics: ApplicationMetric[],
  drafts: Record<string, string>,
) {
  const fields = criterionInputFields[criterion as CoreCriterion] ?? [];
  return fields.map((field) => {
    if (field.kind === "metric") {
      const saved = metrics.find((item) => item.metricType === field.metricType);
      return { label: field.label, value: saved ? String(saved.value) : "" };
    }
    if (field.kind === "select") {
      return { label: field.label, value: drafts[field.key] || field.defaultValue };
    }
    return { label: field.label, value: drafts[field.key] || "" };
  });
}

function getPrimaryMetricForCriterion(criterion: Criterion): MetricInputConfig | null {
  const metric = getPrimaryMetricInput(criterion);
  return metric
    ? {
        key: metric.metricType,
        label: metric.label,
        placeholder: metric.placeholder,
        scale: metric.scale,
      }
    : null;
}

function getDefaultEvidenceName(criterion: Criterion) {
  const names: Partial<Record<Criterion, string>> = {
    ethics: "Giấy xác nhận Đạo đức tốt",
    academic: "Bảng điểm học tập",
    physical: "Giấy chứng nhận Sinh viên khỏe",
    volunteer: "Giấy xác nhận hoạt động tình nguyện",
    integration: "Chứng chỉ ngoại ngữ hoặc giấy xác nhận hội nhập",
  };
  return names[criterion] ?? "Minh chứng mới";
}

function getMissingSummaryForLevel(level: Level, suitability: ReturnType<typeof evaluateLevelAgainstMatrix>) {
  if (suitability.status === "met") {
    return "Hồ sơ hiện tại phù hợp với " + levelLabel[level] + ".";
  }
  if (suitability.missing.length > 0) {
    return suitability.missing.slice(0, 4).join("; ");
  }
  return "Bạn còn thiếu một số dữ liệu hoặc giấy xác nhận để tự tin nộp " + levelLabel[level] + ".";
}

function savePrimaryMetricForCriterion(
  criterion: Criterion,
  saveMetric: (metricType: MetricType, scale?: number) => void,
) {
  const metric = getPrimaryMetricForCriterion(criterion);
  if (metric) saveMetric(metric.key, metric.scale);
}

function sortEvidences(items: EvidenceResponse[], sort: EvidenceSort) {
  const list = [...items];
  const dateValue = (value?: string | null) => (value ? new Date(value).getTime() : 0);
  if (sort === "oldest") return list.sort((a, b) => dateValue(a.createdAt) - dateValue(b.createdAt));
  if (sort === "name") return list.sort((a, b) => (a.evidenceName ?? "").localeCompare(b.evidenceName ?? "", "vi"));
  if (sort === "criterion") return list.sort((a, b) => a.criterion.localeCompare(b.criterion));
  if (sort === "status") return list.sort((a, b) => String(a.status).localeCompare(String(b.status)));
  if (sort === "review") return list.sort((a, b) => getReviewWeight(b) - getReviewWeight(a));
  return list.sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt));
}

function getReviewWeight(item: EvidenceResponse) {
  const status = String(item.status);
  const confidence = typeof item.confidence === "number" ? item.confidence : 1;
  if (status === "needs_supplement" || status === "rejected") return 4;
  if (confidence < 0.7) return 3;
  if (status === "under_review") return 2;
  if (status === "draft") return 1;
  return 0;
}

function formatRelativeCheckTime(value?: string | null) {
  if (!value) return "vài phút";
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff) || diff < 60_000) return "vài phút";
  const minutes = Math.max(1, Math.round(diff / 60_000));
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.round(minutes / 60);
  return `${hours} giờ`;
}

function validateMetricValue(metricType: MetricType, value: number, scale?: number) {
  if (metricType === "gpa") {
    const gpaScale = scale ?? 4;
    if (value < 0) return "GPA không được nhỏ hơn 0.";
    if (gpaScale === 10 && value > 10) return "GPA không được vượt quá 10.0.";
    if (value > 4) return "GPA không được vượt quá 4.0.";
  }

  if (metricType === "conduct_score" && (value < 0 || value > 100)) {
    return "Điểm rèn luyện phải nằm trong khoảng 0-100.";
  }

  if (metricType === "volunteer_days" && value < 0) {
    return "Số ngày tình nguyện không được nhỏ hơn 0.";
  }

  if (metricType === "physical_score" && (value < 0 || value > 10)) {
    return "Điểm thể lực phải nằm trong khoảng 0-10.";
  }

  if (metricType === "foreign_language_score" && value < 0) {
    return "Điểm ngoại ngữ không được nhỏ hơn 0.";
  }

  return null;
}

function normalizeEvidences(value: unknown): EvidenceResponse[] {
  if (Array.isArray(value)) return value as EvidenceResponse[];
  if (value && typeof value === "object" && Array.isArray((value as { evidences?: unknown }).evidences)) {
    return (value as { evidences: EvidenceResponse[] }).evidences;
  }
  return [];
}

function normalizeOptimisticEvidence(evidence: EvidenceResponse, applicationId: string): EvidenceResponse {
  return {
    ...evidence,
    applicationId: evidence.applicationId ?? applicationId,
    criterion: evidence.criterion ?? "academic",
    createdAt: evidence.createdAt || new Date().toISOString(),
    updatedAt: evidence.updatedAt || new Date().toISOString(),
  };
}

function mergeOptimisticEvidences(
  serverEvidences: EvidenceResponse[],
  optimisticEvidences: EvidenceResponse[],
  applicationId?: string,
) {
  if (optimisticEvidences.length === 0) return serverEvidences;
  const merged = new Map<string, EvidenceResponse>();

  serverEvidences.forEach((item) => {
    if (item.id) merged.set(item.id, item);
  });

  optimisticEvidences.forEach((item) => {
    if (!item.id) return;
    if (applicationId && item.applicationId && item.applicationId !== applicationId) return;
    const serverItem = merged.get(item.id);
    merged.set(item.id, serverItem ? mergeEvidenceForDisplay(serverItem, item) : item);
  });

  return Array.from(merged.values());
}

function mergeEvidenceForDisplay(serverItem: EvidenceResponse, optimisticItem: EvidenceResponse) {
  const serverFiles = Array.isArray(serverItem.files) ? serverItem.files : [];
  const optimisticFiles = Array.isArray(optimisticItem.files) ? optimisticItem.files : [];
  return {
    ...optimisticItem,
    ...serverItem,
    fileId: serverItem.fileId ?? optimisticItem.fileId,
    fileName: serverItem.fileName ?? optimisticItem.fileName,
    files: serverFiles.length > 0 ? serverFiles : optimisticFiles,
    jobId: serverItem.jobId ?? optimisticItem.jobId,
  };
}

function upsertEvidence(list: EvidenceResponse[], evidence: EvidenceResponse) {
  const exists = list.some((item) => item.id === evidence.id);
  if (exists) {
    return list.map((item) => (item.id === evidence.id ? mergeEvidenceForDisplay(item, evidence) : item));
  }
  return [evidence, ...list];
}

function normalizeApplicationLevels(application: ApplicationWithDetails): ApplicationWithDetails {
  return {
    ...application,
    targetLevel: normalizeWorkspaceLevel(application.targetLevel),
    finalLevel: application.finalLevel ? normalizeWorkspaceLevel(application.finalLevel) : application.finalLevel,
  };
}

function normalizeWorkspaceLevel(value: unknown): Level {
  const map: Record<string, Level> = {
    truong: "school",
    school: "school",
    dhdn: "university",
    university: "university",
    "dai-hoc-da-nang": "university",
    "thanh-pho": "city",
    city: "city",
    "trung-uong": "central",
    central: "central",
  };
  return map[String(value ?? "").trim()] ?? "school";
}

function getFinalTone(status?: string | null) {
  return finalStatusTone[status as keyof typeof finalStatusTone] ?? "warning";
}

function useResolvedAvatarUrl(avatarUrl?: string | null) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveAvatar() {
      if (!avatarUrl) {
        setResolvedUrl(null);
        return;
      }
      if (!avatarUrl.startsWith("file:")) {
        setResolvedUrl(avatarUrl);
        return;
      }

      const fileId = avatarUrl.slice("file:".length);
      if (!fileId) {
        setResolvedUrl(null);
        return;
      }

      try {
        const response = await evidenceApi.getSignedFileUrl(fileId);
        if (!cancelled) setResolvedUrl(response.data?.url ?? null);
      } catch {
        if (!cancelled) setResolvedUrl(null);
      }
    }

    void resolveAvatar();
    return () => {
      cancelled = true;
    };
  }, [avatarUrl]);

  return resolvedUrl;
}

function getInitials(name?: string | null) {
  const words = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "SV";
  return words
    .slice(-2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("") || "SV";
}

function formatFinalDate(value?: string | null) {
  if (!value) return "Chưa chốt";
  return formatDate(value);
}

function formatDate(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
