import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip, Progress, StatCard } from "@/components/ui-kit";
import { AppIcon, IconTile } from "@/components/AppIcon";
import { CURRENT_COLLECTIVE, COLLECTIVE_ROSTER, MEDIA, PROFILE_STATUS, SAMPLE_GCN } from "@/lib/mock-data";
import { UsersRound, ArrowRight, History, Send, UploadCloud, FileText, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/app/collective")({
  component: CollectiveWorkspace,
});

const CRITERIA_TC = [
  { key: "participation", label: "Danh sách 100% SV tham gia phong trào", icon: "roster" as const, evidence: ["Roster lớp HK1", "Roster lớp HK2"], file: SAMPLE_GCN },
  { key: "achieved", label: "Danh sách SV đạt SV5T cấp Trường", icon: "ok" as const, evidence: ["QĐ công nhận SV5T cấp Trường — 12 SV"], file: SAMPLE_GCN },
  { key: "higher", label: "Minh chứng SV đạt cấp cao hơn", icon: "aim" as const, evidence: ["QĐ SV5T cấp ĐHĐN — 4 SV"], file: SAMPLE_GCN },
  { key: "noViolation", label: "Xác nhận không có SV vi phạm", icon: "ok" as const, evidence: ["Văn bản xác nhận của Khoa CNTT"], file: SAMPLE_GCN },
  { key: "activity", label: "Ảnh hoạt động tập thể", icon: "evidence" as const, evidence: ["Album Mùa hè xanh", "Album Tiếp sức mùa thi"], file: MEDIA.events[0] },
  { key: "minutes", label: "Biên bản / xác nhận triển khai phong trào", icon: "audit" as const, evidence: ["Biên bản họp chi hội HK1", "Biên bản bình bầu"], file: SAMPLE_GCN },
  { key: "report", label: "Báo cáo hoạt động tập thể", icon: "kb" as const, evidence: ["Báo cáo công tác Chi hội năm học 2025–2026"], file: SAMPLE_GCN },
];

