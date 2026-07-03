import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  ExternalLink,
  FileText,
  History,
  Loader2,
  SearchCheck,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { Button, Card, Chip } from "@/components/ui-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/store/auth-store";
import { evidenceApi } from "@/features/evidence/api/evidence";
import { FinalizationDialog } from "@/features/manager/components/FinalizationDialog";
import { useManagerResultDetail } from "@/features/manager/hooks/useManager";
import type { ManagerResultDetail, ManagerResultEvidence, ManagerResultItem } from "@/features/manager/types";
import type { Criterion, Level, Role } from "@/features/review/types";
import { fallbackStatusLabel, getStatusTone, getWorkflowStatusLabel } from "@/lib/status-labels";

export const Route = createFileRoute("/app/manager/results/$applicationId")({
  component: ManagerResultDetailRoute,
});

const finalizerRoles: Role[] = ["committee", "admin"];
const criterionOrder: Criterion[] = ["ethics", "academic", "physical", "volunteer", "integration"];

const criterionLabel: Record<Criterion, string> = {
  ethics: "Đạo đức tốt",
  academic: "Học tập tốt",
  physical: "Thể lực tốt",
  volunteer: "Tình nguyện tốt",
  integration: "Hội nhập tốt",
  priority: "Ưu tiên",
  collective: "Tập thể",
};

const levelLabel: Record<Level, string> = {
  school: "Cấp Trường",
  university: "Cấp ĐHĐN",
  city: "Cấp Thành phố",
  central: "Cấp Trung ương",
};

const statusLabel: Record<string, string> = {
  pending: "Chưa chốt",
  passed: "Đạt",
  partially_passed: "Đạt cấp thấp hơn",
  failed: "Chưa đạt",
  draft: "Bản nháp",
  ready_to_submit: "Sẵn sàng nộp",
  submitted: "Đã nộp",
  under_review: "Đang xét duyệt",
  supplement_required: "Cần bổ sung",
  resolution_needed: "Cần hội đồng xử lý",
  completed: "Hoàn tất",
  rejected: "Không đạt",
  waiting: "Chờ xét",
  reviewing: "Đang xét",
  accepted: "Đạt",
  needs_supplement: "Cần bổ sung",
  pending_indexing: "Chờ AI xử lý",
  indexed: "AI đã xử lý",
  not_started: "Chưa xử lý AI",
  uploaded: "Đã tải lên",
  ocr_processing: "AI đang đọc file",
  extracting: "AI đang trích xuất",
  checking_registry: "Đang đối chiếu",
  needs_manual_review: "Cần kiểm tra thủ công",
  manual_upload: "Tải lên thủ công",
  event_import: "Nhập từ sự kiện",
  metric_input: "Nhập chỉ số",
  collective_import: "Nhập từ tập thể",
};

