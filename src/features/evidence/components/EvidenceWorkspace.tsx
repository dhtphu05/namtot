import { Link } from "@tanstack/react-router";
import * as React from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip } from "@/components/ui-kit";
import { AppIcon, IconTile } from "@/components/AppIcon";
import { CriterionIcon } from "@/components/AppIcon";
import {
  CRITERIA, LEVELS, EVENT_REGISTRY, EVENT_PARTICIPANTS, KB_ITEMS, REQUIREMENT_BY_LEVEL,
  CURRENT_STUDENT, type CriterionKey,
} from "@/lib/mock-data";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { X, Plus, Search, CheckCircle2, AlertTriangle, ChevronRight, Loader2, FileText } from "lucide-react";
import { useCurrentApplication } from "@/features/application/hooks/useApplication";
import { useEvidences, useCreateEvidence, useUploadAndIndex } from "@/features/evidence/hooks/useEvidence";
import { useJobPolling } from "@/features/evidence/hooks/useJobPolling";
import type { Criterion } from "@/lib/api/types";
type EvidenceResponse = any;

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
  const { data: appRes, isLoading: appLoading } = useCurrentApplication();
  const applicationId = appRes?.application?.id;
  const targetLevel = appRes?.application?.targetLevel ?? "school";

  const [active, setActive] = useState<string>("academic");
  const [modal, setModal] = useState(false);

  // Normalize criteria key to english
  const keyMap: Record<string, string> = { "dao-duc": "ethics", "hoc-tap": "academic", "the-luc": "physical", "tinh-nguyen": "volunteer", "hoi-nhap": "integration" };
  const backendActive = keyMap[active] || active;

  const { data: evidenceList = [], isLoading: evidenceLoading } = useEvidences(applicationId);

  const cards = (evidenceList || []).filter((e) => e.criterion === backendActive);
  const criterion = CRITERIA_PLUS.find((c) => (keyMap[c.key] || c.key) === backendActive) ?? CRITERIA_PLUS[0];
  
  // Inverse map for UI
  const reverseKeyMap: Record<string, string> = { "school": "truong", "university": "dhdn", "city": "thanh-pho", "central": "trung-uong" };
  const uiTargetLevel = reverseKeyMap[targetLevel] || "truong";
  const req = (REQUIREMENT_BY_LEVEL[uiTargetLevel] as any)?.[active];

  if (appLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;
  }

  return (
    <>
      <TopBar
        title="Minh chứng theo 5 tiêu chí"
        subtitle={`Hồ sơ SV5T ${appRes?.application?.schoolYear ?? "2025-2026"} • ${appRes?.application?.basicInfo?.fullName || CURRENT_STUDENT.name}`}
        action={<Button onClick={() => setModal(true)} disabled={!applicationId}><Plus className="w-4 h-4" /> Thêm minh chứng</Button>}
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
              <Button size="sm" variant="secondary" onClick={() => setModal(true)} disabled={!applicationId}><Plus className="w-3.5 h-3.5" /> Thêm</Button>
            </div>

            {evidenceLoading ? (
              <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : cards.length === 0 ? (
              <div className="p-6 rounded-lg bg-[#F6F9FC] text-center">
                <IconTile name="alert" tone="warn" size={40} />
                <div className="font-semibold text-brand-deep mt-2">Chưa có minh chứng cho tiêu chí này</div>
                <div className="text-[12px] text-muted-foreground mt-1">Bấm "Thêm minh chứng" để bắt đầu — bạn có 3 cách: nhập chỉ số, import từ sự kiện, hoặc upload file.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {cards.map((ev) => <EvidenceCard key={ev.id} ev={ev} />)}
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
                <Section title="Minh chứng có thể dùng" items={req.allowedEvidence} tone="success" />
                <Section title="Hệ thống tự kiểm tra" items={req.systemChecks} tone="brand" />
              </div>
            ) : (
              <div className="text-[12.5px] text-muted-foreground">Tiêu chí ưu tiên — dùng để xét cấp cao hơn, không bắt buộc.</div>
            )}
          </Card>

          <Card>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Sự kiện gợi ý từ Event Registry</div>
            <div className="space-y-2">
              {EVENT_REGISTRY.filter((e) => e.criterion === active).slice(0, 3).map((e) => (
                <Link to="/app/event-library" key={e.id} className="block p-2.5 rounded-lg bg-[#F1F7FD] hover:bg-[#E5EFFA]">
                  <div className="text-[12.5px] font-semibold text-brand-deep">{e.eventName}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{e.organizer} • {e.convertedValue} {e.convertedUnit} • {e.participantCount} SV indexed</div>
                </Link>
              ))}
              {EVENT_REGISTRY.filter((e) => e.criterion === active).length === 0 && (
                <div className="text-[12px] text-muted-foreground">Chưa có sự kiện indexed cho tiêu chí này.</div>
              )}
            </div>
          </Card>

          <Card>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Tham chiếu Kho tri thức</div>
            <div className="space-y-2">
              {KB_ITEMS.filter((k) => k.criterion === active).slice(0, 3).map((k) => (
                <Link to="/app/evidence-search" key={k.id} className="block p-2.5 rounded-lg hover:bg-[#F1F7FD]">
                  <div className="flex items-center gap-2">
                    <Chip tone={k.decision === "approved" ? "success" : k.decision === "rejected" ? "error" : "warning"}>{k.decision === "approved" ? "Đã duyệt" : k.decision === "rejected" ? "Từ chối" : "Cần xác minh"}</Chip>
                    <span className="text-[11px] text-muted-foreground">{k.usageCount} lần dùng</span>
                  </div>
                  <div className="text-[12.5px] font-semibold text-brand-deep mt-1">{k.evidenceName}</div>
                </Link>
              ))}
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

function Section({ title, items, tone }: { title: string; items: string[]; tone: "error" | "success" | "brand" }) {
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

function EvidenceCard({ ev }: { ev: any }) {
  const sourceLabel = ({
    metric_input: "Nhập chỉ số",
    event_import: "Import sự kiện",
    manual_upload: "Upload file",
    collective_import: "Tập thể import",
  } as Record<string, string>)[ev.sourceType] ?? "Khác";

  // Check job polling state if it has a jobId
  useJobPolling(ev.jobId, ev.applicationId);

  return (
    <motion.div layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-[#EEF2F7] p-3 flex gap-3">
      <div className="w-16 h-20 rounded-md bg-[#F6F9FC] shrink-0 flex items-center justify-center">
        <FileText className="w-6 h-6 text-slate-300" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-[11px] uppercase font-bold text-muted-foreground tracking-wide">{sourceLabel}</div>
          <div className="flex items-center gap-1.5">
            <Chip tone={ev.indexingStatus === "indexed" ? "success" : ev.indexingStatus === "failed" ? "error" : "warning"}>
              {ev.indexingStatus === "indexed" ? "Đã trích xuất" : 
               ev.indexingStatus === "failed" ? "Lỗi trích xuất" : "Đang xử lý"}
            </Chip>
          </div>
        </div>
        <div className="font-semibold text-brand-deep text-[14px] mt-0.5">{ev.evidenceName || "(Minh chứng chưa đặt tên)"}</div>
        <div className="mt-2 text-[11.5px] text-muted-foreground">
          Cập nhật: {new Date(ev.updatedAt).toLocaleString("vi-VN")}
        </div>
      </div>
    </motion.div>
  );
}

// ============== ADD EVIDENCE MODAL — 3 methods ==============
function AddEvidenceModal({ criterion, applicationId, onClose }: { criterion: Criterion; applicationId: string; onClose: () => void }) {
  const [tab, setTab] = useState<"metric" | "event" | "upload">("event");
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }} className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-[var(--shadow-lift)]">
        <div className="flex items-center justify-between p-5 border-b border-[#EEF2F7]">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Thêm minh chứng vào hồ sơ</div>
            <h3 className="text-[18px] font-bold text-brand-deep">Tiêu chí: {criterion}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#F1F7FD] flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 pt-4 flex gap-2 border-b border-[#EEF2F7]">
          {[
            { k: "metric", label: "1. Nhập chỉ số", icon: "metric" as const },
            { k: "event", label: "2. Import từ sự kiện", icon: "importEvent" as const },
            { k: "upload", label: "3. Upload file", icon: "upload" as const },
          ].map((t) => (
            <button key={t.k} onClick={() => setTab(t.k as any)} className={`px-3 py-2 -mb-px border-b-2 text-[13px] font-semibold flex items-center gap-2 ${tab === t.k ? "border-[#0057C2] text-[#0057C2]" : "border-transparent text-muted-foreground hover:text-brand-deep"}`}>
              <AppIcon name={t.icon} size={14} tone={tab === t.k ? "default" : "muted"} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "metric" && <MetricForm criterion={criterion} applicationId={applicationId} onDone={onClose} />}
          {tab === "event" && <EventImportForm criterion={criterion} applicationId={applicationId} onDone={onClose} />}
          {tab === "upload" && <UploadForm criterion={criterion} applicationId={applicationId} onDone={onClose} />}
        </div>
      </motion.div>
    </motion.div>
  );
}

function MetricForm({ criterion, applicationId, onDone }: { criterion: Criterion; applicationId: string; onDone: () => void }) {
  const isAcademic = criterion === "academic";
  const [name, setName] = useState(isAcademic ? "Bảng điểm học tập năm học 2024–2025" : "Minh chứng chỉ số");
  
  const createMutation = useCreateEvidence();

  const submit = () => {
    if (!name.trim()) return toast.error("Tên minh chứng là bắt buộc");
    createMutation.mutate({
      applicationId,
      data: { evidenceName: name, criterion, sourceType: "metric_input" }
    }, {
      onSuccess: () => onDone()
    });
  };

  return (
    <div className="space-y-3 text-[13px]">
      <p className="text-[12.5px] text-muted-foreground">Dùng cho GPA, điểm rèn luyện, điểm thể dục, hoặc số ngày tình nguyện đã được xác nhận.</p>
      <Field label="Tên minh chứng *"><input className="field" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Ghi chú (tùy chọn)"><textarea className="field" rows={2} placeholder="Vd: Bảng điểm chính thức từ Phòng Đào tạo." /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onDone}>Hủy</Button>
        <Button onClick={submit} disabled={createMutation.isPending}>
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} 
          Lưu vào hồ sơ
        </Button>
      </div>
    </div>
  );
}

function EventImportForm({ criterion, applicationId, onDone }: { criterion: Criterion; applicationId: string; onDone: () => void }) {
  // Use mock for events display, but real API for creation
  const uiKey = Object.entries({ "dao-duc": "ethics", "hoc-tap": "academic", "the-luc": "physical", "tinh-nguyen": "volunteer", "hoi-nhap": "integration" }).find(x => x[1] === criterion)?.[0] || criterion;
  const events = EVENT_REGISTRY.filter((e) => e.criterion === uiKey && e.rosterIndexed);
  const [selected, setSelected] = useState<string | null>(events[0]?.id ?? null);
  const [checked, setChecked] = useState<null | { ok: boolean; participant?: typeof EVENT_PARTICIPANTS[number] }>(null);
  
  const createMutation = useCreateEvidence();
  const event = events.find((e) => e.id === selected);

  const check = () => {
    const p = EVENT_PARTICIPANTS.find((x) => x.eventId === selected && x.studentCode === CURRENT_STUDENT.mssv);
    setChecked({ ok: !!p, participant: p });
  };

  const importToProfile = () => {
    if (!event || !checked?.ok || !checked.participant) return;
    createMutation.mutate({
      applicationId,
      data: { evidenceName: `Giấy chứng nhận ${event.eventName}`, criterion, sourceType: "event_import" }
    }, {
      onSuccess: () => onDone()
    });
  };

  return (
    <div className="space-y-3 text-[13px]">
      <p className="text-[12.5px] text-muted-foreground">Áp dụng cho sự kiện do Đoàn Thanh niên, Hội Sinh viên, Khoa, Trường tổ chức và đã được index.</p>
      <Field label="Tìm sự kiện">
        <div className="flex items-center gap-2 field !py-1.5"><Search className="w-3.5 h-3.5 text-muted-foreground" /><input className="bg-transparent flex-1 focus:outline-none" placeholder="Tên sự kiện, đơn vị tổ chức..." /></div>
      </Field>

      <div className="space-y-2 max-h-56 overflow-y-auto">
        {events.map((e) => (
          <button key={e.id} onClick={() => { setSelected(e.id); setChecked(null); }} className={`w-full text-left p-3 rounded-lg border ${selected === e.id ? "border-[#0057C2] bg-[#F1F7FD]" : "border-[#EEF2F7] hover:bg-[#F6F9FC]"}`}>
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-semibold text-brand-deep">{e.eventName}</div>
              <Chip tone="success">Indexed {e.participantCount} SV</Chip>
            </div>
            <div className="text-[11.5px] text-muted-foreground mt-0.5">{e.organizer} • {e.organizerLevel} • Quy đổi {e.convertedValue} {e.convertedUnit}</div>
          </button>
        ))}
        {events.length === 0 && <div className="text-[12.5px] text-muted-foreground p-2">Chưa có sự kiện indexed cho tiêu chí này. Hãy thử Upload file thủ công.</div>}
      </div>

      {selected && (
        <div className="p-3 rounded-lg bg-[#F6F9FC]">
          <Button variant="secondary" size="sm" onClick={check}>Kiểm tra MSSV {CURRENT_STUDENT.mssv} trong danh sách</Button>
          {checked?.ok && (
            <div className="mt-3 text-[12.5px] text-emerald-800 bg-emerald-50 rounded-md p-3">
              ✓ Tìm thấy <b>{checked.participant?.studentName}</b> ({checked.participant?.studentCode}) trong danh sách tham gia <b>{event?.eventName}</b> — được tính <b>{event?.convertedValue} {event?.convertedUnit}</b>.
            </div>
          )}
          {checked && !checked.ok && (
            <div className="mt-3 text-[12.5px] text-amber-800 bg-amber-50 rounded-md p-3">
              Chưa tìm thấy MSSV của bạn trong danh sách đã index. Bạn có thể chuyển sang tab <b>Upload file</b> để cán bộ xác minh.
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onDone}>Hủy</Button>
        <Button onClick={importToProfile} disabled={!checked?.ok || createMutation.isPending}>
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Import vào hồ sơ
        </Button>
      </div>
    </div>
  );
}

function UploadForm({ criterion, applicationId, onDone }: { criterion: Criterion; applicationId: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const createMutation = useCreateEvidence();
  const uploadMutation = useUploadAndIndex();

  const isPending = createMutation.isPending || uploadMutation.isPending;

  const submit = async () => {
    if (!name.trim()) return toast.error("Tên minh chứng là bắt buộc");
    if (!selectedFile) return toast.error("Vui lòng chọn file minh chứng");

    try {
      const ev = await createMutation.mutateAsync({
        applicationId,
        data: { evidenceName: name, criterion, sourceType: "manual_upload" }
      });
      
      await uploadMutation.mutateAsync({
        evidenceId: ev.id,
        applicationId,
        file: selectedFile
      });
      
      onDone();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-3 text-[13px]">
      <p className="text-[12.5px] text-muted-foreground">Dùng cho chứng chỉ ngoại ngữ, giấy khen, hoặc minh chứng chưa có trong Event Registry.</p>
      <Field label="Tên minh chứng *"><input className="field" placeholder="Vd: Chứng chỉ IELTS 5.5 / Giấy khen NCKH..." value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="File minh chứng">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          accept=".pdf,.jpg,.jpeg,.png"
        />
        <div 
          className="border border-dashed border-[#DCE7F2] rounded-lg p-4 text-center bg-[#F6F9FC] cursor-pointer hover:bg-[#EEF2F7]"
          onClick={() => fileInputRef.current?.click()}
        >
          <AppIcon name="upload" size={22} className="mx-auto" />
          <div className="text-[12.5px] font-semibold text-brand-deep mt-1">
            {selectedFile ? selectedFile.name : "Nhấp để chọn file"}
          </div>
          <div className="text-[11px] text-muted-foreground">PDF, JPG, PNG — tối đa 10MB</div>
        </div>
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onDone} disabled={isPending}>Hủy</Button>
        <Button onClick={submit} disabled={isPending || !selectedFile}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Tải lên & tiền kiểm
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
      <style>{`.field{width:100%;border:1px solid #DCE7F2;border-radius:8px;padding:0.5rem 0.75rem;font-size:13px;background:#fff}.field:focus{outline:2px solid #0057C233;outline-offset:0}`}</style>
    </label>
  );
}
