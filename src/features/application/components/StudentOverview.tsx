import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  Bot,
  CheckCircle2,
  CircleAlert,
  FileText,
  Loader2,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { motion } from "framer-motion";
import { TopBar } from "@/components/layout/TopBar";
import { Button, Card, Chip, Progress } from "@/components/ui-kit";
import { useAuth } from "@/features/auth/store/auth-store";
import {
  useCurrentApplication,
  useLatestPrecheck,
  useStartApplication,
} from "@/features/application/hooks/useApplication";
import { StudentFlowStepper } from "@/features/application/components/StudentFlowStepper";
import type {
  ApplicationState,
  ApplicationStatus,
  Criterion,
  Level,
  PrecheckCriterionResult,
  PrecheckMissingItem,
} from "@/lib/api/types";
import { finalStatusTone, getFinalStatusLabel } from "@/lib/status-labels";
import { getPrecheckMissingMessage, getUserFacingText } from "@/lib/user-facing-messages";

const SCHOOL_YEAR = "2025-2026";

const statusLabel: Record<ApplicationStatus | "not_started", string> = {
  not_started: "Chưa có hồ sơ",
  draft: "Đang hoàn thiện bản nháp",
  prechecked: "Đã tiền kiểm",
  ready_to_submit: "Sẵn sàng nộp",
  submitted: "Đã nộp",
  under_review: "Đang xét duyệt",
  supplement_required: "Cần bổ sung",
  resolution_needed: "Cần hội đồng xử lý",
  completed: "Hoàn tất",
  rejected: "Chưa đạt",
};

const statusCta: Record<ApplicationStatus | "not_started", string> = {
  not_started: "Bắt đầu tạo hồ sơ",
  draft: "Tiếp tục hoàn thiện",
  prechecked: "Xem tiền kiểm",
  ready_to_submit: "Nộp hồ sơ",
  submitted: "Theo dõi xét duyệt",
  under_review: "Theo dõi xét duyệt",
  supplement_required: "Bổ sung hồ sơ",
  resolution_needed: "Theo dõi xử lý",
  completed: "Xem kết quả",
  rejected: "Xem kết quả",
};

const levelLabel: Record<Level, string> = {
  school: "Cấp Trường",
  university: "Cấp ĐHĐN",
  city: "Cấp Thành phố",
  central: "Cấp Trung ương",
};

const criteria: Array<{ key: Criterion; label: string; color: string }> = [
  { key: "ethics", label: "Đạo đức tốt", color: "#EF4444" },
  { key: "academic", label: "Học tập tốt", color: "#0EA5E9" },
  { key: "physical", label: "Thể lực tốt", color: "#22C55E" },
  { key: "volunteer", label: "Tình nguyện tốt", color: "#F59E0B" },
  { key: "integration", label: "Hội nhập tốt", color: "#0057C2" },
];

type ApplicationWithSummary = ApplicationState & {
  updatedAt?: string;
  finalStatus?: string | null;
  finalLevel?: Level | null;
  finalNote?: string | null;
  finalizedAt?: string | null;
  finalizedBy?: {
    id: string;
    fullName: string;
  } | null;
  metrics?: unknown[];
  summary?: {
    totalEvidences?: number;
    evidenceByCriterion?: Partial<Record<Criterion, number>>;
    metricsCompletion?: { completed?: number; required?: number };
  };
  latestPrecheckResult?: {
    readinessScore?: number;
    criteriaResults?: PrecheckCriterionResult[];
    missingItems?: PrecheckMissingItem[];
    nextBestAction?: string;
  } | null;
};

