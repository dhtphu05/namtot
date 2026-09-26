import { AlertTriangle, Loader2, Send, X } from "lucide-react";
import { Button, Chip, Progress } from "@/components/ui-kit";
import type { ApplicationState, Criterion, Level, PrecheckResult } from "@/lib/api/types";
import { getStudentApplicationStatusLabel } from "@/lib/status-labels";
import { studentCriterionLabel } from "@/features/evidence/components/student-evidence-utils";
import { buildCriterionSummary, type CriterionSummary } from "./submit-confirmation-summary";

const levelLabel: Record<Level, string> = {
  school: "Cấp Trường",
  university: "Cấp Đại học Đà Nẵng",
  city: "Cấp Thành phố",
  central: "Cấp Trung ương",
};

const criteria: Criterion[] = ["ethics", "academic", "physical", "volunteer", "integration"];

type SubmitMode = "first_submit" | "supplement" | "locked" | "completed";

export function SubmitConfirmationModal({
  application,
  cityInitialSubmission = false,
  precheck,
  evidenceCounts,
  onCancel,
  onConfirm,
  pending,
}: {
  application: ApplicationState;
  cityInitialSubmission?: boolean;
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
  const criterionSummaries = criteria.map((criterion) => {
    const summary = buildCriterionSummary(criterion, evidenceCounts[criterion] ?? 0, precheck);
    return cityInitialSubmission ? toCityAdvisorySummary(summary) : summary;
  });
  const hasRequiredAttention = criterionSummaries.some((item) => item.requiredAttention);
  const missingCriteriaCount = criterionSummaries.filter((item) => item.requiredAttention).length;
  const copy = getModalCopy(mode, readinessScore, cityInitialSubmission);
  const primaryLabel = cityInitialSubmission
    ? "VẪN NỘP HỒ SƠ"
    : getPrimaryLabel(mode, readinessScore);
  const secondaryLabel = cityInitialSubmission
    ? "BỔ SUNG HỒ SƠ"
    : isSupplement
      ? "Quay lại chỉnh sửa"
      : readinessScore < 80
        ? "Tiếp tục bổ sung"
        : "Quay lại bổ sung";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="flex max-h-[calc(100dvh-32px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="shrink-0 flex items-start justify-between gap-4 border-b border-[#E3ECF6] px-5 py-4">
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

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {isLocked && (
            <div className="rounded-lg border border-[#E3ECF6] bg-[#F6F9FC] px-4 py-3 text-sm text-brand-deep">
              {mode === "completed"
                ? "Hồ sơ đã hoàn tất."
                : "Hồ sơ đã được nộp và đang chờ xét duyệt."}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <InfoBlock label="Cấp đăng ký" value={levelLabel[application.targetLevel]} />
            <InfoBlock
              label="Trạng thái"
              value={getStudentApplicationStatusLabel(application.status)}
            />
            <div className="rounded-lg bg-[#F6F9FC] px-3 py-3">
              <div className="flex items-center justify-between text-xs font-semibold uppercase text-muted-foreground">
                <span>Tiến độ tham khảo</span>
                <span className="text-brand-deep">
                  {missingCriteriaCount > 0
                    ? `Còn ${missingCriteriaCount} tiêu chí`
                    : precheck
                      ? "Không có cảnh báo bắt buộc"
                      : "Chờ kết quả kiểm tra"}
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
            cityInitialSubmission={cityInitialSubmission}
          />

          <div>
            <h4 className="font-bold text-brand-deep">Tóm tắt 5 tiêu chí</h4>
            <div className="mt-3 grid gap-2">
              {criterionSummaries.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.criterion}
                    className="grid gap-3 rounded-lg bg-[#F6F9FC] px-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${getIconClass(item.tone)}`} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-brand-deep">
                          {studentCriterionLabel[item.criterion]}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {item.explanation}
                        </div>
                      </div>
                    </div>
                    <Chip tone={item.tone}>{item.label}</Chip>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {cityInitialSubmission
              ? "Sau khi nộp, hồ sơ và minh chứng sẽ được chuyển cho cán bộ Thành phố xem xét."
              : isSupplement
                ? "Sau khi gửi lại, hồ sơ sẽ được khóa. Bạn chỉ có thể chỉnh sửa khi cán bộ yêu cầu bổ sung lần nữa."
                : "Sau khi nộp, hồ sơ sẽ được khóa. Bạn chỉ có thể chỉnh sửa khi cán bộ yêu cầu bổ sung."}
          </div>
        </div>

        <div className="shrink-0 flex flex-col-reverse gap-2 border-t border-[#E3ECF6] bg-white px-5 py-4 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            {secondaryLabel}
          </Button>
          {!isLocked && (
            <Button onClick={onConfirm} disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
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
  cityInitialSubmission,
}: {
  readinessScore: number;
  hasRequiredAttention: boolean;
  cityInitialSubmission: boolean;
}) {
  if (cityInitialSubmission) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Hệ thống phát hiện một số nội dung cần kiểm tra. Bạn vẫn có thể nộp hồ sơ để Hội Sinh viên
        Thành phố xem xét.
      </div>
    );
  }
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
  if (status === "submitted" || status === "under_review" || status === "resolution_needed")
    return "locked";
  if (status === "supplement_required" || status === "draft_supplement") return "supplement";
  return "first_submit";
}

function getModalCopy(mode: SubmitMode, readinessScore: number, cityInitialSubmission: boolean) {
  if (cityInitialSubmission) {
    return {
      badge: "Tiền kiểm tham khảo",
      title: "Kiểm tra trước khi nộp hồ sơ Thành phố",
      description: "Các gợi ý dưới đây không thay thế kết luận của cán bộ xét duyệt.",
    };
  }

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

function toCityAdvisorySummary(summary: CriterionSummary): CriterionSummary {
  if (summary.label === "Chưa có minh chứng") {
    return {
      ...summary,
      label: "Chưa đủ dữ liệu để xác định",
      explanation: "Chưa có minh chứng hoặc kết quả tiền kiểm; cán bộ sẽ xem xét hồ sơ gốc.",
      tone: "warning",
    };
  }
  if (summary.requiredAttention || summary.label === "Cần bổ sung") {
    return {
      ...summary,
      label: "Hệ thống gợi ý bổ sung",
      explanation: `Gợi ý tiền kiểm: ${summary.explanation}`,
      tone: "warning",
      requiredAttention: true,
    };
  }
  return summary;
}

function getPrimaryLabel(mode: SubmitMode, readinessScore: number) {
  if (mode === "supplement") return "Gửi lại hồ sơ bổ sung";
  if (readinessScore < 80) return "Xác nhận nộp hồ sơ";
  return "Xác nhận nộp hồ sơ";
}

function getIconClass(tone: CriterionSummary["tone"]) {
  if (tone === "success") return "text-emerald-600";
  if (tone === "error") return "text-rose-600";
  if (tone === "warning") return "text-amber-600";
  return "text-[#0057C2]";
}
