import { ApiError, apiClient } from "@/lib/api/client";
import type {
  Criterion,
  EventParticipantCheck,
  EventRegistryItem,
  EventStatus,
  Level,
} from "@/lib/api/types";
import { normalizeEvidence, type EvidenceResponse } from "@/features/evidence/api/evidence";
import type { ApprovedEvidenceSearchItem, ImportEvidenceResponse } from "@/types/evidence";

export interface EventFilters {
  q?: string;
  studentCode?: string;
  criterion?: Criterion;
  organizerLevel?: Level;
  level?: Level;
  status?: EventStatus;
  page?: number;
  limit?: number;
}

export interface EventParticipantRow {
  id: string;
  eventId?: string | null;
  studentName: string;
  studentCode: string;
  className?: string | null;
  faculty?: string | null;
  participationStatus?: string | null;
  convertedValue?: number | null;
  convertedUnit?: string | null;
}

function toQuery(filters?: object) {
  const query = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (
        (typeof value === "string" || typeof value === "number" || typeof value === "boolean") &&
        value !== ""
      ) {
        query.append(key, String(value));
      }
    });
  }
  const qString = query.toString();
  return qString ? `?${qString}` : "";
}

type EventListPayload =
  | unknown[]
  | {
      items?: unknown[];
      data?: unknown[];
      events?: unknown[];
      results?: unknown[];
    };

type EventParticipantsPayload =
  | unknown[]
  | {
      items?: unknown[];
      data?: unknown[];
      participants?: unknown[];
      rows?: unknown[];
      results?: unknown[];
    };

type ApprovedEvidenceSearchPayload =
  | ApprovedEvidenceSearchItem[]
  | {
      items?: unknown[];
      data?: unknown[];
      events?: unknown[];
      results?: unknown[];
    };

function normalizeEvents(payload: EventListPayload | null): EventRegistryItem[] {
  const rows = Array.isArray(payload)
    ? payload
    : (payload?.items ?? payload?.data ?? payload?.events ?? payload?.results ?? []);

  return rows.map(normalizeEvent).filter((event): event is EventRegistryItem => Boolean(event?.id));
}

function normalizeEvent(raw: unknown): EventRegistryItem | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const sampleCertificateFile = asRecord(
    row.sampleCertificateFile ?? row.sample_certificate_file ?? row.certificateFile,
  );
  const criterion = normalizeCriterion(row.criterion);
  const organizerLevel = normalizeLevel(row.organizerLevel ?? row.organizer_level ?? row.level);

  return {
    id: stringValue(row.id ?? row.eventId ?? row.event_id),
    eventName:
      stringValue(row.eventName ?? row.event_name ?? row.name ?? row.title) || "Sự kiện SV5T",
    criterion,
    organizer: stringValue(row.organizer ?? row.organizerName ?? row.organizer_name),
    organizerLevel,
    startDate: nullableString(row.startDate ?? row.start_date),
    endDate: nullableString(row.endDate ?? row.end_date),
    convertedValue: nullableNumber(row.convertedValue ?? row.converted_value),
    convertedUnit: nullableString(row.convertedUnit ?? row.converted_unit),
    eligibleLevels: normalizeLevels(row.eligibleLevels ?? row.eligible_levels),
    participantCount: nullableNumber(row.participantCount ?? row.participant_count) ?? 0,
    rosterIndexed: booleanValue(
      row.rosterIndexed ?? row.roster_indexed ?? row.indexed,
      row.indexingStatus === "indexed" || row.indexing_status === "indexed",
    ),
    status: normalizeEventStatus(row.status),
    sampleCertificateFile: sampleCertificateFile
      ? {
          ...sampleCertificateFile,
          publicUrl: nullableString(
            sampleCertificateFile.publicUrl ??
              sampleCertificateFile.public_url ??
              sampleCertificateFile.url,
          ),
        }
      : null,
    createdAt: nullableString(row.createdAt ?? row.created_at) ?? "",
    updatedAt: nullableString(row.updatedAt ?? row.updated_at) ?? "",
  };
}

function normalizeParticipants(payload: EventParticipantsPayload | null): EventParticipantRow[] {
  const rows = Array.isArray(payload)
    ? payload
    : (payload?.items ??
      payload?.data ??
      payload?.participants ??
      payload?.rows ??
      payload?.results ??
      []);

  return rows
    .map(normalizeParticipant)
    .filter((participant): participant is EventParticipantRow =>
      Boolean(participant?.id && participant.studentCode),
    );
}

