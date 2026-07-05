import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileQuestion,
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

const managerRoles: Role[] = ["officer", "manager", "committee", "admin"];
const fallbackText = "Chưa có dữ liệu";
const resolveDecisionOptions: Array<{
  value: ResolutionFinalDecision;
  label: string;
}> = [
  { value: "accepted", label: "Công nhận minh chứng" },
  { value: "rejected", label: "Không công nhận minh chứng" },
  { value: "supplement_required", label: "Yêu cầu bổ sung" },
  { value: "closed_no_action", label: "Đóng case không xử lý" },
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
          subtitle="Không thể tải dữ liệu hồ sơ hội ý."
          action={<BackToResolutionButton />}
        />
        <ReviewErrorState
          description={getErrorMessage(
            error,
            "Không thể tải chi tiết hồ sơ hội ý. Vui lòng thử lại sau.",
          )}
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
        title={`Case hội ý #${shortId(resolutionCase.id)}`}
        subtitle={`${resolutionCase.studentName || fallbackText} • ${resolutionCase.studentCode || fallbackText}`}
        action={<BackToResolutionButton />}
      />

      <div className="space-y-5">
        <Card>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <HeaderField
              label="Trạng thái hội ý"
              value={
                <ReviewStatusBadge status={resolutionStatusToReviewStatus(resolutionCase.status)} />
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
        </Card>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.42fr)]">
          <div className="space-y-5">
            <ReasonSection resolutionCase={resolutionCase} />
            <LinkedDataSection resolutionCase={resolutionCase} />
            <StudentSection resolutionCase={resolutionCase} />
            <HistorySection
              comments={resolutionCase.comments ?? []}
              decisionHistory={resolutionCase.decisionHistory ?? []}
            />
          </div>

          <div className="space-y-5">
            {role === "officer" ? (
              <OfficerResolutionReadonlyCard />
            ) : (
              <ResolveResolutionPanel
                caseId={resolutionCase.id}
                evidences={resolutionEvidences}
                status={resolutionCase.status}
                onSuccess={() => void refetch()}
              />
            )}
            <TimelineSection timeline={resolutionCase.auditTimeline ?? []} />
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
            Cán bộ xem lại lý do chuyển hội ý, minh chứng liên quan và lịch sử xử lý. Chỉ Hội
            đồng/Cấp quản lý được kết luận case này.
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

function ReasonSection({ resolutionCase }: { resolutionCase: ResolutionCaseDetail }) {
  return (
    <Card>
      <SectionHeader icon={<FileQuestion className="h-5 w-5" />} title="Lý do cần hội ý" />
      <div className="mb-3 grid gap-3 md:grid-cols-2">
        <InfoRow label="Lý do chính" value={resolutionCase.reason || fallbackText} />
        <InfoRow
          label="Câu hỏi cần hội đồng quyết định"
          value={`Minh chứng này có được tính cho ${getCriterionLabel(resolutionCase.criterion)} ${getResolutionLevelText(resolutionCase.targetLevel)} không?`}
        />
      </div>
      <div className="rounded-md border bg-muted/30 p-4 text-sm text-foreground">
        {resolutionCase.reason || fallbackText}
      </div>
      {resolutionCase.officerNote ? (
        <div className="mt-3 rounded-md border p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ghi chú cán bộ
          </div>
          <p className="mt-1 text-sm text-foreground">{resolutionCase.officerNote}</p>
        </div>
      ) : null}
    </Card>
  );
}

function LinkedDataSection({ resolutionCase }: { resolutionCase: ResolutionCaseDetail }) {
  const evidenceIds = resolutionCase.evidenceIds ?? [];
  const evidenceNames = resolutionCase.evidenceNames ?? [];
  const relatedEvidences = resolutionCase.relatedEvidences ?? [];

  return (
    <Card>
      <SectionHeader
        icon={<Link2 className="h-5 w-5" />}
        title="Liên kết hồ sơ / tác vụ / minh chứng"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoRow label="Mã hồ sơ ngắn" value={`#${shortId(resolutionCase.applicationId)}`} />
        <InfoRow
          label="Tác vụ xét duyệt liên quan"
          value={resolutionCase.taskId ? `#${shortId(resolutionCase.taskId)}` : undefined}
        />
      </div>

      {!resolutionCase.applicationId || !resolutionCase.taskId || !evidenceIds.length ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Case này thiếu liên kết minh chứng hoặc tác vụ xét duyệt. Vui lòng quay lại tác vụ xét
          duyệt và chuyển hội ý lại để hội đồng có đủ ngữ cảnh.
        </div>
      ) : null}

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
            Case này chưa liên kết minh chứng cụ thể.
          </div>
        )}
      </div>
      <div className="mt-5 space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Minh chứng chính
          </div>
          {resolutionCase.primaryEvidence ? (
            <div className="mt-2">
              <ResolutionEvidenceCard evidence={resolutionCase.primaryEvidence} />
            </div>
          ) : (
            <div className="mt-2 rounded-lg border bg-slate-50 p-3 text-sm text-muted-foreground">
              Case này chưa liên kết minh chứng cụ thể.
            </div>
          )}
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Minh chứng liên quan
          </div>
          {relatedEvidences.length ? (
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {relatedEvidences.map((evidence) => (
                <ResolutionEvidenceCard key={evidence.id} evidence={evidence} />
              ))}
            </div>
          ) : (
            <div className="mt-2 rounded-lg border bg-slate-50 p-3 text-sm text-muted-foreground">
              Không có minh chứng liên quan khác.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function ResolutionEvidenceCard({ evidence }: { evidence: ResolutionEvidence }) {
  const openFile = async (fileId: string) => {
    try {
      const response = await evidenceApi.getSignedFileUrl(fileId);
      if (response.data?.url) window.open(response.data.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể mở file.");
    }
  };

  return (
    <div className="rounded-lg border p-3">
      <div className="font-semibold text-brand-deep">{evidence.evidenceName}</div>
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
      <div className="mt-3 space-y-2">
        {evidence.files?.length ? (
          evidence.files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm"
            >
              <span className="truncate">{file.originalName}</span>
              <Button size="sm" variant="ghost" onClick={() => openFile(file.id)}>
                <ExternalLink className="h-4 w-4" />
                Xem file
              </Button>
            </div>
          ))
        ) : (
          <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-muted-foreground">
            Minh chứng chưa có file đính kèm.
          </div>
        )}
      </div>
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
      <SectionHeader icon={<History className="h-5 w-5" />} title="Lịch sử xử lý case" />
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
  evidences,
  status,
  onSuccess,
}: {
  caseId: string;
  evidences: ResolutionEvidence[];
  status: ResolutionCaseStatus;
  onSuccess?: () => void;
}) {
  const navigate = useNavigate();
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
        ? "Không thể gửi kết luận hội ý. Chức năng kết luận hội ý sẽ được bật khi backend hỗ trợ."
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

        <Button className="w-full" disabled={isResolved || resolveCase.isPending} type="submit">
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
  return sourceType ? (labels[sourceType] ?? sourceType) : fallbackText;
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
  return status ? (labels[status] ?? status) : fallbackText;
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
  return status ? (labels[status] ?? status) : fallbackText;
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
