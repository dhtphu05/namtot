import { useAuth } from "@/features/auth/store/auth-store";
import type { ApiFailure, ApiResponse } from "./types";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const API_DEBUG = import.meta.env.DEV && import.meta.env.VITE_API_DEBUG === "true";
const HOT_ENDPOINTS = [
  "/api/me",
  "/api/notifications",
  "/api/review/tasks",
  "/api/manager/applications",
  "/api/applications/current",
];

const inFlightRequests = new Map<string, Promise<ApiResponse<unknown>>>();
let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

type JsonBody =
  string | number | boolean | null | JsonBody[] | { [key: string]: JsonBody | undefined };

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | JsonBody;
  _retry?: boolean;
  _skipDedup?: boolean;
}

export class ApiError extends Error {
  public code: string;
  public status?: number;
  public details?: unknown;
  public meta?: { requestId?: string };

  constructor(
    message: string,
    code: string,
    details?: unknown,
    meta?: { requestId?: string },
    status?: number,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.meta = meta;
  }
}

function toUserFriendlyMessage(message: string, code?: string, status?: number): string {
  const raw = String(message || "").trim();
  const normalized = raw.toLowerCase();
  const normalizedCode = String(code || "").toLowerCase();

  if (
    normalized.includes("gpa must be between 0 and 4") ||
    normalized.includes("gpa không được vượt quá 4")
  ) {
    return "GPA không được vượt quá 4.0.";
  }
  if (normalized.includes("gpa must be between 0 and 10")) {
    return "GPA không được vượt quá 10.0.";
  }
  if (normalized.includes("gpa scale must be")) {
    return "Thang điểm GPA chỉ hỗ trợ 4.0 hoặc 10.0.";
  }
  if (normalized.includes("conduct score must be between 0 and 100")) {
    return "Điểm rèn luyện phải nằm trong khoảng 0-100.";
  }
  if (normalized.includes("metric value must be non-negative")) {
    return "Giá trị chỉ số không được nhỏ hơn 0.";
  }
  if (normalized.includes("metric value is required")) {
    return "Vui lòng nhập giá trị chỉ số hợp lệ.";
  }
  if (normalized.includes("this evidence/criterion does not require supplement")) {
    return "Tiêu chí này không được mở bổ sung trong đợt này.";
  }
  if (normalized.includes("evidence file is required")) {
    return "Vui lòng chọn tệp minh chứng trước khi tải lên.";
  }
  if (normalized.includes("file too large") || normalized.includes("payload too large")) {
    return "Tệp quá lớn. Vui lòng chọn tệp nhỏ hơn giới hạn cho phép.";
  }
  if (normalized.includes("unsupported file") || normalized.includes("invalid file type")) {
    return "Định dạng tệp chưa được hỗ trợ.";
  }
  if (normalized.includes("session expired") || normalized.includes("no refresh token")) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }
  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("fetch failed") ||
    normalized.includes("networkerror") ||
    normalized.includes("load failed")
  ) {
    return "Không thể kết nối tới hệ thống hồ sơ. Vui lòng kiểm tra kết nối hoặc thử tải lại.";
  }
  if (normalized.includes("forbidden") || normalizedCode.includes("forbidden") || status === 403) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }
  if (
    normalized.includes("validation failed") ||
    normalizedCode.includes("validation") ||
    status === 400
  ) {
    return "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại các trường đang báo lỗi.";
  }
  if (status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }
  if (status === 404) {
    return "Không tìm thấy dữ liệu cần xử lý.";
  }
  if (status === 409) {
    return "Trạng thái hồ sơ đã thay đổi. Vui lòng tải lại trang và thử lại.";
  }
  if (
    normalized.includes("request failed") ||
    normalized.includes("internal server error") ||
    normalized.includes("api error") ||
    normalized.includes("unknown error") ||
    status === 500
  ) {
    return "Không thể thực hiện thao tác. Vui lòng thử lại.";
  }
  return raw || "Không thể thực hiện thao tác. Vui lòng thử lại.";
}

