import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, Shield, BarChart3, Cpu, Bot, ScanFace, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "5TOT Platform — Hồ sơ Sinh viên 5 tốt" },
      { name: "description", content: "Nền tảng AI hỗ trợ sinh viên xây dựng hồ sơ Sinh viên 5 tốt: AI tiền kiểm minh chứng, cascade review, audit log và export." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl gradient-brand flex items-center justify-center text-white font-bold shadow-[var(--shadow-glow)]">5T</div>
          <div>
            <div className="font-bold text-brand-deep">5TOT Platform</div>
            <div className="text-[11px] text-muted-foreground">Hội Sinh viên Việt Nam</div>
          </div>
        </Link>
        <div className="hidden md:flex gap-7 text-sm font-medium text-foreground/80">
          <a href="#features" className="hover:text-brand-deep">Tính năng</a>
          <a href="#vnpt" className="hover:text-brand-deep">VNPT AI</a>
          <a href="#roles" className="hover:text-brand-deep">Vai trò</a>
        </div>
        <Link to="/login" className="gradient-brand text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-[var(--shadow-glow)] hover:-translate-y-0.5 transition-transform">
          Đăng nhập
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="chip mb-5">
            <Sparkles className="w-3.5 h-3.5" /> Vietnamese Student HackAIthon 2026
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight text-brand-deep">
            Hồ sơ <span className="bg-gradient-to-r from-[#00AEEF] to-[#0057C2] bg-clip-text text-transparent">Sinh viên 5 tốt</span> <br />nhanh hơn, đáng tin hơn.
          </h1>
          <p className="text-lg text-muted-foreground mt-6 max-w-xl leading-relaxed">
            Nền tảng AI tiền kiểm minh chứng, đề xuất cấp xét phù hợp, cascade review và audit log đầy đủ — hỗ trợ sinh viên, cán bộ xét duyệt và hội đồng các cấp.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link to="/login" className="gradient-brand text-white px-6 py-3.5 rounded-xl text-sm font-semibold shadow-[var(--shadow-glow)] hover:-translate-y-0.5 transition-transform inline-flex items-center gap-2">
              Bắt đầu demo <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/app/vnpt" className="bg-white text-brand-deep px-6 py-3.5 rounded-xl text-sm font-semibold shadow-[var(--shadow-soft)] hover:-translate-y-0.5 transition-transform">
              Xem tích hợp VNPT AI
            </Link>
          </div>
          <div className="flex flex-wrap gap-5 mt-8">
            {["AI tiền kiểm minh chứng", "Cascade Review 4 cấp", "Audit Log đầy đủ", "Export danh sách"].map((t) => (
              <div key={t} className="flex items-center gap-2 text-sm text-foreground/80">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {t}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }} className="relative">
          <div className="absolute inset-0 wave-bg rounded-3xl blur-2xl" />
          <div className="relative card-glow p-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Hồ sơ của</div>
                <div className="font-bold text-brand-deep">Nguyễn Linh An — 21IT001</div>
              </div>
              <span className="chip">Cấp Thành phố</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[88, 95, 72, 60, 84].map((v, i) => (
                <div key={i}>
                  <div className="h-24 rounded-xl bg-[#EEF9FF] relative overflow-hidden">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${v}%` }}
                      transition={{ delay: 0.4 + i * 0.1, duration: 0.6 }}
                      className="absolute bottom-0 w-full gradient-brand rounded-xl"
                    />
                  </div>
                  <div className="text-[10px] text-center mt-1 text-muted-foreground">{["Đạo đức","Học tập","Thể lực","Tình nguyện","Hội nhập"][i]}</div>
                </div>
              ))}
            </div>
            <div className="card-soft p-4 bg-gradient-to-br from-white to-[#EEF9FF]">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#00AEEF]" />
                <span className="font-semibold text-sm text-brand-deep">AI tiền kiểm</span>
              </div>
              <div className="text-sm">Hồ sơ đạt <b>88%</b> tiêu chí Cấp Thành phố. Thiếu <b>2 ngày tình nguyện</b> — gợi ý đăng ký Mùa hè xanh 2026.</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <span className="chip">Tính năng cốt lõi</span>
          <h2 className="text-4xl font-bold text-brand-deep mt-4">Từ nháp đến công nhận — một quy trình duy nhất</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Sparkles, title: "AI tiền kiểm minh chứng", desc: "VNPT SmartReader OCR + KIE bóc tách thông tin, tạo Evidence Card và đối chiếu 5 tiêu chí." },
            { icon: Shield, title: "Cascade Review 4 cấp", desc: "AI gợi ý cấp xét phù hợp: Trường → ĐHĐN → Thành phố → Trung ương." },
            { icon: Bot, title: "Chatbot SV5T", desc: "VNPT Smartbot trả lời theo hồ sơ cụ thể, kèm nguồn từ Knowledge Base." },
            { icon: ScanFace, title: "eKYC xác thực", desc: "Xác thực thông tin sinh viên qua OCR thẻ + liveness check." },
            { icon: BarChart3, title: "SmartUX Analytics", desc: "Theo dõi drop-off, completion rate và tiêu chí gây bối rối nhất." },
            { icon: Cpu, title: "Audit Log đầy đủ", desc: "Mọi quyết định của AI và con người đều được lưu vết." },
          ].map((f) => (
            <motion.div key={f.title} whileHover={{ y: -4 }} className="card-soft p-7">
              <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center text-white mb-4 shadow-[var(--shadow-glow)]">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-brand-deep text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <span className="chip">Vai trò</span>
          <h2 className="text-4xl font-bold text-brand-deep mt-4">Một nền tảng — 4 vai trò</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: "🎓", t: "Sinh viên", d: "Tạo hồ sơ, upload minh chứng, theo dõi trạng thái." },
            { icon: "🛡️", t: "Cán bộ xét duyệt", d: "Xét duyệt minh chứng với AI gợi ý và Resolution Hub." },
            { icon: "📊", t: "Quản lý / Hội đồng", d: "Theo dõi tổng quan, phân công, audit và export." },
            { icon: "🤝", t: "Tập thể / Lớp / Chi hội", d: "Hồ sơ tập thể Sinh viên 5 tốt." },
          ].map((r) => (
            <div key={r.t} className="card-glow p-6 text-center">
              <div className="text-4xl mb-3">{r.icon}</div>
              <div className="font-bold text-brand-deep">{r.t}</div>
              <div className="text-xs text-muted-foreground mt-2">{r.d}</div>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link to="/login" className="gradient-brand text-white px-7 py-3.5 rounded-xl text-sm font-semibold shadow-[var(--shadow-glow)] inline-flex items-center gap-2 hover:-translate-y-0.5 transition-transform">
            Trải nghiệm theo vai trò <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#dff2ff] mt-10">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>© 2026 5TOT Platform — Vietnamese Student HackAIthon 2026</div>
          <div>Lấy cảm hứng từ Hội Sinh viên Việt Nam</div>
        </div>
      </footer>
    </div>
  );
}
