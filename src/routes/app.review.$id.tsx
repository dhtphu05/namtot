import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip } from "@/components/ui-kit";
import { STUDENTS, EVIDENCE_SAMPLES, CRITERIA, LEVELS } from "@/lib/mock-data";
import { useApp } from "@/lib/store";
import { Check, X, MessageSquare, AlertTriangle, ArrowDownToLine, FileText, Sparkles } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export const Route = createFileRoute("/app/review/$id")({
  component: ReviewDetail,
});

function ReviewDetail() {
  const { id } = useParams({ from: "/app/review/$id" });
  const student = STUDENTS.find((s) => s.id === id) ?? STUDENTS[0];
  const [activeEv, setActiveEv] = useState(EVIDENCE_SAMPLES[0]);
  const [supplementOpen, setSupplementOpen] = useState(false);
  const pushAudit = useApp((s) => s.pushAudit);
  const pushNotification = useApp((s) => s.pushNotification);

  const approve = () => {
    pushAudit({ actor: "Nguyễn Thảo Vy", role: "Cán bộ", action: `Duyệt minh chứng: ${activeEv.name}`, before: "Đang xét", after: "Đạt", reason: "Đối chiếu đúng tiêu chí" });
    toast.success("Đã duyệt minh chứng");
  };
  const reject = () => {
    pushAudit({ actor: "Nguyễn Thảo Vy", role: "Cán bộ", action: `Từ chối minh chứng: ${activeEv.name}`, before: "Đang xét", after: "Từ chối", reason: "Không đủ điều kiện" });
    toast.error("Đã từ chối minh chứng");
  };
  const toResolution = () => {
    pushAudit({ actor: "Nguyễn Thảo Vy", role: "Cán bộ", action: "Chuyển Resolution Hub", before: "Đang xét", after: "Mập mờ", reason: "Cần hội đồng" });
    toast.info("Đã chuyển sang Resolution Hub");
  };

  return (
    <>
      <TopBar
        title={`Xét duyệt: ${student.name}`}
        subtitle={`${student.mssv} • ${student.khoa} • Cấp aim: ${LEVELS.find((l) => l.key === student.aim)?.label}`}
        action={<Link to="/app/queue"><Button variant="ghost">← Hàng chờ</Button></Link>}
      />

      <div className="grid lg:grid-cols-12 gap-5">
        {/* Left: file list + preview */}
        <Card className="lg:col-span-7 !p-4">
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
            {EVIDENCE_SAMPLES.slice(0, 6).map((e) => (
              <button key={e.id} onClick={() => setActiveEv(e)} className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold ${activeEv.id === e.id ? "gradient-brand text-white" : "bg-[#F4FBFF] text-brand-deep"}`}>
                {e.name.slice(0, 22)}...
              </button>
            ))}
          </div>
          <div className="rounded-2xl bg-[#F4FBFF] p-3 flex items-center justify-center">
            <img src={activeEv.img} alt={activeEv.name} className="max-h-[60vh] rounded-xl shadow-lg" />
          </div>
        </Card>

        {/* Middle: Evidence Card */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-brand-deep flex items-center gap-2"><FileText className="w-4 h-4" /> Evidence Card</h3>
              <Chip tone={activeEv.confidence > 0.85 ? "success" : "warning"}>AI {Math.round(activeEv.confidence * 100)}%</Chip>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ["Loại minh chứng", activeEv.name],
                ["Tiêu chí", CRITERIA.find((c) => c.key === activeEv.criteria)?.label],
                ["Đơn vị cấp", activeEv.org],
                ["Ngày cấp", activeEv.date],
                ["Cấp xét gợi ý", LEVELS.find((l) => l.key === activeEv.level)?.label],
                ...(activeEv.days ? [["Số ngày tình nguyện", `${activeEv.days} ngày`]] : []),
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-3 py-2 border-b border-[#EEF9FF] last:border-0">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-semibold text-brand-deep text-right">{v}</span>
                </div>
              ))}
            </div>
            {activeEv.warning && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 text-amber-800 text-xs flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {activeEv.warning}
              </div>
            )}
          </Card>

          <Card glow>
            <h3 className="font-bold text-brand-deep flex items-center gap-2 mb-1"><Sparkles className="w-4 h-4" /> AI gợi ý quyết định</h3>
            <div className="text-[11px] text-muted-foreground mb-3">AI gợi ý — Cán bộ xác nhận quyết định cuối cùng.</div>
            <div className="text-sm p-3 rounded-xl bg-[#F1F7FD]">
              Minh chứng <b>khớp tiêu chí {CRITERIA.find((c) => c.key === activeEv.criteria)?.label}</b>. Đã tìm thấy <b>12 case tương tự</b> trong Kho tri thức.
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button variant="success" onClick={approve}><Check className="w-4 h-4" /> Đạt tiêu chí</Button>
              <Button variant="danger" onClick={reject}><X className="w-4 h-4" /> Không đạt</Button>
              <Button variant="secondary" onClick={() => setSupplementOpen(true)}><MessageSquare className="w-4 h-4" /> Yêu cầu bổ sung</Button>
              <Button variant="outline" onClick={toResolution}><AlertTriangle className="w-4 h-4" /> Chuyển Resolution Hub</Button>
            </div>
          </Card>

          <Link to="/app/evidence-search"><Button variant="ghost" className="w-full">🔍 Xem minh chứng tương tự đã duyệt</Button></Link>
        </div>
      </div>

      <AnimatePresence>
        {supplementOpen && <SupplementModal onClose={() => setSupplementOpen(false)} student={student} />}
      </AnimatePresence>
    </>
  );
}

function SupplementModal({ onClose, student }: { onClose: () => void; student: any }) {
  const pushAudit = useApp((s) => s.pushAudit);
  const pushNotification = useApp((s) => s.pushNotification);
  const [text, setText] = useState(`Chào ${student.name},\n\nQua quá trình xét duyệt, cán bộ phụ trách nhận thấy hồ sơ của em còn thiếu minh chứng cho tiêu chí Tình nguyện (cần thêm 2 ngày để đạt Cấp Thành phố).\n\nVui lòng bổ sung trước ngày 15/07/2026.\n\nTrân trọng,\nCán bộ Nguyễn Thảo Vy`);

  const send = () => {
    pushAudit({ actor: "Nguyễn Thảo Vy", role: "Cán bộ", action: "Gửi yêu cầu bổ sung", before: "Đang xét", after: "Cần bổ sung", reason: "Thiếu ngày tình nguyện" });
    pushNotification({ title: "Yêu cầu bổ sung mới", desc: `Hồ sơ ${student.name}: thiếu minh chứng tình nguyện`, type: "warning" });
    toast.success("Đã gửi yêu cầu bổ sung");
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-[#0057C2]/40 backdrop-blur-md flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="card-glow max-w-2xl w-full p-7">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-[#00AEEF]" />
          <h3 className="font-bold text-brand-deep text-lg">AI Draft Response</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">VNPT Smartbot đã soạn nháp — cán bộ có thể chỉnh sửa trước khi gửi.</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} className="w-full p-4 rounded-xl bg-[#F4FBFF] text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]" />
        <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
          <div className="p-2 rounded-lg bg-[#EEF9FF]"><b>Tiêu chí thiếu:</b> Tình nguyện</div>
          <div className="p-2 rounded-lg bg-[#EEF9FF]"><b>Hạn bổ sung:</b> 15/07/2026</div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button onClick={send}>Gửi thông báo</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
