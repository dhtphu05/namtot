import { getAwardPreviewSummary } from "@/features/award-registry/presentation";
import type { AwardRosterSummary } from "@/types/award-registry";

export function AwardRosterValidationSummary({ summary }: { summary: AwardRosterSummary }) {
  const values = getAwardPreviewSummary(summary);
  const metrics = [
    { label: "Tổng số", value: values.total, className: "text-slate-950" },
    { label: "Hợp lệ", value: values.valid, className: "text-emerald-700" },
    { label: "Cần kiểm tra", value: values.attention, className: "text-amber-700" },
    { label: "Lỗi dữ liệu", value: values.invalid, className: "text-red-700" },
    { label: "Trùng dữ liệu", value: values.duplicate, className: "text-amber-700" },
    { label: "Đã xác định sinh viên", value: values.matched, className: "text-sky-700" },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      <h3 className="text-sm font-semibold text-slate-950">Tóm tắt kiểm tra</h3>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] leading-4 text-slate-500">{metric.label}</p>
            <p className={`mt-1 text-lg font-semibold ${metric.className}`}>{metric.value}</p>
          </div>
        ))}
      </div>
      {values.unmatched > 0 && (
        <p className="mt-3 text-xs leading-5 text-slate-600">
          {values.unmatched} dòng chưa tìm thấy sinh viên phù hợp. Đây là trạng thái đối chiếu
          riêng, không phải trạng thái xác nhận quyết định.
        </p>
      )}
    </div>
  );
}
