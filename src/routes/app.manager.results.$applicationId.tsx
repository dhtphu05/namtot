import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  ExternalLink,
  FileText,
  History,
  Loader2,
  SearchCheck,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import {
  useManagerResultDetail,
  useReopenFinalApplication,
} from "@/features/manager/hooks/useManager";
import type {
  ManagerResultDetail,
  ManagerResultEvidence,
  ManagerResultItem,
} from "@/features/manager/types";
import { useSignedFileUrl } from "@/features/review/hooks/useReview";
import type { Criterion, Level, Role } from "@/features/review/types";
import type { FinalStatus } from "@/lib/api/types";
import { fallbackStatusLabel, getStatusTone, getWorkflowStatusLabel } from "@/lib/status-labels";

export const Route = createFileRoute("/app/manager/results/$applicationId")({
  validateSearch: (search) => ({
    focus: typeof search.focus === "string" ? search.focus : undefined,
    resolutionCaseId:
      typeof search.resolutionCaseId === "string" ? search.resolutionCaseId : undefined,
  }),
  component: ManagerResultDetailRoute,
});

const finalizerRoles: Role[] = ["manager", "committee", "city_manager", "city_committee", "admin"];
const cityFinalizerRoles: Role[] = ["city_manager", "city_committee", "admin"];
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
  const inboxFocus = Route.useSearch();
  const user = useAuth((state) => state.user);
  const role = user?.role as Role | undefined;
  const detailQuery = useManagerResultDetail(applicationId);
  const [finalizing, setFinalizing] = useState(false);
  const [reopening, setReopening] = useState(false);

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
        <TopBar
          title="Kết quả hồ sơ"
          subtitle="Không thể tải chi tiết hồ sơ."
          action={<BackButton />}
        />
        <Card>
          <div className="py-10 text-center">
            <div className="font-semibold text-rose-600">
              {detailQuery.error instanceof Error
                ? detailQuery.error.message
                : "Không tìm thấy hồ sơ."}
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
  const isIndividualCityApplication =
    detail.application.applicationType === "individual" &&
    detail.application.targetLevel === "city";
  const canFinalize = role
    ? (isIndividualCityApplication ? cityFinalizerRoles : finalizerRoles).includes(role)
    : false;
  const selectedItem = toFinalizationItem(detail);
  const suggestedLevel = getSuggestedLevel(detail);
  const processedCount = detail.reviewTasks.filter((task) =>
    ["accepted", "rejected", "supplement_required", "resolution_needed"].includes(task.status),
  ).length;
  const openResolutionCount = detail.resolutionCases.filter(
    (item) => item.status === "open" || item.status === "in_review",
  ).length;
  const supplementCount = detail.reviewTasks.filter(
    (task) => task.status === "supplement_required",
  ).length;

  return (
    <>
      <TopBar
        title="Chi tiết kết quả hồ sơ"
        subtitle={`${detail.student?.fullName ?? "Chưa có dữ liệu"} - ${detail.student?.studentCode ?? "--"}`}
        action={<BackButton />}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <InboxFocusBanner
            focus={inboxFocus.focus}
            resolutionCaseId={inboxFocus.resolutionCaseId}
          />
          <HeaderCard detail={detail} />
          <AnalysisSection detail={detail} />
          <CriterionDecisionBoard detail={detail} />
          <ResolutionSection detail={detail} />
          <AuditSection detail={detail} />
        </div>

        <aside className="space-y-5 xl:sticky xl:top-4 xl:self-start">
          <DecisionPanel
            detail={detail}
            canFinalize={canFinalize}
            processedCount={processedCount}
            openResolutionCount={openResolutionCount}
            supplementCount={supplementCount}
            suggestedLevel={suggestedLevel}
            onFinalize={() => setFinalizing(true)}
            onReopen={() => setReopening(true)}
          />
        </aside>
      </div>

      <FinalizationDialog
        item={selectedItem}
        open={finalizing}
        onOpenChange={(open) => setFinalizing(open)}
      />
      <ReopenFinalDialog
        applicationId={detail.application.id}
        open={reopening}
        onOpenChange={setReopening}
      />
    </>
  );
}

