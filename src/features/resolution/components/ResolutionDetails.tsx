import { useParams, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Chip, Button } from "@/components/ui-kit";
import { RESOLUTION_CASES } from "@/lib/mock-data";
import { useApp } from "@/lib/store";
import { Check, X, ArrowDownToLine, MessageSquare } from "lucide-react";
import { toast } from "sonner";



export function ResolutionDetails() {
  const { id } = useParams({ from: "/app/resolution/$id" });
  const c = RESOLUTION_CASES.find((x) => x.id === id) ?? RESOLUTION_CASES[0];
  const pushAudit = useApp((s) => s.pushAudit);
  const pushNotification = useApp((s) => s.pushNotification);

  const decide = (label: string, tone: string) => {
    pushAudit({ actor: "Hội đồng cấp Trường", role: "Quản lý", action: `Resolution: ${label}`, before: "Mập mờ", after: label, reason: `Case ${c.id}` });
    pushNotification({ title: `Resolution: ${label}`, desc: `Hồ sơ ${c.student} — ${c.type}`, type: tone as any });
    toast.success(`✓ Đã lưu tiền lệ xét duyệt: ${label}`);
  };

  return (
    <>
      <TopBar title={`Resolution — ${c.student}`} subtitle={c.type} action={<Link to="/app/resolution"><Button variant="ghost">← Danh sách</Button></Link>} />
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <h3 className="font-bold text-brand-deep mb-3">AI Analysis</h3>
          <div className="p-4 rounded-2xl bg-[#F4FBFF] text-sm">
            VNPT SmartReader đã phân tích minh chứng nhưng <b>confidence chỉ {Math.round(c.confidence * 100)}%</b> do hoạt động chưa có tiền lệ trong Knowledge Base. Đã tìm thấy <b>{c.similar} case tương tự</b> với decision không đồng nhất, cần hội đồng quyết định.
          </div>

          <h3 className="font-bold text-brand-deep mt-6 mb-3">Case tương tự</h3>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3 rounded-xl bg-white shadow-sm flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">Case #2025-{120 + i} — Sinh viên Nguyễn Văn {String.fromCharCode(65 + i)}</div>
                  <div className="text-xs text-muted-foreground">Tiêu chí: {c.criteria} • Decision: {i === 1 ? "Không công nhận" : "Công nhận"}</div>
                </div>
                <Chip tone={i === 1 ? "error" : "success"}>{i === 1 ? "Không công nhận" : "Công nhận"}</Chip>
              </div>
            ))}
          </div>

          <h3 className="font-bold text-brand-deep mt-6 mb-3">Officer notes</h3>
          <textarea placeholder="Ghi chú của cán bộ phụ trách..." className="w-full p-4 rounded-xl bg-[#F4FBFF] text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]" rows={3} defaultValue="Trường hợp này cần đối chiếu thêm với quy định mới của Trung ương Hội về hoạt động NCKH." />
        </Card>

        <Card glow>
          <h3 className="font-bold text-brand-deep mb-3">Quyết định hội đồng</h3>
          <div className="space-y-2">
            <Button variant="success" className="w-full" onClick={() => decide("Công nhận", "success")}><Check className="w-4 h-4" /> Công nhận</Button>
            <Button variant="danger" className="w-full" onClick={() => decide("Không công nhận", "error")}><X className="w-4 h-4" /> Không công nhận</Button>
            <Button variant="secondary" className="w-full" onClick={() => decide("Yêu cầu bổ sung", "warning")}><MessageSquare className="w-4 h-4" /> Yêu cầu bổ sung</Button>
            <Button variant="outline" className="w-full" onClick={() => decide("Chuyển cấp xét phù hợp", "info")}><ArrowDownToLine className="w-4 h-4" /> Xét xuống cấp thấp hơn</Button>
          </div>
          <div className="mt-5 p-3 rounded-xl bg-emerald-50 text-xs text-emerald-800">
            ℹ️ Quyết định sẽ được lưu vào Knowledge Base làm <b>tiền lệ</b> cho các case tương tự.
          </div>
        </Card>
      </div>
    </>
  );
}
