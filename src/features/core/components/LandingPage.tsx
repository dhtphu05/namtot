import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  FolderUp,
  HeartHandshake,
  Landmark,
  ListChecks,
  MapPinned,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import hsvvnEmblemUrl from "@/assets/hsvvn-emblem.webp";

const criteria = [
  {
    number: "01",
    title: "Đạo đức tốt",
    description: "Rèn luyện bản lĩnh, ý thức và tinh thần trách nhiệm trong học tập, cuộc sống.",
  },
  {
    number: "02",
    title: "Học tập tốt",
    description: "Chủ động học hỏi, chinh phục tri thức và tạo ra những kết quả đáng tự hào.",
  },
  {
    number: "03",
    title: "Thể lực tốt",
    description: "Duy trì lối sống khỏe mạnh, tích cực và bền bỉ trong mọi hành trình.",
  },
  {
    number: "04",
    title: "Tình nguyện tốt",
    description: "Góp sức cho cộng đồng bằng những hành động thiết thực và giàu ý nghĩa.",
  },
  {
    number: "05",
    title: "Hội nhập tốt",
    description: "Mở rộng năng lực, kỹ năng và tinh thần sẵn sàng bước ra thế giới.",
  },
];

const journey = [
  {
    number: "01",
    icon: FileText,
    title: "Tìm hiểu tiêu chuẩn",
    description: "Nắm rõ 5 tiêu chí và những điều kiện cần chuẩn bị cho đợt xét chọn.",
  },
  {
    number: "02",
    icon: ListChecks,
    title: "Xây dựng hồ sơ",
    description: "Ghi lại hành trình rèn luyện và những dấu ấn bạn đã tạo ra trong năm học.",
  },
  {
    number: "03",
    icon: FolderUp,
    title: "Chuẩn bị minh chứng",
    description: "Tập hợp giấy xác nhận, chứng chỉ và thành tích phù hợp với từng tiêu chí.",
  },
  {
    number: "04",
    icon: FileCheck2,
    title: "Gửi hồ sơ xét chọn",
    description: "Kiểm tra lần cuối, nộp hồ sơ và theo dõi kết quả từ các đơn vị phụ trách.",
  },
];

