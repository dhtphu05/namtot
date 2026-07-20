import type {
  Criterion,
  EvidenceResponse as BaseEvidenceResponse,
  EvidenceSourceType,
  EvidenceStatus,
  IndexingStatus,
} from "@/lib/api/types";
import type { AuditLogEntry } from "./audit";
import type { UxStatus } from "./api";

export type EvidenceStudentStatusCode =
  | "official_match_found"
  | "official_match_not_found"
  | "similar_name_found"
  | "evidence_read"
  | "needs_more_info"
  | "needs_human_verification"
  | "unreadable_file"
  | "recorded_waiting_review";

export type EvidenceStudentNextAction =
  | "add_to_application"
  | "upload_evidence"
  | "upload_more"
  | "add_note"
  | "wait_for_review"
  | "retry_upload"
  | "view_evidence";

export type EvidenceStudentStatus = {
  code: EvidenceStudentStatusCode;
  label?: string | null;
  message?: string | null;
  nextAction?: EvidenceStudentNextAction | null;
  severity?: "success" | "info" | "warning" | "error" | string | null;
  source?: "official_matching" | "smartreader" | "manual" | "review" | string | null;
};

export type EvidenceReadableSummary = {
  eventName?: string | null;
  organizer?: string | null;
  organizerName?: string | null;
  time?: string | null;
  activityTime?: string | null;
  convertedValue?: string | number | null;
  convertedUnit?: string | null;
  issueDate?: string | null;
  studentName?: string | null;
  studentCode?: string | null;
  [key: string]: unknown;
};

export type EvidenceMatchingStatus = {
  code?: "official_match_found" | "official_match_not_found" | "similar_name_found" | string | null;
  label?: string | null;
  message?: string | null;
  matchedEventName?: string | null;
  eventName?: string | null;
  [key: string]: unknown;
};

export type EvidenceCreateInput = {
  evidenceName: string;
  criterion: Criterion;
  sourceType: EvidenceSourceType;
  eventId?: string;
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
  readableSummary?: EvidenceReadableSummary | null;
  userProvidedFields?: Record<string, unknown> | null;
  studentProfileFields?: Record<string, unknown> | null;
  extractedFields?: Record<string, unknown> | null;
  normalizedFields?: Record<string, unknown> | null;
  verifiedFields?: Record<string, unknown> | null;
  primaryFields?: Record<string, unknown> | null;
  fieldConfidence?: Record<string, number> | null;
  metricSuggestions?: Record<string, unknown> | null;
  academic?: Record<string, unknown> | null;
  matchingStatus?: EvidenceMatchingStatus | null;
  missingFields?: string[] | Array<{ label?: string; message?: string; field?: string }>;
  studentStatus?: EvidenceStudentStatus | null;
  extractedFieldsJson?: unknown;
  warnings?: string[] | unknown;
  warningsJson?: unknown;
  ocrText?: string | null;
  ocrTextPreview?: string | null;
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
  studentStatus?: EvidenceStudentStatus | null;
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
    convertedValue?: number | null;
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

export type OfficialEventLibraryState = "available" | "already_imported";

export type OfficialEventLibraryItem = {
  eventId: string;
  title: string;
  organizer?: string | null;
  organizerLevel?: string | null;
  criterion?: Criterion;
  state?: OfficialEventLibraryState;
  evidenceId?: string | null;
};

export type OfficialEventLibraryResponse = {
  items: OfficialEventLibraryItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