export function StudentOverview() {
  const user = useAuth((s) => s.user);
  const { data, isLoading, isError } = useCurrentApplication(SCHOOL_YEAR);
  const apiUnavailable = isError;
  const application = (data?.application ??
    (apiUnavailable ? buildDemoApplication(user?.id) : null)) as ApplicationWithSummary | null | undefined;
  const appId = apiUnavailable ? undefined : application?.id;
  const latestPrecheck = useLatestPrecheck(appId);
  const startMutation = useStartApplication();

  const firstName = user?.fullName?.trim().split(/\s+/).slice(-1)[0] ?? "bạn";

  if (isLoading) {
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
          title={`Xin chào, ${firstName}`}
          subtitle="Tài khoản này chưa có hồ sơ Sinh viên 5 tốt cho năm học hiện tại."
        />
        <Card className="overflow-hidden !p-0">
          <div className="bg-[#0057C2] p-7 text-white">
            <Chip tone="brand">
              <FileText className="h-3 w-3" /> Hồ sơ mới
            </Chip>
            <h2 className="mt-4 text-2xl font-bold md:text-3xl">
              Chưa có hồ sơ Sinh viên 5 tốt năm học {SCHOOL_YEAR}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/85">
              Đây là trạng thái đúng cho sinh viên mới. Hãy tạo hồ sơ rồi nhập chỉ số, tải minh chứng,
              chạy tiền kiểm và nộp xét duyệt.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                className="bg-white !text-[#0057C2] hover:bg-[#F1F7FD]"
                disabled={startMutation.isPending}
                onClick={() => startMutation.mutate({ schoolYear: SCHOOL_YEAR, targetLevel: "school" })}
              >
                {startMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Bắt đầu tạo hồ sơ
              </Button>
              <Link to="/app/drafts">
                <Button variant="ghost" className="!text-white hover:!bg-white/10">
                  Mở trang hồ sơ
                </Button>
              </Link>
            </div>
          </div>
        </Card>
        <div className="mt-5">
          <StudentFlowStepper
            state={{
              applicationExists: false,
              applicationStatus: "not_started",
              evidenceCount: 0,
              latestPrecheck: null,
            }}
            busy={startMutation.isPending}
            onCreate={() => startMutation.mutate({ schoolYear: SCHOOL_YEAR, targetLevel: "school" })}
          />
        </div>
      </>
    );
  }

  const precheck = latestPrecheck.data ?? application.latestPrecheckResult ?? null;
  const readinessScore = precheck?.readinessScore ?? application.readinessScore ?? 0;
  const status = application.status;
  const metricsCompleted = application.summary?.metricsCompletion?.completed ?? application.metrics?.length ?? 0;
  const metricsRequired = application.summary?.metricsCompletion?.required ?? 5;
  const evidenceByCriterion = application.summary?.evidenceByCriterion ?? {};
  const evidenceCount = application.summary?.totalEvidences ?? Object.values(evidenceByCriterion).reduce((sum, count) => sum + (count ?? 0), 0);
  const nextActions = buildNextActions(application, precheck?.criteriaResults, precheck?.missingItems);
  const updatedAt = formatDateTime(application.lastUpdatedAt ?? application.updatedAt);
  const primaryActionPath = getPrimaryActionPath(status);
  const finalStatus = application.finalStatus ?? "pending";
  const hasFinalResult = finalStatus !== "pending" && Boolean(application.finalizedAt);

  return (
    <>
      <TopBar
        title={`Xin chào, ${firstName}`}
        subtitle="Dữ liệu bên dưới được tải theo tài khoản đang đăng nhập."
      />

      <Card className="mb-5 overflow-hidden !p-0">
        <div className="bg-[#0057C2] p-6 text-white md:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="brand">
              <FileText className="h-3 w-3" /> Hồ sơ của tôi
            </Chip>
            <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold">
              {statusLabel[status]}
            </span>
            {apiUnavailable && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-900">
                Dữ liệu tạm thời
              </span>
            )}
          </div>
          <div className="mt-4 grid gap-5 lg:grid-cols-3 lg:items-end">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold leading-tight md:text-3xl">
                Hồ sơ Sinh viên 5 tốt năm học {application.schoolYear}
              </h2>
              <div className="mt-3 grid gap-2 text-sm text-white/85 sm:grid-cols-2">
                <div>
                  Trạng thái hiện tại: <b className="text-white">{statusLabel[status]}</b>
                </div>
                <div>
                  Cấp aim: <b className="text-white">{levelLabel[application.targetLevel]}</b>
                </div>
                <div>
                  Cập nhật lần cuối: <b className="text-white">{updatedAt}</b>
                </div>
                <div>
                  Tiến độ: <b className="text-white">{readinessScore}%</b>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-white/15 p-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span>Hoàn thiện hồ sơ</span>
                <b>{readinessScore}%</b>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/20">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${readinessScore}%` }}
                  transition={{ duration: 0.7 }}
                  className="h-full rounded-full bg-white"
                />
              </div>
              <Link to={primaryActionPath} className="mt-4 block">
                <Button className="w-full bg-white !text-[#0057C2] hover:bg-[#F1F7FD]">
                  {statusCta[status]} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      <SchoolDemoAssistant applicationId={application.id} />

      {hasFinalResult || application.finalNote ? (
        <div className="mb-5 rounded-xl border border-[#E3ECF6] bg-white/85 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Kết quả cuối</span>
                <Chip tone={getFinalTone(finalStatus)}>{getFinalStatusLabel(finalStatus)}</Chip>
                {application.finalLevel ? <Chip tone="brand">{levelLabel[application.finalLevel]}</Chip> : null}
              </div>
              {application.finalNote ? (
                <p className="mt-1 max-w-3xl text-sm text-slate-700">{application.finalNote}</p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Kết quả đã được hội đồng xác nhận và ghi nhận trong hệ thống.</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>Chốt: {formatFinalDate(application.finalizedAt)}</span>
              <span>Người chốt: {application.finalizedBy?.fullName ?? "--"}</span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-5">
        <StudentFlowStepper
          state={{
            applicationExists: true,
            applicationStatus: status,
            evidenceCount,
            latestPrecheck: precheck,
          }}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <h3 className="flex items-center gap-2 font-bold text-brand-deep">
            <CircleAlert className="h-4 w-4" /> Việc cần làm tiếp theo
          </h3>
          <div className="mt-3 space-y-2">
            {nextActions.map((item) => (
              <Link
                key={item}
                to={primaryActionPath}
                className="flex gap-3 rounded-lg bg-[#F6F9FC] px-3 py-3 text-sm hover:bg-[#EEF9FF]"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0057C2]" />
                <span className="text-muted-foreground">{item}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="font-bold text-brand-deep">Tiến độ 5 tiêu chí</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {criteria.map((criterion) => {
              const result = precheck?.criteriaResults?.find((item) => item.criterion === criterion.key);
              const progress = typeof result?.score === "number" ? result.score : 0;
              const evidenceCount = evidenceByCriterion[criterion.key] ?? 0;
              const needsWork = progress < 60 || evidenceCount === 0;
              return (
                <Link
                  key={criterion.key}
                  to="/app/drafts"
                  className="rounded-lg border border-[#E3ECF6] p-3 hover:bg-[#F6F9FC]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="h-8 w-8 rounded-lg" style={{ background: criterion.color }} />
                    <Chip tone={needsWork ? "warning" : "success"}>
                      {needsWork ? "Cần bổ sung" : "Tạm ổn"}
                    </Chip>
                  </div>
                  <div className="mt-3 text-sm font-bold text-brand-deep">{criterion.label}</div>
                  <div className="mt-1 min-h-8 text-xs text-muted-foreground">
                    {getUserFacingText(result?.explanation, "Chưa có dữ liệu tiền kiểm.")}
                  </div>
                  <div className="mt-3">
                    <Progress value={progress} tint={criterion.color} />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">{evidenceCount} minh chứng</div>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <h3 className="flex items-center gap-2 font-bold text-brand-deep">
          <Bell className="h-4 w-4" /> Tóm tắt dữ liệu thật
        </h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-[#F6F9FC] px-3 py-3">
            <div className="text-sm font-semibold text-brand-deep">Chỉ số đã nhập</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {metricsCompleted}/{metricsRequired} chỉ số bắt buộc
            </div>
          </div>
          <div className="rounded-lg bg-[#F6F9FC] px-3 py-3">
            <div className="text-sm font-semibold text-brand-deep">Minh chứng</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {application.summary?.totalEvidences ?? 0} minh chứng thuộc hồ sơ này
            </div>
          </div>
          <div className="rounded-lg bg-[#F6F9FC] px-3 py-3">
            <div className="text-sm font-semibold text-brand-deep">Tiền kiểm</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {getUserFacingText(precheck?.nextBestAction, "Chưa chạy tiền kiểm cho hồ sơ này.")}
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}

function SchoolDemoAssistant({ applicationId }: { applicationId?: string }) {
  return (
    <section className="mb-5 rounded-xl border border-[#DDEAF7] bg-white px-4 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF4FF] text-[#0057C2]">
              <Bot className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-brand-deep">Trợ lý hồ sơ cấp Trường</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                Hồ sơ của bạn còn 2 việc cần xử lý: bổ sung minh chứng Thể lực tốt và kiểm tra thêm minh chứng Tình nguyện tốt.
              </p>
            </div>
          </div>
        </div>
        <div className="flex max-w-full flex-wrap gap-2">
          <Link to="/app/chatbot" search={{ context: "dashboard", targetLevel: "school", applicationId } as never}>
            <Button variant="secondary" className="rounded-lg">
              <Bot className="h-4 w-4" />
              Hỏi AI
            </Button>
          </Link>
          <Link to="/app/event-library" search={{ criterion: "volunteer" } as never}>
            <Button variant="secondary" className="rounded-lg">
              <Search className="h-4 w-4" />
              Tìm minh chứng
            </Button>
          </Link>
          <Link to="/app/evidence" search={{ criterion: "physical", action: "upload" } as never}>
            <Button className="rounded-lg">
              <Upload className="h-4 w-4" />
              Upload thể lực
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function buildDemoApplication(userId?: string): ApplicationWithSummary {
  const now = new Date().toISOString();
  return {
    id: "demo-app-2025-2026",
    studentId: userId ?? "demo-student",
    schoolYear: SCHOOL_YEAR,
    applicationType: "individual",
    targetLevel: "city",
    status: "draft",
    finalStatus: "pending",
    readinessScore: 68,
    currentDraftVersion: 1,
    submittedAt: null,
    createdAt: now,
    updatedAt: now,
    lastUpdatedAt: now,
    metrics: [],
    summary: {
      totalEvidences: 5,
      evidenceByCriterion: {
        ethics: 1,
        academic: 1,
        physical: 1,
        volunteer: 1,
        integration: 1,
      },
      metricsCompletion: {
        completed: 3,
        required: 5,
      },
    },
    latestPrecheckResult: {
      readinessScore: 68,
      nextBestAction: "Kiem tra backend API de tai du lieu that.",
      missingItems: [
        { criterion: "volunteer", message: "Bo sung them minh chung tinh nguyen." },
        { criterion: "integration", message: "Xac minh chung chi hoi nhap." },
      ],
      criteriaResults: [
        { criterion: "ethics", status: "passed", score: 80, explanation: "Dat co ban." },
        { criterion: "academic", status: "passed", score: 75, explanation: "Can xac minh bang diem." },
        { criterion: "physical", status: "passed", score: 70, explanation: "Da co minh chung." },
        { criterion: "volunteer", status: "pending", score: 55, explanation: "Can bo sung." },
        { criterion: "integration", status: "pending", score: 60, explanation: "Cho xac minh." },
      ],
    },
  };
}

function buildNextActions(
  application: ApplicationWithSummary,
  criteriaResults?: PrecheckCriterionResult[],
  missingItems?: PrecheckMissingItem[],
) {
  if (application.status === "completed") {
    return ["Hồ sơ đã hoàn tất. Bạn có thể xem kết quả xét duyệt."];
  }

  if (!criteriaResults?.length) {
    return [
      "Nhập đủ các chỉ số cơ bản trong Hồ sơ của tôi.",
      "Tải minh chứng cho 5 tiêu chí.",
      "Chạy tiền kiểm trước khi nộp hồ sơ.",
    ];
  }

  const fromMissing = missingItems
    ?.map((item) => getPrecheckMissingMessage(item).description)
    .filter((item): item is string => Boolean(item))
    .slice(0, 3);

  if (fromMissing?.length) {
    return fromMissing;
  }

  if (application.status === "draft" || application.status === "prechecked") {
    return ["Hồ sơ đã có dữ liệu cơ bản. Kiểm tra lại minh chứng rồi nộp xét duyệt."];
  }

  return ["Theo dõi trạng thái xét duyệt và phản hồi yêu cầu bổ sung nếu có."];
}

function getPrimaryActionPath(status: ApplicationStatus) {
  if (status === "submitted" || status === "under_review" || status === "resolution_needed") return "/app/cascade";
  if (status === "completed" || status === "rejected") return "/app/cascade";
  if (status === "supplement_required") return "/app/evidence";
  return "/app/drafts";
}

function ResultMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#E3ECF6] px-3 py-2">
      <div className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold text-brand-deep">{value}</div>
    </div>
  );
}

function getFinalTone(status?: string | null) {
  return finalStatusTone[status as keyof typeof finalStatusTone] ?? "warning";
}

function formatFinalDate(value?: string | null) {
  if (!value) return "Chưa chốt";
  return formatDateTime(value);
}

function formatDateTime(value?: string | null) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
