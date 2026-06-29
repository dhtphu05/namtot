import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip, Progress } from "@/components/ui-kit";
import { CRITERIA, LEVELS, EVIDENCE_CARDS, CURRENT_PROFILE, CURRENT_STUDENT, PROFILE_STATUS, MEDIA } from "@/lib/mock-data";
import { useApp } from "@/lib/store";
import { Save, Send, Sparkles, History, Target, FolderUp, ScanText, CheckCircle2, CircleAlert, TriangleAlert, FileText, PencilLine, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/app/drafts")({
  component: DraftWorkspace,
});

const REC: Record<string, { label: string; tone: "success" | "warning" | "brand" | "muted" }> = {
  truong: { label: "Phù hợp với hồ sơ hiện tại", tone: "success" },
  dhdn: { label: "Phù hợp với hồ sơ hiện tại", tone: "success" },
  "thanh-pho": { label: "Cần bổ sung thêm", tone: "warning" },
  "trung-uong": { label: "Chưa đủ dữ liệu để đánh giá", tone: "muted" },
};

const EVIDENCE_STATUS: Record<string, { label: string; tone: "success" | "warning" | "brand" | "muted" | "error" }> = {
  missing: { label: "Chưa có minh chứng", tone: "muted" },
  uploaded: { label: "Đã upload", tone: "brand" },
  prechecking: { label: "Đang tiền kiểm", tone: "brand" },
  likely: { label: "Có khả năng hợp lệ", tone: "success" },
  "needs-supplement": { label: "Cần bổ sung", tone: "warning" },
  "needs-officer": { label: "Cần cán bộ xác minh", tone: "warning" },
};

