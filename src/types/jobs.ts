import type { UxStatus } from "./api";

export type JobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "indexed"
  | "preview_ready"
  | "confirmed"
  | "failed"
  | "cancelled";

export type JobResponse = {
  id: string;
  type?: string | null;
  status: JobStatus;
  progress?: number | null;
  progressPercent?: number | null;
  uxStatus?: UxStatus | null;
  result?: unknown;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

export const terminalJobStatuses: JobStatus[] = [
  "completed",
  "indexed",
  "preview_ready",
  "confirmed",
  "failed",
  "cancelled",
];

export function isTerminalJobStatus(status?: string | null) {
  return Boolean(status && terminalJobStatuses.includes(status as JobStatus));
}
