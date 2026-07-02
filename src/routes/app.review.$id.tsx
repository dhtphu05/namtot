import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Download,
  ExternalLink,
  Eye,
  FileText,
  History,
  ListChecks,
  Paperclip,
  UserRound,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuditTimeline } from "@/features/audit/components/AuditTimeline";
import { useAuth } from "@/features/auth/store/auth-store";
import { CriterionBadge } from "@/features/review/components/CriterionBadge";
import { EmptyReviewState } from "@/features/review/components/EmptyReviewState";
import { LevelBadge } from "@/features/review/components/LevelBadge";
import { RequestSupplementPanel } from "@/features/review/components/RequestSupplementPanel";
import { ReviewDecisionPanel } from "@/features/review/components/ReviewDecisionPanel";
import { ReviewErrorState } from "@/features/review/components/ReviewErrorState";
import { ReviewLoadingState } from "@/features/review/components/ReviewLoadingState";
import { ReviewStatusBadge } from "@/features/review/components/ReviewStatusBadge";
import { reviewApi } from "@/features/review/api/review";
import { useReviewTask } from "@/features/review/hooks/useReview";
import type {
  ReviewDecision,
  ReviewTaskDetail,
  ReviewTaskEvidence,
  ReviewTaskEvidenceFile,
  Role,
} from "@/features/review/types";
import { getErrorMessage } from "@/features/review/utils/errors";
import {
  formatDateTime,
  formatFileSize,
  getCriterionLabel,
  getTaskStatusLabel,
} from "@/features/review/utils/formatters";

export const Route = createFileRoute("/app/review/$id")({
  component: ReviewTaskDetailRoute,
});

const allowedRoles: Role[] = ["officer", "manager", "committee", "admin"];
const fallbackText = "Chưa có dữ liệu";

function ReviewTaskDetailRoute() {
  const { id } = Route.useParams();
  const user = useAuth((state) => state.user);
  const role = user?.role as Role | undefined;

  if (!role || !allowedRoles.includes(role)) {
    return (
      <>
        <TopBar
          title="Chi tiết hồ sơ xét duyệt"
          subtitle="Thông tin phục vụ cán bộ xét duyệt tiêu chí Sinh viên 5 tốt."
        />
        <Card>
          <div className="py-8 text-center">
            <div className="text-base font-semibold text-brand-deep">
              Bạn không có quyền truy cập hồ sơ xét duyệt.
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Vui lòng liên hệ quản trị viên nếu bạn cần quyền cán bộ xét duyệt.
            </div>
          </div>
        </Card>
      </>
    );
  }

  if (!id) {
    return (
      <>
        <TopBar title="Chi tiết hồ sơ xét duyệt" subtitle="Không tìm thấy mã tác vụ xét duyệt." />
        <ReviewErrorState
          title="Thiếu mã tác vụ"
          description="Đường dẫn hiện tại không có mã tác vụ xét duyệt hợp lệ."
        />
      </>
    );
  }

  return <ReviewTaskDetailContent taskId={id} />;
}

function ReviewTaskDetailContent({ taskId }: { taskId: string }) {
  const { data: task, error, isError, isLoading, refetch } = useReviewTask(taskId);

  if (isLoading) {
    return <ReviewLoadingState label="Đang tải chi tiết hồ sơ xét duyệt..." />;
  }

  if (isError) {
    return (
      <>
        <TopBar
          title="Chi tiết hồ sơ xét duyệt"
          subtitle="Không thể tải dữ liệu hồ sơ xét duyệt."
          action={<BackToQueueButton />}
        />
        <ReviewErrorState
          description={getErrorMessage(
            error,
            "Không thể tải chi tiết tác vụ xét duyệt. Vui lòng thử lại sau.",
          )}
          onRetry={() => void refetch()}
        />
      </>
    );
  }

  if (!task) {
    return (
      <>
        <TopBar
          title="Chi tiết hồ sơ xét duyệt"
          subtitle="Không tìm thấy dữ liệu hồ sơ xét duyệt."
          action={<BackToQueueButton />}
        />
        <EmptyReviewState
          title="Không tìm thấy tác vụ xét duyệt"
          description="Tác vụ có thể đã bị xóa, chuyển trạng thái hoặc bạn không có quyền xem."
        />
      </>
    );
  }

  const evidences = task.evidences ?? [];
  const metrics = task.metrics ?? [];
  const checklist = task.checklist ?? [];
  const decisionHistory = task.decisionHistory ?? [];
  const student = task.application.student;
  const facultyClass =
    [student.faculty, student.className].filter(Boolean).join(" / ") || fallbackText;

  return (
    <>
      <TopBar
        title={student.fullName || "Chi tiết hồ sơ xét duyệt"}
        subtitle={`${student.studentCode || fallbackText} • ${getCriterionLabel(task.criterion)}`}
        action={<BackToQueueButton />}
      />

      <div className="space-y-5">
        <Card>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <HeaderField label="Họ tên" value={student.fullName} />
            <HeaderField label="Mã sinh viên" value={student.studentCode} />
            <HeaderField label="Khoa / lớp" value={facultyClass} />
            <HeaderField label="Năm học" value={task.application.schoolYear} />
            <HeaderField
              label="Cấp xét"
              value={<LevelBadge level={task.application.targetLevel} />}
            />
            <HeaderField
              label="Trạng thái hồ sơ"
              value={<ReviewStatusBadge status={task.application.status} />}
            />
            <HeaderField
              label="Tiêu chí tác vụ"
              value={<CriterionBadge criterion={task.criterion} />}
            />
            <HeaderField
              label="Trạng thái tác vụ"
              value={<ReviewStatusBadge status={task.status} />}
            />
          </div>
        </Card>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
          <div className="space-y-5">
            <ApplicationSummary task={task} />
            <MetricsSection metrics={metrics} />
            <EvidenceSection evidences={evidences} />
          </div>

          <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
            <ReviewDecisionPanel task={task} onSuccess={() => void refetch()} />
            <RequestSupplementPanel task={task} onSuccess={() => void refetch()} />
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <ChecklistSection checklist={checklist} />
          <DecisionHistorySection history={decisionHistory} />
        </section>

        <AuditTimeline applicationId={task.application.id} limit={10} taskId={task.id} />
      </div>
    </>
  );
}

