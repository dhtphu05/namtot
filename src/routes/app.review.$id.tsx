import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  Download,
  ExternalLink,
  Eye,
  FileText,
  History,
  ListChecks,
  MessageSquarePlus,
  Send,
  XCircle,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AuditTimeline } from "@/features/audit/components/AuditTimeline";
import { useAuth } from "@/features/auth/store/auth-store";
import { CriterionBadge } from "@/features/review/components/CriterionBadge";
import { EmptyReviewState } from "@/features/review/components/EmptyReviewState";
import { LevelBadge } from "@/features/review/components/LevelBadge";
import { ReviewErrorState } from "@/features/review/components/ReviewErrorState";
import { ReviewLoadingState } from "@/features/review/components/ReviewLoadingState";
import { ReviewStatusBadge } from "@/features/review/components/ReviewStatusBadge";
import { reviewApi } from "@/features/review/api/review";
import {
  useClaimReviewTask,
  useEscalateResolution,
  useRequestSupplement,
  useReviewTask,
  useSubmitReviewDecision,
} from "@/features/review/hooks/useReview";
import type {
  ReviewDecision,
  ReviewTaskAvailableAction,
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
  getLevelLabel,
  getTaskStatusLabel,
} from "@/features/review/utils/formatters";
import {
  type CoreCriterion,
  coreCriteria,
  criteriaLevelSummaries,
  criterionInputFields,
  evaluateCriterionAgainstMatrix,
  getCriterionMatrixItem,
  getPrimaryMetricInput,
} from "@/lib/criteria-matrix";
import { ACTIVE_LEVELS } from "@/lib/levels";
import { getFinalStatusLabel } from "@/lib/status-labels";

export const Route = createFileRoute("/app/review/$id")({
  component: ReviewTaskDetailRoute,
});

const allowedRoles: Role[] = ["officer", "manager", "committee", "admin"];
const fallbackText = "Chưa có dữ liệu";
const levelOrder = ["school", "university", "city", "central"] as const;
const criterionShortLabels: Record<CoreCriterion, string> = {
  ethics: "ĐĐ",
  academic: "HT",
  physical: "TL",
  volunteer: "TN",
  integration: "HN",
};
const metricLabels: Record<string, string> = {
  gpa: "GPA/ĐTB",
  conduct_score: "Điểm rèn luyện",
  physical_score: "Điểm thể lực",
  volunteer_days: "Ngày/giờ tình nguyện",
  foreign_language_score: "Chứng chỉ ngoại ngữ",
};

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
  const claimTask = useClaimReviewTask(taskId);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [selectedCriterion, setSelectedCriterion] = useState<CoreCriterion>("academic");
  const [evidenceAssessments, setEvidenceAssessments] = useState<Record<string, EvidenceAssessmentValue>>({});
  const [activeDecisionAction, setActiveDecisionAction] = useState<DetailDecisionAction | null>(null);

  useEffect(() => {
    if (isCoreCriterion(task?.criterion)) {
      setSelectedCriterion(task.criterion);
    }
  }, [task?.id, task?.criterion]);

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
  const canDecide = hasTaskAction(task, "decide");
  const canRequestSupplement = hasTaskAction(task, "request_supplement");
  const activeCriterion = selectedCriterion;

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

        <PermissionSummary
          isClaiming={claimTask.isPending}
          task={task}
          onClaim={() => setClaimDialogOpen(true)}
        />

        <section className="min-w-0 space-y-5">
          <CriteriaOverviewSection
            evidences={evidences}
            metrics={metrics}
            selectedCriterion={activeCriterion}
            task={task}
            onSelectCriterion={setSelectedCriterion}
          />
          <CriterionTabs
            evidences={evidences}
            metrics={metrics}
            selectedCriterion={activeCriterion}
            task={task}
            onSelectCriterion={setSelectedCriterion}
          />
          <CriterionWorkspace
            checklist={checklist}
            criterion={activeCriterion}
            decisionHistory={decisionHistory}
            evidenceAssessments={evidenceAssessments}
            evidences={evidences}
            metrics={metrics}
            task={task}
            onRequestSupplement={
              canRequestSupplement ? () => setActiveDecisionAction("supplement_required") : undefined
            }
            onEvidenceAssessmentChange={(evidenceId, assessment) =>
              setEvidenceAssessments((current) => ({ ...current, [evidenceId]: assessment }))
            }
          />
          <AuditTimeline applicationId={task.application.id} limit={10} taskId={task.id} />
          {canDecide || canRequestSupplement || hasTaskAction(task, "escalate_resolution") ? (
            <ReviewDecisionActionBar
              activeAction={activeDecisionAction}
              evidenceAssessments={evidenceAssessments}
              task={task}
              onActionChange={setActiveDecisionAction}
              onSuccess={() => void refetch()}
            />
          ) : (
            <ReadOnlyActionPanel task={task} />
          )}
        </section>
      </div>

      <ConfirmClaimDialog
        isLoading={claimTask.isPending}
        open={claimDialogOpen}
        task={task}
        onOpenChange={setClaimDialogOpen}
        onConfirm={() =>
          claimTask.mutate(undefined, {
            onSuccess: () => {
              setClaimDialogOpen(false);
              void refetch();
            },
            onError: (error) => {
              toast.error(
                getErrorMessage(
                  error,
                  "Task này vừa được giao cho cán bộ khác. Bạn đang ở chế độ chỉ xem.",
                ),
              );
              setClaimDialogOpen(false);
              void refetch();
            },
          })
        }
      />
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

function hasTaskAction(task: ReviewTaskDetail, action: ReviewTaskAvailableAction) {
  if (task.permissions?.availableActions) {
    return task.permissions.availableActions.includes(action);
  }

  if (action === "view") return task.permissions?.canView ?? true;
  if (action === "claim") return task.permissions?.canClaim ?? false;
  if (action === "request_support") return task.permissions?.canRequestSupport ?? false;
  return task.permissions?.canAct ?? false;
}

