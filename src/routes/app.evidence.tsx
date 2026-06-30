import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip, Progress } from "@/components/ui-kit";
import { AppIcon, IconTile } from "@/components/AppIcon";
import { CriterionIcon } from "@/components/AppIcon";
import {
  CRITERIA, LEVELS, EVENT_REGISTRY, EVENT_PARTICIPANTS, KB_ITEMS, REQUIREMENT_BY_LEVEL,
  CURRENT_STUDENT, type CriterionKey,
} from "@/lib/mock-data";
import { useApp } from "@/lib/store";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { X, Plus, Search, CheckCircle2, AlertTriangle, FileText, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/app/evidence")({
  component: EvidenceWorkspaceSafe,
});

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
            <Button className="mt-4" onClick={() => { try { localStorage.removeItem("5tot-app-v3"); } catch {} location.reload(); }}>Khởi tạo lại dữ liệu demo</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function EvidenceWorkspaceSafe() {
  return (
    <EvidenceErrorBoundary>
      <EvidenceWorkspace />
    </EvidenceErrorBoundary>
  );
}

function EvidenceWorkspace() {
  const evidence = useApp((s) => s.evidence) ?? [];
  const targetLevel = useApp((s) => s.application?.targetLevel) ?? "truong";
  const [active, setActive] = useState<string>("tinh-nguyen");
  const [modal, setModal] = useState(false);

  const cards = (evidence ?? []).filter((e) => e && e.criterion === active);
  const criterion = CRITERIA_PLUS.find((c) => c.key === active) ?? CRITERIA_PLUS[0];
  const req = (REQUIREMENT_BY_LEVEL[targetLevel] as any)?.[active];

  return (
    <>
      <TopBar
        title="Minh chứng theo 5 tiêu chí"
        subtitle={`Hồ sơ SV5T 2025–2026 • ${CURRENT_STUDENT.name} • ${CURRENT_STUDENT.mssv}`}
        action={<Button onClick={() => setModal(true)}><Plus className="w-4 h-4" /> Thêm minh chứng</Button>}
      />

      <div className="grid lg:grid-cols-12 gap-4">
        {/* MASTER */}
        <aside className="lg:col-span-3">
          <Card className="!p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-2">5 tiêu chí + ưu tiên</div>
            <ul className="space-y-1">
              {CRITERIA_PLUS.map((c) => {
                const items = evidence.filter((e) => e.criterion === c.key);
                const isActive = active === c.key;
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
              <Button size="sm" variant="secondary" onClick={() => setModal(true)}><Plus className="w-3.5 h-3.5" /> Thêm</Button>
            </div>

            {cards.length === 0 ? (
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
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Yêu cầu chính thức • {LEVELS.find(l => l.key === targetLevel)?.label}</div>
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

      <AnimatePresence>{modal && <AddEvidenceModal criterion={active as CriterionKey} onClose={() => setModal(false)} />}</AnimatePresence>
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

function EvidenceCard({ ev }: { ev: ReturnType<typeof useApp.getState>["evidence"][number] }) {
  const sourceLabel = {
    metric_input: "Nhập chỉ số",
    event_import: "Import sự kiện",
    manual_upload: "Upload file",
    collective_import: "Tập thể import",
  }[ev.sourceType];

  return (
    <motion.div layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-[#EEF2F7] p-3 flex gap-3">
      <img src={ev.fileUrl} alt="" className="w-16 h-20 rounded-md object-cover bg-[#F6F9FC] shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-[11px] uppercase font-bold text-muted-foreground tracking-wide">{sourceLabel}</div>
          <div className="flex items-center gap-1.5">
            <Chip tone={ev.confidence >= 0.9 ? "success" : ev.confidence >= 0.7 ? "brand" : "warning"}>AI {Math.round(ev.confidence * 100)}%</Chip>
            <Chip tone={ev.indexingStatus === "indexed" ? "success" : "warning"}>{ev.indexingStatus === "indexed" ? "Đã index" : "Cần xác minh"}</Chip>
          </div>
        </div>
        <div className="font-semibold text-brand-deep text-[14px] mt-0.5">{ev.evidenceName}</div>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11.5px]">
          {Object.entries(ev.extractedFields).slice(0, 6).map(([k, v]) => (
            <div key={k} className="truncate"><span className="text-muted-foreground">{k}: </span><b className="text-brand-deep">{v}</b></div>
          ))}
        </div>
        {ev.warnings.length > 0 && (
          <div className="mt-2 text-[11.5px] text-amber-800 bg-amber-50 rounded-md p-2 flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {ev.warnings[0]}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============== ADD EVIDENCE MODAL — 3 methods ==============
function AddEvidenceModal({ criterion, onClose }: { criterion: CriterionKey; onClose: () => void }) {
  const [tab, setTab] = useState<"metric" | "event" | "upload">("event");
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }} className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-[var(--shadow-lift)]">
        <div className="flex items-center justify-between p-5 border-b border-[#EEF2F7]">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Thêm minh chứng vào hồ sơ</div>
            <h3 className="text-[18px] font-bold text-brand-deep">Tiêu chí: {CRITERIA_PLUS.find(c => c.key === criterion)?.label}</h3>
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
          {tab === "metric" && <MetricForm criterion={criterion} onDone={onClose} />}
          {tab === "event" && <EventImportForm criterion={criterion} onDone={onClose} />}
          {tab === "upload" && <UploadForm criterion={criterion} onDone={onClose} />}
        </div>
      </motion.div>
    </motion.div>
  );
}

function MetricForm({ criterion, onDone }: { criterion: CriterionKey; onDone: () => void }) {
  const addEvidence = useApp((s) => s.addEvidence);
  const pushAudit = useApp((s) => s.pushAudit);
  const isAcademic = criterion === "hoc-tap";
  const [name, setName] = useState(isAcademic ? "Bảng điểm học tập năm học 2024–2025" : "Phiếu điểm rèn luyện năm học 2024–2025");
  const [val, setVal] = useState(isAcademic ? "3.42" : "87");
  const [scale, setScale] = useState(isAcademic ? "4.0" : "100");

  const submit = () => {
    if (!name.trim()) return toast.error("Tên minh chứng là bắt buộc");
    const id = `evd-${Date.now()}`;
    addEvidence({
      id, applicationId: "app-2025-2026", evidenceName: name, criterion,
      sourceType: "metric_input", fileUrl: "https://placehold.co/900x1200/FFFFFF/0057C2/png?text=Chi+So+Da+Khai+Bao",
      indexingStatus: "indexed",
      extractedFields: { "Họ tên": "Nguyễn Linh An", "Giá trị": `${val}/${scale}`, "Trạng thái": "Đã khai báo" },
      matchedKnowledgeItems: [], confidence: 0.99, reviewStatus: "pending", warnings: [], levelSuggest: "truong",
    });
    pushAudit({ actor: "Nguyễn Linh An", role: "Sinh viên", action: `Nhập chỉ số — ${name}`, before: "—", after: `${val}/${scale}`, reason: "Nhập trực tiếp" });
    toast.success("Đã thêm chỉ số vào hồ sơ");
    onDone();
  };

  return (
    <div className="space-y-3 text-[13px]">
      <p className="text-[12.5px] text-muted-foreground">Dùng cho GPA, điểm rèn luyện, điểm thể dục, hoặc số ngày tình nguyện đã được xác nhận.</p>
      <Field label="Tên minh chứng *"><input className="field" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Giá trị"><input className="field" value={val} onChange={(e) => setVal(e.target.value)} /></Field>
        <Field label="Thang điểm / đơn vị"><input className="field" value={scale} onChange={(e) => setScale(e.target.value)} /></Field>
      </div>
      <Field label="Ghi chú (tùy chọn)"><textarea className="field" rows={2} placeholder="Vd: Bảng điểm chính thức từ Phòng Đào tạo." /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onDone}>Hủy</Button>
        <Button onClick={submit}><CheckCircle2 className="w-4 h-4" /> Lưu vào hồ sơ</Button>
      </div>
    </div>
  );
}

function EventImportForm({ criterion, onDone }: { criterion: CriterionKey; onDone: () => void }) {
  const events = EVENT_REGISTRY.filter((e) => e.criterion === criterion && e.rosterIndexed);
  const [selected, setSelected] = useState<string | null>(events[0]?.id ?? null);
  const [checked, setChecked] = useState<null | { ok: boolean; participant?: typeof EVENT_PARTICIPANTS[number] }>(null);
  const addEvidence = useApp((s) => s.addEvidence);
  const pushAudit = useApp((s) => s.pushAudit);

  const event = events.find((e) => e.id === selected);

  const check = () => {
    const p = EVENT_PARTICIPANTS.find((x) => x.eventId === selected && x.studentCode === CURRENT_STUDENT.mssv);
    setChecked({ ok: !!p, participant: p });
  };

  const importToProfile = () => {
    if (!event || !checked?.ok || !checked.participant) return;
    addEvidence({
      id: `evd-${Date.now()}`, applicationId: "app-2025-2026",
      evidenceName: `Giấy chứng nhận ${event.eventName}`, criterion,
      sourceType: "event_import", eventId: event.id,
      fileUrl: event.sampleCertificateUrl, indexingStatus: "indexed",
      extractedFields: {
        "Họ tên": checked.participant.studentName, "MSSV": checked.participant.studentCode,
        "Hoạt động": event.eventName, "Quy đổi": `${event.convertedValue} ${event.convertedUnit}`,
        "Đơn vị cấp": event.organizer, "Cấp tổ chức": event.organizerLevel,
      },
      matchedEvent: event.id, matchedKnowledgeItems: [],
      confidence: 0.94, reviewStatus: "pending", warnings: [], levelSuggest: event.eligibleLevels[0],
    });
    pushAudit({ actor: "Nguyễn Linh An", role: "Sinh viên", action: `Import sự kiện — ${event.eventName}`, before: "Chưa có", after: `${event.convertedValue} ${event.convertedUnit}`, reason: "Match danh sách đã index" });
    toast.success("Đã import minh chứng từ sự kiện vào hồ sơ");
    onDone();
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
        <Button onClick={importToProfile} disabled={!checked?.ok}>Import vào hồ sơ</Button>
      </div>
    </div>
  );
}

function UploadForm({ criterion, onDone }: { criterion: CriterionKey; onDone: () => void }) {
  const [name, setName] = useState("");
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const addEvidence = useApp((s) => s.addEvidence);
  const advance = useApp((s) => s.advanceIndexing);
  const pushAudit = useApp((s) => s.pushAudit);

  const STEPS = ["Đang tải minh chứng", "Pending indexing", "VNPT SmartReader OCR", "Bóc tách trường thông tin", "Tạo Evidence Card", "Kiểm tra Event Registry", "Tìm case trong Kho tri thức", "Sinh gợi ý tiền kiểm"];

  const submit = async () => {
    if (!name.trim()) return toast.error("Tên minh chứng là bắt buộc");
    const id = `evd-${Date.now()}`;
    addEvidence({
      id, applicationId: "app-2025-2026", evidenceName: name, criterion,
      sourceType: "manual_upload", fileUrl: "https://hcmyu.hpu2.edu.vn/public/fileupload/source/Tai%20lieu/GCN_daoductot_Record-146-1.png",
      originalFileName: `${name.replace(/\s+/g, "_")}.pdf`, indexingStatus: "uploaded",
      extractedFields: {}, matchedKnowledgeItems: [],
      confidence: 0, reviewStatus: "not_reviewed", warnings: [], levelSuggest: "truong",
    });
    pushAudit({ actor: "Nguyễn Linh An", role: "Sinh viên", action: `Upload minh chứng — ${name}`, before: "—", after: "uploaded", reason: "Upload thủ công" });

    const states = ["uploaded", "pending_indexing", "ocr_processing", "extracting", "extracting", "checking_registry", "checking_registry", "indexed"] as const;
    for (let i = 0; i < STEPS.length; i++) {
      await new Promise((r) => setTimeout(r, 500));
      setStep(i + 1);
      advance(id, states[i] as any);
    }
    setDone(true);
    toast.success("Đã tạo Evidence Card cho minh chứng");
  };

  return (
    <div className="space-y-3 text-[13px]">
      <p className="text-[12.5px] text-muted-foreground">Dùng cho chứng chỉ ngoại ngữ, giấy khen, hoặc minh chứng chưa có trong Event Registry.</p>
      <Field label="Tên minh chứng *"><input className="field" placeholder="Vd: Chứng chỉ IELTS 5.5 / Giấy khen NCKH..." value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Đơn vị cấp / Sự kiện liên quan (tùy chọn)"><input className="field" placeholder="British Council / Hội thảo AI..." /></Field>
      <Field label="File minh chứng">
        <div className="border border-dashed border-[#DCE7F2] rounded-lg p-4 text-center bg-[#F6F9FC]">
          <AppIcon name="upload" size={22} className="mx-auto" />
          <div className="text-[12.5px] font-semibold text-brand-deep mt-1">Kéo thả file hoặc bấm để chọn</div>
          <div className="text-[11px] text-muted-foreground">PDF, JPG, PNG — tối đa 10MB</div>
        </div>
      </Field>

      {step > 0 && (
        <div className="rounded-lg bg-[#F6F9FC] p-3 space-y-1.5">
          {STEPS.map((s, i) => {
            const dn = step > i;
            const ac = step === i + 1 && !done;
            return (
              <div key={s} className="flex items-center gap-2 text-[12px]">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${dn ? "bg-emerald-500 text-white" : ac ? "bg-[#0057C2] text-white" : "bg-slate-200 text-slate-500"}`}>{dn ? "✓" : i + 1}</div>
                <span className={dn || ac ? "text-brand-deep font-semibold" : "text-muted-foreground"}>{s}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onDone}>{done ? "Đóng" : "Hủy"}</Button>
        {!done && <Button onClick={submit}>Tải lên & tiền kiểm</Button>}
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
