import { Building2, GraduationCap, IdCard, School } from "lucide-react";
import type { SafeUser } from "@/lib/api/types";

type UserWorkspaceInfoProps = {
  user: SafeUser | null;
  className?: string;
  variant?: "sidebar" | "mobile";
};

export function UserWorkspaceInfo({
  user,
  className = "",
  variant = "sidebar",
}: UserWorkspaceInfoProps) {
  if (!user) return null;

  const items = [
    {
      label: "Trường",
      value: user.workspace?.name ?? "Chưa xác định",
      icon: School,
    },
    {
      label: "Mã sinh viên",
      value: user.studentCode ?? "Chưa cập nhật",
      icon: IdCard,
    },
    {
      label: "Khoa",
      value: user.faculty ?? "Chưa cập nhật",
      icon: Building2,
    },
    {
      label: "Lớp",
      value: user.className ?? "Chưa cập nhật",
      icon: GraduationCap,
    },
  ];

  if (variant === "mobile") {
    return (
      <section
        aria-label="Thông tin trường và sinh viên"
        className={`rounded-lg border border-[#E3ECF6] bg-white px-3 py-2 shadow-sm ${className}`}
      >
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase text-[#64748B]">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                <div className="mt-0.5 truncate text-[12px] font-semibold text-[#0F172A]">
                  {item.value}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Thông tin trường và sinh viên"
      className={`rounded-2xl bg-white px-3 py-2 shadow-[0_0_0_1px_rgba(15,23,42,0.06)] ${className}`}
    >
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
        Thông tin hồ sơ
      </div>
      <dl className="space-y-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex min-w-0 items-start gap-2">
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0057C2]" />
              <div className="min-w-0 flex-1">
                <dt className="text-[10.5px] font-medium leading-4 text-[#64748B]">{item.label}</dt>
                <dd className="truncate text-[12px] font-semibold leading-4 text-[#0F172A]">
                  {item.value}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
