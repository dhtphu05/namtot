import type { ApplicationStatus } from "@/lib/api/types";

export type StudentApplicationStatus = ApplicationStatus | "not_started" | "draft_supplement" | string;

export const applicationStatusLabel: Record<string, string> = {
  not_started: "Chưa có hồ sơ",
  draft: "Bản nháp",
  prechecked: "Đã tiền kiểm",
  ready_to_submit: "Sẵn sàng nộp",
  submitted: "Đã nộp",
  under_review: "Đang xét duyệt",
  supplement_required: "Cần bổ sung",
  draft_supplement: "Đang bổ sung",
  resolution_needed: "Cần hội đồng xử lý",
  completed: "Hoàn tất",
  rejected: "Chưa đạt",
};

export const criterionResultStatusLabel: Record<string, string> = {
  complete: "Đủ dữ liệu",
  ready: "Đủ dữ liệu cơ bản",
  passed: "Đủ dữ liệu",
  passed_with_warning: "Cần cán bộ xác nhận",
  pending: "Cần cán bộ xác nhận",
  failed: "Cần bổ sung",
  needs_supplement: "Cần bổ sung",
  needs_officer_confirmation: "Cần cán bộ xác nhận",
  missing_evidence: "Chưa có minh chứng",
  ai_processing: "AI đang xử lý",
  ai_failed: "AI không đọc được",
  risky: "Cần kiểm tra thêm",
};

export function getApplicationStatusLabel(status?: StudentApplicationStatus | null) {
  if (!status) return "Chưa rõ";
  return applicationStatusLabel[String(status)] ?? "Chưa rõ";
}

export function getCriterionResultStatusLabel(status?: string | null) {
  if (!status) return "Cần cán bộ xác nhận";
  return criterionResultStatusLabel[status] ?? "Cần cán bộ xác nhận";
}

