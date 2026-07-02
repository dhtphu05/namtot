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
  waiting: "Cho xet",
  reviewing: "Dang xet",
  supplement_required: "Can bo sung",
  accepted: "Da duyet",
  rejected: "Khong dat",
  resolution_needed: "Can hoi dong",
};

export type ReviewTaskListItem = {
  id: string;
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
};

export type ReviewTaskEvidence = {
  id: string;
  evidenceName: string;
  criterion: Criterion;
  sourceType: "metric_input" | "manual_upload" | "event_import" | "collective_import";
  status: EvidenceStatus;
  confidence?: number | null;
  note?: string | null;
  reviewerNote?: string | null;
  createdAt: string;
  updatedAt?: string;
  files?: ReviewTaskEvidenceFile[];
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
  decisionHistory?: ReviewDecisionHistoryItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type SubmitReviewDecisionRequest = {
  decision: "accepted" | "rejected" | "resolution_needed";
  note: string;
  evidenceDecisions?: Array<{
    evidenceId: string;
    status: "accepted" | "rejected" | "resolution_needed";
    note?: string;
  }>;
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
