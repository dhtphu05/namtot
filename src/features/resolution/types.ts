import type {
  ApplicationStatus,
  Criterion,
  Level,
  ReviewDecision,
  Role,
} from "@/features/review/types";

export type ResolutionCaseStatus = "open" | "in_review" | "resolved";

export type ResolutionCasesParams = {
  page?: number;
  limit?: number;
  status?: ResolutionCaseStatus;
  criterion?: Criterion;
  level?: Level;
  q?: string;
};

export type ResolutionCaseListItem = {
  id: string;
  applicationId: string;
  taskId?: string | null;
  evidenceIds?: string[];
  studentId: string;
  studentName: string;
  studentCode: string;
  className?: string | null;
  faculty?: string | null;
  targetLevel: Level;
  criterion: Criterion;
  reason: string;
  status: ResolutionCaseStatus;
  createdById?: string | null;
  createdByName?: string | null;
  createdByRole?: Role | null;
  escalatedById?: string | null;
  escalatedByName?: string | null;
  escalatedByRole?: Role | null;
  createdAt: string;
  updatedAt: string;
};

export type ResolutionCasesResponse = {
  items: ResolutionCaseListItem[];
};

export type ResolutionComment = {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: Extract<Role, "officer" | "manager" | "committee" | "admin">;
  message: string;
  createdAt: string;
};

export type ResolutionTimelineItem = {
  id: string;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: Role | null;
  action: string;
  note?: string | null;
  createdAt: string;
};

export type ResolutionCaseDetail = ResolutionCaseListItem & {
  applicationStatus: ApplicationStatus;
  officerNote?: string | null;
  evidenceNames?: string[];
  comments?: ResolutionComment[];
  auditTimeline?: ResolutionTimelineItem[];
  decisionHistory?: Array<{
    id: string;
    decision: ReviewDecision;
    note: string;
    actorId: string;
    actorName: string;
    actorRole: Role;
    createdAt: string;
  }>;
};

export type ResolveResolutionCaseRequest = {
  decision: ReviewDecision;
  note: string;
};

export type ResolveResolutionCaseResponse = {
  id: string;
  status: "resolved";
  decision: ReviewDecision;
  applicationId: string;
  applicationStatus: ApplicationStatus;
  resolvedAt: string;
};
