import type { Pagination } from "@/lib/api/types";

export type Role =
  "student" | "class_representative" | "officer" | "manager" | "committee" | "admin";

export type Level = "school" | "university" | "city" | "central";

export type Criterion =
  "ethics" | "academic" | "physical" | "volunteer" | "integration" | "priority" | "collective";

export type ApplicationStatus =
  | "draft"
  | "prechecked"
  | "ready_to_submit"
  | "submitted"
  | "under_review"
  | "supplement_required"
  | "resolution_needed"
  | "completed"
  | "rejected";

export type EvidenceStatus =
  | "draft"
  | "pending_indexing"
  | "indexed"
  | "needs_supplement"
  | "under_review"
  | "accepted"
  | "rejected"
  | "resolution_needed";

export type ReviewTaskStatus =
  "waiting" | "reviewing" | "supplement_required" | "accepted" | "rejected" | "resolution_needed";

export type ReviewDecision = "accepted" | "rejected" | "supplement_required" | "resolution_needed";

export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
  meta: {
    requestId?: string;
    pagination?: Pagination;
  };
};

export type QueryValue = string | number | boolean | null | undefined;

export type ReviewTaskListParams = {
  criterion?: Criterion;
  status?: ReviewTaskStatus;
  targetLevel?: Level;
  faculty?: string;
  className?: string;
  riskLevel?: "low" | "medium" | "high";
  aiConfidenceMax?: number;
  dueSoon?: boolean;
  overdue?: boolean;
  supplementRequired?: boolean;
  resolutionNeeded?: boolean;
  assignedToMe?: boolean;
  page?: number;
  limit?: number;
  q?: string;
};

export const criterionLabels: Record<Criterion, string> = {
  ethics: "Dao duc tot",
  academic: "Hoc tap tot",
  physical: "The luc tot",
  volunteer: "Tinh nguyen tot",
  integration: "Hoi nhap tot",
  priority: "Uu tien / bo sung",
  collective: "Tap the",
};

export const levelLabels: Record<Level, string> = {
  school: "Cap Truong",
  university: "Cap Dai hoc",
  city: "Cap Thanh pho",
  central: "Cap Trung uong",
};

export const taskStatusLabels: Record<ReviewTaskStatus, string> = {
  waiting: "Chờ xét",
  reviewing: "Đang xét",
  supplement_required: "Cần bổ sung",
  accepted: "Đạt",
  rejected: "Không đạt",
  resolution_needed: "Cần hội đồng xử lý",
};

export type ReviewTaskListItem = {
  id: string;
  taskId?: string;
  applicationId: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  faculty?: string | null;
  className?: string | null;
  schoolYear: string;
  targetLevel: Level;
  applicationStatus: ApplicationStatus;
  criterion: Criterion;
  status: ReviewTaskStatus;
  assignedOfficerId?: string | null;
  assignedOfficerName?: string | null;
  evidenceCount: number;
  supplementCount?: number;
  aiConfidence?: number | null;
  riskLevel?: "low" | "medium" | "high";
  dueDate?: string | null;
  officerSuggestedLevel?: Level | null;
  createdAt: string;
  updatedAt: string;
};

export type ReviewTaskListResponse = {
  items: ReviewTaskListItem[];
};

export type ReviewTaskEvidenceFile = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  url?: string | null;
  storageKey?: string | null;
  createdAt: string;
  uploadedAt?: string;
};

