import type { CriterionCompletionItem } from "@/lib/api/types";
import { getActionPresentation } from "./action-presentation";
import { getCriterionDisplayLabel, toneForStatus } from "./presentation-copy";
import { getRequirementGroupPresentation } from "./operator-semantics";
import type {
  CriterionDisplayInput,
  CriterionDisplayStatus,
  StudentCriterionDisplayState,
} from "./presentation-types";

export function getStudentCriterionDisplayState(
  input: CriterionDisplayInput,
): StudentCriterionDisplayState {
  const criterionLabel = getCriterionDisplayLabel(input.criterion);
  const finalStatus = normalizeString(input.application?.finalStatus);
  if (finalStatus && finalStatus !== "pending") {
    const accepted = ["passed", "partially_passed", "completed", "accepted"].includes(finalStatus);
    return {
      criterion: input.criterion,
      status: accepted ? "accepted" : "rejected",
      source: "final_result",
      label: accepted ? "Đã có kết quả đạt" : "Chưa đạt theo kết quả cuối cùng",
      description:
        input.application?.finalNote ??
        (accepted
          ? `${criterionLabel} đã được ghi nhận trong kết quả cuối cùng.`
          : `${criterionLabel} chưa đạt trong kết quả cuối cùng.`),
      tone: accepted ? "good" : "danger",
      completionDetail: getCompletionDetail(input.completion),
      canShowCompletionDetail: Boolean(input.completion),
      finalStatus,
      finalLevel: normalizeString(input.application?.finalLevel),
      finalNote: normalizeString(input.application?.finalNote),
    };
  }

  const decision = normalizeString(input.reviewTask?.decision);
  if (decision) {
    if (["accepted", "approved", "passed"].includes(decision)) {
      return {
        criterion: input.criterion,
        status: "accepted",
        source: "review_decision",
        label: "Đã xác nhận",
        description:
          input.reviewTask?.decisionReason ??
          input.reviewTask?.officerNote ??
          `${criterionLabel} đã được cán bộ/Hội đồng xác nhận.`,
        tone: "good",
        completionDetail: getCompletionDetail(input.completion),
        canShowCompletionDetail: Boolean(input.completion),
        reviewDecision: decision,
        reviewStatus: normalizeString(input.reviewTask?.status),
      };
    }
    if (["rejected", "failed"].includes(decision)) {
      return {
        criterion: input.criterion,
        status: "rejected",
        source: "review_decision",
        label: "Chưa phù hợp",
        description:
          input.reviewTask?.decisionReason ??
          input.reviewTask?.officerNote ??
          `${criterionLabel} chưa được xác nhận.`,
        tone: "danger",
        completionDetail: getCompletionDetail(input.completion),
        canShowCompletionDetail: Boolean(input.completion),
        reviewDecision: decision,
        reviewStatus: normalizeString(input.reviewTask?.status),
      };
    }
  }

  const supplement = input.supplementRequest ?? getSupplementFromReviewTask(input.reviewTask);
  if (supplement || input.completion?.status === "supplement_required") {
    return {
      criterion: input.criterion,
      status: "supplement_required",
      source: "supplement_request",
      label: "Cần bổ sung",
      description: supplement?.reason || "Cán bộ đã yêu cầu bổ sung hồ sơ cho tiêu chí này.",
      tone: "warning",
      primaryAction: getActionPresentation({
        type: "open_supplement",
        route: `/app/application?criterion=${input.criterion}`,
        criterion: input.criterion,
      }),
      completionDetail: getCompletionDetail(input.completion),
      canShowCompletionDetail: Boolean(input.completion),
      supplementReason: supplement?.reason ?? null,
    };
  }

  if (input.application?.status === "resolution_needed") {
    return {
      criterion: input.criterion,
      status: "resolution",
      source: "resolution",
      label: "Đang được xem xét thêm",
      description: "Hồ sơ đang chờ bước xử lý của Hội đồng.",
      tone: "info",
      primaryAction: getActionPresentation({ type: "wait_for_confirmation" }),
      completionDetail: getCompletionDetail(input.completion),
      canShowCompletionDetail: Boolean(input.completion),
    };
  }

  const reviewStatus = normalizeString(input.reviewTask?.status ?? input.application?.status);
  if (["submitted", "under_review", "assigned", "in_review"].includes(reviewStatus)) {
    return {
      criterion: input.criterion,
      status: "under_review",
      source: "review_status",
      label: "Đang xét duyệt",
      description: "Tiêu chí đang chờ cán bộ/Hội đồng kiểm tra.",
      tone: "info",
      primaryAction: getActionPresentation({ type: "wait_for_confirmation" }),
      completionDetail: getCompletionDetail(input.completion),
      canShowCompletionDetail: Boolean(input.completion),
      reviewStatus,
    };
  }

  return getCompletionDisplayState(input);
}

