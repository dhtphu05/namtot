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
  sourceFileId?: string | null;
  analysisRevision?: number | null;
  provider?: "openai" | "smartreader" | "mock" | string | null;
  providerModel?: string | null;
  promptVersion?: string | null;
  documentType?: string | null;
  suggestedCriteria?: Array<{
    criterion?: Criterion;
    reason?: string;
    confidence?: number | null;
  }>;
  evidencePrecheck?: EvidencePrecheckResult | null;
  confirmationStatus?:
    | "pending"
    | "correction_required"
    | "confirmed"
    | "not_required"
    | "needs_recheck"
    | string
    | null;
  requiresHumanConfirmation?: boolean | null;
  confirmedFields?: Record<string, unknown> | null;
  effectiveFields?: Record<string, unknown> | null;
  fieldDetails?: EvidenceCardFieldDetail[];
  confirmedAt?: string | null;
  confirmedByUserId?: string | null;
  canEdit?: boolean;
  canConfirm?: boolean;
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

export type EvidencePrecheckResult = {
  evidenceId?: string;
  evidenceCardRevision?: number;
  generatedAt?: string;
  status?:
    | "ready_for_confirmation"
    | "needs_attention"
    | "file_not_readable"
    | "insufficient_information"
    | "possible_mismatch"
    | string;
  identifiedAs?: {
    documentLabel?: string;
    shortDescription?: string;
  };
  completeness?: {
    score?: number;
    availableFields?: string[];
    missingImportantFields?: string[];
  };
  quality?: {
    level?: "clear" | "needs_check" | "poor" | string;
    issues?: string[];
  };
  identityCheck?: {
    status?: "matched" | "missing" | "possible_mismatch" | "not_applicable" | string;
    comparedFields?: string[];
  };
  relevance?: Array<{
    criterion?: Criterion;
    level?: "strong" | "possible" | "unclear" | string;
    explanation?: string;
  }>;
  warnings?: Array<{
    code?: string;
    severity?: "info" | "warning" | "blocking" | string;
    friendlyMessage?: string;
    field?: string;
  }>;
  confirmationRequired?: boolean;
  recommendedAction?:
    | "confirm_card"
    | "correct_card"
    | "replace_file"
    | "add_supporting_evidence"
    | "wait_for_processing"
    | string;
  overallScore?: number;
  sections?: Record<
    string,
    {
      score?: number;
      status?: string;
      message?: string;
    }
  >;
  availableFacts?: Array<{
    key?: string;
    label?: string;
    displayValue?: string;
  }>;
  missingImportantFacts?: Array<{
    key?: string;
    label?: string;
    reason?: string;
  }>;
  documentFacts?: {
    documentTitle?: string | null;
    conductEntries?: Array<{
      semester?: string | null;
      schoolYear?: string | null;
      score?: number | null;
      classification?: string | null;
    }>;
    fitness?: {
      title?: string | null;
      resultLevel?: string | null;
      sportName?: string | null;
    };
    language?: {
      certificateType?: string | null;
      score?: number | null;
      frameworkLevel?: string | null;
    };
    award?: {
      title?: string | null;
      rank?: string | null;
      level?: string | null;
    };
    academic?: {
      gpa?: number | null;
      gpaScale?: number | null;
      hasFGrade?: boolean | null;
    };
  };
};

export type EvidenceCardFieldDetail = {
  key: string;
  label: string;
  extractedValue?: string | number | null;
  correctedValue?: string | number | null;
  effectiveValue?: string | number | null;
  confidence?: number | null;
  source?: string | null;
  editable?: boolean;
  requiredForConfirmation?: boolean;
  warningCodes?: string[];
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
  approvedUsageCount?: number;
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
