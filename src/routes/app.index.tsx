import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, StatCard, Chip, Button, Progress } from "@/components/ui-kit";
import { useApp } from "@/lib/store";
import { CRITERIA, STUDENTS, RESOLUTION_CASES, OFFICERS, CURRENT_PROFILE, CURRENT_STUDENT, CURRENT_COLLECTIVE, LEVELS, PROFILE_STATUS, STATUS, MEDIA, REVIEW_TASKS } from "@/lib/mock-data";
import { FileText, Sparkles, Inbox, TriangleAlert, Clock, UsersRound, FileCheck2, CircleAlert, Bot, Target, GitBranch, Upload, History, ScanText, PencilLine, Send, ChartNoAxesCombined, ShieldQuestion, ArrowRight, Play } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const role = useApp((s) => s.role);
  if (role === "student") return <StudentDash />;
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
  const profile = useApp((s) => s.profile);
  const setProfileStatus = useApp((s) => s.setProfileStatus);
  const pushAudit = useApp((s) => s.pushAudit);
  const pushNotification = useApp((s) => s.pushNotification);
  const nav = useNavigate();
  const status = PROFILE_STATUS[profile.status];
  const targetLevel = LEVELS.find((l) => l.key === profile.targetLevel)!;
  const missingCount = Object.values(CURRENT_PROFILE.criteriaProgress).filter((c) => c.progress < 70).length;

  const runDemo = async () => {
    const steps: Array<[string, string]> = [
      ["Mở hồ sơ SV5T 2025–2026", "Trạng thái: Đang hoàn thiện bản nháp"],
      ["Nhập chỉ số GPA 3.35 và ĐRL 87", "Không có điểm F"],
      ["Import Mùa hè xanh 2025", "Tình nguyện — quy đổi 3 ngày, MSSV khớp dòng #128"],
      ["Upload Giấy CN Sinh viên khỏe", "Thể lực — SmartReader đang OCR & index"],
      ["Tạo 5 Evidence Card", "GPA, ĐRL, Mùa hè xanh, Sinh viên khỏe, IELTS"],
      ["AI tiền kiểm hồ sơ", "Sẵn sàng ~80% — Tình nguyện thiếu 2 ngày cho Cấp Thành phố"],
      ["Nộp hồ sơ chính thức", "Trạng thái: Đang xét duyệt"],
      ["Hệ thống tạo 5 review task", "Đạo đức, Học tập, Thể lực, Tình nguyện, Hội nhập"],
      ["Phân công cán bộ chuyên trách", "Mỗi tiêu chí 1 cán bộ — AI gợi ý, cán bộ xác nhận"],
    ];
    toast.info("Bắt đầu demo end-to-end…");
    for (let i = 0; i < steps.length; i++) {
      const [t, d] = steps[i];
      await new Promise((r) => setTimeout(r, 700));
      toast.message(`Bước ${i + 1}/${steps.length}: ${t}`, { description: d });
    }
    setProfileStatus("submitted");
    pushAudit({ actor: CURRENT_STUDENT.name, role: "Sinh viên", action: "Nộp hồ sơ chính thức (demo)", before: "Bản nháp", after: "Đã nộp", reason: "Chạy demo end-to-end" });
    pushNotification({ title: "Hồ sơ đã nộp chính thức", desc: "5 review task đã được tạo theo từng tiêu chí", type: "success" });
    toast.success("Demo hoàn tất — chuyển sang Cascade Review");
    setTimeout(() => nav({ to: "/app/cascade" }), 500);
  };

  return (
    <>
      <TopBar
        title={`Xin chào, ${CURRENT_STUDENT.name.split(" ").slice(-1)[0]}`}
        subtitle={`Hồ sơ Sinh viên 5 tốt năm học ${profile.schoolYear} — hạn nộp 30/10/2025`}
      />

      {/* SINGLE PROFILE CARD */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0057C2] text-white rounded-2xl p-8 mb-7 relative overflow-hidden">
        <div className="absolute inset-0 wave-bg opacity-30" />
        <img src={MEDIA.hero[0]} className="absolute inset-0 w-full h-full object-cover opacity-10" alt="" />
        <div className="relative grid md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 text-white">
            <div className="flex items-center gap-2 flex-wrap">
              <Chip tone="brand"><FileText className="w-3 h-3" /> Hồ sơ duy nhất • Năm học {profile.schoolYear}</Chip>
              <span className="text-[11px] px-3 py-1 rounded-full bg-white/15 backdrop-blur font-semibold">{status.label}</span>
            </div>
            <h2 className="text-3xl font-bold mt-3 leading-tight">Hồ sơ Sinh viên 5 tốt năm học {profile.schoolYear}</h2>
            <p className="text-white/85 mt-2 max-w-xl">
              Cấp aim hiện tại: <b>{targetLevel.label}</b>. Bạn chỉ nộp <b>một hồ sơ duy nhất</b> cho mùa xét này — 5TOT sẽ kiểm tra hồ sơ từ cấp aim xuống các cấp phù hợp hơn.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <Link to={CTA_TARGET[profile.status] ?? "/app/drafts"}>
                <Button>{status.cta} <ArrowRight className="w-4 h-4" /></Button>
              </Link>
              <Link to="/app/ai-precheck"><Button variant="secondary"><Sparkles className="w-4 h-4" /> Xem kết quả tiền kiểm</Button></Link>
              <Link to="/app/cascade"><Button variant="ghost" className="!text-white hover:!bg-white/10"><GitBranch className="w-4 h-4" /> Cascade Review</Button></Link>
              <Button variant="ghost" className="!text-white hover:!bg-white/10" onClick={runDemo}><Play className="w-4 h-4" /> Chạy demo end-to-end</Button>
            </div>
          </div>
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-5 text-white">
            <div className="text-xs uppercase tracking-wider opacity-80">Tiến độ tổng</div>
            <div className="text-5xl font-extrabold mt-1">{profile.progress}%</div>
            <div className="text-sm opacity-90 flex items-center gap-1.5 mt-1"><CircleAlert className="w-3.5 h-3.5" /> Còn {missingCount} tiêu chí cần bổ sung</div>
            <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${profile.progress}%` }} transition={{ duration: 1 }} className="h-full bg-white rounded-full" />
            </div>
            <div className="mt-3 text-[11px] opacity-75 flex items-center gap-1.5"><History className="w-3 h-3" /> Cập nhật lần cuối: {profile.lastSavedAt}</div>
          </div>
        </div>
      </motion.div>

      {/* 5 criteria — based on real profile state */}
      <h3 className="font-bold text-brand-deep mb-3 flex items-center gap-2"><FileCheck2 className="w-4 h-4" /> Tình trạng 5 tiêu chí trong hồ sơ hiện tại</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-7">
        {CRITERIA.map((c, i) => {
          const cp = CURRENT_PROFILE.criteriaProgress[c.key];
          return (
            <Link to="/app/drafts" key={c.key}>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card-soft p-5 h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs" style={{ background: c.color }}>{c.short.slice(0, 2)}</div>
                  <span className="font-bold text-brand-deep">{cp.progress}%</span>
                </div>
                <div className="text-sm font-semibold">{c.label}</div>
                <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{cp.label}</div>
                <div className="mt-3"><Progress value={cp.progress} tint={c.color} /></div>
              </motion.div>
            </Link>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-brand-deep flex items-center gap-2"><Target className="w-4 h-4" /> Cấp aim & gợi ý hệ thống</h3>
            <Link to="/app/cascade"><Button size="sm" variant="ghost">Cascade Review →</Button></Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {LEVELS.map((l) => {
              const isCurrent = l.key === profile.targetLevel;
              return (
                <div key={l.key} className={`p-4 rounded-2xl ${isCurrent ? "bg-[#0057C2] text-white" : "bg-[#F4FBFF]"}`}>
                  <div className="flex items-center justify-between">
                    <div className={`text-xs uppercase font-bold tracking-wider ${isCurrent ? "text-white/85" : "text-muted-foreground"}`}>Cấp {l.difficulty}/4</div>
                    {isCurrent && <Chip tone="brand">Đang aim</Chip>}
                  </div>
                  <div className={`font-bold mt-1 ${isCurrent ? "text-white" : "text-brand-deep"}`}>{l.label}</div>
                  <div className={`text-[11px] mt-1 ${isCurrent ? "text-white/85" : "text-muted-foreground"}`}>
                    {l.key === "thanh-pho" ? "Cần bổ sung thêm 2 ngày tình nguyện" : l.key === "dhdn" ? "Phù hợp với hồ sơ hiện tại" : l.key === "truong" ? "Phù hợp với hồ sơ hiện tại" : "Chưa đủ dữ liệu để đánh giá"}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card glow>
          <h3 className="font-bold text-brand-deep flex items-center gap-2 mb-3"><Bot className="w-4 h-4" /> Trợ lý SV5T</h3>
          <p className="text-sm text-muted-foreground">Hỏi nhanh — chatbot trả lời theo hồ sơ hiện tại của bạn.</p>
          <div className="space-y-2 my-4">
            {["Hồ sơ của em còn thiếu gì?", "Em có thể đạt cấp nào?", "Hạn bổ sung minh chứng khi nào?"].map((q) => (
              <Link to="/app/chatbot" key={q} className="block text-sm px-3 py-2 rounded-lg bg-[#EEF9FF] text-brand-deep hover:bg-[#dff2ff]">
                {q}
              </Link>
            ))}
          </div>
          <Link to="/app/chatbot"><Button className="w-full">Mở chatbot</Button></Link>
        </Card>
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