export type ReviewTaskEvidenceCard = {
  id: string;
  ocrText?: string | null;
  extractedFieldsJson?: unknown;
  warningsJson?: unknown;
  matchedEventId?: string | null;
  matchedKnowledgeItemIds?: unknown;
  confidence?: number | null;
  aiSummary?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ReviewTaskEvidence = {
  id: string;
  evidenceName: string;
  criterion: Criterion;
  sourceType: "metric_input" | "manual_upload" | "event_import" | "collective_import";
  status: EvidenceStatus;
  indexingStatus?: string | null;
  confidence?: number | null;
  note?: string | null;
  reviewerNote?: string | null;
  createdAt: string;
  updatedAt?: string;
  files?: ReviewTaskEvidenceFile[];
  card?: ReviewTaskEvidenceCard | null;
  event?: {
    id: string;
    eventName: string;
    organizer?: string | null;
    organizerLevel?: Level | null;
  } | null;
};

export type ReviewTaskMetric = {
  id: string;
  criterion: Criterion;
  metricType: string;
  value: number | string;
  unit?: string | null;
  note?: string | null;
};

export type ReviewTaskChecklistItem = {
  id: string;
  label: string;
  passed?: boolean | null;
  required: boolean;
  note?: string | null;
};

export type CriterionLevelRequirement = {
  key: string;
  label: string;
  status: "passed" | "failed" | "missing" | "needs_review" | "ai_processing";
  actualValue?: string | null;
  requiredValue?: string | null;
  source?: string | null;
  reason?: string | null;
};

export type CriterionLevelAssessment = {
  taskId: string;
  criterion: Criterion;
  targetLevel?: Level | null;
  levels: Array<{
    level: Level;
    status: "passed" | "failed" | "missing" | "needs_review" | "ai_processing";
    score?: number | null;
    requirements: CriterionLevelRequirement[];
    summary: string;
  }>;
  suggestedCriterionLevel?: Level | null;
  humanConfirmationRequired: boolean;
};

export type ReviewDecisionHistoryItem = {
  id: string;
  decision: ReviewDecision;
  note: string;
  actorId?: string;
  actorName: string;
  actorRole?: Role;
  createdAt: string;
};

export type ReviewTaskDetail = {
  id: string;
  application: {
    id: string;
    schoolYear: string;
    applicationType: "individual" | "collective";
    targetLevel: Level;
    status: ApplicationStatus;
    submittedAt?: string | null;
    finalStatus?: string | null;
    student: {
      id: string;
      fullName: string;
      studentCode: string;
      email: string;
      faculty?: string | null;
      className?: string | null;
    };
  };
  criterion: Criterion;
  status: ReviewTaskStatus;
  assignedOfficer?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  evidences: ReviewTaskEvidence[];
  metrics: ReviewTaskMetric[];
  checklist?: ReviewTaskChecklistItem[];
  criterionLevelAssessment?: CriterionLevelAssessment | null;
  officerSuggestedLevel?: Level | null;
  levelAssessmentJson?: unknown;
  decisionReason?: string | null;
  supplementRequestJson?: unknown;
  decisionHistory?: ReviewDecisionHistoryItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type SubmitReviewDecisionRequest = {
  decision: "accepted" | "rejected" | "supplement_required" | "resolution_needed";
  officerSuggestedLevel?: Level | null;
  levelAssessmentJson?: Record<string, unknown>;
  supplementRequestJson?: Record<string, unknown>;
  note: string;
  evidenceDecisions?: Array<{
    evidenceId: string;
    status: "accepted" | "rejected" | "needs_supplement" | "resolution_needed";
    note?: string;
  }>;
  evidenceAssessments?: Array<{
    evidenceId: string;
    assessment: "valid" | "invalid" | "needs_supplement" | "ambiguous";
    note?: string;
    tags?: string[];
  }>;
};

export type OfficerDashboardResponse = {
  officer: {
    id: string;
    fullName: string;
    specializations: Criterion[];
  };
  summary: {
    totalAssigned: number;
    waiting: number;
    reviewing: number;
    supplementRequired: number;
    accepted: number;
    rejected: number;
    resolutionNeeded: number;
    aiLowConfidence: number;
    overdue: number;
    dueSoon: number;
  };
  priorityTasks: Array<{
    taskId: string;
    applicationId: string;
    studentName: string;
    studentCode: string;
    criterion: Criterion;
    targetLevel: Level;
    status: ReviewTaskStatus;
    aiConfidence?: number | null;
    riskLevel: "low" | "medium" | "high";
    dueDate?: string | null;
    updatedAt: string;
  }>;
  bottleneckByCriterion: Array<{ criterion: Criterion; total: number; waiting: number }>;
  recentActivity: unknown[];
};

export type SubmitReviewDecisionResponse = {
  taskId: string;
  status: ReviewTaskStatus;
  applicationId: string;
  applicationStatus: ApplicationStatus;
};

export type RequestSupplementRequest = {
  note: string;
  deadline?: string | null;
  evidenceIds?: string[];
};

export type RequestSupplementResponse = {
  taskId: string;
  status: "supplement_required";
  applicationId: string;
  applicationStatus: "supplement_required";
  notificationCreated?: boolean;
};

export type EscalateResolutionRequest = {
  reason: string;
  evidenceIds?: string[];
};

export type EscalateResolutionResponse = {
  taskId: string;
  status: "resolution_needed";
  resolutionCaseId?: string;
  applicationId: string;
  applicationStatus: "resolution_needed";
};