function InboxFocusBanner({
  focus,
  resolutionCaseId,
}: {
  focus?: string;
  resolutionCaseId?: string;
}) {
  if (!focus) return null;
  const content = getInboxFocusContent(focus);
  return (
    <Card className="border-[#BBD7FF] bg-[#F4F9FF]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-bold text-brand-deep">{content.title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{content.desc}</div>
        </div>
        {focus === "needs_resolution" && resolutionCaseId ? (
          <Button asChild>
            <Link to="/app/resolution/$id" params={{ id: resolutionCaseId }}>
              Mở Resolution Case
            </Link>
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function getInboxFocusContent(focus: string) {
  if (focus === "ready_to_finalize") {
    return {
      title: "Hồ sơ đủ điều kiện chốt",
      desc: "Kiểm tra Decision Panel bên phải và chốt theo đề xuất mới nhất.",
    };
  }
  if (focus === "downgraded") {
    return {
      title: "Hồ sơ bị hạ cấp",
      desc: "Ưu tiên xem phần phân tích cascade và lý do blocker trước khi chốt.",
    };
  }
  if (focus === "no_eligible_level") {
    return {
      title: "Không đạt cấp nào",
      desc: "Xem blocker chính và chốt chưa đạt nếu dữ liệu đã đầy đủ.",
    };
  }
  if (focus === "needs_resolution") {
    return {
      title: "Còn case hội ý đang mở",
      desc: "Cần xử lý Resolution Case trước khi chốt kết quả cuối.",
    };
  }
  if (focus === "supplement_required") {
    return {
      title: "Đang cần bổ sung",
      desc: "Kiểm tra tiêu chí cần bổ sung và trạng thái minh chứng của sinh viên.",
    };
  }
  if (focus === "overdue") {
    return {
      title: "Việc xử lý quá hạn",
      desc: "Ưu tiên kiểm tra task/case lâu chưa cập nhật và nhắc bên phụ trách.",
    };
  }
  return {
    title: "Mở từ hàng chờ chốt kết quả",
    desc: "Hồ sơ này được mở theo bucket công việc của Hội đồng/Cấp quản lý.",
  };
}

function ReopenFinalDialog({
  applicationId,
  onOpenChange,
  open,
}: {
  applicationId: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const reopenMutation = useReopenFinalApplication();
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"under_review" | "supplement_required">("under_review");

  const submit = () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    reopenMutation.mutate(
      {
        applicationId,
        payload: { reason: trimmed, status },
      },
      {
        onSuccess: () => {
          setReason("");
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setReason("");
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mở lại kết quả đã chốt</DialogTitle>
          <DialogDescription>
            Ket qua cu se duoc xoa final status/final level va ghi audit voi ly do mo lai.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-brand-deep">
              Trang thai sau khi mo lai
            </span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as "under_review" | "supplement_required")
              }
              className="w-full rounded-lg border border-[#DCE7F2] px-3 py-2"
            >
              <option value="under_review">Đang xét duyệt</option>
              <option value="supplement_required">Cần bổ sung</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-brand-deep">Lý do</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-24 w-full rounded-lg border border-[#DCE7F2] px-3 py-2 outline-none focus:ring-2 focus:ring-[#0057C2]/20"
              placeholder="Nhập lý do mở lại kết quả..."
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button disabled={!reason.trim() || reopenMutation.isPending} onClick={submit}>
              {reopenMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Xác nhận mở lại
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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

function DecisionPanel({
  canFinalize,
  detail,
  onFinalize,
  onReopen,
  openResolutionCount,
  processedCount,
  suggestedLevel,
  supplementCount,
}: {
  canFinalize: boolean;
  detail: ManagerResultDetail;
  onFinalize: () => void;
  onReopen: () => void;
  openResolutionCount: number;
  processedCount: number;
  suggestedLevel: Level | null;
  supplementCount: number;
}) {
  const isFinalized = Boolean(detail.application.finalizedAt);
  const blockerMessages = detail.aggregation.blockingIssues.map(
    (issue) => `${issue.criterion ? `${criterionLabel[issue.criterion]}: ` : ""}${issue.message}`,
  );
  const businessReady = detail.aggregation.canFinalize && blockerMessages.length === 0;
  const canSubmitFinal = canFinalize && businessReady;

  if (isFinalized) {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-1 h-5 w-5 text-emerald-600" />
          <div>
            <h2 className="font-bold text-brand-deep">Kết quả đã chốt</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Hồ sơ đã có kết quả cuối cùng. Chỉ mở lại khi có căn cứ nghiệp vụ cần xét lại.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <Info label="Kết quả cuối" value={getFinalResultLabel(detail)} />
          <Info
            label="Cấp đạt"
            value={getLevelLabel(detail.application.finalLevel, "Không có cấp đạt")}
          />
          <Info label="Thời gian chốt" value={formatDate(detail.application.finalizedAt)} />
          <Info label="Người chốt" value={detail.application.finalizedBy?.fullName ?? "--"} />
        </div>

        {detail.application.finalNote ? (
          <div className="mt-4 rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Ghi chú hội đồng
            </div>
            <p className="mt-1 whitespace-pre-wrap">{detail.application.finalNote}</p>
          </div>
        ) : null}

        {canFinalize ? (
          <Button
            className="mt-5 w-full"
            variant="outline"
            onClick={onReopen}
            title="Mở lại kết quả đã chốt"
          >
            Mở lại kết quả
          </Button>
        ) : null}
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-1 h-5 w-5 text-[#0057C2]" />
        <div>
          <h2 className="font-bold text-brand-deep">Tổng hợp quyết định</h2>
          <p className="mt-2 text-sm text-muted-foreground">{detail.aggregation.reason}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <Info label="Aim đăng ký" value={getLevelLabel(detail.application.targetLevel)} />
        <Info label="Cấp đạt đề xuất" value={getSuggestedLevelLabel(detail)} />
        <Info
          label="Gợi ý hệ thống"
          value={getPendingFinalResultLabel(
            detail.aggregation.suggestedFinalStatus,
            suggestedLevel,
          )}
        />
        <Info label="Điều kiện nghiệp vụ" value={businessReady ? "Đủ để chốt" : "Chưa đủ"} />
        <Info label="Quyền chốt của tài khoản" value={canFinalize ? "Có" : "Không"} />
      </div>
      <div className="mt-4 space-y-2 rounded-lg border bg-slate-50 p-3 text-sm">
        <DecisionCheck
          ok={processedCount >= 5}
          label={`${Math.min(processedCount, 5)}/5 tiêu chí đã xử lý`}
        />
        <DecisionCheck ok={openResolutionCount === 0} label="Không còn hội ý đang mở" />
        <DecisionCheck ok={supplementCount === 0} label="Không còn yêu cầu bổ sung" />
      </div>
      {blockerMessages.length ? (
        <div className="mt-4 space-y-2">
          {blockerMessages.map((message, index) => (
            <div
              key={`${message}-${index}`}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
              {message}
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-5">
        {canFinalize ? (
          <Button
            className="w-full"
            disabled={!canSubmitFinal}
            onClick={onFinalize}
            data-smartux-tag="manager_confirm_final_result"
          >
            <CheckCircle2 className="h-4 w-4" />
            Chọn kết quả chốt
          </Button>
        ) : (
          <div className="rounded-lg border bg-slate-50 px-3 py-2 text-sm text-muted-foreground">
            Cán bộ duyệt từng tiêu chí. Hội đồng/Cấp quản lý theo dõi, điều phối và chốt kết quả
            cuối.
          </div>
        )}
      </div>
    </Card>
  );
}

function HeaderCard({ detail }: { detail: ManagerResultDetail }) {
  const [imageFailed, setImageFailed] = useState(false);
  const rawPhotoUrl = getStudentPhotoUrl(detail);
  const resolvedPhotoUrl = useResolvedAvatarUrl(rawPhotoUrl);
  const photoUrl = imageFailed ? null : resolvedPhotoUrl;
  const isLegacyCentral = detail.application.targetLevel === "central";
  const hasFinalLevel = Boolean(detail.application.finalizedAt && detail.application.finalLevel);

  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="h-20 w-20 flex-none overflow-hidden rounded-2xl border bg-slate-100">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={detail.student?.fullName ?? "Ảnh hồ sơ"}
                className="h-full w-full object-cover"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-bold text-brand-deep">
                {getInitials(detail.student?.fullName ?? "")}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold text-brand-deep">
              {detail.student?.fullName ?? "Chưa có dữ liệu"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {detail.student?.studentCode ?? "--"} • {detail.student?.className ?? "--"} •{" "}
              {detail.student?.faculty ?? "--"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip tone="brand">Hồ sơ {detail.application.schoolYear}</Chip>
              <Chip tone={statusTone(detail.application.status)}>
                {label(detail.application.status)}
              </Chip>
              <Chip tone="brand">{getLevelLabel(detail.application.targetLevel)}</Chip>
              {hasFinalLevel ? (
                <Chip tone="success">Đã chốt {getLevelLabel(detail.application.finalLevel)}</Chip>
              ) : null}
              {!photoUrl ? <Chip tone="muted">Chưa có ảnh hồ sơ</Chip> : null}
              {isLegacyCentral ? (
                <Chip tone="warning">Ngoài phạm vi flow chính hiện tại</Chip>
              ) : null}
            </div>
          </div>
        </div>
        <Chip tone={detail.application.finalizedAt ? "success" : "warning"}>
          {detail.application.finalizedAt ? "Đã chốt" : "Chưa chốt"}
        </Chip>
      </div>
    </Card>
  );
}

function DecisionConsole({ detail }: { detail: ManagerResultDetail }) {
  const suggestedLevel =
    detail.latestCascade?.suggestedLevel ?? detail.aggregation.suggestedFinalLevel ?? null;
  const canFinalize = detail.aggregation.canFinalize;
  const blocker = detail.aggregation.blockingIssues[0]?.message ?? "Không có blocker chính.";
  const finalText = getPendingFinalResultLabel(
    detail.aggregation.suggestedFinalStatus,
    suggestedLevel,
  );

  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-bold text-brand-deep">Decision Console</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tóm tắt quyết định để hội đồng kiểm tra trước khi chốt kết quả.
          </p>
        </div>
        <Chip tone={canFinalize ? "success" : "warning"}>
          {canFinalize ? "Đủ điều kiện nghiệp vụ" : "Chưa đủ điều kiện"}
        </Chip>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Info label="Aim đăng ký" value={level(detail.application.targetLevel)} />
        <Info label="Đề xuất cấp đạt" value={level(suggestedLevel)} />
        <Info label="Gợi ý hệ thống" value={finalText} />
        <Info label="Readiness" value={`${detail.application.readinessScore}%`} />
      </div>
      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <span className="font-semibold">Blocker chính: </span>
        {blocker}
      </div>
    </Card>
  );
}

function CriterionDecisionBoard({ detail }: { detail: ManagerResultDetail }) {
  const [selectedEvidence, setSelectedEvidence] = useState<ManagerResultEvidence | null>(null);

  return (
    <>
      <Card>
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-bold text-brand-deep">5 tiêu chí xét duyệt</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mỗi tiêu chí gom task, minh chứng, ghi chú cán bộ và blocker vào một dòng để hội đồng
              ra quyết định nhanh.
            </p>
          </div>
          <Chip tone={detail.aggregation.canFinalize ? "success" : "warning"}>
            {detail.aggregation.canFinalize ? "Đủ điều kiện nghiệp vụ" : "Chưa đủ điều kiện"}
          </Chip>
        </div>

        <div className="mt-4 divide-y rounded-lg border">
          {criterionOrder.map((criterion) => {
            const summary = detail.criterionSummary[criterion];
            const task = detail.reviewTasks.find((candidate) => candidate.criterion === criterion);
            const evidences = detail.applicationEvidences.filter(
              (evidence) => evidence.criterion === criterion,
            );
            const note = getBusinessNote(task?.decisionReason, task?.officerNote, summary?.summary);

            return (
              <details key={criterion} className="group">
                <summary className="flex cursor-pointer list-none flex-col gap-3 px-4 py-3 hover:bg-slate-50 lg:flex-row lg:items-center">
                  <div className="min-w-48 flex-1">
                    <div className="font-semibold text-brand-deep">{criterionLabel[criterion]}</div>
                    <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{note}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone={statusTone(summary?.status)}>{label(summary?.status)}</Chip>
                    <Chip tone="brand">{evidences.length} minh chứng</Chip>
                    <span className="max-w-40 truncate text-xs font-medium text-muted-foreground">
                      {task?.assignedOfficer?.fullName ?? "Chưa phân công"}
                    </span>
                    <span className="rounded-md border px-2 py-1 text-xs font-semibold text-brand-deep group-open:bg-slate-100">
                      Xem chi tiết
                    </span>
                  </div>
                </summary>

                <div className="border-t bg-slate-50/70 p-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <Info label="Trạng thái cuối" value={label(summary?.status)} />
                    <Info label="Cấp tối đa" value={level(summary?.officerSuggestedLevel)} />
                    <Info label="Cán bộ xử lý" value={task?.assignedOfficer?.fullName ?? "--"} />
                    <Info label="Task review" value={task ? task.id.slice(0, 8) : "--"} />
                  </div>

                  <div className="mt-3 rounded-lg border bg-white px-3 py-2 text-sm">
                    <span className="font-semibold text-brand-deep">Ghi chú/blocker: </span>
                    <span className="text-muted-foreground">{note}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {task ? (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/app/review/$id" params={{ id: task.id }}>
                          Mở task review
                        </Link>
                      </Button>
                    ) : null}
                    {detail.resolutionCases
                      .filter(
                        (item) =>
                          item.evidenceId &&
                          evidences.some((evidence) => evidence.id === item.evidenceId),
                      )
                      .slice(0, 2)
                      .map((item) => (
                        <Button key={item.id} asChild size="sm" variant="secondary">
                          <Link to="/app/resolution/$id" params={{ id: item.id }}>
                            Mở hội ý
                          </Link>
                        </Button>
                      ))}
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {evidences.length ? (
                      evidences
                        .slice(0, 4)
                        .map((evidence) => (
                          <EvidenceCard
                            key={evidence.id}
                            evidence={evidence}
                            onSelect={setSelectedEvidence}
                          />
                        ))
                    ) : (
                      <div className="rounded-lg border border-dashed bg-white p-3 text-sm text-muted-foreground">
                        Chưa có minh chứng liên quan.
                      </div>
                    )}
                  </div>
                  {evidences.length > 4 ? (
                    <div className="mt-3 rounded-lg border bg-white px-3 py-2 text-sm text-muted-foreground">
                      Còn {evidences.length - 4} minh chứng khác. Mở task review để xem toàn bộ hồ
                      sơ tiêu chí.
                    </div>
                  ) : null}
                </div>
              </details>
            );
          })}
        </div>
      </Card>
      <EvidenceDetailDialog
        evidence={selectedEvidence}
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedEvidence(null);
        }}
      />
    </>
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
            Màn này cho quản lý/hội đồng biết tiêu chí nào đã đạt, chưa đạt, cần bổ sung hoặc chưa
            được cán bộ xét.
          </p>
        </div>
        <Chip tone={incompleteCriteria.length ? "warning" : "success"}>
          {incompleteCriteria.length
            ? `${incompleteCriteria.length} tiêu chí cần xử lý`
            : "Đủ 5/5 tiêu chí"}
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
              <Chip key={criterion} tone="warning">
                {criterionLabel[criterion]}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {criterionOrder.map((criterion) => {
          const item = detail.criterionSummary[criterion];
          const task = detail.reviewTasks.find((candidate) => candidate.criterion === criterion);
          const evidences = detail.applicationEvidences.filter(
            (evidence) => evidence.criterion === criterion,
          );
          const blocker = task?.decisionReason || task?.officerNote || item?.summary;
          return (
            <div key={criterion} className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-brand-deep">{criterionLabel[criterion]}</div>
                <Chip tone={statusTone(item?.status)}>{label(item?.status)}</Chip>
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
              <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span className="font-semibold">Blocker/ghi chú: </span>
                {blocker || "Chưa có ghi chú xử lý cho tiêu chí này."}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {task ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/app/review/$id" params={{ id: task.id }}>
                      Mở task review
                    </Link>
                  </Button>
                ) : null}
                {evidences.slice(0, 3).map((evidence) => (
                  <Chip key={evidence.id} tone={statusTone(evidence.status)}>
                    {evidence.evidenceName || evidence.id.slice(0, 8)}
                  </Chip>
                ))}
                {evidences.length > 3 ? (
                  <Chip tone="muted">+{evidences.length - 3} minh chứng</Chip>
                ) : null}
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
        {detail.reviewTasks.length ? (
          detail.reviewTasks.map((task) => (
            <div key={task.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-brand-deep">
                  {criterionLabel[task.criterion]}
                </div>
                <Chip tone={statusTone(task.status)}>{label(task.status)}</Chip>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Cán bộ: {task.assignedOfficer?.fullName ?? "Chưa phân công"} • Gợi ý cấp:{" "}
                {level(task.officerSuggestedLevel)}
              </div>
              {task.decisionReason || task.officerNote ? (
                <p className="mt-2 text-sm">{task.decisionReason ?? task.officerNote}</p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Chưa có ghi chú/nhận xét của cán bộ cho task này.
                </p>
              )}
              <div className="mt-3 text-xs text-muted-foreground">
                {task.evidences.length} minh chứng liên kết
              </div>
            </div>
          ))
        ) : (
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
              Chọn "Xem chi tiết" để kiểm tra file, OCR, tóm tắt AI, trường trích xuất và cảnh báo
              của từng minh chứng.
            </p>
          </div>
          <Chip tone="brand">{evidences.length} minh chứng</Chip>
        </div>
        <div className="mt-4 space-y-4">
          {criterionOrder.map((criterion) => (
            <div key={criterion}>
              <h3 className="text-sm font-bold text-brand-deep">{criterionLabel[criterion]}</h3>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                {(grouped[criterion] ?? []).length ? (
                  grouped[criterion].map((evidence) => (
                    <EvidenceCard
                      key={evidence.id}
                      evidence={evidence}
                      onSelect={setSelectedEvidence}
                    />
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed bg-slate-50 p-4 text-sm text-muted-foreground">
                    Chưa có minh chứng cho tiêu chí này. Nếu task chưa đạt, đây là điểm cần yêu cầu
                    sinh viên bổ sung.
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
            {evidence.files?.length ?? 0} file •{" "}
            {typeof evidence.confidence === "number"
              ? `AI ${Math.round(evidence.confidence * 100)}%`
              : "Chưa có độ tin cậy AI"}
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onSelect(evidence)}
          data-smartux-tag="officer_open_evidence_card"
        >
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
      <EvidenceInlinePreview evidence={evidence} onSelect={onSelect} />
      <div className="mt-3 space-y-2">
        {evidence.files?.length ? (
          evidence.files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm"
            >
              <span className="truncate">{file.originalName}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openFile(file.id)}
                data-smartux-tag="officer_view_original_file"
              >
                <ExternalLink className="h-4 w-4" />
                Xem file
              </Button>
            </div>
          ))
        ) : (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Minh chứng này chưa có file đính kèm.
          </div>
        )}
      </div>
    </div>
  );
}

function EvidenceInlinePreview({
  evidence,
  onSelect,
}: {
  evidence: ManagerResultEvidence;
  onSelect: (evidence: ManagerResultEvidence) => void;
}) {
  const primaryFile = evidence.files?.[0];
  const { data: previewUrl, isLoading } = useSignedFileUrl(primaryFile?.id, Boolean(primaryFile));

  if (!primaryFile) {
    return (
      <div className="mt-3 rounded-lg border border-dashed bg-slate-50 px-3 py-6 text-center text-sm text-muted-foreground">
        Chưa có file để preview.
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(evidence)}
      className="mt-3 block w-full overflow-hidden rounded-lg border bg-slate-50 text-left transition hover:border-[#0057C2]/60 hover:bg-blue-50/40"
    >
      <div className="flex items-center justify-between gap-2 border-b bg-white px-3 py-2 text-xs">
        <span className="truncate font-semibold text-brand-deep">Preview minh chứng</span>
        <span className="shrink-0 text-muted-foreground">{evidence.files.length} file</span>
      </div>
      <div className="flex h-48 items-center justify-center overflow-hidden bg-slate-100">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải preview...
          </div>
        ) : previewUrl && isImageMime(primaryFile.mimeType) ? (
          <img
            src={previewUrl}
            alt={primaryFile.originalName}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        ) : previewUrl && isPdfMime(primaryFile.mimeType) ? (
          <iframe
            title={primaryFile.originalName}
            src={previewUrl}
            className="h-full w-full bg-white"
            loading="lazy"
          />
        ) : (
          <div className="px-4 text-center text-sm text-muted-foreground">
            <FileText className="mx-auto mb-2 h-8 w-8" />
            Không preview trực tiếp được file này.
          </div>
        )}
      </div>
      <div className="truncate px-3 py-2 text-xs text-muted-foreground">
        {primaryFile.originalName}
      </div>
    </button>
  );
}

function EvidenceDetailDialog({
  detail,
  evidence,
  onOpenChange,
}: {
  detail?: ManagerResultDetail;
  evidence: ManagerResultEvidence | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [preview, setPreview] = useState<{
    file: ManagerResultEvidence["files"][number];
    url: string;
  } | null>(null);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const fields = useReadableFields(evidence?.evidenceCard?.extractedFieldsJson);
  const warnings = useWarnings(evidence?.evidenceCard?.warningsJson);
  const relatedTask = useMemo(() => {
    if (!detail || !evidence) return null;
    return (
      detail.reviewTasks.find(
        (task) =>
          task.evidences.some((item) => item.id === evidence.id) ||
          task.criterion === evidence.criterion,
      ) ?? null
    );
  }, [detail, evidence]);
  const taskNote = getBusinessNote(relatedTask?.decisionReason, relatedTask?.officerNote);

  const openPreview = async (
    file: ManagerResultEvidence["files"][number],
    openInNewTab = false,
  ) => {
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

  useEffect(() => {
    setPreview(null);
    const firstFile = evidence?.files?.[0];
    if (firstFile) {
      void openPreview(firstFile);
    }
  }, [evidence?.id]);

  return (
    <Dialog
      open={Boolean(evidence)}
      onOpenChange={(open) => {
        if (!open) setPreview(null);
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-h-[94vh] max-w-7xl overflow-hidden">
        {evidence ? (
          <>
            <DialogHeader className="pr-8">
              <DialogTitle className="pr-8">{evidence.evidenceName}</DialogTitle>
              <DialogDescription>
                {criterionLabel[evidence.criterion]} • {label(evidence.status)} •{" "}
                {evidence.files?.length ?? 0} file
              </DialogDescription>
            </DialogHeader>

            <div className="grid max-h-[calc(94vh-110px)] gap-4 overflow-y-auto lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)] lg:overflow-hidden">
              <section className="min-h-0 rounded-lg border bg-white p-3">
                <div className="flex flex-col gap-3 border-b pb-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 font-bold text-brand-deep">
                      <FileText className="h-4 w-4 text-[#0057C2]" />
                      Tài liệu gốc
                    </h3>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {preview?.file.originalName ??
                        evidence.files[0]?.originalName ??
                        "Minh chứng chưa có file đính kèm."}
                    </p>
                  </div>
                  {preview ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPreview(preview.file, true)}
                        disabled={loadingFileId === preview.file.id}
                        data-smartux-tag="officer_view_original_file"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Mở tab mới
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <a href={preview.url} download={preview.file.originalName}>
                          <Download className="h-4 w-4" />
                          Tải xuống
                        </a>
                      </Button>
                    </div>
                  ) : null}
                </div>

                {evidence.files?.length ? (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {evidence.files.map((file) => {
                      const active = preview?.file.id === file.id;
                      return (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => openPreview(file)}
                          className={`min-w-48 rounded-lg border px-3 py-2 text-left text-xs transition ${
                            active
                              ? "border-[#0057C2] bg-blue-50 text-brand-deep"
                              : "bg-slate-50 text-muted-foreground hover:bg-slate-100"
                          }`}
                        >
                          <div className="truncate font-semibold">{file.originalName}</div>
                          <div className="mt-1 truncate">
                            {file.mimeType || "--"} • {formatFileSize(file.fileSize)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <div className="mt-3 flex min-h-[55vh] items-center justify-center overflow-hidden rounded-lg border bg-slate-100">
                  {loadingFileId && !preview ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải preview...
                    </div>
                  ) : preview ? (
                    isImageMime(preview.file.mimeType) ? (
                      <img
                        src={preview.url}
                        alt={preview.file.originalName}
                        className="max-h-[65vh] w-full object-contain"
                      />
                    ) : isPdfMime(preview.file.mimeType) ? (
                      <iframe
                        title={preview.file.originalName}
                        src={preview.url}
                        className="h-[65vh] w-full bg-white"
                      />
                    ) : (
                      <div className="max-w-md p-5 text-center">
                        <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                        <div className="mt-3 font-semibold text-brand-deep">
                          {preview.file.originalName}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {preview.file.mimeType || "File"} •{" "}
                          {formatFileSize(preview.file.fileSize)} •{" "}
                          {formatDate(preview.file.createdAt)}
                        </div>
                        <Button
                          className="mt-4"
                          variant="outline"
                          onClick={() => openPreview(preview.file, true)}
                        >
                          <ExternalLink className="h-4 w-4" />
                          Mở file
                        </Button>
                      </div>
                    )
                  ) : (
                    <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      Minh chứng chưa có file đính kèm.
                    </div>
                  )}
                </div>
              </section>

              <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
                <section className="rounded-lg border bg-white p-4">
                  <h3 className="flex items-center gap-2 font-bold text-brand-deep">
                    <SearchCheck className="h-4 w-4 text-[#0057C2]" />
                    Thông tin kiểm tra
                  </h3>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-1">
                    <Info label="Tiêu chí" value={criterionLabel[evidence.criterion]} />
                    <Info label="Nguồn" value={label(evidence.sourceType)} />
                    <Info label="Trạng thái" value={label(evidence.status)} />
                    <Info label="AI/OCR" value={label(evidence.indexingStatus)} />
                    <Info
                      label="Độ tin cậy"
                      value={
                        typeof evidence.confidence === "number"
                          ? `${Math.round(evidence.confidence * 100)}%`
                          : "--"
                      }
                    />
                    <Info label="Số file" value={evidence.files?.length ?? 0} />
                  </div>
                </section>

                <section className="rounded-lg border bg-white p-4">
                  <h3 className="flex items-center gap-2 font-bold text-brand-deep">
                    <Sparkles className="h-4 w-4 text-[#0057C2]" />
                    AI/OCR
                  </h3>
                  <TextBlock
                    label="Tóm tắt AI"
                    value={evidence.evidenceCard?.aiSummary}
                    empty="Chưa có tóm tắt AI."
                  />
                  <TextBlock
                    label="OCR preview"
                    value={evidence.evidenceCard?.ocrText}
                    empty="Chưa có nội dung OCR."
                    clamp
                  />
                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      Trường đã trích xuất
                    </div>
                    {fields.length ? (
                      <div className="mt-2 grid gap-2">
                        {fields.map((field) => (
                          <Info key={field.label} label={field.label} value={field.value} />
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Chưa có trường trích xuất.
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-lg border bg-white p-4">
                  <h3 className="flex items-center gap-2 font-bold text-brand-deep">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Cảnh báo cần đối chiếu
                  </h3>
                  {warnings.length ? (
                    <div className="mt-3 space-y-2">
                      {warnings.map((warning, index) => (
                        <div
                          key={`${warning}-${index}`}
                          className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900"
                        >
                          {warning}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Chưa có cảnh báo cần đối chiếu.
                    </p>
                  )}
                </section>

                <section className="rounded-lg border bg-white p-4">
                  <h3 className="font-bold text-brand-deep">Trạng thái task/quyết định</h3>
                  <div className="mt-3 grid gap-2 text-sm">
                    <Info
                      label="Task liên quan"
                      value={relatedTask ? relatedTask.id.slice(0, 8) : "--"}
                    />
                    <Info
                      label="Cán bộ xử lý"
                      value={relatedTask?.assignedOfficer?.fullName ?? "--"}
                    />
                    <Info label="Trạng thái task" value={label(relatedTask?.status)} />
                    <Info
                      label="Gợi ý cấp"
                      value={getLevelLabel(relatedTask?.officerSuggestedLevel)}
                    />
                  </div>
                  <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <span className="font-semibold text-brand-deep">Ghi chú cán bộ: </span>
                    {taskNote}
                  </div>
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
  const suggestedLevel = getSuggestedLevel(detail);
  const hasBlockingIssue = detail.aggregation.blockingIssues.length > 0;
  const hasOpenResolution = detail.resolutionCases.some(
    (item) => item.status === "open" || item.status === "in_review",
  );
  const hasSupplement = detail.reviewTasks.some((task) => task.status === "supplement_required");
  const isDowngraded = Boolean(suggestedLevel && suggestedLevel !== detail.application.targetLevel);
  const isStraightPass =
    suggestedLevel === detail.application.targetLevel &&
    !hasBlockingIssue &&
    !hasOpenResolution &&
    !hasSupplement;
  const reason =
    suggestedLevel === detail.application.targetLevel
      ? "Đủ 5/5 tiêu chí theo cấp đăng ký."
      : suggestedLevel
        ? `Đề xuất hạ từ ${getLevelLabel(detail.application.targetLevel)} xuống ${getLevelLabel(suggestedLevel)} theo kết quả tiêu chí.`
        : "Chưa đủ điều kiện đạt cấp nào theo kết quả tiêu chí.";
  const reasons = [
    ...detail.aggregation.blockingIssues.map(
      (issue) => `${issue.criterion ? `${criterionLabel[issue.criterion]}: ` : ""}${issue.message}`,
    ),
    ...(hasOpenResolution ? ["Đang còn hồ sơ hội ý cần xử lý."] : []),
    ...(hasSupplement ? ["Đang còn yêu cầu bổ sung minh chứng."] : []),
  ];

  if (isStraightPass) {
    return (
      <div className="rounded-lg border bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
        Đủ 5/5 tiêu chí theo cấp đăng ký.
      </div>
    );
  }

  return (
    <Card>
      <h2 className="font-bold text-brand-deep">Gợi ý cấp đạt</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Info label="Cấp đăng ký" value={getLevelLabel(detail.application.targetLevel)} />
        <Info label="Cấp đạt đề xuất" value={getSuggestedLevelLabel(detail)} />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Cán bộ duyệt từng tiêu chí. Hội đồng/Cấp quản lý theo dõi, điều phối và chốt kết quả cuối.
      </p>
      {isDowngraded || !suggestedLevel || reasons.length ? (
        <div className="mt-4 space-y-2">
          {reasons.length ? (
            reasons.map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              >
                {item}
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Cần đối chiếu lại từng tiêu chí trước khi chốt kết quả.
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}

function ResolutionSection({ detail }: { detail: ManagerResultDetail }) {
  return (
    <Card>
      <h2 className="font-bold text-brand-deep">Hồ sơ hội ý liên quan</h2>
      <div className="mt-4 space-y-3">
        {detail.resolutionCases.length ? (
          detail.resolutionCases.map((item) => (
            <Link
              key={item.id}
              to="/app/resolution/$id"
              params={{ id: item.id }}
              className="block rounded-lg border p-4 hover:bg-slate-50"
            >
              <div className="font-semibold text-brand-deep">
                #{item.id.slice(0, 8)} • {label(item.status)}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
            </Link>
          ))
        ) : (
          <div className="rounded-lg border bg-slate-50 p-4 text-sm text-muted-foreground">
            Không có hồ sơ hội ý liên quan.
          </div>
        )}
      </div>
    </Card>
  );
}

function AuditSection({ detail }: { detail: ManagerResultDetail }) {
  const businessEvents = detail.auditTimeline.filter((item) => !item.action.includes("VIEWED"));
  const recent = businessEvents.slice(0, 5);

  return (
    <Card>
      <details>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold text-brand-deep">
            <History className="h-5 w-5" />
            Lịch sử xử lý
          </h2>
          <span className="text-xs font-semibold text-muted-foreground">
            {businessEvents.length
              ? `${Math.min(5, businessEvents.length)} sự kiện gần nhất`
              : "Chưa có"}
          </span>
        </summary>
        <div className="mt-4 space-y-3">
          {recent.length ? (
            recent.map((item) => (
              <div key={item.id} className="rounded-lg border p-3 text-sm">
                <div className="font-semibold text-brand-deep">{auditActionLabel(item.action)}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatDate(item.createdAt)} • {item.actorRole ?? "--"} •{" "}
                  <span className="font-mono">{item.action}</span>
                </div>
                {item.note ? <p className="mt-2 text-muted-foreground">{item.note}</p> : null}
              </div>
            ))
          ) : (
            <div className="rounded-lg border bg-slate-50 p-4 text-sm text-muted-foreground">
              Chưa có lịch sử xử lý.
            </div>
          )}
        </div>
      </details>
    </Card>
  );
}

function auditActionLabel(action: string) {
  if (action.includes("FINAL_RESULT_CONFIRMED") || action.includes("APPLICATION_FINALIZED"))
    return "Đã chốt kết quả";
  if (action.includes("AGGREG")) return "Đã tổng hợp hồ sơ";
  if (action.includes("REVIEW")) return "Cán bộ đã duyệt tiêu chí";
  if (action.includes("REOPEN")) return "Đã mở lại kết quả";
  if (action.includes("RESOLUTION")) return "Đã xử lý hội ý";
  return "Cập nhật hồ sơ";
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-lg border bg-white px-3 py-2">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 min-w-0 break-words text-sm font-semibold text-brand-deep">
        {value ?? "--"}
      </div>
    </div>
  );
}

function DecisionCheck({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-bold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
      >
        {ok ? "Đạt" : "Cần xử lý"}
      </span>
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
      <p
        className={`mt-2 whitespace-pre-wrap text-sm text-slate-700 ${clamp ? "max-h-36 overflow-auto rounded-lg bg-slate-50 p-3" : ""}`}
      >
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
    {
      total: 0,
      accepted: 0,
      rejected: 0,
      supplementRequired: 0,
      resolutionNeeded: 0,
      waiting: 0,
      reviewing: 0,
    },
  );

  return {
    applicationId: detail.application.id,
    studentId: detail.student?.id ?? "",
    studentName: detail.student?.fullName ?? "Chưa có dữ liệu",
    studentCode: detail.student?.studentCode ?? null,
    className: detail.student?.className ?? null,
    faculty: detail.student?.faculty ?? null,
    schoolYear: detail.application.schoolYear,
    targetLevel: detail.application.targetLevel,
    suggestedLevel: getSuggestedLevel(detail),
    suggestedFinalStatus: getSuggestedFinalStatus(detail),
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
    criterionStatuses: Object.fromEntries(
      detail.reviewTasks.map((task) => [
        task.criterion,
        {
          status: task.status,
          officerSuggestedLevel: task.officerSuggestedLevel ?? null,
        },
      ]),
    ),
    taskProgress: { accepted: summary.accepted, total: summary.total },
    canFinalize: detail.aggregation.canFinalize,
    blockingReasons: detail.aggregation.blockingIssues.map((issue) => issue.message),
  };
}

function groupByCriterion(evidences: ManagerResultEvidence[]) {
  return evidences.reduce<Partial<Record<Criterion, ManagerResultEvidence[]>>>((acc, evidence) => {
    acc[evidence.criterion] = [...(acc[evidence.criterion] ?? []), evidence];
    return acc;
  }, {});
}

function level(value?: Level | null) {
  return getLevelLabel(value);
}

function getLevelLabel(value?: Level | null, empty = "--") {
  return value ? levelLabel[value] : empty;
}

function getSuggestedLevel(detail: ManagerResultDetail) {
  return detail.latestCascade?.suggestedLevel ?? detail.aggregation.suggestedFinalLevel ?? null;
}

function getSuggestedFinalStatus(detail: ManagerResultDetail): FinalStatus | "pending" {
  const suggested = detail.aggregation.suggestedFinalStatus;
  if (suggested && suggested !== "pending") return suggested;
  const suggestedLevel = getSuggestedLevel(detail);
  if (!suggestedLevel) return "failed";
  return suggestedLevel === detail.application.targetLevel ? "passed" : "partially_passed";
}

function getSuggestedLevelLabel(detail: ManagerResultDetail) {
  return getLevelLabel(getSuggestedLevel(detail), "Chưa có đề xuất");
}

function getPendingFinalResultLabel(
  status?: FinalStatus | "pending",
  suggestedLevel?: Level | null,
) {
  if (status === "failed" || !suggestedLevel) return "Chưa đạt";
  if (status === "partially_passed") return `Đạt cấp thấp hơn: ${getLevelLabel(suggestedLevel)}`;
  if (status === "passed") return `Đạt ${getLevelLabel(suggestedLevel)}`;
  return suggestedLevel ? `Đạt ${getLevelLabel(suggestedLevel)}` : "Chưa đạt";
}

function getFinalResultLabel(detail: ManagerResultDetail) {
  if (detail.application.finalStatus === "passed" && detail.application.finalLevel) {
    return `Đạt ${getLevelLabel(detail.application.finalLevel)}`;
  }
  if (detail.application.finalStatus === "partially_passed" && detail.application.finalLevel) {
    return `Đạt cấp thấp hơn: ${getLevelLabel(detail.application.finalLevel)}`;
  }
  if (detail.application.finalStatus === "failed") return "Chưa đạt";
  return label(detail.application.finalStatus);
}

function getStudentPhotoUrl(detail: ManagerResultDetail) {
  const student = detail.student as ManagerResultDetail["student"] & {
    avatarUrl?: string | null;
    studentPhotoUrl?: string | null;
    profileImageUrl?: string | null;
    photoUrl?: string | null;
  };
  return (
    student.avatarUrl ??
    student.studentPhotoUrl ??
    student.profileImageUrl ??
    student.photoUrl ??
    null
  );
}

function useResolvedAvatarUrl(avatarUrl?: string | null) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveAvatar() {
      if (!avatarUrl) {
        setResolvedUrl(null);
        return;
      }
      if (!avatarUrl.startsWith("file:")) {
        setResolvedUrl(avatarUrl);
        return;
      }

      const fileId = avatarUrl.slice("file:".length);
      if (!fileId) {
        setResolvedUrl(null);
        return;
      }

      try {
        const response = await evidenceApi.getSignedFileUrl(fileId);
        if (!cancelled) setResolvedUrl(response.data.url);
      } catch {
        if (!cancelled) setResolvedUrl(null);
      }
    }

    void resolveAvatar();
    return () => {
      cancelled = true;
    };
  }, [avatarUrl]);

  return resolvedUrl;
}

function getInitials(name?: string | null) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "SV";
  const lastTwo = words.slice(-2);
  return lastTwo.map((word) => word[0]?.toUpperCase() ?? "").join("") || "SV";
}

function getBusinessNote(...values: Array<string | null | undefined>) {
  const note = values.find((value) => value?.trim() && !isValidationMessage(value));
  return note?.trim() || "Chưa có ghi chú cán bộ.";
}

function isValidationMessage(value?: string | null) {
  const normalized = value?.toLowerCase().trim() ?? "";
  return (
    normalized.includes("ít nhất 10") ||
    normalized.includes("it nhat 10") ||
    normalized.includes("at least 10") ||
    normalized.includes("validation")
  );
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
      .filter(
        ([, fieldValue]) => fieldValue !== undefined && fieldValue !== null && fieldValue !== "",
      )
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