function BackToQueueButton() {
  return (
    <Button asChild variant="outline">
      <Link to="/app/queue">Quay lại hàng đợi</Link>
    </Button>
  );
}

function HeaderField({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-brand-deep">{value || fallbackText}</div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-2">
      <div className="mt-0.5 text-brand-deep">{icon}</div>
      <div>
        <h2 className="text-base font-bold text-brand-deep">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  );
}

function ApplicationSummary({ task }: { task: ReviewTaskDetail }) {
  const student = task.application.student;

  return (
    <Card>
      <SectionHeader icon={<UserRound className="h-5 w-5" />} title="Thông tin sinh viên / hồ sơ" />
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoRow label="Email" value={student.email} />
        <InfoRow
          label="Loại hồ sơ"
          value={getApplicationTypeLabel(task.application.applicationType)}
        />
        <InfoRow label="Ngày nộp" value={formatDateTime(task.application.submittedAt)} />
        <InfoRow label="Trạng thái cuối" value={task.application.finalStatus} />
        <InfoRow label="Cán bộ phụ trách" value={task.assignedOfficer?.fullName} />
        <InfoRow label="Email cán bộ" value={task.assignedOfficer?.email} />
      </div>
    </Card>
  );
}

function MetricsSection({ metrics }: { metrics: ReviewTaskDetail["metrics"] }) {
  return (
    <Card>
      <SectionHeader
        icon={<ClipboardList className="h-5 w-5" />}
        title="Chỉ số liên quan tiêu chí"
      />
      {metrics.length ? (
        <div className="space-y-3">
          {metrics.map((metric) => (
            <div key={metric.id} className="rounded-md border p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <InfoRow label="Loại chỉ số" value={metric.metricType} />
                <InfoRow
                  label="Giá trị"
                  value={`${metric.value ?? fallbackText}${metric.unit ? ` ${metric.unit}` : ""}`}
                />
              </div>
              {metric.note ? (
                <p className="mt-2 text-sm text-muted-foreground">{metric.note}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyReviewState
          title="Chưa có chỉ số từ backend"
          description="Nếu tiêu chí này cần dữ liệu định lượng, cán bộ vui lòng đối chiếu với dữ liệu hồ sơ gốc."
        />
      )}
    </Card>
  );
}

function EvidenceSection({ evidences }: { evidences: ReviewTaskEvidence[] }) {
  return (
    <Card>
      <SectionHeader
        icon={<FileText className="h-5 w-5" />}
        title="Danh sách minh chứng"
        description="Minh chứng và metadata bổ trợ do backend cung cấp."
      />
      {evidences.length ? (
        <div className="space-y-3">
          {evidences.map((evidence) => (
            <div key={evidence.id} className="rounded-md border p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-semibold text-brand-deep">
                    {evidence.evidenceName || fallbackText}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">{getSourceTypeLabel(evidence.sourceType)}</Badge>
                    {evidence.indexingStatus ? (
                      <Badge variant="outline">{getIndexingStatusLabel(evidence.indexingStatus)}</Badge>
                    ) : null}
                    <CriterionBadge criterion={evidence.criterion} />
                    <ReviewStatusBadge status={evidence.status} />
                    {typeof evidence.confidence === "number" ? (
                      <Badge variant={evidence.confidence < 0.7 ? "destructive" : "secondary"}>
                        AI {Math.round(evidence.confidence * 100)}%
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDateTime(evidence.createdAt)}
                </div>
              </div>

              {evidence.note ? (
                <p className="mt-3 text-sm text-muted-foreground">{evidence.note}</p>
              ) : null}

              {evidence.reviewerNote ? (
                <p className="mt-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                  {evidence.reviewerNote}
                </p>
              ) : null}

              <EvidenceAiBlock evidence={evidence} />

              {evidence.files?.length ? (
                <div className="mt-4 space-y-2">
                  {evidence.files.map((file) => (
                    <UnifiedFileAttachment key={file.id} file={file} />
                  ))}
                </div>
              ) : (
                <div className="mt-4 text-sm text-muted-foreground">
                  Chưa có tệp đính kèm cho minh chứng này.
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyReviewState
          title="Chưa có minh chứng từ backend"
          description="Khi sinh viên hoặc hệ thống bổ sung minh chứng, dữ liệu sẽ hiển thị tại đây."
        />
      )}
    </Card>
  );
}

function FilesSection({
  files,
}: {
  files: Array<ReviewTaskEvidenceFile & { evidenceName: string }>;
}) {
  return (
    <Card>
      <SectionHeader icon={<Paperclip className="h-5 w-5" />} title="Tệp đính kèm" />
      {files.length ? (
        <div className="space-y-2">
          {files.map((file) => (
            <FileAttachment
              key={`${file.id}-${file.evidenceName}`}
              file={file}
              subtitle={file.evidenceName}
            />
          ))}
        </div>
      ) : (
        <EmptyReviewState
          title="Chưa có tệp đính kèm"
          description="Backend chưa trả về tệp cho các minh chứng của tác vụ này."
        />
      )}
    </Card>
  );
}

function EvidenceAiBlock({ evidence }: { evidence: ReviewTaskEvidence }) {
  const card = evidence.card;
  const warnings = toReadableList(card?.warningsJson);
  const fields = toFieldEntries(card?.extractedFieldsJson);

  if (!card) {
    return <div className="mt-4 rounded-md border border-dashed p-3 text-sm text-muted-foreground">AI chưa xử lý minh chứng này.</div>;
  }

  return (
    <div className="mt-4 space-y-3 rounded-md bg-muted/30 p-3">
      {card.aiSummary ? <InfoRow label="AI tóm tắt" value={card.aiSummary} /> : null}
      {fields.length ? (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trường AI trích xuất</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {fields.map(([key, value]) => <InfoRow key={key} label={key} value={String(value)} />)}
          </div>
        </div>
      ) : null}
      {warnings.length ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <div className="text-sm font-semibold text-amber-900">Cảnh báo cần kiểm tra</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
            {warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}
          </ul>
        </div>
      ) : null}
      {card.ocrText ? (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-brand-deep">OCR preview</summary>
          <p className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-muted-foreground">{card.ocrText}</p>
        </details>
      ) : null}
    </div>
  );
}

function UnifiedFileAttachment({ file }: { file: ReviewTaskEvidenceFile }) {
  const [loadingAction, setLoadingAction] = useState<"preview" | "open" | "download" | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAction = async (action: "preview" | "open" | "download") => {
    setError(null);
    setLoadingAction(action);
    try {
      const response = await reviewApi.getSignedFileUrl(file.id);
      const url = response.data?.url;
      if (!url) throw new Error("Không lấy được liên kết file.");
      if (action === "preview") {
        setPreviewUrl(url);
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể mở file.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-brand-deep">{file.originalName || fallbackText}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {[file.mimeType, formatFileSize(file.size), formatDateTime(file.uploadedAt ?? file.createdAt)].filter(Boolean).join(" • ")}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" type="button" variant="outline" onClick={() => void runAction("preview")} disabled={Boolean(loadingAction)}>
            <Eye className="h-4 w-4" />
            Xem file
          </Button>
          <Button size="sm" type="button" variant="outline" onClick={() => void runAction("open")} disabled={Boolean(loadingAction)}>
            <ExternalLink className="h-4 w-4" />
            Mở tab mới
          </Button>
          <Button size="sm" type="button" variant="outline" onClick={() => void runAction("download")} disabled={Boolean(loadingAction)}>
            <Download className="h-4 w-4" />
            Tải xuống
          </Button>
        </div>
      </div>
      {error ? <div className="mt-2 text-xs text-destructive">{error}</div> : null}
      {previewUrl ? (
        <div className="mt-3 overflow-hidden rounded-md border bg-muted/30">
          {file.mimeType?.startsWith("image/") ? (
            <img alt={file.originalName} className="max-h-[520px] w-full object-contain" src={previewUrl} />
          ) : file.mimeType === "application/pdf" ? (
            <iframe className="h-[520px] w-full" src={previewUrl} title={file.originalName} />
          ) : (
            <div className="p-4 text-sm text-muted-foreground">
              Trình duyệt không preview được loại file này. Hãy mở tab mới hoặc tải xuống.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function FileAttachment({ file, subtitle }: { file: ReviewTaskEvidenceFile; subtitle?: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-brand-deep">
          {file.originalName || fallbackText}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {[subtitle, file.mimeType, formatFileSize(file.size), formatDateTime(file.createdAt)]
            .filter(Boolean)
            .join(" • ")}
        </div>
      </div>
      {file.url ? (
        <Button asChild size="sm" variant="outline">
          <a href={file.url} rel="noreferrer" target="_blank">
            <Download className="h-4 w-4" />
            Mở tệp
          </a>
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground">Chưa có liên kết tệp</span>
      )}
    </div>
  );
}

function ChecklistSection({
  checklist,
}: {
  checklist: NonNullable<ReviewTaskDetail["checklist"]>;
}) {
  return (
    <Card>
      <SectionHeader icon={<CheckSquare className="h-5 w-5" />} title="Checklist tiêu chí" />
      {checklist.length ? (
        <div className="space-y-3">
          {checklist.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-brand-deep">
                    {item.label || fallbackText}
                  </div>
                  {item.note ? (
                    <div className="mt-1 text-sm text-muted-foreground">{item.note}</div>
                  ) : null}
                </div>
                <Badge variant={item.passed ? "secondary" : "outline"}>
                  {item.passed === null || item.passed === undefined
                    ? "Chưa đánh dấu"
                    : item.passed
                      ? "Đạt"
                      : "Chưa đạt"}
                </Badge>
              </div>
              {item.required ? (
                <div className="mt-2 text-xs text-muted-foreground">Mục bắt buộc</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyReviewState
          title="Chưa có checklist tiêu chí từ backend"
          description="Cán bộ vui lòng đối chiếu theo quy định hiện hành."
        />
      )}
    </Card>
  );
}

function DecisionHistorySection({
  history,
}: {
  history: NonNullable<ReviewTaskDetail["decisionHistory"]>;
}) {
  return (
    <Card>
      <SectionHeader icon={<History className="h-5 w-5" />} title="Lịch sử quyết định" />
      {history.length ? (
        <div className="space-y-3">
          {history.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-brand-deep">
                    {getDecisionLabel(item.decision)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.actorName || fallbackText}
                    {item.actorRole ? ` • ${item.actorRole}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDateTime(item.createdAt)}
                </div>
              </div>
              {item.note ? <p className="mt-2 text-sm text-muted-foreground">{item.note}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyReviewState
          title="Chưa có lịch sử quyết định"
          description="Các quyết định trước đó, nếu có, sẽ được hiển thị tại đây."
        />
      )}
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-brand-deep">{value || fallbackText}</div>
    </div>
  );
}

function getApplicationTypeLabel(type: ReviewTaskDetail["application"]["applicationType"]) {
  return type === "collective" ? "Tập thể" : "Cá nhân";
}

function getSourceTypeLabel(sourceType: ReviewTaskEvidence["sourceType"]) {
  const labels: Record<ReviewTaskEvidence["sourceType"], string> = {
    metric_input: "Nhập chỉ số",
    manual_upload: "Tải lên thủ công",
    event_import: "Nhập từ sự kiện",
    collective_import: "Nhập tập thể",
  };

  return labels[sourceType] ?? fallbackText;
}

function getIndexingStatusLabel(status: string) {
  const labels: Record<string, string> = {
    not_started: "Chưa xử lý AI",
    uploaded: "Đã tải lên",
    pending_indexing: "Đang chờ AI xử lý",
    ocr_processing: "AI đang đọc file",
    extracting: "AI đang đọc file",
    checking_registry: "AI đang đối chiếu",
    indexed: "AI đã xử lý xong",
    needs_manual_review: "Cần cán bộ kiểm tra",
    failed: "AI không đọc được",
  };
  return labels[status] ?? status;
}

function toFieldEntries(value: unknown): Array<[string, unknown]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).filter(([, fieldValue]) => fieldValue !== null && fieldValue !== undefined && fieldValue !== "");
}

function toReadableList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      return String(record.message ?? record.reason ?? record.code ?? JSON.stringify(record));
    }
    return String(item);
  });
}

function getDecisionLabel(decision: ReviewDecision) {
  return getTaskStatusLabel(decision);
}
