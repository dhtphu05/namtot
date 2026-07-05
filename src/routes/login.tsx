import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, FileText, Loader2, ShieldCheck, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/features/auth/api/auth";
import { authKeys } from "@/features/auth/hooks/useMe";
import { getDefaultAppPathForRole, toUiRole } from "@/features/auth/role-map";
import { useAuth } from "@/features/auth/store/auth-store";
import { ApiError } from "@/lib/api/client";
import { useApp } from "@/lib/store";

const quickRoles = [
  {
    label: "Sinh viên",
    desc: "Tạo hồ sơ, thêm minh chứng, kiểm tra và theo dõi xét duyệt.",
    email: "student@dut.udn.vn",
    icon: FileText,
  },
  {
    label: "Cán bộ xét duyệt",
    desc: "Xử lý tiêu chí được phân công và yêu cầu bổ sung khi cần.",
    email: "officer.academic@dut.udn.vn",
    icon: ShieldCheck,
  },
  {
    label: "Hội đồng / Quản lý",
    desc: "Theo dõi tiến độ, phân công và chốt kết quả cuối.",
    email: "manager@dut.udn.vn",
    icon: BarChart3,
  },
  {
    label: "Tập thể / Chi hội",
    desc: "Quản lý hồ sơ tập thể, roster và minh chứng chung.",
    email: "classrep@dut.udn.vn",
    icon: UsersRound,
  },
];

function persistAuthSession(data: { user: unknown; accessToken: string; refreshToken: string }) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    "5tot-auth",
    JSON.stringify({
      state: {
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      },
      version: 0,
    }),
  );
}

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Đăng nhập - 5TOT Platform" }] }),
  beforeLoad: () => {
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
  const setAuthData = useAuth((s) => s.setAuthData);
  const setRole = useApp((s) => s.setRole);
  const resetSessionState = useApp((s) => s.resetSessionState);
  const [email, setEmail] = useState("student@dut.udn.vn");
  const [password, setPassword] = useState("Password@123");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      const res = await authApi.login(email.trim(), password);
      queryClient.clear();
      resetSessionState();
      persistAuthSession(res.data);
      setAuthData(res.data.user, res.data.accessToken, res.data.refreshToken);
      queryClient.setQueryData(authKeys.me, res.data.user);
      setRole(toUiRole(res.data.user.role));
      toast.success("Đăng nhập thành công.");
      nav({ to: getDefaultAppPathForRole(res.data.user.role) });
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(`Đăng nhập thất bại: ${err.message}`);
      } else {
        toast.error("Đăng nhập thất bại. Vui lòng thử lại.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB] px-6 py-10">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="mb-7">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-[#0057C2] text-lg font-bold text-white">
              5T
            </div>
            <div className="mt-5 text-xs font-bold uppercase tracking-wide text-[#0057C2]">
              Đăng nhập
            </div>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[#0F172A]">
              Tiếp tục hồ sơ Sinh viên 5 tốt
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[#64748B]">
              Sinh viên sẽ được đưa thẳng về workspace hồ sơ. Tài khoản truy cập nhanh chỉ dùng để
              xem từng vai trò.
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-[#0F172A]">
                  Dùng tài khoản truy cập nhanh
                </div>
                <div className="text-xs text-[#64748B]">Mật khẩu mặc định: Password@123</div>
              </div>
              <span className="rounded-full bg-[#FFF7E6] px-3 py-1 text-xs font-bold text-amber-700">
                Nhanh
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {quickRoles.map((role) => {
                const Icon = role.icon;
                const active = email === role.email;
                return (
                  <button
                    key={role.email}
                    type="button"
                    onClick={() => {
                      setEmail(role.email);
                      setPassword("Password@123");
                    }}
                    className={`rounded-3xl p-4 text-left transition-colors ${
                      active ? "bg-[#EAF3FF]" : "bg-[#F8FAFC] hover:bg-[#EAF3FF]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#0057C2]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-[#0F172A]">{role.label}</div>
                        <div className="mt-1 text-xs leading-5 text-[#64748B]">{role.desc}</div>
                        <div className="mt-3 truncate rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0057C2]">
                          {role.email}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <form
            onSubmit={handleLogin}
            className="rounded-xl bg-white p-7 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.55)]"
          >
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-[#0057C2]">
                Tài khoản của bạn
              </div>
              <h2 className="mt-1 text-2xl font-extrabold text-[#0F172A]">Vào hệ thống</h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Nhập email và mật khẩu để tiếp tục hồ sơ.
              </p>
            </div>

            <div className="mt-6 space-y-2">
              <label className="text-sm font-semibold text-[#0F172A]">Email</label>
              <input
                type="email"
                required
                className="flex h-11 w-full rounded-2xl bg-[#F8FAFC] px-3 py-2 text-sm outline-none ring-[#0057C2]/20 placeholder:text-[#94A3B8] focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-sm font-semibold text-[#0F172A]">Mật khẩu</label>
              <input
                type="password"
                required
                className="flex h-11 w-full rounded-2xl bg-[#F8FAFC] px-3 py-2 text-sm outline-none ring-[#0057C2]/20 placeholder:text-[#94A3B8] focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Password@123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#0057C2] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#004ba8] disabled:pointer-events-none disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  Đăng nhập <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>

            <div className="mt-6 text-center text-sm text-[#64748B]">
              Chưa có tài khoản?{" "}
              <Link to="/signup" className="font-bold text-[#0057C2] hover:underline">
                Đăng ký để nộp hồ sơ
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