function getCompletionDisplayState(input: CriterionDisplayInput): StudentCriterionDisplayState {
  const completion = input.completion;
  const action = getActionPresentation(completion?.nextAction ?? input.precheckAction);
  const status = completion?.status ?? "not_started";
  const isUnsubmittedDraft =
    input.application?.submittedAt == null &&
    ["draft", "prechecked", "ready_to_submit"].includes(input.application?.status ?? "");

  if (
    isUnsubmittedDraft &&
    (status === "needs_verification" ||
      (completion?.completion.needsVerification ?? 0) > 0 ||
      (status === "not_started" && (completion?.evidenceCount ?? 0) > 0))
  ) {
    const hasEvidence = (completion?.evidenceCount ?? 0) > 0;
    return {
      criterion: input.criterion,
      status: "in_progress",
      source: "completion",
      label: hasEvidence ? "Đã có minh chứng" : "Đã ghi nhận",
      description: hasEvidence
        ? "Minh chứng đã được lưu trong hồ sơ."
        : "Thông tin đã được lưu trong hồ sơ.",
      tone: "info",
      primaryAction: action,
      completionDetail: undefined,
      canShowCompletionDetail: false,
    };
  }

  return {
    criterion: input.criterion,
    status: mapCompletionStatus(status),
    source: "completion",
    label: mapCompletionLabel(status),
    description: getCompletionDetail(completion) ?? "Chưa có dữ liệu hoàn thiện cho tiêu chí này.",
    tone: status === "needs_verification" ? "info" : toneForStatus(status),
    primaryAction: action,
    completionDetail: getCompletionDetail(completion),
    canShowCompletionDetail: Boolean(completion),
  };
}

function mapCompletionStatus(
  status: CriterionCompletionItem["status"] | string,
): CriterionDisplayStatus {
  if (status === "accepted" || status === "ready_for_precheck") return "ready";
  if (status === "needs_verification" || status === "precheck_warning") return "needs_verification";
  if (status === "under_review") return "under_review";
  if (status === "supplement_required") return "supplement_required";
  if (status === "rejected") return "rejected";
  if (status === "in_progress") return "in_progress";
  if (status === "not_started") return "not_started";
  return "unknown";
}

function mapCompletionLabel(status: CriterionCompletionItem["status"] | string) {
  if (status === "accepted") return "Đã xác nhận";
  if (status === "ready_for_precheck") return "Sẵn sàng kiểm tra";
  if (status === "needs_verification") return "Đã ghi nhận";
  if (status === "precheck_warning") return "Có lưu ý";
  if (status === "under_review") return "Đang xét duyệt";
  if (status === "supplement_required") return "Cần bổ sung";
  if (status === "rejected") return "Chưa phù hợp";
  if (status === "in_progress") return "Đang hoàn thiện";
  if (status === "not_started") return "Chưa bắt đầu";
  return "Đang cập nhật trạng thái";
}

function getCompletionDetail(completion?: CriterionCompletionItem | null) {
  if (!completion) return undefined;
  if (
    completion.completion.required > 0 &&
    completion.completion.satisfied >= completion.completion.required &&
    completion.completion.needsVerification > 0
  ) {
    return "Thông tin đã được ghi nhận.";
  }
  const group = completion.requirementGroups?.[0];
  if (group) return getRequirementGroupPresentation(group).progressLabel;
  const required = completion.completion?.required ?? 0;
  if (required <= 0) return "Chưa có điều kiện bắt buộc";
  if (completion.completion.satisfied >= required) return "Sẵn sàng kiểm tra";
  if (completion.completion.satisfied === 0) return "Chưa khai báo dữ liệu";
  return `Còn ${required - completion.completion.satisfied} mục cần hoàn thiện`;
}

function getSupplementFromReviewTask(input: CriterionDisplayInput["reviewTask"]) {
  const request = input?.supplementRequestJson;
  if (!request) return null;
  return {
    reason: request.reason ?? null,
    deadline: request.deadline ?? null,
    requestedFields: request.requestedFields ?? [],
  };
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
