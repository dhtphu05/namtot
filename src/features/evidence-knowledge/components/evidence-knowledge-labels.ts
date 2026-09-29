import type { Criterion, Level } from "@/lib/api/types";
import { getCoreCriterionLabel } from "@/lib/criteria-presentation";
import type { EvidenceKnowledgeApprovalSource, EvidenceKnowledgeMatchReason } from "../types";

export const criterionLabels: Record<Criterion, string> = {
  ethics: getCoreCriterionLabel("ethics"),
  academic: getCoreCriterionLabel("academic"),
  physical: getCoreCriterionLabel("physical"),
  volunteer: getCoreCriterionLabel("volunteer"),
  integration: getCoreCriterionLabel("integration"),
  priority: "Ưu tiên / bổ sung",
  collective: "Tập thể",
};

export const levelLabels: Record<Level, string> = {
  school: "Cấp Trường",
  university: "Cấp Đại học",
  city: "Cấp Thành phố",
  central: "Cấp Trung ương",
};

export function getCriterionLabel(criterion?: Criterion | null) {
  return criterion ? (criterionLabels[criterion] ?? criterion) : "Chưa có dữ liệu";
}

export function getLevelLabel(level?: Level | null) {
  return level ? (levelLabels[level] ?? level) : "Chưa xác định";
}

export function getApprovalSourceLabel(source: EvidenceKnowledgeApprovalSource) {
  return source === "resolution" ? "Hội đồng xác nhận" : "Cán bộ chuyên trách xác nhận";
}

export function getApprovalSourcesLabel(sources: EvidenceKnowledgeApprovalSource[]) {
  if (!sources.length) return "Đã chấp nhận";
  return sources.map(getApprovalSourceLabel).join(", ");
}

export function getMatchReasonLabel(reason: EvidenceKnowledgeMatchReason) {
  const labels: Record<EvidenceKnowledgeMatchReason, string> = {
    canonical_title: "trùng tên sự kiện",
    verified_alias: "trùng tên gọi khác",
    acronym: "trùng tên viết tắt",
    organizer: "trùng đơn vị tổ chức",
    year: "trùng năm",
    ocr: "trùng nội dung đọc từ minh chứng",
    typo: "gần đúng tên sự kiện",
  };
  return labels[reason];
}

export function formatYear(value?: number | null) {
  return value ? String(value) : "Chưa xác định năm";
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Chưa có dữ liệu";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
