import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  CircleAlert,
  FileText,
  Loader2,
  Plus,
  Send,
  Sparkles,
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
import type {
  ApplicationMetric,
  ApplicationState,
  ApplicationStatus,
  Criterion,
  EvidenceResponse,
  Level,
  MetricType,
  PrecheckCriterionResult,
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

const SCHOOL_YEAR = "2025-2026";

const tabLabels: Record<WorkspaceTab, string> = {
  info: "Thông tin & cấp aim",
  criteria: "Tiêu chí & minh chứng",
  precheck: "Tiền kiểm trước khi nộp",
  tracking: "Theo dõi sau khi nộp",
};

const statusLabel: Record<ApplicationStatus | "not_started", string> = {
  not_started: "Chưa có hồ sơ",
  draft: "Bản nháp",
  prechecked: "Đã tiền kiểm",
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
  university: "Cấp ĐHĐN",
  city: "Cấp Thành phố",
  central: "Cấp Trung ương",
};

const levels: Array<{ key: Level; label: string; desc: string }> = [
  { key: "school", label: "Cấp Trường", desc: "Mức xét cơ bản cho hồ sơ đủ dữ liệu nền." },
  { key: "university", label: "Cấp ĐHĐN", desc: "Yêu cầu minh chứng rõ hơn và điểm học tập tốt." },
  { key: "city", label: "Cấp Thành phố", desc: "Yêu cầu hoạt động, tình nguyện và hội nhập nổi bật hơn." },
];

const criteria: Array<{ key: Criterion; label: string; color: string; requirement: string }> = [
  {
    key: "ethics",
    label: "Đạo đức tốt",
    color: "#EF4444",
    requirement: "Điểm rèn luyện đạt yêu cầu và cần cán bộ xác nhận không vi phạm kỷ luật.",
  },
  {
    key: "academic",
    label: "Học tập tốt",
    color: "#0EA5E9",
    requirement: "GPA đạt ngưỡng theo cấp aim và cần xác nhận không có học phần điểm F.",
  },
  {
    key: "physical",
    label: "Thể lực tốt",
    color: "#22C55E",
    requirement: "Có điểm thể lực hoặc minh chứng Sinh viên khỏe/thành tích thể thao hợp lệ.",
  },
  {
    key: "volunteer",
    label: "Tình nguyện tốt",
    color: "#F59E0B",
    requirement: "Có số ngày tình nguyện hoặc minh chứng/sự kiện tình nguyện hợp lệ.",
  },
  {
    key: "integration",
    label: "Hội nhập tốt",
    color: "#0057C2",
    requirement: "Có dữ liệu ngoại ngữ hoặc minh chứng hội nhập quốc tế/phù hợp.",
  },
];

const metricInputs: Array<{
  key: MetricType;
  label: string;
  placeholder: string;
  scale?: number;
}> = [
  { key: "gpa", label: "GPA", placeholder: "Ví dụ 3.4", scale: 4 },
  { key: "conduct_score", label: "Điểm rèn luyện", placeholder: "Ví dụ 90" },
  { key: "physical_score", label: "Điểm thể lực", placeholder: "Ví dụ 8" },
  { key: "volunteer_days", label: "Ngày tình nguyện", placeholder: "Ví dụ 5" },
  { key: "foreign_language_score", label: "Điểm ngoại ngữ", placeholder: "Ví dụ 650" },
];

export function StudentApplicationWorkspace({ initialTab = "info" }: { initialTab?: WorkspaceTab }) {
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>(initialTab);
  const [metricValues, setMetricValues] = useState<Record<MetricType, string>>({
    gpa: "",
    conduct_score: "",
    physical_score: "",
    volunteer_days: "",
    foreign_language_score: "",
  });
  const [evidenceForm, setEvidenceForm] = useState<EvidenceUploadForm | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceResponse | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

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
  const precheck = latestPrecheck.data ?? null;
  const avatarSrc = useResolvedAvatarUrl(user?.avatarUrl);
  const nextBestAction = getUserFacingText(
    precheck?.nextBestAction,
    "Bấm chạy tiền kiểm để backend đánh giá hồ sơ hiện tại theo dữ liệu của account này.",
  );
  const firstName = user?.fullName?.trim().split(/\s+/).slice(-1)[0] ?? "bạn";

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
              "Cán bộ yêu cầu bổ sung minh chứng cho tiêu chí này.",
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
          subtitle="Backend chưa trả được dữ liệu hồ sơ cho tài khoản hiện tại."
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
            Đây là trạng thái đúng cho account mới. Bấm tạo hồ sơ để bắt đầu nhập dữ liệu thật.
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
  const metrics = application.metrics ?? [];
  const canEditApplication = ["draft", "prechecked", "ready_to_submit", "supplement_required"].includes(
    application.status,
  );
  const canSubmitApplication = !["submitted", "under_review", "completed", "rejected", "resolution_needed"].includes(
    application.status,
  );
  const isSupplementMode = application.status === "supplement_required";

  const saveMetric = (metricType: MetricType, scale?: number) => {
    if (!canEditApplication) {
      toast.error("Hồ sơ đã khóa, không thể sửa chỉ số.");
      return;
    }

    const value = Number(metricValues[metricType]);
    if (!Number.isFinite(value)) {
      toast.error("Vui lòng nhập giá trị hợp lệ.");
      return;
    }

    upsertMetric.mutate(
      { id: application.id, metricType, value, scale },
      {
        onSuccess: () => {
          toast.success("Đã lưu chỉ số.");
        },
      },
    );
  };
  const precheckNow = () => {
    runPrecheck.mutate({ id: application.id, level: application.targetLevel });
    setTab("precheck");
  };

  const submitEvidenceForm = async () => {
    if (!evidenceForm) return;
    if (!canEditApplication) {
      toast.error("Hồ sơ đã khóa, không thể thêm minh chứng.");
      setEvidenceForm(null);
      return;
    }

    const evidenceName = evidenceForm.evidenceName.trim();
    if (evidenceName.length < 3) {
      toast.error("Vui lòng nhập tên minh chứng ít nhất 3 ký tự.");
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

      toast.success(evidenceForm.file ? "Đã tải lên minh chứng và bắt đầu AI indexing." : "Đã tạo minh chứng.");
      setEvidenceForm(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể thêm minh chứng.");
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
      setUser(response.data);
      toast.success("Đã cập nhật ảnh hồ sơ.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật ảnh hồ sơ.");
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  return (
    <>
      <TopBar
        title="Hồ sơ của tôi"
        subtitle="Các tab bên dưới dùng dữ liệu backend theo account đang đăng nhập, không dùng dữ liệu demo."
      />

      <div className="pb-24">
        <Card className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 gap-4">
              <div className="h-20 w-20 flex-none overflow-hidden rounded-2xl border bg-slate-100">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={user?.fullName ?? "Ảnh hồ sơ"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-bold text-brand-deep">
                    {getInitials(user?.fullName)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="brand">
                    <FileText className="h-3 w-3" /> Hồ sơ {application.schoolYear}
                  </Chip>
                  <Chip tone={application.status === "completed" ? "success" : "warning"}>
                    {statusLabel[application.status]}
                  </Chip>
                  {!avatarSrc ? <Chip tone="muted">Chưa có ảnh hồ sơ</Chip> : null}
                </div>
                <h2 className="mt-3 break-words text-2xl font-bold text-brand-deep">
                  {user?.fullName ?? "Sinh viên"} - {user?.studentCode ?? "chưa có MSSV"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {user?.faculty ?? "Chưa có khoa"} • {user?.className ?? "Chưa có lớp"} • Aim{" "}
                  {levelLabel[application.targetLevel]}
                </p>
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
                  <span className="text-xs text-muted-foreground">JPG, PNG, WEBP tối đa 5MB.</span>
                </div>
              </div>
            </div>
            <div className="w-full max-w-xs">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tiến độ hồ sơ</span>
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
                  <CircleAlert className="h-3 w-3" /> Cần bổ sung
                </Chip>
                <h3 className="mt-3 text-lg font-bold text-amber-950">
                  Cán bộ đã gửi feedback, vui lòng bổ sung rồi gửi lại hồ sơ.
                </h3>
                <p className="mt-1 text-sm text-amber-900">
                  Sau khi gửi lại, hồ sơ sẽ chuyển về trạng thái đang xét duyệt và các tiêu chí được yêu cầu sẽ quay lại hàng chờ cán bộ.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                <Button variant="secondary" onClick={() => setTab("criteria")}>
                  <Upload className="h-4 w-4" /> Bổ sung minh chứng
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
                  Backend chưa trả về chi tiết tiêu chí cần bổ sung. Bạn vẫn có thể bổ sung minh chứng rồi gửi lại hồ sơ.
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
              latestPrecheck: precheck,
            }}
            busy={startApplication.isPending || runPrecheck.isPending || submitApplication.isPending}
            onUpload={() => setTab("criteria")}
            onPrecheck={precheckNow}
            onSubmit={submitNow}
            onTrack={() => setTab("tracking")}
          />
        </div>

        {!canEditApplication && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Hồ sơ đang ở trạng thái <b>{statusLabel[application.status]}</b>, nên backend không cho sửa
            chỉ số hoặc thêm minh chứng. Nếu muốn test lại flow thêm minh chứng, hãy dùng tài khoản/hồ sơ mới
            hoặc hồ sơ còn ở trạng thái bản nháp/cần bổ sung.
          </div>
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
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <h3 className="flex items-center gap-2 font-bold text-brand-deep">
                <Target className="h-4 w-4" /> Chọn cấp aim
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {levels.map((level) => {
                  const active = level.key === application.targetLevel;
                  return (
                    <button
                      key={level.key}
                      onClick={() => updateTargetLevel.mutate({ id: application.id, targetLevel: level.key })}
                      className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                        active ? "border-[#0057C2] bg-[#F1F7FD]" : "border-[#E3ECF6] hover:bg-[#F6F9FC]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-brand-deep">{level.label}</span>
                        {active && <Chip tone="brand">Đang aim</Chip>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{level.desc}</p>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card>
              <h3 className="font-bold text-brand-deep">Chỉ số cơ bản</h3>
              <div className="mt-3 space-y-3">
                {metricInputs.map((metric) => {
                  const saved = metrics.find((item) => item.metricType === metric.key);
                  return (
                    <div key={metric.key}>
                      <label className="text-xs font-semibold text-muted-foreground">{metric.label}</label>
                      <div className="mt-1 flex gap-2">
                        <input
                          className="min-w-0 flex-1 rounded-lg border border-[#DCE7F2] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0057C2]/20"
                          placeholder={saved ? String(saved.value) : metric.placeholder}
                          value={metricValues[metric.key]}
                          onChange={(event) =>
                            setMetricValues((prev) => ({ ...prev, [metric.key]: event.target.value }))
                          }
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!canEditApplication || upsertMetric.isPending}
                          onClick={() => saveMetric(metric.key, metric.scale)}
                        >
                          Lưu
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {tab === "criteria" && (
          <div className="space-y-3">
            {criteria.map((criterion) => {
              const items = evidenceByCriterion[criterion.key] ?? [];
              const result = precheck?.criteriaResults?.find((item) => item.criterion === criterion.key);
              const score = typeof result?.score === "number" ? result.score : 0;
              return (
                <Card key={criterion.key}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="h-8 w-8 rounded-lg" style={{ background: criterion.color }} />
                        <h3 className="font-bold text-brand-deep">{criterion.label}</h3>
                        <Chip tone={items.length > 0 ? "success" : "warning"}>
                          {items.length > 0 ? "Đã có minh chứng" : "Chưa có minh chứng"}
                        </Chip>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{criterion.requirement}</p>
                      <div className="mt-3">
                        <Progress value={score} tint={criterion.color} />
                      </div>
                    </div>
                    {items.length > 0 && (
                      <Button
                        variant="secondary"
                        disabled={!canEditApplication || createEvidence.isPending || uploadAndIndex.isPending}
                        onClick={() =>
                          setEvidenceForm({
                            criterion: criterion.key,
                            evidenceName: `Minh chứng ${criterion.label}`,
                            file: null,
                          })
                        }
                      >
                        <Upload className="h-4 w-4" /> Thêm minh chứng
                      </Button>
                    )}
                  </div>
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {items.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-[#B8CEE8] bg-[#F6F9FC] px-3 py-3 text-sm text-muted-foreground">
                        Bạn chưa có minh chứng cho tiêu chí này.
                        <div className="mt-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!canEditApplication || createEvidence.isPending || uploadAndIndex.isPending}
                            onClick={() =>
                              setEvidenceForm({
                                criterion: criterion.key,
                                evidenceName: `${criterion.label} - minh chứng mới`,
                                file: null,
                              })
                            }
                          >
                            <Upload className="h-4 w-4" /> Upload minh chứng
                          </Button>
                        </div>
                      </div>
                    ) : (
                      items.map((item) => (
                        <StudentEvidenceCard
                          key={item.id}
                          evidence={item}
                          applicationId={application.id}
                          canEdit={canEditApplication}
                          onViewDetails={setSelectedEvidence}
                          onDelete={(target) => deleteEvidence.mutate({ id: target.id, applicationId: application.id })}
                        />
                      ))
                    )}
                  </div>
                  <CriterionChecklist
                    criterion={criterion.key}
                    evidenceCount={items.length}
                    result={result}
                  />
                </Card>
              );
            })}
          </div>
        )}

        {tab === "precheck" && (
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Chip tone="brand">
                    <Sparkles className="h-3 w-3" /> Tiền kiểm backend
                  </Chip>
                  <h3 className="mt-3 text-2xl font-bold text-brand-deep">
                    {precheck ? `Sẵn sàng ${precheck.readinessScore}%` : "Chưa chạy tiền kiểm"}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {nextBestAction}
                  </p>
                </div>
                <Button onClick={precheckNow} disabled={runPrecheck.isPending}>
                  {runPrecheck.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Chạy tiền kiểm
                </Button>
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
                  Bạn chưa chạy tiền kiểm. Hãy upload minh chứng rồi chạy tiền kiểm để biết hồ sơ còn thiếu gì.
                </div>
              )}
              {precheck?.missingItems?.length ? (
                <div className="mt-5">
                  <h4 className="font-bold text-brand-deep">Việc cần xử lý</h4>
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
                          <Button
                            className="mt-3"
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setEvidenceForm({
                                criterion,
                                evidenceName: `${criterionLabel} - minh chứng bổ sung`,
                                file: null,
                              })
                            }
                          >
                            <Upload className="h-4 w-4" /> Upload minh chứng
                          </Button>
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
                  ? "Hồ sơ sẽ được khóa lại và chuyển các tiêu chí cần bổ sung về hàng chờ cán bộ."
                  : "Hồ sơ sẽ được khóa và tạo review task cho cán bộ theo từng tiêu chí."}
              </p>
              <Button className="mt-5 w-full" disabled={!canSubmitApplication || submitApplication.isPending} onClick={submitNow}>
                {submitApplication.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isSupplementMode ? "Gửi lại hồ sơ bổ sung" : "Nộp hồ sơ"}
              </Button>
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
                  Trạng thái này được đọc từ backend. Sinh viên không thấy danh sách task nội bộ của cán bộ,
                  chỉ theo dõi trạng thái hồ sơ và phản hồi yêu cầu bổ sung nếu có.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
            <div className="border-b border-[#E3ECF6] px-5 py-4">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Thêm minh chứng
              </div>
              <h3 className="mt-1 text-xl font-bold text-brand-deep">
                {criteria.find((item) => item.key === evidenceForm.criterion)?.label ?? evidenceForm.criterion}
              </h3>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Tên minh chứng</label>
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
                <label className="text-xs font-semibold text-muted-foreground">File minh chứng</label>
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
                  Hỗ trợ PDF, PNG, JPG, JPEG, WEBP. Nếu chưa có file, bạn vẫn có thể tạo minh chứng trước.
                </p>
              </div>

              {evidenceForm.file && (
                <div className="rounded-lg bg-[#F1F7FD] px-3 py-2 text-sm text-brand-deep">
                  Đã chọn: <b>{evidenceForm.file.name}</b>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-[#E3ECF6] px-5 py-4">
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
                Lưu minh chứng
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
      label: "Có minh chứng hoặc dữ liệu liên quan",
      state: evidenceCount > 0 ? "completed" : "missing",
      source: evidenceCount > 0 ? `${evidenceCount} minh chứng` : "Chưa có minh chứng",
    },
    {
      label: "AI/cán bộ có đủ dữ liệu để kiểm tra",
      state: result ? (warnings.length > 0 ? "warning" : "completed") : "missing",
      source: result ? "Kết quả tiền kiểm mới nhất" : "Chưa chạy tiền kiểm",
    },
    ...reasons.slice(0, 3).map((reason) => ({
      label: getUserFacingText(reason),
      state: "missing",
      source: "Tiền kiểm",
    })),
    ...warnings.slice(0, 3).map((warning) => ({
      label: getUserFacingText(warning),
      state: "warning",
      source: "AI cảnh báo",
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
          <div key={`${item.label}-${index}`} className="flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm">
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
  return { label: "Đã có minh chứng", tone: "brand" as const };
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
        if (!cancelled) setResolvedUrl(response.data.url);
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

