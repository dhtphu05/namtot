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
  finalStatus?: FinalStatus;
  finalLevel?: Level;
  targetLevel?: Level;
  faculty?: string;
  className?: string;
  search?: string;
  page?: number;
  pageSize?: number;
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
  finalizedBy?: {
    id: string;
    fullName: string;
  } | null;
  reviewTaskSummary: ReviewTaskSummary;
};

export type ManagerResultsResponse = {
  items: ManagerResultItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
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
