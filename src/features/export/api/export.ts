import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/store/auth-store";
import type { ApiResponse, ApplicationStatus, Level, QueryValue } from "@/features/review/types";

export type ExportFormat = "csv" | "json";
export type ExportDataset = "applications" | "reviewTasks" | "reviewResults";

export type ExportApplicationsParams = {
  schoolYear?: string;
  targetLevel?: Level;
  status?: ApplicationStatus;
  faculty?: string;
};

export type ExportApplicationsResponse = {
  downloadUrl?: string;
  content?: string | Record<string, unknown> | Array<Record<string, unknown>>;
  filename?: string;
  format: ExportFormat;
};

function withDataFallback<T>(response: ApiResponse<T>, fallback: T | null = null): ApiResponse<T> {
  return {
    ...response,
    data: response.data ?? fallback,
  };
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function buildQueryString(params?: Record<string, QueryValue>) {
  const query = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function buildExportEndpoint(format: ExportFormat, params?: ExportApplicationsParams) {
  return `/api/exports/applications.${format}${buildQueryString(params)}`;
}

function buildReviewTasksEndpoint(params?: ExportApplicationsParams) {
  return `/api/exports/review-tasks.csv${buildQueryString(params)}`;
}

function getContentType(format: ExportFormat) {
  return format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8";
}

function createBlobFromContent(
  content: ExportApplicationsResponse["content"],
  format: ExportFormat,
) {
  if (typeof content === "string") {
    return new Blob([content], { type: getContentType(format) });
  }

  return new Blob([JSON.stringify(content ?? {}, null, 2)], { type: getContentType(format) });
}

async function fetchWithAuth(url: string, format: ExportFormat, init?: RequestInit) {
  const headers = new Headers({ Accept: getContentType(format) });
  const token = useAuth.getState().accessToken;

  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers,
  });

  return response;
}

function toAbsoluteUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

async function parseError(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => null);
    const message = body?.error?.message ?? body?.message;

    if (message) {
      return message;
    }
  }

  if (response.status === 404) {
    return "Endpoint export chưa được backend hỗ trợ.";
  }

  return `Không thể xuất dữ liệu (${response.status} ${response.statusText}).`;
}

export const exportApi = {
  getApplicationsExportUrl: (format: ExportFormat, params?: ExportApplicationsParams): string => {
    return `${BASE_URL}${buildExportEndpoint(format, params)}`;
  },

  exportApplications: async (
    format: ExportFormat,
    params?: ExportApplicationsParams,
  ): Promise<ApiResponse<ExportApplicationsResponse>> => {
    const response = await apiClient<ExportApplicationsResponse>(
      buildExportEndpoint(format, params),
    );

    return withDataFallback(response, { format });
  },

  downloadApplicationsExport: async (
    format: ExportFormat,
    params?: ExportApplicationsParams,
  ): Promise<Blob> => {
    const response = await fetchWithAuth(
      exportApi.getApplicationsExportUrl(format, params),
      format,
    );
    const contentType = response.headers.get("content-type") ?? "";

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    if (contentType.includes("application/json")) {
      const body = (await response.json()) as ApiResponse<ExportApplicationsResponse>;

      if (body.success === false) {
        throw new Error(body.error?.message ?? "Không thể xuất dữ liệu.");
      }

      if (body.data?.downloadUrl) {
        const fileResponse = await fetchWithAuth(toAbsoluteUrl(body.data.downloadUrl), format);

        if (!fileResponse.ok) {
          throw new Error(await parseError(fileResponse));
        }

        return fileResponse.blob();
      }

      return createBlobFromContent(body.data?.content ?? body.data ?? {}, format);
    }

    return response.blob();
  },

  downloadReviewTasksExport: async (params?: ExportApplicationsParams): Promise<Blob> => {
    const response = await fetchWithAuth(`${BASE_URL}${buildReviewTasksEndpoint(params)}`, "csv");

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    return response.blob();
  },

  downloadReviewResultsExport: async (
    format: ExportFormat,
    params?: ExportApplicationsParams,
  ): Promise<Blob> => {
    const response = await fetchWithAuth(`${BASE_URL}/api/exports/review-results`, format, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ ...params, format }),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const body = (await response.json()) as ApiResponse<ExportApplicationsResponse>;

    if (body.success === false) {
      throw new Error(body.error?.message ?? "Không thể xuất dữ liệu.");
    }

    if (body.data?.downloadUrl) {
      const fileResponse = await fetchWithAuth(toAbsoluteUrl(body.data.downloadUrl), format);

      if (!fileResponse.ok) {
        throw new Error(await parseError(fileResponse));
      }

      return fileResponse.blob();
    }

    return createBlobFromContent(body.data?.content ?? body.data ?? {}, format);
  },
};
