import type {
  ApplicationStatus,
  Criterion,
  Level,
  ReviewDecision,
  Role,
} from "@/features/review/types";

export type ResolutionCaseStatus = "open" | "in_review" | "resolved";
export type ResolutionFinalDecision =
  "accepted" | "rejected" | "supplement_required" | "closed_no_action";

export type ResolutionCasesParams = {
  page?: number;
  limit?: number;
  status?: ResolutionCaseStatus;
  criterion?: Criterion;
  escalator?: string;
  level?: Level;
  schoolYear?: string;
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
  schoolName?: string | null;
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
  primaryEvidence?: ResolutionEvidence | null;
  relatedEvidences?: ResolutionEvidence[];
  latestPrecheck?: unknown | null;
  latestCascade?: unknown | null;
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

export type ResolutionEvidence = {
  id: string;
  evidenceName: string;
  criterion: Criterion;
  sourceType: string;
  status: string;
  indexingStatus: string;
  confidence?: number | null;
  files: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    createdAt: string;
  }>;
  evidenceCard?: {
    id: string;
    aiSummary?: string | null;
    confidence?: number | null;
    ocrText?: string | null;
    extractedFieldsJson?: unknown;
    warningsJson?: unknown;
    matchedEventId?: string | null;
    matchedKnowledgeItemIds?: unknown;
  } | null;
};

export type ResolveResolutionCaseRequest = {
  decision: ResolutionFinalDecision;
  note: string;
  updateKnowledgeBase?: boolean;
  knowledgeBaseTitle?: string;
  evidenceDecisions?: Array<{
    evidenceId: string;
    decision: Exclude<ResolutionFinalDecision, "closed_no_action">;
    note?: string;
  }>;
};

export type ResolveResolutionCaseResponse = {
  id: string;
  status: ResolutionCaseStatus;
  decision: ResolutionFinalDecision;
  applicationId: string;
  applicationStatus: ApplicationStatus;
  resolvedAt?: string | null;
};
