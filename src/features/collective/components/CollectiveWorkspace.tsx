import { Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip, Progress, StatCard } from "@/components/ui-kit";
import { IconTile } from "@/components/AppIcon";
import { MEDIA, SAMPLE_GCN } from "@/lib/mock-data";
import { UsersRound, ArrowRight, History, Send, UploadCloud, FileText, CheckCircle2, Loader2, FileUp, AlertTriangle, Sparkles, X, Search, CalendarCheck } from "lucide-react";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  useCurrentCollective, 
  useStartCollective, 
  useSubmitCollective,
  useCollectivePrecheck 
} from "@/features/collective/hooks/useCollective";
import { useCollectiveMembers, useImportMembers } from "@/features/collective/hooks/useCollectiveMembers";
import { useCollectiveEvidences, useCreateCollectiveEvidence, useImportEventCollective } from "@/features/collective/hooks/useCollectiveEvidence";
import { useAuth } from "@/features/auth/store/auth-store";
import { useEvents } from "@/features/event/hooks/useEvents";
import type { EventRegistryItem, RosterImportResult } from "@/lib/api/types";

const CRITERIA_TC = [
  { key: "participation", label: "Danh sách 100% SV tham gia phong trào", icon: "roster" as const, evidence: ["Roster lớp HK1", "Roster lớp HK2"], file: SAMPLE_GCN },
  { key: "achieved", label: "Danh sách SV đạt SV5T cấp Trường", icon: "ok" as const, evidence: ["QĐ công nhận SV5T cấp Trường — 12 SV"], file: SAMPLE_GCN },
  { key: "higher", label: "Minh chứng SV đạt cấp cao hơn", icon: "aim" as const, evidence: ["QĐ SV5T cấp ĐHĐN — 4 SV"], file: SAMPLE_GCN },
  { key: "noViolation", label: "Xác nhận không có SV vi phạm", icon: "ok" as const, evidence: ["Văn bản xác nhận của Khoa CNTT"], file: SAMPLE_GCN },
  { key: "activity", label: "Ảnh hoạt động tập thể", icon: "evidence" as const, evidence: ["Album Mùa hè xanh", "Album Tiếp sức mùa thi"], file: MEDIA.events[0] },
  { key: "minutes", label: "Biên bản / xác nhận triển khai phong trào", icon: "audit" as const, evidence: ["Biên bản họp chi hội HK1", "Biên bản bình bầu"], file: SAMPLE_GCN },
  { key: "report", label: "Báo cáo hoạt động tập thể", icon: "kb" as const, evidence: ["Báo cáo công tác Chi hội năm học 2025–2026"], file: SAMPLE_GCN },
];

