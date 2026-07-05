import { AlertTriangle, CheckCircle2, Clock3, Loader2, Send, X, XCircle } from "lucide-react";
import { Button, Chip, Progress } from "@/components/ui-kit";
import type { ApplicationState, Criterion, Level, PrecheckMissingItem, PrecheckResult } from "@/lib/api/types";
import { getCriterionResultStatusLabel, getStudentApplicationStatusLabel } from "@/lib/status-labels";
import { getPrecheckMissingMessage, getUserFacingText } from "@/lib/user-facing-messages";
import { studentCriterionLabel } from "@/features/evidence/components/student-evidence-utils";

const levelLabel: Record<Level, string> = {
  school: "Cấp Trường",
  university: "Cấp Đại học Đà Nẵng",
  city: "Cấp Thành phố",
  central: "Cấp Trung ương",
};

const criteria: Criterion[] = ["ethics", "academic", "physical", "volunteer", "integration"];

type CriterionSummary = {
  criterion: Criterion;
  label: string;
  explanation: string;
  tone: "brand" | "success" | "warning" | "error" | "muted";
  icon: typeof CheckCircle2;
  requiredAttention: boolean;
};

type SubmitMode = "first_submit" | "supplement" | "locked" | "completed";

export function SubmitConfirmationModal({
  application,
  precheck,
  evidenceCounts,
  onCancel,
  onConfirm,
  pending,
}: {
  application: ApplicationState;
  precheck?: PrecheckResult | null;
  evidenceCounts: Partial<Record<Criterion, number>>;
  onCancel: () => void;
  onConfirm: () => void;
  pending?: boolean;
}) {
  const readinessScore = precheck?.readinessScore ?? application.readinessScore ?? 0;
  const mode = getSubmitMode(application.status);
  const isSupplement = mode === "supplement";
  const isLocked = mode === "locked" || mode === "completed";
  const criterionSummaries = criteria.map((criterion) =>
    buildCriterionSummary(criterion, evidenceCounts[criterion] ?? 0, precheck),
  );
  const hasRequiredAttention = criterionSummaries.some((item) => item.requiredAttention);
  const missingCriteriaCount = criterionSummaries.filter((item) => item.requiredAttention).length;
  const copy = getModalCopy(mode, readinessScore);
  const primaryLabel = getPrimaryLabel(mode, readinessScore);
  const secondaryLabel = isSupplement
    ? "Quay lại chỉnh sửa"
    : readinessScore < 80
      ? "Tiếp tục bổ sung"
      : "Quay lại bổ sung";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#E3ECF6] px-5 py-4">
          <div className="min-w-0">
            <Chip tone={isSupplement ? "brand" : "warning"}>{copy.badge}</Chip>
            <h3 className="mt-2 text-xl font-bold text-brand-deep">{copy.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
          </div>
          <button
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-deep disabled:opacity-50"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto px-5 py-5">
          {isLocked && (
            <div className="rounded-lg border border-[#E3ECF6] bg-[#F6F9FC] px-4 py-3 text-sm text-brand-deep">
              {mode === "completed"
                ? "Hồ sơ đã hoàn tất."
                : "Hồ sơ đã được nộp và đang chờ xét duyệt."}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <InfoBlock label="Cấp đăng ký" value={levelLabel[application.targetLevel]} />
            <InfoBlock label="Trạng thái" value={getStudentApplicationStatusLabel(application.status)} />
            <div className="rounded-lg bg-[#F6F9FC] px-3 py-3">
              <div className="flex items-center justify-between text-xs font-semibold uppercase text-muted-foreground">
                <span>Tiến độ tham khảo</span>
                <span className="text-brand-deep">
                  {missingCriteriaCount > 0 ? `Còn ${missingCriteriaCount} tiêu chí` : "Đủ dữ liệu cơ bản"}
                </span>
              </div>
              <div className="mt-2">
                <Progress value={readinessScore} />
              </div>
            </div>
          </div>

          <ReadinessWarning
            readinessScore={readinessScore}
            hasRequiredAttention={hasRequiredAttention}
          />

          <div>
            <h4 className="font-bold text-brand-deep">Tóm tắt 5 tiêu chí</h4>
            <div className="mt-3 grid gap-2">
              {criterionSummaries.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.criterion} className="grid gap-3 rounded-lg bg-[#F6F9FC] px-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="flex min-w-0 items-start gap-3">
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${getIconClass(item.tone)}`} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-brand-deep">{studentCriterionLabel[item.criterion]}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{item.explanation}</div>
                      </div>
                    </div>
                    <Chip tone={item.tone}>{item.label}</Chip>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {isSupplement
              ? "Sau khi gửi lại, hồ sơ sẽ được khóa. Bạn chỉ có thể chỉnh sửa khi cán bộ yêu cầu bổ sung lần nữa."
              : "Sau khi nộp, hồ sơ sẽ được khóa. Bạn chỉ có thể chỉnh sửa khi cán bộ yêu cầu bổ sung."}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#E3ECF6] px-5 py-4">
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            {secondaryLabel}
          </Button>
          {!isLocked && (
            <Button onClick={onConfirm} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {primaryLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#F6F9FC] px-3 py-3">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-bold text-brand-deep">{value}</div>
    </div>
  );
}

function ReadinessWarning({
  readinessScore,
  hasRequiredAttention,
}: {
  readinessScore: number;
  hasRequiredAttention: boolean;
}) {
  if (readinessScore >= 100 && !hasRequiredAttention) return null;

  const message =
    readinessScore < 70
      ? "Hồ sơ còn thiếu nhiều thông tin. Bạn nên bổ sung trước khi nộp."
      : "Hồ sơ còn một số điểm cần lưu ý. Hãy kiểm tra lại các cảnh báo trước khi nộp.";

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div>{message}</div>
          {hasRequiredAttention && (
            <div className="mt-1 font-semibold">
              Bạn còn thiếu thông tin bắt buộc. Hãy kiểm tra lại trước khi nộp.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getSubmitMode(status: string): SubmitMode {
  if (status === "completed") return "completed";
  if (status === "submitted" || status === "under_review" || status === "resolution_needed") return "locked";
  if (status === "supplement_required" || status === "draft_supplement") return "supplement";
  return "first_submit";
}

function getModalCopy(mode: SubmitMode, readinessScore: number) {
  if (mode === "supplement") {
    return {
      badge: "Gửi lại bổ sung",
      title: "Xác nhận gửi lại hồ sơ bổ sung",
      description: "Sau khi gửi lại, hồ sơ sẽ được khóa để cán bộ tiếp tục xét duyệt.",
    };
  }

  if (mode === "locked") {
    return {
      badge: "Đang chờ xét duyệt",
      title: "Hồ sơ đã được nộp",
      description: "Hồ sơ đã được nộp và đang chờ cán bộ xét duyệt.",
    };
  }

  if (mode === "completed") {
    return {
      badge: "Hoàn tất",
      title: "Hồ sơ đã hoàn tất",
      description: "Hồ sơ đã hoàn tất, không cần nộp lại.",
    };
  }

  return {
      badge: "Kiểm tra hồ sơ",
    title: "Xác nhận nộp hồ sơ",
    description:
      readinessScore < 80
        ? "Hồ sơ còn điểm cần bổ sung. Hãy kiểm tra các cảnh báo trước khi quyết định nộp."
        : "Sau khi nộp, hồ sơ sẽ được khóa để cán bộ xét duyệt.",
  };
}

function getPrimaryLabel(mode: SubmitMode, readinessScore: number) {
  if (mode === "supplement") return "Gửi lại hồ sơ bổ sung";
  if (readinessScore < 80) return "Xác nhận nộp hồ sơ";
  return "Xác nhận nộp hồ sơ";
}

function buildCriterionSummary(
  criterion: Criterion,
  evidenceCount: number,
  precheck?: PrecheckResult | null,
): CriterionSummary {
  const result = precheck?.criteriaResults?.find((item) => item.criterion === criterion);
  const missingItem = precheck?.missingItems?.find((item) => item.criterion === criterion);
  const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
  const reasons = Array.isArray(result?.reasons) ? result.reasons : [];

  if (missingItem) {
    return {
      criterion,
      label: "Cần bổ sung",
      explanation: getMissingExplanation(missingItem),
      tone: "warning",
      icon: AlertTriangle,
      requiredAttention: true,
    };
  }

  if (!evidenceCount && !result) {
    return {
      criterion,
      label: "Chưa có minh chứng",
      explanation: "Chưa có minh chứng hoặc kết quả kiểm tra cho tiêu chí này.",
      tone: "error",
      icon: XCircle,
      requiredAttention: true,
    };
  }

  if (result?.status === "ai_processing") {
    return {
      criterion,
      label: "Hệ thống đang kiểm tra",
      explanation: "Minh chứng đã tải lên và đang chờ kết quả kiểm tra mới nhất.",
      tone: "brand",
      icon: Clock3,
      requiredAttention: false,
    };
  }

  if (result?.status === "ai_failed") {
    return {
      criterion,
      label: "Cần kiểm tra thủ công",
      explanation: "Hệ thống chưa đọc được minh chứng. Cán bộ có thể cần kiểm tra thủ công.",
      tone: "warning",
      icon: AlertTriangle,
      requiredAttention: true,
    };
  }

  if (warnings.length > 0 || result?.status === "needs_officer_confirmation" || result?.status === "risky") {
    return {
      criterion,
      label: "Chờ cán bộ xác nhận",
      explanation: getUserFacingText(
        warnings[0] ?? reasons[0] ?? result?.status,
        "Dữ liệu đã có nhưng cần cán bộ xác nhận trước khi chốt kết quả.",
      ),
      tone: "warning",
      icon: AlertTriangle,
      requiredAttention: false,
    };
  }

  if (result?.passed || result?.status === "passed" || result?.status === "complete") {
    return {
      criterion,
      label: getCriterionResultStatusLabel(result.status),
      explanation: getUserFacingText(reasons[0], "Đủ dữ liệu theo kết quả kiểm tra mới nhất."),
      tone: "success",
      icon: CheckCircle2,
      requiredAttention: false,
    };
  }

  if (result?.status === "failed" || result?.status === "needs_supplement" || result?.passed === false) {
    return {
      criterion,
      label: "Cần bổ sung",
      explanation: getUserFacingText(
        reasons[0] ?? result?.status,
        "Kết quả kiểm tra cho thấy tiêu chí này cần bổ sung thêm dữ liệu.",
      ),
      tone: "warning",
      icon: AlertTriangle,
      requiredAttention: true,
    };
  }

  if (evidenceCount > 0) {
    return {
      criterion,
      label: "Đủ dữ liệu cơ bản",
      explanation: `${evidenceCount} minh chứng đã được ghi nhận, chờ cán bộ xác nhận khi xét duyệt.`,
      tone: "success",
      icon: CheckCircle2,
      requiredAttention: false,
    };
  }

  return {
    criterion,
    label: "Chờ cán bộ xác nhận",
    explanation: "Chưa đủ dữ liệu chi tiết từ hệ thống kiểm tra. Cán bộ sẽ xác nhận khi xét duyệt.",
    tone: "brand",
    icon: AlertTriangle,
    requiredAttention: false,
  };
}

function getMissingExplanation(item: PrecheckMissingItem) {
  return getPrecheckMissingMessage(item).description;
}

function getIconClass(tone: CriterionSummary["tone"]) {
  if (tone === "success") return "text-emerald-600";
  if (tone === "error") return "text-rose-600";
  if (tone === "warning") return "text-amber-600";
  return "text-[#0057C2]";
}
