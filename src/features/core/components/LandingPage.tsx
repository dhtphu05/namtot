import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  Database,
  FileCheck2,
  FileText,
  GitBranch,
  ScanFace,
  Shield,
  Sparkles,
  Upload,
  UserCheck,
} from "lucide-react";

const flow = [
  { icon: FileText, title: "Tạo hồ sơ", desc: "Khởi tạo hồ sơ SV5T duy nhất theo năm học." },
  { icon: ClipboardCheck, title: "Lưu bản nháp", desc: "Nhập thông tin, chỉ số, cấp aim và tự động lưu." },
  { icon: Upload, title: "Upload minh chứng", desc: "Tải file theo 5 tiêu chí, theo dõi indexing/OCR." },
  { icon: FileCheck2, title: "Nộp hồ sơ", desc: "Khóa hồ sơ và tạo review task cho cán bộ." },
  { icon: UserCheck, title: "Cán bộ duyệt", desc: "Chấp nhận, từ chối, yêu cầu bổ sung hoặc chuyển hội đồng." },
  { icon: BarChart3, title: "Dashboard", desc: "Tổng hợp, workload, audit và export kết quả." },
];

const modules = [
  {
    icon: FileText,
    title: "Hồ sơ cá nhân",
    desc: "Start, autosave, metric, target level, submit và tracking.",
    status: "Đã nối backend",
  },
  {
    icon: Upload,
    title: "Kho minh chứng",
    desc: "Evidence theo tiêu chí, upload file, indexing job và Evidence Card.",
    status: "Đã nối backend",
  },
  {
    icon: Sparkles,
    title: "AI Precheck",
    desc: "Tiền kiểm hồ sơ, missing items, warnings và next best action.",
    status: "Hỗ trợ",
  },
  {
    icon: GitBranch,
    title: "Cascade Review",
    desc: "Gợi ý cấp xét phù hợp từ Trường đến Trung ương.",
    status: "Hỗ trợ",
  },
  {
    icon: Shield,
    title: "Review Queue",
    desc: "Hàng chờ cán bộ, filter theo tiêu chí/trạng thái và quyết định.",
    status: "Đã nối backend",
  },
  {
    icon: BarChart3,
    title: "Manager Dashboard",
    desc: "Danh sách hồ sơ, workload, aggregation và chốt kết quả.",
    status: "Đã nối backend",
  },
  {
    icon: Database,
    title: "Audit / Export",
    desc: "Lưu vết hành động và xuất danh sách phục vụ hội đồng.",
    status: "Đang tích hợp",
  },
  {
    icon: Cpu,
    title: "VNPT / eKYC",
    desc: "SmartReader, Smartbot, SmartUX và xác thực sinh viên.",
    status: "Demo",
  },
];

