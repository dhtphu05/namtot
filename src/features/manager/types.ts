import type { CollectiveMemberSummary, CollectiveStatus, FinalStatus } from "@/lib/api/types";
import type {
  ApplicationStatus,
  Criterion,
  Level,
  ReviewTaskStatus,
  Role,
} from "@/features/review/types";

export type ManagerApplicationsParams = {
  page?: number;
  limit?: number;
  status?: ApplicationStatus;
  level?: Level;
  criterion?: Criterion;
  q?: string;
  eligibilityVerification?: "pending";
  workspaceId?: string;
  lifecycle?: ApplicationLifecycleFilter;
  archive?: ApplicationArchiveFilter;
};

export type ApplicationLifecycleFilter = "active" | "cancelled" | "all";
export type ApplicationArchiveFilter = "exclude" | "only" | "all";

export type ManagerApplicationLifecycleFields = {
  cancelledAt: string | null;
  cancelReason: string | null;
  archivedAt: string | null;
  archiveReason: string | null;
};

export type ApplicationFinalDecisionHistoryItem = {
  id: string;
  finalStatus: FinalStatus;
  finalLevel: Level | null;
  finalNote: string | null;
  finalizedAt: string | null;
  finalizedBy: { id: string; fullName: string } | null;
  supersededAt: string;
  supersededBy: { id: string; fullName: string } | null;
  supersedeReason: string;
};

export type CancelApplicationInput = { reason: string };
export type ReopenCancelledApplicationInput = { reason: string };
export type ArchiveApplicationInput = { reason?: string };

export type ManagerEligibilityVerificationStatus =
  "ELIGIBLE" | "NOT_ELIGIBLE" | "NEEDS_VERIFICATION";

export type EligibilityVerificationQueueItem = {
  id: string;
  schoolYear: string;
  student: { fullName: string; studentCode: string | null; className: string | null };
  school: { code: string; name: string };
  autoStatus: ManagerEligibilityVerificationStatus;
  effectiveStatus: ManagerEligibilityVerificationStatus;
  reasons: string[];
};

