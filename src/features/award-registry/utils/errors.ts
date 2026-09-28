import { ApiError } from "@/lib/api/client";

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.serverMessage || error.message;
  return error instanceof Error ? error.message : "Không thể hoàn tất thao tác.";
}
