import { useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip, Progress } from "@/components/ui-kit";
import { CRITERIA } from "@/lib/mock-data";
import { CriterionIcon } from "@/components/AppIcon";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, Sparkles, Check, X, Eye, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCurrentApplication, usePrecheck } from "@/features/application/hooks/useApplication";
import { useEvidences, useCreateEvidence, useUploadAndIndex, useDeleteEvidence } from "@/features/evidence/hooks/useEvidence";
import { useJobPolling } from "@/features/evidence/hooks/useJobPolling";
import type { Criterion, EvidenceResponse } from "@/lib/api/types";
import { EvidenceDetailModal } from "@/features/evidence/components/EvidenceDetailModal";
import { StudentEvidenceCard } from "@/features/evidence/components/StudentEvidenceCard";

export function UploadEvidence() {
  const [activeCat, setActiveCat] = useState<Criterion>("academic");
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceResponse | null>(null);
  const nav = useNavigate();
  
  const { data: appRes } = useCurrentApplication("2025-2026");
  const appId = appRes?.application?.id;

  const { data: filesData, isLoading: isLoadingList } = useEvidences(appId);
  const files = Array.isArray(filesData) ? filesData : [];
  
  const createEvidence = useCreateEvidence();
  const uploadAndIndex = useUploadAndIndex();
  const deleteEvidence = useDeleteEvidence();
  const precheck = usePrecheck();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeJobId, setActiveJobId] = useState<string | undefined>();
  // Poll the active job
  const jobQuery = useJobPolling(activeJobId, appId);

  const isScanning = !!activeJobId && jobQuery.data?.status !== "completed" && jobQuery.data?.status !== "failed";
  const scanStep = jobQuery.data ? Math.min(6, Math.floor((jobQuery.data.progress || 0) / 15)) : 0;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length) return;
    const file = e.target.files[0];
    if (!appId) {
      toast.error("Vui lòng tạo hồ sơ trước (Bắt đầu tạo hồ sơ)!");
      return;
    }

    try {
      // 1. Create Evidence record
      const ev = await createEvidence.mutateAsync({
        applicationId: appId,
        data: {
          evidenceName: file.name,
          criterion: activeCat,
          sourceType: "manual_upload"
        }
      });

      // 2. Upload file
      await uploadAndIndex.mutateAsync({
        evidenceId: ev.id,
        applicationId: appId,
        file: file
      });
    } catch (err: any) {
      // toast is already handled by mutations, but catch here to stop flow
    }
    
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = (id: string) => {
    if (!appId) return;
    deleteEvidence.mutate({ id, applicationId: appId });
  };

  const runPrecheck = () => {
    if (!appId) return;
    precheck.mutate({ id: appId, level: appRes?.application?.targetLevel }, {
      onSuccess: () => {
        toast.success("Tiền kiểm hoàn tất!");
        nav({ to: "/app" });
      }
    });
  };

  return (
    <>
      <TopBar
        title="Upload minh chứng"
        subtitle="Tải lên minh chứng theo 5 tiêu chí để hoàn thiện hồ sơ"
        action={
          <Button onClick={() => nav({ to: "/app" })}>
            Quay lại bảng điều khiển
          </Button>
        }
      />

      {/* Criteria tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CRITERIA.map((c) => {
          const keyMap: Record<string, Criterion> = { "dao-duc": "ethics", "hoc-tap": "academic", "the-luc": "physical", "tinh-nguyen": "volunteer", "hoi-nhap": "integration" };
          const backendKey = keyMap[c.key] || c.key as Criterion;
          
          const count = files.filter((f) => f.criterion === backendKey).length;
          const active = activeCat === backendKey;
          return (
            <button
              key={c.key}
              onClick={() => setActiveCat(backendKey)}
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
          <h3 className="font-bold text-brand-deep mb-3">{CRITERIA.find((c) => {
             const keyMap: Record<string, string> = { "dao-duc": "ethics", "hoc-tap": "academic", "the-luc": "physical", "tinh-nguyen": "volunteer", "hoi-nhap": "integration" };
             return keyMap[c.key] === activeCat || (c.key as string) === (activeCat as string);
          })?.label}</h3>
          
          <div
            className="border-2 border-dashed border-[#bce4ff] rounded-2xl p-10 text-center bg-gradient-to-b from-white to-[#EEF9FF] hover:from-[#EEF9FF] hover:to-white transition-all cursor-pointer relative"
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,.jpg,.jpeg,.png" 
              onChange={handleFileChange}
              disabled={createEvidence.isPending || uploadAndIndex.isPending}
            />
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="w-16 h-16 mx-auto rounded-2xl gradient-brand flex items-center justify-center text-white mb-3 shadow-[var(--shadow-glow)]">
              {(createEvidence.isPending || uploadAndIndex.isPending) ? <Loader2 className="w-8 h-8 animate-spin" /> : <UploadCloud className="w-8 h-8" />}
            </motion.div>
            <div className="font-semibold text-brand-deep">
              {(createEvidence.isPending || uploadAndIndex.isPending) ? "Đang xử lý tải lên..." : "Kéo thả file hoặc bấm để chọn"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG — tối đa 10MB / file</div>
            <div className="mt-4">
              <Button size="sm" variant="secondary" disabled={createEvidence.isPending || uploadAndIndex.isPending}>Chọn từ thiết bị</Button>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {isLoadingList && <div className="text-center p-4 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Đang tải danh sách minh chứng...</div>}
            
            {files.filter((f) => f.criterion === activeCat).map((f) => (
              <StudentEvidenceCard
                key={f.id}
                evidence={f}
                applicationId={appId ?? ""}
                canEdit={!!appId}
                onViewDetails={setSelectedEvidence}
                onDelete={() => handleDelete(f.id)}
              />
            ))}
                        {!isLoadingList && files.filter((f) => f.criterion === activeCat).length === 0 && (
              <div className="text-center p-6 text-muted-foreground bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Chưa có minh chứng nào cho tiêu chí này.
              </div>
            )}
          </div>
        </Card>

        <Card glow>
          <h3 className="font-bold text-brand-deep mb-2">Minh chứng gợi ý</h3>
          <p className="text-xs text-muted-foreground mb-4">Loại minh chứng phù hợp với tiêu chí hiện tại.</p>
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
            <div className="font-semibold text-sm text-amber-900 mb-1 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Lưu ý phổ biến</div>
            <div className="text-xs text-amber-800">Ảnh mờ, thiếu dấu xác nhận, hoặc chứng chỉ hết hạn sẽ bị AI cảnh báo và yêu cầu cán bộ xác minh.</div>
          </div>
        </Card>
      </div>

      {/* Scanning overlay */}
      <AnimatePresence>
        {isScanning && (
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
                {["Đang tải file lên Server", "VNPT SmartReader OCR", "Bóc tách thông tin", "Tạo Evidence Card", "Đối chiếu tiêu chí", "Tìm case tương tự", "Hoàn tất"].map((s, i) => {
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

      <EvidenceDetailModal
        evidence={selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
      />
    </>
  );
}

