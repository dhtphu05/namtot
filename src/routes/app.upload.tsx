import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip, Progress } from "@/components/ui-kit";
import { CRITERIA, EVIDENCE_SAMPLES } from "@/lib/mock-data";
import { CriterionIcon } from "@/components/AppIcon";
import { useApp } from "@/lib/store";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, Sparkles, Check, X, Eye, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/upload")({
  component: Upload,
});

function Upload() {
  const [files, setFiles] = useState(EVIDENCE_SAMPLES.slice(0, 5));
  const [activeCat, setActiveCat] = useState<string>(CRITERIA[0].key);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const nav = useNavigate();
  const pushNotification = useApp((s) => s.pushNotification);
  const pushAudit = useApp((s) => s.pushAudit);

  const handleDrop = (catKey: string) => {
    const next = EVIDENCE_SAMPLES.find((e) => e.criteria === catKey && !files.find((f) => f.id === e.id));
    if (next) {
      setFiles((f) => [...f, next]);
      toast.success(`Đã thêm: ${next.name}`);
    } else {
      toast.info("Đã thêm tất cả minh chứng mẫu cho tiêu chí này");
    }
  };

  const runAI = async () => {
    setScanning(true);
    setScanStep(0);
    const steps = ["Đang tải file", "VNPT SmartReader OCR", "Bóc tách thông tin", "Tạo Evidence Card", "Đối chiếu tiêu chí", "Tìm case tương tự", "Sinh kết quả tiền kiểm"];
    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 700));
      setScanStep(i + 1);
    }
    pushAudit({ actor: "VNPT SmartReader", role: "AI", action: "Tiền kiểm minh chứng", before: "Chưa kiểm", after: `${files.length} Evidence Cards`, reason: "OCR + KIE thành công" });
    pushNotification({ title: "AI tiền kiểm hoàn tất", desc: `${files.length} minh chứng đã được phân tích`, type: "success" });
    toast.success("Tiền kiểm hoàn tất!", { description: "Đang chuyển sang kết quả AI Pre-check" });
    setTimeout(() => nav({ to: "/app/ai-precheck" }), 800);
  };

  return (
    <>
      <TopBar
        title="Upload minh chứng"
        subtitle="Tải lên minh chứng theo 5 tiêu chí — AI sẽ tự động bóc tách và tạo Evidence Card"
        action={<Button onClick={runAI} disabled={scanning}><Sparkles className="w-4 h-4" /> Tiền kiểm bằng AI</Button>}
      />

      {/* Criteria tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CRITERIA.map((c) => {
          const count = files.filter((f) => f.criteria === c.key).length;
          const active = activeCat === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setActiveCat(c.key)}
              className={`px-4 py-2.5 rounded-2xl font-semibold text-sm flex items-center gap-2 transition-all ${active ? "bg-[#0057C2] text-white" : "bg-white text-brand-deep hover:bg-[#EEF9FF]"}`}
            >
              <CriterionIcon criterion={c.key} size={16} color={active ? "#fff" : c.color} />
              {c.label}
              <span className={`text-xs px-2 py-0.5 rounded-full ${active ? "bg-white/25" : "bg-[#EEF9FF]"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <h3 className="font-bold text-brand-deep mb-3">{CRITERIA.find((c) => c.key === activeCat)?.label}</h3>
          <div
            className="border-2 border-dashed border-[#bce4ff] rounded-2xl p-10 text-center bg-gradient-to-b from-white to-[#EEF9FF] hover:from-[#EEF9FF] hover:to-white transition-all cursor-pointer"
            onClick={() => handleDrop(activeCat)}
          >
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="w-16 h-16 mx-auto rounded-2xl gradient-brand flex items-center justify-center text-white mb-3 shadow-[var(--shadow-glow)]">
              <UploadCloud className="w-8 h-8" />
            </motion.div>
            <div className="font-semibold text-brand-deep">Kéo thả file hoặc bấm để chọn</div>
            <div className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG — tối đa 10MB / file</div>
            <div className="mt-4">
              <Button size="sm" variant="secondary">Chọn từ thiết bị</Button>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {files.filter((f) => f.criteria === activeCat).map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#F4FBFF]">
                <div className="w-10 h-12 rounded-md bg-white flex items-center justify-center text-[#0057C2] shrink-0 shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-brand-deep truncate">{f.name}</div>
                  <div className="text-xs text-muted-foreground">{f.org} • {f.date}</div>
                </div>
                <Chip tone={f.confidence > 0.85 ? "success" : "warning"}>AI {Math.round(f.confidence * 100)}%</Chip>
                {f.warning && <Chip tone="warning">⚠️ Cần xác minh</Chip>}
                <button onClick={() => setFiles((x) => x.filter((y) => y.id !== f.id))} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card glow>
          <h3 className="font-bold text-brand-deep mb-2">Minh chứng gợi ý</h3>
          <p className="text-xs text-muted-foreground mb-4">Loại minh chứng phù hợp với tiêu chí "{CRITERIA.find((c) => c.key === activeCat)?.label}"</p>
          <ul className="space-y-2 text-sm">
            {[
              "Bảng điểm chính thức từ Phòng Đào tạo",
              "Phiếu điểm rèn luyện có dấu xác nhận",
              "Giấy chứng nhận có chữ ký + dấu",
              "Chứng chỉ còn hiệu lực",
            ].map((s) => (
              <li key={s} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> {s}
              </li>
            ))}
          </ul>

          <div className="mt-5 p-4 rounded-xl bg-amber-50">
            <div className="font-semibold text-sm text-amber-900 mb-1">⚠️ Lưu ý phổ biến</div>
            <div className="text-xs text-amber-800">Ảnh mờ, thiếu dấu xác nhận, hoặc chứng chỉ hết hạn sẽ bị AI cảnh báo và yêu cầu cán bộ xác minh.</div>
          </div>
        </Card>
      </div>

      {/* Scanning overlay */}
      <AnimatePresence>
        {scanning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-[#0057C2]/40 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} className="card-glow max-w-lg w-full p-8 relative overflow-hidden">
              <div className="scan-line" />
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center text-white shadow-[var(--shadow-glow)] pulse-glow">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-brand-deep">VNPT SmartReader đang xử lý</div>
                  <div className="text-xs text-muted-foreground">AI tiền kiểm minh chứng của bạn</div>
                </div>
              </div>
              <div className="space-y-3">
                {["Đang tải file", "VNPT SmartReader OCR", "Bóc tách thông tin", "Tạo Evidence Card", "Đối chiếu tiêu chí", "Tìm case tương tự", "Sinh kết quả tiền kiểm"].map((s, i) => {
                  const done = scanStep > i;
                  const active = scanStep === i;
                  return (
                    <div key={s} className="flex items-center gap-3 text-sm">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-emerald-500 text-white" : active ? "gradient-brand text-white pulse-glow" : "bg-slate-200 text-slate-500"}`}>
                        {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      <span className={done || active ? "text-brand-deep font-semibold" : "text-muted-foreground"}>{s}</span>
                      {active && <div className="ml-auto shimmer h-1.5 w-20 rounded-full" />}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
