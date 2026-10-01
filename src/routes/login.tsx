import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { authApi } from "@/features/auth/api/auth";
import { authKeys } from "@/features/auth/hooks/useMe";
import { getDefaultAppPathForRole, toUiRole } from "@/features/auth/role-map";
import { useAuth, waitForAuthHydration } from "@/features/auth/store/auth-store";
import { ApiError } from "@/lib/api/client";
import { useApp } from "@/lib/store";
import hsvvnEmblemUrl from "@/assets/hsvvn-emblem.webp";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Đăng nhập | 5TOT Đà Nẵng" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;

    await waitForAuthHydration();

    const { accessToken, user } = useAuth.getState();
    if (accessToken && user) {
      throw redirect({ to: getDefaultAppPathForRole(user.role) });
    }
    if (accessToken) {
      throw redirect({ to: "/app" });
    }
  },
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const setAuthData = useAuth((state) => state.setAuthData);
  const setRole = useApp((state) => state.setRole);
  const resetSessionState = useApp((state) => state.resetSessionState);
  const id = useId();
  const [isClientReady, setIsClientReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;

    setErrorMessage("");
    setIsLoading(true);
    try {
      const result = await authApi.login(email.trim(), password);
      const loginData = result.data;
      if (!loginData) {
        setErrorMessage("Không thể đăng nhập lúc này. Vui lòng thử lại.");
        return;
      }
      queryClient.clear();
      resetSessionState();
      setAuthData(loginData.user, loginData.accessToken, loginData.refreshToken);
      queryClient.setQueryData(authKeys.me, loginData.user);
      setRole(toUiRole(loginData.user.role));
      await nav({ to: getDefaultAppPathForRole(loginData.user.role), replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.code === "INVALID_CREDENTIALS") {
        setErrorMessage("Email hoặc mật khẩu chưa đúng.");
      } else if (error instanceof ApiError && error.code === "USER_INACTIVE") {
        setErrorMessage("Tài khoản hiện chưa hoạt động. Vui lòng liên hệ đơn vị quản lý.");
      } else if (error instanceof ApiError && error.code === "RATE_LIMITED") {
        setErrorMessage("Bạn đã thử đăng nhập nhiều lần. Vui lòng chờ rồi thử lại.");
      } else {
        setErrorMessage("Không thể đăng nhập lúc này. Vui lòng thử lại.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center bg-[#F8FAFC] px-5 py-8 sm:px-8">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-lg border border-[#DCE3EB] bg-white lg:grid-cols-2">
        <section className="flex flex-col justify-between bg-[#F2F7FC] p-6 sm:p-10 lg:p-12">
          <Link
            to="/"
            aria-label="Về trang chủ 5TOT Đà Nẵng"
            className="inline-flex w-fit items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2] focus-visible:ring-offset-2"
          >
            <img
              src={hsvvnEmblemUrl}
              alt="Biểu trưng Hội Sinh viên Việt Nam"
              width={52}
              height={52}
              className="h-12 w-12 shrink-0 object-contain"
            />
            <span>
              <span className="block text-sm font-bold text-[#123B6D]">5TOT Đà Nẵng</span>
              <span className="block text-xs text-[#526174]">
                Hội Sinh viên Việt Nam thành phố Đà Nẵng
              </span>
            </span>
          </Link>

          <div className="py-10 lg:py-16">
            <p className="text-sm font-semibold text-[#0057C2]">Cổng thông tin chính thức</p>
            <h1 className="mt-3 max-w-lg text-3xl font-bold leading-tight tracking-tight text-[#123B6D] sm:text-4xl">
              Hệ thống quản lý và xét chọn Sinh viên 5 tốt cấp Thành phố
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-[#526174]">
              Đăng nhập để chuẩn bị hồ sơ, quản lý minh chứng hoặc tiếp tục công việc theo tài khoản
              được cấp.
            </p>
          </div>

          <Link
            to="/"
            className="min-h-10 w-fit rounded-md text-sm font-medium text-[#0057C2] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2]"
          >
            Về trang 5TOT Đà Nẵng
          </Link>
        </section>

        <section className="p-6 sm:p-10 lg:p-12">
          <div className="mb-7">
            <p className="text-sm font-semibold text-[#0057C2]">Khu vực tài khoản</p>
            <h2 className="mt-2 text-2xl font-bold text-[#123B6D]">Đăng nhập hệ thống</h2>
            <p className="mt-2 text-sm leading-6 text-[#526174]">
              Sử dụng email và mật khẩu đã đăng ký hoặc được cấp.
            </p>
          </div>

          <form onSubmit={handleLogin} aria-busy={isLoading} className="space-y-5">
            {errorMessage && (
              <div
                id={`${id}-error`}
                role="alert"
                className="rounded-md border border-[#E7B9B9] bg-[#FFF6F6] px-3 py-2.5 text-sm text-[#922B2B]"
              >
                {errorMessage}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor={`${id}-email`} className="block text-sm font-semibold text-[#25354A]">
                Email
              </label>
              <input
                id={`${id}-email`}
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrorMessage("");
                }}
                disabled={!isClientReady || isLoading}
                className="min-h-11 w-full rounded-md border border-[#B7C5D4] bg-white px-3 text-sm text-[#162033] outline-none placeholder:text-[#718096] focus-visible:ring-2 focus-visible:ring-[#0057C2] disabled:bg-[#F2F4F7]"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor={`${id}-password`}
                className="block text-sm font-semibold text-[#25354A]"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id={`${id}-password`}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setErrorMessage("");
                  }}
                  disabled={!isClientReady || isLoading}
                  className="min-h-11 w-full rounded-md border border-[#B7C5D4] bg-white px-3 pr-12 text-sm text-[#162033] outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2] disabled:bg-[#F2F4F7]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  disabled={!isClientReady || isLoading}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={showPassword}
                  aria-controls={`${id}-password`}
                  className="absolute inset-y-0 right-0 inline-flex min-h-11 min-w-11 items-center justify-center rounded-r-md text-[#425168] hover:bg-[#F2F7FC] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0057C2] disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <Eye aria-hidden="true" className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isClientReady || isLoading}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0057C2] px-4 text-sm font-semibold text-white hover:bg-[#004BA8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
              {!isClientReady || isLoading ? (
                <>
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin motion-reduce:animate-none"
                  />
                  <span role="status">{isLoading ? "Đang đăng nhập…" : "Đang tải biểu mẫu…"}</span>
                </>
              ) : (
                <>
                  Đăng nhập <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-sm text-[#526174]">
            Chưa có tài khoản sinh viên?{" "}
            <Link
              to="/signup"
              className="font-semibold text-[#0057C2] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2]"
            >
              Tạo tài khoản sinh viên
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
