import type { PrecheckNextAction } from "@/lib/api/types";
import type { PresentationAction, PresentationActionKind } from "./presentation-types";

const knownActions = new Set<PresentationActionKind>([
  "choose_path",
  "declare_data",
  "find_official_data",
  "upload_evidence",
  "fix_missing_field",
  "wait_for_confirmation",
  "open_supplement",
  "run_precheck",
  "submit",
]);

const copy: Record<
  PresentationActionKind,
  { label: string; description: string; interactive: boolean }
> = {
  choose_path: {
    label: "Chọn hình thức đáp ứng",
    description: "Chọn một hình thức phù hợp với tiêu chí hiện tại.",
    interactive: true,
  },
  declare_data: {
    label: "Khai báo dữ liệu",
    description: "Nhập thông tin cần thiết cho điều kiện này.",
    interactive: true,
  },
  find_official_data: {
    label: "Tìm dữ liệu đã xác nhận",
    description: "Tra cứu danh sách hoặc hoạt động đã được xác nhận.",
    interactive: true,
  },
  upload_evidence: {
    label: "Tải minh chứng",
    description: "Bổ sung tệp minh chứng cho điều kiện này.",
    interactive: true,
  },
  fix_missing_field: {
    label: "Bổ sung thông tin",
    description: "Cập nhật thông tin còn thiếu trong minh chứng.",
    interactive: true,
  },
  wait_for_confirmation: {
    label: "Đang chờ cán bộ xác minh",
    description: "Bạn chưa cần thao tác ở bước này.",
    interactive: false,
  },
  open_supplement: {
    label: "Mở yêu cầu bổ sung",
    description: "Xem đúng tiêu chí đang được yêu cầu bổ sung.",
    interactive: true,
  },
  run_precheck: {
    label: "Kiểm tra hồ sơ",
    description: "Chạy kiểm tra sơ bộ trước khi nộp.",
    interactive: true,
  },
  submit: {
    label: "Nộp hồ sơ",
    description: "Gửi hồ sơ để cán bộ bắt đầu xét duyệt.",
    interactive: true,
  },
  unknown: {
    label: "Xem hồ sơ",
    description: "Mở hồ sơ để kiểm tra bước tiếp theo.",
    interactive: false,
  },
};

export function getActionPresentation(
  action?: Partial<PrecheckNextAction> | { type?: string | null; route?: string | null } | null,
): PresentationAction | undefined {
  if (!action) return undefined;
  const rawType = typeof action.type === "string" ? action.type : "";
  const normalizedType =
    rawType === "reviewer_verification" || rawType === "wait_system_confirmation"
      ? "wait_for_confirmation"
      : rawType;
  const type = knownActions.has(normalizedType as PresentationActionKind)
    ? (normalizedType as PresentationActionKind)
    : "unknown";
  const base = copy[type];
  return {
    type,
    label: base.label,
    description: base.description,
    isInteractive: base.interactive,
    route: typeof action.route === "string" ? action.route : undefined,
    criterion: "criterion" in action ? action.criterion : undefined,
    requirementKey:
      "requirementKey" in action && typeof action.requirementKey === "string"
        ? action.requirementKey
        : undefined,
  };
}