export async function apiClient<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<ApiResponse<T>> {
  const requestKey = getRequestKey(endpoint, options);
  const canDedup = shouldDedupRequest(endpoint, options);

  if (canDedup) {
    const inFlight = inFlightRequests.get(requestKey);
    if (inFlight) {
      logApiTrace({
        endpoint,
        method: getMethod(options),
        requestKey,
        deduped: true,
      });
      return inFlight as Promise<ApiResponse<T>>;
    }
  }

  const promise = executeApiRequest<T>(endpoint, options, requestKey);
  if (canDedup) {
    inFlightRequests.set(requestKey, promise as Promise<ApiResponse<unknown>>);
    promise.finally(() => {
      inFlightRequests.delete(requestKey);
    });
  }

  return promise;
}

async function executeApiRequest<T>(
  endpoint: string,
  options: ApiOptions = {},
  requestKey = getRequestKey(endpoint, options),
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  const { body, _retry, _skipDedup, ...requestOptions } = options;
  void _skipDedup;

  const headers = new Headers(options.headers);

  const token = useAuth.getState().accessToken;
  if (token && !isAuthEndpoint(endpoint)) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let requestBody = body as BodyInit | undefined;
  if (isJsonBody(body)) {
    requestBody = JSON.stringify(body);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  const config: RequestInit = {
    ...requestOptions,
    headers,
    body: requestBody,
  };

  try {
    const response = await tracedFetch(endpoint, url, config, requestKey, false);

    let data: unknown = null;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    }

    const responseEnvelope = data as Partial<ApiResponse<T>> | null;
    const requestId =
      response.headers.get("x-request-id") ?? responseEnvelope?.meta?.requestId ?? undefined;

    if (responseEnvelope?.success === false) {
      const status = response.status;
      const code = responseEnvelope.error?.code || "API_ERROR";
      if (status === 401 && !_retry && !isAuthEndpoint(endpoint)) {
        return handle401Error<T>(endpoint, options);
      }
      throw new ApiError(
        toUserFriendlyMessage(responseEnvelope.error?.message || "API Error", code, status),
        code,
        responseEnvelope.error?.details,
        { ...responseEnvelope.meta, requestId },
        status,
      );
    }

    if (!response.ok) {
      if (response.status === 401 && !_retry && !isAuthEndpoint(endpoint)) {
        return handle401Error<T>(endpoint, options);
      }

      throw new ApiError(
        toUserFriendlyMessage(response.statusText, response.status.toString(), response.status),
        response.status.toString(),
        undefined,
        { requestId },
        response.status,
      );
    }

    if (!data) {
      return { success: true, data: null as unknown as T, error: null, meta: { requestId } };
    }

    return {
      ...(responseEnvelope as ApiResponse<T>),
      meta: {
        ...(responseEnvelope as ApiResponse<T>).meta,
        requestId,
      },
    };
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      toUserFriendlyMessage(error instanceof Error ? error.message : "Unknown error"),
      "NETWORK_ERROR",
    );
  }
}

function isAbortError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

export async function apiBlob(
  endpoint: string,
  options: Omit<ApiOptions, "body"> & { body?: BodyInit | JsonBody } = {},
): Promise<{ blob: Blob; filename?: string }> {
  const url = `${API_BASE_URL}${endpoint}`;
  const { body, ...requestOptions } = options;
  const headers = new Headers(options.headers);
  const token = useAuth.getState().accessToken;

  if (token && !isAuthEndpoint(endpoint)) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let requestBody = body as BodyInit | undefined;
  if (isJsonBody(body)) {
    requestBody = JSON.stringify(body);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  const response = await fetch(url, { ...requestOptions, headers, body: requestBody });
  if (!response.ok) {
    let message = response.statusText;
    let code = response.status.toString();
    let details: unknown;
    let meta: { requestId?: string } = {
      requestId: response.headers.get("x-request-id") ?? undefined,
    };

    if (response.headers.get("content-type")?.includes("application/json")) {
      const data = (await response.json()) as ApiFailure;
      if (data.success === false) {
        message = toUserFriendlyMessage(data.error.message, data.error.code, response.status);
        code = data.error.code;
        details = data.error.details;
        meta = data.meta;
      }
    }
    throw new ApiError(message, code, details, meta, response.status);
  }

  return {
    blob: await response.blob(),
    filename: getFilename(response.headers.get("content-disposition")),
  };
}

export const api = {
  get: <T>(endpoint: string, options?: Omit<ApiOptions, "method" | "body">) =>
    apiClient<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(
    endpoint: string,
    body?: ApiOptions["body"],
    options?: Omit<ApiOptions, "method" | "body">,
  ) => apiClient<T>(endpoint, { ...options, method: "POST", body }),
  patch: <T>(
    endpoint: string,
    body?: ApiOptions["body"],
    options?: Omit<ApiOptions, "method" | "body">,
  ) => apiClient<T>(endpoint, { ...options, method: "PATCH", body }),
  delete: <T>(endpoint: string, options?: Omit<ApiOptions, "method" | "body">) =>
    apiClient<T>(endpoint, { ...options, method: "DELETE" }),
};

function getFilename(contentDisposition: string | null): string | undefined {
  if (!contentDisposition) return undefined;
  const match = contentDisposition.match(/filename="?([^";]+)"?/i);
  return match?.[1];
}

