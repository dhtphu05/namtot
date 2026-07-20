import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  FolderUp,
  ListChecks,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";

const studentSteps = [
  {
    icon: FileText,
    title: "Tạo hồ sơ",
    desc: "Khởi tạo hồ sơ Sinh viên 5 tốt cho năm học 2025-2026.",
  },
  {
    icon: ListChecks,
    title: "Điền 5 tiêu chí",
    desc: "Nhập chỉ số và thông tin bắt buộc theo từng tiêu chí.",
  },
  {
    icon: FolderUp,
    title: "Thêm minh chứng",
    desc: "Tải giấy xác nhận, bảng điểm, chứng chỉ và thành tích liên quan.",
  },
  {
    icon: FileCheck2,
    title: "Kiểm tra và nộp",
    desc: "Xem mức sẵn sàng, xác nhận khóa hồ sơ và gửi xét duyệt.",
  },
];

const studentSignals = [
  "Biết ngay hồ sơ còn thiếu gì",
  "Một workspace cho toàn bộ quá trình",
  "Có cảnh báo trước khi nộp",
  "Theo dõi xét duyệt theo từng tiêu chí",
];

const officerItems = [
  {
    icon: ShieldCheck,
    title: "Cán bộ xét duyệt",
    desc: "Xử lý hàng đợi, kiểm tra minh chứng và yêu cầu bổ sung khi cần.",
    href: "/app/queue",
  },
  {
    icon: BarChart3,
    title: "Hội đồng / quản lý",
    desc: "Theo dõi tiến độ, phân công, tổng hợp và chốt kết quả cuối.",
    href: "/app/analytics",
  },
  {
    icon: UserCheck,
    title: "Tập thể / Chi hội",
    desc: "Quản lý hồ sơ tập thể, thành viên và minh chứng chung.",
    href: "/app/collective",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FB] text-[#0F172A]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0057C2] font-bold text-white">
            5T
          </div>
          <div>
            <div className="font-bold text-[#0F172A]">5TOT Platform</div>
            <div className="text-[11px] font-medium text-[#64748B]">Hồ sơ Sinh viên 5 tốt</div>
          </div>
        </Link>
        <div className="hidden gap-7 text-sm font-semibold text-[#475569] md:flex">
          <a href="#steps" className="hover:text-[#0057C2]">
            Quy trình
          </a>
          <a href="#criteria" className="hover:text-[#0057C2]">
            5 tiêu chí
          </a>
          <a href="#staff" className="hover:text-[#0057C2]">
            Cán bộ
          </a>
        </div>
        <Link
          to="/login"
          className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#0057C2] shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-colors hover:bg-[#EAF3FF]"
        >
          Đăng nhập
        </Link>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-6 pb-12 pt-10 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#EAF3FF] px-3 py-1 text-xs font-bold text-[#0057C2]">
            <Sparkles className="h-3.5 w-3.5" />
            Sinh viên 5 tốt 2025-2026
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-[#0F172A] md:text-6xl">
            Nộp hồ sơ Sinh viên 5 tốt dễ hơn.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[#475569] md:text-lg">
            Tạo hồ sơ, thêm thành tích, kiểm tra điều kiện và theo dõi xét duyệt trên một workspace
            rõ ràng. Bạn luôn biết đang ở bước nào, còn thiếu gì và cần làm gì tiếp theo.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0057C2] px-6 py-3.5 text-sm font-bold text-white shadow-[0_14px_28px_-18px_rgba(0,87,194,0.65)] transition-transform hover:-translate-y-0.5"
            >
              Bắt đầu nộp hồ sơ <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-[#0057C2] shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-colors hover:bg-[#EAF3FF]"
            >
              Đăng nhập
            </Link>
            <a
              href="#criteria"
              className="inline-flex items-center rounded-2xl px-4 py-3.5 text-sm font-bold text-[#475569] transition-colors hover:text-[#0057C2]"
            >
              Xem điều kiện 5 tiêu chí
            </a>
          </div>

          <div className="mt-8 grid gap-2 sm:grid-cols-2">
            {studentSignals.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 text-sm font-medium text-[#334155]"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                {item}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="rounded-xl bg-white p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.55)]"
        >
          <div className="rounded-xl bg-[#F8FAFC] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
                  Workspace hồ sơ
                </div>
                <h2 className="mt-1 text-2xl font-extrabold text-[#0F172A]">
                  Việc cần làm tiếp theo
                </h2>
              </div>
              <span className="rounded-full bg-[#ECFDF3] px-3 py-1 text-xs font-bold text-emerald-700">
                Đang hoàn thiện
              </span>
            </div>

            <div className="mt-5 rounded-2xl bg-white p-4">
              <div className="flex items-center justify-between gap-4 text-sm font-semibold">
                <span className="text-[#475569]">Tiến độ hồ sơ</span>
                <span className="text-[#0057C2]">3/5 tiêu chí có dữ liệu</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-[#E2E8F0]">
                <div className="h-2 w-[60%] rounded-full bg-[#0057C2]" />
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {[
                ["Học tập tốt", "Đã có GPA, nên thêm bảng điểm học kỳ gần nhất", "Đủ cơ bản"],
                ["Thể lực tốt", "Chưa có giấy chứng nhận hoặc thành tích thể thao", "Cần bổ sung"],
                ["Hội nhập tốt", "Thiếu chứng chỉ hoặc hoạt động hội nhập phù hợp", "Cần bổ sung"],
              ].map(([title, desc, status]) => (
                <div key={title} className="rounded-2xl bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-bold text-[#0F172A]">{title}</div>
                    <span className="rounded-full bg-[#FFF7E6] px-2.5 py-1 text-[11px] font-bold text-amber-700">
                      {status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[#64748B]">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <section id="steps" className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-8 max-w-2xl">
          <div className="text-xs font-bold uppercase tracking-wide text-[#0057C2]">
            Quy trình sinh viên
          </div>
          <h2 className="mt-2 text-3xl font-extrabold text-[#0F172A]">
            4 bước để gửi hồ sơ xét duyệt
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {studentSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                whileHover={{ y: -3 }}
                className="rounded-xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF3FF] text-[#0057C2]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-black text-[#CBD5E1]">0{index + 1}</span>
                </div>
                <h3 className="font-bold text-[#0F172A]">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section id="criteria" className="mx-auto max-w-7xl px-6 py-14">
        <div className="rounded-xl bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-[#0057C2]">
                5 tiêu chí
              </div>
              <h2 className="mt-2 text-3xl font-extrabold text-[#0F172A]">
                Mọi tiêu chí đều có checklist riêng
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#64748B]">
                Mỗi tiêu chí hiển thị điều kiện bắt buộc, dữ liệu đã nhập, minh chứng đã có và việc
                còn thiếu. Nút hành động nằm ngay tại nơi sinh viên đang đọc.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {["Đạo đức tốt", "Học tập tốt", "Thể lực tốt", "Tình nguyện tốt", "Hội nhập tốt"].map(
                (item) => (
                  <div key={item} className="rounded-2xl bg-[#F8FAFC] p-4">
                    <div className="flex items-center gap-2 font-bold text-[#0F172A]">
                      <ClipboardCheck className="h-4 w-4 text-[#0057C2]" />
                      {item}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#64748B]">
                      Kiểm tra dữ liệu cứng, thành tích và giấy xác nhận theo cấp đăng ký.
                    </p>
                  </div>
                ),
              )}
              <div className="rounded-2xl bg-[#EAF3FF] p-4">
                <div className="font-bold text-[#0057C2]">Gợi ý cấp xét phù hợp</div>
                <p className="mt-2 text-xs leading-5 text-[#334155]">
                  Hệ thống gợi ý cấp xét dựa trên dữ liệu hiện có, cán bộ vẫn là người quyết định
                  cuối cùng.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="staff" className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-[#0057C2]">
              Dành cho cán bộ và hội đồng
            </div>
            <h2 className="mt-2 text-3xl font-extrabold text-[#0F172A]">
              Các module vận hành nằm sau flow sinh viên
            </h2>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-[#64748B]">
            <Bell className="h-3.5 w-3.5" />
            Sinh viên chỉ thấy phần cần thiết để nộp hồ sơ
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {officerItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                to={item.href}
                className="rounded-xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-transform hover:-translate-y-0.5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#0057C2]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 font-bold text-[#0F172A]">{item.title}</div>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">{item.desc}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#0057C2]">
                  Mở workspace <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