const audiences = [
  {
    icon: ShieldCheck,
    eyebrow: "DÀNH CHO SINH VIÊN",
    title: "Ghi dấu hành trình của bạn",
    description: "Tập hợp nỗ lực trong học tập, rèn luyện và cống hiến thành một hồ sơ chỉn chu.",
  },
  {
    icon: Landmark,
    eyebrow: "DÀNH CHO NHÀ TRƯỜNG",
    title: "Đồng hành cùng sinh viên",
    description: "Phối hợp hướng dẫn, xác nhận và giới thiệu những gương mặt tiêu biểu của đơn vị.",
  },
  {
    icon: UsersRound,
    eyebrow: "DÀNH CHO TỔ CHỨC HỘI",
    title: "Lan tỏa giá trị tốt đẹp",
    description: "Cùng xây dựng một thế hệ sinh viên Đà Nẵng bản lĩnh, nhân ái và hội nhập.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F4F7FA] text-[#162033]">
      <a
        href="#noi-dung-chinh"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[#0C4778] focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
      >
        Bỏ qua đến nội dung chính
      </a>

      <header className="border-b border-[#D8E0E8] bg-[#F4F7FA]">
        <nav className="mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-6 py-4 lg:px-8">
          <Link
            to="/"
            className="inline-flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79AEEF] focus-visible:ring-offset-2"
            aria-label="Sinh viên 5 tốt thành phố Đà Nẵng"
          >
            <img
              src={hsvvnEmblemUrl}
              alt="Biểu trưng Hội Sinh viên Việt Nam"
              width={48}
              height={48}
              fetchPriority="high"
              className="h-12 w-12 shrink-0 rounded-full object-contain"
            />
            <span className="min-w-0">
              <span className="block text-[9px] font-bold uppercase leading-3 tracking-[0.14em] text-[#0C4778]">
                Hội Sinh viên Việt Nam
              </span>
              <span className="block text-[10px] font-bold uppercase leading-4 tracking-[0.12em] text-[#0C4778]">
                Thành phố Đà Nẵng
              </span>
              <span className="block truncate text-sm font-semibold leading-5 text-[#162033]">
                Sinh viên 5 tốt
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-6 text-[13px] font-semibold text-[#526174] md:flex">
              <a className="transition-colors hover:text-[#0C4778]" href="#hanh-trinh">
                Hành trình
              </a>
              <a className="transition-colors hover:text-[#0C4778]" href="#tieu-chi">
                5 tiêu chí
              </a>
              <a className="transition-colors hover:text-[#0C4778]" href="#dong-hanh">
                Đồng hành
              </a>
            </div>
            <Link
              to="/login"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0C4778] px-4 text-[13px] font-semibold text-white transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-[#09385F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79AEEF] focus-visible:ring-offset-2"
            >
              Đăng nhập
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </nav>
      </header>

      <main id="noi-dung-chinh">
        <section className="border-b border-[#D8E0E8]">
          <div className="mx-auto grid max-w-[1280px] items-center gap-12 px-6 py-16 lg:grid-cols-[minmax(0,1.04fr)_minmax(390px,0.96fr)] lg:px-8 lg:py-24">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0C4778]">
                <MapPinned className="h-4 w-4" aria-hidden="true" />
                Chương trình cấp Thành phố Đà Nẵng
              </div>
              <h1 className="mt-6 max-w-[720px] text-[42px] font-bold leading-[1.08] tracking-[-0.045em] text-[#162033] [text-wrap:balance] sm:text-[56px] lg:text-[64px]">
                Trở thành phiên bản tốt hơn của chính mình.
              </h1>
              <p className="mt-6 max-w-[610px] text-[16px] leading-8 text-[#526174] sm:text-[17px]">
                Sinh viên 5 tốt là hành trình rèn luyện toàn diện, nơi mỗi nỗ lực đều được ghi nhận
                và mỗi đóng góp đều có thể tạo nên sự thay đổi tích cực cho cộng đồng.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/signup"
                  className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#0C4778] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_-18px_rgba(12,71,120,0.7)] transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-[#09385F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79AEEF] focus-visible:ring-offset-2"
                >
                  Đăng ký xét chọn
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a
                  href="#hanh-trinh"
                  className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-[#B8C6D5] bg-white px-5 text-sm font-semibold text-[#0C4778] transition-colors hover:bg-[#EAF3FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79AEEF] focus-visible:ring-offset-2"
                >
                  Xem hướng dẫn tham gia
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[12px] font-medium text-[#526174]">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#15803D]" aria-hidden="true" />5 tiêu chí
                  rèn luyện
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#15803D]" aria-hidden="true" />
                  Ghi nhận ở cấp Thành phố
                </span>
              </div>
            </div>

            <div className="relative">
              <div
                className="absolute -right-3 -top-3 h-20 w-20 border-r border-t border-[#79AEEF]"
                aria-hidden="true"
              />
              <div className="relative rounded-[18px] border border-[#C9D5E1] bg-white p-5 shadow-[0_18px_45px_-36px_rgba(12,71,120,0.7)] sm:p-7">
                <div className="flex items-start justify-between gap-4 border-b border-[#E6EBF0] pb-5">
                  <div className="flex items-center gap-3">
                    <img
                      src={hsvvnEmblemUrl}
                      alt=""
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-full object-contain"
                    />
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0C4778]">
                        Hành trình 5 tốt
                      </div>
                      <div className="mt-1 text-[20px] font-bold tracking-[-0.02em] text-[#162033]">
                        Cấp Thành phố
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#ECFDF3] px-2.5 py-1 text-[11px] font-bold text-[#166534]">
                    Đà Nẵng
                  </span>
                </div>

                <div className="py-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#7B8796]">
                        Năm học 2025–2026
                      </p>
                      <h2 className="mt-1 text-[24px] font-bold tracking-[-0.025em] text-[#162033]">
                        Năm mặt rèn luyện
                      </h2>
                    </div>
                    <HeartHandshake className="h-7 w-7 text-[#0C4778]" aria-hidden="true" />
                  </div>
                </div>

                <ol className="border-t border-[#E6EBF0] pt-5">
                  {criteria.map((item) => (
                    <li
                      key={item.number}
                      className="flex items-center gap-3 border-b border-[#EDF1F5] py-3 last:border-b-0"
                    >
                      <span className="text-[11px] font-bold text-[#9AA7B5]">{item.number}</span>
                      <span className="flex-1 text-[13px] font-semibold text-[#334155]">
                        {item.title}
                      </span>
                      <Check className="h-4 w-4 text-[#15803D]" aria-hidden="true" />
                    </li>
                  ))}
                </ol>

                <div className="mt-5 flex items-center gap-2 border-t border-[#E6EBF0] pt-4 text-[12px] font-medium text-[#526174]">
                  <ClipboardCheck className="h-4 w-4 text-[#0C4778]" aria-hidden="true" />
                  Rèn luyện để trưởng thành, cống hiến để lan tỏa
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="hanh-trinh" className="scroll-mt-8 border-b border-[#D8E0E8]">
          <div className="mx-auto max-w-[1280px] px-6 py-16 lg:px-8 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0C4778]">
                  01 / Hành trình tham gia
                </div>
                <h2 className="mt-4 max-w-md text-[32px] font-bold leading-tight tracking-[-0.035em] text-[#162033] [text-wrap:balance] sm:text-[40px]">
                  Mỗi bước nhỏ đều đưa bạn đến gần hơn với danh hiệu.
                </h2>
                <p className="mt-4 max-w-md text-[15px] leading-7 text-[#526174]">
                  Bắt đầu từ việc hiểu đúng tiêu chuẩn, chuẩn bị chỉn chu và để những nỗ lực của bạn
                  được kể lại một cách trọn vẹn.
                </p>
              </div>
              <ol className="border-t border-[#C9D5E1]">
                {journey.map((step) => {
                  const Icon = step.icon;
                  return (
                    <li
                      key={step.number}
                      className="grid gap-4 border-b border-[#C9D5E1] py-5 sm:grid-cols-[52px_42px_minmax(0,1fr)] sm:items-center"
                    >
                      <span className="text-[12px] font-bold text-[#9AA7B5]">{step.number}</span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#0C4778]">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="text-[16px] font-semibold text-[#162033]">{step.title}</h3>
                        <p className="mt-1 text-[13px] leading-6 text-[#526174]">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </section>

        <section id="tieu-chi" className="scroll-mt-8 border-b border-[#D8E0E8] bg-white">
          <div className="mx-auto grid max-w-[1280px] gap-10 px-6 py-16 lg:grid-cols-[0.76fr_1.24fr] lg:gap-20 lg:px-8 lg:py-24">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0C4778]">
                02 / Năm tiêu chí
              </div>
              <h2 className="mt-4 text-[32px] font-bold leading-tight tracking-[-0.035em] text-[#162033] [text-wrap:balance] sm:text-[40px]">
                Một danh hiệu bắt đầu từ 5 giá trị sống.
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-7 text-[#526174]">
                Không chỉ là một bộ tiêu chuẩn, đây là lời nhắc để mỗi sinh viên phát triển cân
                bằng, sống có trách nhiệm và sẵn sàng đóng góp.
              </p>
              <div className="mt-8 inline-flex items-center gap-2 text-[12px] font-semibold text-[#0C4778]">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Sinh viên 5 tốt thành phố Đà Nẵng
              </div>
            </div>
            <div className="grid border-t border-[#C9D5E1] sm:grid-cols-2 sm:border-l sm:border-t-0">
              {criteria.map((item) => (
                <article
                  key={item.number}
                  className="border-b border-[#C9D5E1] px-0 py-5 sm:border-l sm:px-6 sm:py-6 [&:nth-child(odd)]:sm:border-l-0"
                >
                  <div className="text-[12px] font-bold text-[#9AA7B5]">{item.number}</div>
                  <h3 className="mt-3 text-[17px] font-semibold text-[#162033]">{item.title}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-[#526174]">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="dong-hanh" className="scroll-mt-8">
          <div className="mx-auto max-w-[1280px] px-6 py-16 lg:px-8 lg:py-24">
            <div className="flex flex-wrap items-end justify-between gap-5 border-b border-[#C9D5E1] pb-6">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0C4778]">
                  03 / Cùng đồng hành
                </div>
                <h2 className="mt-4 text-[32px] font-bold leading-tight tracking-[-0.035em] text-[#162033] [text-wrap:balance] sm:text-[40px]">
                  Một hành trình được tiếp sức bởi cộng đồng.
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 pb-1 text-[12px] font-medium text-[#526174]">
                <MapPinned className="h-4 w-4 text-[#0C4778]" aria-hidden="true" />
                Hội Sinh viên Việt Nam thành phố Đà Nẵng
              </div>
            </div>
            <div className="grid divide-y divide-[#C9D5E1] md:grid-cols-3 md:divide-x md:divide-y-0">
              {audiences.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="px-0 py-7 first:md:pr-8 md:px-8 md:first:pl-0 md:last:pr-0"
                  >
                    <Icon className="h-5 w-5 text-[#0C4778]" aria-hidden="true" />
                    <div className="mt-5 text-[10px] font-bold tracking-[0.14em] text-[#7B8796]">
                      {item.eyebrow}
                    </div>
                    <h3 className="mt-2 text-[18px] font-semibold text-[#162033]">{item.title}</h3>
                    <p className="mt-2 text-[13px] leading-6 text-[#526174]">{item.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-[#D8E0E8] bg-[#EAF3FF]">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 py-12 sm:flex-row sm:items-center sm:justify-between lg:px-8 lg:py-16">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0C4778]">
                Sẵn sàng bắt đầu?
              </div>
              <h2 className="mt-3 text-[28px] font-bold tracking-[-0.03em] text-[#162033] sm:text-[34px]">
                Hãy để hành trình của bạn được nhìn thấy.
              </h2>
              <p className="mt-2 text-[14px] leading-6 text-[#526174]">
                Đăng ký tham gia xét chọn Sinh viên 5 tốt thành phố Đà Nẵng.
              </p>
            </div>
            <Link
              to="/signup"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0C4778] px-5 text-sm font-semibold text-white transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-[#09385F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79AEEF] focus-visible:ring-offset-2"
            >
              Đăng ký xét chọn
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#D8E0E8] bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <img
              src={hsvvnEmblemUrl}
              alt="Biểu trưng Hội Sinh viên Việt Nam"
              width={44}
              height={44}
              loading="lazy"
              className="h-11 w-11 rounded-full object-contain"
            />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0C4778]">
                Hội Sinh viên Việt Nam
              </div>
              <div className="text-[12px] font-semibold text-[#526174]">Thành phố Đà Nẵng</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[12px] font-semibold text-[#526174]">
            <Link to="/login" className="transition-colors hover:text-[#0C4778]">
              Đăng nhập
            </Link>
            <Link to="/signup" className="transition-colors hover:text-[#0C4778]">
              Đăng ký xét chọn
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