function DraftWorkspace() {
  const profile = useApp((s) => s.profile);
  const setTargetLevel = useApp((s) => s.setTargetLevel);
  const setProfileStatus = useApp((s) => s.setProfileStatus);
  const pushAudit = useApp((s) => s.pushAudit);
  const pushNotification = useApp((s) => s.pushNotification);
  const nav = useNavigate();

  const [activeCriteria, setActiveCriteria] = useState<string>("hoc-tap");

  const status = PROFILE_STATUS[profile.status];
  const cards = EVIDENCE_CARDS.filter((e) => e.criteria === activeCriteria);

  const onSave = () => {
    pushAudit({ actor: CURRENT_STUDENT.name, role: "Sinh viên", action: "Lưu bản nháp hồ sơ SV5T", before: "—", after: profile.lastSavedAt, reason: "Người dùng lưu thủ công" });
    toast.success("Đã lưu bản nháp", { description: `Hồ sơ SV5T năm học ${profile.schoolYear}` });
  };
  const onPreCheck = () => {
    setProfileStatus("prechecked");
    pushAudit({ actor: "VNPT SmartReader", role: "AI", action: "AI tiền kiểm hồ sơ", before: "Bản nháp", after: "68% sẵn sàng", reason: "Đối chiếu 5 tiêu chí cấp aim hiện tại" });
    nav({ to: "/app/ai-precheck" });
  };
  const onSubmit = () => {
    setProfileStatus("submitted");
    pushAudit({ actor: CURRENT_STUDENT.name, role: "Sinh viên", action: "Nộp hồ sơ chính thức", before: "Bản nháp", after: "Đã nộp", reason: "Sinh viên xác nhận nộp" });
    pushNotification({ title: "Hồ sơ đã được nộp chính thức", desc: `Cấp aim: ${LEVELS.find(l => l.key === profile.targetLevel)?.label}`, type: "success" });
    toast.success("Đã nộp hồ sơ chính thức");
    nav({ to: "/app/cascade" });
  };
  const onChangeLevel = (lvl: string) => {
    setTargetLevel(lvl);
    pushAudit({ actor: CURRENT_STUDENT.name, role: "Sinh viên", action: "Cập nhật cấp aim", before: profile.targetLevel, after: lvl, reason: "Sinh viên đổi mục tiêu" });
    toast.success("Đã cập nhật cấp aim cho hồ sơ hiện tại.");
  };

  return (
    <>
      <TopBar
        title="Bản nháp hồ sơ SV5T"
        subtitle={`Năm học ${profile.schoolYear} • Cá nhân • Tự động lưu lúc ${profile.lastSavedAt}`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onSave}><Save className="w-4 h-4" /> Lưu bản nháp</Button>
            <Button onClick={onSubmit}><Send className="w-4 h-4" /> Nộp chính thức</Button>
          </div>
        }
      />

      {/* Profile summary */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-4">
          <img src={CURRENT_STUDENT.avatar} className="w-14 h-14 rounded-2xl object-cover" alt="" />
          <div className="min-w-0">
            <div className="font-bold text-brand-deep">{CURRENT_STUDENT.name} • {CURRENT_STUDENT.mssv}</div>
            <div className="text-xs text-muted-foreground">{CURRENT_STUDENT.khoa} • {CURRENT_STUDENT.lop} • GPA {CURRENT_STUDENT.gpa} • ĐRL {CURRENT_STUDENT.drl}</div>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-semibold ml-auto ${status.color}`}>{status.label}</span>
          <Chip tone="brand"><Target className="w-3 h-3" /> Aim: {LEVELS.find(l => l.key === profile.targetLevel)?.label}</Chip>
          <div className="w-48">
            <div className="flex items-center justify-between text-xs mb-1"><span className="text-muted-foreground">Tiến độ</span><span className="font-bold text-brand-deep">{profile.progress}%</span></div>
            <Progress value={profile.progress} />
          </div>
        </div>
        <div className="mt-4 p-3 rounded-xl bg-[#EEF9FF] text-sm text-brand-deep flex items-start gap-2">
          <FileText className="w-4 h-4 mt-0.5 shrink-0" />
          <span><b>Bạn chỉ nộp một hồ sơ duy nhất cho mùa xét này.</b> 5TOT sẽ kiểm tra hồ sơ từ cấp aim bạn chọn xuống các cấp phù hợp hơn.</span>
        </div>
      </Card>

      {/* Target level cards */}
      <h3 className="font-bold text-brand-deep mb-3 flex items-center gap-2"><Target className="w-4 h-4" /> Cấp aim của hồ sơ</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {LEVELS.map((l) => {
          const active = l.key === profile.targetLevel;
          const rec = REC[l.key];
          return (
            <button key={l.key} onClick={() => onChangeLevel(l.key)} className={`text-left p-4 rounded-2xl transition-all hover:-translate-y-0.5 ${active ? "gradient-brand text-white shadow-[var(--shadow-glow)]" : "card-soft"}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] uppercase font-bold ${active ? "text-white/85" : "text-muted-foreground"}`}>{"★".repeat(l.difficulty)}</span>
                {active && <Chip tone="brand">Đang aim</Chip>}
              </div>
              <div className={`font-bold mt-1 ${active ? "text-white" : "text-brand-deep"}`}>{l.label}</div>
              <div className={`text-[11px] mt-1 ${active ? "text-white/85" : "text-muted-foreground"}`}>{l.desc}</div>
              <div className="mt-3"><Chip tone={rec.tone}>{rec.label}</Chip></div>
            </button>
          );
        })}
      </div>

      {/* Five criteria tabs */}
      <h3 className="font-bold text-brand-deep mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> 5 tiêu chí Sinh viên 5 tốt</h3>
      <div className="flex flex-wrap gap-2 mb-4">
        {CRITERIA.map((c) => {
          const cp = CURRENT_PROFILE.criteriaProgress[c.key];
          const active = c.key === activeCriteria;
          return (
            <button key={c.key} onClick={() => setActiveCriteria(c.key)} className={`px-4 py-2 rounded-2xl text-sm font-semibold transition-all flex items-center gap-2 ${active ? "gradient-brand text-white shadow-[var(--shadow-glow)]" : "card-soft hover:-translate-y-0.5"}`}>
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white" style={{ background: c.color }}>{c.short.slice(0, 2)}</span>
              <span>{c.label}</span>
              <span className={`text-[11px] ${active ? "text-white/85" : "text-muted-foreground"}`}>{cp.progress}%</span>
            </button>
          );
        })}
      </div>

      <Card className="mb-5">
        <CriteriaSection criteriaKey={activeCriteria} cards={cards} />
      </Card>

      {/* Bottom actions */}
      <div className="card-soft p-5 flex flex-wrap items-center gap-3">
        <div className="text-sm text-muted-foreground flex items-center gap-2"><History className="w-4 h-4" /> Đã tự động lưu lúc <b className="text-brand-deep ml-1">{profile.lastSavedAt}</b></div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => nav({ to: "/app/audit" })}><History className="w-4 h-4" /> Xem lịch sử cập nhật</Button>
          <Button variant="secondary" onClick={() => nav({ to: "/app/evidence" })}><FolderUp className="w-4 h-4" /> Mở minh chứng theo tiêu chí</Button>
          <Button variant="outline" onClick={onPreCheck}><Sparkles className="w-4 h-4" /> Tiền kiểm hồ sơ</Button>
          <Button onClick={onSubmit}><Send className="w-4 h-4" /> Nộp chính thức</Button>
        </div>
      </div>
    </>
  );
}

function CriteriaSection({ criteriaKey, cards }: { criteriaKey: string; cards: typeof EVIDENCE_CARDS }) {
  const c = CRITERIA.find((x) => x.key === criteriaKey)!;
  const cp = CURRENT_PROFILE.criteriaProgress[criteriaKey];
  const suggested = SUGGEST[criteriaKey] ?? [];

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h4 className="font-bold text-brand-deep text-lg flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: c.color }}>{c.short.slice(0, 2)}</span>
            {c.label}
          </h4>
          <p className="text-sm text-muted-foreground mt-1">{REQUIREMENT[criteriaKey]}</p>
        </div>
        <div className="w-40">
          <div className="flex items-center justify-between text-xs mb-1"><span className="text-muted-foreground">Tiến độ</span><span className="font-bold text-brand-deep">{cp.progress}%</span></div>
          <Progress value={cp.progress} tint={c.color} />
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="p-6 rounded-2xl bg-[#F4FBFF] text-center">
          <CircleAlert className="w-8 h-8 mx-auto text-amber-500 mb-2" />
          <div className="font-semibold text-brand-deep">Chưa có minh chứng cho tiêu chí này</div>
          <div className="text-xs text-muted-foreground mt-1">Tải minh chứng cho tiêu chí {c.label} để 5TOT bắt đầu tiền kiểm.</div>
          <Link to="/app/evidence"><Button className="mt-3"><FolderUp className="w-4 h-4" /> Mở workspace minh chứng</Button></Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {cards.map((ev) => (
            <EvidenceCardView key={ev.id} ev={ev} />
          ))}
        </div>
      )}

      {suggested.length > 0 && (
        <div className="mt-4 p-4 rounded-2xl bg-[#EEF9FF]">
          <div className="text-xs font-bold text-brand-deep mb-2 uppercase">Minh chứng gợi ý</div>
          <div className="flex flex-wrap gap-2">
            {suggested.map((s) => <Chip key={s} tone="brand">{s}</Chip>)}
          </div>
        </div>
      )}
    </div>
  );
}

function EvidenceCardView({ ev }: { ev: typeof EVIDENCE_CARDS[number] }) {
  const st = EVIDENCE_STATUS[ev.status];
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card-soft p-4">
      <div className="flex gap-3">
        <img src={ev.preview} className="w-20 h-28 rounded-xl object-cover bg-[#EEF9FF] shrink-0" alt="" onError={(e) => ((e.currentTarget as HTMLImageElement).style.opacity = "0.4")} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-[11px] uppercase font-bold text-muted-foreground">{ev.type}</div>
            <Chip tone={st.tone === "error" ? "error" : st.tone}>{st.label}</Chip>
          </div>
          <div className="font-semibold text-brand-deep text-sm mt-0.5 truncate" title={ev.fileName}>{ev.fileName}</div>
          <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
            {Object.entries(ev.extracted).slice(0, 4).map(([k, v]) => (
              <div key={k} className="truncate"><span className="text-muted-foreground">{k}: </span><b className="text-brand-deep">{v}</b></div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px]">
            <Chip tone={ev.confidence >= 0.85 ? "success" : ev.confidence >= 0.7 ? "brand" : "warning"}>AI {Math.round(ev.confidence * 100)}%</Chip>
            <Chip tone="muted">Gợi ý: {LEVELS.find(l => l.key === ev.levelSuggest)?.label}</Chip>
          </div>
          {ev.warnings.length > 0 && (
            <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2 flex items-start gap-1.5">
              <TriangleAlert className="w-3 h-3 mt-0.5 shrink-0" /> {ev.warnings[0]}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 mt-3">
            <button className="text-[11px] px-2.5 py-1 rounded-lg bg-[#EEF9FF] text-brand-deep font-semibold hover:bg-[#dff2ff]"><PencilLine className="w-3 h-3 inline mr-1" />Chỉnh sửa thông tin bóc tách</button>
            <button className="text-[11px] px-2.5 py-1 rounded-lg bg-[#EEF9FF] text-brand-deep font-semibold hover:bg-[#dff2ff]"><FolderUp className="w-3 h-3 inline mr-1" />Thay minh chứng</button>
            <button className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100"><CheckCircle2 className="w-3 h-3 inline mr-1" />Dùng cho tiêu chí này</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const REQUIREMENT: Record<string, string> = {
  "dao-duc": "Điểm rèn luyện ≥ 80, không vi phạm kỷ luật, có phiếu xác nhận của Khoa.",
  "hoc-tap": "GPA ≥ 3.2 (Cấp Trường) — ≥ 3.6 (Cấp Thành phố). Khuyến khích có NCKH/giải thưởng học thuật.",
  "the-luc": "Đạt chuẩn rèn luyện thể lực, có giấy CN Sinh viên khoẻ hoặc thành tích thể thao.",
  "tinh-nguyen": "≥ 3 ngày (Cấp Trường) / ≥ 5 ngày (Cấp Thành phố) tình nguyện, có giấy CN của tổ chức Đoàn–Hội.",
  "hoi-nhap": "Có chứng chỉ ngoại ngữ hợp lệ hoặc tham gia hoạt động giao lưu quốc tế / hội thảo.",
};
const SUGGEST: Record<string, string[]> = {
  "dao-duc": ["Phiếu điểm rèn luyện HK1", "Phiếu điểm rèn luyện HK2", "Phiếu xác nhận Khoa"],
  "hoc-tap": ["Bảng điểm HK1", "Giấy khen NCKH", "Học bổng khuyến khích học tập"],
  "the-luc": ["Giấy CN Sinh viên khoẻ", "Giải thể thao SV cấp Trường/Thành phố"],
  "tinh-nguyen": ["Mùa hè xanh", "Tiếp sức mùa thi", "Hiến máu nhân đạo", "Xuân tình nguyện"],
  "hoi-nhap": ["IELTS / TOEIC / HSK / JLPT", "Hội thảo quốc tế", "Giao lưu sinh viên quốc tế"],
};