function ConfirmClaimDialog({
  isLoading,
  open,
  task,
  onConfirm,
  onOpenChange,
}: {
  isLoading: boolean;
  open: boolean;
  task: ReviewTaskDetail;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const student = task.application.student;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận nhận xử lý</DialogTitle>
          <DialogDescription>
            Sau khi nhận, hồ sơ sẽ được giao cho bạn và bạn chịu trách nhiệm đưa quyết định.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <div className="font-semibold text-brand-deep">
            {student.fullName || "Chưa có tên sinh viên"}
          </div>
          <div className="mt-1 text-muted-foreground">
            {student.studentCode || "Chưa có MSSV"} • {getCriterionLabel(task.criterion)} •{" "}
            {getLevelLabel(task.application.targetLevel)}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button disabled={isLoading} type="button" onClick={onConfirm}>
            {isLoading ? "Đang nhận..." : "Xác nhận nhận xử lý"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReadOnlyActionPanel({ task }: { task: ReviewTaskDetail }) {
  return (
    <Card className="border border-[#E3ECF6] bg-[#F8FBFE]">
      <div className="flex items-start gap-3">
        <Eye className="mt-0.5 h-5 w-5 text-muted-foreground" />
        <div>
          <h2 className="text-base font-bold text-brand-deep">Chế độ chỉ xem</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {task.permissions?.reasonLabel ??
              "Tác vụ này chưa có quyền xử lý, hệ thống chỉ hiển thị dữ liệu để theo dõi."}
          </p>
          {task.permissions?.badges?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {task.permissions.badges.map((badge) => (
                <Badge key={badge} variant="secondary">
                  {badge}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

type DetailDecisionAction = "accepted" | "rejected" | "supplement_required" | "resolution_needed";
type EvidenceAssessmentValue = "valid" | "ambiguous" | "invalid";

const rejectionReasonTemplates = [
  "Không đạt điều kiện cứng của cấp đang xét",
  "Dữ liệu sinh viên nhập chưa đáp ứng yêu cầu",
  "Tài liệu không phù hợp với tiêu chí này",
  "Thông tin trong tài liệu không đủ căn cứ xác nhận",
];

const supplementChecklist = [
  { key: "missing_file", label: "Thiếu tệp xác nhận" },
  { key: "missing_data", label: "Thiếu dữ liệu cần nhập" },
  { key: "unclear_document", label: "Giấy xác nhận chưa rõ" },
  { key: "other", label: "Khác" },
];

const resolutionReasons = [
  "Thông tin mâu thuẫn giữa dữ liệu và tài liệu",
  "Cần hội đồng xem xét trường hợp đặc biệt",
  "Tài liệu cần xác minh thêm từ đơn vị cấp",
  "Vượt phạm vi quyết định của cán bộ xử lý",
];

function ReviewDecisionActionBar({
  activeAction,
  evidenceAssessments,
  task,
  onActionChange,
  onSuccess,
}: {
  activeAction: DetailDecisionAction | null;
  evidenceAssessments: Record<string, EvidenceAssessmentValue>;
  task: ReviewTaskDetail;
  onActionChange: (action: DetailDecisionAction | null) => void;
  onSuccess: () => void;
}) {
  const canDecide = hasTaskAction(task, "decide");
  const canRequestSupplement = hasTaskAction(task, "request_supplement");
  const canEscalateResolution = hasTaskAction(task, "escalate_resolution");
  const isFinal = ["accepted", "rejected", "resolution_needed"].includes(task.status);
  const disabledReason = task.permissions?.reasonLabel ?? "Bạn chưa có quyền kết luận tác vụ này.";

  const actions: Array<{
    value: DetailDecisionAction;
    label: string;
    description: string;
    icon: React.ReactNode;
    enabled: boolean;
    className: string;
  }> = [
    {
      value: "accepted",
      label: "Đạt tiêu chí",
      description: "Xác nhận dữ liệu và tài liệu phù hợp.",
      icon: <CheckCircle2 className="h-4 w-4" />,
      enabled: canDecide && !isFinal,
      className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    },
    {
      value: "rejected",
      label: "Không đạt",
      description: "Ghi rõ lý do không đạt tiêu chí.",
      icon: <XCircle className="h-4 w-4" />,
      enabled: canDecide && !isFinal,
      className: "bg-rose-50 text-rose-700 hover:bg-rose-100",
    },
    {
      value: "supplement_required",
      label: "Yêu cầu bổ sung",
      description: "Gửi nội dung cần bổ sung cho sinh viên.",
      icon: <MessageSquarePlus className="h-4 w-4" />,
      enabled: canRequestSupplement && !isFinal,
      className: "bg-sky-50 text-sky-700 hover:bg-sky-100",
    },
    {
      value: "resolution_needed",
      label: "Chuyển Resolution Hub",
      description: "Chuyển trường hợp cần hội ý.",
      icon: <Send className="h-4 w-4" />,
      enabled: canEscalateResolution && !isFinal,
      className: "bg-amber-50 text-amber-800 hover:bg-amber-100",
    },
  ];

  return (
    <>
      <Card className="sticky bottom-4 z-20 border border-white/80 bg-white/95 !p-3 shadow-[0_18px_48px_-28px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Kết luận xét duyệt</div>
            <div className="mt-1 text-sm font-semibold text-brand-deep">
              {getCriterionLabel(task.criterion)} • {getTaskStatusLabel(task.status)}
            </div>
            {isFinal || (!canDecide && !canRequestSupplement && !canEscalateResolution) ? (
              <div className="mt-1 text-xs text-muted-foreground">
                {isFinal ? "Tác vụ đã có kết luận cuối cùng." : disabledReason}
              </div>
            ) : null}
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {actions.map((action) => (
              <button
                key={action.value}
                className={[
                  "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45",
                  action.className,
                ].join(" ")}
                disabled={!action.enabled}
                type="button"
                title={action.description}
                onClick={() => onActionChange(action.value)}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <DecisionConfirmModal
        action={activeAction}
        evidenceAssessments={evidenceAssessments}
        task={task}
        onClose={() => onActionChange(null)}
        onSuccess={onSuccess}
      />
    </>
  );
}

function DecisionConfirmModal({
  action,
  evidenceAssessments,
  task,
  onClose,
  onSuccess,
}: {
  action: DetailDecisionAction | null;
  evidenceAssessments: Record<string, EvidenceAssessmentValue>;
  task: ReviewTaskDetail;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const submitDecision = useSubmitReviewDecision(task.id);
  const requestSupplement = useRequestSupplement(task.id);
  const escalateResolution = useEscalateResolution(task.id);
  const [suggestedLevel, setSuggestedLevel] = useState<Level | "">(task.officerSuggestedLevel ?? task.application.targetLevel);
  const [note, setNote] = useState("");
  const [reasonTemplate, setReasonTemplate] = useState("");
  const [supplementItems, setSupplementItems] = useState<string[]>([]);
  const [supplementContent, setSupplementContent] = useState("");
  const [supplementDeadline, setSupplementDeadline] = useState("");
  const [resolutionReason, setResolutionReason] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const relatedEvidences = getDecisionRelatedEvidences(task);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>(relatedEvidences.map((evidence) => evidence.id));

  useEffect(() => {
    setSuggestedLevel(task.officerSuggestedLevel ?? task.application.targetLevel);
    setNote("");
    setReasonTemplate("");
    setSupplementItems([]);
    setSupplementContent("");
    setSupplementDeadline("");
    setResolutionReason("");
    setResolutionSummary("");
    setSelectedEvidenceIds(getDecisionRelatedEvidences(task).map((evidence) => evidence.id));
  }, [action, task]);

  const context = getDecisionContext(task);
  const isPending = submitDecision.isPending || requestSupplement.isPending || escalateResolution.isPending;
  const confirmDisabled = isPending || !isDecisionFormReady(action, {
    suggestedLevel,
    note,
    reasonTemplate,
    supplementItems,
    supplementContent,
    supplementDeadline,
    resolutionReason,
    resolutionSummary,
  });

  const closeAfterSuccess = (message: string) => {
    toast.success(message);
    onClose();
    onSuccess();
  };

  const handleConfirm = () => {
    if (!action) return;

    if (action === "accepted") {
      submitDecision.mutate(
        {
          payload: {
            decision: "accepted",
            evidenceAssessments: toEvidenceAssessmentsPayload(evidenceAssessments),
            officerSuggestedLevel: suggestedLevel as Level,
            levelAssessmentJson: task.criterionLevelAssessment ? { assessment: task.criterionLevelAssessment } : undefined,
            note: note.trim(),
          },
        },
        { onSuccess: () => closeAfterSuccess("Đã xác nhận tiêu chí đạt.") },
      );
      return;
    }

    if (action === "rejected") {
      submitDecision.mutate(
        {
          payload: {
            decision: "rejected",
            evidenceAssessments: toEvidenceAssessmentsPayload(evidenceAssessments),
            officerSuggestedLevel: null,
            note: `${reasonTemplate}. ${note.trim()}`,
          },
        },
        { onSuccess: () => closeAfterSuccess("Đã xác nhận tiêu chí không đạt.") },
      );
      return;
    }

    if (action === "supplement_required") {
      requestSupplement.mutate(
        {
          payload: {
            note: buildSupplementNote(supplementItems, supplementContent),
            deadline: supplementDeadline,
            evidenceIds: selectedEvidenceIds,
          },
        },
        { onSuccess: () => closeAfterSuccess("Đã gửi yêu cầu bổ sung cho sinh viên.") },
      );
      return;
    }

    escalateResolution.mutate(
      {
        payload: {
          reason: `${resolutionReason}. ${resolutionSummary.trim()}`,
          evidenceIds: selectedEvidenceIds,
        },
      },
      { onSuccess: () => closeAfterSuccess("Đã chuyển hồ sơ sang Resolution Hub.") },
    );
  };

  return (
    <Dialog open={Boolean(action)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{getDecisionModalTitle(action)}</DialogTitle>
          <DialogDescription>
            Kiểm tra thông tin chính trước khi xác nhận. Nút xác nhận chỉ mở khi các trường bắt buộc đã đủ.
          </DialogDescription>
        </DialogHeader>

        <DecisionContextSummary context={context} />

        {action === "accepted" ? (
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-brand-deep" htmlFor="accepted-level">
              Cấp đạt tối đa
              <select
                className="mt-2 h-10 w-full rounded-lg border border-[#DCE7F2] bg-white px-3 text-sm"
                id="accepted-level"
                value={suggestedLevel}
                onChange={(event) => setSuggestedLevel(event.target.value as Level | "")}
              >
                <option value="">Chọn cấp đạt tối đa</option>
                {([...ACTIVE_LEVELS] as Level[]).map((level) => (
                  <option key={level} value={level}>{getLevelLabel(level)}</option>
                ))}
              </select>
            </label>
            <ReviewNoteField
              optional
              label="Ghi chú"
              placeholder="Có thể ghi thêm căn cứ xác nhận nếu cần."
              value={note}
              onChange={setNote}
            />
          </div>
        ) : null}

        {action === "rejected" ? (
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-brand-deep" htmlFor="rejected-reason">
              Mẫu lý do
              <select
                className="mt-2 h-10 w-full rounded-lg border border-[#DCE7F2] bg-white px-3 text-sm"
                id="rejected-reason"
                value={reasonTemplate}
                onChange={(event) => setReasonTemplate(event.target.value)}
              >
                <option value="">Chọn lý do không đạt</option>
                {rejectionReasonTemplates.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
              </select>
            </label>
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
              Nếu tiêu chí này không đạt, hồ sơ có thể không đủ điều kiện cho {getLevelLabel(task.application.targetLevel)}.
            </div>
            <ReviewNoteField
              label="Ghi chú bắt buộc"
              placeholder="Ghi rõ căn cứ không đạt để sinh viên và cấp xét theo dõi."
              value={note}
              onChange={setNote}
            />
          </div>
        ) : null}

        {action === "supplement_required" ? (
          <div className="space-y-4">
            <ChecklistField
              items={supplementChecklist}
              selected={supplementItems}
              onChange={setSupplementItems}
            />
            <ReviewNoteField
              label="Nội dung gửi sinh viên"
              placeholder="Ví dụ: Sinh viên đã nhập TOEIC 990 nhưng chưa tải chứng chỉ hoặc giấy xác nhận."
              value={supplementContent}
              onChange={setSupplementContent}
            />
            <label className="block text-sm font-semibold text-brand-deep" htmlFor="supplement-deadline">
              Deadline bổ sung
              <input
                className="mt-2 h-10 w-full rounded-lg border border-[#DCE7F2] bg-white px-3 text-sm"
                id="supplement-deadline"
                type="date"
                value={supplementDeadline}
                onChange={(event) => setSupplementDeadline(event.target.value)}
              />
            </label>
            <EvidenceSelectionField
              evidences={relatedEvidences}
              selectedIds={selectedEvidenceIds}
              onChange={setSelectedEvidenceIds}
            />
            <div className="rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-800">
              Khi xác nhận, hệ thống chuyển tác vụ sang Cần bổ sung, gửi thông báo cho sinh viên và ghi lịch sử xử lý.
            </div>
          </div>
        ) : null}

        {action === "resolution_needed" ? (
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-brand-deep" htmlFor="resolution-reason">
              Lý do chuyển
              <select
                className="mt-2 h-10 w-full rounded-lg border border-[#DCE7F2] bg-white px-3 text-sm"
                id="resolution-reason"
                value={resolutionReason}
                onChange={(event) => setResolutionReason(event.target.value)}
              >
                <option value="">Chọn lý do chuyển Resolution Hub</option>
                {resolutionReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
              </select>
            </label>
            <ReviewNoteField
              label="Tóm tắt vấn đề"
              placeholder="Tóm tắt điểm cần hội ý, dữ liệu đang mâu thuẫn hoặc tài liệu cần xác minh."
              value={resolutionSummary}
              onChange={setResolutionSummary}
            />
            <EvidenceSelectionField
              evidences={relatedEvidences}
              selectedIds={selectedEvidenceIds}
              onChange={setSelectedEvidenceIds}
            />
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Khi xác nhận, tác vụ được chuyển sang Resolution Hub và ghi lịch sử xử lý.
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button disabled={isPending} type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button
            className={getDecisionConfirmButtonClass(action)}
            disabled={confirmDisabled}
            type="button"
            onClick={handleConfirm}
          >
            {isPending ? "Đang xử lý..." : getDecisionConfirmLabel(action)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DecisionContextSummary({
  context,
}: {
  context: { student: string; criterion: string; primaryData: string; documentCount: number };
}) {
  return (
    <div className="grid gap-2 rounded-2xl bg-[#F8FBFE] p-3 sm:grid-cols-2">
      <InfoRow label="Sinh viên" value={context.student} />
      <InfoRow label="Tiêu chí" value={context.criterion} />
      <InfoRow label="Dữ liệu chính" value={context.primaryData} />
      <InfoRow label="Số tài liệu" value={`${context.documentCount} tệp`} />
    </div>
  );
}

function ReviewNoteField({
  label,
  optional,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  optional?: boolean;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-semibold text-brand-deep">
      {label}
      {optional ? <span className="ml-1 font-normal text-muted-foreground">(không bắt buộc)</span> : null}
      <Textarea
        className="mt-2 min-h-28 rounded-xl border-[#DCE7F2]"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ChecklistField({
  items,
  selected,
  onChange,
}: {
  items: Array<{ key: string; label: string }>;
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-brand-deep">Nội dung cần bổ sung</div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <label key={item.key} className="flex items-center gap-2 rounded-xl bg-[#F8FBFE] px-3 py-2 text-sm">
            <Checkbox
              checked={selected.includes(item.key)}
              onCheckedChange={(checked) =>
                onChange(checked ? [...selected, item.key] : selected.filter((key) => key !== item.key))
              }
            />
            {item.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function EvidenceSelectionField({
  evidences,
  selectedIds,
  onChange,
}: {
  evidences: ReviewTaskEvidence[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  if (!evidences.length) {
    return (
      <div className="rounded-xl border border-dashed border-[#DCE7F2] p-3 text-sm text-muted-foreground">
        Chưa có tài liệu liên quan để chọn.
      </div>
    );
  }

  return (
    <div>
      <div className="text-sm font-semibold text-brand-deep">Tài liệu liên quan</div>
      <div className="mt-2 space-y-2">
        {evidences.map((evidence) => (
          <label key={evidence.id} className="flex items-center gap-2 rounded-xl bg-[#F8FBFE] px-3 py-2 text-sm">
            <Checkbox
              checked={selectedIds.includes(evidence.id)}
              onCheckedChange={(checked) =>
                onChange(checked ? [...selectedIds, evidence.id] : selectedIds.filter((id) => id !== evidence.id))
              }
            />
            <span className="min-w-0 flex-1 truncate">{getEvidenceDisplayName(evidence)}</span>
            <span className="text-xs text-muted-foreground">{evidence.files?.length ?? 0} tệp</span>
          </label>
        ))}
      </div>
    </div>
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

function PermissionSummary({
  isClaiming,
  task,
  onClaim,
}: {
  isClaiming: boolean;
  task: ReviewTaskDetail;
  onClaim: () => void;
}) {
  const permission = task.permissions;
  const title = permission?.canAct
    ? "Bạn được xử lý hồ sơ này"
    : permission?.canClaim
      ? "Bạn có thể nhận xử lý hồ sơ này"
      : "Bạn đang ở chế độ chỉ xem";
  const description =
    permission?.reasonLabel ??
    "Chưa có thông tin quyền chi tiết cho tác vụ này, hệ thống đang dùng quyền mặc định.";

  return (
    <Card>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-brand-deep">{title}</h2>
            <Badge variant={permission?.canAct ? "default" : permission?.canClaim ? "outline" : "secondary"}>
              {permission?.canAct ? "Được xử lý" : permission?.canClaim ? "Có thể nhận" : "Chỉ xem"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {permission?.canClaim ? (
          <Button disabled={isClaiming} type="button" onClick={onClaim}>
            {isClaiming ? "Đang nhận..." : "Nhận xử lý"}
          </Button>
        ) : null}
      </div>
    </Card>
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

function CriteriaOverviewSection({
  task,
  metrics,
  evidences,
  selectedCriterion,
  onSelectCriterion,
}: {
  task: ReviewTaskDetail;
  metrics: ReviewTaskDetail["metrics"];
  evidences: ReviewTaskEvidence[];
  selectedCriterion: CoreCriterion;
  onSelectCriterion: (criterion: CoreCriterion) => void;
}) {
  const targetLevel = task.application.targetLevel;
  const rows = coreCriteria.map((criterion) => {
    const relatedMetrics = getCriterionMetrics(metrics, criterion.key);
    const relatedEvidences = getCriterionEvidences(evidences, criterion.key);
    const assessment = evaluateCriterionAgainstMatrix(targetLevel, criterion.key, { metrics, evidences });
    const fileCount = relatedEvidences.reduce((count, evidence) => count + (evidence.files?.length ?? 0), 0);
    return {
      criterion,
      relatedMetrics,
      relatedEvidences,
      assessment,
      fileCount,
    };
  });

  return (
    <Card>
      <SectionHeader
        icon={<ListChecks className="h-5 w-5" />}
        title="Tổng quan 5 tiêu chí"
        description={"Cán bộ kiểm tra dữ liệu chính và tài liệu theo " + getLevelLabel(targetLevel) + " trước khi ra quyết định."}
      />
      <div className="responsive-scroll rounded-md border">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Tiêu chí</th>
              <th className="px-3 py-2">Dữ liệu chính</th>
              <th className="px-3 py-2">Tài liệu</th>
              <th className="px-3 py-2">Trạng thái xét</th>
              <th className="px-3 py-2">Quyền</th>
              <th className="px-3 py-2">Việc cần làm</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr
                key={row.criterion.key}
                className={selectedCriterion === row.criterion.key ? "bg-[#F1F7FD]" : "hover:bg-muted/30"}
              >
                <td className="px-3 py-3">
                  <button
                    className="text-left font-semibold text-brand-deep hover:underline"
                    type="button"
                    onClick={() => onSelectCriterion(row.criterion.key)}
                  >
                    {row.criterion.label}
                  </button>
                </td>
                <td className="px-3 py-3 text-slate-700">{getPrimaryDataText(row.relatedMetrics, row.criterion.key)}</td>
                <td className="px-3 py-3">
                  <span className="font-semibold text-brand-deep">{row.fileCount} tệp</span>
                  {row.relatedEvidences.length && !row.fileCount ? (
                    <div className="mt-1 text-xs text-amber-700">Đã có mục ghi nhận, thiếu tệp xác nhận</div>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <Badge variant={getCriterionStatusVariant(row.assessment.status)}>
                    {getCriterionTaskStatusLabel(task, row.criterion.key, row.assessment.statusLabel)}
                  </Badge>
                </td>
                <td className="px-3 py-3">{getOfficerPermissionLabel(task)}</td>
                <td className="px-3 py-3 text-slate-700">
                  {getOfficerNextAction(row.assessment.status, row.fileCount, row.relatedMetrics.length)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function getOfficerNextAction(
  status: ReturnType<typeof evaluateCriterionAgainstMatrix>["status"],
  fileCount = 0,
  metricCount = 0,
) {
  if (!fileCount && metricCount) return "Yêu cầu file xác nhận";
  if (status === "not_suitable") return "Có thể quyết định hoặc yêu cầu bổ sung";
  if (status === "missing_data") return "Yêu cầu sinh viên bổ sung dữ liệu";
  if (status === "needs_supplement") return "Kiểm tra tài liệu hoặc yêu cầu bổ sung";
  return "Đối chiếu và ra quyết định";
}

function CriterionTabs({
  task,
  metrics,
  evidences,
  selectedCriterion,
  onSelectCriterion,
}: {
  task: ReviewTaskDetail;
  metrics: ReviewTaskDetail["metrics"];
  evidences: ReviewTaskEvidence[];
  selectedCriterion: CoreCriterion;
  onSelectCriterion: (criterion: CoreCriterion) => void;
}) {
  return (
    <Card>
      <div className="flex min-w-0 flex-wrap gap-2">
        {coreCriteria.map((criterion) => {
          const assessment = evaluateCriterionAgainstMatrix(task.application.targetLevel, criterion.key, { metrics, evidences });
          const active = selectedCriterion === criterion.key;
          return (
            <button
              key={criterion.key}
              className={[
                "flex min-w-[min(100%,96px)] items-center justify-between gap-2 rounded-full border px-3 py-2 text-sm transition",
                active ? "border-brand-deep bg-brand-deep text-white" : "bg-white text-brand-deep hover:bg-muted/40",
              ].join(" ")}
              type="button"
              onClick={() => onSelectCriterion(criterion.key)}
            >
              <span className="font-semibold sm:hidden">{criterionShortLabels[criterion.key]}</span>
              <span className="hidden font-semibold sm:inline">{criterion.label}</span>
              <span className={active ? "text-xs text-white/80" : "text-xs text-muted-foreground"}>
                {getCriterionTaskStatusLabel(task, criterion.key, assessment.statusLabel)}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function CriterionWorkspace({
  task,
  criterion,
  metrics,
  evidences,
  checklist,
  decisionHistory,
  evidenceAssessments,
  onEvidenceAssessmentChange,
  onRequestSupplement,
}: {
  task: ReviewTaskDetail;
  criterion: CoreCriterion;
  metrics: ReviewTaskDetail["metrics"];
  evidences: ReviewTaskEvidence[];
  checklist: NonNullable<ReviewTaskDetail["checklist"]>;
  decisionHistory: NonNullable<ReviewTaskDetail["decisionHistory"]>;
  evidenceAssessments: Record<string, EvidenceAssessmentValue>;
  onEvidenceAssessmentChange: (evidenceId: string, assessment: EvidenceAssessmentValue) => void;
  onRequestSupplement?: () => void;
}) {
  const criterionMeta = coreCriteria.find((item) => item.key === criterion) ?? coreCriteria[0];
  const matrixItem = getCriterionMatrixItem(task.application.targetLevel, criterion);
  const relatedMetrics = getCriterionMetrics(metrics, criterion);
  const relatedEvidences = getCriterionEvidences(evidences, criterion);
  const assessment = evaluateCriterionAgainstMatrix(task.application.targetLevel, criterion, { metrics, evidences });

  return (
    <Card>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tiêu chí đang xét</div>
            <h2 className="mt-1 text-xl font-bold text-brand-deep">{criterionMeta.label}</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{criterionMeta.description}</p>
          </div>
          <Badge variant={getCriterionStatusVariant(assessment.status)}>{assessment.statusLabel}</Badge>
        </div>

        <CriterionDocumentsSection
          assessmentStatus={assessment.status}
          criterion={criterion}
          evidenceAssessments={evidenceAssessments}
          evidences={relatedEvidences}
          metrics={relatedMetrics}
          onRequestSupplement={onRequestSupplement}
          onEvidenceAssessmentChange={onEvidenceAssessmentChange}
        />

        <CriterionMetricsSection criterion={criterion} evidences={relatedEvidences} metrics={relatedMetrics} />

        <CriterionChecklistSection
          assessmentStatus={assessment.status}
          checklist={task.criterion === criterion ? checklist : []}
          criterion={criterion}
          evidences={relatedEvidences}
          matrixItem={matrixItem}
          targetLevel={task.application.targetLevel}
        />

        <DecisionHistorySection history={decisionHistory} />
      </div>
    </Card>
  );
}

function CriterionDocumentsSection({
  criterion,
  evidences,
  metrics,
  assessmentStatus,
  evidenceAssessments,
  onEvidenceAssessmentChange,
  onRequestSupplement,
}: {
  criterion: CoreCriterion;
  evidences: ReviewTaskEvidence[];
  metrics: ReviewTaskDetail["metrics"];
  assessmentStatus: ReturnType<typeof evaluateCriterionAgainstMatrix>["status"];
  evidenceAssessments: Record<string, EvidenceAssessmentValue>;
  onEvidenceAssessmentChange: (evidenceId: string, assessment: EvidenceAssessmentValue) => void;
  onRequestSupplement?: () => void;
}) {
  const criterionLabel = getCriterionLabel(criterion);
  const hasFiles = evidences.some((evidence) => evidence.files?.length);

  if (!hasFiles) {
    return (
      <div className="rounded-md border border-dashed bg-muted/20 p-4">
        <div className="text-sm font-semibold text-brand-deep">
          {metrics.length ? "Đã có dữ liệu, thiếu tệp xác nhận" : `Chưa có tệp xác nhận cho tiêu chí ${criterionLabel}.`}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {metrics.length
            ? `Sinh viên đã nhập ${getPrimaryDataText(metrics, criterion)} nhưng chưa tải chứng chỉ hoặc giấy xác nhận.`
            : "Sinh viên chưa nhập dữ liệu hoặc chưa tải tài liệu cho tiêu chí này."}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button disabled={!onRequestSupplement} type="button" onClick={onRequestSupplement}>
            Yêu cầu bổ sung tệp xác nhận
          </Button>
          <Badge variant={getCriterionStatusVariant(assessmentStatus)}>{metrics.length ? "Thiếu tệp xác nhận" : "Chưa có dữ liệu"}</Badge>
        </div>
      </div>
    );
  }

  return (
    <section>
      <SectionHeader
        icon={<FileText className="h-5 w-5" />}
        title="Tài liệu / giấy xác nhận tiêu chí này"
        description="Tài liệu được hiển thị trước để cán bộ đối chiếu ngay trong workspace."
      />
      <div className="space-y-4">
        {evidences.map((evidence) => (
          <CriterionEvidenceCard
            assessment={evidenceAssessments[evidence.id] ?? ""}
            key={evidence.id}
            criterion={criterion}
            evidence={evidence}
            onAssessmentChange={onEvidenceAssessmentChange}
          />
        ))}
      </div>
    </section>
  );
}

function CriterionEvidenceCard({
  assessment,
  evidence,
  criterion,
  onAssessmentChange,
}: {
  assessment: EvidenceAssessmentValue | "";
  evidence: ReviewTaskEvidence;
  criterion: CoreCriterion;
  onAssessmentChange: (evidenceId: string, assessment: EvidenceAssessmentValue) => void;
}) {
  const fields = toFieldEntries(evidence.card?.extractedFieldsJson);
  const warnings = toReadableList(evidence.card?.warningsJson);
  return (
    <div className="rounded-2xl border border-[#E3ECF6] bg-white p-4">
      <EvidenceInlineActions
        assessment={assessment}
        evidence={evidence}
        onAssessmentChange={onAssessmentChange}
      />
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(min(100%,260px),420px)_minmax(0,1fr)]">
        <div className="space-y-3">
          {evidence.files?.length ? (
            evidence.files.map((file) => <PreviewFileAttachment key={file.id} file={file} />)
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Mục này chưa có tệp đính kèm.</div>
          )}
        </div>
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-bold text-brand-deep">{evidence.evidenceName || getDefaultDocumentName(criterion)}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">{getSourceTypeLabel(evidence.sourceType)}</Badge>
              <CriterionBadge criterion={criterion} />
              <ReviewStatusBadge status={evidence.status} />
              {typeof evidence.confidence === "number" ? <Badge variant="secondary">Độ rõ {Math.round(evidence.confidence * 100)}%</Badge> : null}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <InfoRow label="Ngày ghi nhận" value={formatDateTime(evidence.createdAt)} />
            <InfoRow label="Đơn vị cấp" value={evidence.event?.organizer} />
            <InfoRow label="Cấp tổ chức" value={evidence.event?.organizerLevel ? getLevelLabel(evidence.event.organizerLevel) : undefined} />
            <InfoRow label="Loại tài liệu" value={getSourceTypeLabel(evidence.sourceType)} />
          </div>
          {fields.length ? (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Thông tin đọc được từ tài liệu</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {fields.map(([key, value]) => <InfoRow key={key} label={key} value={String(value)} />)}
              </div>
            </div>
          ) : null}
          {warnings.length ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <div className="text-sm font-semibold text-amber-900">Cần kiểm tra thêm</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
                {warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EvidenceInlineActions({
  assessment,
  evidence,
  onAssessmentChange,
}: {
  assessment: EvidenceAssessmentValue | "";
  evidence: ReviewTaskEvidence;
  onAssessmentChange: (evidenceId: string, assessment: EvidenceAssessmentValue) => void;
}) {
  const markEvidence = (nextAssessment: EvidenceAssessmentValue) => {
    onAssessmentChange(evidence.id, nextAssessment);
    const message =
      nextAssessment === "valid"
        ? "Đã đánh dấu tài liệu phù hợp, sẽ lưu cùng kết luận."
        : nextAssessment === "ambiguous"
          ? "Đã đánh dấu tài liệu cần xem lại, sẽ lưu cùng kết luận."
          : "Đã đánh dấu tài liệu không dùng cho tiêu chí này, sẽ lưu cùng kết luận.";
    toast.success(message);
  };

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-xl bg-[#F8FBFE] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Đánh dấu tài liệu</div>
        <div className="truncate text-sm font-semibold text-brand-deep">{getEvidenceDisplayName(evidence)}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className={[
            "rounded-full px-3 py-1.5 text-xs font-semibold transition",
            assessment === "valid" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
          ].join(" ")}
          type="button"
          onClick={() => markEvidence("valid")}
        >
          Phù hợp
        </button>
        <button
          className={[
            "rounded-full px-3 py-1.5 text-xs font-semibold transition",
            assessment === "ambiguous" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-800 hover:bg-amber-100",
          ].join(" ")}
          type="button"
          onClick={() => markEvidence("ambiguous")}
        >
          Cần xem lại
        </button>
        <button
          className={[
            "rounded-full px-3 py-1.5 text-xs font-semibold transition",
            assessment === "invalid" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100",
          ].join(" ")}
          type="button"
          onClick={() => markEvidence("invalid")}
        >
          Không dùng cho tiêu chí này
        </button>
        <Button size="sm" type="button" variant="outline">So với tiêu chí</Button>
      </div>
    </div>
  );
}

function PreviewFileAttachment({ file }: { file: ReviewTaskEvidenceFile }) {
  const [loadingAction, setLoadingAction] = useState<"preview" | "open" | "download" | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(file.url ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (previewUrl || !file.id) return;
    let active = true;
    reviewApi
      .getSignedFileUrl(file.id)
      .then((response) => {
        if (active && response.data?.url) setPreviewUrl(response.data.url);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [file.id, previewUrl]);

  const runAction = async (action: "preview" | "open" | "download") => {
    setError(null);
    setLoadingAction(action);
    try {
      const response = await reviewApi.getSignedFileUrl(file.id);
      const url = response.data?.url ?? previewUrl;
      if (!url) throw new Error("Không lấy được liên kết tài liệu.");
      setPreviewUrl(url);
      if (action !== "preview") window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể mở tài liệu.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-md border bg-muted/20">
      <div className="flex min-h-[260px] items-center justify-center bg-white">
        {previewUrl && file.mimeType?.startsWith("image/") ? (
          <img alt={file.originalName} className="max-h-[420px] w-full object-contain" src={previewUrl} />
        ) : previewUrl && file.mimeType === "application/pdf" ? (
          <iframe className="h-[420px] w-full" src={previewUrl} title={file.originalName} />
        ) : (
          <div className="p-5 text-center text-sm text-muted-foreground">
            <FileText className="mx-auto mb-2 h-8 w-8" />
            Chưa tải được preview. Cán bộ có thể mở lớn hoặc tải xuống.
          </div>
        )}
      </div>
      <div className="border-t bg-white p-3">
        <div className="truncate text-sm font-semibold text-brand-deep">{file.originalName || fallbackText}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {[file.mimeType, formatFileSize(file.size), formatDateTime(file.uploadedAt ?? file.createdAt)].filter(Boolean).join(" • ")}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" type="button" variant="outline" onClick={() => void runAction("preview")} disabled={Boolean(loadingAction)}>
            <Eye className="h-4 w-4" />
            Xem lớn
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
        {error ? <div className="mt-2 text-xs text-destructive">{error}</div> : null}
      </div>
    </div>
  );
}

function CriterionMetricsSection({
  criterion,
  metrics,
  evidences,
}: {
  criterion: CoreCriterion;
  metrics: ReviewTaskDetail["metrics"];
  evidences: ReviewTaskEvidence[];
}) {
  const hasFiles = evidences.some((evidence) => evidence.files?.length);
  return (
    <section>
      <SectionHeader icon={<ClipboardList className="h-5 w-5" />} title="Dữ liệu đối chiếu" />
      {metrics.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {metrics.map((metric) => (
            <div key={metric.id} className="space-y-2 rounded-md border p-3">
              <InfoRow label="Loại dữ liệu" value={getMetricLabel(metric.metricType)} />
              <InfoRow label="Giá trị" value={`${metric.value ?? fallbackText}${metric.unit ? ` ${metric.unit}` : ""}`} />
              <InfoRow label="Nguồn" value="Sinh viên nhập" />
              <InfoRow label="Tệp xác nhận" value={hasFiles ? "Đã có" : "Chưa có"} />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Sinh viên chưa nhập dữ liệu cho tiêu chí {getCriterionLabel(criterion)}.
        </div>
      )}
    </section>
  );
}

function CriterionChecklistSection({
  targetLevel,
  criterion,
  matrixItem,
  checklist,
  evidences,
  assessmentStatus,
}: {
  targetLevel: ReviewTaskDetail["application"]["targetLevel"];
  criterion: CoreCriterion;
  matrixItem: ReturnType<typeof getCriterionMatrixItem>;
  checklist: NonNullable<ReviewTaskDetail["checklist"]>;
  evidences: ReviewTaskEvidence[];
  assessmentStatus: ReturnType<typeof evaluateCriterionAgainstMatrix>["status"];
}) {
  const currentRules = [...(matrixItem?.hardRequirements ?? []), ...(matrixItem?.additionalRequirements ?? [])];
  const otherLevels = levelOrder.filter((level) => level !== targetLevel);
  return (
    <section>
      <SectionHeader icon={<CheckSquare className="h-5 w-5" />} title={`Checklist ${getLevelLabel(targetLevel)}`} />
      <div className="space-y-2">
        {currentRules.map((rule) => (
          <RuleRow key={rule} label={rule} status={getRuleStatusLabel(assessmentStatus, evidences)} />
        ))}
        {checklist.map((item) => (
          <RuleRow key={item.id} label={item.label || fallbackText} note={item.note ?? undefined} status={item.passed ? "Đạt" : item.passed === false ? "Cần bổ sung" : "Cần cán bộ xác nhận"} />
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {otherLevels.map((level) => {
          const item = getCriterionMatrixItem(level, criterion);
          return (
            <details key={level} className="rounded-md border bg-muted/20 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-brand-deep">
                Xem điều kiện cấp {criteriaLevelSummaries[level].label}
              </summary>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {[...(item?.hardRequirements ?? []), ...(item?.additionalRequirements ?? [])].map((rule) => <li key={rule}>{rule}</li>)}
              </ul>
            </details>
          );
        })}
      </div>
    </section>
  );
}

function RuleRow({ label, status, note }: { label: string; status: string; note?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div>
        <div className="text-sm font-semibold text-brand-deep">{label}</div>
        {note ? <div className="mt-1 text-sm text-muted-foreground">{note}</div> : null}
      </div>
      <Badge variant={status === "Đạt" ? "secondary" : "outline"}>{status}</Badge>
    </div>
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

function getMetricLabel(metricType?: string | null) {
  return metricType ? metricLabels[metricType] ?? metricType : fallbackText;
}

function getIndexingStatusLabel(status: string) {
  const labels: Record<string, string> = {
    not_started: "Chưa kiểm tra",
    uploaded: "Đã tải lên",
    pending_indexing: "Đang kiểm tra",
    ocr_processing: "Đang đọc file",
    extracting: "Đang đọc file",
    checking_registry: "Đang đối chiếu",
    indexed: "Đã kiểm tra xong",
    needs_manual_review: "Cần cán bộ kiểm tra",
    failed: "Cần kiểm tra thêm",
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

function isCoreCriterion(value: unknown): value is CoreCriterion {
  return coreCriteria.some((criterion) => criterion.key === value);
}

function getCriterionMetrics(metrics: ReviewTaskDetail["metrics"], criterion: CoreCriterion) {
  const fields = criterionInputFields[criterion].map((field) => field.metricType);
  return metrics.filter((metric) => metric.criterion === criterion || fields.includes(metric.metricType as never));
}

function getCriterionEvidences(evidences: ReviewTaskEvidence[], criterion: CoreCriterion) {
  return evidences.filter((evidence) => evidence.criterion === criterion);
}

function getPrimaryDataText(metrics: ReviewTaskDetail["metrics"], criterion: CoreCriterion) {
  if (!metrics.length) return "Chưa có dữ liệu";
  const primaryMetric = getPrimaryMetricInput(criterion);
  const metric = primaryMetric
    ? metrics.find((item) => item.metricType === primaryMetric.metricType) ?? metrics[0]
    : metrics[0];
  const value = `${metric.value ?? fallbackText}${metric.unit ? ` ${metric.unit}` : ""}`;
  return `${getMetricLabel(metric.metricType)} ${value}`;
}

function getCriterionTaskStatusLabel(
  task: ReviewTaskDetail,
  criterion: CoreCriterion,
  assessmentLabel: string,
) {
  if (task.criterion === criterion) return getTaskStatusLabel(task.status);
  if (task.permissions && !task.permissions.canAct && !task.permissions.canClaim) return "Chỉ xem";
  return assessmentLabel;
}

function getOfficerPermissionLabel(task: ReviewTaskDetail) {
  if (task.permissions?.canAct) return "Được xử lý";
  if (task.permissions?.canClaim) return "Có thể nhận";
  return "Chỉ xem";
}

function getCriterionStatusVariant(status: ReturnType<typeof evaluateCriterionAgainstMatrix>["status"]) {
  if (status === "met") return "secondary";
  if (status === "not_suitable") return "destructive";
  return "outline";
}

function getRuleStatusLabel(
  status: ReturnType<typeof evaluateCriterionAgainstMatrix>["status"],
  evidences: ReviewTaskEvidence[],
) {
  if (status === "met") return "Đạt";
  if (status === "missing_data") return "Chưa đủ dữ liệu";
  if (evidences.some((evidence) => evidence.files?.length)) return "Cần cán bộ xác nhận";
  return "Cần bổ sung";
}

function getDefaultDocumentName(criterion: CoreCriterion) {
  const labels: Record<CoreCriterion, string> = {
    ethics: "Giấy xác nhận Đạo đức tốt",
    academic: "Bảng điểm hoặc giấy xác nhận học tập",
    physical: "Giấy chứng nhận Sinh viên khỏe",
    volunteer: "Giấy xác nhận hoạt động tình nguyện",
    integration: "Chứng chỉ ngoại ngữ hoặc giấy xác nhận hội nhập",
  };
  return labels[criterion];
}

function getEvidenceDisplayName(evidence: ReviewTaskEvidence) {
  if (evidence.evidenceName) return evidence.evidenceName;
  return isCoreCriterion(evidence.criterion) ? getDefaultDocumentName(evidence.criterion) : "Tài liệu hồ sơ";
}

function getDecisionRelatedEvidences(task: ReviewTaskDetail) {
  return task.evidences.filter((evidence) => evidence.criterion === task.criterion);
}

function getDecisionContext(task: ReviewTaskDetail) {
  const criterion = isCoreCriterion(task.criterion) ? task.criterion : "ethics";
  const relatedMetrics = isCoreCriterion(task.criterion)
    ? getCriterionMetrics(task.metrics, task.criterion)
    : task.metrics;
  const relatedEvidences = getDecisionRelatedEvidences(task);
  return {
    student: `${task.application.student?.fullName || fallbackText} • ${task.application.student?.studentCode || fallbackText}`,
    criterion: getCriterionLabel(task.criterion),
    primaryData: relatedMetrics.length ? getPrimaryDataText(relatedMetrics, criterion) : fallbackText,
    documentCount: relatedEvidences.reduce((sum, evidence) => sum + (evidence.files?.length ?? 0), 0),
  };
}

function isDecisionFormReady(
  action: DetailDecisionAction | null,
  values: {
    suggestedLevel: Level | "";
    note: string;
    reasonTemplate: string;
    supplementItems: string[];
    supplementContent: string;
    supplementDeadline: string;
    resolutionReason: string;
    resolutionSummary: string;
  },
) {
  if (!action) return false;
  if (action === "accepted") return Boolean(values.suggestedLevel);
  if (action === "rejected") return Boolean(values.reasonTemplate) && values.note.trim().length >= 10;
  if (action === "supplement_required") {
    return values.supplementItems.length > 0 && values.supplementContent.trim().length >= 10 && Boolean(values.supplementDeadline);
  }
  return Boolean(values.resolutionReason) && values.resolutionSummary.trim().length >= 10;
}

function buildSupplementNote(selectedItems: string[], content: string) {
  const labels = supplementChecklist
    .filter((item) => selectedItems.includes(item.key))
    .map((item) => item.label)
    .join(", ");
  return `Nội dung cần bổ sung: ${labels}. ${content.trim()}`;
}

function toEvidenceAssessmentsPayload(assessments: Record<string, EvidenceAssessmentValue>) {
  const assessmentLabel: Record<EvidenceAssessmentValue, string> = {
    valid: "Phù hợp",
    ambiguous: "Cần xem lại",
    invalid: "Không dùng cho tiêu chí này",
  };
  const assessmentMap: Record<EvidenceAssessmentValue, "valid" | "ambiguous" | "invalid"> = {
    valid: "valid",
    ambiguous: "ambiguous",
    invalid: "invalid",
  };

  return Object.entries(assessments).map(([evidenceId, assessment]) => ({
    evidenceId,
    assessment: assessmentMap[assessment],
    note: assessmentLabel[assessment],
  }));
}

function getDecisionModalTitle(action: DetailDecisionAction | null) {
  if (action === "accepted") return "Xác nhận đạt tiêu chí";
  if (action === "rejected") return "Xác nhận không đạt";
  if (action === "supplement_required") return "Yêu cầu sinh viên bổ sung";
  if (action === "resolution_needed") return "Chuyển Resolution Hub";
  return "Kết luận xét duyệt";
}

function getDecisionConfirmLabel(action: DetailDecisionAction | null) {
  if (action === "accepted") return "Xác nhận đạt";
  if (action === "rejected") return "Xác nhận không đạt";
  if (action === "supplement_required") return "Gửi yêu cầu bổ sung";
  if (action === "resolution_needed") return "Chuyển Resolution Hub";
  return "Xác nhận";
}

function getDecisionConfirmButtonClass(action: DetailDecisionAction | null) {
  if (action === "accepted") return "bg-emerald-600 text-white hover:bg-emerald-700";
  if (action === "rejected") return "bg-rose-600 text-white hover:bg-rose-700";
  if (action === "supplement_required") return "bg-sky-600 text-white hover:bg-sky-700";
  if (action === "resolution_needed") return "bg-amber-600 text-white hover:bg-amber-700";
  return "";
}

function getDecisionLabel(decision: ReviewDecision) {
  return getTaskStatusLabel(decision);
}