function normalizeParticipant(raw: unknown): EventParticipantRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  return {
    id: stringValue(row.id ?? row.participantId ?? row.participant_id ?? row.studentCode),
    eventId: nullableString(row.eventId ?? row.event_id),
    studentName: stringValue(
      row.studentName ?? row.student_name ?? row.fullName ?? row.full_name ?? row.name,
    ),
    studentCode: stringValue(row.studentCode ?? row.student_code ?? row.mssv),
    className: nullableString(row.className ?? row.class_name),
    faculty: nullableString(row.faculty),
    participationStatus: nullableString(row.participationStatus ?? row.participation_status),
    convertedValue: nullableNumber(row.convertedValue ?? row.converted_value),
    convertedUnit: nullableString(row.convertedUnit ?? row.converted_unit),
  };
}

function normalizeApprovedEvidenceSearch(
  payload: ApprovedEvidenceSearchPayload | null,
): ApprovedEvidenceSearchItem[] {
  const rows = Array.isArray(payload)
    ? payload
    : (payload?.items ?? payload?.data ?? payload?.events ?? payload?.results ?? []);

  return rows
    .map(normalizeApprovedEvidenceSearchItem)
    .filter((item): item is ApprovedEvidenceSearchItem =>
      Boolean(item?.event.id && item.participant.id),
    );
}

function normalizeApprovedEvidenceSearchItem(raw: unknown): ApprovedEvidenceSearchItem | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const event = asRecord(row.event) ?? row;
  const participant = asRecord(row.participant) ?? asRecord(row.eventParticipant) ?? row;

  return {
    event: {
      id: stringValue(event.id ?? row.eventId ?? row.event_id),
      eventName: stringValue(
        event.eventName ?? event.event_name ?? row.eventName ?? row.event_name,
      ),
      criterion: stringValue(event.criterion ?? row.criterion) as Criterion,
      organizer: nullableString(event.organizer ?? row.organizer),
      organizerLevel: nullableString(
        event.organizerLevel ??
          event.organizer_level ??
          event.level ??
          row.organizerLevel ??
          row.organizer_level,
      ),
      startDate: nullableString(
        event.startDate ?? event.start_date ?? row.startDate ?? row.start_date,
      ),
      endDate: nullableString(event.endDate ?? event.end_date ?? row.endDate ?? row.end_date),
      convertedValue: nullableNumber(
        event.convertedValue ?? event.converted_value ?? row.convertedValue ?? row.converted_value,
      ),
      convertedUnit: nullableString(
        event.convertedUnit ?? event.converted_unit ?? row.convertedUnit ?? row.converted_unit,
      ),
      officialDocumentNo: nullableString(
        event.officialDocumentNo ??
          event.official_document_no ??
          row.officialDocumentNo ??
          row.official_document_no,
      ),
      officialIssuer: nullableString(
        event.officialIssuer ?? event.official_issuer ?? row.officialIssuer ?? row.official_issuer,
      ),
    },
    participant: {
      id: stringValue(participant.id ?? row.participantId ?? row.participant_id),
      studentCode: stringValue(
        participant.studentCode ?? participant.student_code ?? row.studentCode ?? row.student_code,
      ),
      studentName: stringValue(
        participant.studentName ??
          participant.student_name ??
          participant.fullName ??
          participant.full_name ??
          row.studentName ??
          row.student_name,
      ),
      className: nullableString(
        participant.className ?? participant.class_name ?? row.className ?? row.class_name,
      ),
      faculty: nullableString(participant.faculty ?? row.faculty),
      participationStatus: nullableString(
        participant.participationStatus ??
          participant.participation_status ??
          row.participationStatus ??
          row.participation_status,
      ),
    },
    importable: booleanValue(row.importable, true),
    alreadyImported: booleanValue(row.alreadyImported ?? row.already_imported, false),
    reason: nullableString(row.reason ?? row.message),
    evidenceId: nullableString(row.evidenceId ?? row.evidence_id),
    uxStatus: asRecord(row.uxStatus ?? row.ux_status) as ApprovedEvidenceSearchItem["uxStatus"],
  };
}

