export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  error: null;
  meta: {
    requestId?: string;
    pagination?: Pagination;
    [key: string]: unknown;
  };
}

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
  | 'not_started'
  | 'draft'
  | 'prechecked'
  | 'ready_to_submit'
  | 'submitted'
  | 'supplement_required'
  | 'under_review'
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

export interface ApplicationState {
  id: string;
  schoolYear: string;
  applicationType: "individual" | "collective";
  status: ApplicationStatus;
  targetLevel: Level;
  readinessScore: number;
  lastUpdatedAt: string;
  submittedAt: string | null;
  currentDraftVersion: number;
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

export interface CurrentApplicationEmpty {
  application: null;
  state: 'not_started';
  schoolYear: string;
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
  total: number;
  participated: number;
  notParticipated?: number;
  unknownParticipation?: number;
  sv5tSchool?: number;
  sv5tHigher?: number;
  noViolation?: number;
  violated?: number;
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
