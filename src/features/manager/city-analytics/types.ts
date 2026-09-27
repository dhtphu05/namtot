import type { ApplicationStatus, FinalStatus } from "@/lib/api/types";

export type CityAnalyticsCriterion =
  "ethics" | "academic" | "physical" | "volunteer" | "integration";

export type CityAnalyticsTaskStatus =
  "waiting" | "reviewing" | "supplement_required" | "resolution_needed" | "accepted" | "rejected";

export type CityAnalyticsStatus = ApplicationStatus | "not_started";

export type CityAnalyticsSummaryParams = {
  schoolYear?: string;
  workspaceId?: string;
  status?: CityAnalyticsStatus;
};

export type CityAnalyticsListParams = CityAnalyticsSummaryParams & {
  criterion?: CityAnalyticsCriterion;
  taskStatus?: CityAnalyticsTaskStatus;
  finalStatus?: FinalStatus;
  submitted?: boolean;
  inReview?: boolean;
  supplementRequired?: boolean;
  resolutionBlocked?: boolean;
  q?: string;
  page?: number;
  limit?: number;
};

export type CityAnalyticsSummary = {
  filters: { schoolYear: string | null; workspaceId: string | null; status: string | null };
  availableSchoolYears: string[];
  filterOptions: { schools: Array<{ workspaceId: string; code: string; name: string }> };
  applications: {
    created: number;
    notSubmitted: number;
    submitted: number;
    inReview: number;
    supplementRequired: number;
    resolutionBlocked: number;
    reviewComplete: number;
    missingCriterionSlots: number;
    progressDistribution: Record<"0" | "1" | "2" | "3" | "4" | "5", number>;
    unexpectedTaskCount: number;
  };
  criteria: Array<{
    criterion: CityAnalyticsCriterion;
    totalTasks: number;
    pending: number;
    inReview: number;
    supplementRequired: number;
    resolutionNeeded: number;
    pass: number;
    fail: number;
  }>;
  bySchool: Array<{
    workspaceId: string;
    code: string;
    name: string;
    submitted: number;
    inReview: number;
    supplementRequired: number;
    reviewComplete: number;
    finalPassed: number;
    finalFailed: number;
  }>;
  reviewers: Array<{
    officerId: string;
    fullName: string;
    assignedActive: number;
    pending: number;
    completed: number;
    supplementRequired: number;
    resolutionNeeded: number;
  }>;
  finalResults: {
    finalized: number;
    passed: number;
    failed: number;
    partiallyPassed: number;
    notFinalized: number;
  };
  supplement: { applications: number; tasks: number };
  resolution: { openCases: number; resolvedCases: number; blockedApplications: number };
};

export type CityAnalyticsApplication = {
  id: string;
  schoolYear: string;
  status: CityAnalyticsStatus;
  submittedAt: string | null;
  reviewProgress: { reviewed: number; expected: 5; anomalous: boolean };
  finalStatus: FinalStatus;
  supplementRequired: boolean;
  resolutionBlocked: boolean;
  student: { fullName: string; studentCode: string | null };
  school: { workspaceId: string; code: string; name: string };
};

export type CityAnalyticsApplicationsResponse = {
  items: CityAnalyticsApplication[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type CityAnalyticsListFilters = Pick<
  CityAnalyticsListParams,
  | "status"
  | "workspaceId"
  | "criterion"
  | "taskStatus"
  | "finalStatus"
  | "submitted"
  | "inReview"
  | "supplementRequired"
  | "resolutionBlocked"
>;

export type CityAnalyticsDrilldown = {
  title: string;
  filters: Omit<CityAnalyticsListFilters, "status" | "workspaceId">;
};