function normalizeImportEvidenceResponse(
  payload: ImportEvidenceResponse | null,
): ImportEvidenceResponse | null {
  if (!payload || typeof payload !== "object") return payload;
  const row = payload as Record<string, unknown>;
  const evidence = row.evidence ? normalizeEvidence(row.evidence) : null;
  return {
    ...payload,
    evidence: (evidence ?? payload.evidence) as ImportEvidenceResponse["evidence"],
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
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

function booleanValue(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return fallback;
}

function normalizeCriterion(value: unknown): Criterion {
  const normalized = nullableString(value);
  const mapped: Record<string, Criterion> = {
    "dao-duc": "ethics",
    "hoc-tap": "academic",
    "the-luc": "physical",
    "tinh-nguyen": "volunteer",
    "hoi-nhap": "integration",
  };
  if (normalized && mapped[normalized]) return mapped[normalized];
  if (
    normalized === "ethics" ||
    normalized === "academic" ||
    normalized === "physical" ||
    normalized === "volunteer" ||
    normalized === "integration" ||
    normalized === "priority" ||
    normalized === "collective"
  ) {
    return normalized;
  }
  return "volunteer";
}

function normalizeLevel(value: unknown): Level {
  const normalized = nullableString(value)?.toLowerCase();
  const mapped: Record<string, Level> = {
    school: "school",
    truong: "school",
    "cấp trường": "school",
    trường: "school",
    university: "university",
    dhdn: "university",
    đhđn: "university",
    city: "city",
    "thanh-pho": "city",
    "thành phố": "city",
    central: "central",
    "trung-uong": "central",
    "trung ương": "central",
  };
  return mapped[normalized ?? ""] ?? "school";
}

function normalizeLevels(value: unknown): Level[] {
  if (Array.isArray(value)) return value.map(normalizeLevel);
  const single = normalizeLevel(value);
  return single ? [single] : [];
}

function normalizeEventStatus(value: unknown): EventStatus {
  const normalized = nullableString(value);
  if (normalized === "active" || normalized === "archived" || normalized === "draft") {
    return normalized;
  }
  if (normalized === "indexed" || normalized === "approved") return "active";
  return "active";
}

export const eventsApi = {
  listEvents: async (filters?: EventFilters) => {
    const response = await apiClient<EventListPayload>(`/api/events${toQuery(filters)}`, {
      method: "GET",
    });
    return { ...response, data: normalizeEvents(response.data) };
  },

  searchEvents: async (
    filters?: Pick<EventFilters, "studentCode" | "criterion" | "q" | "page" | "limit">,
  ) => {
    const response = await apiClient<EventListPayload>(`/api/events/search${toQuery(filters)}`, {
      method: "GET",
    });
    return { ...response, data: normalizeEvents(response.data) };
  },

  searchApprovedEvidence: async (
    filters?: Pick<EventFilters, "studentCode" | "criterion" | "q" | "page" | "limit">,
  ) => {
    try {
      const response = await apiClient<ApprovedEvidenceSearchPayload>(
        `/api/evidence-matching/search${toQuery(filters)}`,
        {
          method: "GET",
        },
      );

      return { ...response, data: normalizeApprovedEvidenceSearch(response.data) };
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) {
        throw error;
      }
    }

    const response = await apiClient<ApprovedEvidenceSearchPayload>(
      `/api/events/search${toQuery(filters)}`,
      {
        method: "GET",
      },
    );

    return { ...response, data: normalizeApprovedEvidenceSearch(response.data) };
  },

  getParticipants: async (
    eventId: string,
    params?: { page?: number; limit?: number; q?: string },
  ) => {
    const response = await apiClient<EventParticipantsPayload>(
      `/api/events/${eventId}/participants${toQuery(params)}`,
      {
        method: "GET",
      },
    );
    return { ...response, data: normalizeParticipants(response.data) };
  },

  getEvent: async (eventId: string) => {
    const response = await apiClient<unknown>(`/api/events/${eventId}`, {
      method: "GET",
    });
    return { ...response, data: normalizeEvent(response.data) };
  },

  checkParticipant: async (eventId: string, applicationId: string) => {
    return apiClient<EventParticipantCheck>(`/api/events/${eventId}/check-participant`, {
      method: "POST",
      body: { applicationId },
    });
  },

  importToApplication: async (eventId: string, applicationId: string) => {
    return apiClient<{ evidence: EvidenceResponse; card: unknown }>(
      `/api/events/${eventId}/import-to-application`,
      {
        method: "POST",
        body: { applicationId },
      },
    );
  },

  importAsEvidence: async (
    eventId: string,
    input: { applicationId: string; participantId?: string },
  ) => {
    try {
      const response = await apiClient<ImportEvidenceResponse>(
        `/api/evidence-matching/${eventId}/import`,
        {
          method: "POST",
          body: input,
        },
      );
      return { ...response, data: normalizeImportEvidenceResponse(response.data) };
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) {
        throw error;
      }
    }

    const response = await apiClient<ImportEvidenceResponse>(
      `/api/events/${eventId}/import-as-evidence`,
      {
        method: "POST",
        body: input,
      },
    );
    return { ...response, data: normalizeImportEvidenceResponse(response.data) };
  },
};
