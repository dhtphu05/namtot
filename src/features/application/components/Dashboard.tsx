import { Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, StatCard, Chip, Button, Progress } from "@/components/ui-kit";
import { useApp } from "@/lib/store";
import { useAuth } from "@/features/auth/store/auth-store";
import { ENABLE_DEMO_ROLE_SWITCH, isUiRole, toUiRole } from "@/features/auth/role-map";
import { CRITERIA, STUDENTS, RESOLUTION_CASES, OFFICERS, CURRENT_PROFILE, CURRENT_STUDENT, CURRENT_COLLECTIVE, LEVELS, PROFILE_STATUS, STATUS, MEDIA, REVIEW_TASKS } from "@/lib/mock-data";
import { FileText, Sparkles, Inbox, TriangleAlert, Clock, UsersRound, FileCheck2, CircleAlert, Bot, Target, GitBranch, Upload, History, ScanText, PencilLine, Send, ChartNoAxesCombined, ShieldQuestion, ArrowRight, Play, Loader2, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentApplication, useStartApplication } from "@/features/application/hooks/useApplication";
import { levelLabel, applicationStatusLabel, type ApplicationStatus } from "@/lib/api/types";
import { StudentOverview } from "./StudentOverview";



export function Dashboard() {
  const user = useAuth((s) => s.user);
  const storedRole = useApp((s) => s.role);
  const role = ENABLE_DEMO_ROLE_SWITCH && isUiRole(storedRole)
    ? storedRole
    : user
      ? toUiRole(user.role)
      : "student";
  if (role === "student") return <StudentOverview />;
  if (role === "officer") return <OfficerDash />;
  if (role === "manager") return <ManagerDash />;
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
      {
        schoolYear: "2025-2026",
        applicationType: "individual",
        targetLevel: "school",
      },
      {
        onSuccess: () => {
          toast.success("Khởi tạo hồ sơ thành công!");
          refetch().then(() => {
            nav({ to: "/app/wizard" });
          });
        },
      }
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
          <img src={MEDIA.hero[0]} className="absolute inset-0 w-full h-full object-cover opacity-10" alt="" />
          <div className="relative flex flex-col justify-between items-start gap-6">
            <div>
              <h2 className="text-3xl font-extrabold leading-tight">Bắt đầu hồ sơ Sinh viên 5 tốt</h2>
              <p className="text-white/85 mt-2 max-w-xl text-sm leading-relaxed">
                Sinh viên chỉ cần tạo một hồ sơ duy nhất, chọn cấp aim mục tiêu mong muốn đạt được, sau đó tiến hành cập nhật thông tin và bổ sung minh chứng theo từng tiêu chí.
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
        <img src={MEDIA.hero[0]} className="absolute inset-0 w-full h-full object-cover opacity-10" alt="" />
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
              Cấp aim: <b>{levelLabel[profile.targetLevel] || profile.targetLevel}</b>. Trạng thái hiện tại:{" "}
              <b>{applicationStatusLabel[profile.status] || profile.status}</b>.
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
                Mức sẵn sàng tham khảo: {profile.readinessScore}%
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
          { label: "Sự kiện đã xác nhận", to: "/app/event-library", icon: FileCheck2, color: "#F59E0B" },
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
              <div className="text-sm font-semibold text-brand-deep leading-tight">{item.label}</div>
            </motion.div>
          </Link>
        ))}
      </div>
    </>
  );
}

