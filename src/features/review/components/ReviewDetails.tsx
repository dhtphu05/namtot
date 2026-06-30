import { useParams, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip } from "@/components/ui-kit";
import { CRITERIA, LEVELS, OFFICERS, MEDIA } from "@/lib/mock-data";
import { useApp } from "@/lib/store";
import { Check, X, MessageSquare, AlertTriangle, ArrowDownToLine, FileText, Sparkles, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useReviewTaskDetail, useSubmitDecision } from "../hooks/useReview";

export function ReviewDetails() {
  const { id } = useParams({ from: "/app/review/$id" });
  const officerId = useApp((s) => s.currentOfficerId);
  const me = OFFICERS.find((o) => o.id === officerId) ?? OFFICERS[0];
  const allowed = new Set(me.specializedCriteria as string[]);
  
  const { data: task, isLoading, isError } = useReviewTaskDetail(id);
  const { mutate: submitDecision, isPending } = useSubmitDecision();

  const [supplementOpen, setSupplementOpen] = useState(false);

  // Temporary mock image (since API doesn't return an image URL)
  const imgUrl = MEDIA.evidence.sample;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-deep mb-4" />
        <p className="text-muted-foreground font-semibold">Đang tải dữ liệu hồ sơ...</p>
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="p-8 text-center text-red-500 font-semibold">
        Không tìm thấy thông tin task xét duyệt.
        <br />
        <Link to="/app/queue"><Button variant="outline" className="mt-4">Quay lại hàng chờ</Button></Link>
      </div>
    );
  }

  const approve = () => {
    submitDecision({ studentId: id, payload: { decision: "accepted" } });
  };
  const reject = () => {
    submitDecision({ studentId: id, payload: { decision: "rejected" } });
  };
  const toResolution = () => {
    submitDecision({ studentId: id, payload: { decision: "resolution_needed" } });
  };

  return (
    <>
      <TopBar
        title={`Xét duyệt — ${CRITERIA.find(c => c.key === task.criterion)?.label ?? "Minh chứng"}`}
        subtitle={`${me.name} • ${task.studentName} (${task.studentMssv}) • Cấp aim: ${LEVELS.find((l) => l.key === task.targetLevel)?.label}`}
        action={<Link to="/app/queue"><Button variant="ghost">← Hàng chờ</Button></Link>}
      />

      <div className="grid lg:grid-cols-12 gap-5">
        {/* Left: preview */}
        <Card className="lg:col-span-7 !p-4">
          <div className="rounded-2xl bg-[#F4FBFF] p-3 flex items-center justify-center">
            <img src={imgUrl} alt={task.evidenceName} className="max-h-[70vh] rounded-xl shadow-lg" />
          </div>
        </Card>

        {/* Middle: Evidence Card */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-brand-deep flex items-center gap-2"><FileText className="w-4 h-4" /> Evidence Card</h3>
              <Chip tone={task.confidence > 0.85 ? "success" : "warning"}>AI {Math.round(task.confidence * 100)}%</Chip>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ["Loại minh chứng", task.evidenceName],
                ["Tiêu chí", CRITERIA.find((c) => c.key === task.criterion)?.label],
                ["Trạng thái hiện tại", task.status === "waiting" ? "Chờ xét" : task.status],
                ["Cấp xét gợi ý", LEVELS.find((l) => l.key === task.targetLevel)?.label],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-3 py-2 border-b border-[#EEF9FF] last:border-0">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-semibold text-brand-deep text-right">{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card glow>
            <h3 className="font-bold text-brand-deep flex items-center gap-2 mb-1"><Sparkles className="w-4 h-4" /> AI gợi ý quyết định</h3>
            <div className="text-[11px] text-muted-foreground mb-3">AI gợi ý — Cán bộ xác nhận quyết định cuối cùng.</div>
            <div className="text-sm p-3 rounded-xl bg-[#F1F7FD]">
              Minh chứng <b>khớp tiêu chí {CRITERIA.find((c) => c.key === task.criterion)?.label}</b>. Đã tìm thấy <b>12 case tương tự</b> trong Kho tri thức.
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 relative">
              {isPending && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-deep" />
                </div>
              )}
              <Button variant="success" onClick={approve} disabled={isPending}><Check className="w-4 h-4" /> Đạt tiêu chí</Button>
              <Button variant="danger" onClick={reject} disabled={isPending}><X className="w-4 h-4" /> Không đạt</Button>
              <Button variant="secondary" onClick={() => setSupplementOpen(true)} disabled={isPending}><MessageSquare className="w-4 h-4" /> Yêu cầu bổ sung</Button>
              <Button variant="outline" onClick={toResolution} disabled={isPending}><AlertTriangle className="w-4 h-4" /> Chuyển Resolution Hub</Button>
            </div>
          </Card>

          <Link to="/app/evidence-search"><Button variant="ghost" className="w-full">🔍 Xem minh chứng tương tự đã duyệt</Button></Link>
        </div>
      </div>

      <AnimatePresence>
        {supplementOpen && <SupplementModal 
          onClose={() => setSupplementOpen(false)} 
          task={task} 
          onSubmit={(reason) => {
            submitDecision({ studentId: id, payload: { decision: "supplement_required", reason } });
            setSupplementOpen(false);
          }}
          isPending={isPending}
        />}
      </AnimatePresence>
    </>
  );
}

function SupplementModal({ onClose, task, onSubmit, isPending }: { onClose: () => void; task: any, onSubmit: (reason: string) => void, isPending: boolean }) {
  const officerId = useApp((s) => s.currentOfficerId);
  const me = OFFICERS.find((o) => o.id === officerId) ?? OFFICERS[0];
  const [text, setText] = useState(`Chào ${task.studentName},\n\nQua quá trình xét duyệt, cán bộ phụ trách nhận thấy hồ sơ của em còn thiếu minh chứng cho tiêu chí ${CRITERIA.find(c => c.key === task.criterion)?.label}.\n\nVui lòng bổ sung trước ngày 15/07/2026.\n\nTrân trọng,\nCán bộ ${me.name}`);

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
          <div className="p-2 rounded-lg bg-[#EEF9FF]"><b>Tiêu chí thiếu:</b> {CRITERIA.find(c => c.key === task.criterion)?.label}</div>
          <div className="p-2 rounded-lg bg-[#EEF9FF]"><b>Hạn bổ sung:</b> 15/07/2026</div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>Hủy</Button>
          <Button onClick={() => onSubmit(text)} disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gửi thông báo"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
