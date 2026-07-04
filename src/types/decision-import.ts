import type { Criterion, Level } from "@/lib/api/types";
import type { AuditLogEntry } from "./audit";
import type { UxStatus } from "./api";

export type DecisionImportStatus =
  | "draft"
  | "uploaded"
  | "queued"
  | "processing"
  | "extracting_metadata"
  | "metadata_ready"
  | "ocr_processing"
  | "tables_ready"
  | "parsing_roster"
  | "preview_ready"
  | "confirmed"
  | "failed"
  | "cancelled";

export type DecisionImportValidationStatus =
  "valid" | "warning" | "duplicate" | "missing_student_code" | "invalid" | "needs_manual_review";

export type DecisionImport = {
  id: string;
  title?: string | null;
  documentType?: string | null;
  criterion?: Criterion | null;
  eventName?: string | null;
  organizer?: string | null;
  organizerLevel?: Level | string | null;
  startDate?: string | null;
  endDate?: string | null;
  convertedValue?: number | null;
  convertedUnit?: string | null;
  eligibleLevels?: Array<Level | string>;
  status: DecisionImportStatus;
  uxStatus?: UxStatus | null;
  fileStatus?: string | null;
  fileName?: string | null;
  sourceFileId?: string | null;
  jobId?: string | null;
  eventId?: string | null;
  participantCount?: number | null;
  previewSummary?: DecisionImportPreviewSummary | null;
  processedPages?: number | null;
  remainingPages?: number | null;
  createdByName?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type DecisionImportCreateInput = {
  title: string;
  documentType?: string;
  schoolYear?: string;
  criterion?: Criterion;
  targetLevel?: Level;
  eventName?: string;
  organizer?: string;
  organizerLevel?: Level;
  startDate?: string;
  endDate?: string;
  convertedValue?: number;
  convertedUnit?: string;
  eligibleLevels?: Level[];
  metadata?: Record<string, unknown>;
};

export type DecisionImportListFilters = {
  status?: DecisionImportStatus | "all";
  criterion?: Criterion | "all";
  q?: string;
  page?: number;
  limit?: number;
};

export type DecisionImportMetadata = {
  importId?: string | null;
  documentNo?: string | null;
  decisionNumber?: string | null;
  documentType?: string | null;
  issuer?: string | null;
  issueDate?: string | null;
  effectiveDate?: string | null;
  signer?: string | null;
  summary?: string | null;
  relatedDocumentNo?: string | null;
  organizer?: string | null;
  criterion?: Criterion | null;
  targetLevel?: Level | null;
  uxStatus?: UxStatus | null;
  [key: string]: unknown;
};

export type DecisionImportTable = {
  id: string;
  name?: string | null;
  rowCount?: number | null;
  columns: string[];
  sampleRows?: Array<Record<string, unknown>>;
  confidence?: number | null;
  sourcePage?: number | null;
  tableIndex?: number | null;
  warnings?: string[];
};

export type DecisionImportPreviewRow = {
  rowId: string;
  index?: number | null;
  studentCode?: string | null;
  studentName?: string | null;
  className?: string | null;
  faculty?: string | null;
  criterion?: Criterion | null;
  convertedValue?: number | null;
  convertedUnit?: string | null;
  participationStatus?: string | null;
  validationStatus: DecisionImportValidationStatus;
  validationWarnings: string[];
  confidence?: number | null;
  sourcePage?: number | null;
  sourceTableIndex?: number | null;
  sourceRowIndex?: number | null;
  safeRawSummary?: Record<string, string | number | boolean | null>;
};

export type DecisionImportPreviewSummary = {
  totalRows: number;
  validRows: number;
  warningRows: number;
  duplicateRows: number;
  missingStudentCodeRows: number;
  invalidRows: number;
  needsManualReviewRows: number;
};

export type DecisionImportPreview = {
  importId?: string | null;
  status?: DecisionImportStatus | null;
  rows: DecisionImportPreviewRow[];
  uxStatus?: UxStatus | null;
  summary: DecisionImportPreviewSummary;
  detectedColumns: string[];
  columnMapping?: DecisionImportColumnMapping | null;
};

export type DecisionImportColumnMapping = {
  studentCode?: string;
  studentName?: string;
  className?: string;
  faculty?: string;
  convertedValue?: string;
  participationStatus?: string;
  [targetField: string]: string | undefined;
};

export type DecisionImportConfirmInput = {
  includeRows?: "valid_only" | "valid_and_warnings";
  confirmWarnings?: boolean;
  note?: string;
};

export type DecisionImportConfirmResult = DecisionImport & {
  eventId?: string | null;
  participantCount?: number | null;
};

export type DecisionImportAudit = {
  items: AuditLogEntry[];
};

export type DecisionImportUxStatus = UxStatus;

export const activeDecisionImportStatuses: DecisionImportStatus[] = [
  "queued",
  "processing",
  "extracting_metadata",
  "ocr_processing",
  "parsing_roster",
];

export const terminalDecisionImportStatuses: DecisionImportStatus[] = [
  "preview_ready",
  "confirmed",
  "failed",
  "cancelled",
];

export function isActiveDecisionImportStatus(status?: string | null) {
  return Boolean(status && activeDecisionImportStatuses.includes(status as DecisionImportStatus));
}

export function isTerminalDecisionImportStatus(status?: string | null) {
  return Boolean(status && terminalDecisionImportStatuses.includes(status as DecisionImportStatus));
}
