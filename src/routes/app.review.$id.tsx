import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bot,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Download,
  ExternalLink,
  Eye,
  FileText,
  History,
  ListChecks,
  MessageSquare,
  SlidersHorizontal,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuditTimeline } from "@/features/audit/components/AuditTimeline";
import { useAuth } from "@/features/auth/store/auth-store";
import { SmartbotPanel } from "@/features/chatbot/components/SmartbotPanel";
import { CriterionBadge } from "@/features/review/components/CriterionBadge";
import { EmptyReviewState } from "@/features/review/components/EmptyReviewState";
import { LevelBadge } from "@/features/review/components/LevelBadge";
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
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [technicalDrawerOpen, setTechnicalDrawerOpen] = useState(false);
  const [criteriaOverviewOpen, setCriteriaOverviewOpen] = useState(false);
  const [mobileDecisionOpen, setMobileDecisionOpen] = useState(false);
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
  const canEscalateResolution = hasTaskAction(task, "escalate_resolution");
  const canUseDecisionPanel = canDecide || canRequestSupplement || canEscalateResolution;
  const canViewTechnicalLog =
    role === "manager" ||
    role === "committee" ||
    role === "admin" ||
    Boolean(task.permissions?.canView);
  const activeCriterion = selectedCriterion;

  return (
    <>
      <TopBar
        title={student.fullName || "Chi tiết hồ sơ xét duyệt"}
        subtitle={`${student.studentCode || fallbackText} • ${getCriterionLabel(task.criterion)}`}
        action={<BackToQueueButton />}
      />

      <div className="-mx-4 bg-[#F7F9FC] px-4 pb-8 pt-1 md:-mx-6 md:px-6">
        <div className="space-y-4">
          <ApplicationReviewHeader facultyClass={facultyClass} task={task} />

          <CriteriaStatusStrip
            evidences={evidences}
            metrics={metrics}
            selectedCriterion={activeCriterion}
            task={task}
            onOpenOverview={() => setCriteriaOverviewOpen(true)}
            onSelectCriterion={setSelectedCriterion}
          />

          <PermissionSummary
            isClaiming={claimTask.isPending}
            task={task}
            onClaim={() => setClaimDialogOpen(true)}
          />

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
            <div className="min-w-0 space-y-4">
              <ReviewWorkspaceTabs
                checklist={checklist}
                criterion={activeCriterion}
                evidences={evidences}
                metrics={metrics}
                task={task}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-muted-foreground">
                <span>
                  Audit log và lịch sử kỹ thuật không hiển thị trong luồng xét duyệt chính.
                </span>
                {canViewTechnicalLog ? (
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => setTechnicalDrawerOpen(true)}
                  >
                    <History className="h-4 w-4" />
                    Xem nhật ký kỹ thuật
                  </Button>
                ) : null}
              </div>
            </div>

            <aside className="hidden xl:block xl:sticky xl:top-6 xl:max-h-[calc(100vh-96px)] xl:self-start">
              <div className="flex max-h-[calc(100vh-96px)] flex-col gap-3">
                <Button
                  className="w-full justify-center"
                  type="button"
                  variant="outline"
                  onClick={() => setAiDrawerOpen(true)}
                >
                  <Bot className="h-4 w-4" />
                  Hỏi trợ lý AI
                </Button>
                {canUseDecisionPanel ? (
                  <ReviewDecisionPanel task={task} onSuccess={() => void refetch()} />
                ) : (
                  <ReadOnlyActionPanel task={task} />
                )}
              </div>
            </aside>
          </section>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur xl:hidden">
        <div className="mx-auto flex max-w-2xl gap-2">
          <Button className="flex-1" type="button" onClick={() => setMobileDecisionOpen(true)}>
            <CheckSquare className="h-4 w-4" />
            Ra quyết định
          </Button>
          <Button type="button" variant="outline" onClick={() => setAiDrawerOpen(true)}>
            <MessageSquare className="h-4 w-4" />
            AI
          </Button>
        </div>
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
      <CriteriaOverviewDialog
        evidences={evidences}
        metrics={metrics}
        open={criteriaOverviewOpen}
        selectedCriterion={activeCriterion}
        task={task}
        onOpenChange={setCriteriaOverviewOpen}
        onSelectCriterion={setSelectedCriterion}
      />
      <AiAssistantDrawer open={aiDrawerOpen} task={task} onOpenChange={setAiDrawerOpen} />
      <TechnicalAuditDrawer
        decisionHistory={decisionHistory}
        open={technicalDrawerOpen}
        task={task}
        onOpenChange={setTechnicalDrawerOpen}
      />
      <Sheet open={mobileDecisionOpen} onOpenChange={setMobileDecisionOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto p-4">
          <SheetHeader className="mb-3 text-left">
            <SheetTitle>Ra quyết định</SheetTitle>
            <SheetDescription>
              Cán bộ kiểm tra minh chứng và xác nhận kết luận cuối cùng cho tiêu chí.
            </SheetDescription>
          </SheetHeader>
          {canUseDecisionPanel ? (
            <ReviewDecisionPanel
              task={task}
              onSuccess={() => {
                setMobileDecisionOpen(false);
                void refetch();
              }}
            />
          ) : (
            <ReadOnlyActionPanel task={task} />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function AiAssistantDrawer({
  open,
  task,
  onOpenChange,
}: {
  open: boolean;
  task: ReviewTaskDetail;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-4 sm:max-w-2xl">
        <SheetHeader className="mb-4">
          <SheetTitle>Trợ lý AI</SheetTitle>
          <SheetDescription>
            AI chỉ tạo gợi ý nháp. Cán bộ cần kiểm tra và xác nhận trước khi gửi.
          </SheetDescription>
        </SheetHeader>
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
          ]}
        />
      </SheetContent>
    </Sheet>
  );
}

function BackToQueueButton() {
  return (
    <Button asChild variant="outline">
      <Link to="/app/queue">Quay lại hàng đợi</Link>
    </Button>
  );
}

function ApplicationReviewHeader({
  facultyClass,
  task,
}: {
  facultyClass: string;
  task: ReviewTaskDetail;
}) {
  const student = task.application.student;
  return (
    <Card className="border border-[#E5E7EB] bg-white py-4 shadow-none">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-normal text-brand-deep">
            {student.fullName || fallbackText}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold text-slate-700">
              {student.studentCode || fallbackText}
            </span>
            <span>{facultyClass}</span>
            <span>{task.application.schoolYear || fallbackText}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <LevelBadge level={task.application.targetLevel} />
          <CriterionBadge criterion={task.criterion} />
          <ReviewStatusBadge status={task.status} />
          <ReviewStatusBadge status={task.application.status} />
        </div>
      </div>
    </Card>
  );
}

function CriteriaStatusStrip({
  task,
  metrics,
  evidences,
  selectedCriterion,
  onSelectCriterion,
  onOpenOverview,
}: {
  task: ReviewTaskDetail;
  metrics: ReviewTaskDetail["metrics"];
  evidences: ReviewTaskEvidence[];
  selectedCriterion: CoreCriterion;
  onSelectCriterion: (criterion: CoreCriterion) => void;
  onOpenOverview: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {coreCriteria.map((criterion) => {
            const assessment = evaluateCriterionAgainstMatrix(
              task.application.targetLevel,
              criterion.key,
              { metrics, evidences },
            );
            const active = selectedCriterion === criterion.key;
            const relatedEvidences = getCriterionEvidences(evidences, criterion.key);
            return (
              <button
                key={criterion.key}
                className={[
                  "min-h-16 rounded-xl border px-3 py-2 text-left transition-colors",
                  active
                    ? "border-[#0057C2] bg-[#F1F7FD] shadow-[inset_0_0_0_1px_rgba(0,87,194,0.14)]"
                    : "border-[#E5E7EB] bg-white hover:bg-slate-50",
                ].join(" ")}
                type="button"
                onClick={() => onSelectCriterion(criterion.key)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold text-brand-deep">
                    {criterion.label}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {relatedEvidences.length}
                  </span>
                </div>
                <div
                  className={
                    active
                      ? "mt-1 text-xs font-semibold text-[#0057C2]"
                      : "mt-1 text-xs text-muted-foreground"
                  }
                >
                  {getCriterionTaskStatusLabel(task, criterion.key, assessment.statusLabel)}
                </div>
              </button>
            );
          })}
        </div>
        <Button
          className="shrink-0"
          size="sm"
          type="button"
          variant="outline"
          onClick={onOpenOverview}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Xem tổng quan
        </Button>
      </div>
    </div>
  );
}

function ReviewWorkspaceTabs({
  task,
  criterion,
  metrics,
  evidences,
  checklist,
}: {
  task: ReviewTaskDetail;
  criterion: CoreCriterion;
  metrics: ReviewTaskDetail["metrics"];
  evidences: ReviewTaskEvidence[];
  checklist: NonNullable<ReviewTaskDetail["checklist"]>;
}) {
  const matrixItem = getCriterionMatrixItem(task.application.targetLevel, criterion);
  const relatedMetrics = getCriterionMetrics(metrics, criterion);
  const relatedEvidences = getCriterionEvidences(evidences, criterion);
  const assessment = evaluateCriterionAgainstMatrix(task.application.targetLevel, criterion, {
    metrics,
    evidences,
  });

  return (
    <Card className="border border-[#E5E7EB] bg-white shadow-none">
      <Tabs defaultValue="evidence">
        <div className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tiêu chí đang xét
            </div>
            <h2 className="mt-1 text-xl font-bold text-brand-deep">
              {getCriterionLabel(criterion)}
            </h2>
          </div>
          <TabsList className="h-10 w-full justify-start overflow-x-auto rounded-xl bg-[#F1F5F9] lg:w-auto">
            <TabsTrigger value="evidence">Minh chứng</TabsTrigger>
            <TabsTrigger value="conditions">Điều kiện xét</TabsTrigger>
            <TabsTrigger value="reference">Đối chiếu</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="evidence" className="mt-5">
          <CriterionDocumentsSection
            assessmentStatus={assessment.status}
            criterion={criterion}
            evidences={relatedEvidences}
            metrics={relatedMetrics}
            targetLevel={task.application.targetLevel}
          />
        </TabsContent>
        <TabsContent value="conditions" className="mt-5">
          <CriterionChecklistSection
            assessmentStatus={assessment.status}
            checklist={task.criterion === criterion ? checklist : []}
            criterion={criterion}
            evidences={relatedEvidences}
            matrixItem={matrixItem}
            targetLevel={task.application.targetLevel}
          />
        </TabsContent>
        <TabsContent value="reference" className="mt-5">
          <ReferenceDataTab
            criterion={criterion}
            evidences={relatedEvidences}
            metrics={relatedMetrics}
          />
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function CriteriaOverviewDialog({
  open,
  task,
  metrics,
  evidences,
  selectedCriterion,
  onOpenChange,
  onSelectCriterion,
}: {
  open: boolean;
  task: ReviewTaskDetail;
  metrics: ReviewTaskDetail["metrics"];
  evidences: ReviewTaskEvidence[];
  selectedCriterion: CoreCriterion;
  onOpenChange: (open: boolean) => void;
  onSelectCriterion: (criterion: CoreCriterion) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tổng quan 5 tiêu chí</DialogTitle>
          <DialogDescription>
            Bảng tổng quan chỉ mở khi cần đối chiếu toàn bộ hồ sơ.
          </DialogDescription>
        </DialogHeader>
        <CriteriaOverviewSection
          evidences={evidences}
          metrics={metrics}
          selectedCriterion={selectedCriterion}
          task={task}
          onSelectCriterion={(criterion) => {
            onSelectCriterion(criterion);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function TechnicalAuditDrawer({
  open,
  task,
  decisionHistory,
  onOpenChange,
}: {
  open: boolean;
  task: ReviewTaskDetail;
  decisionHistory: NonNullable<ReviewTaskDetail["decisionHistory"]>;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-4 sm:max-w-2xl">
        <SheetHeader className="mb-4">
          <SheetTitle>Nhật ký kỹ thuật</SheetTitle>
          <SheetDescription>
            Dành cho kiểm tra quyền, audit và lịch sử xử lý. Dữ liệu này không nằm trong luồng xét
            duyệt chính.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4">
          <DecisionHistorySection history={decisionHistory} />
          <AuditTimeline applicationId={task.application.id} limit={10} taskId={task.id} />
        </div>
      </SheetContent>
    </Sheet>
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
  const [filter, setFilter] = useState<"all" | "review" | "complete" | "missing">("all");
  const filteredEvidences = evidences.filter((evidence) => {
    if (filter === "review") return evidenceNeedsOfficerReview(evidence);
    if (filter === "complete")
      return evidence.status === "accepted" || evidence.indexingStatus === "indexed";
    if (filter === "missing")
      return !evidence.files?.length || evidence.status === "needs_supplement";
    return true;
  });

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
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <SectionHeader
          icon={<FileText className="h-5 w-5" />}
          title="Minh chứng"
          description="Preview tài liệu được ưu tiên để cán bộ đối chiếu trước khi ra quyết định."
        />
        <div className="flex flex-wrap gap-2">
          {[
            ["all", "Tất cả"],
            ["review", "Cần kiểm tra"],
            ["complete", "Đã đủ"],
            ["missing", "Thiếu dữ liệu"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === value
                  ? "border-[#0057C2] bg-[#EAF3FF] text-[#0057C2]"
                  : "border-[#E5E7EB] bg-white text-slate-600 hover:bg-slate-50",
              ].join(" ")}
              type="button"
              onClick={() => setFilter(value as typeof filter)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        {filteredEvidences.map((evidence) => (
          <CriterionEvidenceCard
            key={evidence.id}
            criterion={criterion}
            evidence={evidence}
            metrics={metrics}
            targetLevel={targetLevel}
          />
        ))}
        {!filteredEvidences.length ? (
          <div className="rounded-xl border border-dashed bg-slate-50 p-4 text-sm text-muted-foreground">
            Không có minh chứng phù hợp với bộ lọc này.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function evidenceNeedsOfficerReview(evidence: ReviewTaskEvidence) {
  return (
    evidence.status === "under_review" ||
    evidence.status === "needs_supplement" ||
    evidence.indexingStatus === "needs_manual_review" ||
    toReadableList(evidence.card?.warningsJson).length > 0 ||
    !evidence.files?.length
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
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-none">
      <div className="grid gap-4 lg:grid-cols-[minmax(360px,1.25fr)_minmax(320px,0.9fr)]">
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
            <h3 className="line-clamp-2 text-base font-bold text-brand-deep">
              {model.title || getDefaultDocumentName(criterion)}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">{model.sourceLabel}</Badge>
              <Badge variant={evidenceNeedsOfficerReview(evidence) ? "outline" : "secondary"}>
                {evidenceNeedsOfficerReview(evidence) ? "Cần cán bộ kiểm tra" : "Đã đủ dữ liệu"}
              </Badge>
              <CriterionBadge criterion={criterion} />
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
          <div className="rounded-xl border border-[#E5E7EB] bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <span className="font-semibold">Đối chiếu nhanh: </span>
            {model.matchLabel || model.readerLabel}
          </div>
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

function ReferenceDataTab({
  criterion,
  metrics,
  evidences,
}: {
  criterion: CoreCriterion;
  metrics: ReviewTaskDetail["metrics"];
  evidences: ReviewTaskEvidence[];
}) {
  return (
    <div className="space-y-4">
      <CriterionMetricsSection criterion={criterion} evidences={evidences} metrics={metrics} />
      <details className="rounded-xl border border-[#E5E7EB] bg-white p-4">
        <summary className="cursor-pointer text-sm font-bold text-brand-deep">
          Kết quả OCR/AI đã xử lý
        </summary>
        <div className="mt-3 space-y-3 text-sm text-muted-foreground">
          {evidences.some((evidence) => evidence.card?.aiSummary || evidence.card?.ocrText) ? (
            evidences.map((evidence) => (
              <div key={evidence.id} className="rounded-lg border bg-slate-50 p-3">
                <div className="font-semibold text-slate-800">
                  {evidence.evidenceName || getDefaultDocumentName(criterion)}
                </div>
                <p className="mt-2 whitespace-pre-wrap">
                  {evidence.card?.aiSummary ||
                    evidence.card?.ocrText ||
                    "Chưa có dữ liệu đã xử lý."}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed bg-slate-50 p-3">
              Chưa có dữ liệu OCR/AI đã xử lý.
            </div>
          )}
        </div>
      </details>
      <details className="rounded-xl border border-[#E5E7EB] bg-white p-4">
        <summary className="cursor-pointer text-sm font-bold text-brand-deep">
          Event Registry match
        </summary>
        <div className="mt-3 space-y-3 text-sm text-muted-foreground">
          {evidences.map((evidence) => {
            const match = evidence.card?.matchingStatus;
            return (
              <div key={evidence.id} className="rounded-lg border bg-slate-50 p-3">
                <div className="font-semibold text-slate-800">
                  {evidence.evidenceName || getDefaultDocumentName(criterion)}
                </div>
                <div className="mt-2">
                  {match?.matchedEventName ||
                    evidence.event?.eventName ||
                    match?.message ||
                    "Chưa khớp danh sách chính thức."}
                </div>
              </div>
            );
          })}
        </div>
      </details>
      <details className="rounded-xl border border-[#E5E7EB] bg-white p-4">
        <summary className="cursor-pointer text-sm font-bold text-brand-deep">
          Case tương tự từ Knowledge Base
        </summary>
        <div className="mt-3 rounded-lg border border-dashed bg-slate-50 p-3 text-sm text-muted-foreground">
          Dữ liệu case tương tự sẽ hiển thị ở đây khi backend trả về kết quả đã xử lý.
        </div>
      </details>
      <details className="rounded-xl border border-[#E5E7EB] bg-white p-4">
        <summary className="cursor-pointer text-sm font-bold text-brand-deep">Gợi ý AI</summary>
        <div className="mt-3 rounded-lg border border-dashed bg-slate-50 p-3 text-sm text-muted-foreground">
          Dùng nút “Hỏi trợ lý AI” để tạo gợi ý nháp. Cán bộ vẫn là người xác nhận quyết định cuối
          cùng.
        </div>
      </details>
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
  const missing =
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "string" && value === fallbackText);
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={
          missing
            ? "mt-1 text-sm font-medium text-slate-400"
            : "mt-1 text-sm font-semibold text-brand-deep"
        }
      >
        {missing ? fallbackText : value}
      </div>
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
