import type { Role } from "@/features/review/types";

export type AuditLogParams = {
  applicationId?: string;
  taskId?: string;
  caseId?: string;
  actorId?: string;
  role?: Role;
  action?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
};

export type AuditLogEntry = {
  id: string;
  actorId?: string | null;
  actor: string;
  role: Role;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  before?: string | null;
  after?: string | null;
  reason?: string | null;
  note?: string | null;
  details?: unknown;
  createdAt: string;
};

export type AuditLogResponse = {
  items: AuditLogEntry[];
};