function isJsonBody(body: ApiOptions["body"]): body is JsonBody {
  if (body === undefined) return false;
  if (body === null) return true;
  if (typeof body !== "object") return false;
  if (body instanceof FormData) return false;
  if (body instanceof Blob) return false;
  if (body instanceof URLSearchParams) return false;
  if (body instanceof ArrayBuffer) return false;
  if (ArrayBuffer.isView(body)) return false;
  return true;
}

function isAuthEndpoint(endpoint: string) {
  return endpoint === "/api/auth/login" || endpoint === "/api/auth/refresh";
}

function getMethod(options: ApiOptions) {
  return (options.method ?? "GET").toUpperCase();
}

function shouldDedupRequest(endpoint: string, options: ApiOptions) {
  const method = getMethod(options);
  return (
    !options._skipDedup && !isAuthEndpoint(endpoint) && (method === "GET" || method === "HEAD")
  );
}

function getRequestKey(endpoint: string, options: ApiOptions) {
  const method = getMethod(options);
  const body = isJsonBody(options.body)
    ? stableStringify(options.body)
    : typeof options.body === "string"
      ? options.body
      : "";
  return `${method} ${endpoint} ${body}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(",")}}`;
}

async function tracedFetch(
  endpoint: string,
  url: string,
  config: RequestInit,
  requestKey: string,
  deduped: boolean,
) {
  const startedAt = performance.now();
  try {
    const response = await fetch(url, config);
    logApiTrace({
      endpoint,
      method: config.method ?? "GET",
      requestKey,
      startedAt,
      status: response.status,
      deduped,
    });
    return response;
  } catch (error) {
    logApiTrace({
      endpoint,
      method: config.method ?? "GET",
      requestKey,
      startedAt,
      deduped,
    });
    throw error;
  }
}

function logApiTrace({
  endpoint,
  method,
  requestKey,
  startedAt,
  status,
  deduped,
}: {
  endpoint: string;
  method: string;
  requestKey: string;
  startedAt?: number;
  status?: number;
  deduped: boolean;
}) {
  if (!API_DEBUG) return;

  const durationMs =
    startedAt === undefined ? undefined : Math.round(performance.now() - startedAt);
  const payload = {
    method: method.toUpperCase(),
    url: endpoint,
    durationMs,
    status,
    requestKey,
    deduped,
  };

  if (HOT_ENDPOINTS.some((hotEndpoint) => endpoint.startsWith(hotEndpoint))) {
    console.trace("[api]", payload);
    return;
  }

  console.debug("[api]", payload);
}

async function handle401Error<T>(endpoint: string, options: ApiOptions): Promise<ApiResponse<T>> {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      subscribeTokenRefresh((token) => {
        if (token) {
          options._retry = true;
          options._skipDedup = true;
          resolve(apiClient<T>(endpoint, options));
        } else {
          reject(new ApiError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", "401"));
        }
      });
    });
  }

  const refreshToken = useAuth.getState().refreshToken;
  if (!refreshToken) {
    useAuth.getState().clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", "401");
  }

  isRefreshing = true;

  try {
    const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshRes.ok) {
      throw new Error("Refresh failed");
    }

    const refreshData = await refreshRes.json();
    if (refreshData.success && refreshData.data) {
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshData.data;

      useAuth.getState().setTokens(newAccessToken, newRefreshToken);

      isRefreshing = false;
      onRefreshed(newAccessToken);

      options._retry = true;
      options._skipDedup = true;
      return apiClient<T>(endpoint, options);
    }
    throw new Error("Invalid refresh response");
  } catch {
    isRefreshing = false;
    onRefreshed(null);
    useAuth.getState().clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", "401");
  }
}
