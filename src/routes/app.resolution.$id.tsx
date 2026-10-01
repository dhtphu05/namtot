import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileQuestion,
  FileText,
  History,
  Link2,
  MessageSquareText,
  Send,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/store/auth-store";
import { evidenceApi } from "@/features/evidence/api/evidence";
import { CriterionBadge } from "@/features/review/components/CriterionBadge";
import { EmptyReviewState } from "@/features/review/components/EmptyReviewState";
import { LevelBadge } from "@/features/review/components/LevelBadge";
import { ReviewErrorState } from "@/features/review/components/ReviewErrorState";
import { ReviewLoadingState } from "@/features/review/components/ReviewLoadingState";
import { ReviewStatusBadge } from "@/features/review/components/ReviewStatusBadge";
import { useSignedFileUrl } from "@/features/review/hooks/useReview";
import type { ReviewDecision, Role } from "@/features/review/types";
import { getErrorMessage } from "@/features/review/utils/errors";
import {
  formatAuditActionLabel,
  formatDateTime,
  formatEvidenceClarityLabel,
  formatRoleLabel,
  getCriterionLabel,
  getTaskStatusLabel,
  isUserFacingAuditAction,
} from "@/features/review/utils/formatters";
import {
  useResolutionCase,
  useResolveResolutionCase,
} from "@/features/resolution/hooks/useResolution";
import { useSmartUXTracking } from "@/hooks/useSmartUXTracking";
import type {
  ResolutionCaseDetail,
  ResolutionCaseStatus,
  ResolutionComment,
  ResolutionEvidence,
  ResolutionFinalDecision,
  ResolutionTimelineItem,
} from "@/features/resolution/types";

export const Route = createFileRoute("/app/resolution/$id")({
  component: ResolutionCaseDetailRoute,
});

const managerRoles: Role[] = [
  "officer",
  "manager",
  "committee",
  "city_officer",
  "city_manager",
  "city_committee",
  "admin",
];
const fallbackText = "Chưa có dữ liệu";
const resolveDecisionOptions: Array<{
  value: ResolutionFinalDecision;
  label: string;
}> = [
  { value: "accepted", label: "Công nhận minh chứng" },
  { value: "rejected", label: "Không công nhận minh chứng" },
  { value: "supplement_required", label: "Yêu cầu bổ sung" },
  { value: "closed_no_action", label: "Kết thúc, không thay đổi kết quả" },
];

function ResolutionCaseDetailRoute() {
  const { id } = Route.useParams();
  const user = useAuth((state) => state.user);
  const role = user?.role as Role | undefined;

  if (!role || !managerRoles.includes(role)) {
    return (
      <>
        <TopBar
          title="Chi tiết hồ sơ hội ý"
          subtitle="Thông tin phục vụ quản lý và hội đồng xử lý trường hợp cần hội ý."
          action={<BackToResolutionButton />}
        />
        <Card>
          <div className="py-8 text-center">
            <div className="text-base font-semibold text-brand-deep">
              Bạn không có quyền truy cập hồ sơ hội ý.
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Chức năng này dành cho quản lý, hội đồng và quản trị viên.
            </div>
          </div>
        </Card>
      </>
    );
  }

  if (!id) {
    return (
      <>
        <TopBar
          title="Chi tiết hồ sơ hội ý"
          subtitle="Không tìm thấy mã hồ sơ hội ý."
          action={<BackToResolutionButton />}
        />
        <ReviewErrorState
          title="Thiếu mã hồ sơ hội ý"
          description="Đường dẫn hiện tại không có mã hồ sơ hội ý hợp lệ."
        />
      </>
    );
  }

  return <ResolutionCaseDetailContent caseId={id} role={role} />;
}

