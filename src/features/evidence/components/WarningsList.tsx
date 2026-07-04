import { TriangleAlert } from "lucide-react";
import { warningCopy } from "./evidence-card-utils";

type WarningsListProps = {
  warnings: string[];
};

export function WarningsList({ warnings }: WarningsListProps) {
  if (!warnings.length) {
    return (
      <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        Chưa có cảnh báo cần lưu ý.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {warnings.map((warning, index) => (
        <div
          key={`${warning}-${index}`}
          className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{warningCopy[warning] ?? warning}</span>
        </div>
      ))}
    </div>
  );
}
