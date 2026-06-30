import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip, Progress } from "@/components/ui-kit";
import { AppIcon, CriterionIcon } from "@/components/AppIcon";
import { CRITERIA, OFFICERS } from "@/lib/mock-data";
import { useApp } from "@/lib/store";
import { toast } from "sonner";



export function TaskAssignment() {
  const tasks = useApp((s) => s.tasks);
  const assign = useApp((s) => s.assignTask);
  const pushAudit = useApp((s) => s.pushAudit);

  const reassign = (taskId: string, officerId: string) => {
    assign(taskId, officerId);
    const officer = OFFICERS.find(o => o.id === officerId);
    pushAudit({ actor: "Quản lý hệ thống", role: "Quản lý", action: `Phân công lại task ${taskId} → ${officer?.name}`, before: "—", after: officer?.name ?? "", reason: "Manager reassignment" });
    toast.success(`Đã phân công cho ${officer?.name}`);
  };

  return (
    <>
      <TopBar title="Phân công cán bộ xét duyệt" subtitle="Phân bổ task theo cán bộ chuyên môn, tiêu chí, khoa và mức rủi ro" />

      {/* By specialized criterion */}
      <Card className="mb-4">
        <h3 className="font-bold text-brand-deep mb-3 text-[15px] flex items-center gap-2"><AppIcon name="aim" /> Phân công theo tiêu chí chuyên môn</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {CRITERIA.map((c) => {
            const officers = OFFICERS.filter(o => o.specializedCriteria.includes(c.key));
            const count = tasks.filter(t => t.criterion === c.key).length;
            return (
              <div key={c.key} className="rounded-lg border border-[#EEF2F7] p-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-md flex items-center justify-center text-white" style={{ background: c.color }}>
                    <CriterionIcon criterion={c.key} size={14} className="text-white" color="#fff" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold text-brand-deep truncate">{c.label}</div>
                    <div className="text-[10.5px] text-muted-foreground">{count} task • {officers.length} cán bộ</div>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  {officers.map(o => (
                    <div key={o.id} className="text-[11.5px] text-muted-foreground truncate">• {o.name}{o.experienced ? " (kinh nghiệm)" : ""}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Officer workload */}
      <Card className="mb-4">
        <h3 className="font-bold text-brand-deep mb-3 text-[15px] flex items-center gap-2"><AppIcon name="officer" /> Workload từng cán bộ</h3>
        <div className="space-y-2">
          {OFFICERS.map((o) => (
            <div key={o.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F6F9FC]">
              <img src={o.avatar} className="w-10 h-10 rounded-lg object-cover" alt="" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-brand-deep text-[13px]">{o.name} {o.experienced && <span className="text-[10px] text-amber-600 font-bold">Cán bộ kinh nghiệm</span>}</div>
                <div className="text-[11px] text-muted-foreground">{o.role} • Chuyên: {o.specializedCriteria.map(k => CRITERIA.find(c => c.key === k)?.short ?? "Ưu tiên").join(", ")}</div>
              </div>
              <div className="w-48"><Progress value={(o.workload / 25) * 100} /></div>
              <span className="text-[13px] font-bold text-brand-deep w-12 text-right">{o.workload}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Task assignment table */}
      <Card>
        <h3 className="font-bold text-brand-deep mb-3 text-[15px] flex items-center gap-2"><AppIcon name="assign" /> Phân công / phân công lại task</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-[#F6F9FC] text-left text-muted-foreground text-[11px] uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2">Sinh viên</th>
                <th className="px-3 py-2">Minh chứng</th>
                <th className="px-3 py-2">Tiêu chí</th>
                <th className="px-3 py-2">AI</th>
                <th className="px-3 py-2">Cán bộ phụ trách</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const cr = CRITERIA.find(c => c.key === t.criterion);
                const eligible = OFFICERS.filter(o => o.specializedCriteria.includes(t.criterion));
                return (
                  <tr key={t.id} className="border-t border-[#EEF2F7]">
                    <td className="px-3 py-2"><div className="font-semibold text-brand-deep">{t.studentName}</div><div className="text-[11px] text-muted-foreground">{t.studentMssv}</div></td>
                    <td className="px-3 py-2 max-w-[260px] truncate">{t.evidenceName}</td>
                    <td className="px-3 py-2"><Chip tone="brand">{cr?.label ?? "Ưu tiên"}</Chip></td>
                    <td className="px-3 py-2"><Chip tone={t.confidence < 0.7 ? "warning" : "brand"}>{Math.round(t.confidence * 100)}%</Chip></td>
                    <td className="px-3 py-2">
                      <select value={t.assignedOfficerId} onChange={(e) => reassign(t.id, e.target.value)} className="bg-[#F6F9FC] rounded-lg px-2 py-1.5 text-[12px] font-semibold text-brand-deep">
                        {eligible.map(o => <option key={o.id} value={o.id}>{o.name}{o.experienced ? " (kinh nghiệm)" : ""}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
