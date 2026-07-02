import { Link } from "@tanstack/react-router";
import * as React from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip } from "@/components/ui-kit";
import { AppIcon, CriterionIcon } from "@/components/AppIcon";
import {
  CRITERIA, LEVELS, REQUIREMENT_BY_LEVEL,
  CURRENT_STUDENT,
} from "@/lib/mock-data";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { X, Plus, AlertTriangle, ChevronRight, Loader2, FileText, ArrowRight, Upload, Trash2 } from "lucide-react";
import { useCurrentApplication } from "@/features/application/hooks/useApplication";
import { useEvidences, useCreateEvidence, useUploadEvidenceFile, useDeleteEvidence } from "@/features/evidence/hooks/useEvidence";
import { levelLabel, applicationStatusLabel, type Criterion, type ApplicationStatus } from "@/lib/api/types";

const CRITERIA_PLUS = [...CRITERIA, { key: "priority" as const, label: "Thành tích / ưu tiên", short: "Ưu tiên", color: "#a855f7", iconKey: "Sparkles" as const, icon: "Sparkles" }];

class EvidenceErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="p-8 text-center">
          <div className="card-soft p-8 max-w-md mx-auto">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <div className="font-bold text-brand-deep">Không tải được Workspace minh chứng</div>
            <div className="text-[12.5px] text-muted-foreground mt-2">{String(this.state.error?.message ?? "Lỗi không xác định")}</div>
            <Button className="mt-4" onClick={() => location.reload()}>Tải lại</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function EvidenceWorkspaceSafe() {
  return (
    <EvidenceErrorBoundary>
      <EvidenceWorkspace />
    </EvidenceErrorBoundary>
  );
}