export function CollectiveWorkspace() {
  const className = useAuth((s) => s.user?.className);
  const { data: collectiveRes, isLoading: collectiveLoading } = useCurrentCollective();
  const startMutation = useStartCollective();
  const submitMutation = useSubmitCollective();
  const precheckMutation = useCollectivePrecheck();
  const createEvidenceMutation = useCreateCollectiveEvidence();
  const importEventMutation = useImportEventCollective();

  const [active, setActive] = useState("participation");
  const [filter, setFilter] = useState<"all" | "registered" | "sv5t" | "noViolation">("all");
  const [importModal, setImportModal] = useState(false);
  const [eventSearch, setEventSearch] = useState("");
  const [eventCriterion, setEventCriterion] = useState("activity");

  const collectiveId = collectiveRes?.collective?.id;
  
  const { data: members = [], isLoading: membersLoading } = useCollectiveMembers(collectiveId);
  const { data: evidences = [], isLoading: evidencesLoading } = useCollectiveEvidences(collectiveId);
  const eventsQuery = useEvents({
    q: eventSearch.trim() || undefined,
    status: "active",
    limit: 50,
  });

  if (collectiveLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;
  }

  if (!collectiveRes || collectiveRes.state === "not_started" || !collectiveRes.collective) {
    return (
      <div className="flex flex-col items-center justify-center p-10 h-full min-h-[70vh] text-center">
        <div className="w-20 h-20 rounded-3xl gradient-brand flex items-center justify-center text-white mb-6">
          <UsersRound className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-brand-deep">Chưa có hồ sơ Tập thể</h2>
        <p className="text-muted-foreground mt-2 mb-6 max-w-md">Bắt đầu tạo hồ sơ Tập thể Sinh viên 5 tốt cho chi đoàn/lớp của bạn ngay bây giờ.</p>
        <Button 
          onClick={() => startMutation.mutate({ schoolYear: "2025-2026", className: className || "22T1", targetLevel: "school" })}
          disabled={startMutation.isPending}
        >
          {startMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Bắt đầu tạo hồ sơ
        </Button>
      </div>
    );
  }

  const c = collectiveRes.collective;
  const memberSummary = c.memberSummary;
  const totalMembers = memberSummary?.totalMembers ?? c.total ?? members.length;
  const participatedMembers = memberSummary?.participatedMembers ?? c.registered ?? members.filter((m) => m.participationStatus === "participated").length;
  const schoolSv5tMembers = memberSummary?.schoolSv5tMembers ?? c.sv5tTruong ?? members.filter((m) => !["none", "unknown"].includes(m.individualSv5tLevel ?? "unknown")).length;
  const ratioRegister = memberSummary?.participationRate ?? (totalMembers ? Math.round((participatedMembers / totalMembers) * 100) : 0);
  const ratioPass = memberSummary?.schoolSv5tRate ?? (totalMembers ? Math.round((schoolSv5tMembers / totalMembers) * 100) : 0);
  const readinessScore = c.progress ?? c.readinessScore ?? 0;
  const isReadOnly = !["draft", "prechecked", "ready_to_submit", "supplement_required"].includes(c.status);

  const rows = members.filter((r) => {
    if (filter === "all") return true;
    if (filter === "registered") return r.participationStatus === "participated";
    if (filter === "sv5t") return r.individualSv5tLevel !== "none" && r.individualSv5tLevel !== "unknown";
    if (filter === "noViolation") return r.violationStatus === "none";
    return true;
  });

  const block = CRITERIA_TC.find(x => x.key === active)!;
  const blockEvidences = evidences.filter((e) => {
    if (e.collectiveCriterion) return e.collectiveCriterion === block.key;
    return e.evidenceName.includes(block.label);
  });

  const onSubmit = () => {
    submitMutation.mutate({ id: c.id, options: { allowSubmitWithWarnings: false } });
  };
  const onPreCheck = () => {
    precheckMutation.mutate({ id: c.id, level: c.targetLevel });
  };
  const onCreateEvidence = () => {
    createEvidenceMutation.mutate({
      collectiveId: c.id,
      data: {
        evidenceName: block.label,
        collectiveCriterion: block.key,
        sourceType: "manual_upload",
      },
    });
  };
  const onImportEvent = (event: EventRegistryItem) => {
    importEventMutation.mutate({
      collectiveId: c.id,
      data: {
        eventId: event.id,
        collectiveCriterion: eventCriterion,
      },
    });
  };

  return (
    <>
      <TopBar
        title={`Hồ sơ Tập thể SV5T — ${c.className}`}
        subtitle={`Một hồ sơ duy nhất cho năm học ${c.schoolYear} • Tự động lưu lúc ${new Date(c.lastUpdatedAt).toLocaleTimeString()}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={onPreCheck} disabled={precheckMutation.isPending || isReadOnly}><Sparkles className="w-4 h-4" /> Tiền kiểm</Button>
            <Button onClick={onSubmit} disabled={submitMutation.isPending || isReadOnly}><Send className="w-4 h-4" /> Nộp chính thức</Button>
          </div>
        }
      />

      <Card className="mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-12 h-12 rounded-lg bg-[#0057C2] text-white flex items-center justify-center"><UsersRound className="w-6 h-6" /></div>
          <div className="min-w-0">
            <div className="font-bold text-brand-deep">{c.className} — Lớp/Chi đoàn</div>
            <div className="text-[12px] text-muted-foreground">Một hồ sơ chính thức cho mùa xét • {c.schoolYear}</div>
          </div>
          <span className={`text-[11.5px] px-3 py-1 rounded-full font-semibold ml-auto bg-amber-100 text-amber-800`}>
            {c.status === "draft" ? "Bản nháp" : c.status}
          </span>
          <Chip tone="brand">Aim: {c.targetLevel}</Chip>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Tổng sinh viên" value={totalMembers} icon={<UsersRound className="w-4 h-4" />} />
        <StatCard label="Tỷ lệ tham gia phong trào" value={`${ratioRegister}%`} icon={<CheckCircle2 className="w-4 h-4" />} tint="#22C55E" />
        <StatCard label="Đạt SV5T cấp Trường" value={schoolSv5tMembers} icon={<FileText className="w-4 h-4" />} tint="#0e7bcf" />
        <StatCard label="Tỷ lệ đạt danh hiệu" value={`${ratioPass}%`} icon={<FileText className="w-4 h-4" />} tint="#0057C2" />
      </div>

      <Card className="!p-2 mb-4">
        <div className="flex flex-wrap gap-2">
          {[
            { href: "#collective-roster", label: "Danh sách sinh viên" },
            { href: "#collective-evidence", label: "Minh chứng tập thể" },
            { href: "#collective-events", label: "Kho sự kiện tập thể" },
            { href: "#collective-readiness", label: "Tiền kiểm & nộp" },
          ].map((item) => (
            <a key={item.href} href={item.href} className="rounded-lg bg-[#F1F7FD] px-3 py-2 text-[12.5px] font-semibold text-brand-deep hover:bg-[#E5EFFA]">
              {item.label}
            </a>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-12 gap-4">
        {/* LEFT: roster */}
        <aside id="collective-roster" className="lg:col-span-4 scroll-mt-4">
          <Card className="!p-3 h-full">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-brand-deep text-[13px]">Danh sách Chi hội</h4>
              <span className="text-[11px] text-muted-foreground">{rows.length}/{members.length}</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {[
                { k: "all", l: "Tất cả" },
                { k: "registered", l: "Đã tham gia" },
                { k: "sv5t", l: "Đạt SV5T" },
                { k: "noViolation", l: "Không vi phạm" },
              ].map((f) => (
                <button key={f.k} onClick={() => setFilter(f.k as any)} className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${filter === f.k ? "bg-[#0057C2] text-white" : "bg-[#F1F7FD] text-brand-deep"}`}>{f.l}</button>
              ))}
            </div>

            <Button size="sm" variant="secondary" className="w-full mb-3" onClick={() => setImportModal(true)} disabled={isReadOnly}>
              <FileUp className="w-3.5 h-3.5" /> Upload danh sách (Excel/CSV)
            </Button>

            {membersLoading ? (
              <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : members.length === 0 ? (
              <div className="text-center py-6">
                <UsersRound className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <div className="text-xs text-muted-foreground">Chưa có danh sách sinh viên.</div>
              </div>
            ) : (
              <ul className="space-y-1 overflow-y-auto max-h-[400px]">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-[#F6F9FC]">
                    <div className="w-7 h-7 rounded-md bg-[#F1F7FD] flex items-center justify-center text-[11px] text-[#0057C2] font-bold">
                      {r.studentName.split(" ").slice(-1)[0][0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-semibold text-brand-deep truncate">{r.studentName}</div>
                      <div className="text-[10.5px] text-muted-foreground">{r.studentCode} • SV5T: {r.individualSv5tLevel === "none" ? "Không" : r.individualSv5tLevel}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>

        {/* CENTER: collective criteria dashboard */}
        <section id="collective-evidence" className="lg:col-span-5 space-y-3 scroll-mt-4">
          <Card>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Minh chứng tập thể theo nhóm</div>
            <ul className="space-y-1">
              {CRITERIA_TC.map((b) => (
                <li key={b.key}>
                  <button onClick={() => setActive(b.key)} className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2.5 ${active === b.key ? "bg-[#F1F7FD]" : "hover:bg-[#F6F9FC]"}`}>
                    <IconTile name={b.icon} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-semibold text-brand-deep">{b.label}</div>
                      <div className="text-[11px] text-muted-foreground">Xem chi tiết</div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${active === b.key ? "text-[#0057C2]" : "text-muted-foreground"}`} />
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-brand-deep text-[14px]">{block.label}</h4>
              <Button size="sm" variant="secondary" onClick={onCreateEvidence} disabled={createEvidenceMutation.isPending || isReadOnly}>
                {createEvidenceMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />} Thêm minh chứng
              </Button>
            </div>
            {evidencesLoading ? (
              <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : blockEvidences.length === 0 ? (
              <div className="text-center py-6 bg-[#F6F9FC] rounded-lg">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <div className="text-xs text-muted-foreground">Chưa có minh chứng cho phần này.</div>
              </div>
            ) : (
              <ul className="mt-3 text-[12.5px] space-y-2">
                {blockEvidences.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 p-2 border border-[#EEF2F7] rounded-md">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{e.evidenceName}</span>
                    <Chip tone={e.indexingStatus === "indexed" ? "success" : "warning"} >
                      {e.indexingStatus === "indexed" ? "Đã duyệt" : "Chờ xử lý"}
                    </Chip>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        {/* RIGHT: progress */}
        <aside id="collective-readiness" className="lg:col-span-3 space-y-3 scroll-mt-4">
          <Card>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Readiness tập thể</div>
            <div className="text-[32px] font-extrabold text-brand-deep leading-none">{readinessScore}%</div>
            <div className="mt-2"><Progress value={readinessScore} /></div>
            <ul className="text-[11.5px] text-amber-800 bg-amber-50 rounded-md p-3 mt-3 space-y-1">
              {readinessScore >= 70 ? (
                <li className="text-emerald-800 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Hồ sơ đã sẵn sàng nộp.</li>
              ) : (
                <>
                  <li>• Thiếu danh sách tham gia HK2</li>
                  <li>• Cần bổ sung ảnh tập thể</li>
                </>
              )}
            </ul>
          </Card>
          <Card>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Hành động</div>
            <div className="space-y-2">
              <Button className="w-full" variant="outline"><History className="w-4 h-4" /> Lịch sử cập nhật</Button>
              <Link to="/app/collective/$id" params={{ id: c.id }}><Button className="w-full"><ArrowRight className="w-4 h-4" /> Xem chi tiết tổng quan</Button></Link>
            </div>
          </Card>
        </aside>
      </div>

      <Card id="collective-events" className="mt-4 scroll-mt-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Kho sự kiện tập thể</div>
            <h3 className="mt-0.5 text-[16px] font-bold text-brand-deep">Import sự kiện làm minh chứng cho hồ sơ lớp/chi hội</h3>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Luồng này dùng API tập thể, không ghi vào hồ sơ cá nhân của sinh viên.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 rounded-lg bg-[#F6F9FC] px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={eventSearch}
                onChange={(event) => setEventSearch(event.target.value)}
                placeholder="Tìm sự kiện..."
                className="w-48 bg-transparent text-[13px] focus:outline-none"
              />
            </div>
            <select
              value={eventCriterion}
              onChange={(event) => setEventCriterion(event.target.value)}
              className="rounded-lg bg-[#F6F9FC] px-3 py-2 text-[12.5px] font-semibold text-brand-deep"
            >
              {CRITERIA_TC.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {eventsQuery.isLoading ? (
          <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang tải sự kiện...
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(eventsQuery.data ?? []).slice(0, 6).map((event) => (
              <div key={event.id} className="flex flex-col rounded-lg border border-[#EEF2F7] p-3">
                <div className="mb-2 flex items-start gap-2">
                  <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0057C2]" />
                  <div className="min-w-0">
                    <div className="line-clamp-2 text-[13px] font-bold text-brand-deep">{event.eventName}</div>
                    <div className="mt-0.5 text-[11.5px] text-muted-foreground">{event.organizer}</div>
                  </div>
                </div>
                <div className="mb-3 flex flex-wrap gap-1">
                  <Chip tone="brand">{event.criterion}</Chip>
                  <Chip tone={event.rosterIndexed ? "success" : "muted"}>{event.rosterIndexed ? "Đã index" : "Chưa index"}</Chip>
                  <Chip>{event.participantCount} SV</Chip>
                </div>
                <Button
                  size="sm"
                  className="mt-auto w-full"
                  onClick={() => onImportEvent(event)}
                  disabled={isReadOnly || importEventMutation.isPending || !event.rosterIndexed}
                >
                  {importEventMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                  Import làm minh chứng tập thể
                </Button>
              </div>
            ))}
            {(eventsQuery.data ?? []).length === 0 && (
              <div className="rounded-lg bg-[#F6F9FC] p-6 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                Không tìm thấy sự kiện phù hợp.
              </div>
            )}
          </div>
        )}
      </Card>

      <AnimatePresence>
        {importModal && c && (
          <RosterImportModal collectiveId={c.id} onClose={() => setImportModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}

// ============== ROSTER IMPORT MODAL ==============
function RosterImportModal({ collectiveId, onClose }: { collectiveId: string; onClose: () => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<RosterImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportMembers();

  const handleUpload = () => {
    if (!selectedFile) return;
    importMutation.mutate({ id: collectiveId, file: selectedFile }, {
      onSuccess: (data) => {
        setImportResult(data.result);
        if (data.result.invalidRows.length === 0) {
          toast.success(`Nhập thành công ${data.result.inserted} dòng, cập nhật ${data.result.updated} dòng.`);
        }
      }
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }} className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[var(--shadow-lift)] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[#EEF2F7]">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Cập nhật tập thể</div>
            <h3 className="text-[18px] font-bold text-brand-deep">Tải lên danh sách sinh viên</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#F1F7FD] flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {!importResult ? (
            <div className="space-y-4">
              <div className="text-[13px] text-muted-foreground">
                Tải lên file Excel (.xlsx) hoặc CSV chứa danh sách sinh viên của lớp/chi đoàn. Các cột bắt buộc: <b>MSSV, Họ và tên</b>.
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".csv,.xls,.xlsx"
              />
              <div 
                className="border-2 border-dashed border-[#DCE7F2] rounded-xl p-8 text-center bg-[#F6F9FC] cursor-pointer hover:bg-[#EEF2F7] transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="w-8 h-8 text-brand mx-auto mb-3" />
                <div className="text-[14px] font-bold text-brand-deep">
                  {selectedFile ? selectedFile.name : "Nhấp để chọn file từ máy tính"}
                </div>
                <div className="text-[12px] text-muted-foreground mt-1">Định dạng hỗ trợ: CSV, XLS, XLSX. Tối đa 5MB.</div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="ghost" onClick={onClose} disabled={importMutation.isPending}>Hủy</Button>
                <Button onClick={handleUpload} disabled={importMutation.isPending || !selectedFile}>
                  {importMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileUp className="w-4 h-4 mr-2" />}
                  Import dữ liệu
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Tổng số dòng" value={importResult.totalRows} />
                <StatCard label="Thêm mới" value={importResult.inserted} tint="#22C55E" />
                <StatCard label="Cập nhật" value={importResult.updated} tint="#0e7bcf" />
              </div>
              
              {importResult.invalidRows.length > 0 ? (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2 text-amber-700 font-bold text-[13px]">
                    <AlertTriangle className="w-4 h-4" /> Phát hiện {importResult.invalidRows.length} dòng lỗi
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-[12px] text-amber-800 max-h-48 overflow-y-auto">
                    <ul className="space-y-2">
                      {importResult.invalidRows.map((err, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="font-bold min-w-[50px]">Dòng {err.row}:</span>
                          <span>{err.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-[11.5px] text-muted-foreground mt-2">
                    Các dòng hợp lệ đã được import. Bạn có thể sửa file gốc và tải lên lại (các MSSV cũ sẽ tự động được cập nhật, không bị trùng).
                  </p>
                </div>
              ) : (
                <div className="mt-4 bg-emerald-50 text-emerald-800 p-4 rounded-lg flex items-center justify-center gap-2 font-bold text-[14px]">
                  <CheckCircle2 className="w-5 h-5" /> Import hoàn tất không có lỗi!
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button onClick={onClose}>Đóng lại</Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
