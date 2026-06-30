import { createFileRoute, useNavigate, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/store/auth-store";
import { useApp } from "@/lib/store";
import { authApi } from "@/features/auth/api/auth";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Đăng ký — 5TOT Platform" }] }),
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
  const setAuthData = useAuth((s) => s.setAuthData);
  const setRole = useApp((s) => s.setRole);
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) return;

    setIsLoading(true);
    try {
      const res = await authApi.signup(email, password, fullName);
      setAuthData(res.data.user, res.data.accessToken, res.data.refreshToken);
      setRole(res.data.user.role);
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
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="w-16 h-16 rounded-3xl gradient-brand flex items-center justify-center text-white font-bold text-xl mx-auto mb-5 shadow-[var(--shadow-glow)]">5T</div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-brand-deep">Tạo tài khoản</h1>
          <p className="text-muted-foreground mt-3">Tham gia hệ thống 5TOT Platform.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <form onSubmit={handleSignup} className="card-glow p-7 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Họ và tên</label>
              <input
                type="text"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Email</label>
              <input
                type="email"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 mt-4"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  Đăng ký <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
            
            <div className="text-center mt-6 text-sm text-muted-foreground">
              Đã có tài khoản?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Đăng nhập
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
