import type { Role } from "@/lib/api/types";

export type AuditActor = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  role?: Role | string | null;
};

export type AuditLogEntry = {
  id: string;
  action: string;
  actor?: AuditActor | string | null;
  actorId?: string | null;
  actorName?: string | null;
  role?: Role | string | null;
  entityType?: string | null;
  entityId?: string | null;
  message?: string | null;
  reason?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  details?: unknown;
  createdAt?: string;
  timestamp?: string;
};

export type AuditTimelineResponse = {
  items: AuditLogEntry[];
};
