import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ClipboardCheck,
  Dumbbell,
  FileCheck2,
  FileText,
  FolderUp,
  Globe2,
  GraduationCap,
  HeartHandshake,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import hsvvnEmblemUrl from "@/assets/hsvvn-emblem.webp";
import {
  coreCriterionKeys,
  coreCriterionPresentation,
  type CoreCriterionKey,
} from "@/lib/criteria-presentation";

const criterionIcons: Record<CoreCriterionKey, LucideIcon> = {
  ethics: ShieldCheck,
  academic: GraduationCap,
  physical: Dumbbell,
  volunteer: HeartHandshake,
  integration: Globe2,
};

const workflow = [
  { title: "Chuẩn bị hồ sơ", icon: FileText },
  { title: "Thêm minh chứng", icon: FolderUp },
  { title: "Kiểm tra trước khi gửi", icon: ClipboardCheck },
  { title: "Gửi hồ sơ cấp Thành phố", icon: FileCheck2 },
  { title: "Theo dõi xét duyệt", icon: ClipboardCheck },
  { title: "Nhận kết quả", icon: FileCheck2 },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#162033]">
      <a
        href="#noi-dung-chinh"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[#123B6D] focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
      >
        Bỏ qua đến nội dung chính
      </a>

      <header className="border-b border-[#DCE3EB] bg-white">
        <nav
          aria-label="Điều hướng chính"
          className="mx-auto flex min-h-[72px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8"
        >
          <Link
            to="/"
            aria-label="5TOT Đà Nẵng"
            className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2] focus-visible:ring-offset-2"
          >
            <img
              src={hsvvnEmblemUrl}
              alt="Biểu trưng Hội Sinh viên Việt Nam"
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 object-contain"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-[#123B6D]">5TOT Đà Nẵng</span>
              <span className="hidden text-xs text-[#526174] sm:block">
                Hội Sinh viên Việt Nam TP. Đà Nẵng
              </span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <a
              href="#tieu-chi"
              className="hidden min-h-10 items-center rounded-md px-2 text-sm font-medium text-[#425168] hover:text-[#0057C2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2] sm:inline-flex"
            >
              5 tiêu chí
            </a>
            <a
              href="#quy-trinh"
              className="hidden min-h-10 items-center rounded-md px-2 text-sm font-medium text-[#425168] hover:text-[#0057C2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2] sm:inline-flex"
            >
              Quy trình
            </a>
            <Link
              to="/login"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#0057C2] px-4 text-sm font-semibold text-white hover:bg-[#004BA8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2] focus-visible:ring-offset-2"
            >
              Đăng nhập hệ thống
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      </header>

      <main id="noi-dung-chinh" className="mx-auto max-w-6xl px-5 sm:px-8">
        <section className="grid gap-8 border-b border-[#DCE3EB] py-12 sm:py-16 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)] lg:items-center lg:gap-16 lg:py-20">
          <div>
            <p className="text-sm font-semibold text-[#0057C2]">
              Hội Sinh viên Việt Nam TP. Đà Nẵng
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#123B6D] sm:text-5xl">
              5TOT Đà Nẵng
            </h1>
            <p className="mt-4 max-w-2xl text-xl font-semibold leading-8 text-[#25354A] sm:text-2xl">
              Hệ thống quản lý và xét chọn Sinh viên 5 tốt cấp Thành phố
            </p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#526174]">
              Chuẩn bị hồ sơ, bổ sung minh chứng và theo dõi quy trình xét chọn trên một hệ thống
              thống nhất.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#0057C2] px-5 text-sm font-semibold text-white hover:bg-[#004BA8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2] focus-visible:ring-offset-2"
              >
                Đăng nhập hệ thống
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                to="/signup"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#B7C5D4] bg-white px-5 text-sm font-semibold text-[#123B6D] hover:bg-[#F2F7FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2] focus-visible:ring-offset-2"
              >
                Tạo tài khoản sinh viên
              </Link>
            </div>
          </div>

          <aside
            aria-label="Thông tin chương trình"
            className="border-l-2 border-[#0057C2] py-2 pl-5 lg:justify-self-end"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#526174]">
              Chương trình cấp Thành phố
            </p>
            <p className="mt-2 text-lg font-semibold leading-7 text-[#123B6D]">
              Sinh viên chuẩn bị hồ sơ; cán bộ tham gia hướng dẫn và xét duyệt theo quy trình.
            </p>
          </aside>
        </section>

        <section id="tieu-chi" className="scroll-mt-8 border-b border-[#DCE3EB] py-10 sm:py-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0057C2]">
                Chương trình Sinh viên 5 tốt
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#123B6D]">Năm tiêu chí rèn luyện</h2>
            </div>
          </div>
          <ol className="mt-5 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-5">
            {coreCriterionKeys.map((key, index) => {
              const Icon = criterionIcons[key];
              return (
                <li
                  key={key}
                  className="flex min-h-14 items-center gap-3 border-t border-[#DCE3EB] py-3"
                >
                  <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-[#0057C2]" />
                  <span className="text-sm font-semibold text-[#25354A]">
                    <span className="mr-2 text-xs font-medium text-[#718096]">0{index + 1}</span>
                    {coreCriterionPresentation[key].label}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        <section id="quy-trinh" className="scroll-mt-8 py-10 sm:py-12">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0057C2]">
            Dành cho sinh viên
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#123B6D]">Các bước thực hiện</h2>
          <ol className="mt-5 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {workflow.map((step, index) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.title}
                  className="flex min-h-[68px] items-center gap-3 border-t border-[#DCE3EB] py-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#EAF3FF] text-[#0057C2]">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-[#25354A]">
                    <span className="mr-2 text-xs text-[#718096]">0{index + 1}</span>
                    {step.title}
                    {step.title === "Theo dõi xét duyệt" && (
                      <span className="mt-1 block text-xs text-[#526174]">
                        Bổ sung hồ sơ nếu được yêu cầu.
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      </main>

      <footer className="border-t border-[#DCE3EB] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 text-sm text-[#526174] sm:px-8">
          <span>Hội Sinh viên Việt Nam TP. Đà Nẵng</span>
          <Link
            to="/signup"
            className="font-semibold text-[#0057C2] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2]"
          >
            Tạo tài khoản sinh viên
          </Link>
        </div>
      </footer>
    </div>
  );
}
