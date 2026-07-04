import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { useCreateEvidence, useDeleteEvidence, useEvidences, useUploadAndIndex } from "@/features/evidence/hooks/useEvidence";
import { getPrecheckMissingMessage, getUserFacingText } from "@/lib/user-facing-messages";
import { finalStatusTone, getFinalStatusLabel } from "@/lib/status-labels";
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
  file: File | null;
};

type EvidenceSort = "newest" | "oldest" | "name" | "criterion" | "status" | "review";

const SCHOOL_YEAR = "2025-2026";

const tabLabels: Record<WorkspaceTab, string> = {
  info: "Thông tin & cấp aim",
  criteria: "5 tiêu chí",
  precheck: "Kiểm tra hồ sơ",
  tracking: "Theo dõi sau khi nộp",
};

const statusLabel: Record<ApplicationStatus | "not_started", string> = {
  not_started: "Chưa có hồ sơ",
  draft: "Bản nháp",
  prechecked: "Đã kiểm tra hồ sơ",
  ready_to_submit: "Sẵn sàng nộp",
  submitted: "Đã nộp",
  under_review: "Đang xét duyệt",
  supplement_required: "Cần bổ sung",
  resolution_needed: "Cần hội đồng xử lý",
  completed: "Hoàn tất",
  rejected: "Chưa đạt",
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
  const criterionRefs = useRef<Partial<Record<Criterion, HTMLDivElement | null>>>({});
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

  const application = current.data?.application as ApplicationWithDetails | null | undefined;
  const appId = application?.id;
  const evidencesQuery = useEvidences(appId, { limit: 100 });
  const latestPrecheck = useLatestPrecheck(appId);

  const evidences = normalizeEvidences(evidencesQuery.data);
  const precheck = (latestPrecheck.data ?? null) as PrecheckResult | null;
  const metrics = application?.metrics ?? [];
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
  const avatarSrc = useResolvedAvatarUrl(user?.avatarUrl);
  const nextBestAction = getUserFacingText(
    precheck?.nextBestAction,
    "Bạn có thỒ kiỒm tra lại h sơ sau khi cập nhật thông tin hoặc thêm thành tích.",
  );
  const firstName = user?.fullName?.trim().split(/\s+/).slice(-1)[0] ?? "bạn";

  useEffect(() => {
    if (application?.targetLevel) setSelectedLevel(application.targetLevel);
  }, [application?.targetLevel]);

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
          title={`H sơ của ${firstName}`}
          subtitle="Hi!n chưa thỒ tải dữ li!u h sơ của bạn."
        />
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-1 h-6 w-6 shrink-0 text-amber-700" />
              <div>
                <h2 className="text-xl font-bold text-amber-950">Không thỒ tải h sơ</h2>
                <p className="mt-2 text-sm text-amber-900">
                  {current.error instanceof Error
                    ? current.error.message
                    : "Vui lòng Ēng nhập lại hoặc thử tải lại dữ li!u."}
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
          title={`H sơ của ${firstName}`}
          subtitle="Tài khoản này chưa có h sơ trong nĒm học hi!n tại."
        />
        <Card className="text-center">
          <FileText className="mx-auto h-12 w-12 text-[#0057C2]" />
          <h2 className="mt-4 text-2xl font-bold text-brand-deep">
            Chưa có h sơ Sinh viên 5 tt nĒm học {SCHOOL_YEAR}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Đây là trạng thái úng cho account m:i. Bấm tạo h sơ Ồ bắt ầu nhập dữ li!u thật.
          </p>
          <Button
            className="mt-6"
            disabled={startApplication.isPending}
            onClick={() => startApplication.mutate({ schoolYear: SCHOOL_YEAR, targetLevel: "school" })}
          >
            {startApplication.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Bắt ầu tạo h sơ
          </Button>
        </Card>
        <div className="mt-4">
          <StudentFlowStepper
            state={{
              applicationExists: false,
              applicationStatus: "not_started",
              evidenceCount: 0,
              latestPrecheck: null,
            }}
            busy={startApplication.isPending}
            onCreate={() => startApplication.mutate({ schoolYear: SCHOOL_YEAR, targetLevel: "school" })}
          />
        </div>
      </>
    );
  }

  const readinessScore = precheck?.readinessScore ?? application.readinessScore ?? 0;
  const supplementCriteria = new Set(supplementRequests.map((item) => item.criterion));

  const isCriterionLockedForSupplement = (criterion: Criterion) =>
    isSupplementMode && supplementCriteria.size > 0 && !supplementCriteria.has(criterion);

  const openEvidenceForm = (criterion: Criterion, evidenceName: string) => {
    if (isCriterionLockedForSupplement(criterion)) {
      toast.error("Tiêu chí này không được mở bổ sung trong đợt này.");
      return;
    }
    setEvidenceForm({ criterion, evidenceName, file: null });
  };

  const goToSupplementCriterion = () => {
    const target =
      supplementRequests[0]?.criterion ??
      criteria.find((criterion) => !isCriterionLockedForSupplement(criterion.key))?.key ??
      criteria[0].key;

    setTab("criteria");
    setActiveCriterion(target);
    setHighlightedCriterion(target);
    window.setTimeout(() => {
      criterionRefs.current[target]?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.querySelector<HTMLButtonElement>(`[data-add-evidence="${target}"]`)?.focus();
    }, 80);
    window.setTimeout(() => setHighlightedCriterion((current) => (current === target ? null : current)), 2800);
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
    setTab("precheck");
  };

  const submitEvidenceForm = async () => {
    if (!evidenceForm) return;
    if (!canEditApplication) {
      toast.error("Hồ sơ đã khóa, không thể thêm thành tích.");
      setEvidenceForm(null);
      return;
    }
    if (isCriterionLockedForSupplement(evidenceForm.criterion)) {
      toast.error("Tiêu chí này không được mở bổ sung trong đợt này.");
      setEvidenceForm(null);
      return;
    }

    const evidenceName = evidenceForm.evidenceName.trim();
    if (evidenceName.length < 3) {
      toast.error("Vui lòng nhập tên thành tích hoặc giấy xác nhận ít nhất 3 ký tự.");
      return;
    }

    try {
      const created = await createEvidence.mutateAsync({
        applicationId: application.id,
        data: {
          criterion: evidenceForm.criterion,
          evidenceName,
          sourceType: "manual_upload",
        },
      });

      if (evidenceForm.file) {
        await uploadAndIndex.mutateAsync({
          evidenceId: created.id,
          applicationId: application.id,
          file: evidenceForm.file,
        });
      }

      toast.success(evidenceForm.file ? "Đã thêm thành tích và h! thng ang kiỒm tra lại h sơ." : "Đã lưu thành tích.");
      setEvidenceForm(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thỒ thêm thành tích.");
    }
  };

  const submitNow = () => {
    setConfirmSubmitOpen(true);
  };

  const confirmSubmit = () => {
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
          setTab("tracking");
        },
      },
    );
  };

  const handleAvatarSelected = async (file?: File | null) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Ảnh h sơ ch0 h trợ JPG, PNG hoặc WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh h sơ ti a 5MB.");
      return;
    }

    try {
      setAvatarUploading(true);
      const response = await authApi.uploadAvatar(file);
      if (response.data) {
        setUser(response.data);
      }
      toast.success("Đã cập nhật ảnh h sơ.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thỒ cập nhật ảnh h sơ.");
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  return (
    <>
      <TopBar
        title="H sơ của tôi"
        subtitle="Hoàn thi!n thông tin, thêm thành tích và theo dõi trạng thái h sơ SV5T."
      />

      <div className="pb-24">
        <Card className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 gap-4">
              <div className="h-20 w-20 flex-none overflow-hidden rounded-2xl border bg-slate-100">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={user?.fullName ?? "Ảnh h sơ"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-bold text-brand-deep">
                    {getInitials(user?.fullName)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="brand">
                    <FileText className="h-3 w-3" /> H sơ {application.schoolYear}
                  </Chip>
                  <Chip tone={application.status === "completed" ? "success" : "warning"}>
                    {statusLabel[application.status]}
                  </Chip>
                  {!avatarSrc ? <Chip tone="muted">Chưa có ảnh h sơ</Chip> : null}
                </div>
                <h2 className="mt-3 break-words text-2xl font-bold text-brand-deep">
                  {user?.fullName ?? "Sinh viên"} - {user?.studentCode ?? "chưa có MSSV"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {user?.faculty ?? "Chưa có khoa"} ⬢ {user?.className ?? "Chưa có l:p"} ⬢ Aim{" "}
                  {levelLabel[application.targetLevel]}
                </p>
                {canEditApplication ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
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
                  <span className="text-xs text-muted-foreground">JPG, PNG, WEBP ti a 5MB.</span>
                </div>
                ) : null}
              </div>
            </div>
            <div className="w-full max-w-xs">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tiến " h sơ</span>
                <b className="text-brand-deep">{readinessScore}%</b>
              </div>
              <Progress value={readinessScore} />
              <div className="mt-2 text-xs text-muted-foreground">
                Cập nhật: {formatDate(application.lastUpdatedAt ?? application.updatedAt)}
              </div>
            </div>
          </div>
        </Card>

        {isSupplementMode && (
          <Card className="mb-4 border-amber-200 bg-amber-50">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Chip tone="warning">
                  <CircleAlert className="h-3 w-3" /> Cần b" sung
                </Chip>
                <h3 className="mt-3 text-lg font-bold text-amber-950">
                  Cán b" ã gửi feedback, vui lòng b" sung ri gửi lại h sơ.
                </h3>
                <p className="mt-1 text-sm text-amber-900">
                  Sau khi gửi lại, cán b" sẽ tiếp tục kiỒm tra các tiêu chí ược yêu cầu b" sung.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                <Button variant="secondary" onClick={goToSupplementCriterion}>
                  <Upload className="h-4 w-4" /> Đi t:i tiêu chí cần b" sung
                </Button>
                <Button disabled={!canSubmitApplication || submitApplication.isPending} onClick={submitNow}>
                  {submitApplication.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Gửi lại h sơ
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
                        Mục cần b" sung: {item.requestedFields.join(", ")}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-amber-200 bg-white px-4 py-3 text-sm text-amber-900">
                  Bạn có thỒ b" sung thành tích hoặc giấy xác nhận liên quan ri gửi lại h sơ.
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
                  {statusLabel[application.status]}
                </Chip>
                <h3 className="mt-3 text-lg font-bold text-brand-deep">H sơ ã ược gửi, bạn ang x chế " ch0 xem.</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bạn có thỒ theo dõi quá trình xét duy!t, xem lại h sơ ã n"p hoặc kiỒm tra thông báo m:i.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setTab("tracking")}>Theo dõi xét duy!t</Button>
                <Button variant="secondary" onClick={() => setTab("criteria")}>Xem h sơ ã n"p</Button>
                <Link to="/app/notifications">
                  <Button variant="outline">Xem thông báo</Button>
                </Link>
              </div>
            </div>
          </Card>
        )}

        <div className="mb-5 flex gap-2 overflow-x-auto rounded-lg border border-[#E3ECF6] bg-white p-1">
          {(Object.keys(tabLabels) as WorkspaceTab[]).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`shrink-0 rounded-md px-3 py-2 text-[13px] font-semibold transition-colors ${
                tab === key ? "bg-[#0057C2] text-white" : "text-slate-600 hover:bg-[#F1F7FD] hover:text-brand-deep"
              }`}
            >
              {tabLabels[key]}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <h3 className="flex items-center gap-2 font-bold text-brand-deep">
                <Target className="h-4 w-4" /> Chọn cấp aim
              </h3>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {levels.map((level) => {
                  const active = level.key === application.targetLevel;
                  const selected = level.key === selectedLevel;
                  return (
                    <button
                      key={level.key}
                      onClick={() => setSelectedLevel(level.key)}
                      className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                        selected ? "border-[#0057C2] bg-[#F1F7FD]" : "border-[#E3ECF6] hover:bg-[#F6F9FC]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-brand-deep">{level.label}</span>
                        {active && <Chip tone="brand">Đang chọn</Chip>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{level.desc}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 rounded-xl border border-[#E3ECF6] bg-[#F8FBFE] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Bộ tiêu chí của cấp này
                    </div>
                    <h4 className="mt-1 text-lg font-bold text-brand-deep">
                      {selectedLevel === application.targetLevel
                        ? "Hồ sơ đang aim cấp này"
                        : `Bạn đang xem điều kiện ${levelLabel[selectedLevel]}`}
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {levels.find((level) => level.key === selectedLevel)?.difference}
                    </p>
                  </div>
                  {canEditApplication ? (
                    <Button
                      disabled={selectedLevel === application.targetLevel || updateTargetLevel.isPending}
                      onClick={() => updateTargetLevel.mutate({ id: application.id, targetLevel: selectedLevel })}
                    >
                      {updateTargetLevel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                      Chọn cấp này
                    </Button>
                  ) : null}
                </div>

                <div className="mt-4 rounded-lg bg-white px-3 py-3">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Điều kiện chung
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {criteriaLevelSummaries[selectedLevel].overallRequirements.map((item) => (
                      <div key={item} className="rounded-lg bg-[#F8FBFE] px-3 py-2 text-sm font-semibold text-brand-deep">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {getLevelCriteria(selectedLevel).map((item) => {
                    const assessment = selectedLevelSuitability.criteria.find((entry) => entry.criterion === item.criterion);
                    return (
                      <div key={item.criterion} className="rounded-lg bg-white px-3 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                            {criteria.find((criterion) => criterion.key === item.criterion)?.label}
                          </div>
                          {assessment ? (
                            <Chip tone={assessment.status === "met" ? "success" : assessment.status === "not_suitable" ? "error" : "warning"}>
                              {assessment.statusLabel}
                            </Chip>
                          ) : null}
                        </div>
                        <ul className="mt-2 space-y-1 text-sm font-semibold text-brand-deep">
                          {item.hardRequirements.slice(0, 2).map((requirement) => (
                            <li key={requirement}>{requirement}</li>
                          ))}
                        </ul>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Nên có: {item.suggestedEvidenceTypes.slice(0, 2).join(", ")}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <div className="font-semibold">So với hồ sơ hiện tại: {selectedLevelSuitability.statusLabel}</div>
                  <div className="mt-1">
                    {getMissingSummaryForLevel(selectedLevel, selectedLevelSuitability)}
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-[#E3ECF6] bg-white px-3 py-2 text-sm">
                  <div className="font-semibold text-brand-deep">{priorityAchievementGroup.label}</div>
                  <div className="mt-1 text-muted-foreground">
                    Không nằm trong ladder cấp xét SV5T, nhưng được ghi nhận nếu sinh viên khai báo: {priorityAchievementGroup.examples.join(", ")}.
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="font-bold text-brand-deep">So sánh nhanh</h3>
              <div className="mt-3 space-y-2">
                {levels.map((level) => {
                  const assessment = evaluateLevelAgainstMatrix(level.key, { metrics, evidences });
                  return (
                    <button
                      key={level.key}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                        selectedLevel === level.key ? "border-[#0057C2] bg-[#F1F7FD]" : "border-[#E3ECF6] bg-white"
                      }`}
                      onClick={() => setSelectedLevel(level.key)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-brand-deep">{level.label}</div>
                        <Chip tone={assessment.status === "met" ? "success" : assessment.status === "not_suitable" ? "error" : "warning"}>
                          {assessment.statusLabel}
                        </Chip>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{level.difference}</div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {tab === "criteria" && (
          <div className="space-y-3">
            <div className="flex gap-2 overflow-x-auto rounded-xl border border-[#E3ECF6] bg-white p-1">
              {criteria.map((criterion) => (
                <button
                  key={criterion.key}
                  onClick={() => setActiveCriterion(criterion.key)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
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
              const nextCriterion = criteria[(activeIndex + 1) % criteria.length];
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
                          {supplementRequest ? <Chip tone="warning">Cần b" sung</Chip> : null}
                          <Chip tone={items.length > 0 ? "success" : "warning"}>
                            {items.length > 0 ? `${items.length} thành tích` : "Chưa có thành tích"}
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
                          <Upload className="h-4 w-4" /> Thêm thành tích
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
                            Thành tích/giấy xác nhận nên có: {matrixItem.suggestedEvidenceTypes.join(", ")}
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
                          <h4 className="font-bold text-brand-deep">Thành tích/giấy xác nhận liên quan</h4>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Tài li!u ược xem ngay trong card, không cần mx chi tiết Ồ kiỒm tra nhanh.
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
                          <option value="review">Theo mức cần kiỒm tra</option>
                        </select>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {sortedItems.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-[#B8CEE8] bg-[#F6F9FC] px-3 py-3 text-sm text-muted-foreground">
                            Bạn chưa có thành tích hoặc giấy xác nhận cho tiêu chí này.
                            {canEditApplication && !isLockedForSupplement ? (
                            <div className="mt-2">
                              <Button
                                data-add-evidence={criterion.key}
                                size="sm"
                                variant="secondary"
                                disabled={!canEditApplication || isLockedForSupplement || createEvidence.isPending || uploadAndIndex.isPending}
                                onClick={() => openEvidenceForm(criterion.key, getDefaultEvidenceName(criterion.key))}
                              >
                                <Upload className="h-4 w-4" /> Thêm thành tích
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
                              onViewDetails={setSelectedEvidence}
                              onDelete={(target) => {
                                if (isLockedForSupplement) {
                                  toast.error("Tiêu chí này không được mở bổ sung trong đợt này.");
                                  return;
                                }
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
                          <div className="mt-1 text-lg font-bold text-brand-deep">{score || readinessScore}% sẵn sàng</div>
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
                      <Button onClick={() => setActiveCriterion(nextCriterion.key)}>
                        Sang tiêu chí tiếp theo
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
                    {precheck ? `Sẵn sàng ${precheck.readinessScore}%` : "Đang chờ dữ liệu hồ sơ"}
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
                  return (
                    <div key={criterion.key} className="rounded-lg border border-[#E3ECF6] p-3">
                      <div className="text-sm font-bold text-brand-deep">{criterion.label}</div>
                      <div className="mt-2 text-2xl font-bold text-brand-deep">
                        {typeof result?.score === "number" ? `${result.score}%` : "--"}
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
                  Hệ thống sẽ tự cập nhật sau khi bạn nhập dữ liệu hoặc thêm thành tích. Bạn cũng có thể bấm Kiểm tra lại.
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
                              {item.severity === "error" ? "Bắt buộc" : item.severity === "warning" ? "Nên bổ sung" : "Cần xác nhận"}
                            </Chip>
                          </div>
                          <div className="mt-1 text-xs text-amber-800">{criterionLabel}</div>
                          {canEditApplication ? (
                          <Button
                            className="mt-3"
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setEvidenceForm({
                                criterion,
                                evidenceName: `${criterionLabel} - thành tích bổ sung`,
                                file: null,
                              })
                            }
                          >
                            <Upload className="h-4 w-4" /> Thêm thành tích
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
                {isSupplementMode ? "Gửi lại hồ sơ bổ sung" : "Nộp hồ sơ"}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {isSupplementMode
                  ? "Hồ sơ sẽ được gửi lại để cán bộ tiếp tục kiểm tra."
                  : "Hồ sơ sẽ được gửi để cán bộ xét duyệt theo từng tiêu chí."}
              </p>
              {canEditApplication ? (
              <Button className="mt-5 w-full" disabled={!canSubmitApplication || submitApplication.isPending} onClick={submitNow}>
                {submitApplication.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isSupplementMode ? "Gửi lại hồ sơ bổ sung" : "Nộp hồ sơ"}
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
                <h3 className="text-xl font-bold text-brand-deep">{statusLabel[application.status]}</h3>
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

      {evidenceForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="shrink-0 border-b border-[#E3ECF6] px-5 py-4">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Thêm thành tích
              </div>
              <h3 className="mt-1 text-xl font-bold text-brand-deep">
                {criteria.find((item) => item.key === evidenceForm.criterion)?.label ?? evidenceForm.criterion}
              </h3>
            </div>

            <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-5">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Tên thành tích/giấy xác nhận</label>
                <input
                  className="mt-1 w-full rounded-lg border border-[#DCE7F2] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0057C2]/20"
                  value={evidenceForm.evidenceName}
                  onChange={(event) =>
                    setEvidenceForm((current) =>
                      current ? { ...current, evidenceName: event.target.value } : current,
                    )
                  }
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">T!p ính kèm</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="mt-1 block w-full rounded-lg border border-dashed border-[#B8CEE8] bg-[#F6F9FC] px-3 py-3 text-sm"
                  onChange={(event) =>
                    setEvidenceForm((current) =>
                      current ? { ...current, file: event.target.files?.[0] ?? null } : current,
                    )
                  }
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  H trợ PDF, PNG, JPG, JPEG, WEBP. Nếu chưa có t!p, bạn vẫn có thỒ lưu thành tích trư:c.
                </p>
              </div>

              {evidenceForm.file && (
                <div className="rounded-lg bg-[#F1F7FD] px-3 py-2 text-sm text-brand-deep">
                  Đã chọn: <b>{evidenceForm.file.name}</b>
                </div>
              )}
            </div>

            <div className="shrink-0 flex justify-end gap-2 border-t border-[#E3ECF6] px-5 py-4">
              <Button
                variant="ghost"
                onClick={() => setEvidenceForm(null)}
                disabled={createEvidence.isPending || uploadAndIndex.isPending}
              >
                Hủy
              </Button>
              <Button
                onClick={submitEvidenceForm}
                disabled={!canEditApplication || createEvidence.isPending || uploadAndIndex.isPending}
              >
                {createEvidence.isPending || uploadAndIndex.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Lưu thành tích
              </Button>
            </div>
          </div>
        </div>
      )}

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
      label: "Có thành tích hoặc giấy xác nhận liên quan",
      state: evidenceCount > 0 ? "completed" : "missing",
      source: evidenceCount > 0 ? String(evidenceCount) + " thành tích" : "Chưa có thành tích",
    },
    {
      label: "Đủ dữ liệu để kiểm tra",
      state: result ? (warnings.length > 0 ? "warning" : "completed") : "missing",
      source: result ? "Kết quả kiểm tra mới nhất" : "Đang chờ dữ liệu",
    },
    ...reasons.slice(0, 3).map((reason) => ({
      label: getUserFacingText(reason),
      state: "missing",
      source: "Kiểm tra hồ sơ",
    })),
    ...warnings.slice(0, 3).map((warning) => ({
      label: getUserFacingText(warning),
      state: "warning",
      source: "Cần kiểm tra thêm",
    })),
  ];

  return (
    <div className="mt-4 rounded-lg bg-[#F8FBFE] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold text-brand-deep">Checklist tiêu chí</div>
        <Chip tone={status.tone}>{status.label}</Chip>
      </div>
      <div className="mt-3 grid gap-2">
        {checklist.map((item, index) => (
          <div key={item.label + "-" + index} className="flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm">
            <div>
              <div className="font-semibold text-brand-deep">{item.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{item.source}</div>
            </div>
            <Chip tone={item.state === "completed" ? "success" : item.state === "warning" ? "warning" : "muted"}>
              {item.state === "completed" ? "Đã có" : item.state === "warning" ? "Cần xác nhận" : "Thiếu"}
            </Chip>
          </div>
        ))}
      </div>
    </div>
  );
}

function getCriterionStatus(evidenceCount: number, result?: PrecheckCriterionResult) {
  if (!evidenceCount && !result) return { label: "Chưa có dữ liệu", tone: "muted" as const };
  if (!evidenceCount) return { label: "Cần bổ sung", tone: "warning" as const };
  if (result?.warnings?.length) return { label: "Cần cán bộ xác nhận", tone: "warning" as const };
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
  return names[criterion] ?? "Thành tích mới";
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
    if (value < 0) return "GPA không ược nhỏ hơn 0.";
    if (gpaScale === 10 && value > 10) return "GPA không ược vượt quá 10.0.";
    if (value > 4) return "GPA không ược vượt quá 4.0.";
  }

  if (metricType === "conduct_score" && (value < 0 || value > 100)) {
    return "ĐiỒm rèn luy!n phải nằm trong khoảng 0-100.";
  }

  if (metricType === "volunteer_days" && value < 0) {
    return "S ngày tình nguy!n không ược nhỏ hơn 0.";
  }

  if (metricType === "physical_score" && (value < 0 || value > 10)) {
    return "ĐiỒm thỒ lực phải nằm trong khoảng 0-10.";
  }

  if (metricType === "foreign_language_score" && value < 0) {
    return "ĐiỒm ngoại ngữ không ược nhỏ hơn 0.";
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
  if (!value) return "Chưa cht";
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