function ResolutionCaseDetailContent({ caseId, role }: { caseId: string; role: Role }) {
  const { data: resolutionCase, error, isError, isLoading, refetch } = useResolutionCase(caseId);

  if (isLoading) {
    return <ReviewLoadingState label="Đang tải chi tiết hồ sơ hội ý..." />;
  }

  if (isError) {
    return (
      <>
        <TopBar
          title="Chi tiết hồ sơ hội ý"
          subtitle={
            role === "city_committee"
              ? "Tạm thời chưa xem được hồ sơ này."
              : "Không thể tải dữ liệu hồ sơ hội ý."
          }
          action={<BackToResolutionButton />}
        />
        <ReviewErrorState
          description={
            role === "city_committee"
              ? "Tạm thời chưa xem được hồ sơ này. Vui lòng thử lại sau."
              : getErrorMessage(error, "Không thể tải chi tiết hồ sơ hội ý. Vui lòng thử lại sau.")
          }
          onRetry={() => void refetch()}
        />
      </>
    );
  }

  if (!resolutionCase) {
    return (
      <>
        <TopBar
          title="Chi tiết hồ sơ hội ý"
          subtitle="Không tìm thấy dữ liệu hồ sơ hội ý."
          action={<BackToResolutionButton />}
        />
        <EmptyReviewState
          title="Không tìm thấy hồ sơ hội ý"
          description="Hồ sơ có thể đã được xử lý, bị xóa hoặc bạn không có quyền xem."
        />
      </>
    );
  }

  const resolutionEvidences = dedupeEvidences([
    resolutionCase.primaryEvidence,
    ...(resolutionCase.relatedEvidences ?? []),
  ]);

  return (
    <>
      <TopBar
        title={
          role === "city_committee"
            ? "Chi tiết hồ sơ Hội đồng xem xét"
            : `Chi tiết hồ sơ hội ý #${shortId(resolutionCase.id)}`
        }
        subtitle={`${resolutionCase.studentName || fallbackText} • ${resolutionCase.studentCode || fallbackText}`}
        action={<BackToResolutionButton />}
      />

      <div className="space-y-5">
        <Card className="min-w-0">
          {role === "city_committee" ? (
            <div className="grid min-w-0 grid-cols-2 gap-3">
              <HeaderField
                label="Trạng thái xử lý"
                value={
                  <ReviewStatusBadge
                    status={resolutionStatusToReviewStatus(resolutionCase.status)}
                  />
                }
              />
              <HeaderField
                label="Tiêu chí"
                value={<CriterionBadge criterion={resolutionCase.criterion} />}
              />
            </div>
          ) : (
            <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              <HeaderField
                label="Trạng thái hội ý"
                value={
                  <ReviewStatusBadge
                    status={resolutionStatusToReviewStatus(resolutionCase.status)}
                  />
                }
              />
              <HeaderField
                label="Tiêu chí"
                value={<CriterionBadge criterion={resolutionCase.criterion} />}
              />
              <HeaderField
                label="Cấp xét"
                value={<LevelBadge level={resolutionCase.targetLevel} />}
              />
              <HeaderField
                label="Trạng thái hồ sơ"
                value={<ReviewStatusBadge status={resolutionCase.applicationStatus} />}
              />
              <HeaderField label="Người chuyển" value={getActorLabel(resolutionCase)} />
              <HeaderField label="Ngày tạo" value={formatDateTime(resolutionCase.createdAt)} />
              <HeaderField label="Cập nhật" value={formatDateTime(resolutionCase.updatedAt)} />
              <HeaderField label="Mã hồ sơ" value={`#${shortId(resolutionCase.applicationId)}`} />
            </div>
          )}
        </Card>

        <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.42fr)]">
          <div className="space-y-5">
            <ReasonSection
              resolutionCase={resolutionCase}
              cityCommittee={role === "city_committee"}
            />
            <LinkedDataSection
              resolutionCase={resolutionCase}
              showReviewId={role !== "city_committee"}
              showApplicationId={role !== "city_committee"}
              cityCommittee={role === "city_committee"}
            />
            <StudentSection resolutionCase={resolutionCase} />
            {role !== "city_committee" ? (
              <HistorySection
                comments={resolutionCase.comments ?? []}
                decisionHistory={resolutionCase.decisionHistory ?? []}
              />
            ) : null}
          </div>

          <div className="space-y-5">
            {role === "officer" || role === "city_officer" ? (
              <OfficerResolutionReadonlyCard />
            ) : (
              <ResolveResolutionPanel
                caseId={resolutionCase.id}
                criterion={resolutionCase.criterion}
                evidences={resolutionEvidences}
                status={resolutionCase.status}
                targetLevel={resolutionCase.targetLevel}
                onSuccess={() => void refetch()}
              />
            )}
            {role !== "city_committee" ? (
              <TimelineSection timeline={resolutionCase.auditTimeline ?? []} />
            ) : null}
          </div>
        </section>
      </div>
    </>
  );
}

