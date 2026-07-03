import type { FinalStatus } from "@/lib/api/types";
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
};

export type ManagerResultFilters = {
  schoolYear?: string;
  finalStatus?: FinalStatus | "unfinalized";
  finalLevel?: Level;
  targetLevel?: Level;
  faculty?: string;
  className?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "lastActivityAt" | "updatedAt" | "newest" | "oldest" | "readiness_desc" | "unfinalized_first" | "target_level_desc";
  sortOrder?: "asc" | "desc";
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
  schoolYear: string;
  targetLevel: Level;
  suggestedLevel?: Level | null;
  finalStatus: FinalStatus;
  finalLevel?: Level | null;
  finalNote?: string | null;
  applicationStatus: ApplicationStatus;
  readinessScore: number;
  submittedAt?: string | null;
  finalizedAt?: string | null;
  updatedAt: string;
  lastActivityAt: string;
  finalizedBy?: {
    id: string;
    fullName: string;
  } | null;
  reviewTaskSummary: ReviewTaskSummary;
  taskProgress?: {
    accepted: number;
    total: number;
  };
};

export type ManagerResultsResponse = {
  items: ManagerResultItem[];
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
  };
  student: {
    id: string;
    fullName: string;
    studentCode?: string | null;
    email?: string | null;
    phone?: string | null;
    className?: string | null;
    faculty?: string | null;
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
