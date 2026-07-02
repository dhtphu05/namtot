/**
 * Collective feature types
 * Generated stub to resolve import in collective.ts
 */

export type Level = "school" | "university" | "city" | "central";

export type EvidenceSourceType =
  | "metric_input"
  | "manual_upload"
  | "event_import"
  | "collective_import";

export type IndexingStatus =
  | "pending"
  | "processing"
  | "indexed"
  | "failed";

export interface CollectiveMember {
  id: string;
  studentId: string;
  fullName: string;
  studentCode: string;
  email?: string | null;
  role?: string | null;
  joinedAt?: string | null;
}

export interface CollectiveMemberInput {
  studentId?: string;
  fullName: string;
  studentCode: string;
  email?: string | null;
  role?: string | null;
}

export interface RosterImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

export interface EvidenceResponse {
  id: string;
  evidenceName: string;
  criterion: string;
  sourceType: EvidenceSourceType;
  status: string;
  confidence?: number | null;
  note?: string | null;
  createdAt: string;
  files?: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    url?: string | null;
  }>;
}

export interface CollectivePrecheckView {
  collectiveId: string;
  level: Level;
  passed: boolean;
  score?: number | null;
  checks: Array<{
    label: string;
    passed: boolean;
    required: boolean;
    note?: string | null;
  }>;
  warnings?: string[];
  createdAt: string;
}

export interface CurrentCollectiveResponse {
  id: string;
  className: string;
  schoolYear: string;
  targetLevel: Level;
  status: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentCollectiveEmpty {
  exists: false;
}
