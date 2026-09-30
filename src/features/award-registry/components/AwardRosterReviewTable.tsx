import type { ReactNode } from "react";
import type { AwardRosterPreviewRow } from "@/types/award-registry";

export function AwardRosterReviewTable({
  rows,
  renderRow,
}: {
  rows: AwardRosterPreviewRow[];
  renderRow: (row: AwardRosterPreviewRow) => ReactNode;
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[1180px] text-left text-[12px]">
        <caption className="sr-only">Các dòng dữ liệu danh sách sinh viên cần kiểm tra</caption>
        <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">Dòng</th>
            <th className="px-3 py-2">MSSV hiện tại / tài liệu gốc</th>
            <th className="px-3 py-2">Họ tên hiện tại / tài liệu gốc</th>
            <th className="px-3 py-2">Lớp hiện tại / tài liệu gốc</th>
            <th className="px-3 py-2">Đơn vị trong danh sách / đã đối chiếu</th>
            <th className="px-3 py-2">Đối chiếu sinh viên</th>
            <th className="px-3 py-2">Kết quả kiểm tra</th>
          </tr>
        </thead>
        <tbody>{rows.map(renderRow)}</tbody>
      </table>
    </div>
  );
}
