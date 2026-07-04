import { useAuth } from "@/features/auth/store/auth-store";
import type { ApiResponse, ApiFailure } from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

type JsonBody =
  | string
  | number
  | boolean
  | null
  | JsonBody[]
  | { [key: string]: JsonBody | undefined };

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | JsonBody;
  _retry?: boolean;
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
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${endpoint}`;
  const { body, _retry, ...requestOptions } = options;
  
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
    const response = await fetch(url, config);

    // Parse JSON
    let data: any = null;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    }

    if (data && data.success === false) {
      const status = response.status;
      const code = data.error?.code || "API_ERROR";
      throw new ApiError(
        toUserFriendlyMessage(data.error?.message || "API Error", code, status),
        code,
        data.error?.details,
        data.meta,
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
        undefined,
        response.status,
      );
    }

    if (!data) {
      // In case the response is not JSON (e.g. 204 No Content or blob)
      return { success: true, data: null as unknown as T, error: null, meta: {} };
    }

    return data as ApiResponse<T>;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network errors or parsing errors
    throw new ApiError(
      toUserFriendlyMessage(error instanceof Error ? error.message : "Unknown error"),
      "NETWORK_ERROR"
    );
  }
}

export async function apiBlob(
  endpoint: string,
  options: Omit<ApiOptions, "body"> & { body?: BodyInit | JsonBody } = {},
): Promise<{ blob: Blob; filename?: string }> {
  const url = `${BASE_URL}${endpoint}`;
  const { body, ...requestOptions } = options;
  const headers = new Headers(options.headers);
  const token = useAuth.getState().accessToken;

  if (token) {
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

async function handle401Error<T>(
  endpoint: string,
  options: ApiOptions
): Promise<ApiResponse<T>> {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      subscribeTokenRefresh((token) => {
        if (token) {
          options._retry = true;
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
    const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
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
      return apiClient<T>(endpoint, options);
    } else {
      throw new Error("Invalid refresh response");
    }
  } catch (error) {
    isRefreshing = false;
    onRefreshed(null);
    useAuth.getState().clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", "401");
  }
}
