import type {
  Criterion,
  EvidenceResponse as BaseEvidenceResponse,
  EvidenceSourceType,
  EvidenceStatus,
  IndexingStatus,
} from "@/lib/api/types";
import type { AuditLogEntry } from "./audit";
import type { UxStatus } from "./api";

export type EvidenceCreateInput = {
  evidenceName: string;
  criterion: Criterion;
  sourceType: EvidenceSourceType;
  description?: string;
  note?: string;
  metadata?: Record<string, unknown>;
};

export type EvidenceUpdateInput = Partial<Omit<EvidenceCreateInput, "sourceType">>;

export type EvidenceListFilters = {
  criterion?: Criterion;
  status?: EvidenceStatus;
  indexingStatus?: IndexingStatus;
  page?: number;
  limit?: number;
};

export type EvidenceCard = {
  id?: string;
  evidenceId?: string;
  confidence?: number | null;
  extractedFields?: Record<string, unknown> | null;
  extractedFieldsJson?: unknown;
  warnings?: string[] | unknown;
  warningsJson?: unknown;
  ocrText?: string | null;
  uxStatus?: UxStatus | null;
  aiSummary?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type EvidenceDetail = BaseEvidenceResponse & {
  card?: EvidenceCard | null;
  uxStatus?: UxStatus | null;
};

export type EvidenceAudit = {
  items: AuditLogEntry[];
};

export type EvidenceResponse = BaseEvidenceResponse & {
  uxStatus?: UxStatus | null;
  card?: EvidenceCard | null;
};

export type ApprovedEvidenceSearchItem = {
  event: {
    id: string;
    eventName: string;
    criterion: Criterion;
    organizer?: string | null;
    organizerLevel?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    convertedValue?: number | null;
    convertedUnit?: string | null;
    officialDocumentNo?: string | null;
    officialIssuer?: string | null;
  };
  participant: {
    id: string;
    studentCode: string;
    studentName: string;
    className?: string | null;
    faculty?: string | null;
    participationStatus?: string | null;
  };
  importable: boolean;
  alreadyImported: boolean;
  reason?: string | null;
  evidenceId?: string | null;
  uxStatus?: UxStatus | null;
};

export type ImportEvidenceResponse = {
  evidence: EvidenceResponse;
  card?: EvidenceCard | null;
  uxStatus?: UxStatus | null;
};
