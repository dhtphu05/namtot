import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ROLES, type Role } from "@/lib/mock-data";
import { useApp } from "@/lib/store";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Đăng nhập — 5TOT Platform" }] }),
  component: Login,
});

function Login() {
  const setRole = useApp((s) => s.setRole);
  const nav = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="w-16 h-16 rounded-3xl gradient-brand flex items-center justify-center text-white font-bold text-xl mx-auto mb-5 shadow-[var(--shadow-glow)]">5T</div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-brand-deep">Chọn vai trò để bắt đầu</h1>
          <p className="text-muted-foreground mt-3">Demo phục vụ Vietnamese Student HackAIthon 2026 — có thể đổi vai trò bất kỳ lúc nào.</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Object.entries(ROLES).map(([k, v], i) => (
            <motion.button
              key={k}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -6 }}
              onClick={() => {
                setRole(k as Role);
                nav({ to: "/app" });
              }}
              className="card-glow p-7 text-left group"
            >
              <div className="w-14 h-14 rounded-2xl gradient-brand text-white flex items-center justify-center font-extrabold text-lg mb-4 shadow-[var(--shadow-glow)]">{v.initial}</div>
              <div className="font-bold text-brand-deep text-lg">{v.label}</div>
              <div className="text-sm text-muted-foreground mt-2">{v.desc}</div>
              <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#00AEEF] group-hover:gap-3 transition-all">
                Vào hệ thống <ArrowRight className="w-4 h-4" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
