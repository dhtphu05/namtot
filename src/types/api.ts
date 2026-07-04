import type { ApiResponse, Pagination } from "@/lib/api/types";

export type { ApiResponse, Pagination };

export type UxSeverity = "info" | "success" | "warning" | "error" | "neutral";

export type UxStatus = {
  step?: string | null;
  label: string;
  message?: string | null;
  nextAction?: string | null;
  severity?: UxSeverity | null;
  progressPercent?: number | null;
  badges?: string[] | null;
};

export type ApiListResponse<T> = {
  items: T[];
  pagination?: Pagination;
};

export type ApiRequestMeta = {
  requestId?: string;
  [key: string]: unknown;
};

export type ApiEnvelopeError = {
  code: string;
  message: string;
  details?: unknown;
};
