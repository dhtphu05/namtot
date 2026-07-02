import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/features/auth/api/auth";
import { toUiRole } from "@/features/auth/role-map";
import { useAuth } from "@/features/auth/store/auth-store";
import { ApiError } from "@/lib/api/client";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Đăng ký - 5TOT Platform" }] }),
  beforeLoad: () => {
    const { accessToken } = useAuth.getState();
    if (accessToken) {
      throw redirect({ to: "/app" });
    }
  },
  component: Signup,
});

function Signup() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const setAuthData = useAuth((s) => s.setAuthData);
  const setRole = useApp((s) => s.setRole);
  const resetSessionState = useApp((s) => s.resetSessionState);
  const [fullName, setFullName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [email, setEmail] = useState("");
  const [className, setClassName] = useState("");
  const [faculty, setFaculty] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Mật khẩu cần tối thiểu 8 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.register({
        fullName: fullName.trim(),
        studentCode: studentCode.trim(),
        email: email.trim(),
        password,
        className: className.trim() || undefined,
        faculty: faculty.trim() || undefined,
        phone: phone.trim() || undefined,
      });

      queryClient.clear();
      resetSessionState();
      setAuthData(res.data.user, res.data.accessToken, res.data.refreshToken);
      setRole(toUiRole(res.data.user.role));
      toast.success("Đăng ký thành công!");
      nav({ to: "/app" });
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(`Đăng ký thất bại: ${err.message}`);
      } else {
        toast.error("Đăng ký thất bại. Vui lòng thử lại.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
          <div className="gradient-brand mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl text-xl font-bold text-white shadow-[var(--shadow-glow)]">
            5T
          </div>
          <h1 className="text-3xl font-extrabold text-brand-deep md:text-4xl">Tạo tài khoản</h1>
          <p className="mt-3 text-muted-foreground">
            Đăng ký tài khoản sinh viên để bắt đầu hồ sơ Sinh viên 5 tốt.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <form onSubmit={handleSignup} className="card-glow space-y-5 p-7">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-foreground">Họ và tên</label>
                <input
                  type="text"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Mã sinh viên</label>
                <input
                  type="text"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm uppercase ring-offset-background placeholder:normal-case placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="21IT001"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  disabled={isLoading}
                />
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
                <label className="text-sm font-semibold text-foreground">Lớp</label>
                <input
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="21TCLC_DT1"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Khoa</label>
                <input
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Công nghệ thông tin"
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-foreground">Số điện thoại</label>
                <input
                  type="tel"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="0901234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Mật khẩu</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Xác nhận mật khẩu</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="********"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
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
                  <UserPlus className="mr-2 h-4 w-4" />
                  Đăng ký <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Đã có tài khoản?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Đăng nhập
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
