import { AlertTriangle, CheckCircle2, Clock3, XCircle } from "lucide-react";
import type { Criterion, PrecheckMissingItem, PrecheckResult } from "@/lib/api/types";
import { getCriterionResultStatusLabel } from "@/lib/status-labels";
import { getPrecheckMissingMessage, getUserFacingText } from "@/lib/user-facing-messages";

export type CriterionSummary = {
  criterion: Criterion;
  label: string;
  explanation: string;
  tone: "brand" | "success" | "warning" | "error" | "muted";
  icon: typeof CheckCircle2;
  requiredAttention: boolean;
};

export function buildCriterionSummary(
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

  if (
    warnings.length > 0 ||
    result?.status === "needs_officer_confirmation" ||
    result?.status === "risky"
  ) {
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

  if (
    result?.status === "failed" ||
    result?.status === "needs_supplement" ||
    result?.passed === false
  ) {
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
      label: "Chờ kết quả kiểm tra",
      explanation: `${evidenceCount} minh chứng đã được ghi nhận. Hệ thống/cán bộ cần kiểm tra trước khi xác nhận tiêu chí.`,
      tone: "brand",
      icon: Clock3,
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
