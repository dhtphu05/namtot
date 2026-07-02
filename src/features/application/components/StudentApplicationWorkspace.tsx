import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { useCreateEvidence, useEvidences, useUploadAndIndex } from "@/features/evidence/hooks/useEvidence";
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
  finalLevel?: string | null;
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
  resolution_needed: "Cần xử lý hội đồng",
  completed: "Hoàn tất",
  rejected: "Không đạt",
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
  { key: "central", label: "Cấp Trung ương", desc: "Mức cao nhất, cần hồ sơ mạnh ở hầu hết tiêu chí." },
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

const criterionForMetric: Partial<Record<MetricType, Criterion>> = {
  conduct_score: "ethics",
  gpa: "academic",
  physical_score: "physical",
  volunteer_days: "volunteer",
  foreign_language_score: "integration",
};

export function StudentApplicationWorkspace({ initialTab = "info" }: { initialTab?: WorkspaceTab }) {
  const user = useAuth((s) => s.user);
  const [tab, setTab] = useState<WorkspaceTab>(initialTab);
  const [metricValues, setMetricValues] = useState<Record<MetricType, string>>({
    gpa: "",
    conduct_score: "",
    physical_score: "",
    volunteer_days: "",
    foreign_language_score: "",
  });
  const [evidenceForm, setEvidenceForm] = useState<EvidenceUploadForm | null>(null);

  const current = useCurrentApplication(SCHOOL_YEAR);
  const startApplication = useStartApplication();
  const updateTargetLevel = useUpdateTargetLevel();
  const upsertMetric = useUpsertMetric();
  const createEvidence = useCreateEvidence();
  const uploadAndIndex = useUploadAndIndex();
  const runPrecheck = usePrecheck();
  const submitApplication = useSubmitApplication();

  const application = current.data?.application as ApplicationWithDetails | null | undefined;
  const appId = application?.id;
  const evidencesQuery = useEvidences(appId, { limit: 100 });
  const latestPrecheck = useLatestPrecheck(appId);

  const evidences = normalizeEvidences(evidencesQuery.data);
  const precheck = latestPrecheck.data ?? null;
  const firstName = user?.fullName?.trim().split(/\s+/).slice(-1)[0] ?? "bạn";

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
      </>
    );
  }

  const readinessScore = precheck?.readinessScore ?? application.readinessScore ?? 0;
  const metrics = application.metrics ?? [];
  const canEditApplication = ["draft", "prechecked", "ready_to_submit", "supplement_required"].includes(
    application.status,
  );

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
          const criterion = criterionForMetric[metricType];
          if (criterion && !evidences.some((item) => item.criterion === criterion)) {
            createEvidence.mutate({
              applicationId: application.id,
              data: {
                criterion,
                evidenceName: `Minh chứng ${criteria.find((item) => item.key === criterion)?.label ?? criterion}`,
                sourceType: "manual_upload",
              },
            });
          }
        },
      },
    );
  };

  const addEvidenceForCriterion = (criterion: Criterion) => {
    if (!canEditApplication) {
      toast.error("Hồ sơ đã khóa, không thể thêm minh chứng.");
      return;
    }

    createEvidence.mutate({
      applicationId: application.id,
      data: {
        criterion,
        evidenceName: `Minh chứng ${criteria.find((item) => item.key === criterion)?.label ?? criterion}`,
        sourceType: "manual_upload",
      },
    });
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
    submitApplication.mutate(
      {
        id: application.id,
        allowSubmitWithWarnings: true,
        studentNote: precheck?.nextBestAction,
      },
      { onSuccess: () => setTab("tracking") },
    );
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
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone="brand">
                  <FileText className="h-3 w-3" /> Hồ sơ {application.schoolYear}
                </Chip>
                <Chip tone={application.status === "completed" ? "success" : "warning"}>
                  {statusLabel[application.status]}
                </Chip>
              </div>
              <h2 className="mt-3 text-2xl font-bold text-brand-deep">
                {user?.fullName ?? "Sinh viên"} - {user?.studentCode ?? "chưa có MSSV"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {user?.faculty ?? "Chưa có khoa"} • {user?.className ?? "Chưa có lớp"} • Aim{" "}
                {levelLabel[application.targetLevel]}
              </p>
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
                  </div>
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {items.length === 0 ? (
                      <div className="rounded-lg bg-[#F6F9FC] px-3 py-3 text-sm text-muted-foreground">
                        Chưa có minh chứng nào thuộc tiêu chí này.
                      </div>
                    ) : (
                      items.map((item) => (
                        <div key={item.id} className="rounded-lg bg-[#F6F9FC] px-3 py-3">
                          <div className="text-sm font-semibold text-brand-deep">{item.evidenceName}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {item.sourceType} • {item.status} • {item.indexingStatus}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
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
                    {precheck?.nextBestAction ??
                      "Bấm chạy tiền kiểm để backend đánh giá hồ sơ hiện tại theo dữ liệu của account này."}
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
            </Card>

            <Card>
              <h3 className="font-bold text-brand-deep">Nộp hồ sơ</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Hồ sơ sẽ được khóa và tạo review task cho cán bộ theo từng tiêu chí.
              </p>
              <Button className="mt-5 w-full" disabled={submitApplication.isPending} onClick={submitNow}>
                {submitApplication.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Nộp hồ sơ
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
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <InfoBlock label="Final status" value={application.finalStatus ?? "pending"} />
                  <InfoBlock label="Final level" value={application.finalLevel ?? "--"} />
                  <InfoBlock label="Submitted at" value={formatDate(application.submittedAt)} />
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

function normalizeEvidences(value: unknown): EvidenceResponse[] {
  if (Array.isArray(value)) return value as EvidenceResponse[];
  if (value && typeof value === "object" && Array.isArray((value as { evidences?: unknown }).evidences)) {
    return (value as { evidences: EvidenceResponse[] }).evidences;
  }
  return [];
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
