import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip } from "@/components/ui-kit";
import { CRITERIA, EVENT_PARTICIPANTS, LEVELS, CURRENT_STUDENT } from "@/lib/mock-data";
import { useApp } from "@/lib/store";
import { useState } from "react";
import { Search, ListChecks, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/event-library")({
  component: EventLibrary,
});

function EventLibrary() {
  const events = useApp((s) => s.events);
  const addEvidence = useApp((s) => s.addEvidence);
  const pushAudit = useApp((s) => s.pushAudit);
  const [q, setQ] = useState("");
  const [criterion, setCriterion] = useState("all");
  const [check, setCheck] = useState<Record<string, { ok: boolean; converted?: number }>>({});

  const filtered = events.filter((e) =>
    (criterion === "all" || e.criterion === criterion) &&
    (q === "" || e.eventName.toLowerCase().includes(q.toLowerCase()) || e.organizer.toLowerCase().includes(q.toLowerCase()))
  );

  const checkName = (id: string) => {
    const p = EVENT_PARTICIPANTS.find((x) => x.eventId === id && x.studentCode === CURRENT_STUDENT.mssv);
    const ev = events.find((e) => e.id === id)!;
    setCheck((c) => ({ ...c, [id]: { ok: !!p, converted: p?.convertedValue ?? ev.convertedValue } }));
    if (p) toast.success(`Tìm thấy ${p.studentName} — được tính ${p.convertedValue} ${ev.convertedUnit}`);
    else toast.warning("Chưa tìm thấy MSSV của bạn trong danh sách đã index");
  };

  const importEv = (id: string) => {
    const ev = events.find((e) => e.id === id)!;
    addEvidence({
      id: `evd-${Date.now()}`, applicationId: "app-2025-2026",
      evidenceName: `Giấy chứng nhận ${ev.eventName}`, criterion: ev.criterion as any,
      sourceType: "event_import", eventId: ev.id, fileUrl: ev.sampleCertificateUrl,
      indexingStatus: "indexed",
      extractedFields: { "Họ tên": CURRENT_STUDENT.name, "MSSV": CURRENT_STUDENT.mssv, "Hoạt động": ev.eventName, "Quy đổi": `${ev.convertedValue} ${ev.convertedUnit}`, "Đơn vị cấp": ev.organizer, "Cấp tổ chức": ev.organizerLevel },
      matchedEvent: ev.id, matchedKnowledgeItems: [],
      confidence: 0.94, reviewStatus: "pending", warnings: [], levelSuggest: ev.eligibleLevels[0],
    });
    pushAudit({ actor: CURRENT_STUDENT.name, role: "Sinh viên", action: `Import sự kiện từ Kho — ${ev.eventName}`, before: "Chưa có", after: `${ev.convertedValue} ${ev.convertedUnit}`, reason: "Match danh sách đã index" });
    toast.success("Đã import minh chứng vào hồ sơ");
  };

  return (
    <>
      <TopBar
        title="Kho minh chứng & sự kiện hợp lệ"
        subtitle="Tìm các sự kiện đã được Đoàn / Hội xác nhận trước khi nộp minh chứng"
      />

      <Card className="!p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-[#F6F9FC] rounded-lg px-3 py-2 flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tên minh chứng, tên sự kiện, đơn vị tổ chức…" className="bg-transparent flex-1 text-[13px] focus:outline-none" />
          </div>
          <select value={criterion} onChange={(e) => setCriterion(e.target.value)} className="bg-[#F6F9FC] rounded-lg px-3 py-2 text-[12.5px] font-semibold text-brand-deep">
            <option value="all">Tất cả tiêu chí</option>
            {CRITERIA.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((e) => {
          const cr = CRITERIA.find(c => c.key === e.criterion);
          const c = check[e.id];
          return (
            <Card key={e.id} className="!p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="font-bold text-brand-deep text-[14px] leading-snug">{e.eventName}</div>
                  <div className="text-[11.5px] text-muted-foreground mt-0.5">{e.organizer} • {e.organizerLevel}</div>
                </div>
                <Chip tone="success">Indexed</Chip>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {cr && <Chip tone="brand">{cr.label}</Chip>}
                <Chip>{e.convertedValue} {e.convertedUnit}</Chip>
                <Chip tone="muted">{e.participantCount} SV</Chip>
              </div>
              <div className="text-[11.5px] text-muted-foreground mb-2">Cấp xét: {e.eligibleLevels.map(lv => LEVELS.find(l => l.key === lv)?.label).join(" / ")}</div>
              <img src={e.sampleCertificateUrl} alt="" className="rounded-md border border-[#EEF2F7] mb-2 max-h-32 object-cover w-full" />
              {c && (
                <div className={`text-[11.5px] rounded-md p-2 mb-2 flex items-start gap-1.5 ${c.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                  {c.ok ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                  {c.ok ? `Tìm thấy ${CURRENT_STUDENT.name} — được tính ${c.converted} ${e.convertedUnit}` : "Chưa tìm thấy MSSV trong danh sách — bạn có thể upload GCN để cán bộ xác minh."}
                </div>
              )}
              <div className="mt-auto flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => checkName(e.id)} className="flex-1"><ListChecks className="w-3.5 h-3.5" /> Kiểm tra tên tôi</Button>
                <Button size="sm" onClick={() => importEv(e.id)} disabled={!c?.ok} className="flex-1">Import vào hồ sơ</Button>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