function ManagerResultDetailRoute() {
  const { applicationId } = Route.useParams();
  const user = useAuth((state) => state.user);
  const role = user?.role as Role | undefined;
  const detailQuery = useManagerResultDetail(applicationId);
  const [finalizing, setFinalizing] = useState(false);

  if (detailQuery.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0057C2]" />
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <>
        <TopBar title="Kết quả hồ sơ" subtitle="Không thể tải chi tiết hồ sơ." action={<BackButton />} />
        <Card>
          <div className="py-10 text-center">
            <div className="font-semibold text-rose-600">
              {detailQuery.error instanceof Error ? detailQuery.error.message : "Không tìm thấy hồ sơ."}
            </div>
            <Button className="mt-4" variant="outline" onClick={() => void detailQuery.refetch()}>
              Tải lại
            </Button>
          </div>
        </Card>
      </>
    );
  }

  const detail = detailQuery.data;
  const canFinalize = role ? finalizerRoles.includes(role) : false;
  const selectedItem = toFinalizationItem(detail);

  return (
    <>
      <TopBar
        title="Chi tiết kết quả hồ sơ"
        subtitle={`${detail.student.fullName} - ${detail.student.studentCode ?? "--"}`}
        action={<BackButton />}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <HeaderCard detail={detail} />
          <CriterionSummary detail={detail} />
          <ReviewTasks detail={detail} />
          <EvidenceSection evidences={detail.applicationEvidences} />
          <AnalysisSection detail={detail} />
          <ResolutionSection detail={detail} />
          <AuditSection detail={detail} />
        </div>

        <aside className="space-y-5 xl:sticky xl:top-4 xl:self-start">
          <Card>
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-1 h-5 w-5 text-[#0057C2]" />
              <div>
                <h2 className="font-bold text-brand-deep">Tổng hợp quyết định</h2>
                <p className="mt-2 text-sm text-muted-foreground">{detail.aggregation.reason}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <Info label="Gợi ý trạng thái" value={label(detail.aggregation.suggestedFinalStatus)} />
              <Info label="Gợi ý cấp đạt" value={level(detail.aggregation.suggestedFinalLevel)} />
              <Info label="Có thể chốt" value={detail.aggregation.canFinalize ? "Có" : "Chưa"} />
            </div>
            {detail.aggregation.blockingIssues.length ? (
              <div className="mt-4 space-y-2">
                {detail.aggregation.blockingIssues.map((issue, index) => (
                  <div key={`${issue.type}-${index}`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    {issue.criterion ? `${criterionLabel[issue.criterion]}: ` : ""}
                    {issue.message}
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-5">
              {detail.application.finalizedAt ? (
                <Button className="w-full" disabled>
                  Đã chốt
                </Button>
              ) : canFinalize ? (
                <Button className="w-full" onClick={() => setFinalizing(true)}>
                  <CheckCircle2 className="h-4 w-4" />
                  Chốt kết quả
                </Button>
              ) : (
                <div className="rounded-lg border bg-slate-50 px-3 py-2 text-sm text-muted-foreground">
                  Chỉ Hội đồng/Admin được chốt kết quả. Quản lý xem tổng quan và theo dõi các tiêu chí còn vướng.
                </div>
              )}
            </div>
          </Card>
        </aside>
      </div>

      <FinalizationDialog
        item={selectedItem}
        open={finalizing}
        onOpenChange={(open) => setFinalizing(open)}
      />
    </>
  );
}

function BackButton() {
  return (
    <Button asChild variant="secondary">
      <Link to="/app/manager/results">
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>
    </Button>
  );
}

function HeaderCard({ detail }: { detail: ManagerResultDetail }) {
  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-deep">{detail.student.fullName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {detail.student.studentCode ?? "--"} • {detail.student.className ?? "--"} • {detail.student.faculty ?? "--"}
          </p>
        </div>
        <Chip tone="brand">Hồ sơ {detail.application.schoolYear}</Chip>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <Info label="Cấp đăng ký" value={level(detail.application.targetLevel)} />
        <Info label="AI/Cascade gợi ý" value={level(detail.latestCascade?.suggestedLevel)} />
        <Info label="Kết quả cuối" value={label(detail.application.finalStatus)} />
        <Info label="Cấp đạt" value={level(detail.application.finalLevel)} />
        <Info label="Trạng thái hồ sơ" value={label(detail.application.status)} />
        <Info label="Readiness" value={`${detail.application.readinessScore}%`} />
        <Info label="Submitted" value={formatDate(detail.application.submittedAt)} />
        <Info label="Cập nhật lần cuối" value={formatDate(detail.application.lastActivityAt)} />
      </div>
    </Card>
  );
}

function CriterionSummary({ detail }: { detail: ManagerResultDetail }) {
  const incompleteCriteria = criterionOrder.filter((criterion) => {
    const item = detail.criterionSummary[criterion];
    return item?.status !== "accepted";
  });

  return (
    <Card>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-bold text-brand-deep">Tổng quan 5 tiêu chí</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Màn này cho quản lý/hội đồng biết tiêu chí nào đã đạt, chưa đạt, cần bổ sung hoặc chưa được cán bộ xét.
          </p>
        </div>
        <Chip tone={incompleteCriteria.length ? "warning" : "success"}>
          {incompleteCriteria.length ? `${incompleteCriteria.length} tiêu chí cần xử lý` : "Đủ 5/5 tiêu chí"}
        </Chip>
      </div>

      {incompleteCriteria.length ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Còn cần theo dõi
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {incompleteCriteria.map((criterion) => (
              <Chip key={criterion} tone="warning">{criterionLabel[criterion]}</Chip>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {criterionOrder.map((criterion) => {
          const item = detail.criterionSummary[criterion];
          return (
            <div key={criterion} className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-brand-deep">{criterionLabel[criterion]}</div>
                <Chip tone={statusTone(item?.status)}>
                  {label(item?.status)}
                </Chip>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {item?.summary ?? "Chưa có dữ liệu xét duyệt cho tiêu chí này."}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                <Info label="Kết luận" value={label(item?.decision)} />
                <Info label="Gợi ý cấp" value={level(item?.officerSuggestedLevel)} />
                <Info label="Minh chứng" value={`${item?.evidenceCount ?? 0}`} />
                <Info label="Đã đạt" value={`${item?.acceptedEvidenceCount ?? 0}`} />
              </div>
              {item?.warningCount ? (
                <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Có {item.warningCount} cảnh báo AI/minh chứng cần đối chiếu.
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ReviewTasks({ detail }: { detail: ManagerResultDetail }) {
  return (
    <Card>
      <h2 className="font-bold text-brand-deep">Task xét duyệt</h2>
      <div className="mt-4 space-y-3">
        {detail.reviewTasks.length ? detail.reviewTasks.map((task) => (
          <div key={task.id} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold text-brand-deep">{criterionLabel[task.criterion]}</div>
              <Chip tone={statusTone(task.status)}>{label(task.status)}</Chip>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Cán bộ: {task.assignedOfficer?.fullName ?? "Chưa phân công"} • Gợi ý cấp: {level(task.officerSuggestedLevel)}
            </div>
            {task.decisionReason || task.officerNote ? (
              <p className="mt-2 text-sm">{task.decisionReason ?? task.officerNote}</p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Chưa có ghi chú/nhận xét của cán bộ cho task này.</p>
            )}
            <div className="mt-3 text-xs text-muted-foreground">{task.evidences.length} minh chứng liên kết</div>
          </div>
        )) : (
          <div className="rounded-lg border bg-slate-50 p-4 text-sm text-muted-foreground">
            Hồ sơ chưa có task xét duyệt, nên chưa thể kết luận đủ 5 tiêu chí.
          </div>
        )}
      </div>
    </Card>
  );
}

function EvidenceSection({ evidences }: { evidences: ManagerResultEvidence[] }) {
  const grouped = useMemo(() => groupByCriterion(evidences), [evidences]);
  const [selectedEvidence, setSelectedEvidence] = useState<ManagerResultEvidence | null>(null);

  return (
    <>
      <Card>
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-bold text-brand-deep">Minh chứng theo tiêu chí</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Chọn "Xem chi tiết" để kiểm tra file, OCR, tóm tắt AI, trường trích xuất và cảnh báo của từng minh chứng.
            </p>
          </div>
          <Chip tone="brand">{evidences.length} minh chứng</Chip>
        </div>
        <div className="mt-4 space-y-4">
          {criterionOrder.map((criterion) => (
            <div key={criterion}>
              <h3 className="text-sm font-bold text-brand-deep">{criterionLabel[criterion]}</h3>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                {(grouped[criterion] ?? []).length ? grouped[criterion].map((evidence) => (
                  <EvidenceCard key={evidence.id} evidence={evidence} onSelect={setSelectedEvidence} />
                )) : (
                  <div className="rounded-lg border border-dashed bg-slate-50 p-4 text-sm text-muted-foreground">
                    Chưa có minh chứng cho tiêu chí này. Nếu task chưa đạt, đây là điểm cần yêu cầu sinh viên bổ sung.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <EvidenceDetailDialog
        evidence={selectedEvidence}
        onOpenChange={(open) => {
          if (!open) setSelectedEvidence(null);
        }}
      />
    </>
  );
}

function EvidenceCard({
  evidence,
  onSelect,
}: {
  evidence: ManagerResultEvidence;
  onSelect: (evidence: ManagerResultEvidence) => void;
}) {
  const openFile = async (fileId: string) => {
    try {
      const response = await evidenceApi.getSignedFileUrl(fileId);
      if (response.data?.url) window.open(response.data.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể mở file.");
    }
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="break-words font-semibold text-brand-deep">{evidence.evidenceName}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {evidence.files.length} file • {typeof evidence.confidence === "number" ? `AI ${Math.round(evidence.confidence * 100)}%` : "Chưa có độ tin cậy AI"}
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => onSelect(evidence)}>
          <Eye className="h-4 w-4" />
          Xem chi tiết
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Chip tone="brand">{label(evidence.sourceType)}</Chip>
        <Chip tone={statusTone(evidence.status)}>{label(evidence.status)}</Chip>
        <Chip tone="brand">{label(evidence.indexingStatus)}</Chip>
      </div>
      {evidence.evidenceCard?.aiSummary ? (
        <p className="mt-3 text-sm text-muted-foreground">{evidence.evidenceCard.aiSummary}</p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">AI chưa có tóm tắt cho minh chứng này.</p>
      )}
      <div className="mt-3 space-y-2">
        {evidence.files.length ? evidence.files.map((file) => (
          <div key={file.id} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
            <span className="truncate">{file.originalName}</span>
            <Button size="sm" variant="ghost" onClick={() => openFile(file.id)}>
              <ExternalLink className="h-4 w-4" />
              Xem file
            </Button>
          </div>
        )) : (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">Minh chứng này chưa có file đính kèm.</div>
        )}
      </div>
    </div>
  );
}

function EvidenceDetailDialog({
  evidence,
  onOpenChange,
}: {
  evidence: ManagerResultEvidence | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [preview, setPreview] = useState<{ file: ManagerResultEvidence["files"][number]; url: string } | null>(null);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const fields = useReadableFields(evidence?.evidenceCard?.extractedFieldsJson);
  const warnings = useWarnings(evidence?.evidenceCard?.warningsJson);

  const openPreview = async (file: ManagerResultEvidence["files"][number], openInNewTab = false) => {
    try {
      setLoadingFileId(file.id);
      const response = await evidenceApi.getSignedFileUrl(file.id);
      const url = response.data?.url;
      if (!url) throw new Error("Không lấy được đường dẫn file.");
      setPreview({ file, url });
      if (openInNewTab) window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể mở file minh chứng.");
    } finally {
      setLoadingFileId(null);
    }
  };

  return (
    <Dialog
      open={Boolean(evidence)}
      onOpenChange={(open) => {
        if (!open) setPreview(null);
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
        {evidence ? (
          <>
            <DialogHeader>
              <DialogTitle className="pr-8">{evidence.evidenceName}</DialogTitle>
              <DialogDescription>
                Chi tiết minh chứng cho tiêu chí {criterionLabel[evidence.criterion]}: file, trạng thái xét duyệt, OCR, dữ liệu AI trích xuất và cảnh báo.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <section className="rounded-lg border p-4">
                  <h3 className="flex items-center gap-2 font-bold text-brand-deep">
                    <SearchCheck className="h-4 w-4 text-[#0057C2]" />
                    Thông tin kiểm tra
                  </h3>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <Info label="Tiêu chí" value={criterionLabel[evidence.criterion]} />
                    <Info label="Nguồn" value={label(evidence.sourceType)} />
                    <Info label="Trạng thái" value={label(evidence.status)} />
                    <Info label="AI/OCR" value={label(evidence.indexingStatus)} />
                    <Info
                      label="Độ tin cậy"
                      value={typeof evidence.confidence === "number" ? `${Math.round(evidence.confidence * 100)}%` : "--"}
                    />
                    <Info label="Số file" value={evidence.files.length} />
                  </div>
                </section>

                <section className="rounded-lg border p-4">
                  <h3 className="flex items-center gap-2 font-bold text-brand-deep">
                    <FileText className="h-4 w-4 text-[#0057C2]" />
                    File minh chứng
                  </h3>
                  <div className="mt-3 space-y-2">
                    {evidence.files.length ? evidence.files.map((file) => (
                      <div key={file.id} className="rounded-lg border bg-slate-50 p-3">
                        <div className="font-semibold text-brand-deep">{file.originalName}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {file.mimeType || "--"} • {formatFileSize(file.fileSize)} • {formatDate(file.createdAt)}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => openPreview(file)} disabled={loadingFileId === file.id}>
                            {loadingFileId === file.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                            Preview
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openPreview(file, true)} disabled={loadingFileId === file.id}>
                            <ExternalLink className="h-4 w-4" />
                            Mở tab mới
                          </Button>
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                        Minh chứng này chưa có file, nên cán bộ chưa thể đối chiếu tài liệu gốc.
                      </div>
                    )}
                  </div>
                </section>

                {preview ? (
                  <section className="rounded-lg border p-4">
                    <h3 className="font-bold text-brand-deep">Preview file</h3>
                    <div className="mt-3 overflow-hidden rounded-lg border bg-slate-50">
                      {isImageMime(preview.file.mimeType) ? (
                        <img src={preview.url} alt={preview.file.originalName} className="max-h-[480px] w-full object-contain" />
                      ) : isPdfMime(preview.file.mimeType) ? (
                        <iframe title={preview.file.originalName} src={preview.url} className="h-[480px] w-full" />
                      ) : (
                        <div className="p-4 text-sm text-muted-foreground">
                          Loại file này không preview trực tiếp được. Hãy dùng "Mở tab mới" để xem/tải xuống.
                        </div>
                      )}
                    </div>
                  </section>
                ) : null}
              </div>

              <div className="space-y-4">
                <section className="rounded-lg border p-4">
                  <h3 className="flex items-center gap-2 font-bold text-brand-deep">
                    <Sparkles className="h-4 w-4 text-[#0057C2]" />
                    AI đã đọc gì?
                  </h3>
                  <TextBlock
                    label="Tóm tắt AI"
                    value={evidence.evidenceCard?.aiSummary}
                    empty="Chưa có tóm tắt AI cho minh chứng này."
                  />
                  <TextBlock
                    label="OCR preview"
                    value={evidence.evidenceCard?.ocrText}
                    empty="Chưa có nội dung OCR."
                    clamp
                  />
                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Trường đã trích xuất</div>
                    {fields.length ? (
                      <div className="mt-2 grid gap-2">
                        {fields.map((field) => (
                          <Info key={field.label} label={field.label} value={field.value} />
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">AI chưa trích xuất được trường dữ liệu rõ ràng.</p>
                    )}
                  </div>
                </section>

                <section className="rounded-lg border p-4">
                  <h3 className="flex items-center gap-2 font-bold text-brand-deep">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Cảnh báo cần đối chiếu
                  </h3>
                  {warnings.length ? (
                    <div className="mt-3 space-y-2">
                      {warnings.map((warning, index) => (
                        <div key={`${warning}-${index}`} className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                          {warning}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">Chưa có cảnh báo AI cho minh chứng này.</p>
                  )}
                </section>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function AnalysisSection({ detail }: { detail: ManagerResultDetail }) {
  return (
    <Card>
      <h2 className="font-bold text-brand-deep">AI / Precheck / Cascade</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Info label="Cascade gợi ý" value={level(detail.latestCascade?.suggestedLevel)} />
        <Info label="Hội đồng xác nhận" value={detail.latestCascade?.humanConfirmationRequired ? "Có" : "Không"} />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        AI chỉ là gợi ý. Kết quả cuối cùng phụ thuộc vào task xét duyệt, minh chứng và quyết định của hội đồng.
      </p>
    </Card>
  );
}

function ResolutionSection({ detail }: { detail: ManagerResultDetail }) {
  return (
    <Card>
      <h2 className="font-bold text-brand-deep">Hồ sơ hội ý liên quan</h2>
      <div className="mt-4 space-y-3">
        {detail.resolutionCases.length ? detail.resolutionCases.map((item) => (
          <Link key={item.id} to="/app/resolution/$id" params={{ id: item.id }} className="block rounded-lg border p-4 hover:bg-slate-50">
            <div className="font-semibold text-brand-deep">#{item.id.slice(0, 8)} • {label(item.status)}</div>
            <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
          </Link>
        )) : (
          <div className="rounded-lg border bg-slate-50 p-4 text-sm text-muted-foreground">Không có hồ sơ hội ý liên quan.</div>
        )}
      </div>
    </Card>
  );
}

function AuditSection({ detail }: { detail: ManagerResultDetail }) {
  return (
    <Card>
      <h2 className="flex items-center gap-2 font-bold text-brand-deep">
        <History className="h-5 w-5" />
        Audit timeline
      </h2>
      <div className="mt-4 space-y-3">
        {detail.auditTimeline.length ? detail.auditTimeline.map((item) => (
          <div key={item.id} className="rounded-lg border p-3 text-sm">
            <div className="font-semibold text-brand-deep">{item.action}</div>
            <div className="mt-1 text-xs text-muted-foreground">{formatDate(item.createdAt)} • {item.actorRole ?? "--"}</div>
            {item.note ? <p className="mt-2 text-muted-foreground">{item.note}</p> : null}
          </div>
        )) : (
          <div className="rounded-lg border bg-slate-50 p-4 text-sm text-muted-foreground">Chưa có lịch sử xử lý.</div>
        )}
      </div>
    </Card>
  );
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-lg border bg-white px-3 py-2">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 min-w-0 break-words text-sm font-semibold text-brand-deep">{value ?? "--"}</div>
    </div>
  );
}

function TextBlock({
  label,
  value,
  empty,
  clamp,
}: {
  label: string;
  value?: string | null;
  empty: string;
  clamp?: boolean;
}) {
  return (
    <div className="mt-4">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <p className={`mt-2 whitespace-pre-wrap text-sm text-slate-700 ${clamp ? "max-h-36 overflow-auto rounded-lg bg-slate-50 p-3" : ""}`}>
        {value?.trim() || empty}
      </p>
    </div>
  );
}

function toFinalizationItem(detail: ManagerResultDetail): ManagerResultItem {
  const summary = detail.reviewTasks.reduce(
    (acc, task) => {
      acc.total += 1;
      if (task.status === "accepted") acc.accepted += 1;
      if (task.status === "rejected") acc.rejected += 1;
      if (task.status === "supplement_required") acc.supplementRequired += 1;
      if (task.status === "resolution_needed") acc.resolutionNeeded += 1;
      if (task.status === "waiting") acc.waiting += 1;
      if (task.status === "reviewing") acc.reviewing = (acc.reviewing ?? 0) + 1;
      return acc;
    },
    { total: 0, accepted: 0, rejected: 0, supplementRequired: 0, resolutionNeeded: 0, waiting: 0, reviewing: 0 },
  );

  return {
    applicationId: detail.application.id,
    studentId: detail.student.id,
    studentName: detail.student.fullName,
    studentCode: detail.student.studentCode,
    className: detail.student.className,
    faculty: detail.student.faculty,
    schoolYear: detail.application.schoolYear,
    targetLevel: detail.application.targetLevel,
    suggestedLevel: detail.latestCascade?.suggestedLevel ?? null,
    finalStatus: detail.application.finalStatus,
    finalLevel: detail.application.finalLevel,
    finalNote: detail.application.finalNote,
    applicationStatus: detail.application.status,
    readinessScore: detail.application.readinessScore,
    submittedAt: detail.application.submittedAt,
    finalizedAt: detail.application.finalizedAt,
    updatedAt: detail.application.updatedAt,
    lastActivityAt: detail.application.lastActivityAt,
    finalizedBy: detail.application.finalizedBy,
    reviewTaskSummary: summary,
    taskProgress: { accepted: summary.accepted, total: summary.total },
  };
}

function groupByCriterion(evidences: ManagerResultEvidence[]) {
  return evidences.reduce<Partial<Record<Criterion, ManagerResultEvidence[]>>>((acc, evidence) => {
    acc[evidence.criterion] = [...(acc[evidence.criterion] ?? []), evidence];
    return acc;
  }, {});
}

function level(value?: Level | null) {
  return value ? levelLabel[value] : "--";
}

function label(value?: string | null) {
  if (!value) return "--";
  const workflowLabel = getWorkflowStatusLabel(value);
  return workflowLabel === fallbackStatusLabel ? (statusLabel[value] ?? value) : workflowLabel;
}

function statusTone(value?: string | null): "brand" | "success" | "warning" | "error" | "muted" {
  return getStatusTone(value);
}

function formatDate(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatFileSize(size?: number | null) {
  if (!size || size <= 0) return "--";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageMime(mimeType?: string | null) {
  return Boolean(mimeType?.startsWith("image/"));
}

function isPdfMime(mimeType?: string | null) {
  return mimeType === "application/pdf";
}

function useReadableFields(value: unknown) {
  return useMemo(() => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    return Object.entries(value as Record<string, unknown>)
      .filter(([, fieldValue]) => fieldValue !== undefined && fieldValue !== null && fieldValue !== "")
      .map(([key, fieldValue]) => ({
        label: key.replace(/_/g, " "),
        value: Array.isArray(fieldValue) ? fieldValue.join(", ") : String(fieldValue),
      }));
  }, [value]);
}

function useWarnings(value: unknown) {
  return useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            const record = item as Record<string, unknown>;
            return String(record.message ?? record.reason ?? record.type ?? JSON.stringify(record));
          }
          return String(item);
        })
        .filter(Boolean);
    }
    if (typeof value === "string") return [value];
    return [JSON.stringify(value)];
  }, [value]);
}
