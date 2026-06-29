import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Chip, Button } from "@/components/ui-kit";
import { CRITERIA, LEVELS, OFFICERS } from "@/lib/mock-data";
import { useApp } from "@/lib/store";
import { useState } from "react";
import { ChevronRight, Filter } from "lucide-react";

export const Route = createFileRoute("/app/queue")({
  component: Queue,
});

const TASK_STATUS = {
  waiting: { label: "Chờ xét", tone: "muted" as const },
  reviewing: { label: "Đang xét", tone: "brand" as const },
  supplement_required: { label: "Cần bổ sung", tone: "warning" as const },
  accepted: { label: "Đạt tiêu chí", tone: "success" as const },
  rejected: { label: "Không đạt", tone: "error" as const },
  resolution_needed: { label: "Resolution", tone: "warning" as const },
};
const SOURCE_LABEL: Record<string, string> = {
  metric_input: "Nhập chỉ số",
  event_import: "Import sự kiện",
  manual_upload: "Upload thủ công",
  collective_import: "Tập thể import",
};

function Queue() {
  const tasks = useApp((s) => s.tasks);
  const [criterion, setCriterion] = useState<string>("all");
  const [statusF, setStatusF] = useState<string>("all");
  const [officerF, setOfficerF] = useState<string>("all");

  // simulate "current officer" = cb-001
  const filtered = tasks.filter((t) =>
    (criterion === "all" || t.criterion === criterion) &&
    (statusF === "all" || t.status === statusF) &&
    (officerF === "all" || t.assignedOfficerId === officerF)
  );

  return (
    <>
      <TopBar title="Hàng chờ xét duyệt" subtitle={`${filtered.length} task minh chứng — phân theo cán bộ và tiêu chí chuyên môn`} />

      {/* Criterion tabs */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <Tab active={criterion === "all"} onClick={() => setCriterion("all")} count={tasks.length}>Tất cả task của tôi</Tab>
        {CRITERIA.map((c) => (
          <Tab key={c.key} active={criterion === c.key} onClick={() => setCriterion(c.key)} count={tasks.filter(t => t.criterion === c.key).length}>{c.label}</Tab>
        ))}
        <Tab active={criterion === "priority"} onClick={() => setCriterion("priority")} count={tasks.filter(t => t.criterion === "priority").length}>Ưu tiên</Tab>
      </div>

      <Card className="!p-3 mb-3">
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[12px] font-semibold text-muted-foreground mr-1">Lọc:</span>
          <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="bg-[#F6F9FC] rounded-lg px-3 py-1.5 text-[12px] font-semibold text-brand-deep">
            <option value="all">Mọi trạng thái</option>
            {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={officerF} onChange={(e) => setOfficerF(e.target.value)} className="bg-[#F6F9FC] rounded-lg px-3 py-1.5 text-[12px] font-semibold text-brand-deep">
            <option value="all">Mọi cán bộ phụ trách</option>
            {OFFICERS.map((o) => <option key={o.id} value={o.id}>{o.name} — {o.role}</option>)}
          </select>
        </div>
      </Card>

      <Card className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-[#F6F9FC] text-left text-muted-foreground text-[11px] uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2.5">Sinh viên</th>
                <th className="px-3 py-2.5">Tên minh chứng</th>
                <th className="px-3 py-2.5">Tiêu chí</th>
                <th className="px-3 py-2.5">Cấp aim</th>
                <th className="px-3 py-2.5">Nguồn</th>
                <th className="px-3 py-2.5">Cán bộ</th>
                <th className="px-3 py-2.5">AI</th>
                <th className="px-3 py-2.5">Trạng thái</th>
                <th className="px-3 py-2.5">Hạn</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const st = TASK_STATUS[t.status];
                const cr = CRITERIA.find(c => c.key === t.criterion);
                const officer = OFFICERS.find(o => o.id === t.assignedOfficerId);
                return (
                  <tr key={t.id} className="border-t border-[#EEF2F7] hover:bg-[#F6F9FC]">
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-brand-deep">{t.studentName}</div>
                      <div className="text-[11px] text-muted-foreground">{t.studentMssv} • {t.studentKhoa}</div>
                    </td>
                    <td className="px-3 py-2.5 max-w-[260px]"><div className="font-semibold text-brand-deep truncate" title={t.evidenceName}>{t.evidenceName}</div></td>
                    <td className="px-3 py-2.5"><Chip tone="brand">{cr?.label ?? "Ưu tiên"}</Chip></td>
                    <td className="px-3 py-2.5 text-[11.5px]">{LEVELS.find(l => l.key === t.targetLevel)?.label}</td>
                    <td className="px-3 py-2.5"><Chip tone="muted">{SOURCE_LABEL[t.sourceType]}</Chip></td>
                    <td className="px-3 py-2.5 text-[11.5px]">{officer?.name ?? "—"}</td>
                    <td className="px-3 py-2.5"><Chip tone={t.confidence < 0.7 ? "warning" : "brand"}>{Math.round(t.confidence * 100)}%</Chip></td>
                    <td className="px-3 py-2.5"><Chip tone={st.tone}>{st.label}</Chip></td>
                    <td className="px-3 py-2.5 text-[11.5px]">{t.dueDate}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Link to="/app/review/$id" params={{ id: t.studentId }} className="text-[#0057C2] hover:underline inline-flex items-center gap-1 text-[12px] font-semibold">Mở<ChevronRight className="w-3.5 h-3.5" /></Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">Không có task phù hợp với bộ lọc.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function Tab({ active, onClick, count, children }: any) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold flex items-center gap-2 ${active ? "bg-[#0057C2] text-white" : "bg-white border border-[#EEF2F7] text-brand-deep hover:bg-[#F1F7FD]"}`}>
      {children}
      <span className={`text-[10.5px] px-1.5 py-0.5 rounded ${active ? "bg-white/20" : "bg-[#F1F7FD] text-[#0057C2]"}`}>{count}</span>
    </button>
  );
}