function BackToResolutionButton() {
  return (
    <Button asChild variant="outline">
      <Link to="/app/resolution">
        <ArrowLeft className="h-4 w-4" />
        Quay lại
      </Link>
    </Button>
  );
}

function OfficerResolutionReadonlyCard() {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-blue-50 p-2 text-brand-deep">
          <MessageSquareText className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-brand-deep">Theo dõi hội ý</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Cán bộ xem lại lý do chuyển hội ý, minh chứng liên quan và lịch sử xử lý. Chỉ Hội đồng
            và cấp quản lý có thể kết luận hồ sơ này.
          </p>
        </div>
      </div>
    </Card>
  );
}

function dedupeEvidences(evidences: Array<ResolutionEvidence | null | undefined>) {
  const seen = new Set<string>();
  return evidences.filter((evidence): evidence is ResolutionEvidence => {
    if (!evidence?.id || seen.has(evidence.id)) return false;
    seen.add(evidence.id);
    return true;
  });
}

function HeaderField({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold text-brand-deep">
        {value || fallbackText}
      </div>
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

function ReasonSection({
  resolutionCase,
  cityCommittee,
}: {
  resolutionCase: ResolutionCaseDetail;
  cityCommittee: boolean;
}) {
  const reason = resolutionCase.reason || fallbackText;
  const councilQuestion = `Minh chứng này có được tính cho ${getCriterionLabel(resolutionCase.criterion)} ${getResolutionLevelText(resolutionCase.targetLevel)} không?`;

  return (
    <Card>
      <SectionHeader
        icon={<FileQuestion className="h-5 w-5" />}
        title={cityCommittee ? "Lý do chuyển Hội đồng" : "Lý do cần hội ý"}
      />
      {cityCommittee ? (
        <div className="space-y-3">
          <div className="rounded-md border bg-muted/30 p-4 text-sm text-foreground">{reason}</div>
          <InfoRow label="Nội dung cần xem xét" value={councilQuestion} />
          {resolutionCase.officerNote?.trim() &&
          resolutionCase.officerNote.trim() !== resolutionCase.reason?.trim() ? (
            <InfoRow label="Thông tin bổ sung từ cán bộ" value={resolutionCase.officerNote} />
          ) : null}
        </div>
      ) : (
        <>
          <div className="mb-3 grid gap-3 md:grid-cols-2">
            <InfoRow label="Lý do chính" value={reason} />
            <InfoRow label="Câu hỏi cần hội đồng quyết định" value={councilQuestion} />
          </div>
          <div className="rounded-md border bg-muted/30 p-4 text-sm text-foreground">{reason}</div>
          {resolutionCase.officerNote ? (
            <div className="mt-3 rounded-md border p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ghi chú cán bộ
              </div>
              <p className="mt-1 text-sm text-foreground">{resolutionCase.officerNote}</p>
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}

function LinkedDataSection({
  resolutionCase,
  showReviewId,
  showApplicationId,
  cityCommittee,
}: {
  resolutionCase: ResolutionCaseDetail;
  showReviewId: boolean;
  showApplicationId: boolean;
  cityCommittee: boolean;
}) {
  const evidenceIds = resolutionCase.evidenceIds ?? [];
  const evidenceNames = resolutionCase.evidenceNames ?? [];
  const relatedEvidences = resolutionCase.relatedEvidences ?? [];

  return (
    <Card>
      <SectionHeader
        icon={<Link2 className="h-5 w-5" />}
        title={cityCommittee ? "Minh chứng để xem xét" : "Hồ sơ và minh chứng liên quan"}
        description={
          cityCommittee ? "Xem tài liệu gốc để đối chiếu trước khi kết luận." : undefined
        }
      />
      {showApplicationId || showReviewId ? (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {showApplicationId ? (
            <InfoRow label="Mã hồ sơ" value={`#${shortId(resolutionCase.applicationId)}`} />
          ) : null}
          {showReviewId ? (
            <InfoRow
              label="Mã lượt xem xét"
              value={resolutionCase.taskId ? `#${shortId(resolutionCase.taskId)}` : undefined}
            />
          ) : null}
        </div>
      ) : null}

      {!cityCommittee &&
      (!resolutionCase.applicationId || !resolutionCase.taskId || !evidenceIds.length) ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Một số thông tin về hồ sơ hoặc minh chứng chưa đầy đủ để đối chiếu. Vui lòng kiểm tra lại
          trước khi kết luận.
        </div>
      ) : null}

      {!cityCommittee ? (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Minh chứng liên quan
          </div>
          {evidenceIds.length || evidenceNames.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {(evidenceNames.length ? evidenceNames : evidenceIds).map((item) => (
                <Badge key={item} variant="outline">
                  {item}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">
              Chưa có minh chứng cụ thể được liên kết.
            </div>
          )}
        </div>
      ) : null}
      <div className="mt-5 space-y-4">
        <div>
          {!cityCommittee ? (
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Minh chứng chính
            </div>
          ) : null}
          {resolutionCase.primaryEvidence ? (
            <div className="mt-2">
              <ResolutionEvidenceCard
                evidence={resolutionCase.primaryEvidence}
                cityCommittee={cityCommittee}
              />
            </div>
          ) : (
            <div className="mt-2 rounded-lg border bg-slate-50 p-3 text-sm text-muted-foreground">
              Chưa có minh chứng cụ thể được liên kết.
            </div>
          )}
        </div>
        {relatedEvidences.length || !cityCommittee ? (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Minh chứng liên quan
            </div>
            {relatedEvidences.length ? (
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                {relatedEvidences.map((evidence) => (
                  <ResolutionEvidenceCard
                    key={evidence.id}
                    evidence={evidence}
                    cityCommittee={cityCommittee}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-2 rounded-lg border bg-slate-50 p-3 text-sm text-muted-foreground">
                Không có minh chứng liên quan khác.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function ResolutionEvidenceCard({
  evidence,
  cityCommittee,
}: {
  evidence: ResolutionEvidence;
  cityCommittee: boolean;
}) {
  const openFile = async (fileId: string) => {
    try {
      const response = await evidenceApi.getSignedFileUrl(fileId);
      if (response.data?.url) window.open(response.data.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(
        cityCommittee
          ? "Không mở được tài liệu. Vui lòng thử lại."
          : error instanceof Error
            ? error.message
            : "Không thể mở tệp.",
      );
    }
  };

  return (
    <div className="rounded-lg border p-3">
      <div className="break-words font-semibold text-brand-deep">{evidence.evidenceName}</div>
      {cityCommittee ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Đối chiếu nội dung trên tài liệu với hồ sơ sinh viên.
        </p>
      ) : (
        <>
          <div className="mt-1 text-xs text-muted-foreground">
            {getResolutionEvidenceSourceLabel(evidence.sourceType)} ·{" "}
            {getResolutionEvidenceStatusLabel(evidence.status)} ·{" "}
            {getIndexingLabel(evidence.indexingStatus)}
          </div>
          {typeof evidence.confidence === "number" ? (
            <div className="mt-2">
              <Badge variant="secondary">{formatEvidenceClarityLabel(evidence.confidence)}</Badge>
            </div>
          ) : null}
          {evidence.evidenceCard?.aiSummary ? (
            <p className="mt-2 text-sm text-muted-foreground">{evidence.evidenceCard.aiSummary}</p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Chưa có tóm tắt đọc nhanh cho minh chứng này.
            </p>
          )}
        </>
      )}
      <div className="mt-3 space-y-2">
        {evidence.files?.length ? (
          evidence.files.map((file) => (
            <ResolutionEvidenceFile
              key={file.id}
              file={file}
              cityCommittee={cityCommittee}
              onOpen={() => openFile(file.id)}
            />
          ))
        ) : (
          <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-muted-foreground">
            Minh chứng chưa có tài liệu đính kèm.
          </div>
        )}
      </div>
    </div>
  );
}

function ResolutionEvidenceFile({
  file,
  cityCommittee,
  onOpen,
}: {
  file: ResolutionEvidence["files"][number];
  cityCommittee: boolean;
  onOpen: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const { data: signedUrl, isError, isLoading, refetch } = useSignedFileUrl(file.id, cityCommittee);
  const isImage = file.mimeType.startsWith("image/");
  const canShowImage = Boolean(signedUrl) && !imageFailed;

  const retryFile = () => {
    setImageFailed(false);
    void refetch();
  };

  if (cityCommittee) {
    return (
      <div className="min-w-0 overflow-hidden rounded-lg border bg-slate-50">
        {isImage ? (
          canShowImage ? (
            <a
              aria-label={`Mở ảnh ${file.originalName}`}
              className="block aspect-[4/3] w-full overflow-hidden bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-deep"
              href={signedUrl}
              rel="noreferrer"
              target="_blank"
            >
              <img
                alt={file.originalName}
                className="h-full w-full object-contain"
                loading="lazy"
                src={signedUrl}
                onError={() => setImageFailed(true)}
              />
            </a>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center bg-white px-4 text-center text-sm text-muted-foreground">
              <div>
                <div>
                  {isLoading
                    ? "Đang tải bản xem trước…"
                    : isError || imageFailed
                      ? "Chưa tải được bản xem trước. Hãy thử lại hoặc mở tài liệu gốc."
                      : "Bản xem trước chưa sẵn sàng."}
                </div>
                <Button className="mt-2" size="sm" variant="outline" onClick={retryFile}>
                  Tải lại tài liệu
                </Button>
              </div>
            </div>
          )
        ) : (
          <>
            {file.mimeType === "application/pdf" && signedUrl ? (
              <iframe
                className="aspect-[4/3] w-full bg-white"
                loading="lazy"
                src={signedUrl}
                title={`Bản xem trước: ${file.originalName}`}
              />
            ) : null}
            <div className="flex min-w-0 items-center gap-3 p-3">
              <div className="shrink-0 rounded-md bg-white p-2 text-brand-deep">
                <FileText aria-hidden="true" className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="break-words text-sm font-medium text-foreground">
                  {file.originalName}
                </div>
                {signedUrl ? (
                  <a
                    className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-deep underline-offset-4 hover:underline"
                    href={signedUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink aria-hidden="true" className="h-4 w-4" />
                    Mở tài liệu
                  </a>
                ) : (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{isLoading ? "Đang tải tài liệu…" : "Chưa mở được tài liệu."}</span>
                    {isError ? (
                      <Button size="sm" variant="outline" onClick={retryFile}>
                        Tải lại tài liệu
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        {isImage ? (
          <div className="flex min-w-0 items-center justify-between gap-2 border-t px-3 py-2">
            <span className="min-w-0 break-words text-sm text-foreground">{file.originalName}</span>
            {canShowImage ? (
              <a
                aria-label={`Mở ảnh ${file.originalName}`}
                className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-2 text-sm font-medium text-brand-deep hover:bg-white"
                href={signedUrl}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
                Mở ảnh
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
      <span className="min-w-0 truncate">{file.originalName}</span>
      <Button size="sm" variant="ghost" onClick={onOpen}>
        <ExternalLink className="h-4 w-4" />
        Mở tài liệu
      </Button>
    </div>
  );
}

function StudentSection({ resolutionCase }: { resolutionCase: ResolutionCaseDetail }) {
  return (
    <Card>
      <SectionHeader icon={<UserRound className="h-5 w-5" />} title="Thông tin sinh viên" />
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoRow label="Họ tên" value={resolutionCase.studentName} />
        <InfoRow label="Mã sinh viên" value={resolutionCase.studentCode} />
        <InfoRow label="Khoa" value={resolutionCase.faculty} />
        <InfoRow label="Lớp" value={resolutionCase.className} />
      </div>
    </Card>
  );
}

function HistorySection({
  comments,
  decisionHistory,
}: {
  comments: ResolutionComment[];
  decisionHistory: NonNullable<ResolutionCaseDetail["decisionHistory"]>;
}) {
  const hasData = comments.length || decisionHistory.length;

  return (
    <Card>
      <SectionHeader
        icon={<MessageSquareText className="h-5 w-5" />}
        title="Ghi chú và lịch sử xử lý"
      />
      {hasData ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <HistoryItem
              key={comment.id}
              actor={`${comment.actorName || fallbackText} / ${formatRoleLabel(comment.actorRole)}`}
              note={comment.message}
              title="Ghi chú hội ý"
              timestamp={comment.createdAt}
            />
          ))}

          {decisionHistory.map((item) => (
            <HistoryItem
              key={item.id}
              actor={`${item.actorName || fallbackText} / ${formatRoleLabel(item.actorRole)}`}
              note={item.note}
              title={getTaskStatusLabel(item.decision)}
              timestamp={item.createdAt}
            />
          ))}
        </div>
      ) : (
        <EmptyReviewState
          title="Chưa có lịch sử xử lý"
          description="Ghi chú và kết luận liên quan đến hồ sơ hội ý sẽ hiển thị tại đây."
        />
      )}
    </Card>
  );
}

function TimelineSection({ timeline }: { timeline: ResolutionTimelineItem[] }) {
  const visibleTimeline = timeline.filter((item) => isUserFacingAuditAction(item.action));
  return (
    <Card>
      <SectionHeader icon={<History className="h-5 w-5" />} title="Lịch sử hồ sơ hội ý" />
      {visibleTimeline.length ? (
        <div className="space-y-3">
          {visibleTimeline.map((item) => (
            <HistoryItem
              key={item.id}
              actor={
                [item.actorName, formatRoleLabel(item.actorRole)].filter(Boolean).join(" / ") ||
                fallbackText
              }
              note={item.note}
              title={formatAuditActionLabel(item.action)}
              timestamp={item.createdAt}
            />
          ))}
        </div>
      ) : (
        <EmptyReviewState
          title="Chưa có lịch sử xử lý"
          description="Khi có thao tác hội ý hoặc kết luận, lịch sử nghiệp vụ sẽ hiển thị tại đây."
        />
      )}
    </Card>
  );
}

function ResolveResolutionPanel({
  caseId,
  criterion,
  evidences,
  status,
  targetLevel,
  onSuccess,
}: {
  caseId: string;
  criterion: ResolutionCaseDetail["criterion"];
  evidences: ResolutionEvidence[];
  status: ResolutionCaseStatus;
  targetLevel: ResolutionCaseDetail["targetLevel"];
  onSuccess?: () => void;
}) {
  const navigate = useNavigate();
  const { trackAction } = useSmartUXTracking();
  const [decision, setDecision] = useState<ResolutionFinalDecision>("accepted");
  const [evidenceDecisions, setEvidenceDecisions] = useState<
    Record<string, Exclude<ResolutionFinalDecision, "closed_no_action">>
  >({});
  const [updateKnowledgeBase, setUpdateKnowledgeBase] = useState(false);
  const [knowledgeBaseTitle, setKnowledgeBaseTitle] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const resolveCase = useResolveResolutionCase(caseId);
  const isResolved = status === "resolved";
  const apiError =
    resolveCase.error instanceof Error
      ? resolveCase.error.message
      : resolveCase.error
        ? "Chưa thể gửi kết luận lúc này. Vui lòng thử lại sau."
        : null;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedMessage(null);

    if (isResolved) {
      setFormError("Hồ sơ hội ý đã có kết luận.");
      return;
    }

    if (!note.trim()) {
      setFormError("Vui lòng nhập ghi chú kết luận hội ý.");
      return;
    }

    if (updateKnowledgeBase && !knowledgeBaseTitle.trim()) {
      setFormError("Vui lòng nhập tiêu đề tiền lệ xét duyệt.");
      return;
    }

    setFormError(null);
    trackAction("manager_confirm_resolution", {
      role: "manager",
      criterion,
      target_level: targetLevel,
      status: decision,
      count: evidences.length,
    });
    resolveCase.mutate(
      {
        decision,
        note: note.trim(),
        updateKnowledgeBase,
        knowledgeBaseTitle: updateKnowledgeBase ? knowledgeBaseTitle.trim() : undefined,
        evidenceDecisions: evidences.map((evidence) => ({
          evidenceId: evidence.id,
          decision:
            evidenceDecisions[evidence.id] ??
            (decision === "closed_no_action" ? "rejected" : decision),
          note: note.trim(),
        })),
      },
      {
        onSuccess: () => {
          trackAction("manager_confirm_resolution", {
            role: "manager",
            criterion,
            target_level: targetLevel,
            status: "success",
            count: evidences.length,
          });
          const message =
            "Đã lưu kết luận hội ý. Kết quả sẽ được áp dụng vào tác vụ/hồ sơ liên quan.";
          setSubmittedMessage(message);
          toast.success(message, {
            action: {
              label: "Quay về danh sách",
              onClick: () => {
                void navigate({ to: "/app/resolution" });
              },
            },
          });
          onSuccess?.();
        },
      },
    );
  };

  return (
    <Card>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-brand-deep">Kết luận hội ý</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Quản lý hoặc hội đồng ghi nhận kết luận xử lý trường hợp này.
              </p>
            </div>
            <Badge variant={isResolved ? "secondary" : "outline"}>
              {isResolved ? "Đã kết luận" : "Có thể xử lý"}
            </Badge>
          </div>

          {isResolved ? (
            <div className="mt-3 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              Hồ sơ hội ý đã được kết luận, không thể gửi quyết định mới.
            </div>
          ) : null}
        </div>

        <div>
          <label className="text-sm font-semibold text-brand-deep" htmlFor="resolution-decision">
            Quyết định
          </label>
          <select
            className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            disabled={isResolved || resolveCase.isPending}
            id="resolution-decision"
            value={decision}
            onChange={(event) => {
              setDecision(event.target.value as typeof decision);
              setFormError(null);
            }}
          >
            {resolveDecisionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {evidences.length ? (
          <div className="rounded-md border bg-muted/20 p-3">
            <div className="text-sm font-semibold text-brand-deep">Quyết định theo minh chứng</div>
            <div className="mt-3 space-y-3">
              {evidences.map((evidence) => (
                <label key={evidence.id} className="block text-sm">
                  <span className="mb-1 block font-medium text-foreground">
                    {evidence.evidenceName || evidence.id}
                  </span>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                    disabled={isResolved || resolveCase.isPending}
                    value={evidenceDecisions[evidence.id] ?? decision}
                    onChange={(event) => {
                      setEvidenceDecisions((current) => ({
                        ...current,
                        [evidence.id]: event.target.value as Exclude<
                          ResolutionFinalDecision,
                          "closed_no_action"
                        >,
                      }));
                      setFormError(null);
                    }}
                  >
                    {resolveDecisionOptions
                      .filter((option) => option.value !== "closed_no_action")
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </select>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-md border bg-muted/20 p-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-brand-deep">
            <input
              type="checkbox"
              checked={updateKnowledgeBase}
              disabled={isResolved || resolveCase.isPending}
              onChange={(event) => {
                setUpdateKnowledgeBase(event.target.checked);
                setFormError(null);
              }}
            />
            Lưu thành tiền lệ xét duyệt
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            Dùng làm tiền lệ xét duyệt cho hồ sơ tương tự. Không lưu thêm thông tin cá nhân không
            cần thiết.
          </p>
          {updateKnowledgeBase ? (
            <input
              className="mt-3 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              disabled={isResolved || resolveCase.isPending}
              placeholder="Tiêu đề tiền lệ xét duyệt"
              value={knowledgeBaseTitle}
              onChange={(event) => {
                setKnowledgeBaseTitle(event.target.value);
                setFormError(null);
              }}
            />
          ) : null}
        </div>

        <div>
          <label className="text-sm font-semibold text-brand-deep" htmlFor="resolution-note">
            Ghi chú kết luận
          </label>
          <Textarea
            className="mt-2 min-h-28"
            disabled={isResolved || resolveCase.isPending}
            id="resolution-note"
            placeholder="Nhập căn cứ, kết luận và hướng xử lý tiếp theo..."
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setFormError(null);
            }}
          />
          {formError ? <div className="mt-1 text-xs text-destructive">{formError}</div> : null}
        </div>

        {apiError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {apiError}
          </div>
        ) : null}

        {submittedMessage ? (
          <div className="flex gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{submittedMessage}</span>
          </div>
        ) : null}

        <Button
          className="w-full"
          disabled={isResolved || resolveCase.isPending}
          type="submit"
          data-smartux-tag="officer_escalate_resolution"
        >
          <Send className="h-4 w-4" />
          {resolveCase.isPending ? "Đang gửi..." : "Gửi kết luận"}
        </Button>
      </form>
    </Card>
  );
}

function HistoryItem({
  actor,
  note,
  timestamp,
  title,
}: {
  actor: string;
  note?: string | null;
  timestamp?: string | null;
  title: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-brand-deep">{title || fallbackText}</div>
          <div className="mt-1 text-xs text-muted-foreground">{actor || fallbackText}</div>
        </div>
        <div className="text-xs text-muted-foreground">{formatDateTime(timestamp)}</div>
      </div>
      {note ? <p className="mt-2 text-sm text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function getResolutionLevelText(level: ResolutionCaseDetail["targetLevel"]) {
  const labels: Record<ResolutionCaseDetail["targetLevel"], string> = {
    school: "cấp Trường",
    university: "cấp ĐHĐN",
    city: "cấp Thành phố",
    central: "cấp Trung ương",
  };
  return labels[level] ?? "cấp xét hiện tại";
}

function getResolutionEvidenceSourceLabel(sourceType?: string | null) {
  const labels: Record<string, string> = {
    metric_input: "Dữ liệu sinh viên khai báo",
    manual_upload: "Minh chứng sinh viên tải lên",
    event_import: "Minh chứng từ sự kiện",
    collective_import: "Minh chứng tập thể",
  };
  return sourceType ? (labels[sourceType] ?? "Nguồn minh chứng khác") : fallbackText;
}

function getResolutionEvidenceStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    draft: "Bản nháp",
    pending_indexing: "Đang kiểm tra",
    indexed: "Đã kiểm tra",
    needs_supplement: "Cần bổ sung",
    under_review: "Đang xét duyệt",
    accepted: "Đã công nhận",
    rejected: "Không công nhận",
    resolution_needed: "Cần hội ý",
  };
  return status ? (labels[status] ?? "Đang cập nhật") : fallbackText;
}

function getIndexingLabel(status?: string | null) {
  const labels: Record<string, string> = {
    not_started: "Chưa đọc file",
    uploaded: "Đã tải lên",
    pending_indexing: "Đang kiểm tra",
    ocr_processing: "Đang đọc file",
    extracting: "Đang đọc thông tin",
    checking_registry: "Đang đối chiếu",
    indexed: "Đã kiểm tra xong",
    needs_manual_review: "Cần cán bộ kiểm tra",
    failed: "Cần kiểm tra thủ công",
  };
  return status ? (labels[status] ?? "Đang cập nhật") : fallbackText;
}

function shortId(id?: string | null) {
  return id ? id.slice(0, 8).toUpperCase() : "N/A";
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold text-brand-deep">
        {value || fallbackText}
      </div>
    </div>
  );
}

function getActorLabel(resolutionCase: ResolutionCaseDetail) {
  const actorName = resolutionCase.escalatedByName || resolutionCase.createdByName;
  const actorRole = resolutionCase.escalatedByRole || resolutionCase.createdByRole;

  return [actorName, actorRole].filter(Boolean).join(" / ") || fallbackText;
}

function resolutionStatusToReviewStatus(status: ResolutionCaseStatus) {
  if (status === "resolved") {
    return "accepted";
  }

  if (status === "in_review") {
    return "reviewing";
  }

  return "resolution_needed";
}
