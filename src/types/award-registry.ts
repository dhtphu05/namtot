import type { Pagination } from "@/lib/api/types";

export type AwardLevel = "SCHOOL" | "UNIVERSITY_SYSTEM";
export type AwardDecisionStatus = "DRAFT" | "CONFIRMED" | "ARCHIVED";
export type AwardRecipientMatchStatus = "MATCHED" | "UNMATCHED" | "CONFLICT";
export type AwardRosterRowStatus = "VALID" | "INVALID" | "DUPLICATE" | "CONFLICT";
export type AwardRosterProcessingStatus = "not_started" | "processing" | "failed" | "preview_ready";

export type AwardRegistryFilters = {
  q?: string;
  schoolYear?: string;
  status?: AwardDecisionStatus;
  issuerWorkspaceId?: string;
  page?: number;
  limit?: number;
};

export type AwardIssuerWorkspace = {
  id: string;
  code: string | null;
  name: string;
  shortName: string | null;
  type: "SCHOOL" | "UNIVERSITY_SYSTEM" | "CITY" | "OTHER";
};

export type AwardDecisionFile = {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
};

export type AwardDecision = {
  id: string;
  issuerWorkspace: AwardIssuerWorkspace;
  awardLevel: AwardLevel;
  schoolYear: string;
  decisionNumber: string | null;
  decisionDate: string | null;
  status: AwardDecisionStatus;
  decisionFile: AwardDecisionFile | null;
  rosterFile: AwardDecisionFile | null;
  sourceImportId: string | null;
  recipientCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AwardDecisionList = {
  items: AwardDecision[];
  pagination?: Pagination;
};

export type AwardDecisionCreateInput = {
  schoolYear: string;
  decisionNumber?: string | null;
  decisionDate?: string | null;
  issuerWorkspaceId?: string;
};

export type AwardDecisionUpdateInput = {
  schoolYear?: string;
  decisionNumber?: string | null;
  decisionDate?: string | null;
};

export type AwardRosterMapping = {
  studentCode: string;
  fullName: string;
  className?: string;
  institution?: string;
};

export type AwardRosterSummary = {
  total: number;
  valid: number;
  invalid: number;
  duplicate: number;
  conflict: number;
  matched: number;
  unmatched: number;
};

export type AwardRosterPreviewRow = {
  sourceRow: number;
  studentCode: string | null;
  fullName: string | null;
  className: string | null;
  institutionText: string | null;
  institutionWorkspaceId: string | null;
  matchStatus: AwardRecipientMatchStatus;
  status: AwardRosterRowStatus;
  errors: string[];
};

export type AwardRosterPreview = {
  status: "preview_ready";
  columns: string[];
  suggestedMapping: AwardRosterMapping;
  mapping: AwardRosterMapping;
  validationSummary: AwardRosterSummary;
  items: AwardRosterPreviewRow[];
  pagination: Pagination;
};

export type AwardRosterProcessing =
  | { status: "not_started" }
  | { status: "processing" }
  | { status: "failed"; errorCode: string; retryable: boolean }
  | { status: "preview_ready" };

export type AwardRecipient = {
  id: string;
  studentCode: string;
  fullName: string;
  institutionWorkspaceId: string;
  institutionWorkspace: {
    id: string;
    code: string | null;
    name: string;
    shortName: string | null;
  };
  className: string | null;
  matchStatus: AwardRecipientMatchStatus;
  sourceRow: number;
  createdAt: string;
};

export type AwardRecipientList = {
  items: AwardRecipient[];
  pagination?: Pagination;
};

export type WorkspaceName = {
  id: string;
  code: string;
  name: string;
  shortName: string | null;
};
