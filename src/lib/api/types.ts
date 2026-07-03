export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

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
    [key: string]: unknown;
  };
};

export interface ApiFailure {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
  meta: {
    requestId?: string;
  };
}

export type Role =
  | "student"
  | "class_representative"
  | "officer"
  | "manager"
  | "committee"
  | "admin";

export interface SafeUser {
  id: string;
  email: string;
  role: Role;
  fullName: string;
  studentCode: string | null;
  className: string | null;
  faculty: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  officerSpecializations?: Array<{
    criterion: Criterion;
    facultyScope?: string | null;
    isActive?: boolean;
  }>;
}

export interface LoginData {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

// Phase 2 Shared Types
export type Criterion = 'ethics' | 'academic' | 'physical' | 'volunteer' | 'integration' | 'priority' | 'collective';
export type Level = 'school' | 'university' | 'city' | 'central';
export type FinalStatus = 'pending' | 'passed' | 'failed' | 'partially_passed';

export type ApplicationStatus =
  | 'draft'
  | 'prechecked'
  | 'ready_to_submit'
  | 'submitted'
  | 'under_review'
  | 'supplement_required'
  | 'resolution_needed'
  | 'completed'
  | 'rejected';

export type EvidenceSourceType = 'metric_input' | 'event_import' | 'manual_upload' | 'collective_import';

export type IndexingStatus =
  | 'not_started'
  | 'uploaded'
  | 'pending_indexing'
  | 'ocr_processing'
  | 'extracting'
  | 'checking_registry'
  | 'indexed'
  | 'failed'
  | 'needs_manual_review';

export type EvidenceStatus =
  | 'draft'
  | 'pending_indexing'
  | 'indexed'
  | 'needs_supplement'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'resolution_needed';

export const levelLabel: Record<Level, string> = {
  school: "Cấp Trường",
  university: "Cấp Đại học Đà Nẵng",
  city: "Cấp Thành phố",
  central: "Cấp Trung ương"
};

export const criterionLabel: Record<Criterion, string> = {
  ethics: "Đạo đức tốt",
  academic: "Học tập tốt",
  physical: "Thể lực tốt",
  volunteer: "Tình nguyện tốt",
  integration: "Hội nhập tốt",
  priority: "Thành tích ưu tiên",
  collective: "Tập thể"
};

export const applicationStatusLabel: Record<ApplicationStatus, string> = {
  draft: "Bản nháp",
  prechecked: "Đã tiền kiểm",
  ready_to_submit: "Sẵn sàng nộp",
  submitted: "Đã nộp",
  under_review: "Đang xét duyệt",
  supplement_required: "Cần bổ sung",
  resolution_needed: "Hồ sơ mập mờ",
  completed: "Hoàn tất",
  rejected: "Từ chối"
};

export const evidenceStatusLabel: Record<EvidenceStatus, string> = {
  draft: "Bản nháp",
  pending_indexing: "Chờ OCR/Index",
  indexed: "Đã bóc tách",
  needs_supplement: "Cần bổ sung",
  under_review: "Đang xét duyệt",
  accepted: "Đã duyệt",
  rejected: "Từ chối",
  resolution_needed: "Hồ sơ mập mờ"
};

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type EventStatus = 'draft' | 'active' | 'archived';
export type MetricType =
  | 'gpa'
  | 'conduct_score'
  | 'physical_score'
  | 'volunteer_days'
  | 'foreign_language_score';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface ApplicationMetric {
  id: string;
  applicationId: string;
  metricType: MetricType;
  value: number;
  scale: number | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PrecheckCriterionResult {
  criterion: Criterion;
  status: FinalStatus | string;
  score?: number;
  passed?: boolean;
  reasons?: string[];
  warnings?: string[];
  evidenceIds?: string[];
  [key: string]: unknown;
}

export interface PrecheckMissingItem {
  criterion?: Criterion;
  code?: string;
  message?: string;
  severity?: 'info' | 'warning' | 'error' | string;
  [key: string]: unknown;
}

export interface PrecheckResult {
  applicationId: string;
  level: Level;
  readinessScore: number;
  readyToSubmit: boolean;
  criteriaResults: PrecheckCriterionResult[];
  missingItems: PrecheckMissingItem[];
  warnings: string[];
  nextBestAction: string;
  humanConfirmationRequired: boolean;
  createdAt: string;
}

export interface EventRegistryItem {
  id: string;
  eventName: string;
  criterion: Criterion;
  organizer: string;
  organizerLevel: Level;
  startDate: string | null;
  endDate: string | null;
  convertedValue: number | null;
  convertedUnit: string | null;
  eligibleLevels: Level[];
  participantCount: number;
  rosterIndexed: boolean;
  status: EventStatus;
  sampleCertificateFile?: {
    publicUrl?: string | null;
    [key: string]: unknown;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventParticipantCheck {
  found: boolean;
  participant: {
    studentCode: string;
    studentName: string | null;
    className: string | null;
    faculty: string | null;
    convertedValue: number | null;
    [key: string]: unknown;
  } | null;
  canImport: boolean;
  reason: string | null;
}

export interface EvidenceResponse {
  id: string;
  applicationId?: string | null;
  collectiveProfileId?: string | null;
  evidenceName: string;
  criterion: Criterion;
  sourceType: EvidenceSourceType;
  status: EvidenceStatus;
  indexingStatus: IndexingStatus;
  collectiveCriterion?: string;
  fileId?: string;
  jobId?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface Application {
  id: string;
  studentId: string;
  schoolYear: string;
  applicationType: "individual" | "collective";
  targetLevel: Level;
  status: ApplicationStatus;
  finalStatus?: string | null;
  readinessScore?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationState extends Application {
  lastUpdatedAt: string;
  submittedAt: string | null;
  currentDraftVersion: number;
  metrics?: ApplicationMetric[];
  reviewTasks?: ApplicationReviewTaskSummary[];
  progress?: number;
  basicInfo?: {
    fullName?: string;
    studentCode?: string | null;
    className?: string | null;
    faculty?: string | null;
    phone?: string | null;
    [key: string]: unknown;
  };
}

export interface ApplicationReviewTaskSummary {
  id: string;
  criterion: Criterion;
  status: ReviewTaskStatus | string;
  decision?: string | null;
  officerNote?: string | null;
  decisionReason?: string | null;
  supplementRequestJson?: {
    reason?: string;
    deadline?: string | null;
    evidenceIds?: string[];
    requestedFields?: string[];
    [key: string]: unknown;
  } | null;
  dueDate?: string | null;
  updatedAt?: string | null;
}

export interface CurrentApplicationEmpty {
  application: null;
  state: 'not_started';
  schoolYear: string;
}

export interface Metric {
  id: string;
  applicationId: string;
  criterion: Criterion;
  metricType: string;
  valueNumber?: number | null;
  valueText?: string | null;
  unit?: string | null;
  source?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MetricInput {
  criterion: "academic" | "ethics" | "physical" | "volunteer" | "integration";
  metricType:
    | "gpa"
    | "conduct_score"
    | "physical_score"
    | "volunteer_days"
    | "foreign_language_score"
    | "language_certificate"
    | "integration_activity";
  value?: number;
  valueNumber?: number;
  valueText?: string;
  scale?: number | string;
  unit?: string;
  source?: "student_input";
}

export interface EvidenceFile {
  id: string;
  evidenceId: string;
  fileName: string;
  filePath?: string;
  fileSize: number;
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  applicationId: string;
  evidenceName: string;
  criterion: Criterion;
  sourceType: EvidenceSourceType;
  status: EvidenceStatus;
  description?: string | null;
  note?: string | null;
  confidence?: number | null;
  createdAt: string;
  updatedAt: string;
  files?: EvidenceFile[];
}

export interface CurrentApplicationResponse {
  application: ApplicationState;
  state: ApplicationStatus;
}

// Phase 3 Collective Types
export type CollectiveStatus = ApplicationStatus;

export interface CollectiveMemberInput {
  studentCode: string;
  studentName: string;
  className?: string;
  faculty?: string;
  participationStatus?: 'participated' | 'not_participated' | 'unknown';
  individualSv5tLevel?: 'none' | 'school' | 'university' | 'city' | 'central' | 'unknown';
  violationStatus?: 'none' | 'violated' | 'unknown';
  note?: string;
}

export interface CollectiveMember extends CollectiveMemberInput {
  id: string;
  collectiveId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RosterImportResult {
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  invalidRows: Array<{
    row: number;
    reason: string;
    data?: unknown;
  }>;
}

export interface CollectivePrecheckView {
  collectiveProfileId: string;
  level: Level;
  readinessScore: number;
  readyToSubmit: boolean;
  criteriaResults: unknown[];
  missingItems: unknown[];
  warnings: string[];
  nextBestAction: string;
  memberSummary?: CollectiveMemberSummary;
  evidenceSummary?: {
    total?: number;
    indexed?: number;
    accepted?: number;
    [key: string]: unknown;
  };
}

export interface CollectiveMemberSummary {
  totalMembers: number;
  participatedMembers: number;
  notParticipatedMembers: number;
  unknownParticipationCount: number;
  participationRate: number;
  schoolSv5tMembers: number;
  schoolSv5tRate: number;
  universitySv5tMembers: number;
  citySv5tMembers: number;
  centralSv5tMembers: number;
  higherLevelAchieverCount: number;
  violationCount: number;
  unknownViolationCount: number;
  [key: string]: unknown;
}

export interface CollectiveState {
  id: string;
  schoolYear: string;
  className: string;
  status: CollectiveStatus;
  targetLevel: Level;
  readinessScore: number;
  lastUpdatedAt: string;
  submittedAt: string | null;
  progress?: number;
  total?: number;
  registered?: number;
  sv5tTruong?: number;
  sv5tHigher?: number;
  memberSummary?: CollectiveMemberSummary;
  evidenceCount?: number;
  evidences?: Array<{
    collectiveCriterion?: string;
    evidence?: {
      id: string;
      evidenceName: string;
      criterion: Criterion;
      sourceType: EvidenceSourceType;
      status: EvidenceStatus;
      indexingStatus: IndexingStatus;
      createdAt: string;
      updatedAt: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;
  precheckResults?: unknown[];
  reviewTasks?: unknown[];
}

export interface CurrentCollectiveEmpty {
  collective: null;
  state: 'not_started';
  schoolYear: string;
}

export interface CurrentCollectiveResponse {
  collective: CollectiveState;
  state: CollectiveStatus;
}