// ============== OFFICER ==============
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
  const critLabel = CRITERIA.find((c) => c.key === me.specializedCriteria[0])?.label ?? "Tiêu chí phụ trách";
  return (
    <>
      <TopBar
        title="Không gian xét duyệt chuyên trách"
        subtitle={`${me.name} • ${me.role} — chỉ xử lý task ${critLabel}. AI gợi ý, cán bộ xác nhận quyết định cuối cùng.`}
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard label={`Task ${critLabel} chờ xét`} value={waiting.length} icon={<Inbox className="w-5 h-5" />} />
        <StatCard label="Cần bổ sung" value={supp.length} icon={<CircleAlert className="w-5 h-5" />} tint="#F59E0B" />
        <StatCard label="AI confidence thấp" value={lowConf.length} icon={<TriangleAlert className="w-5 h-5" />} tint="#EF4444" />
        <StatCard label="Cần Resolution Hub" value={reso.length} icon={<ShieldQuestion className="w-5 h-5" />} tint="#a855f7" />
      </div>

      <Card className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-brand-deep">Task được giao theo tiêu chí {critLabel}</h3>
          <Link to="/app/queue"><Button size="sm" variant="ghost">Xem tất cả →</Button></Link>
        </div>
        <div className="space-y-2">
          {myTasks.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Chưa có task được giao cho tiêu chí {critLabel}.</div>}
          {myTasks.map((t) => (
            <Link to="/app/review/$id" params={{ id: t.studentId }} key={t.id} className="block">
              <div className="p-4 rounded-2xl hover:bg-[#F4FBFF] transition-all flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#0057C2] text-white flex items-center justify-center text-xs font-bold shrink-0">{t.studentName.split(" ").slice(-1)[0]?.[0] ?? "?"}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-brand-deep truncate">{t.studentName} <span className="text-xs text-muted-foreground font-normal">• {t.studentMssv}</span></div>
                  <div className="text-xs text-muted-foreground truncate">{t.evidenceName} • Aim {LEVELS.find(l => l.key === t.targetLevel)?.label}</div>
                </div>
                <Chip tone={t.confidence < 0.7 ? "warning" : "brand"}>AI {Math.round(t.confidence * 100)}%</Chip>
                <Chip tone={t.status === "supplement_required" ? "warning" : t.status === "accepted" ? "success" : t.status === "rejected" ? "error" : t.status === "resolution_needed" ? "warning" : "brand"}>{t.status}</Chip>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-bold text-brand-deep mb-3 flex items-center gap-2"><ShieldQuestion className="w-4 h-4" /> Resolution Hub đang chờ</h3>
          <div className="space-y-2">
            {RESOLUTION_CASES.map((r) => (
              <Link to="/app/resolution/$id" params={{ id: r.id }} key={r.id} className="block p-3 rounded-xl bg-purple-50 hover:bg-purple-100">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-purple-900">{r.student}</div>
                  <Chip tone="warning">{Math.round(r.confidence * 100)}%</Chip>
                </div>
                <div className="text-xs text-purple-700 mt-1">{r.type}</div>
              </Link>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-brand-deep mb-3 flex items-center gap-2"><ChartNoAxesCombined className="w-4 h-4" /> Bottleneck theo tiêu chí</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={CRITERIA.map((c, i) => ({ name: c.short, value: [4, 7, 12, 18, 9][i] }))}>
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
function ManagerDash() {
  const dist = [
    { name: "Cấp Trường", value: 142, color: "#22c55e" },
    { name: "ĐHĐN", value: 87, color: "#00AEEF" },
    { name: "Thành phố", value: 38, color: "#f59e0b" },
    { name: "Trung ương", value: 12, color: "#0057C2" },
  ];
  // Aggregate review tasks by application × criterion
  const tasks = useApp((s) => s.tasks);
  const apps = Array.from(new Set(tasks.map((t) => t.applicationId))).map((appId) => {
    const list = tasks.filter((t) => t.applicationId === appId);
    const first = list[0];
    return { appId, student: first.studentName, mssv: first.studentMssv, target: first.targetLevel, byCrit: Object.fromEntries(CRITERIA.map((c) => [c.key, list.find((t) => t.criterion === c.key)])) };
  });
  return (
    <>
      <TopBar title="Bảng điều khiển quản lý" subtitle="Tổng quan kỳ xét SV5T 2025–2026" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard label="Tổng hồ sơ" value={279} icon={<FileText className="w-5 h-5" />} />
        <StatCard label="Đã duyệt" value={158} icon={<FileCheck2 className="w-5 h-5" />} tint="#22C55E" delta="+24 tuần này" />
        <StatCard label="Cần bổ sung" value={42} icon={<CircleAlert className="w-5 h-5" />} tint="#F59E0B" />
        <StatCard label="Mập mờ (Resolution)" value={11} icon={<TriangleAlert className="w-5 h-5" />} tint="#EF4444" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <Card className="lg:col-span-2">
          <h3 className="font-bold text-brand-deep mb-3">Hồ sơ theo cấp aim</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dist}>
              <XAxis dataKey="name" stroke="#0057C2" fontSize={12} />
              <YAxis stroke="#0057C2" fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                {dist.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card glow>
          <h3 className="font-bold text-brand-deep mb-3">Phân bố trạng thái</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={[
                { name: "Đã duyệt", value: 158, fill: "#22c55e" },
                { name: "Đang xét", value: 68, fill: "#00AEEF" },
                { name: "Cần bổ sung", value: 42, fill: "#f59e0b" },
                { name: "Mập mờ", value: 11, fill: "#a855f7" },
              ]} dataKey="value" innerRadius={50} outerRadius={80} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <h3 className="font-bold text-brand-deep mb-3 flex items-center gap-2"><UsersRound className="w-4 h-4" /> Workload cán bộ</h3>
        <div className="space-y-3">
          {OFFICERS.map((o) => (
            <div key={o.id} className="flex items-center gap-4">
              <img src={o.avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-brand-deep">{o.name}</div>
                <div className="text-xs text-muted-foreground">{o.role}</div>
              </div>
              <div className="w-48"><Progress value={(o.load / 25) * 100} /></div>
              <span className="text-sm font-bold text-brand-deep w-12 text-right">{o.load}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-brand-deep flex items-center gap-2"><FileCheck2 className="w-4 h-4" /> Bảng tổng hợp xét duyệt hồ sơ (theo từng tiêu chí)</h3>
          <Link to="/app/assignment"><Button size="sm" variant="ghost">Phân công cán bộ →</Button></Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-[#F6F9FC] text-left text-muted-foreground text-[11px] uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2">Sinh viên</th>
                <th className="px-3 py-2">Cấp aim</th>
                {CRITERIA.map((c) => <th key={c.key} className="px-3 py-2">{c.short}</th>)}
                <th className="px-3 py-2">Tổng quan</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => {
                const taskStates = Object.values(a.byCrit) as any[];
                const accepted = taskStates.filter((t) => t?.status === "accepted").length;
                return (
                  <tr key={a.appId} className="border-t border-[#EEF2F7]">
                    <td className="px-3 py-2"><div className="font-semibold text-brand-deep">{a.student}</div><div className="text-[11px] text-muted-foreground">{a.mssv}</div></td>
                    <td className="px-3 py-2 text-[11.5px]">{LEVELS.find((l) => l.key === a.target)?.label}</td>
                    {CRITERIA.map((c) => {
                      const t = (a.byCrit as any)[c.key];
                      if (!t) return <td key={c.key} className="px-3 py-2"><Chip tone="muted">—</Chip></td>;
                      const officer = OFFICERS.find((o) => o.id === t.assignedOfficerId);
                      const tone = t.status === "accepted" ? "success" : t.status === "rejected" ? "error" : t.status === "supplement_required" ? "warning" : t.status === "resolution_needed" ? "warning" : "brand";
                      return (
                        <td key={c.key} className="px-3 py-2">
                          <Chip tone={tone as any}>{t.status === "accepted" ? "Đạt" : t.status === "rejected" ? "Không đạt" : t.status === "supplement_required" ? "Bổ sung" : t.status === "resolution_needed" ? "Resolution" : "Đang xét"}</Chip>
                          <div className="text-[10.5px] text-muted-foreground mt-1 truncate" title={officer?.name}>{officer?.name?.split(" ").slice(-2).join(" ") ?? "—"}</div>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2"><Chip tone={accepted === CRITERIA.length ? "success" : "brand"}>{accepted}/{CRITERIA.length} tiêu chí đạt</Chip></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-[11.5px] text-muted-foreground">Mỗi tiêu chí được xét bởi một cán bộ chuyên trách. AI gợi ý — cán bộ xác nhận — Hội đồng chốt quyết định cuối cùng.</div>
      </Card>
    </>
  );
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
        <StatCard label="Tổng sinh viên" value={c.total} icon={<UsersRound className="w-5 h-5" />} />
        <StatCard label="Đăng ký phong trào" value={`${c.registered}/${c.total}`} icon={<FileCheck2 className="w-5 h-5" />} tint="#22C55E" />
        <StatCard label="Đạt SV5T cấp Trường" value={c.sv5tTruong} icon={<FileCheck2 className="w-5 h-5" />} tint="#00AEEF" />
        <StatCard label="Đạt cấp cao hơn" value={c.sv5tHigher} icon={<FileCheck2 className="w-5 h-5" />} tint="#0057C2" />
      </div>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-brand-deep">Hồ sơ Tập thể duy nhất — năm học {c.schoolYear}</h3>
            <p className="text-xs text-muted-foreground mt-1">Tập thể chỉ có một hồ sơ chính thức cho mỗi mùa xét.</p>
          </div>
          <Link to="/app/collective/$id" params={{ id: c.id }}><Button>Mở hồ sơ tập thể <ArrowRight className="w-4 h-4" /></Button></Link>
        </div>
        <Progress value={c.progress} />
        <div className="text-xs text-muted-foreground mt-2">Tiến độ tổng: {c.progress}% • {c.registered}/{c.total} sinh viên tham gia phong trào</div>
      </Card>
    </>
  );
}
