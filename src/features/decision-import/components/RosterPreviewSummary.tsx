import { AlertTriangle, CheckCircle2, Hash, XCircle } from "lucide-react";
import type { DecisionImportPreviewSummary } from "@/types/decision-import";

type RosterPreviewSummaryProps = {
  summary?: DecisionImportPreviewSummary | null;
};

export function RosterPreviewSummary({ summary }: RosterPreviewSummaryProps) {
  const items = [
    { label: "Tổng dòng đọc được", value: summary?.totalRows ?? 0, icon: Hash, tone: "slate" },
    { label: "Hợp lệ", value: summary?.validRows ?? 0, icon: CheckCircle2, tone: "emerald" },
    { label: "Cần xem lại", value: summary?.warningRows ?? 0, icon: AlertTriangle, tone: "amber" },
    {
      label: "Thiếu MSSV",
      value: summary?.missingStudentCodeRows ?? 0,
      icon: AlertTriangle,
      tone: "amber",
    },
    { label: "Trùng MSSV", value: summary?.duplicateRows ?? 0, icon: AlertTriangle, tone: "amber" },
    { label: "Không hợp lệ", value: summary?.invalidRows ?? 0, icon: XCircle, tone: "rose" },
  ].filter((item, index) => index < 2 || item.value > 0);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="rounded-md border bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">{item.label}</div>
              <Icon className={getIconClass(item.tone)} />
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">{item.value}</div>
          </div>
        );
      })}
    </div>
  );
}

function getIconClass(tone: string) {
  if (tone === "emerald") return "h-4 w-4 text-emerald-600";
  if (tone === "amber") return "h-4 w-4 text-amber-600";
  if (tone === "rose") return "h-4 w-4 text-rose-600";
  return "h-4 w-4 text-muted-foreground";
}
