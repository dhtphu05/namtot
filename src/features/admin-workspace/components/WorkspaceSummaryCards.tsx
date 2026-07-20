import { Card } from "@/components/ui/card";
import type { AdminWorkspaceListResponse } from "@/features/admin-workspace/types";

type WorkspaceSummaryCardsProps = {
  summary?: AdminWorkspaceListResponse | null;
  isLoading?: boolean;
};

export function WorkspaceSummaryCards({ summary, isLoading }: WorkspaceSummaryCardsProps) {
  const items = summary?.items ?? [];
  const total = summary?.pagination.total ?? 0;
  const hasFullSummary = total <= items.length;
  const active = hasFullSummary ? items.filter((item) => item.isActive).length : null;
  const registrationOpen = hasFullSummary
    ? items.filter((item) => item.isActive && item.registrationEnabled).length
    : null;
  const notReady = hasFullSummary
    ? items.filter((item) => !item.isActive || !item.registrationEnabled).length
    : null;

  const cards = [
    { label: "Tổng số trường", value: total, hint: "Đang quản lý trên hệ thống" },
    {
      label: "Đang hoạt động",
      value: active,
      hint: hasFullSummary ? "Có thể sử dụng hệ thống" : "Cần backend summary để tính đủ",
    },
    {
      label: "Đang mở đăng ký",
      value: registrationOpen,
      hint: hasFullSummary ? "Hiển thị ở form đăng ký" : "Cần backend summary để tính đủ",
    },
    {
      label: "Chưa sẵn sàng hoặc đã vô hiệu hóa",
      value: notReady,
      hint: hasFullSummary ? "Cần rà soát trước khi mở rộng" : "Cần backend summary để tính đủ",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Thống kê nhanh">
      {cards.map((card) => (
        <Card key={card.label} className="rounded-md border border-[#E3ECF6] p-4 shadow-sm">
          <div className="text-[12px] font-semibold text-[#64748B]">{card.label}</div>
          <div className="mt-2 text-2xl font-bold leading-none text-[#0F172A]">
            {isLoading ? "..." : card.value === null ? "—" : card.value}
          </div>
          <div className="mt-2 min-h-5 text-[12px] leading-5 text-[#64748B]">{card.hint}</div>
        </Card>
      ))}
    </section>
  );
}
