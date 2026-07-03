import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, FileText, Loader2, ShieldCheck, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/features/auth/api/auth";
import { toUiRole } from "@/features/auth/role-map";
import { useAuth } from "@/features/auth/store/auth-store";
import { ApiError } from "@/lib/api/client";
import { useApp } from "@/lib/store";

const quickRoles = [
  {
    label: "Sinh viên",
    desc: "Hồ sơ, bản nháp, minh chứng và tiến độ.",
    email: "student@dut.udn.vn",
    icon: FileText,
  },
  {
    label: "Cán bộ xét duyệt",
    desc: "Queue, task, evidence và quyết định.",
    email: "officer.academic@dut.udn.vn",
    icon: ShieldCheck,
  },
  {
    label: "Hội đồng / Cấp quản lý",
    desc: "Quản lý mùa xét, phân công, xử lý vướng mắc và chốt kết quả.",
    email: "manager@dut.udn.vn",
    icon: BarChart3,
  },
  {
    label: "Tập thể / Chi hội",
    desc: "Hồ sơ tập thể, roster và minh chứng chung.",
    email: "classrep@dut.udn.vn",
    icon: UsersRound,
  },
  {
    label: "Cán bộ Đạo đức",
    desc: "Xét duyệt minh chứng tiêu chí Đạo đức tốt.",
    email: "officer.ethics@dut.udn.vn",
    icon: ShieldCheck,
  },
  {
    label: "Cán bộ Thể lực",
    desc: "Xét duyệt minh chứng tiêu chí Thể lực tốt.",
    email: "officer.physical@dut.udn.vn",
    icon: ShieldCheck,
  },
  {
    label: "Cán bộ Tình nguyện",
    desc: "Xét duyệt minh chứng tiêu chí Tình nguyện tốt.",
    email: "officer.volunteer@dut.udn.vn",
    icon: ShieldCheck,
  },
  {
    label: "Cán bộ Hội nhập",
    desc: "Xét duyệt minh chứng tiêu chí Hội nhập tốt.",
    email: "officer.integration@dut.udn.vn",
    icon: ShieldCheck,
  },
];

function persistAuthSession(data: {
  user: unknown;
  accessToken: string;
  refreshToken: string;
}) {
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
    const { accessToken } = useAuth.getState();
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
      setRole(toUiRole(res.data.user.role));
      toast.success("Đăng nhập thành công.");
      nav({ to: "/app" });
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
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="mb-5">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-[#0057C2] text-lg font-bold text-white shadow-[var(--shadow-glow)]">
              5T
            </div>
            <div className="mt-5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Quick start</div>
            <h1 className="mt-2 text-4xl font-extrabold text-brand-deep">Đăng nhập theo vai trò</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Trải nghiệm chọn vai trò thân thiện, nhưng vẫn dùng backend auth thật. Chọn một vai trò để điền sẵn
              account demo.
            </p>
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
                  className={`rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
                    active ? "border-[#0057C2] bg-[#F1F7FD]" : "border-[#E3ECF6] bg-white hover:bg-[#F8FBFE]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0057C2] text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-brand-deep">{role.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{role.desc}</div>
                      <div className="mt-3 truncate rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0057C2]">
                        {role.email}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <form onSubmit={handleLogin} className="card-glow space-y-5 p-7">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Backend auth</div>
              <h2 className="mt-1 text-2xl font-extrabold text-brand-deep">Vào hệ thống</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Mật khẩu demo mặc định: <b>Password@123</b>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Email</label>
              <input
                type="email"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Mật khẩu</label>
              <input
                type="password"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Password@123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  Đăng nhập <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>

            <div className="text-center text-sm text-muted-foreground">
              Chưa có tài khoản?{" "}
              <Link to="/signup" className="font-medium text-primary hover:underline">
                Đăng ký ngay
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
