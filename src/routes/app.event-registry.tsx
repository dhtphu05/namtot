import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip, Progress } from "@/components/ui-kit";
import { AppIcon } from "@/components/AppIcon";
import { CRITERIA, EVENT_PARTICIPANTS, INDEXING_STATUS_LABEL } from "@/lib/mock-data";
import { useApp } from "@/lib/store";
import { useState } from "react";
import { toast } from "sonner";
import { Search, UploadCloud, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/app/event-registry")({
  component: EventRegistryPage,
});

function EventRegistryPage() {
  const events = useApp((s) => s.events);
  const indexRoster = useApp((s) => s.indexEventRoster);
  const pushAudit = useApp((s) => s.pushAudit);
  const [active, setActive] = useState(events[0]?.id);
  const [q, setQ] = useState("");
  const [criterion, setCriterion] = useState("all");

  const filtered = events.filter((e) =>
    (criterion === "all" || e.criterion === criterion) &&
    (q === "" || e.eventName.toLowerCase().includes(q.toLowerCase()) || e.organizer.toLowerCase().includes(q.toLowerCase()))
  );
  const event = events.find((e) => e.id === active) ?? events[0];
  const rosterRows = EVENT_PARTICIPANTS.filter((p) => p.eventId === event?.id);

  const confirmIndex = () => {
    if (!event) return;
    indexRoster(event.id);
    pushAudit({ actor: "Cán bộ HSV", role: "Cán bộ", action: `Xác nhận index danh sách — ${event.eventName}`, before: "needs_review", after: "indexed", reason: "Đã đối chiếu cột và xác nhận" });
    toast.success("Đã xác nhận indexed — sự kiện có thể được sinh viên import");
  };

  return (
    <>
      <TopBar
        title="Trung tâm nhập dữ liệu sự kiện"
        subtitle="HSV / Đoàn Trường upload danh sách tham gia — VNPT SmartReader OCR/index vào Event Registry"
        action={<Button><UploadCloud className="w-4 h-4" /> Upload danh sách mới</Button>}
      />

      <div className="grid lg:grid-cols-12 gap-4">
        {/* MASTER */}
        <aside className="lg:col-span-4 space-y-3">
          <Card className="!p-3 space-y-2">
            <div className="flex items-center gap-2 bg-[#F6F9FC] rounded-lg px-2.5 py-1.5">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm sự kiện, đơn vị..." className="bg-transparent flex-1 text-[12.5px] focus:outline-none" />
            </div>
            <div className="flex flex-wrap gap-1">
              <FilterChip active={criterion === "all"} onClick={() => setCriterion("all")}>Tất cả</FilterChip>
              {CRITERIA.map((c) => (
                <FilterChip key={c.key} active={criterion === c.key} onClick={() => setCriterion(c.key)}>{c.short}</FilterChip>
              ))}
            </div>
          </Card>
          <Card className="!p-2">
            <ul className="space-y-1">
              {filtered.map((e) => {
                const st = INDEXING_STATUS_LABEL[e.indexingStatus];
                const isActive = e.id === active;
                return (
                  <li key={e.id}>
                    <button onClick={() => setActive(e.id)} className={`w-full text-left p-2.5 rounded-lg ${isActive ? "bg-[#F1F7FD]" : "hover:bg-[#F6F9FC]"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[13px] font-semibold text-brand-deep truncate flex-1">{e.eventName}</div>
                        <Chip tone={st.tone === "error" ? "error" : st.tone}>{st.label}</Chip>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{e.organizer} • {e.organizerLevel} • {e.participantCount} SV</div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </aside>

        {/* CENTER */}
        <section className="lg:col-span-5 space-y-3">
          {event && (
            <>
              <Card>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Sự kiện</div>
                    <h3 className="font-bold text-brand-deep text-[17px] mt-0.5">{event.eventName}</h3>
                    <div className="text-[12px] text-muted-foreground mt-0.5">{event.organizer} • {event.startDate} → {event.endDate}</div>
                  </div>
                  <Chip tone={event.rosterIndexed ? "success" : "warning"}>{event.rosterIndexed ? "Đã index" : "Chờ xác nhận"}</Chip>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Pill label="Quy đổi" value={`${event.convertedValue} ${event.convertedUnit}`} />
                  <Pill label="Người tham gia" value={String(event.participantCount)} />
                  <Pill label="Cấp tổ chức" value={event.organizerLevel} />
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-brand-deep text-[14px]">File danh sách & trạng thái indexing</h4>
                  <Chip tone="brand">SmartReader OCR</Chip>
                </div>
                <div className="rounded-lg bg-[#F6F9FC] p-3 flex items-center gap-3">
                  <img src={event.rosterFileUrl} alt="" className="w-14 h-18 rounded-md object-cover" />
                  <div className="min-w-0 flex-1 text-[12.5px]">
                    <div className="font-semibold text-brand-deep truncate">DS_{event.eventName.replace(/\s+/g, "_")}.xlsx</div>
                    <div className="text-[11px] text-muted-foreground">SmartReader đã bóc tách 5 cột: Họ tên, MSSV, Lớp, Khoa, Trạng thái</div>
                    <div className="mt-1.5"><Progress value={event.rosterIndexed ? 100 : 65} /></div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-brand-deep text-[14px]">Bảng danh sách đã bóc tách</h4>
                  <span className="text-[11px] text-muted-foreground">{rosterRows.length} dòng • Index quality 96%</span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-[#EEF2F7]">
                  <table className="w-full text-[12px]">
                    <thead className="bg-[#F6F9FC] text-left text-muted-foreground">
                      <tr><th className="px-3 py-2">Họ tên</th><th className="px-3 py-2">MSSV</th><th className="px-3 py-2">Lớp</th><th className="px-3 py-2">Khoa</th><th className="px-3 py-2">Tham gia</th><th className="px-3 py-2">Quy đổi</th></tr>
                    </thead>
                    <tbody>
                      {rosterRows.map((p) => (
                        <tr key={p.id} className="border-t border-[#EEF2F7]">
                          <td className="px-3 py-2 font-semibold text-brand-deep">{p.studentName}</td>
                          <td className="px-3 py-2">{p.studentCode}</td>
                          <td className="px-3 py-2">{p.className}</td>
                          <td className="px-3 py-2">{p.faculty}</td>
                          <td className="px-3 py-2"><Chip tone={p.participationStatus === "Tham gia" ? "success" : "muted"}>{p.participationStatus}</Chip></td>
                          <td className="px-3 py-2 font-semibold">{p.convertedValue}</td>
                        </tr>
                      ))}
                      {rosterRows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Chưa có dòng nào — file đang chờ index.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </section>

        {/* RIGHT */}
        <aside className="lg:col-span-3 space-y-3">
          {event && (
            <>
              <Card>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Mapping & quy đổi</div>
                <KV k="Tiêu chí áp dụng" v={CRITERIA.find(c => c.key === event.criterion)?.label ?? "Ưu tiên"} />
                <KV k="Cấp xét được phép" v={event.eligibleLevels.join(", ")} />
                <KV k="Đơn vị quy đổi" v={`${event.convertedValue} ${event.convertedUnit}`} />
                <KV k="Trường bắt buộc" v={event.requiredFields.join(", ")} />
              </Card>
              <Card>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Mẫu giấy chứng nhận</div>
                <img src={event.sampleCertificateUrl} alt="" className="w-full rounded-md border border-[#EEF2F7]" />
              </Card>
              <Card>
                <div className="text-[12.5px] text-muted-foreground mb-2">{event.notes}</div>
                <Button className="w-full" onClick={confirmIndex} disabled={event.rosterIndexed}>
                  <CheckCircle2 className="w-4 h-4" /> {event.rosterIndexed ? "Đã xác nhận index" : "Xác nhận đợt index"}
                </Button>
              </Card>
            </>
          )}
        </aside>
      </div>
    </>
  );
}

function FilterChip({ active, children, onClick }: any) {
  return <button onClick={onClick} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${active ? "bg-[#0057C2] text-white" : "bg-[#F1F7FD] text-brand-deep"}`}>{children}</button>;
}
function Pill({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-[#F6F9FC] p-2"><div className="text-[10.5px] uppercase text-muted-foreground font-semibold">{label}</div><div className="text-[13.5px] font-bold text-brand-deep mt-0.5">{value}</div></div>;
}
function KV({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3 py-1.5 border-b border-[#EEF2F7] last:border-0 text-[12px]"><span className="text-muted-foreground">{k}</span><span className="font-semibold text-brand-deep text-right">{v}</span></div>;
}