const roles = [
  {
    title: "Sinh viên",
    desc: "Tạo hồ sơ, lưu nháp, upload minh chứng, nộp và theo dõi trạng thái.",
    href: "/app/drafts",
  },
  {
    title: "Cán bộ xét duyệt",
    desc: "Xử lý queue minh chứng, ghi chú quyết định và yêu cầu bổ sung.",
    href: "/app/queue",
  },
  {
    title: "Quản lý / Hội đồng",
    desc: "Theo dõi dashboard, phân công, aggregation, resolution và export.",
    href: "/app/analytics",
  },
  {
    title: "Tập thể / Chi hội",
    desc: "Quản lý hồ sơ tập thể, thành viên, roster và minh chứng chung.",
    href: "/app/collective",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0057C2] font-bold text-white shadow-[var(--shadow-glow)]">
            5T
          </div>
          <div>
            <div className="font-bold text-brand-deep">5TOT Platform</div>
            <div className="text-[11px] text-muted-foreground">Hồ sơ Sinh viên 5 tốt</div>
          </div>
        </Link>
        <div className="hidden gap-7 text-sm font-medium text-foreground/80 md:flex">
          <a href="#flow" className="hover:text-brand-deep">Luồng nghiệp vụ</a>
          <a href="#features" className="hover:text-brand-deep">Module</a>
          <a href="#roles" className="hover:text-brand-deep">Vai trò</a>
        </div>
        <Link
          to="/login"
          className="rounded-lg bg-[#0057C2] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5"
        >
          Đăng nhập
        </Link>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-12 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="chip mb-5">
            <Sparkles className="h-3.5 w-3.5" /> Vietnamese Student HackAIthon 2026
          </span>
          <h1 className="text-5xl font-extrabold leading-tight text-brand-deep md:text-6xl">
            Hồ sơ Sinh viên 5 tốt
            <span className="block text-[#0057C2]">dễ nộp, dễ duyệt, dễ tin.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            UX mới giúp người dùng vào việc nhanh hơn. UI được làm dày lại bằng dashboard, upload,
            review queue, cascade, audit và các module AI hỗ trợ thay vì ẩn hết tính năng sau landing.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0057C2] px-6 py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5"
            >
              Bắt đầu theo vai trò <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/app/drafts"
              className="rounded-lg bg-white px-6 py-3.5 text-sm font-semibold text-brand-deep shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5"
            >
              Xem workspace hồ sơ
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-5">
            {["Non-AI flow đầy đủ", "AI chỉ hỗ trợ", "Cán bộ quyết định", "Audit và export"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-foreground/80">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {item}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
          className="card-glow p-6"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live product map</div>
              <h2 className="mt-1 text-2xl font-bold text-brand-deep">Một hệ thống, nhiều module</h2>
            </div>
            <span className="chip">2025-2026</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {modules.slice(0, 6).map((module) => {
              const Icon = module.icon;
              return (
                <div key={module.title} className="rounded-lg border border-[#E3ECF6] bg-[#F8FBFE] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0057C2] text-white">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#0057C2]">
                      {module.status}
                    </span>
                  </div>
                  <div className="mt-3 font-bold text-brand-deep">{module.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{module.desc}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </section>

      <section id="flow" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="chip">Luồng non-AI cốt lõi</span>
            <h2 className="mt-4 text-4xl font-bold text-brand-deep">Từ bản nháp đến công nhận</h2>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            AI/OCR/cascade là lớp hỗ trợ. Luồng chính vẫn chạy đủ bằng thao tác người dùng và cán bộ.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {flow.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div key={step.title} whileHover={{ y: -4 }} className="card-soft p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0057C2] text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">0{index + 1}</span>
                </div>
                <h3 className="font-bold text-brand-deep">{step.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 text-center">
          <span className="chip">Module không bị ẩn</span>
          <h2 className="mt-4 text-4xl font-bold text-brand-deep">Giữ UX gọn, trả lại cảm giác sản phẩm đầy đủ</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <motion.div key={module.title} whileHover={{ y: -4 }} className="card-soft p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0057C2] text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-[#EEF9FF] px-2.5 py-1 text-[10px] font-bold text-[#0057C2]">
                    {module.status}
                  </span>
                </div>
                <h3 className="font-bold text-brand-deep">{module.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{module.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section id="roles" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 text-center">
          <span className="chip">Vai trò</span>
          <h2 className="mt-4 text-4xl font-bold text-brand-deep">Mỗi vai trò có một lối vào rõ ràng</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {roles.map((role) => (
            <Link key={role.title} to={role.href} className="card-glow block p-6 transition-transform hover:-translate-y-1">
              <div className="text-xs font-bold uppercase tracking-wide text-[#0057C2]">Workspace</div>
              <div className="mt-2 font-bold text-brand-deep">{role.title}</div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{role.desc}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0057C2]">
                Mở workspace <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="mt-10 border-t border-[#dff2ff]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground">
          <div>© 2026 5TOT Platform - Vietnamese Student HackAIthon 2026</div>
          <div>UX friendly như bản mới, visual và module richness gần với bản cũ.</div>
        </div>
      </footer>
    </div>
  );
}