function CollectiveWorkspace() {
  const c = CURRENT_COLLECTIVE;
  const status = PROFILE_STATUS[c.status];
  const ratioRegister = Math.round((c.registered / c.total) * 100);
  const ratioPass = Math.round(((c.sv5tTruong + c.sv5tHigher) / c.total) * 100);
  const [active, setActive] = useState("participation");
  const [filter, setFilter] = useState<"all" | "registered" | "sv5t" | "noViolation">("all");

  const rows = COLLECTIVE_ROSTER.filter((r) =>
    filter === "all" ? true :
    filter === "registered" ? r.registered :
    filter === "sv5t" ? r.sv5t !== "—" :
    !r.violation
  );

  const block = CRITERIA_TC.find(x => x.key === active)!;

  return (
    <>
      <TopBar
        title={`Hồ sơ Tập thể SV5T — ${c.name}`}
        subtitle={`Một hồ sơ duy nhất cho năm học ${c.schoolYear} • Tự động lưu lúc ${c.lastSavedAt}`}
        action={<Button><Send className="w-4 h-4" /> Nộp chính thức</Button>}
      />

      <Card className="mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-12 h-12 rounded-lg bg-[#0057C2] text-white flex items-center justify-center"><UsersRound className="w-6 h-6" /></div>
          <div className="min-w-0">
            <div className="font-bold text-brand-deep">{c.name} — {c.type}</div>
            <div className="text-[12px] text-muted-foreground">Một hồ sơ chính thức cho mùa xét • {c.schoolYear}</div>
          </div>
          <span className={`text-[11.5px] px-3 py-1 rounded-full font-semibold ml-auto ${status.color}`}>{status.label}</span>
          <Chip tone="brand">Aim: Cấp Trường</Chip>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Tổng sinh viên" value={c.total} icon={<UsersRound className="w-4 h-4" />} />
        <StatCard label="Tỷ lệ tham gia phong trào" value={`${ratioRegister}%`} icon={<CheckCircle2 className="w-4 h-4" />} tint="#22C55E" />
        <StatCard label="Đạt SV5T cấp Trường" value={c.sv5tTruong} icon={<FileText className="w-4 h-4" />} tint="#0e7bcf" />
        <StatCard label="Tỷ lệ đạt danh hiệu" value={`${ratioPass}%`} icon={<FileText className="w-4 h-4" />} tint="#0057C2" />
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        {/* LEFT: roster */}
        <aside className="lg:col-span-4">
          <Card className="!p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-brand-deep text-[13px]">Danh sách Chi hội</h4>
              <span className="text-[11px] text-muted-foreground">{rows.length}/{COLLECTIVE_ROSTER.length}</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {[
                { k: "all", l: "Tất cả" },
                { k: "registered", l: "Đã đăng ký" },
                { k: "sv5t", l: "Đạt SV5T" },
                { k: "noViolation", l: "Không vi phạm" },
              ].map((f) => (
                <button key={f.k} onClick={() => setFilter(f.k as any)} className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${filter === f.k ? "bg-[#0057C2] text-white" : "bg-[#F1F7FD] text-brand-deep"}`}>{f.l}</button>
              ))}
            </div>
            <ul className="space-y-1">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-[#F6F9FC]">
                  <div className="w-7 h-7 rounded-md bg-[#F1F7FD] flex items-center justify-center text-[11px] text-[#0057C2] font-bold">{r.name.split(" ").slice(-1)[0][0]}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-brand-deep truncate">{r.name}</div>
                    <div className="text-[10.5px] text-muted-foreground">{r.mssv} • SV5T: {r.sv5t}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </aside>

        {/* CENTER: collective criteria dashboard */}
        <section className="lg:col-span-5 space-y-3">
          <Card>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Minh chứng tập thể theo tiêu chí</div>
            <ul className="space-y-1">
              {CRITERIA_TC.map((b) => (
                <li key={b.key}>
                  <button onClick={() => setActive(b.key)} className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2.5 ${active === b.key ? "bg-[#F1F7FD]" : "hover:bg-[#F6F9FC]"}`}>
                    <IconTile name={b.icon} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-semibold text-brand-deep">{b.label}</div>
                      <div className="text-[11px] text-muted-foreground">{b.evidence.length} minh chứng</div>
                    </div>
                    <Chip tone="success">Đủ</Chip>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-brand-deep text-[14px]">{block.label}</h4>
              <Button size="sm" variant="secondary"><UploadCloud className="w-3.5 h-3.5" /> Upload / Import từ Event Registry</Button>
            </div>
            <img src={block.file} alt="" className="w-full max-h-[360px] object-contain bg-[#F6F9FC] rounded-md border border-[#EEF2F7]" />
            <ul className="mt-3 text-[12.5px] space-y-1">
              {block.evidence.map((e) => <li key={e} className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />{e}</li>)}
            </ul>
          </Card>
        </section>

        {/* RIGHT: progress */}
        <aside className="lg:col-span-3 space-y-3">
          <Card>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Readiness tập thể</div>
            <div className="text-[32px] font-extrabold text-brand-deep leading-none">{c.progress}%</div>
            <div className="mt-2"><Progress value={c.progress} /></div>
            <ul className="text-[11.5px] text-amber-800 bg-amber-50 rounded-md p-3 mt-3 space-y-1">
              <li>• Cần ảnh hoạt động HK2</li>
              <li>• Còn thiếu xác nhận Đoàn Trường</li>
            </ul>
          </Card>
          <Card>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Hành động</div>
            <div className="space-y-2">
              <Button className="w-full" variant="secondary"><UploadCloud className="w-4 h-4" /> Upload minh chứng</Button>
              <Button className="w-full" variant="outline"><History className="w-4 h-4" /> Lịch sử cập nhật</Button>
              <Link to="/app/collective/$id" params={{ id: c.id }}><Button className="w-full"><ArrowRight className="w-4 h-4" /> Xem chi tiết</Button></Link>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}
