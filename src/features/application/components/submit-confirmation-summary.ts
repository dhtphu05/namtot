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
      label: "Tệp chưa đọc được",
      explanation: "Bạn có thể mở tệp gốc hoặc tải lên bản rõ hơn.",
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
      label: "Đã ghi nhận",
      explanation: getUserFacingText(
        warnings[0] ?? reasons[0] ?? result?.status,
        "Thông tin đã được lưu trong hồ sơ của bạn.",
      ),
      tone: "brand",
      icon: Clock3,
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
      label: "Đã ghi nhận",
      explanation: `${evidenceCount} minh chứng đã được lưu trong hồ sơ.`,
      tone: "brand",
      icon: Clock3,
      requiredAttention: false,
    };
  }

  return {
    criterion,
    label: "Đã ghi nhận",
    explanation: "Thông tin hiện có đã được lưu trong hồ sơ.",
    tone: "brand",
    icon: Clock3,
    requiredAttention: false,
  };
}

function getMissingExplanation(item: PrecheckMissingItem) {
  return getPrecheckMissingMessage(item).description;
}
