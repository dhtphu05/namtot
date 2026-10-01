import type { RequirementGroup, RequirementItem } from "@/lib/api/types";
import { getRequirementPresentation } from "./requirement-presentation";
import type { RequirementGroupLike, RequirementGroupPresentation } from "./presentation-types";

export function getRequirementGroupPresentation(
  group?: RequirementGroupLike | RequirementGroup | null,
): RequirementGroupPresentation {
  const requirements = (group?.requirements ?? []) as RequirementItem[];
  const selected = requirements.filter((requirement) =>
    ["declared", "needs_verification", "verified"].includes(requirement.status),
  );
  const verified = requirements.filter((requirement) => requirement.status === "verified");
  const pending = requirements.filter((requirement) =>
    ["declared", "needs_verification"].includes(requirement.status),
  );
  const operator = group?.operator ?? "all_of";
  const requiredCount = getRequiredCount(group, requirements.length);

  if (group?.optional) {
    return {
      key: group.key,
      label: group.title || "Nhóm điều kiện",
      description: "Không bắt buộc ở cấp hiện tại",
      progressLabel: "Không bắt buộc ở cấp hiện tại",
      tone: "neutral",
      selectedCount: selected.length,
      requiredCount,
    };
  }

  if (operator === "one_of") {
    if (!selected.length) {
      return {
        key: group?.key ?? "",
        label: group?.title || "Nhóm điều kiện",
        description: `Chọn ít nhất một trong ${requirements.length || "các"} hình thức`,
        progressLabel: "Chưa chọn hình thức đáp ứng",
        helper: `Chọn ít nhất một trong ${requirements.length || "các"} hình thức`,
        tone: "warning",
        selectedCount: 0,
        requiredCount: 1,
      };
    }
    if (verified.length) {
      return {
        key: group?.key ?? "",
        label: group?.title || "Nhóm điều kiện",
        description: "Một hình thức đã được xác nhận",
        progressLabel: "1 hình thức đã khai báo",
        tone: "good",
        selectedCount: selected.length,
        requiredCount: 1,
      };
    }
    return {
      key: group?.key ?? "",
      label: group?.title || "Nhóm điều kiện",
      description: `Đang hoàn thiện: ${getRequirementPresentation(selected[0]).label}`,
      progressLabel: selected.every((item) => item.status === "declared")
        ? "1 hình thức đã khai báo"
        : `Đang hoàn thiện: ${getRequirementPresentation(selected[0]).label}`,
      helper: `Chọn ít nhất một trong ${requirements.length || "các"} hình thức`,
      tone: "warning",
      selectedCount: selected.length,
      requiredCount: 1,
    };
  }

  const aggregation = requirements.find((requirement) => requirement.aggregation)?.aggregation;
  if (operator === "activity_aggregation" || aggregation) {
    const threshold = aggregation?.threshold ?? requiredCount;
    const unit = aggregation?.unit ?? "mục";
    const verifiedTotal = aggregation?.verifiedTotal ?? 0;
    const pendingTotal = aggregation?.pendingVerificationTotal ?? 0;
    return {
      key: group?.key ?? "",
      label: group?.title || "Nhóm điều kiện",
      description: `Đã ghi nhận ${verifiedTotal + pendingTotal}/${threshold} ${unit}`,
      progressLabel:
        verifiedTotal >= threshold
          ? "Đã ghi nhận đủ mục tiêu"
          : `Đã ghi nhận ${verifiedTotal + pendingTotal}/${threshold} ${unit}`,
      tone: verifiedTotal >= threshold ? "good" : pendingTotal > 0 ? "warning" : "neutral",
      selectedCount: verifiedTotal,
      requiredCount: threshold,
    };
  }

  if (operator === "at_least_n") {
    if (verified.length >= requiredCount) {
      return baseGroup(
        group,
        "Đã ghi nhận đủ",
        "Đã khai báo đủ thông tin",
        "good",
        selected.length,
        requiredCount,
      );
    }
    if (selected.length > 0) {
      return baseGroup(
        group,
        `Còn ${Math.max(0, requiredCount - selected.length)} mục cần hoàn thiện`,
        `Cần đạt ít nhất ${requiredCount} điều kiện`,
        pending.length > 0 ? "warning" : "neutral",
        selected.length,
        requiredCount,
      );
    }
    return baseGroup(
      group,
      "Chưa khai báo dữ liệu",
      `Cần đạt ít nhất ${requiredCount} điều kiện`,
      "neutral",
      0,
      requiredCount,
    );
  }

  if (!selected.length) {
    return baseGroup(
      group,
      "Chưa khai báo dữ liệu",
      "Cần đủ các điều kiện bắt buộc",
      "neutral",
      0,
      requiredCount,
    );
  }
  if (verified.length >= requiredCount) {
    return baseGroup(
      group,
      "Đã ghi nhận đủ",
      "Đã khai báo đủ thông tin",
      "good",
      selected.length,
      requiredCount,
    );
  }
  if (selected.length >= requiredCount && pending.length > 0) {
    return baseGroup(
      group,
      "Đã khai báo đủ thông tin",
      "Cần đủ các điều kiện bắt buộc",
      "warning",
      selected.length,
      requiredCount,
    );
  }
  return baseGroup(
    group,
    `Còn ${Math.max(0, requiredCount - selected.length)} mục cần hoàn thiện`,
    "Cần đủ các điều kiện bắt buộc",
    "warning",
    selected.length,
    requiredCount,
  );
}

function getRequiredCount(
  group: RequirementGroupLike | RequirementGroup | null | undefined,
  total: number,
) {
  if (group?.operator === "one_of") return 1;
  if (group?.operator === "at_least_n") return Math.max(1, group.requiredCount ?? 1);
  return Math.max(0, group?.requiredCount ?? total);
}

function baseGroup(
  group: RequirementGroupLike | RequirementGroup | null | undefined,
  progressLabel: string,
  description: string,
  tone: RequirementGroupPresentation["tone"],
  selectedCount: number,
  requiredCount: number,
): RequirementGroupPresentation {
  return {
    key: group?.key ?? "",
    label: group?.title || "Nhóm điều kiện",
    description,
    progressLabel,
    tone,
    selectedCount,
    requiredCount,
  };
}
