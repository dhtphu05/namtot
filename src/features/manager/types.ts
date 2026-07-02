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
