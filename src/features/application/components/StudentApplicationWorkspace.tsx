import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileText,
  Info,
  Layers3,
  Plus,
  Search,
  Send,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button, Card, Chip, Progress } from "@/components/ui-kit";
import {
  CRITERIA,
  CURRENT_STUDENT,
  EVENT_REGISTRY,
  LEVELS,
  PROFILE_STATUS,
  type CriterionKey,
  type Evidence,
  type EvidenceSourceType,
  type ProfileLifecycle,
} from "@/lib/mock-data";
import { useApp } from "@/lib/store";

type WorkspaceTab = "info" | "criteria" | "precheck" | "tracking";

const TAB_LABELS: Record<WorkspaceTab, string> = {
  info: "Thông tin & cấp aim",
  criteria: "Tiêu chí & minh chứng",
  precheck: "Tiền kiểm trước khi nộp",
  tracking: "Theo dõi sau khi nộp",
};

const STATUS_CTA: Record<ProfileLifecycle, string> = {
  "not-started": "Bắt đầu hồ sơ",
  drafting: "Tiếp tục hoàn thiện",
  prechecked: "Xem kết quả tiền kiểm",
  ready: "Nộp hồ sơ",
  submitted: "Theo dõi xét duyệt",
  reviewing: "Theo dõi xét duyệt",
  supplement: "Bổ sung minh chứng",
  resolution: "Theo dõi xét duyệt",
  done: "Xem kết quả",
};

const CRITERION_COPY: Record<CriterionKey | "priority", { requirement: string; missing: string[]; next: string; suggestions: string[] }> = {
  "dao-duc": {
    requirement: "Điểm rèn luyện đạt yêu cầu, không vi phạm kỷ luật và có xác nhận phù hợp.",
    missing: [],
    next: "Chờ cán bộ xác minh phiếu điểm rèn luyện.",
    suggestions: ["Phiếu điểm rèn luyện HK1", "Phiếu điểm rèn luyện HK2", "Xác nhận của Khoa"],
  },
  "hoc-tap": {
    requirement: "GPA đạt ngưỡng theo cấp aim và không có điểm học phần bị cảnh báo.",
    missing: [],
    next: "GPA đã đạt ngưỡng cấp Thành phố.",
    suggestions: ["Bảng điểm năm học", "Giấy khen học thuật", "Minh chứng NCKH"],
  },
  "the-luc": {
    requirement: "Có minh chứng đạt chuẩn thể lực hoặc thành tích thể thao được xác nhận.",
    missing: ["Minh chứng thể lực cần cán bộ xác minh rõ hơn."],
    next: "Mở thẻ minh chứng để kiểm tra thông tin hệ thống đọc được.",
    suggestions: ["Giấy chứng nhận Sinh viên khỏe", "Giải thể thao cấp Trường", "Phiếu kiểm tra thể lực"],
  },
  "tinh-nguyen": {
    requirement: "Có đủ số ngày tình nguyện theo cấp aim và giấy chứng nhận của đơn vị tổ chức.",
    missing: ["Còn thiếu 2 ngày nếu giữ aim Cấp Thành phố."],
    next: "Bổ sung thêm 2 ngày tình nguyện hoặc chọn cấp xét phù hợp hơn.",
    suggestions: ["Mùa hè xanh", "Tiếp sức mùa thi", "Hiến máu nhân đạo", "Xuân tình nguyện"],
  },
  "hoi-nhap": {
    requirement: "Có chứng chỉ ngoại ngữ hoặc hoạt động hội nhập còn hiệu lực, đúng thông tin cá nhân.",
    missing: ["Chứng chỉ ngoại ngữ cần kiểm tra ngày cấp."],
    next: "Xem chi tiết thẻ IELTS để xác minh ngày cấp.",
    suggestions: ["IELTS / TOEIC / HSK / JLPT", "Hội thảo quốc tế", "Giao lưu sinh viên quốc tế"],
  },
  priority: {
    requirement: "Thành tích ưu tiên giúp hồ sơ rõ hơn khi xét cấp cao, không thay thế 5 tiêu chí chính.",
    missing: ["Chưa có minh chứng ưu tiên."],
    next: "Thêm thành tích nổi bật nếu có.",
    suggestions: ["Giấy khen cấp Trường", "Giải thưởng học thuật", "Thành tích phong trào"],
  },
};