export type ManagerEligibilityVerificationQueueResponse = {
  items: EligibilityVerificationQueueItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type ManagerEligibilityVerificationDetail = Omit<EligibilityVerificationQueueItem, "id"> & {
  applicationId: string;
  route: "UDN_PREREQUISITE";
  existingDecision: {
    decision: "APPROVED" | "REJECTED";
    decidedAt: string;
  } | null;
  candidates: Array<{
    fullName: string;
    studentCode: string;
    className: string | null;
    institution: { code: string; name: string };
  }>;
};

export type VerifyEligibilityInput = {
  decision: "APPROVED" | "REJECTED";
  reason: string;
};

export type ManagerResultFilters = {
  workspaceId?: string;
  lifecycle?: ApplicationLifecycleFilter;
  archive?: ApplicationArchiveFilter;
  status?: ApplicationStatus;
  schoolYear?: string;
  finalStatus?: FinalStatus | "unfinalized";
  finalLevel?: Level;
  targetLevel?: Level;
  faculty?: string;
  className?: string;
  search?: string;
  resultView?:
    | "ready"
    | "downgraded"
    | "not_eligible"
    | "resolution"
    | "supplement"
    | "overdue"
    | "recently_finalized"
    | "unfinished";
  page?: number;
  pageSize?: number;
  sortBy?:
    | "lastActivityAt"
    | "updatedAt"
    | "newest"
    | "oldest"
    | "readiness_desc"
    | "unfinalized_first"
    | "target_level_desc";
  sortOrder?: "asc" | "desc";
};

export type ManagerCollectiveFilters = {
  schoolYear?: string;
  targetLevel?: Level;
  status?: CollectiveStatus;
  className?: string;
  faculty?: string;
  q?: string;
  page?: number;
  limit?: number;
};

export type ManagerCollectiveItem = {
  id: string;
  representativeId: string;
  className: string;
  schoolYear: string;
  targetLevel: Level;
  status: CollectiveStatus;
  readinessScore: number;
  submittedAt?: string | null;
  finalLevel?: Level | null;
  finalStatus: FinalStatus;
  finalNote?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  representative?: {
    id: string;
    fullName: string;
    email?: string | null;
    faculty?: string | null;
  } | null;
  memberSummary?: CollectiveMemberSummary;
  canFinalize: boolean;
  blockingReasons: string[];
  _count?: {
    members?: number;
    evidences?: number;
    reviewTasks?: number;
  };
};

export type ManagerCollectivesResponse = {
  items: ManagerCollectiveItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ManagerCollectiveAggregation = {
  canFinalize: boolean;
  blockingReasons: string[];
  blockers: Array<{
    reviewTaskId: string;
    status: ReviewTaskStatus;
    message?: string;
  }>;
};

export type FinalizeCollectiveInput = {
  finalStatus: Exclude<FinalStatus, "pending">;
  finalLevel?: Level | null;
  finalNote: string;
  overrideAggregation?: boolean;
  notifyRepresentative?: boolean;
};

export type ManagerApplicationListItem = {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  className?: string | null;
  faculty?: string | null;
  schoolYear?: string;
  targetLevel: Level;
  status: ApplicationStatus;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  archivedAt?: string | null;
  archiveReason?: string | null;
  progress: number;
  submittedAt?: string | null;
  updatedAt: string;
};

export type ReviewTaskSummary = {
  total: number;
  accepted: number;
  rejected: number;
  supplementRequired: number;
  resolutionNeeded: number;
  waiting: number;
  reviewing?: number;
};

export type ManagerResultItem = {
  applicationId: string;
  studentId: string;
  studentName: string;
  studentCode?: string | null;
  className?: string | null;
  faculty?: string | null;
  schoolName?: string | null;
  schoolYear: string;
  targetLevel: Level;
  suggestedLevel?: Level | null;
  suggestedFinalStatus?: FinalStatus | "pending";
  finalStatus: FinalStatus;
  finalLevel?: Level | null;
  finalNote?: string | null;
  applicationStatus: ApplicationStatus;
  readinessScore: number;
  submittedAt?: string | null;
  finalizedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  archivedAt?: string | null;
  archiveReason?: string | null;
  updatedAt: string;
  lastActivityAt: string;
  finalizedBy?: {
    id: string;
    fullName: string;
  } | null;
  reviewTaskSummary: ReviewTaskSummary;
  criterionStatuses?: Partial<
    Record<
      Criterion,
      {
        status: ReviewTaskStatus;
        officerSuggestedLevel?: Level | null;
      }
    >
  >;
  taskProgress?: {
    accepted: number;
    total: number;
  };
  canFinalize: boolean;
  blockingReasons: string[];
  topBlockerReason?: string | null;
};

export type ManagerResultsResponse = {
  items: ManagerResultItem[];
  summary?: {
    totalApplications: number;
    passedCity: number;
    notAchievedCity: number;
    unfinalized: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  sort?: {
    sortBy: string;
    sortOrder: "asc" | "desc";
  };
};

export type CommitteeInboxBucket =
  | "all"
  | "ready_to_finalize"
  | "downgraded"
  | "no_eligible_level"
  | "needs_resolution"
  | "supplement_required"
  | "overdue"
  | "recently_finalized";

export type CommitteeInboxNextAction =
  | "open_decision_console"
  | "finalize_city"
  | "finalize_university"
  | "finalize_school"
  | "finalize_failed"
  | "open_resolution_case"
  | "review_downgrade_reason"
  | "wait_for_supplement"
  | "send_reminder"
  | "reopen_final_result";

export type CommitteeInboxParams = {
  bucket?: CommitteeInboxBucket;
  page?: number;
  limit?: number;
  search?: string;
  targetLevel?: Extract<Level, "school" | "university" | "city">;
  suggestedLevel?: Extract<Level, "school" | "university" | "city"> | "none";
  status?: ApplicationStatus;
};

export type CommitteeInboxSummary = {
  readyToFinalize: number;
  downgraded: number;
  noEligibleLevel: number;
  needsResolution: number;
  supplementRequired: number;
  overdue: number;
  recentlyFinalized: number;
};

export type CommitteeInboxItem = {
  id: string;
  type: Exclude<CommitteeInboxBucket, "all">;
  applicationId: string;
  resolutionCaseId?: string | null;
  studentName?: string | null;
  studentCode?: string | null;
  className?: string | null;
  faculty?: string | null;
  targetLevel?: Extract<Level, "school" | "university" | "city">;
  suggestedLevel?: Extract<Level, "school" | "university" | "city"> | null;
  finalLevel?: Level | null;
  finalStatus?: FinalStatus;
  mainReason: string;
  blockers: string[];
  nextAction: CommitteeInboxNextAction;
  priority: "high" | "medium" | "low";
  updatedAt: string;
  dueAt?: string | null;
};

export type CommitteeInboxResponse = {
  summary: CommitteeInboxSummary;
  items: CommitteeInboxItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ManagerResultEvidenceFile = {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
};

export type ManagerResultEvidenceCard = {
  id: string;
  aiSummary?: string | null;
  confidence?: number | null;
  ocrText?: string | null;
  extractedFieldsJson?: unknown;
  warningsJson?: unknown;
  matchedEventId?: string | null;
  matchedKnowledgeItemIds?: unknown;
};

export type ManagerResultEvidence = {
  id: string;
  evidenceName: string;
  criterion: Criterion;
  sourceType: string;
  status: string;
  indexingStatus: string;
  confidence?: number | null;
  files: ManagerResultEvidenceFile[];
  evidenceCard?: ManagerResultEvidenceCard | null;
};

export type ManagerResultReviewTask = {
  id: string;
  criterion: Criterion;
  status: ReviewTaskStatus;
  decision?: string | null;
  officerNote?: string | null;
  officerSuggestedLevel?: Level | null;
  levelAssessmentJson?: unknown;
  decisionReason?: string | null;
  assignedOfficer?: {
    id: string;
    fullName: string;
  } | null;
  evidences: ManagerResultEvidence[];
};

export type ManagerCriterionSummaryItem = {
  status: string;
  decision?: string | null;
  officerSuggestedLevel?: Level | null;
  evidenceCount: number;
  acceptedEvidenceCount: number;
  warningCount: number;
  summary: string;
};

export type ManagerResultDetail = {
  application: {
    id: string;
    schoolYear: string;
    applicationType: string;
    targetLevel: Level;
    status: ApplicationStatus;
    readinessScore: number;
    submittedAt?: string | null;
    finalStatus: FinalStatus;
    finalLevel?: Level | null;
    finalNote?: string | null;
    finalizedAt?: string | null;
    updatedAt: string;
    lastActivityAt: string;
    finalizedBy?: {
      id: string;
      fullName: string;
    } | null;
  } & ManagerApplicationLifecycleFields & {
      cancelledBy: { id: string; fullName: string } | null;
      archivedBy: { id: string; fullName: string } | null;
    };
  finalDecisionHistory: ApplicationFinalDecisionHistoryItem[];
  student: {
    id: string;
    fullName: string;
    studentCode?: string | null;
    email?: string | null;
    phone?: string | null;
    className?: string | null;
    faculty?: string | null;
    avatarUrl?: string | null;
  };
  metrics: Array<{
    id?: string;
    metricType: string;
    value: number;
    scale?: number | null;
    verificationStatus?: string | null;
  }>;
  reviewTasks: ManagerResultReviewTask[];
  applicationEvidences: ManagerResultEvidence[];
  criterionSummary: Partial<Record<Criterion, ManagerCriterionSummaryItem>>;
  latestPrecheck?: unknown | null;
  latestCascade?: {
    id?: string;
    targetLevel?: Level;
    suggestedLevel?: Level | null;
    levelResultsJson?: unknown;
    humanConfirmationRequired?: boolean;
    createdAt?: string;
    [key: string]: unknown;
  } | null;
  resolutionCases: Array<{
    id: string;
    status: string;
    reason: string;
    committeeDecision?: string | null;
    evidenceId?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  auditTimeline: Array<{
    id: string;
    actorId?: string | null;
    actorName?: string | null;
    actorRole?: Role | null;
    action: string;
    targetType: string;
    targetId: string;
    note?: string | null;
    createdAt: string;
  }>;
  aggregation: {
    suggestedFinalStatus: FinalStatus | "pending";
    suggestedFinalLevel?: Level | null;
    reason: string;
    canFinalize: boolean;
    blockingIssues: Array<{
      type: string;
      message: string;
      criterion?: Criterion | null;
    }>;
  };
};

export type ManagerApplicationsResponse = {
  items: ManagerApplicationListItem[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
};

export type OfficerWorkload = {
  officerId: string;
  officerName: string;
  officerEmail?: string | null;
  role: Extract<Role, "officer" | "manager" | "committee" | "admin">;
  specializedCriteria: Criterion[];
  waiting: number;
  reviewing: number;
  supplementRequired: number;
  resolutionNeeded: number;
  accepted: number;
  rejected: number;
  total: number;
  workload: number;
  taskStatusBreakdown?: Partial<Record<ReviewTaskStatus, number>>;
};

export type ManagerWorkloadResponse = {
  workloads: OfficerWorkload[];
  totalOfficers?: number;
  totalTasks?: number;
  waitingTasks?: number;
  reviewingTasks?: number;
  supplementRequiredTasks?: number;
  overloadedOfficers?: number;
  criterionDistribution?: Partial<Record<Criterion, number>>;
};

export type ManagerDashboardSummary = {
  applicationOverview?: {
    totalApplications: number;
    draftCount: number;
    submittedCount: number;
    underReviewCount: number;
    supplementRequiredCount: number;
    resolutionNeededCount: number;
    completedCount: number;
    rejectedCount: number;
  };
  targetLevelBreakdown?: Record<Level, number>;
  finalStatusBreakdown?: {
    passed: number;
    failed: number;
    partiallyPassed: number;
    pending: number;
  };
  finalLevelBreakdown?: Record<Level, number> & {
    notAchieved: number;
    unfinalized: number;
  };
  reviewTaskSummary?: ReviewTaskSummary;
  resolutionSummary?: {
    open: number;
    resolved: number;
    rejected: number;
    closed: number;
  };
  decisionSummary?: {
    ready: number;
    downgraded: number;
    notEligible: number;
    resolution: number;
    supplement: number;
    overdue: number;
    recentlyFinalized: number;
    unfinished: number;
  };
  workloadByOfficer?: Array<{
    officerId: string;
    fullName: string;
    criterion: string;
    assignedCount: number;
    waitingCount: number;
    completedCount: number;
  }>;
  recentApplications?: ManagerResultItem[];
  recentFinalizedApplications?: ManagerResultItem[];
  totalApplications: number;
  submitted: number;
  underReview: number;
  supplementRequired: number;
  resolutionNeeded: number;
  completed: number;
  rejected: number;
  totalReviewTasks: number;
  waitingTasks: number;
  reviewingTasks: number;
  overdueTasks?: number;
  byTargetLevel?: Partial<Record<Level, number>>;
  criterionTaskStatus?: Partial<Record<Criterion, Partial<Record<ReviewTaskStatus, number>>>>;
  byFaculty?: Array<{
    faculty: string;
    total: number;
    underReview?: number;
    completed?: number;
    rejected?: number;
  }>;
  lastUpdatedAt?: string | null;
};

export type FinalizeApplicationInput = {
  finalStatus: Extract<FinalStatus, "passed" | "failed" | "partially_passed">;
  finalLevel?: Level | null;
  finalNote: string;
  overrideAggregation?: boolean;
  notifyStudent?: boolean;
};

export type ReopenFinalInput = {
  reason: string;
  status?: Extract<ApplicationStatus, "under_review" | "supplement_required">;
};