function EvidenceWorkspace() {
  const { data: appRes, isLoading: appLoading, isError, refetch } = useCurrentApplication();
  const [active, setActive] = useState<string>("academic");
  const [modal, setModal] = useState(false);

  // Normalize criteria key to english
  const keyMap: Record<string, string> = { "dao-duc": "ethics", "hoc-tap": "academic", "the-luc": "physical", "tinh-nguyen": "volunteer", "hoi-nhap": "integration" };
  const backendActive = keyMap[active] || active;

  const applicationId = appRes?.application?.id;
  const { data: evidenceList = [], isLoading: evidenceLoading } = useEvidences(applicationId);

  if (appLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0057C2]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="text-red-500 font-semibold">Đã xảy ra lỗi khi tải hồ sơ từ máy chủ.</div>
        <Button onClick={() => refetch()}>Thử lại</Button>
      </div>
    );
  }

  if (!appRes || appRes.state === "not_started" || !appRes.application) {
    return (
      <>
        <TopBar title="Minh chứng theo tiêu chí" subtitle="Vui lòng tạo hồ sơ xét duyệt trước" />
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <div className="text-muted-foreground font-semibold">Vui lòng tạo hồ sơ trước khi thêm minh chứng.</div>
          <Link to="/app/wizard">
            <Button>Tạo hồ sơ ngay <ArrowRight className="w-4 h-4 ml-2" /></Button>
          </Link>
        </div>
      </>
    );
  }

  const profile = appRes.application;
  const targetLevel = profile.targetLevel ?? "school";
  const isEditable = ["draft", "prechecked", "ready_to_submit", "supplement_required"].includes(profile.status);

  const cards = (evidenceList || []).filter((e) => e.criterion === backendActive);
  const criterion = CRITERIA_PLUS.find((c) => (keyMap[c.key] || c.key) === backendActive) ?? CRITERIA_PLUS[0];

  const reverseKeyMap: Record<string, string> = { "school": "truong", "university": "dhdn", "city": "thanh-pho", "central": "trung-uong" };
  const uiTargetLevel = reverseKeyMap[targetLevel] || "truong";
  const req = (REQUIREMENT_BY_LEVEL[uiTargetLevel] as any)?.[active];

  return (
    <>
      <TopBar
        title="Minh chứng theo 5 tiêu chí"
        subtitle={`Hồ sơ SV5T ${profile.schoolYear} • ${profile.basicInfo?.fullName || CURRENT_STUDENT.name}`}
        action={
          isEditable ? (
            <Button onClick={() => setModal(true)} disabled={!applicationId}>
              <Plus className="w-4 h-4 mr-2" /> Thêm minh chứng
            </Button>
          ) : undefined
        }
      />

      <div className="grid lg:grid-cols-12 gap-4">
        {/* MASTER */}
        <aside className="lg:col-span-3">
          <Card className="!p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-2">5 tiêu chí + ưu tiên</div>
            <ul className="space-y-1">
              {CRITERIA_PLUS.map((c) => {
                const bk = keyMap[c.key] || c.key;
                const items = (evidenceList || []).filter((e) => e.criterion === bk);
                const isActive = backendActive === bk;
                return (
                  <li key={c.key}>
                    <button
                      onClick={() => setActive(c.key)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2.5 transition-colors ${isActive ? "bg-[#0057C2] text-white" : "hover:bg-[#F1F7FD]"}`}
                    >
                      <span className={`w-7 h-7 rounded-md flex items-center justify-center ${isActive ? "bg-white/15" : ""}`} style={isActive ? undefined : { background: c.color }}>
                        <CriterionIcon criterion={c.key} size={14} color="#fff" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className={`text-[13px] font-semibold truncate ${isActive ? "text-white" : "text-brand-deep"}`}>{c.label}</div>
                        <div className={`text-[10.5px] ${isActive ? "text-white/85" : "text-muted-foreground"}`}>{items.length} minh chứng</div>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-muted-foreground"}`} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </aside>

        {/* CENTER */}
        <section className="lg:col-span-6 space-y-3">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Minh chứng — {criterion.label}</div>
                <h3 className="font-bold text-brand-deep text-[17px] mt-0.5">{cards.length} minh chứng trong hồ sơ</h3>
              </div>
              {isEditable && (
                <Button size="sm" variant="secondary" onClick={() => setModal(true)} disabled={!applicationId}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Thêm
                </Button>
              )}
            </div>

            {evidenceLoading ? (
              <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : cards.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-50 text-center flex flex-col items-center justify-center gap-2">
                <FileText className="w-10 h-10 text-slate-300" />
                <div className="font-semibold text-brand-deep mt-1">Chưa có minh chứng cho tiêu chí này</div>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  Bấm "Thêm" để cập nhật minh chứng bản nháp hoặc tải lên tài liệu xác thực.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cards.map((ev) => (
                  <EvidenceCard key={ev.id} ev={ev} isEditable={isEditable} />
                ))}
              </div>
            )}
          </Card>
        </section>

        {/* RIGHT — requirement & suggestions */}
        <aside className="lg:col-span-3 space-y-3">
          <Card>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Yêu cầu chính thức • {LEVELS.find(l => l.key === uiTargetLevel)?.label}</div>
            {req ? (
              <div className="space-y-3 text-[12.5px]">
                <Section title="Điều kiện bắt buộc" items={req.mandatory} tone="error" />
                <Section title="Điều kiện bổ sung" items={req.optional} tone="brand" />
              </div>
            ) : (
              <div className="text-[12.5px] text-muted-foreground">Không có yêu cầu cụ thể cho cấp xét này.</div>
            )}
          </Card>

          <Card>
            <div className="text-[11px] uppercase tracking-wider text-[#0057C2] font-semibold mb-2">Thông tin lưu ý</div>
            <div className="text-[12px] text-muted-foreground leading-relaxed space-y-2">
              <p>• Minh chứng tải lên ở dạng file PDF, ảnh chụp rõ nét.</p>
              <p>• Cán bộ chuyên trách sẽ đối chiếu thông tin tự động và xác minh thủ công.</p>
              <p>• Bạn có thể tiếp tục bổ sung minh chứng nếu trạng thái hồ sơ là <b>Cần bổ sung</b>.</p>
            </div>
          </Card>
        </aside>
      </div>

      <AnimatePresence>
        {modal && applicationId && (
          <AddEvidenceModal
            criterion={backendActive as Criterion}
            applicationId={applicationId}
            onClose={() => setModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function Section({ title, items = [], tone }: { title: string; items?: string[]; tone: "error" | "success" | "brand" }) {
  const icons = { error: "alert", success: "ok", brand: "ocr" } as const;
  return (
    <div>
      <div className="text-[11px] font-bold text-brand-deep uppercase tracking-wide mb-1.5">{title}</div>
      <ul className="space-y-1.5">
        {items.map((s, i) => (
          <li key={i} className="flex gap-1.5">
            <AppIcon name={icons[tone]} size={13} tone={tone === "error" ? "warn" : tone === "success" ? "success" : "default"} className="mt-0.5 shrink-0" />
            <span className="text-[12px] leading-snug">{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EvidenceCard({ ev, isEditable }: { ev: any; isEditable: boolean }) {
  const deleteMutation = useDeleteEvidence(ev.applicationId);

  const sourceLabel = ({
    metric_input: "Nhập chỉ số",
    event_import: "Import sự kiện",
    manual_upload: "Upload file",
    collective_import: "Tập thể import",
  } as Record<string, string>)[ev.sourceType] ?? "Khác";

  const handleDelete = () => {
    if (window.confirm("Bạn có chắc chắn muốn xoá minh chứng này?")) {
      deleteMutation.mutate({ id: ev.id, applicationId: ev.applicationId });
    }
  };

  const fileCount = ev.files ? ev.files.length : 0;

  return (
    <motion.div layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-[#EEF2F7] p-4 flex gap-4 bg-white shadow-sm hover:shadow transition-shadow">
      <div className="w-12 h-16 rounded-md bg-[#F4FBFF] border border-[#DCE7F2] shrink-0 flex items-center justify-center">
        <FileText className="w-6 h-6 text-[#0057C2]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-[11px] uppercase font-bold text-muted-foreground tracking-wide">{sourceLabel}</div>
          <div className="flex items-center gap-1.5">
            {ev.status === "accepted" && <Chip tone="success">Đã duyệt</Chip>}
            {ev.status === "rejected" && <Chip tone="error">Từ chối</Chip>}
            {ev.status === "needs_supplement" && <Chip tone="warning">Cần bổ sung</Chip>}
            {ev.status === "under_review" && <Chip tone="brand">Đang xét duyệt</Chip>}
            {ev.status === "draft" && <Chip tone="muted">Bản nháp</Chip>}
          </div>
        </div>
        <div className="font-semibold text-brand-deep text-[14px] mt-1">{ev.evidenceName || "(Minh chứng chưa đặt tên)"}</div>
        
        {ev.description && (
          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{ev.description}</div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <div className="text-[10.5px] text-muted-foreground">
            {fileCount > 0 ? `Đã đính kèm ${fileCount} file` : "Chưa có file tài liệu"}
            {ev.updatedAt && ` • Cập nhật: ${new Date(ev.updatedAt).toLocaleDateString("vi-VN")}`}
          </div>
          {isEditable && (
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> Xoá
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============== ADD EVIDENCE MODAL — Manual Upload Only (non-AI standard) ==============
function AddEvidenceModal({ criterion, applicationId, onClose }: { criterion: Criterion; applicationId: string; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }} className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[#EEF2F7]">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Thêm minh chứng mới</div>
            <h3 className="text-lg font-extrabold text-brand-deep mt-0.5">Tiêu chí: {criterion === "academic" ? "Học tập tốt" : criterion === "ethics" ? "Đạo đức tốt" : criterion === "physical" ? "Thể lực tốt" : criterion === "volunteer" ? "Tình nguyện tốt" : "Hội nhập tốt"}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5">
          <UploadForm criterion={criterion} applicationId={applicationId} onDone={onClose} />
        </div>
      </motion.div>
    </motion.div>
  );
}

function UploadForm({ criterion, applicationId, onDone }: { criterion: Criterion; applicationId: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [note, setNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const createMutation = useCreateEvidence();
  const uploadMutation = useUploadEvidenceFile();

  const isPending = createMutation.isPending || uploadMutation.isPending;

  const submit = async () => {
    if (!name.trim()) return toast.error("Tên minh chứng là bắt buộc");
    
    // File validation if selected
    if (selectedFile) {
      const file = selectedFile;
      const allowedExtensions = ["pdf", "jpg", "jpeg", "png"];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !allowedExtensions.includes(ext)) {
        return toast.error("Định dạng file không được hỗ trợ! Chỉ chấp nhận PDF, JPG, JPEG, PNG.");
      }
      if (file.size > 10 * 1024 * 1024) {
        return toast.error("Dung lượng file vượt quá giới hạn cho phép (tối đa 10MB).");
      }
    }

    try {
      const ev = await createMutation.mutateAsync({
        applicationId,
        data: {
          evidenceName: name,
          criterion,
          sourceType: "manual_upload",
          description: desc || undefined,
          note: note || undefined,
        }
      });
      
      if (selectedFile) {
        await uploadMutation.mutateAsync({
          evidenceId: ev.id,
          applicationId,
          file: selectedFile
        });
      }
      
      toast.success("Thêm minh chứng thành công!");
      onDone();
    } catch (err: any) {
      toast.error(`Thêm minh chứng thất bại: ${err.message || "Vui lòng thử lại"}`);
    }
  };

  return (
    <div className="space-y-4 text-[13px]">
      <p className="text-xs text-muted-foreground bg-[#F4FBFF] p-3 rounded-lg border border-[#DCE7F2]">
        Dùng để tải lên giấy chứng nhận, giấy khen, bảng điểm hoặc minh chứng liên quan đến tiêu chí.
      </p>

      <Field label="Tên minh chứng *">
        <input 
          className="field" 
          placeholder="Vd: Chứng chỉ IELTS 6.5, Giấy khen NCKH..." 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          disabled={isPending}
        />
      </Field>

      <Field label="Mô tả minh chứng (tùy chọn)">
        <input 
          className="field" 
          placeholder="Mô tả ngắn gọn về thành tích đạt được..." 
          value={desc} 
          onChange={(e) => setDesc(e.target.value)} 
          disabled={isPending}
        />
      </Field>

      <Field label="Ghi chú thêm (tùy chọn)">
        <textarea 
          className="field" 
          rows={2} 
          placeholder="Ghi chú gửi cho cán bộ chuyên trách xét duyệt..." 
          value={note} 
          onChange={(e) => setNote(e.target.value)} 
          disabled={isPending}
        />
      </Field>

      <Field label="File tài liệu đính kèm (tùy chọn)">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          accept=".pdf,.jpg,.jpeg,.png"
          disabled={isPending}
        />
        <div 
          className="border border-dashed border-[#DCE7F2] rounded-xl p-4 text-center bg-[#F4FBFF] cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => !isPending && fileInputRef.current?.click()}
        >
          <Upload className="w-5 h-5 mx-auto text-[#0057C2]" />
          <div className="text-[12.5px] font-semibold text-brand-deep mt-1">
            {selectedFile ? selectedFile.name : "Nhấp để chọn file đính kèm"}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Hỗ trợ PDF, JPG, JPEG, PNG — tối đa 10MB</div>
        </div>
      </Field>

      <div className="flex justify-end gap-2 pt-3 border-t">
        <Button variant="ghost" onClick={onDone} disabled={isPending}>Hủy</Button>
        <Button onClick={submit} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang tải lên...
            </>
          ) : (
            <>
              Tải lên minh chứng
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11.5px] uppercase tracking-wide font-semibold text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
      <style>{`.field{width:100%;border:1px solid #DCE7F2;border-radius:10px;padding:0.6rem 0.75rem;font-size:13px;background:#fff;transition:border-color 0.2s}.field:focus{outline:none;border-color:#00AEEF}.field:disabled{opacity:0.6;cursor:not-allowed}`}</style>
    </label>
  );
}
