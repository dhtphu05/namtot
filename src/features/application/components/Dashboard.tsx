import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, StatCard, Chip, Button, Progress } from "@/components/ui-kit";
import { useApp } from "@/lib/store";
import { useAuth } from "@/features/auth/store/auth-store";
import { ENABLE_DEMO_ROLE_SWITCH, isUiRole, toUiRole } from "@/features/auth/role-map";
import {
  CRITERIA,
  STUDENTS,
  RESOLUTION_CASES,
  OFFICERS,
  CURRENT_PROFILE,
  CURRENT_STUDENT,
  CURRENT_COLLECTIVE,
  LEVELS,
  PROFILE_STATUS,
  STATUS,
  MEDIA,
  REVIEW_TASKS,
} from "@/lib/mock-data";
import {
  FileText,
  Sparkles,
  Inbox,
  TriangleAlert,
  Clock,
  UsersRound,
  FileCheck2,
  CircleAlert,
  Bot,
  Target,
  GitBranch,
  Upload,
  History,
  ScanText,
  PencilLine,
  Send,
  ChartNoAxesCombined,
  ShieldQuestion,
  ArrowRight,
  Play,
  Loader2,
  Bell,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import {
  useCurrentApplication,
  useStartApplication,
} from "@/features/application/hooks/useApplication";
import { useManagerDashboardSummary } from "@/features/manager/hooks/useManager";
import { levelLabel, applicationStatusLabel, type ApplicationStatus } from "@/lib/api/types";
import { StudentOverviewV2 } from "@/features/application/ui-v2";
import { useOfficerDashboard } from "@/features/review/hooks/useReview";
import {
  formatDateTime,
  getCriterionLabel,
  getLevelLabel,
  getReadabilityLabel,
  getTaskStatusLabel,
} from "@/features/review/utils/formatters";
import { getStatusTone } from "@/lib/status-labels";
import type { OfficerDashboardResponse } from "@/features/review/types";

export function Dashboard() {
  const user = useAuth((s) => s.user);
  const storedRole = useApp((s) => s.role);
  const role =
    ENABLE_DEMO_ROLE_SWITCH && isUiRole(storedRole)
      ? storedRole
      : user
        ? toUiRole(user.role)
        : "student";
  if (role === "student") return <StudentOverviewV2 />;
  if (role === "officer") return <OfficerDashReal />;
  if (role === "manager") return <ManagerDashReal />;
  return <CollectiveDash />;
}

// ============== STUDENT — single profile workspace ==============
const CTA_TARGET: Record<string, string> = {
  "not-started": "/app/drafts",
  drafting: "/app/drafts",
  prechecked: "/app/ai-precheck",
  ready: "/app/drafts",
  submitted: "/app/cascade",
  supplement: "/app/upload",
  reviewing: "/app/cascade",
  resolution: "/app/cascade",
  done: "/app/cascade",
};

function StudentDash() {
  const user = useAuth((s) => s.user);
  const nav = useNavigate();
  const { data: appRes, isLoading, isError, refetch } = useCurrentApplication();
  const startMutation = useStartApplication();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <TopBar title="Đang tải..." subtitle="Vui lòng chờ trong giây lát" />
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-slate-100 rounded-2xl w-full" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="text-red-500 font-semibold">Đã xảy ra lỗi khi tải hồ sơ từ máy chủ.</div>
        <Button onClick={() => refetch()}>Thử lại</Button>
      </div>
    );
  }

  const handleStart = () => {
    startMutation.mutate(
      {},
      {
        onSuccess: () => {
          toast.success("Khởi tạo hồ sơ thành công!");
          refetch().then(() => {
            nav({ to: "/app/wizard" });
          });
        },
      },
    );
  };

  if (!appRes || appRes.state === "not_started" || !appRes.application) {
    return (
      <>
        <TopBar
          title={`Xin chào, ${user?.fullName?.split(" ").slice(-1)[0] || "bạn"}`}
          subtitle="Hồ sơ Sinh viên 5 tốt năm học 2025–2026"
        />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0057C2] text-white rounded-2xl p-8 mb-7 relative overflow-hidden shadow-lg"
        >
          <div className="absolute inset-0 wave-bg opacity-30" />
          <img
            src={MEDIA.hero[0]}
            className="absolute inset-0 w-full h-full object-cover opacity-10"
            alt=""
          />
          <div className="relative flex flex-col justify-between items-start gap-6">
            <div>
              <h2 className="text-3xl font-extrabold leading-tight">
                Bắt đầu hồ sơ Sinh viên 5 tốt
              </h2>
              <p className="text-white/85 mt-2 max-w-xl text-sm leading-relaxed">
                Sinh viên chỉ cần tạo một hồ sơ duy nhất, chọn cấp aim mục tiêu mong muốn đạt được,
                sau đó tiến hành cập nhật thông tin và bổ sung minh chứng theo từng tiêu chí.
              </p>
            </div>
            <Button
              className="bg-white text-[#0057C2] hover:bg-slate-100 font-semibold"
              onClick={handleStart}
              disabled={startMutation.isPending}
            >
              {startMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang khởi tạo...
                </>
              ) : (
                <>
                  Bắt đầu hồ sơ <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </>
    );
  }

  const profile = appRes.application;

  const getCTAInfo = (status: ApplicationStatus) => {
    switch (status) {
      case "draft":
      case "prechecked":
      case "ready_to_submit":
        return { label: "Tiếp tục hoàn thiện", to: "/app/wizard" };
      case "under_review":
      case "submitted":
        return { label: "Xem minh chứng", to: "/app/evidence" };
      case "supplement_required":
        return { label: "Bổ sung minh chứng", to: "/app/evidence" };
      case "completed":
      case "rejected":
        return { label: "Xem kết quả/timeline", to: "/app/audit" };
      default:
        return { label: "Xem chi tiết", to: "/app" };
    }
  };

  const ctaInfo = getCTAInfo(profile.status);

  return (
    <>
      <TopBar
        title={`Xin chào, ${user?.fullName?.split(" ").slice(-1)[0] || "bạn"}`}
        subtitle={`Hồ sơ Sinh viên 5 tốt năm học ${profile.schoolYear}`}
      />

      {/* SINGLE PROFILE CARD */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0057C2] text-white rounded-2xl p-8 mb-7 relative overflow-hidden shadow-lg"
      >
        <div className="absolute inset-0 wave-bg opacity-30" />
        <img
          src={MEDIA.hero[0]}
          className="absolute inset-0 w-full h-full object-cover opacity-10"
          alt=""
        />
        <div className="relative grid md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 text-white">
            <div className="flex items-center gap-2 flex-wrap">
              <Chip tone="brand">Mã hồ sơ: {profile.id.slice(0, 8)}</Chip>
              <span className="text-[11px] px-3 py-1 rounded-full bg-white/15 backdrop-blur font-semibold">
                Năm học: {profile.schoolYear}
              </span>
            </div>
            <h2 className="text-3xl font-bold mt-4 leading-tight">Hồ sơ Sinh viên 5 tốt Cá nhân</h2>
            <p className="text-white/85 mt-2 max-w-xl text-sm leading-relaxed">
              Cấp aim: <b>{levelLabel[profile.targetLevel] || profile.targetLevel}</b>. Trạng thái
              hiện tại: <b>{applicationStatusLabel[profile.status] || profile.status}</b>.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link to={ctaInfo.to}>
                <Button className="bg-white text-[#0057C2] hover:bg-slate-100 font-semibold">
                  {ctaInfo.label} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-5 text-white">
            <div className="text-xs uppercase tracking-wider opacity-80">Trạng thái hồ sơ</div>
            <div className="text-2xl font-extrabold mt-1 truncate">
              {applicationStatusLabel[profile.status] || profile.status}
            </div>

            {profile.readinessScore !== undefined && profile.readinessScore !== null && (
              <div className="text-sm opacity-90 mt-2">
                Tiến độ tham khảo: {profile.readinessScore}%
              </div>
            )}

            <div className="mt-4 text-[11px] opacity-75 flex items-center gap-1.5">
              <History className="w-3 h-3" /> Cập nhật lần cuối:{" "}
              {new Date(profile.updatedAt || Date.now()).toLocaleString("vi-VN")}
            </div>
          </div>
        </div>
      </motion.div>

      {/* QUICK LINKS GRID */}
      <h3 className="font-bold text-brand-deep mb-3 flex items-center gap-2">Liên kết nhanh</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-7">
        {[
          { label: "Hồ sơ của tôi", to: "/app/wizard", icon: FileText, color: "#0057C2" },
          { label: "Minh chứng", to: "/app/evidence", icon: Upload, color: "#10B981" },
          {
            label: "Sự kiện đã xác nhận",
            to: "/app/event-library",
            icon: FileCheck2,
            color: "#F59E0B",
          },
          { label: "Thông báo", to: "/app/notifications", icon: Bell, color: "#EF4444" },
          { label: "Timeline", to: "/app/audit", icon: History, color: "#6366F1" },
        ].map((item, i) => (
          <Link to={item.to} key={item.to}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-soft p-5 text-center h-full hover:-translate-y-1 transition-all flex flex-col justify-center items-center shadow-sm"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white mb-3"
                style={{ background: item.color }}
              >
                <item.icon className="w-5 h-5" />
              </div>
              <div className="text-sm font-semibold text-brand-deep leading-tight">
                {item.label}
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </>
  );
}

// ============== OFFICER ==============
function OfficerDashReal() {
  const user = useAuth((s) => s.user);
  const { data, isLoading, isError, refetch } = useOfficerDashboard();
  const specializations =
    data?.officer.specializations ??
    user?.officerSpecializations?.map((item) => item.criterion) ??
    [];
  const specializationText = specializations.length
    ? specializations.map((criterion) => getCriterionLabel(criterion)).join(", ")
    : "Chưa khai báo tiêu chí";
  const summary = data?.summary;
  const priorityTasks = useMemo(
    () => [...(data?.priorityTasks ?? [])].sort(compareOfficerPriorityTasks).slice(0, 5),
    [data?.priorityTasks],
  );

  if (isLoading) {
    return (
      <>
        <TopBar
          title="Tổng quan xử lý"
          subtitle="Đang tải việc được giao và hồ sơ cần xét duyệt."
        />
        <Card>
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải dashboard cán bộ...
          </div>
        </Card>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <TopBar title="Tổng quan xử lý" subtitle="Không thể tải danh sách việc được giao." />
        <Card>
          <div className="py-10 text-center">
            <div className="font-semibold text-rose-600">Không thể tải dữ liệu xét duyệt.</div>
            <Button className="mt-4" variant="outline" onClick={() => refetch()}>
              Thử lại
            </Button>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Tổng quan xử lý"
        subtitle={`${user?.fullName ?? data?.officer.fullName ?? "Cán bộ"} • Phụ trách: ${specializationText}. Tập trung xử lý hồ sơ, minh chứng và yêu cầu bổ sung theo từng tiêu chí.`}
      />
      <OfficerDashboardCards summary={summary} />

      <Card className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-brand-deep">Việc ưu tiên</h3>
            <div className="mt-1 text-sm text-muted-foreground">
              Sắp xếp theo quá hạn, sắp quá hạn, tài liệu cần kiểm tra và việc mới được giao.
            </div>
          </div>
          <Link to="/app/queue" search={{ tab: "actionable" }}>
            <Button size="sm" variant="ghost">
              Mở danh sách →
            </Button>
          </Link>
        </div>
        <div className="space-y-2">
          {priorityTasks.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Bạn chưa có task cần xử lý. Hãy chuyển sang tab Có thể nhận hoặc kiểm tra lại bộ lọc.
            </div>
          )}
          {priorityTasks.map((task) => (
            <OfficerPriorityTaskItem key={task.taskId} task={task} />
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-bold text-brand-deep mb-3 flex items-center gap-2">
            <ShieldQuestion className="w-4 h-4" /> Hội ý của tôi
          </h3>
          {(summary?.resolutionNeeded ?? 0) === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Chưa có task cần hội ý.
            </div>
          ) : (
            <Link
              to="/app/resolution"
              className="block p-3 rounded-xl bg-purple-50 hover:bg-purple-100"
            >
              <div className="text-sm font-semibold text-purple-900">
                {summary?.resolutionNeeded ?? 0} task đã chuyển hội ý
              </div>
              <div className="text-xs text-purple-700 mt-1">
                Theo dõi trạng thái xử lý của hội đồng
              </div>
            </Link>
          )}
        </Card>
        <Card>
          <h3 className="font-bold text-brand-deep mb-3 flex items-center gap-2">
            <ChartNoAxesCombined className="w-4 h-4" /> Bottleneck theo tiêu chí
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={(data?.bottleneckByCriterion ?? []).map((item) => ({
                name: getCriterionLabel(item.criterion),
                value: item.total,
              }))}
            >
              <XAxis dataKey="name" fontSize={11} stroke="#0057C2" />
              <YAxis fontSize={11} stroke="#0057C2" />
              <Tooltip />
              <Bar dataKey="value" fill="#00AEEF" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}

function OfficerDashboardCards({ summary }: { summary?: OfficerDashboardResponse["summary"] }) {
  const cards = [
    {
      label: "Cần xử lý hôm nay",
      value: (summary?.waiting ?? 0) + (summary?.reviewing ?? 0),
      href: "/app/queue?tab=actionable",
      icon: <Inbox className="h-5 w-5" />,
      tint: "#0057C2",
    },
    {
      label: "Sắp quá hạn",
      value: summary?.dueSoon ?? 0,
      href: "/app/queue?tab=actionable&dueSoon=1",
      icon: <Clock className="h-5 w-5" />,
      tint: "#D97706",
    },
    {
      label: "Chờ sinh viên bổ sung",
      value: summary?.supplementRequired ?? 0,
      href: "/app/queue?tab=supplement&supplementRequired=1",
      icon: <CircleAlert className="h-5 w-5" />,
      tint: "#F59E0B",
    },
    {
      label: "Cần hội ý",
      value: summary?.resolutionNeeded ?? 0,
      href: "/app/resolution",
      icon: <ShieldQuestion className="h-5 w-5" />,
      tint: "#7C3AED",
    },
    {
      label: "Đã xử lý hôm nay",
      value: (summary?.accepted ?? 0) + (summary?.rejected ?? 0),
      href: "/app/queue?tab=mine&status=accepted",
      icon: <FileCheck2 className="h-5 w-5" />,
      tint: "#15803D",
    },
  ];

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <Link key={card.label} to={card.href} className="block">
          <Card className="h-full !p-4 transition-colors hover:bg-[var(--surface-muted)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-muted-foreground">{card.label}</div>
                <div className="mt-2 text-3xl font-bold leading-none text-brand-deep">
                  {card.value}
                </div>
                <div className="mt-2 text-xs font-semibold text-[#0057C2]">Mở danh sách</div>
              </div>
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-white"
                style={{ background: card.tint }}
              >
                {card.icon}
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function OfficerPriorityTaskItem({ task }: { task: OfficerPriorityTask }) {
  return (
    <Link to="/app/review/$id" params={{ id: task.taskId }} className="block">
      <div className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-[var(--surface-muted)]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0057C2] text-xs font-bold text-white">
          {task.studentName.split(" ").slice(-1)[0]?.[0] ?? "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-brand-deep">
            {task.studentName}{" "}
            <span className="font-normal text-muted-foreground">• {task.studentCode}</span>
          </div>
          <div className="mt-1 line-clamp-2 text-sm text-[#475569]">
            {getOfficerPrioritySentence(task)}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip tone={getPriorityTone(task.priorityReason)}>
              {getPriorityReasonLabel(task.priorityReason)}
            </Chip>
            <Chip tone={(task.aiConfidence ?? 1) < 0.7 ? "warning" : "brand"}>
              {getReadabilityLabel(task.aiConfidence)}
            </Chip>
            <Chip tone="muted">{formatDateTime(task.dueDate)}</Chip>
          </div>
        </div>
        <Button size="sm">Mở xét duyệt</Button>
      </div>
    </Link>
  );
}

function getOfficerPrioritySentence(task: OfficerPriorityTask) {
  const criterion = getCriterionLabel(task.criterion);
  if (task.priorityReason === "overdue")
    return `${criterion} — quá hạn, cần kiểm tra và lưu kết luận ngay.`;
  if (task.priorityReason === "due_soon")
    return `${criterion} — sắp quá hạn, cần đối chiếu minh chứng trước deadline.`;
  if (task.priorityReason === "student_resubmitted")
    return `${criterion} — sinh viên đã bổ sung, cần xét lại.`;
  if (task.priorityReason === "low_ai_confidence" || (task.aiConfidence ?? 1) < 0.7) {
    return `${criterion} — cần kiểm tra giấy xác nhận, tài liệu đọc chưa đủ rõ hoặc thiếu thông tin.`;
  }
  if (task.status === "resolution_needed")
    return `${criterion} — case cần hội ý trước khi kết luận.`;
  return `${criterion} — đối chiếu minh chứng và đưa ra kết luận theo phạm vi phụ trách.`;
}

function OfficerDash() {
  const officerId = useApp((s) => s.currentOfficerId);
  const tasks = useApp((s) => s.tasks);
  const me = OFFICERS.find((o) => o.id === officerId) ?? OFFICERS[0];
  const allowed = new Set(me.specializedCriteria as string[]);
  const myTasks = tasks.filter((t) => t.assignedOfficerId === me.id || allowed.has(t.criterion));
  const waiting = myTasks.filter((t) => t.status === "waiting" || t.status === "reviewing");
  const lowConf = myTasks.filter((t) => t.confidence < 0.7);
  const supp = myTasks.filter((t) => t.status === "supplement_required");
  const reso = myTasks.filter((t) => t.status === "resolution_needed");
  const critLabel =
    CRITERIA.find((c) => c.key === me.specializedCriteria[0])?.label ?? "Tiêu chí phụ trách";
  return (
    <>
      <TopBar
        title="Không gian xét duyệt chuyên trách"
        subtitle={`${me.name} • ${me.role} — xử lý hồ sơ thuộc tiêu chí ${critLabel}. Cán bộ xác nhận quyết định cuối cùng.`}
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard
          label={`Task ${critLabel} chờ xét`}
          value={waiting.length}
          icon={<Inbox className="w-5 h-5" />}
        />
        <StatCard
          label="Cần bổ sung"
          value={supp.length}
          icon={<CircleAlert className="w-5 h-5" />}
          tint="#F59E0B"
        />
        <StatCard
          label="Cần kiểm tra kỹ"
          value={lowConf.length}
          icon={<TriangleAlert className="w-5 h-5" />}
          tint="#EF4444"
        />
        <StatCard
          label="Cần hội ý"
          value={reso.length}
          icon={<ShieldQuestion className="w-5 h-5" />}
          tint="#a855f7"
        />
      </div>

      <Card className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-brand-deep">Task được giao theo tiêu chí {critLabel}</h3>
          <Link to="/app/queue">
            <Button size="sm" variant="ghost">
              Xem tất cả →
            </Button>
          </Link>
        </div>
        <div className="space-y-2">
          {myTasks.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Chưa có task được giao cho tiêu chí {critLabel}.
            </div>
          )}
          {myTasks.map((t) => (
            <Link to="/app/review/$id" params={{ id: t.studentId }} key={t.id} className="block">
              <div className="p-4 rounded-2xl hover:bg-[#F4FBFF] transition-all flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#0057C2] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {t.studentName.split(" ").slice(-1)[0]?.[0] ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-brand-deep truncate">
                    {t.studentName}{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      • {t.studentMssv}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {t.evidenceName} • Aim {LEVELS.find((l) => l.key === t.targetLevel)?.label}
                  </div>
                </div>
                <Chip tone={t.confidence < 0.7 ? "warning" : "brand"}>
                  {getReadabilityLabel(t.confidence)}
                </Chip>
                <Chip tone={getStatusTone(t.status)}>{getTaskStatusLabel(t.status)}</Chip>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-bold text-brand-deep mb-3 flex items-center gap-2">
            <ShieldQuestion className="w-4 h-4" /> Case hội ý đang chờ
          </h3>
          <div className="space-y-2">
            {RESOLUTION_CASES.map((r) => (
              <Link
                to="/app/resolution/$id"
                params={{ id: r.id }}
                key={r.id}
                className="block p-3 rounded-xl bg-purple-50 hover:bg-purple-100"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-purple-900">{r.student}</div>
                  <Chip tone="warning">Cần hội ý</Chip>
                </div>
                <div className="text-xs text-purple-700 mt-1">{r.type}</div>
              </Link>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-brand-deep mb-3 flex items-center gap-2">
            <ChartNoAxesCombined className="w-4 h-4" /> Bottleneck theo tiêu chí
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={CRITERIA.map((c, i) => ({ name: c.short, value: [4, 7, 12, 18, 9][i] }))}
            >
              <XAxis dataKey="name" fontSize={11} stroke="#0057C2" />
              <YAxis fontSize={11} stroke="#0057C2" />
              <Tooltip />
              <Bar dataKey="value" fill="#00AEEF" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}

// ============== MANAGER ==============
function ManagerDashReal() {
  const { data, isError, isLoading, refetch } = useManagerDashboardSummary();
  const overview = data?.applicationOverview;
  const targetBreakdown = data?.targetLevelBreakdown ?? {
    school: 0,
    university: 0,
    city: 0,
    central: 0,
  };
  const finalBreakdown = data?.finalLevelBreakdown ?? {
    school: 0,
    university: 0,
    city: 0,
    central: 0,
    notAchieved: 0,
    unfinalized: 0,
  };
  const targetRows = [
    { name: "Cấp Trường", value: targetBreakdown.school, color: "#22c55e" },
    { name: "ĐHĐN", value: targetBreakdown.university, color: "#00AEEF" },
    { name: "Thành phố", value: targetBreakdown.city, color: "#f59e0b" },
  ];
  const finalRows = [
    { name: "Trường", value: finalBreakdown.school, fill: "#22c55e" },
    { name: "ĐHĐN", value: finalBreakdown.university, fill: "#00AEEF" },
    { name: "Thành phố", value: finalBreakdown.city, fill: "#7c3aed" },
    { name: "Chưa đạt", value: finalBreakdown.notAchieved, fill: "#ef4444" },
    { name: "Chưa chốt", value: finalBreakdown.unfinalized, fill: "#f59e0b" },
  ];
  const workload = data?.workloadByOfficer ?? [];
  const recent = data?.recentApplications ?? [];
  const decisionSummary = data?.decisionSummary;
  const decisionCards = [
    {
      label: "Có thể chốt ngay",
      value: decisionSummary?.ready ?? 0,
      bucket: "ready_to_finalize",
      tint: "#22C55E",
    },
    {
      label: "Cần hội ý",
      value: decisionSummary?.resolution ?? 0,
      bucket: "needs_resolution",
      tint: "#7C3AED",
    },
    {
      label: "Bị hạ cấp",
      value: decisionSummary?.downgraded ?? 0,
      bucket: "downgraded",
      tint: "#F59E0B",
    },
    {
      label: "Không đạt cấp nào",
      value: decisionSummary?.notEligible ?? 0,
      bucket: "no_eligible_level",
      tint: "#EF4444",
    },
    {
      label: "Cần bổ sung",
      value: decisionSummary?.supplement ?? 0,
      bucket: "supplement_required",
      tint: "#F97316",
    },
    { label: "Quá hạn", value: decisionSummary?.overdue ?? 0, bucket: "overdue", tint: "#DC2626" },
  ];

  if (isLoading) {
    return (
      <>
        <TopBar
          title="Tổng quan mùa xét"
          subtitle="Theo dõi tiến độ, phân công cán bộ và kiểm soát kết quả xét duyệt."
        />
        <Card>
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải dữ liệu dashboard...
          </div>
        </Card>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <TopBar
          title="Tổng quan mùa xét"
          subtitle="Theo dõi tiến độ, phân công cán bộ và kiểm soát kết quả xét duyệt."
        />
        <Card>
          <div className="py-10 text-center">
            <div className="font-semibold text-rose-600">Không thể tải dữ liệu dashboard.</div>
            <Button className="mt-4" variant="outline" onClick={() => refetch()}>
              Thử lại
            </Button>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Tổng quan mùa xét"
        subtitle="Theo dõi tiến độ, phân công cán bộ và kiểm soát kết quả xét duyệt."
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard
          label="Tổng hồ sơ"
          value={overview?.totalApplications ?? 0}
          icon={<FileText className="w-5 h-5" />}
        />
        <StatCard
          label="Đã nộp / đang xét"
          value={(overview?.submittedCount ?? 0) + (overview?.underReviewCount ?? 0)}
          icon={<FileCheck2 className="w-5 h-5" />}
          tint="#22C55E"
        />
        <StatCard
          label="Cần bổ sung"
          value={overview?.supplementRequiredCount ?? 0}
          icon={<CircleAlert className="w-5 h-5" />}
          tint="#F59E0B"
        />
        <StatCard
          label="Case hội ý"
          value={overview?.resolutionNeededCount ?? 0}
          icon={<TriangleAlert className="w-5 h-5" />}
          tint="#EF4444"
        />
      </div>

      <div className="mb-3">
        <h3 className="font-bold text-brand-deep">Việc cần xử lý hôm nay</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Bấm vào từng nhóm để mở hàng chờ đã lọc đúng việc cần làm.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-6 gap-4 mb-7">
        {decisionCards.map((card) => (
          <Link
            key={card.bucket}
            to="/app/committee/inbox"
            search={{ bucket: card.bucket }}
            className="block"
          >
            <StatCard
              label={card.label}
              value={card.value}
              icon={<Target className="w-5 h-5" />}
              tint={card.tint}
            />
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <Card className="lg:col-span-2">
          <h3 className="font-bold text-brand-deep mb-3">Hồ sơ theo 3 cấp active</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={targetRows}>
              <XAxis dataKey="name" stroke="#0057C2" fontSize={12} />
              <YAxis stroke="#0057C2" fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                {targetRows.map((row) => (
                  <Cell key={row.name} fill={row.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card glow>
          <h3 className="font-bold text-brand-deep mb-3">Đề xuất cấp đạt theo tiêu chí</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={finalRows} dataKey="value" innerRadius={50} outerRadius={80} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <h3 className="font-bold text-brand-deep mb-3 flex items-center gap-2">
          <UsersRound className="w-4 h-4" /> Workload cán bộ
        </h3>
        <div className="space-y-3">
          {workload.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Chưa có dữ liệu workload.
            </div>
          )}
          {workload.map((officer) => (
            <div key={officer.officerId} className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0057C2] text-xs font-bold text-white">
                {officer.fullName.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-brand-deep">{officer.fullName}</div>
                <div className="text-xs text-muted-foreground">{officer.criterion}</div>
              </div>
              <div className="w-48">
                <Progress value={Math.min(100, (officer.assignedCount / 25) * 100)} />
              </div>
              <span className="text-sm font-bold text-brand-deep w-12 text-right">
                {officer.assignedCount}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-brand-deep flex items-center gap-2">
            <FileCheck2 className="w-4 h-4" /> Hồ sơ cập nhật gần đây
          </h3>
          <Link to="/app/manager/results">
            <Button size="sm" variant="ghost">
              Kết quả theo cấp →
            </Button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-[#F6F9FC] text-left text-muted-foreground text-[11px] uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2">Sinh viên</th>
                <th className="px-3 py-2">Cấp đăng ký</th>
                <th className="px-3 py-2">Kết quả cuối</th>
                <th className="px-3 py-2">Cấp đạt</th>
                <th className="px-3 py-2">Tiến độ task</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    Chưa có hồ sơ.
                  </td>
                </tr>
              )}
              {recent.map((item) => (
                <tr key={item.applicationId} className="border-t border-[#EEF2F7]">
                  <td className="px-3 py-2">
                    <div className="font-semibold text-brand-deep">{item.studentName}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {item.studentCode ?? "--"}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[11.5px]">
                    {levelLabel[item.targetLevel] || item.targetLevel}
                  </td>
                  <td className="px-3 py-2">
                    <Chip
                      tone={
                        item.finalStatus === "passed"
                          ? "success"
                          : item.finalStatus === "failed"
                            ? "error"
                            : "warning"
                      }
                    >
                      {item.finalStatus === "passed"
                        ? "Đạt"
                        : item.finalStatus === "failed"
                          ? "Chưa đạt"
                          : item.finalStatus === "partially_passed"
                            ? "Đạt cấp thấp hơn"
                            : "Chưa chốt"}
                    </Chip>
                  </td>
                  <td className="px-3 py-2">
                    {item.finalLevel ? levelLabel[item.finalLevel] : "--"}
                  </td>
                  <td className="px-3 py-2">
                    <Chip tone="brand">
                      {item.reviewTaskSummary.accepted}/{item.reviewTaskSummary.total} đạt
                    </Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function getPriorityReasonLabel(reason?: string | null) {
  if (reason === "overdue") return "Quá hạn";
  if (reason === "student_resubmitted") return "Vừa bổ sung";
  if (reason === "low_ai_confidence") return "Cần kiểm tra kỹ";
  if (reason === "due_soon") return "Sắp đến hạn";
  if (reason === "assigned_to_you") return "Được giao";
  if (reason === "unassigned_claimable") return "Có thể nhận";
  return "Theo dõi";
}

function getPriorityTone(reason?: string | null) {
  if (reason === "overdue" || reason === "low_ai_confidence") return "error";
  if (reason === "student_resubmitted" || reason === "due_soon") return "warning";
  if (reason === "assigned_to_you" || reason === "unassigned_claimable") return "brand";
  return "success";
}

type OfficerPriorityTask = OfficerDashboardResponse["priorityTasks"][number];

function compareOfficerPriorityTasks(a: OfficerPriorityTask, b: OfficerPriorityTask) {
  const reasonWeight: Record<string, number> = {
    overdue: 0,
    due_soon: 1,
    student_resubmitted: 2,
    low_ai_confidence: 2,
    assigned_to_you: 3,
    unassigned_claimable: 4,
  };
  const riskWeight: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const aReason = a.priorityReason ? (reasonWeight[a.priorityReason] ?? 99) : 99;
  const bReason = b.priorityReason ? (reasonWeight[b.priorityReason] ?? 99) : 99;
  if (aReason !== bReason) return aReason - bReason;
  const aRisk = riskWeight[a.riskLevel] ?? 3;
  const bRisk = riskWeight[b.riskLevel] ?? 3;
  if (aRisk !== bRisk) return aRisk - bRisk;
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

// ============== COLLECTIVE ==============
function CollectiveDash() {
  const c = CURRENT_COLLECTIVE;
  return (
    <>
      <TopBar
        title={`Hồ sơ Tập thể SV5T — ${c.name}`}
        subtitle={`Một hồ sơ duy nhất cho năm học ${c.schoolYear} — cập nhật lúc ${c.lastSavedAt}`}
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard
          label="Tổng sinh viên"
          value={c.total}
          icon={<UsersRound className="w-5 h-5" />}
        />
        <StatCard
          label="Đăng ký phong trào"
          value={`${c.registered}/${c.total}`}
          icon={<FileCheck2 className="w-5 h-5" />}
          tint="#22C55E"
        />
        <StatCard
          label="Đạt SV5T cấp Trường"
          value={c.sv5tTruong}
          icon={<FileCheck2 className="w-5 h-5" />}
          tint="#00AEEF"
        />
        <StatCard
          label="Đạt cấp cao hơn"
          value={c.sv5tHigher}
          icon={<FileCheck2 className="w-5 h-5" />}
          tint="#0057C2"
        />
      </div>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-brand-deep">
              Hồ sơ Tập thể duy nhất — năm học {c.schoolYear}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Tập thể chỉ có một hồ sơ chính thức cho mỗi mùa xét.
            </p>
          </div>
          <Link to="/app/collective/$id" params={{ id: c.id }}>
            <Button>
              Mở hồ sơ tập thể <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <Progress value={c.progress} />
        <div className="text-xs text-muted-foreground mt-2">
          Tiến độ tổng: {c.progress}% • {c.registered}/{c.total} sinh viên tham gia phong trào
        </div>
      </Card>
    </>
  );
}
