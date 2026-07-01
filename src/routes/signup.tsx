import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/features/auth/store/auth-store";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Dang ky - 5TOT Platform" }] }),
  beforeLoad: () => {
    const { accessToken } = useAuth.getState();
    if (accessToken) {
      throw redirect({ to: "/app" });
    }
  },
  component: Signup,
});

function Signup() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="w-16 h-16 rounded-3xl gradient-brand flex items-center justify-center text-white font-bold text-xl mx-auto mb-5 shadow-[var(--shadow-glow)]">
            5T
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-brand-deep">
            Tao tai khoan
          </h1>
          <p className="text-muted-foreground mt-3">
            Phase 1 chi ho tro dang nhap bang tai khoan seed.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="card-glow p-7 space-y-5 text-center">
            <p className="text-sm text-muted-foreground">
              Backend contract hien tai khong co endpoint dang ky. Hay dung tai
              khoan mau trong tai lieu Phase 1 de dang nhap.
            </p>

            <Link
              to="/login"
              className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Den trang dang nhap <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
