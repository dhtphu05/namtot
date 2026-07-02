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
  public details?: unknown;
  public meta?: { requestId?: string };

  constructor(message: string, code: string, details?: unknown, meta?: { requestId?: string }) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
    this.meta = meta;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${endpoint}`;
  const { body, _retry, ...requestOptions } = options;
  
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
      throw new ApiError(
        data.error?.message || "API Error",
        data.error?.code || "API_ERROR",
        data.error?.details,
        data.meta
      );
    }

    if (!response.ok) {
      if (response.status === 401 && !_retry && !isAuthEndpoint(endpoint)) {
        return handle401Error<T>(endpoint, options);
      }
      
      throw new ApiError(response.statusText, response.status.toString());
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
      error instanceof Error ? error.message : "Unknown error",
      "NETWORK_ERROR"
    );
  }
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
          reject(new ApiError("Session expired", "401"));
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
    throw new ApiError("No refresh token available", "401");
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
    throw new ApiError("Session expired", "401");
  }
}
