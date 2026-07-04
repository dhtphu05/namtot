import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarClock,
  FilePlus2,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TopBar } from "@/components/layout/TopBar";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { UxStatusCard } from "@/components/status/UxStatusCard";
import { cn } from "@/lib/utils";
import type { Criterion, EvidenceResponse } from "@/lib/api/types";
import { useCurrentApplication } from "@/features/application/hooks/useApplication";
import { useEvidences, useRetryEvidenceJob } from "@/features/evidence/hooks/useEvidence";
import { AddEvidenceDrawer } from "./AddEvidenceDrawer";
import { EvidenceDetailModal } from "./EvidenceDetailModal";
import {
  canRetryEvidence,
  getConfidenceSummary,
  getEvidenceUxStatus,
  indexingStatusCopy,
  normalizeEvidenceCard,
  normalizeWarnings,
  sourceTypeCopy,
  studentEvidenceCriteria,
} from "./evidence-card-utils";
import { formatStudentDate, getEvidenceFiles } from "./student-evidence-utils";

class EvidenceErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-8">
          <ErrorState
            title="Không tải được Workspace minh chứng"
            message={this.state.error.message}
            onRetry={() => window.location.reload()}
          />
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
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [initialCriterion, setInitialCriterion] = React.useState<Criterion>("academic");
  const [selectedEvidence, setSelectedEvidence] = React.useState<EvidenceResponse | null>(null);
  const currentApplication = useCurrentApplication();
  const applicationId = currentApplication.data?.application?.id;
  const applicationStatus = currentApplication.data?.application?.status;
  const evidenceQuery = useEvidences(applicationId);
  const retryJob = useRetryEvidenceJob(applicationId);
  const evidenceList = React.useMemo(
    () => (Array.isArray(evidenceQuery.data) ? evidenceQuery.data : []),
    [evidenceQuery.data],
  );
  const isEditable = ["draft", "prechecked", "ready_to_submit", "supplement_required"].includes(
    applicationStatus ?? "",
  );

  const openCreate = (criterion: Criterion = "academic") => {
    setInitialCriterion(criterion);
    setDrawerOpen(true);
  };

  if (currentApplication.isLoading) {
    return <LoadingState label="Đang tải hồ sơ hiện tại..." />;
  }

  if (currentApplication.isError) {
    return (
      <ErrorState
        title="Không thể tải hồ sơ"
        message={
          currentApplication.error instanceof Error
            ? currentApplication.error.message
            : "Vui lòng thử lại."
        }
        onRetry={() => void currentApplication.refetch()}
      />
    );
  }

  if (!currentApplication.data?.application) {
    return (
      <>
        <TopBar
          title="Minh chứng của tôi"
          subtitle="Vui lòng tạo hồ sơ trước khi tải minh chứng."
        />
        <EmptyState
          title="Bạn chưa có hồ sơ xét duyệt"
          description="Hãy tạo hồ sơ để có thể tải minh chứng cho từng tiêu chí."
          action={
            <Button asChild>
              <Link to="/app/wizard">Tạo hồ sơ ngay</Link>
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Minh chứng của tôi"
        subtitle="Tải lên minh chứng để hệ thống hỗ trợ số hoá, tạo Evidence Card và gợi ý điểm cần kiểm tra."
        action={
          isEditable ? (
            <Button type="button" onClick={() => openCreate()}>
              <Plus className="h-4 w-4" />
              Thêm minh chứng
            </Button>
          ) : undefined
        }
      />

      <div className="mb-5 rounded-md border bg-white p-4 text-sm text-muted-foreground">
        Kết quả số hoá chỉ hỗ trợ kiểm tra. Cán bộ/Hội đồng sẽ xác nhận cuối cùng.
      </div>

      {evidenceQuery.isLoading ? (
        <LoadingState label="Đang tải danh sách minh chứng..." />
      ) : evidenceQuery.isError ? (
        <ErrorState
          title="Không thể tải danh sách minh chứng"
          message={
            evidenceQuery.error instanceof Error ? evidenceQuery.error.message : "Vui lòng thử lại."
          }
          onRetry={() => void evidenceQuery.refetch()}
        />
      ) : evidenceList.length === 0 ? (
        <EmptyState
          title="Bạn chưa có minh chứng nào."
          description="Hãy thêm minh chứng cho từng tiêu chí để hệ thống hỗ trợ kiểm tra trước khi nộp."
          icon={FilePlus2}
          action={
            isEditable ? (
              <Button type="button" onClick={() => openCreate()}>
                Thêm minh chứng đầu tiên
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-6">
          {studentEvidenceCriteria.map((criterion) => {
            const items = evidenceList.filter((item) => item.criterion === criterion.key);
            return (
              <section key={criterion.key} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-brand-deep">{criterion.label}</h2>
                    <p className="text-sm text-muted-foreground">{items.length} minh chứng</p>
                  </div>
                  {isEditable ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openCreate(criterion.key)}
                    >
                      <Plus className="h-4 w-4" />
                      Thêm
                    </Button>
                  ) : null}
                </div>

                {items.length ? (
                  <div className="grid gap-3 xl:grid-cols-2">
                    {items.map((evidence) => (
                      <EvidenceListItem
                        key={evidence.id}
                        evidence={evidence}
                        canEdit={isEditable}
                        retrying={retryJob.isPending}
                        onOpen={() => setSelectedEvidence(evidence)}
                        onRetry={() => {
                          if (!evidence.jobId) return;
                          void retryJob.mutateAsync({
                            evidenceId: evidence.id,
                            jobId: evidence.jobId,
                          });
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed bg-white p-5 text-sm text-muted-foreground">
                    Chưa có minh chứng cho tiêu chí này.
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {applicationId ? (
        <AddEvidenceDrawer
          applicationId={applicationId}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          initialCriterion={initialCriterion}
          onCreated={(evidence) => {
            setSelectedEvidence(evidence);
            void evidenceQuery.refetch();
          }}
        />
      ) : null}

      <EvidenceDetailModal
        evidence={selectedEvidence}
        applicationId={applicationId}
        canEdit={isEditable}
        onClose={() => setSelectedEvidence(null)}
        onChanged={() => void evidenceQuery.refetch()}
      />
    </>
  );
}

function EvidenceListItem({
  evidence,
  canEdit,
  retrying,
  onOpen,
  onRetry,
}: {
  evidence: EvidenceResponse;
  canEdit: boolean;
  retrying: boolean;
  onOpen: () => void;
  onRetry: () => void;
}) {
  const card = normalizeEvidenceCard((evidence as EvidenceResponse & { card?: unknown }).card);
  const uxStatus = getEvidenceUxStatus(evidence, card);
  const confidence = getConfidenceSummary(card?.confidence ?? evidence.confidence);
  const warnings = normalizeWarnings(card?.warnings ?? card?.warningsJson);
  const fileCount = getEvidenceFiles(evidence).length;
  const retryable = canRetryEvidence(evidence);

  return (
    <article className="rounded-md border bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {studentEvidenceCriteria.find((item) => item.key === evidence.criterion)?.label}
            </Badge>
            <Badge variant="outline">
              {sourceTypeCopy[evidence.sourceType] ?? evidence.sourceType}
            </Badge>
          </div>
          <h3 className="mt-2 line-clamp-2 font-semibold text-foreground">
            {evidence.evidenceName}
          </h3>
          {evidence.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {evidence.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <UxStatusCard status={uxStatus} className="p-3" />
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <Meta
          icon={CalendarClock}
          label="Trạng thái"
          value={indexingStatusCopy[evidence.indexingStatus] ?? evidence.indexingStatus}
        />
        <Meta label="File" value={fileCount ? `${fileCount} file` : "Chưa có file"} />
        <Meta
          label="Độ chắc chắn"
          value={confidence ? `${confidence.label} (${confidence.percent}%)` : "Chưa có"}
        />
        <Meta
          label="Cảnh báo"
          value={warnings.length ? `${warnings.length} cảnh báo` : "Không có"}
        />
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        Cập nhật: {formatStudentDate(evidence.updatedAt)}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={onOpen}>
          Xem Evidence Card
        </Button>
        {canEdit ? (
          <Button type="button" size="sm" variant="outline" onClick={onOpen}>
            Tải file bổ sung
          </Button>
        ) : null}
        {retryable ? (
          <Button type="button" size="sm" variant="outline" disabled={retrying} onClick={onRetry}>
            {retrying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Thử xử lý lại
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </div>
      <div
        className={cn(
          "mt-1 break-words font-semibold text-foreground",
          value === "Chưa có" && "text-muted-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}