const CRITERIA_PLUS = [
  ...CRITERIA,
  { key: "priority" as const, label: "Thành tích / ưu tiên", short: "Ưu tiên", color: "#7c3aed" },
];

const sourceLabel: Record<string, string> = {
  metric_input: "nhập chỉ số",
  event_import: "import sự kiện",
  manual_upload: "upload thủ công",
  collective_import: "tập thể import",
};

const statusLabel: Record<string, { label: string; tone: "success" | "warning" | "error" | "muted" | "brand" }> = {
  indexed: { label: "đã tiền kiểm", tone: "success" },
  pending: { label: "đang đọc minh chứng", tone: "warning" },
  queued: { label: "đang đọc minh chứng", tone: "warning" },
  processing: { label: "đang đọc minh chứng", tone: "warning" },
  needs_manual_review: { label: "cần xác minh", tone: "warning" },
  failed: { label: "cần bổ sung", tone: "error" },
};

export function StudentApplicationWorkspace({ initialTab = "info" }: { initialTab?: WorkspaceTab }) {
  const application = useApp((s) => s.application);
  const updateApplication = useApp((s) => s.updateApplication);
  const submitProfile = useApp((s) => s.submitProfile);
  const pushNotification = useApp((s) => s.pushNotification);
  const evidence = useApp((s) => s.evidence);
  const addEvidence = useApp((s) => s.addEvidence);

  const [tab, setTab] = useState<WorkspaceTab>(initialTab);
  const [openCriterion, setOpenCriterion] = useState<CriterionKey | "priority">("tinh-nguyen");
  const [drawerEvidence, setDrawerEvidence] = useState<Evidence | null>(null);
  const [addCriterion, setAddCriterion] = useState<CriterionKey | "priority" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [overrideWarning, setOverrideWarning] = useState(false);

  const targetLevel = LEVELS.find((level) => level.key === application.targetLevel) ?? LEVELS[2];
  const status = PROFILE_STATUS[application.status];
  const missingImportant = evidence.some((item) => item.warnings.length > 0);
  const stickyText =
    application.status === "reviewing" || application.status === "submitted"
      ? "Hồ sơ đã nộp."
      : missingImportant
        ? "Bạn còn 2 việc cần hoàn thiện trước khi nộp."
        : "Hồ sơ đã sẵn sàng để cán bộ xét.";
  const stickyCta =
    application.status === "reviewing" || application.status === "submitted"
      ? "Theo dõi xét duyệt"
      : missingImportant
        ? "Bổ sung minh chứng"
        : "Nộp hồ sơ";

  const byCriterion = useMemo(() => {
    return CRITERIA_PLUS.reduce<Record<string, Evidence[]>>((acc, item) => {
      acc[item.key] = evidence.filter((ev) => ev.criterion === item.key);
      return acc;
    }, {});
  }, [evidence]);

  const createEvidence = ({
    criterion,
    evidenceName,
    sourceType,
    originalFileName,
    extractedFields,
    eventId,
  }: {
    criterion: CriterionKey | "priority";
    evidenceName: string;
    sourceType: EvidenceSourceType;
    originalFileName?: string;
    extractedFields?: Record<string, string>;
    eventId?: string;
  }) => {
    const item: Evidence = {
      id: `evd-local-${Date.now()}`,
      applicationId: application.id,
      evidenceName,
      criterion,
      sourceType,
      eventId,
      fileUrl: "",
      originalFileName,
      indexingStatus: "pending",
      extractedFields: extractedFields ?? { "Trạng thái": "Đang đọc minh chứng" },
      matchedKnowledgeItems: [],
      confidence: 0.68,
      reviewStatus: "pending",
      warnings: ["Cần cán bộ xác minh sau khi hệ thống đọc xong."],
      levelSuggest: application.targetLevel,
    };
    addEvidence(item);
    updateApplication({ status: "drafting", readinessScore: Math.min(100, application.readinessScore + 3) });
    toast.success("Đã lưu minh chứng vào hồ sơ.");
  };

  const confirmSubmit = () => {
    if (missingImportant && !overrideWarning) {
      toast.error("Vui lòng xác nhận bạn hiểu các cảnh báo trước khi nộp.");
      return;
    }
    updateApplication({
      status: "reviewing",
      submittedAt: new Date().toISOString(),
      readinessScore: Math.max(application.readinessScore, 88),
    });
    submitProfile(application.id);
    pushNotification({
      title: "Hồ sơ đã được nộp để cán bộ xét duyệt",
      desc: "Hệ thống đã chuyển hồ sơ đến cán bộ phụ trách theo từng tiêu chí.",
      type: "success",
    });
    setConfirmOpen(false);
    setOverrideWarning(false);
    setTab("tracking");
    toast.success("Hồ sơ đã được nộp để cán bộ xét duyệt.");
  };

  const openSubmitConfirmation = () => {
    setOverrideWarning(false);
    setConfirmOpen(true);
  };

  const handleStickyAction = () => {
    if (application.status === "reviewing" || application.status === "submitted") {
      setTab("tracking");
      return;
    }
    if (missingImportant) {
      setTab("criteria");
      setOpenCriterion("tinh-nguyen");
      return;
    }
    openSubmitConfirmation();
  };

  return (
    <>
      <TopBar
        title="Hồ sơ của tôi"
        subtitle="Hoàn thiện một hồ sơ duy nhất cho mùa xét 2025-2026, tiền kiểm và nộp để cán bộ xét duyệt."
      />

      <div className="pb-24">
        <Card className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone="brand"><FileText className="w-3 h-3" /> Hồ sơ 2025-2026</Chip>
                <Chip tone={application.status === "reviewing" ? "success" : "warning"}>{status.label}</Chip>
              </div>
              <h2 className="mt-3 text-2xl font-bold text-brand-deep">Hoàn thiện và nộp hồ sơ SV5T</h2>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Bạn chỉ nộp một hồ sơ duy nhất. 5TOT sẽ tiền kiểm hồ sơ theo cấp aim bạn chọn và gợi ý cấp xét phù hợp hơn nếu cần.
              </p>
            </div>
            <div className="w-full max-w-xs">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tiến độ hoàn thiện</span>
                <b className="text-brand-deep">{application.readinessScore}%</b>
              </div>
              <Progress value={application.readinessScore} />
              <div className="mt-2 text-xs text-muted-foreground">Cập nhật: {application.lastUpdatedAt}</div>
            </div>
          </div>
        </Card>

        <div className="mb-5 flex gap-2 overflow-x-auto rounded-lg border border-[#E3ECF6] bg-white p-1">
          {(Object.keys(TAB_LABELS) as WorkspaceTab[]).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`shrink-0 rounded-md px-3 py-2 text-[13px] font-semibold transition-colors ${
                tab === key ? "bg-[#0057C2] text-white" : "text-slate-600 hover:bg-[#F1F7FD] hover:text-brand-deep"
              }`}
            >
              {TAB_LABELS[key]}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="flex flex-wrap items-center gap-4">
                <img src={CURRENT_STUDENT.avatar} className="h-16 w-16 rounded-lg object-cover" alt="" />
                <div className="min-w-0">
                  <h3 className="font-bold text-brand-deep">{CURRENT_STUDENT.name}</h3>
                  <div className="text-sm text-muted-foreground">{CURRENT_STUDENT.mssv} • {CURRENT_STUDENT.khoa} • {CURRENT_STUDENT.lop}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                    <span>GPA {CURRENT_STUDENT.gpa}</span>
                    <span>Điểm rèn luyện {CURRENT_STUDENT.drl}</span>
                    <span>Năm học {application.schoolYear}</span>
                  </div>
                </div>
              </div>
              <div className="mt-5 rounded-lg bg-[#F4FAFF] p-4 text-sm text-brand-deep">
                Bạn chỉ nộp một hồ sơ duy nhất. 5TOT sẽ tiền kiểm hồ sơ theo cấp aim bạn chọn và gợi ý cấp xét phù hợp hơn nếu cần.
              </div>
            </Card>

            <Card>
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Cấp aim</div>
              <div className="mt-3 space-y-2">
                {LEVELS.map((level) => {
                  const active = level.key === application.targetLevel;
                  return (
                    <button
                      key={level.key}
                      onClick={() => updateApplication({ targetLevel: level.key, status: "drafting" })}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                        active ? "border-[#0057C2] bg-[#F1F7FD]" : "border-[#E3ECF6] hover:bg-[#F6F9FC]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-brand-deep">{level.label}</span>
                        {active && <Chip tone="brand">Đang aim</Chip>}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{level.desc}</div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Đã tự động lưu lựa chọn.
              </div>
            </Card>
          </div>
        )}

        {tab === "criteria" && (
          <div className="space-y-3">
            {CRITERIA_PLUS.map((criterion) => {
              const items = byCriterion[criterion.key] ?? [];
              const copy = CRITERION_COPY[criterion.key];
              const open = openCriterion === criterion.key;
              const missing = copy.missing.length;
              return (
                <div key={criterion.key} className="rounded-lg border border-[#E3ECF6] bg-white">
                  <button
                    onClick={() => setOpenCriterion(open ? "priority" : criterion.key)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <span className="h-9 w-9 shrink-0 rounded-lg" style={{ background: criterion.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-brand-deep">{criterion.label}</span>
                        <Chip tone={missing ? "warning" : "success"}>{missing ? "Cần bổ sung" : "Tạm ổn"}</Chip>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {items.length} minh chứng • còn thiếu {missing} • {copy.next}
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>

                  {open && (
                    <div className="border-t border-[#E3ECF6] px-4 py-4">
                      <div className="grid gap-4 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                          <div className="rounded-lg bg-[#F6F9FC] p-4">
                            <div className="text-sm font-semibold text-brand-deep">Yêu cầu chính</div>
                            <p className="mt-1 text-sm text-muted-foreground">{copy.requirement}</p>
                            {copy.missing.length > 0 && (
                              <div className="mt-3 space-y-1">
                                {copy.missing.map((item) => (
                                  <div key={item} className="flex gap-2 text-sm text-amber-700">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {item}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="mt-3 space-y-2">
                            {items.length === 0 && (
                              <div className="rounded-lg bg-[#F6F9FC] p-4 text-sm text-muted-foreground">Chưa có minh chứng cho mục này.</div>
                            )}
                            {items.map((item) => {
                              const mappedStatus = statusLabel[item.indexingStatus] ?? { label: "đã lưu", tone: "muted" as const };
                              return (
                                <div key={item.id} className="flex gap-3 rounded-lg border border-[#E3ECF6] p-3">
                                  <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-md bg-[#F1F7FD]">
                                    <FileText className="h-5 w-5 text-[#0057C2]" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-semibold text-brand-deep">{item.evidenceName}</span>
                                      <Chip tone={mappedStatus.tone}>{mappedStatus.label}</Chip>
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      {sourceLabel[item.sourceType]} • độ chắc chắn của gợi ý {Math.round(item.confidence * 100)}%
                                    </div>
                                    <button onClick={() => setDrawerEvidence(item)} className="mt-2 text-xs font-semibold text-[#0057C2] hover:underline">
                                      Xem chi tiết
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="rounded-lg bg-[#F4FAFF] p-4">
                          <div className="text-sm font-semibold text-brand-deep">Minh chứng gợi ý</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {copy.suggestions.map((item) => <Chip key={item} tone="brand">{item}</Chip>)}
                          </div>
                          <Button className="mt-4 w-full" onClick={() => setAddCriterion(criterion.key)}>
                            <Plus className="h-4 w-4" /> Thêm minh chứng
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "precheck" && (
          <div className="space-y-4">
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Chip tone="brand"><Sparkles className="h-3 w-3" /> AI tiền kiểm</Chip>
                  <h3 className="mt-3 text-2xl font-bold text-brand-deep">Hồ sơ hiện sẵn sàng khoảng {application.readinessScore}%</h3>
                  <p className="mt-1 text-sm text-muted-foreground">AI tiền kiểm. Cán bộ/Hội đồng xác nhận quyết định cuối cùng.</p>
                </div>
                <div className="min-w-[220px]">
                  <Progress value={application.readinessScore} />
                  <div className="mt-2 text-xs text-muted-foreground">Aim hiện tại: {targetLevel.label}</div>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-3">
              <PrecheckBlock
                title="Điểm mạnh"
                tone="success"
                items={["GPA đạt ngưỡng cấp Thành phố.", "Điểm rèn luyện đạt yêu cầu.", "Đã có minh chứng hội nhập."]}
              />
              <PrecheckBlock
                title="Cần bổ sung"
                tone="warning"
                items={["Tình nguyện còn thiếu 2 ngày nếu giữ aim Cấp Thành phố.", "Minh chứng thể lực cần cán bộ xác minh.", "Chứng chỉ ngoại ngữ cần kiểm tra ngày cấp."]}
              />
              <PrecheckBlock
                title="Gợi ý cấp xét phù hợp"
                tone="brand"
                items={["Cấp Thành phố: Chưa đủ nếu chưa bổ sung tình nguyện.", "Cấp Đại học Đà Nẵng: Có khả năng đạt.", "Cấp Trường: Có khả năng đạt."]}
              />
            </div>

            <Card>
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-brand-deep">Xem chi tiết tiền kiểm</summary>
                <div className="mt-3 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                  <div className="rounded-lg bg-[#F6F9FC] p-3">Thông tin hệ thống đọc được được giữ trong từng thẻ minh chứng.</div>
                  <div className="rounded-lg bg-[#F6F9FC] p-3">5TOT chỉ gợi ý. Cán bộ xác nhận và Hội đồng chốt quyết định cuối cùng.</div>
                </div>
              </details>
            </Card>
          </div>
        )}

        {tab === "tracking" && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <h3 className="font-bold text-brand-deep">Tiến trình hồ sơ</h3>
              <div className="mt-4 space-y-3">
                {["Đã lưu bản nháp", "Đã tiền kiểm hồ sơ", "Đã nộp hồ sơ", "Hệ thống đã chuyển hồ sơ đến cán bộ phụ trách", "Đang xét tiêu chí Tình nguyện tốt"].map((item, index) => (
                  <div key={item} className="flex gap-3">
                    <div className={`mt-0.5 h-6 w-6 rounded-full ${index < 4 || application.status === "reviewing" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"} flex items-center justify-center`}>
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-brand-deep">{item}</div>
                      <div className="text-xs text-muted-foreground">{index === 2 && application.submittedAt ? new Date(application.submittedAt).toLocaleString("vi-VN") : "Đã cập nhật"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="space-y-4">
              <Card>
                <h3 className="font-bold text-brand-deep">Trạng thái theo tiêu chí</h3>
                <div className="mt-3 space-y-2 text-sm">
                  {[
                    ["Đạo đức", "Chờ xét"],
                    ["Học tập", "Đã xác nhận"],
                    ["Thể lực", "Cần xác minh"],
                    ["Tình nguyện", "Cần bổ sung"],
                    ["Hội nhập", "Đang xét"],
                  ].map(([name, value]) => (
                    <div key={name} className="flex items-center justify-between gap-3 rounded-lg bg-[#F6F9FC] px-3 py-2">
                      <span className="font-medium text-brand-deep">{name}</span>
                      <span className="text-xs text-muted-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <Chip tone="warning"><AlertTriangle className="h-3 w-3" /> Yêu cầu bổ sung</Chip>
                <div className="mt-3 font-semibold text-brand-deep">Cán bộ yêu cầu bổ sung minh chứng Tình nguyện tốt</div>
                <p className="mt-1 text-sm text-muted-foreground">Bổ sung thêm hoạt động có xác nhận số ngày tham gia.</p>
                <Button className="mt-4 w-full" onClick={() => { setTab("criteria"); setOpenCriterion("tinh-nguyen"); }}>
                  Bổ sung ngay
                </Button>
              </Card>
            </div>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#DCE7F2] bg-white/95 px-4 py-3 backdrop-blur md:left-72">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-brand-deep">{stickyText}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Progress value={application.readinessScore} /> <span className="shrink-0">{application.readinessScore}%</span>
            </div>
          </div>
          <Button className="sm:min-w-[180px]" onClick={handleStickyAction}>
            {stickyCta === "Nộp hồ sơ" ? <Send className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}
            {stickyCta}
          </Button>
          {missingImportant && application.status !== "reviewing" && application.status !== "submitted" && (
            <Button variant="outline" className="sm:min-w-[150px]" onClick={() => setConfirmOpen(true)}>
              <Send className="h-4 w-4" />
              Nộp hồ sơ
            </Button>
          )}
        </div>
      </div>

      {drawerEvidence && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30" onClick={() => setDrawerEvidence(null)}>
          <div className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Thẻ minh chứng</div>
                <h3 className="mt-1 text-lg font-bold text-brand-deep">{drawerEvidence.evidenceName}</h3>
              </div>
              <button className="rounded-lg p-2 hover:bg-[#F1F7FD]" onClick={() => setDrawerEvidence(null)}><X className="h-4 w-4" /></button>
            </div>
            <DrawerSection title="Thông tin hệ thống đọc được">
              {Object.entries(drawerEvidence.extractedFields).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-3 rounded-lg bg-[#F6F9FC] px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{key}</span>
                  <span className="font-medium text-brand-deep">{value}</span>
                </div>
              ))}
            </DrawerSection>
            <DrawerSection title="Nguồn minh chứng">
              <div className="text-sm text-muted-foreground">{sourceLabel[drawerEvidence.sourceType]} • {drawerEvidence.originalFileName ?? "Chưa có file"}</div>
            </DrawerSection>
            <DrawerSection title="Sự kiện khớp nếu có">
              <div className="text-sm text-muted-foreground">{EVENT_REGISTRY.find((event) => event.id === drawerEvidence.matchedEvent)?.eventName ?? "Chưa khớp sự kiện nào"}</div>
            </DrawerSection>
            <DrawerSection title="Minh chứng tương tự">
              <div className="text-sm text-muted-foreground">{drawerEvidence.matchedKnowledgeItems.length ? drawerEvidence.matchedKnowledgeItems.join(", ") : "Chưa có minh chứng tương tự"}</div>
            </DrawerSection>
            <DrawerSection title="Độ chắc chắn của gợi ý">
              <div className="text-2xl font-bold text-brand-deep">{Math.round(drawerEvidence.confidence * 100)}%</div>
            </DrawerSection>
            <DrawerSection title="Cảnh báo">
              {drawerEvidence.warnings.length ? drawerEvidence.warnings.map((warning) => (
                <div key={warning} className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{warning}</div>
              )) : <div className="text-sm text-muted-foreground">Chưa có cảnh báo.</div>}
            </DrawerSection>
            <Button variant="secondary" className="mt-4 w-full">Chỉnh sửa thông tin đọc được</Button>
          </div>
        </div>
      )}

      {addCriterion && (
        <AddEvidenceModal
          criterion={addCriterion}
          onClose={() => setAddCriterion(null)}
          onCreated={(payload) => {
            createEvidence(payload);
            setAddCriterion(null);
          }}
        />
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-xl font-bold text-brand-deep">Xác nhận nộp hồ sơ</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Sau khi nộp, hồ sơ sẽ được khóa để cán bộ xét duyệt. Bạn chỉ có thể bổ sung khi có yêu cầu từ cán bộ.
            </p>
            <div className="mt-4 space-y-2">
              {["Đã chọn cấp aim", "Đã nhập thông tin cơ bản", "Đã thêm minh chứng cho các tiêu chí chính", "Đã xem kết quả tiền kiểm"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-brand-deep">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {item}
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Quay lại kiểm tra</Button>
              <Button onClick={confirmSubmit}>Xác nhận nộp</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AddEvidenceModal({
  criterion,
  onClose,
  onCreated,
}: {
  criterion: CriterionKey | "priority";
  onClose: () => void;
  onCreated: (payload: {
    criterion: CriterionKey | "priority";
    evidenceName: string;
    sourceType: EvidenceSourceType;
    originalFileName?: string;
    extractedFields?: Record<string, string>;
    eventId?: string;
  }) => void;
}) {
  const [tab, setTab] = useState<"metric" | "event" | "upload">("upload");
  const criterionMeta = CRITERIA_PLUS.find((item) => item.key === criterion);
  const events = EVENT_REGISTRY.filter((event) => event.criterion === criterion && event.rosterIndexed);
  const [metricName, setMetricName] = useState(`Chỉ số ${criterionMeta?.short ?? "minh chứng"}`);
  const [metricValue, setMetricValue] = useState("");
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const [eventChecked, setEventChecked] = useState(false);
  const [uploadName, setUploadName] = useState(`Minh chứng ${criterionMeta?.short ?? ""}`);
  const [fileName, setFileName] = useState("");
  const selectedEvent = events.find((event) => event.id === selectedEventId);

  const submitMetric = () => {
    if (!metricName.trim()) {
      toast.error("Vui lòng nhập tên minh chứng.");
      return;
    }
    onCreated({
      criterion,
      evidenceName: metricName.trim(),
      sourceType: "metric_input",
      originalFileName: "nhap-chi-so",
      extractedFields: {
        "Tên chỉ số": metricName.trim(),
        "Giá trị": metricValue.trim() || "Chưa nhập",
        "Nguồn": "Sinh viên nhập chỉ số",
      },
    });
  };

  const submitEvent = () => {
    if (!selectedEvent) {
      toast.error("Chưa có sự kiện phù hợp để import.");
      return;
    }
    onCreated({
      criterion,
      evidenceName: `Giấy chứng nhận ${selectedEvent.eventName}`,
      sourceType: "event_import",
      eventId: selectedEvent.id,
      originalFileName: `${selectedEvent.eventName}.pdf`,
      extractedFields: {
        "Hoạt động": selectedEvent.eventName,
        "Đơn vị tổ chức": selectedEvent.organizer,
        "Giá trị quy đổi": `${selectedEvent.convertedValue} ${selectedEvent.convertedUnit}`,
      },
    });
  };

  const submitUpload = () => {
    if (!uploadName.trim()) {
      toast.error("Vui lòng nhập tên minh chứng.");
      return;
    }
    if (!fileName) {
      toast.error("Vui lòng chọn file minh chứng.");
      return;
    }
    onCreated({
      criterion,
      evidenceName: uploadName.trim(),
      sourceType: "manual_upload",
      originalFileName: fileName,
      extractedFields: {
        "Tên file": fileName,
        "Trạng thái": "Đang đọc minh chứng",
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#E3ECF6] p-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Thêm minh chứng vào hồ sơ</div>
            <h3 className="mt-1 text-xl font-bold text-brand-deep">Tiêu chí: {criterionMeta?.label ?? "Thành tích / ưu tiên"}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-[#F1F7FD]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-2 border-b border-[#E3ECF6] px-5 pt-4">
          {[
            { key: "metric", label: "Nhập chỉ số", icon: FileText },
            { key: "event", label: "Import sự kiện", icon: Search },
            { key: "upload", label: "Upload thủ công", icon: Upload },
          ].map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key as "metric" | "event" | "upload")}
                className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold ${
                  active ? "border-[#0057C2] text-[#0057C2]" : "border-transparent text-muted-foreground hover:text-brand-deep"
                }`}
              >
                <Icon className="h-4 w-4" /> {item.label}
              </button>
            );
          })}
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-5">
          {tab === "metric" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Dùng cho GPA, điểm rèn luyện, số ngày tình nguyện hoặc chỉ số đã được xác nhận.</p>
              <Field label="Tên minh chứng">
                <input className="w-full rounded-lg border border-[#DCE7F2] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0057C2]/25" value={metricName} onChange={(event) => setMetricName(event.target.value)} />
              </Field>
              <Field label="Giá trị / ghi chú">
                <textarea className="w-full rounded-lg border border-[#DCE7F2] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0057C2]/25" rows={3} value={metricValue} onChange={(event) => setMetricValue(event.target.value)} placeholder="Ví dụ: GPA 3.72/4.00 hoặc 5 ngày tình nguyện." />
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={onClose}>Hủy</Button>
                <Button onClick={submitMetric}>Lưu vào hồ sơ</Button>
              </div>
            </div>
          )}

          {tab === "event" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Tìm sự kiện đã có danh sách tham gia và import trực tiếp vào hồ sơ.</p>
              <div className="rounded-lg bg-[#F6F9FC] p-3">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input className="flex-1 bg-transparent text-sm outline-none" placeholder="Tìm sự kiện, đơn vị tổ chức..." />
                </div>
              </div>
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {events.length === 0 && (
                  <div className="rounded-lg bg-[#F6F9FC] p-4 text-sm text-muted-foreground">Chưa có sự kiện đã index cho tiêu chí này. Hãy dùng Upload thủ công.</div>
                )}
                {events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => {
                      setSelectedEventId(event.id);
                      setEventChecked(false);
                    }}
                    className={`w-full rounded-lg border p-3 text-left ${selectedEventId === event.id ? "border-[#0057C2] bg-[#F1F7FD]" : "border-[#E3ECF6] hover:bg-[#F6F9FC]"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-brand-deep">{event.eventName}</div>
                      <Chip tone="success">{event.participantCount} SV indexed</Chip>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{event.organizer} • quy đổi {event.convertedValue} {event.convertedUnit}</div>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" onClick={onClose}>Hủy</Button>
                <Button variant="outline" disabled={!selectedEvent} onClick={() => setEventChecked(true)}>Kiểm tra tên tôi</Button>
                <Button disabled={!selectedEvent || !eventChecked} onClick={submitEvent}>Import vào hồ sơ</Button>
              </div>
              {eventChecked && (
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Đã tìm thấy MSSV trong danh sách sự kiện.</div>
              )}
            </div>
          )}

          {tab === "upload" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Upload giấy chứng nhận, ảnh chụp hoặc file PDF. Hệ thống sẽ đọc minh chứng và giữ chi tiết trong thẻ minh chứng.</p>
              <Field label="Tên minh chứng">
                <input className="w-full rounded-lg border border-[#DCE7F2] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0057C2]/25" value={uploadName} onChange={(event) => setUploadName(event.target.value)} />
              </Field>
              <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#BFD3EA] bg-[#F6F9FC] p-6 text-center hover:bg-[#EEF9FF]">
                <Upload className="h-8 w-8 text-[#0057C2]" />
                <span className="mt-2 text-sm font-semibold text-brand-deep">{fileName || "Chọn file minh chứng"}</span>
                <span className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG. Đây là mock local, file chưa được gửi lên backend.</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
                />
              </label>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={onClose}>Hủy</Button>
                <Button onClick={submitUpload}>Lưu và đọc minh chứng</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-brand-deep">{label}</span>
      {children}
    </label>
  );
}

function PrecheckBlock({ title, items, tone }: { title: string; items: string[]; tone: "success" | "warning" | "brand" }) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "warning" ? AlertTriangle : Layers3;
  return (
    <Card>
      <div className="flex items-center gap-2 font-bold text-brand-deep">
        <Icon className="h-4 w-4" /> {title}
      </div>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-lg bg-[#F6F9FC] px-3 py-2 text-sm text-muted-foreground">{item}</div>
        ))}
      </div>
    </Card>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-brand-deep">
        <Info className="h-4 w-4" /> {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
