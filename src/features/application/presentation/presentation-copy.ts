import type { Criterion } from "@/lib/api/types";
import type { PresentationTone } from "./presentation-types";

export const criterionDisplayLabels: Partial<Record<Criterion, string>> = {
  ethics: "Đạo đức tốt",
  academic: "Học tập tốt",
  physical: "Thể lực tốt",
  volunteer: "Tình nguyện tốt",
  integration: "Hội nhập tốt",
  priority: "Thành tích ưu tiên",
  collective: "Tập thể",
};

export const requirementLabels: Record<string, string> = {
  conduct_score: "Điểm rèn luyện",
  no_violation: "Tình trạng vi phạm",
  political_theory_competition: "Cuộc thi lý luận chính trị",
  exemplary_youth: "Thanh niên tiên tiến",
  good_person_good_deed: "Gương người tốt, việc tốt",
  recognized_courageous_action: "Hành động dũng cảm được ghi nhận",
  other_ethics_achievement: "Thành tích đạo đức khác",
  academic_gpa: "GPA/điểm học tập",
  no_f_grade: "Tình trạng điểm F",
  academic_period_valid: "Năm học xét",
  student_research: "Nghiên cứu khoa học",
  academic_competition: "Cuộc thi học thuật",
  journal_article: "Bài báo khoa học",
  conference_paper: "Báo cáo hội nghị",
  thesis_or_capstone: "Khóa luận/đồ án",
  innovation_product: "Sản phẩm sáng tạo",
  academic_team: "Đội tuyển học thuật",
  academic_award: "Giải thưởng học thuật",
  other_academic_achievement: "Thành tích học thuật khác",
  physical_course_result: "Kết quả Giáo dục thể chất",
  healthy_student_title: "Danh hiệu Sinh viên khỏe",
  sports_activity_or_award: "Hoạt động hoặc giải thưởng thể thao",
  sports_team_member: "Thành viên đội tuyển thể thao",
  regular_sports_training: "Rèn luyện thể thao thường xuyên",
  recognized_campaign: "Chiến dịch tình nguyện được ghi nhận",
  accumulated_volunteer_days: "Số ngày tình nguyện tích lũy",
  volunteer_award: "Khen thưởng tình nguyện",
  activity_count: "Số hoạt động tình nguyện",
  foreign_language: "Ngoại ngữ",
  skills_or_union_training: "Kỹ năng hoặc tập huấn Đoàn - Hội",
  international_exchange: "Giao lưu quốc tế",
  foreign_language_or_integration_competition: "Cuộc thi ngoại ngữ hoặc hội nhập",
  student_union_achievement: "Thành tích Đoàn - Hội",
};

export const fieldLabels: Record<string, string> = {
  language: "Ngôn ngữ",
  resultForm: "Hình thức kết quả",
  certificateType: "Loại chứng chỉ",
  score: "Điểm",
  level: "Trình độ",
  equivalentLevel: "Mức tương đương",
  issuedDate: "Ngày cấp",
  expiryDate: "Ngày hết hạn",
  schoolYear: "Năm học",
  validityPeriod: "Thời hạn hiệu lực",
  source: "Nguồn dữ liệu",
  programName: "Tên khóa học",
  trainingType: "Loại tập huấn",
  skillCategory: "Nhóm kỹ năng",
  organizer: "Đơn vị tổ chức",
  organizerLevel: "Cấp tổ chức",
  startDate: "Ngày bắt đầu",
  endDate: "Ngày kết thúc",
  completionStatus: "Trạng thái hoàn thành",
  evidence: "Minh chứng",
  activityName: "Tên hoạt động",
  activityType: "Loại hoạt động",
  domesticOrInternational: "Trong nước/quốc tế",
  participationRole: "Vai trò tham gia",
  competitionName: "Tên cuộc thi",
  competitionType: "Loại cuộc thi",
  languageUsed: "Ngôn ngữ sử dụng",
  achievement: "Thành tích",
  achievementName: "Tên thành tích",
  issuingUnit: "Đơn vị cấp",
  issuingLevel: "Cấp đơn vị cấp",
};

export const unknownRequirementLabel = "Điều kiện theo cấu hình hiện tại";
export const unknownSourceLabel = "Nguồn dữ liệu khác";
export const unknownStatusLabel = "Đang cập nhật trạng thái";
export const unknownEvidenceLabel = "Đang cập nhật minh chứng";

export function getCriterionDisplayLabel(criterion?: string | null) {
  return criterionDisplayLabels[criterion as Criterion] ?? "Tiêu chí";
}

export function isFriendlyVietnameseTitle(value?: string | null) {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("_")) return false;
  if (/^[A-Z0-9_:-]+$/.test(trimmed)) return false;
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(trimmed);
}

export function toneForStatus(status?: string | null): PresentationTone {
  if (!status) return "neutral";
  if (
    ["accepted", "verified", "ready", "ready_for_precheck", "passed", "completed"].includes(status)
  ) {
    return "good";
  }
  if (["rejected", "failed", "error"].includes(status)) return "danger";
  if (
    ["supplement_required", "needs_verification", "precheck_warning", "declared"].includes(status)
  ) {
    return "warning";
  }
  if (["under_review", "submitted", "processing", "resolution_needed"].includes(status))
    return "info";
  return "neutral";
}
