import { apiClient } from "@/lib/api/client";
import { auditApi } from "@/features/audit/api/audit";
import type { Criterion, Level } from "@/lib/api/types";
import type {
  DecisionImport,
  DecisionImportAudit,
  DecisionImportColumnMapping,
  DecisionImportConfirmInput,
  DecisionImportConfirmResult,
  DecisionImportCreateInput,
  DecisionImportListFilters,
  DecisionImportMetadata,
  DecisionImportPreview,
  DecisionImportPreviewRow,
  DecisionImportPreviewSummary,
  DecisionImportStatus,
  DecisionImportTable,
  DecisionImportValidationStatus,
} from "@/types/decision-import";
import type { UxStatus } from "@/types/api";

function toQuery(filters?: object) {
  const query = new URLSearchParams();

  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (
      value !== "all" &&
      (typeof value === "string" || typeof value === "number" || typeof value === "boolean") &&
      value !== ""
    ) {
      query.append(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

type ListPayload =
  | unknown[]
  | {
      items?: unknown[];
      data?: unknown[];
      imports?: unknown[];
      decisionImports?: unknown[];
      decision_imports?: unknown[];
    };

function normalizeImportList(payload: ListPayload | null): DecisionImport[] {
  const rows = Array.isArray(payload)
    ? payload
    : (payload?.items ??
      payload?.data ??
      payload?.imports ??
      payload?.decisionImports ??
      payload?.decision_imports ??
      []);

  return rows
    .map(normalizeDecisionImport)
    .filter((item): item is DecisionImport => Boolean(item.id));
}

function normalizeDecisionImportPayload(payload: unknown): DecisionImport {
  const raw = unwrapRecord(payload, ["import", "decisionImport", "decision_import", "data"]);
  return normalizeDecisionImport(raw);
}

function normalizeDecisionImport(raw: unknown): DecisionImport {
  const row = asRecord(raw) ?? {};
  const metadata = asRecord(row.metadata) ?? asRecord(row.eventMetadata) ?? {};
  const previewSummary = asRecord(row.previewSummary ?? row.preview_summary ?? row.summary);

  return {
    id: stringValue(
      row.id ?? row.importId ?? row.import_id ?? row.decisionImportId ?? row.decision_import_id,
    ),
    title: nullableString(row.title ?? row.name),
    documentType: nullableString(row.documentType ?? row.document_type ?? metadata.documentType),
    criterion: nullableCriterion(row.criterion ?? metadata.criterion),
    eventName: nullableString(
      row.eventName ?? row.event_name ?? metadata.eventName ?? metadata.event_name,
    ),
    organizer: nullableString(row.organizer ?? metadata.organizer),
    organizerLevel: nullableString(
      row.organizerLevel ??
        row.organizer_level ??
        metadata.organizerLevel ??
        metadata.organizer_level,
    ),
    startDate: nullableString(
      row.startDate ?? row.start_date ?? metadata.startDate ?? metadata.start_date,
    ),
    endDate: nullableString(row.endDate ?? row.end_date ?? metadata.endDate ?? metadata.end_date),
    convertedValue: nullableNumber(
      row.convertedValue ??
        row.converted_value ??
        metadata.convertedValue ??
        metadata.converted_value,
    ),
    convertedUnit: nullableString(
      row.convertedUnit ?? row.converted_unit ?? metadata.convertedUnit ?? metadata.converted_unit,
    ),
    eligibleLevels: stringArray(
      row.eligibleLevels ?? row.eligible_levels ?? metadata.eligibleLevels,
    ),
    status: normalizeStatus(row.status),
    uxStatus: normalizeUxStatus(row.uxStatus ?? row.ux_status),
    fileStatus: nullableString(row.fileStatus ?? row.file_status),
    fileName: nullableString(row.fileName ?? row.file_name),
    sourceFileId: nullableString(
      row.sourceFileId ?? row.source_file_id ?? row.fileId ?? row.file_id,
    ),
    jobId: nullableString(row.jobId ?? row.job_id),
    eventId: nullableString(row.eventId ?? row.event_id),
    participantCount: nullableNumber(row.participantCount ?? row.participant_count),
    previewSummary: previewSummary ? normalizePreviewSummary(previewSummary) : null,
    processedPages: nullableNumber(row.processedPages ?? row.processed_pages),
    remainingPages: nullableNumber(row.remainingPages ?? row.remaining_pages),
    createdByName: nullableString(
      row.createdByName ??
        row.created_by_name ??
        asRecord(row.createdBy)?.fullName ??
        asRecord(row.created_by)?.full_name,
    ),
    createdAt: nullableString(row.createdAt ?? row.created_at) ?? undefined,
    updatedAt: nullableString(row.updatedAt ?? row.updated_at) ?? undefined,
  };
}

function normalizeMetadataPayload(payload: unknown): DecisionImportMetadata {
  const row = unwrapRecord(payload, ["metadata", "documentMetadata", "document_metadata", "data"]);

  return {
    importId: nullableString(
      row.importId ?? row.import_id ?? row.decisionImportId ?? row.decision_import_id,
    ),
    documentNo: nullableString(
      row.documentNo ?? row.document_no ?? row.decisionNumber ?? row.decision_number,
    ),
    decisionNumber: nullableString(
      row.decisionNumber ?? row.decision_number ?? row.documentNo ?? row.document_no,
    ),
    documentType: nullableString(row.documentType ?? row.document_type),
    issuer: nullableString(
      row.issuer ?? row.officialIssuer ?? row.official_issuer ?? row.organizer,
    ),
    issueDate: nullableString(row.issueDate ?? row.issue_date),
    effectiveDate: nullableString(row.effectiveDate ?? row.effective_date),
    signer: nullableString(row.signer ?? row.signedBy ?? row.signed_by),
    summary: nullableString(row.summary ?? row.abstract ?? row.description),
    relatedDocumentNo: nullableString(row.relatedDocumentNo ?? row.related_document_no),
    organizer: nullableString(row.organizer),
    criterion: nullableCriterion(row.criterion),
    targetLevel: nullableLevel(row.targetLevel ?? row.target_level),
    uxStatus: normalizeUxStatus(row.uxStatus ?? row.ux_status),
  };
}

type TablesPayload =
  | unknown[]
  | {
      tables?: unknown[];
      items?: unknown[];
      data?: unknown[];
    };

function normalizeTablesPayload(payload: TablesPayload | null): DecisionImportTable[] {
  const rows = Array.isArray(payload)
    ? payload
    : (payload?.tables ?? payload?.items ?? payload?.data ?? []);
  return rows
    .map(normalizeTable)
    .filter((table): table is DecisionImportTable => Boolean(table.id));
}

function normalizeTable(raw: unknown): DecisionImportTable {
  const row = asRecord(raw) ?? {};

  return {
    id: stringValue(
      row.id ?? row.tableId ?? row.table_id ?? row.index ?? row.tableIndex ?? row.table_index,
    ),
    name: nullableString(row.name ?? row.title),
    rowCount: nullableNumber(row.rowCount ?? row.row_count ?? row.totalRows ?? row.total_rows),
    columns: stringArray(row.columns ?? row.detectedColumns ?? row.detected_columns),
    sampleRows: recordArray(row.sampleRows ?? row.sample_rows),
    confidence: nullableNumber(row.confidence),
    sourcePage: nullableNumber(row.sourcePage ?? row.source_page ?? row.page),
    tableIndex: nullableNumber(row.tableIndex ?? row.table_index),
    warnings: stringArray(row.warnings ?? row.validationWarnings ?? row.validation_warnings),
  };
}

function normalizePreviewPayload(payload: unknown): DecisionImportPreview {
  const row = unwrapRecord(payload, ["preview", "data"]);
  const rows = arrayValue(row.rows ?? row.items ?? row.previewRows ?? row.preview_rows);
  const normalizedRows = rows.map(normalizePreviewRow);

  return {
    importId: nullableString(
      row.importId ?? row.import_id ?? row.decisionImportId ?? row.decision_import_id,
    ),
    status: row.status ? normalizeStatus(row.status) : null,
    rows: normalizedRows,
    uxStatus: normalizeUxStatus(row.uxStatus ?? row.ux_status),
    summary: normalizePreviewSummary(row.summary, normalizedRows),
    detectedColumns: stringArray(row.detectedColumns ?? row.detected_columns ?? row.columns),
    columnMapping: normalizeColumnMapping(row.columnMapping ?? row.column_mapping ?? row.mapping),
  };
}

function normalizePreviewRow(raw: unknown, index: number): DecisionImportPreviewRow {
  const row = asRecord(raw) ?? {};
  const source = asRecord(row.source) ?? {};
  const rawRow = asRecord(row.rawRow ?? row.raw_row ?? row.raw);

  return {
    rowId: stringValue(row.rowId ?? row.row_id ?? row.id ?? `${index + 1}`),
    index: nullableNumber(row.index ?? row.stt) ?? index + 1,
    studentCode: nullableString(row.studentCode ?? row.student_code ?? row.mssv),
    studentName: nullableString(
      row.studentName ?? row.student_name ?? row.fullName ?? row.full_name,
    ),
    className: nullableString(row.className ?? row.class_name),
    faculty: nullableString(row.faculty),
    criterion: nullableCriterion(row.criterion),
    convertedValue: nullableNumber(row.convertedValue ?? row.converted_value),
    convertedUnit: nullableString(row.convertedUnit ?? row.converted_unit),
    participationStatus: nullableString(row.participationStatus ?? row.participation_status),
    validationStatus: normalizeValidationStatus(row.validationStatus ?? row.validation_status),
    validationWarnings: stringArray(
      row.validationWarnings ?? row.validation_warnings ?? row.warnings,
    ),
    confidence: nullableNumber(row.confidence),
    sourcePage: nullableNumber(row.sourcePage ?? row.source_page ?? source.page),
    sourceTableIndex: nullableNumber(
      row.sourceTableIndex ?? row.source_table_index ?? source.tableIndex ?? source.table_index,
    ),
    sourceRowIndex: nullableNumber(
      row.sourceRowIndex ?? row.source_row_index ?? source.rowIndex ?? source.row_index,
    ),
    safeRawSummary: summarizeSafeRawRow(rawRow),
  };
}

function normalizePreviewSummary(
  raw: unknown,
  rows: DecisionImportPreviewRow[] = [],
): DecisionImportPreviewSummary {
  const row = asRecord(raw) ?? {};
  const computed = computePreviewSummary(rows);

  return {
    totalRows: nullableNumber(row.totalRows ?? row.total_rows) ?? computed.totalRows,
    validRows: nullableNumber(row.validRows ?? row.valid_rows) ?? computed.validRows,
    warningRows: nullableNumber(row.warningRows ?? row.warning_rows) ?? computed.warningRows,
    duplicateRows:
      nullableNumber(row.duplicateRows ?? row.duplicate_rows) ?? computed.duplicateRows,
    missingStudentCodeRows:
      nullableNumber(row.missingStudentCodeRows ?? row.missing_student_code_rows) ??
      computed.missingStudentCodeRows,
    invalidRows:
      nullableNumber(row.invalidRows ?? row.invalid_rows ?? row.errorRows ?? row.error_rows) ??
      computed.invalidRows,
    needsManualReviewRows:
      nullableNumber(row.needsManualReviewRows ?? row.needs_manual_review_rows) ??
      computed.needsManualReviewRows,
  };
}

function computePreviewSummary(rows: DecisionImportPreviewRow[]): DecisionImportPreviewSummary {
  return {
    totalRows: rows.length,
    validRows: rows.filter((row) => row.validationStatus === "valid").length,
    warningRows: rows.filter((row) => row.validationStatus === "warning").length,
    duplicateRows: rows.filter((row) => row.validationStatus === "duplicate").length,
    missingStudentCodeRows: rows.filter((row) => row.validationStatus === "missing_student_code")
      .length,
    invalidRows: rows.filter((row) => row.validationStatus === "invalid").length,
    needsManualReviewRows: rows.filter((row) => row.validationStatus === "needs_manual_review")
      .length,
  };
}

function normalizeColumnMapping(raw: unknown): DecisionImportColumnMapping | null {
  const row = asRecord(raw);
  if (!row) return null;

  return {
    studentCode: nullableString(row.studentCode ?? row.student_code) ?? undefined,
    studentName: nullableString(row.studentName ?? row.student_name) ?? undefined,
    className: nullableString(row.className ?? row.class_name) ?? undefined,
    faculty: nullableString(row.faculty) ?? undefined,
    convertedValue: nullableString(row.convertedValue ?? row.converted_value) ?? undefined,
    participationStatus:
      nullableString(row.participationStatus ?? row.participation_status) ?? undefined,
  };
}

function toBackendMapping(mapping: DecisionImportColumnMapping) {
  return {
    student_code: mapping.studentCode || undefined,
    student_name: mapping.studentName || undefined,
    class_name: mapping.className || undefined,
    faculty: mapping.faculty || undefined,
    converted_value: mapping.convertedValue || undefined,
    participation_status: mapping.participationStatus || undefined,
  };
}

function normalizeAuditPayload(payload: unknown): DecisionImportAudit {
  const row = asRecord(payload);
  const items = Array.isArray(payload)
    ? payload
    : arrayValue(row?.items).length
      ? arrayValue(row?.items)
      : arrayValue(row?.data).length
        ? arrayValue(row?.data)
        : arrayValue(row?.audit);

  return { items: items as DecisionImportAudit["items"] };
}

function unwrapRecord(payload: unknown, keys: string[]) {
  const row = asRecord(payload) ?? {};
  for (const key of keys) {
    const nested = asRecord(row[key]);
    if (nested) return nested;
  }
  return row;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function recordArray(value: unknown): Array<Record<string, unknown>> {
  return arrayValue(value).filter((item): item is Record<string, unknown> =>
    Boolean(asRecord(item)),
  );
}

function stringValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function nullableString(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

function nullableNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" || typeof item === "number" ? String(item) : ""))
    .filter(Boolean);
}

function nullableCriterion(value: unknown) {
  const normalized = nullableString(value);
  return normalized ? (normalized as Criterion) : null;
}

function nullableLevel(value: unknown) {
  const normalized = nullableString(value);
  return normalized ? (normalized as Level) : null;
}

function normalizeStatus(value: unknown): DecisionImportStatus {
  const status = nullableString(value) ?? "draft";
  if (status === "completed") return "confirmed";
  if (status === "metadata_processing") return "extracting_metadata";
  if (status === "roster_processing") return "parsing_roster";
  return status as DecisionImportStatus;
}

function normalizeValidationStatus(value: unknown): DecisionImportValidationStatus {
  const status = nullableString(value) ?? "valid";
  if (status === "error") return "invalid";
  if (status === "missing_mssv") return "missing_student_code";
  return status as DecisionImportValidationStatus;
}

function normalizeUxStatus(value: unknown): UxStatus | null {
  const row = asRecord(value);
  if (!row) return null;
  const label = nullableString(row.label);
  if (!label) return null;

  return {
    step: nullableString(row.step),
    label,
    message: nullableString(row.message),
    nextAction: nullableString(row.nextAction ?? row.next_action),
    severity: nullableString(row.severity) as UxStatus["severity"],
    progressPercent: nullableNumber(row.progressPercent ?? row.progress_percent),
    badges: stringArray(row.badges),
  };
}

function summarizeSafeRawRow(raw: Record<string, unknown> | null) {
  if (!raw) return undefined;
  const blocked = /raw|json|token|secret|authorization|signed|url|response|header/i;
  const safeEntries = Object.entries(raw)
    .filter(
      ([key, value]) =>
        !blocked.test(key) && ["string", "number", "boolean"].includes(typeof value),
    )
    .slice(0, 8)
    .map(([key, value]) => [key, value as string | number | boolean] as const);

  return safeEntries.length ? Object.fromEntries(safeEntries) : undefined;
}

export const decisionImportApi = {
  create: async (input: DecisionImportCreateInput) => {
    const response = await apiClient<unknown>("/api/decision-imports", {
      method: "POST",
      body: input,
    });
    return { ...response, data: normalizeDecisionImportPayload(response.data) };
  },

  list: async (filters?: DecisionImportListFilters) => {
    const response = await apiClient<ListPayload>(`/api/decision-imports${toQuery(filters)}`, {
      method: "GET",
    });
    return { ...response, data: normalizeImportList(response.data) };
  },

  get: async (importId: string) => {
    const response = await apiClient<unknown>(`/api/decision-imports/${importId}`, {
      method: "GET",
    });
    return { ...response, data: normalizeDecisionImportPayload(response.data) };
  },

  uploadFile: async (importId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient<unknown>(`/api/decision-imports/${importId}/files`, {
      method: "POST",
      body: formData,
    });
    return { ...response, data: normalizeDecisionImportPayload(response.data) };
  },

  start: async (importId: string) => {
    const response = await apiClient<unknown>(`/api/decision-imports/${importId}/start`, {
      method: "POST",
    });
    return { ...response, data: normalizeDecisionImportPayload(response.data) };
  },

  getStatus: async (importId: string) => {
    const response = await apiClient<unknown>(`/api/decision-imports/${importId}/status`, {
      method: "GET",
    });
    return { ...response, data: normalizeDecisionImportPayload(response.data) };
  },

  getMetadata: async (importId: string) => {
    const response = await apiClient<unknown>(`/api/decision-imports/${importId}/metadata`, {
      method: "GET",
    });
    return { ...response, data: normalizeMetadataPayload(response.data) };
  },

  getTables: async (importId: string) => {
    const response = await apiClient<TablesPayload>(`/api/decision-imports/${importId}/tables`, {
      method: "GET",
    });
    return { ...response, data: normalizeTablesPayload(response.data) };
  },

  getPreview: async (importId: string) => {
    const response = await apiClient<unknown>(`/api/decision-imports/${importId}/preview`, {
      method: "GET",
    });
    return { ...response, data: normalizePreviewPayload(response.data) };
  },

  updateColumnMapping: async (importId: string, columnMapping: DecisionImportColumnMapping) => {
    const response = await apiClient<unknown>(`/api/decision-imports/${importId}/column-mapping`, {
      method: "PATCH",
      body: { mapping: toBackendMapping(columnMapping) },
    });
    return { ...response, data: normalizeDecisionImportPayload(response.data) };
  },

  confirm: async (importId: string, input?: DecisionImportConfirmInput) => {
    const response = await apiClient<unknown>(`/api/decision-imports/${importId}/confirm`, {
      method: "POST",
      body: input ?? {},
    });
    return {
      ...response,
      data: normalizeDecisionImportPayload(response.data) as DecisionImportConfirmResult,
    };
  },

  cancel: async (importId: string) => {
    const response = await apiClient<unknown>(`/api/decision-imports/${importId}/cancel`, {
      method: "POST",
    });
    return { ...response, data: normalizeDecisionImportPayload(response.data) };
  },

  getAudit: async (importId: string) => {
    try {
      const response = await apiClient<unknown>(`/api/decision-imports/${importId}/audit`, {
        method: "GET",
      });
      return { ...response, data: normalizeAuditPayload(response.data) };
    } catch {
      const fallback = await auditApi.getEntityAudit("decision_import", importId);
      return { ...fallback, data: normalizeAuditPayload(fallback.data) };
    }
  },
};
