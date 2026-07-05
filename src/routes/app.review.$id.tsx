import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AuditTimeline } from "@/features/audit/components/AuditTimeline";
import { useAuth } from "@/features/auth/store/auth-store";
import { SmartbotPanel } from "@/features/chatbot/components/SmartbotPanel";
import { CriterionBadge } from "@/features/review/components/CriterionBadge";
import { EmptyReviewState } from "@/features/review/components/EmptyReviewState";
import { LevelBadge } from "@/features/review/components/LevelBadge";
import { RequestSupplementPanel } from "@/features/review/components/RequestSupplementPanel";
import { ReviewDecisionPanel } from "@/features/review/components/ReviewDecisionPanel";
import { ReviewErrorState } from "@/features/review/components/ReviewErrorState";
import { ReviewLoadingState } from "@/features/review/components/ReviewLoadingState";
import { ReviewStatusBadge } from "@/features/review/components/ReviewStatusBadge";
import { reviewApi } from "@/features/review/api/review";
import { useClaimReviewTask, useReviewTask } from "@/features/review/hooks/useReview";
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
  buildEvidenceDisplayModel,
  getFieldLabel,
  getGpaThreshold,
  getMetricValue,
  getVisibleEvidenceFieldEntries,
} from "@/features/review/utils/evidenceDisplay";
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

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
          <div className="space-y-5">
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
              evidences={evidences}
              metrics={metrics}
              task={task}
            />
            <AuditTimeline applicationId={task.application.id} limit={10} taskId={task.id} />
          </div>

          <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
            <ReviewerCopilotPanel task={task} />
            {canDecide ? (
              <ReviewDecisionPanel task={task} onSuccess={() => void refetch()} />
            ) : null}
            {canRequestSupplement ? (
              <RequestSupplementPanel task={task} onSuccess={() => void refetch()} />
            ) : null}
            {!canDecide && !canRequestSupplement ? <ReadOnlyActionPanel task={task} /> : null}
          </div>
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

