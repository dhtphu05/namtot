import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip } from "@/components/ui-kit";
import { CRITERIA, KB_ITEMS, LEVELS } from "@/lib/mock-data";
import { useState } from "react";
import { toast } from "sonner";
import { Search, BookOpenCheck } from "lucide-react";



export function EvidenceSearch() {
  const [q, setQ] = useState("");
  const [criterion, setCriterion] = useState("all");
  const [decision, setDecision] = useState("all");
  const [active, setActive] = useState(KB_ITEMS[0].id);

  const list = KB_ITEMS.filter((k) =>
    (criterion === "all" || k.criterion === criterion) &&
    (decision === "all" || k.decision === decision) &&
    (q === "" || k.evidenceName.toLowerCase().includes(q.toLowerCase()) || (k.eventName ?? "").toLowerCase().includes(q.toLowerCase()) || k.organizer.toLowerCase().includes(q.toLowerCase()))
  );
  const item = KB_ITEMS.find((k) => k.id === active) ?? list[0];

  return (
    <>
      <TopBar
        title="Kho tri thức minh chứng"
        subtitle="Tra cứu case đã duyệt / từ chối — tham chiếu cho quyết định xét duyệt"
        action={<Button variant="secondary"><BookOpenCheck className="w-4 h-4" /> Đề xuất case mới</Button>}
      />

      <Card className="!p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-[#F6F9FC] rounded-lg px-3 py-2 flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tên minh chứng, tên sự kiện, đơn vị, tiêu chí…" className="bg-transparent flex-1 text-[13px] focus:outline-none" />
          </div>
          <select value={criterion} onChange={(e) => setCriterion(e.target.value)} className="bg-[#F6F9FC] rounded-lg px-3 py-2 text-[12.5px] font-semibold text-brand-deep">
            <option value="all">Tất cả tiêu chí</option>
            {CRITERIA.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            <option value="priority">Ưu tiên</option>
          </select>
          <select value={decision} onChange={(e) => setDecision(e.target.value)} className="bg-[#F6F9FC] rounded-lg px-3 py-2 text-[12.5px] font-semibold text-brand-deep">
            <option value="all">Mọi trạng thái</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
            <option value="needs_review">Cần xác minh</option>
          </select>
        </div>
      </Card>

      <div className="grid lg:grid-cols-12 gap-4">
        <aside className="lg:col-span-4">
          <Card className="!p-2">
            <ul className="space-y-1">
              {list.map((k) => (
                <li key={k.id}>
                  <button onClick={() => setActive(k.id)} className={`w-full text-left p-2.5 rounded-lg ${active === k.id ? "bg-[#F1F7FD]" : "hover:bg-[#F6F9FC]"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[13px] font-semibold text-brand-deep truncate flex-1">{k.evidenceName}</div>
                      <Chip tone={k.decision === "approved" ? "success" : k.decision === "rejected" ? "error" : "warning"}>{k.decision === "approved" ? "Đã duyệt" : k.decision === "rejected" ? "Từ chối" : "Cần xác minh"}</Chip>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{k.organizer} • {k.usageCount} lần dùng</div>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </aside>

        <section className="lg:col-span-5 space-y-3">
          <Card>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Case tham chiếu</div>
                <h3 className="font-bold text-brand-deep text-[17px]">{item.evidenceName}</h3>
                <div className="text-[12px] text-muted-foreground">{item.organizer} • {CRITERIA.find(c => c.key === item.criterion)?.label ?? "Ưu tiên"} • {LEVELS.find(l => l.key === item.level)?.label}</div>
              </div>
              <Chip tone={item.decision === "approved" ? "success" : item.decision === "rejected" ? "error" : "warning"}>{item.decision === "approved" ? "Đã duyệt" : item.decision === "rejected" ? "Từ chối" : "Cần xác minh"}</Chip>
            </div>
            <img src={item.sampleCertificateUrl} alt="" className="w-full rounded-md border border-[#EEF2F7] max-h-[420px] object-contain bg-[#F6F9FC]" />
          </Card>
          <Card>
            <h4 className="font-bold text-brand-deep text-[14px] mb-2">Lý do quyết định</h4>
            <p className="text-[12.5px]">{item.reason}</p>
          </Card>
          {item.similarCases.length > 0 && (
            <Card>
              <h4 className="font-bold text-brand-deep text-[14px] mb-2">Case tương tự</h4>
              <div className="flex flex-wrap gap-1.5">{item.similarCases.map(s => <Chip key={s}>{s}</Chip>)}</div>
            </Card>
          )}
        </section>

        <aside className="lg:col-span-3 space-y-3">
          <Card>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Trường bắt buộc</div>
            <ul className="text-[12.5px] space-y-1">{item.requiredFields.map(f => <li key={f} className="flex gap-1.5"><span className="text-emerald-600">•</span>{f}</li>)}</ul>
          </Card>
          {item.commonErrors.length > 0 && (
            <Card>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Lỗi thường gặp</div>
              <ul className="text-[12.5px] space-y-1 text-amber-800">{item.commonErrors.map(f => <li key={f} className="flex gap-1.5"><span>•</span>{f}</li>)}</ul>
            </Card>
          )}
          <Card>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Đã dùng</div>
            <div className="text-[24px] font-bold text-brand-deep">{item.usageCount} lần</div>
            <Button className="w-full mt-2" onClick={() => toast.success("Đã dùng làm tham chiếu cho quyết định hiện tại")}>Dùng làm tham chiếu</Button>
          </Card>
        </aside>
      </div>
    </>
  );
}
