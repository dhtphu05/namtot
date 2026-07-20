import type { Criterion, Level, Pagination } from "@/lib/api/types";

export type EvidenceKnowledgeApprovalSource = "officer" | "resolution";

export type EvidenceKnowledgeMatchReason =
  "canonical_title" | "verified_alias" | "acronym" | "organizer" | "year" | "ocr" | "typo";

export type OfficerEvidenceKnowledgeSearchItem = {
  eventId: string;
  precedentId?: string;
  precedentEvidenceId?: string;
  canonicalTitle: string;
  aliases: string[];
  criterion: Criterion;
  organizer: string | null;
  year: number | null;
  applicableLevel: Level | null;
  acceptedCount: number;
  approvalSources: EvidenceKnowledgeApprovalSource[];
  hasResolutionPrecedent: boolean;
  matchReasons: EvidenceKnowledgeMatchReason[];
};

export type OfficerEvidenceKnowledgeSearchResponse = {
  items: OfficerEvidenceKnowledgeSearchItem[];
  pagination: Pagination;
};

export type OfficerEvidenceKnowledgeSearchFilters = {
  q?: string;
  criterion?: Criterion;
  applicationId?: string;
  year?: number;
  level?: Level;
  page?: number;
  limit?: number;
};

export type OfficerEvidenceKnowledgeEventDetail = {
  eventId: string;
  canonicalTitle: string;
  aliases: string[];
  criterion: Criterion;
  organizer: string | null;
  organizerLevel: Level | null;
  year: number | null;
  applicableLevel: Level | null;
  resolutionPrecedent: {
    precedentId: string;
    resolutionCaseId: string | null;
    approvedAt: string;
  } | null;
  acceptedEvidence: AcceptedEvidencePrecedent[];
};

export type AcceptedEvidencePrecedent = {
  precedentId: string;
  evidenceId: string;
  evidenceName: string;
  approvalSource: EvidenceKnowledgeApprovalSource;
  criterion: Criterion;
  applicableLevel: Level | null;
  eventYear: number | null;
  schoolYear: string | null;
  criteriaVersion: {
    id: string;
    versionName: string;
    schoolYear: string;
    level: Level;
  } | null;
  previewFile: {
    id: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
  } | null;
  ocrMetadata: {
    hasOcrText: boolean;
    extractedFields: unknown;
    warningsCount: number;
    confidence: number | null;
  };
  auditSummary: unknown;
  createdAt: string;
};