function ReviewerCopilotPanel({ task }: { task: ReviewTaskDetail }) {
  return (
    <SmartbotPanel
      applicationId={task.application.id}
      contextScope="reviewer_copilot"
      pageContext={{ page: "review_task", taskId: task.id, criterion: task.criterion }}
      compact
      initialPrompt="Mình có thể hỗ trợ tóm tắt minh chứng và soạn dự thảo yêu cầu bổ sung. Cán bộ cần chỉnh sửa/xác nhận trước khi gửi."
      defaultPrompts={[
        "Tóm tắt minh chứng",
        "Minh chứng còn thiếu gì?",
        "Tìm case tương tự",
        "Soạn yêu cầu bổ sung",
        "Chuyển Resolution Hub",
      ]}
    />
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
    <Card>
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
            <Badge
              variant={
                permission?.canAct ? "default" : permission?.canClaim ? "outline" : "secondary"
              }
            >
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
    const assessment = evaluateCriterionAgainstMatrix(targetLevel, criterion.key, {
      metrics,
      evidences,
    });
    const fileCount = relatedEvidences.reduce(
      (count, evidence) => count + (evidence.files?.length ?? 0),
      0,
    );
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
        description={
          "Cán bộ kiểm tra dữ liệu chính và tài liệu theo " +
          getLevelLabel(targetLevel) +
          " trước khi ra quyết định."
        }
      />
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-left text-sm">
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
                className={
                  selectedCriterion === row.criterion.key ? "bg-[#F1F7FD]" : "hover:bg-muted/30"
                }
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
                <td className="px-3 py-3 text-slate-700">
                  {getPrimaryDataText(row.relatedMetrics, row.criterion.key)}
                </td>
                <td className="px-3 py-3">
                  <span className="font-semibold text-brand-deep">{row.fileCount} tệp</span>
                  {row.relatedEvidences.length && !row.fileCount ? (
                    <div className="mt-1 text-xs text-amber-700">
                      Đã có mục ghi nhận, thiếu tệp xác nhận
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <Badge variant={getCriterionStatusVariant(row.assessment.status)}>
                    {getCriterionTaskStatusLabel(
                      task,
                      row.criterion.key,
                      row.assessment.statusLabel,
                    )}
                  </Badge>
                </td>
                <td className="px-3 py-3">{getOfficerPermissionLabel(task)}</td>
                <td className="px-3 py-3 text-slate-700">
                  {getOfficerNextAction(
                    row.assessment.status,
                    row.fileCount,
                    row.relatedMetrics.length,
                  )}
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
      <div className="flex flex-wrap gap-2">
        {coreCriteria.map((criterion) => {
          const assessment = evaluateCriterionAgainstMatrix(
            task.application.targetLevel,
            criterion.key,
            { metrics, evidences },
          );
          const active = selectedCriterion === criterion.key;
          return (
            <button
              key={criterion.key}
              className={[
                "flex min-w-[96px] items-center justify-between gap-2 rounded-full border px-3 py-2 text-sm transition",
                active
                  ? "border-brand-deep bg-brand-deep text-white"
                  : "bg-white text-brand-deep hover:bg-muted/40",
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
}: {
  task: ReviewTaskDetail;
  criterion: CoreCriterion;
  metrics: ReviewTaskDetail["metrics"];
  evidences: ReviewTaskEvidence[];
  checklist: NonNullable<ReviewTaskDetail["checklist"]>;
  decisionHistory: NonNullable<ReviewTaskDetail["decisionHistory"]>;
}) {
  const criterionMeta = coreCriteria.find((item) => item.key === criterion) ?? coreCriteria[0];
  const matrixItem = getCriterionMatrixItem(task.application.targetLevel, criterion);
  const relatedMetrics = getCriterionMetrics(metrics, criterion);
  const relatedEvidences = getCriterionEvidences(evidences, criterion);
  const assessment = evaluateCriterionAgainstMatrix(task.application.targetLevel, criterion, {
    metrics,
    evidences,
  });

  return (
    <Card>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tiêu chí đang xét
            </div>
            <h2 className="mt-1 text-xl font-bold text-brand-deep">{criterionMeta.label}</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              {criterionMeta.description}
            </p>
          </div>
          <Badge variant={getCriterionStatusVariant(assessment.status)}>
            {assessment.statusLabel}
          </Badge>
        </div>

        <CriterionDocumentsSection
          assessmentStatus={assessment.status}
          criterion={criterion}
          evidences={relatedEvidences}
          metrics={relatedMetrics}
          targetLevel={task.application.targetLevel}
        />

        <CriterionMetricsSection
          criterion={criterion}
          evidences={relatedEvidences}
          metrics={relatedMetrics}
        />

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
  targetLevel,
  assessmentStatus,
}: {
  criterion: CoreCriterion;
  evidences: ReviewTaskEvidence[];
  metrics: ReviewTaskDetail["metrics"];
  targetLevel: ReviewTaskDetail["application"]["targetLevel"];
  assessmentStatus: ReturnType<typeof evaluateCriterionAgainstMatrix>["status"];
}) {
  const criterionLabel = getCriterionLabel(criterion);
  const hasFiles = evidences.some((evidence) => evidence.files?.length);

  if (!hasFiles) {
    return (
      <div className="rounded-md border border-dashed bg-muted/20 p-4">
        <div className="text-sm font-semibold text-brand-deep">
          {metrics.length
            ? "Đã có dữ liệu, thiếu tệp xác nhận"
            : `Chưa có tệp xác nhận cho tiêu chí ${criterionLabel}.`}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {metrics.length
            ? `Sinh viên đã nhập ${getPrimaryDataText(metrics, criterion)} nhưng chưa tải chứng chỉ hoặc giấy xác nhận.`
            : "Sinh viên chưa nhập dữ liệu hoặc chưa tải tài liệu cho tiêu chí này."}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button">Yêu cầu bổ sung tệp xác nhận</Button>
          <Badge variant={getCriterionStatusVariant(assessmentStatus)}>
            {metrics.length ? "Thiếu tệp xác nhận" : "Chưa có dữ liệu"}
          </Badge>
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
            key={evidence.id}
            criterion={criterion}
            evidence={evidence}
            metrics={metrics}
            targetLevel={targetLevel}
          />
        ))}
      </div>
    </section>
  );
}

function CriterionEvidenceCard({
  evidence,
  criterion,
  metrics,
  targetLevel,
}: {
  evidence: ReviewTaskEvidence;
  criterion: CoreCriterion;
  metrics: ReviewTaskDetail["metrics"];
  targetLevel: ReviewTaskDetail["application"]["targetLevel"];
}) {
  const model = buildEvidenceDisplayModel(evidence);
  const fields = getVisibleEvidenceFieldEntries(model);
  const warnings = toReadableList(evidence.card?.warningsJson);
  const studentGpa = getMetricValue(metrics, "gpa");
  const gpaThreshold = getGpaThreshold(targetLevel);
  return (
    <div className="rounded-md border p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(260px,420px)_minmax(0,1fr)]">
        <div className="space-y-3">
          {evidence.files?.length ? (
            evidence.files.map((file) => <PreviewFileAttachment key={file.id} file={file} />)
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Mục này chưa có tệp đính kèm.
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-bold text-brand-deep">
              {model.title || getDefaultDocumentName(criterion)}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">{model.sourceLabel}</Badge>
              <Badge variant="secondary">{model.readerLabel}</Badge>
              <CriterionBadge criterion={criterion} />
              <ReviewStatusBadge status={evidence.status} />
              <Badge variant={model.matchLabel.startsWith("Khớp") ? "secondary" : "outline"}>
                {model.matchLabel}
              </Badge>
            </div>
          </div>
          {model.kind === "academic_transcript" ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <InfoRow label="GPA sinh viên nhập" value={formatEvidenceValue(studentGpa)} />
              <InfoRow label="GPA SmartReader đọc" value={formatEvidenceValue(model.gpa)} />
              <InfoRow
                label="Ngưỡng cấp đang xét"
                value={gpaThreshold ? `${gpaThreshold}/4` : undefined}
              />
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <InfoRow label="Sự kiện/thành tích" value={model.eventName} />
              <InfoRow label="Đơn vị cấp/tổ chức" value={model.organizer} />
              <InfoRow label="Cấp tổ chức" value={formatOrganizerLevel(model.organizerLevel)} />
              <InfoRow
                label="Ngày hoạt động"
                value={model.activityDate ? formatDateTime(model.activityDate) : undefined}
              />
              <InfoRow
                label="Ngày cấp"
                value={model.issueDate ? formatDateTime(model.issueDate) : undefined}
              />
              <InfoRow label="Ngày ghi nhận" value={formatDateTime(evidence.createdAt)} />
            </div>
          )}
          {fields.length ? (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Thông tin đọc được từ tài liệu
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {fields.map(([key, value]) => (
                  <InfoRow
                    key={key}
                    label={getFieldLabel(key)}
                    value={formatEvidenceValue(value)}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {warnings.length ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <div className="text-sm font-semibold text-amber-900">Cần kiểm tra thêm</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
                {warnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <Button size="sm" type="button" variant="outline">
            So với tiêu chí
          </Button>
        </div>
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
          <img
            alt={file.originalName}
            className="max-h-[420px] w-full object-contain"
            src={previewUrl}
          />
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
        <div className="truncate text-sm font-semibold text-brand-deep">
          {file.originalName || fallbackText}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {[
            file.mimeType,
            formatFileSize(file.size),
            formatDateTime(file.uploadedAt ?? file.createdAt),
          ]
            .filter(Boolean)
            .join(" • ")}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => void runAction("preview")}
            disabled={Boolean(loadingAction)}
          >
            <Eye className="h-4 w-4" />
            Xem lớn
          </Button>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => void runAction("open")}
            disabled={Boolean(loadingAction)}
          >
            <ExternalLink className="h-4 w-4" />
            Mở tab mới
          </Button>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => void runAction("download")}
            disabled={Boolean(loadingAction)}
          >
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
  const academicModel = evidences
    .map(buildEvidenceDisplayModel)
    .find((model) => model.kind === "academic_transcript");
  return (
    <section>
      <SectionHeader icon={<ClipboardList className="h-5 w-5" />} title="Dữ liệu đối chiếu" />
      {metrics.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {metrics.map((metric) => (
            <div key={metric.id} className="space-y-2 rounded-md border p-3">
              <InfoRow label="Loại dữ liệu" value={getMetricLabel(metric.metricType)} />
              <InfoRow
                label="Giá trị"
                value={`${metric.value ?? fallbackText}${metric.unit ? ` ${metric.unit}` : ""}`}
              />
              {metric.metricType === "gpa" ? (
                <InfoRow
                  label="SmartReader đọc được"
                  value={formatEvidenceValue(academicModel?.gpa)}
                />
              ) : null}
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
  const currentRules = [
    ...(matrixItem?.hardRequirements ?? []),
    ...(matrixItem?.additionalRequirements ?? []),
  ];
  const otherLevels = levelOrder.filter((level) => level !== targetLevel);
  return (
    <section>
      <SectionHeader
        icon={<CheckSquare className="h-5 w-5" />}
        title={`Checklist ${getLevelLabel(targetLevel)}`}
      />
      <div className="space-y-2">
        {currentRules.map((rule) => (
          <RuleRow
            key={rule}
            label={rule}
            status={getRuleStatusLabel(assessmentStatus, evidences)}
          />
        ))}
        {checklist.map((item) => (
          <RuleRow
            key={item.id}
            label={item.label || fallbackText}
            note={item.note ?? undefined}
            status={
              item.passed ? "Đạt" : item.passed === false ? "Cần bổ sung" : "Cần cán bộ xác nhận"
            }
          />
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
                {[...(item?.hardRequirements ?? []), ...(item?.additionalRequirements ?? [])].map(
                  (rule) => (
                    <li key={rule}>{rule}</li>
                  ),
                )}
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

function getMetricLabel(metricType?: string | null) {
  return metricType ? (metricLabels[metricType] ?? metricType) : fallbackText;
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

function formatEvidenceValue(value?: unknown) {
  if (value === null || value === undefined || value === "") return fallbackText;
  if (typeof value === "number")
    return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
  return String(value);
}

function formatOrganizerLevel(value?: unknown) {
  if (!value) return fallbackText;
  if (value === "school" || value === "university" || value === "city" || value === "central") {
    return getLevelLabel(value);
  }
  return String(value);
}

function getCriterionMetrics(metrics: ReviewTaskDetail["metrics"], criterion: CoreCriterion) {
  const fields = criterionInputFields[criterion].map((field) => field.metricType);
  return metrics.filter(
    (metric) => metric.criterion === criterion || fields.includes(metric.metricType as never),
  );
}

function getCriterionEvidences(evidences: ReviewTaskEvidence[], criterion: CoreCriterion) {
  return evidences.filter((evidence) => evidence.criterion === criterion);
}

function getPrimaryDataText(metrics: ReviewTaskDetail["metrics"], criterion: CoreCriterion) {
  if (!metrics.length) return "Chưa có dữ liệu";
  const primaryMetric = getPrimaryMetricInput(criterion);
  const metric = primaryMetric
    ? (metrics.find((item) => item.metricType === primaryMetric.metricType) ?? metrics[0])
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

function getCriterionStatusVariant(
  status: ReturnType<typeof evaluateCriterionAgainstMatrix>["status"],
) {
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

function getDecisionLabel(decision: ReviewDecision) {
  return getTaskStatusLabel(decision);
}
