import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DecisionImportStatus } from "@/types/decision-import";

type StepState = "done" | "active" | "pending" | "failed";

const steps: Array<{
  key: string;
  label: string;
  statuses: DecisionImportStatus[];
}> = [
  { key: "created", label: "Tạo phiên", statuses: ["draft"] },
  { key: "uploaded", label: "Tải tài liệu", statuses: ["uploaded"] },
  {
    key: "metadata",
    label: "Đọc thông tin văn bản",
    statuses: ["extracting_metadata", "metadata_ready"],
  },
  { key: "ocr", label: "Đọc danh sách", statuses: ["ocr_processing", "tables_ready"] },
  { key: "preview", label: "Kiểm tra danh sách", statuses: ["parsing_roster", "preview_ready"] },
  { key: "confirm", label: "Xác nhận", statuses: ["confirmed"] },
  { key: "done", label: "Hoàn tất", statuses: ["confirmed"] },
];

type DecisionImportStepperProps = {
  status?: DecisionImportStatus | null;
};

export function DecisionImportStepper({ status = "draft" }: DecisionImportStepperProps) {
  const activeIndex = getActiveIndex(status ?? "draft");

  return (
    <div className="rounded-md border bg-white p-4">
      <div className="grid gap-3 md:grid-cols-7">
        {steps.map((step, index) => {
          const state = getStepState(status ?? "draft", index, activeIndex);
          const Icon =
            state === "done"
              ? CheckCircle2
              : state === "failed"
                ? XCircle
                : state === "active"
                  ? Loader2
                  : Circle;

          return (
            <div key={step.key} className="flex items-center gap-2 md:flex-col md:items-start">
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  state === "done" && "text-emerald-600",
                  state === "active" && "animate-spin text-primary",
                  state === "failed" && "text-rose-600",
                  state === "pending" && "text-muted-foreground",
                )}
              />
              <div
                className={cn(
                  "text-sm font-medium",
                  state === "active" ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getActiveIndex(status: DecisionImportStatus) {
  if (status === "failed" || status === "cancelled") return Math.max(0, steps.length - 2);
  const index = steps.findIndex((step) => step.statuses.includes(status));
  return index >= 0 ? index : 0;
}

function getStepState(status: DecisionImportStatus, index: number, activeIndex: number): StepState {
  if (status === "failed" || status === "cancelled") {
    return index === activeIndex ? "failed" : index < activeIndex ? "done" : "pending";
  }
  if (index < activeIndex) return "done";
  if (index === activeIndex) return status === "confirmed" ? "done" : "active";
  return "pending";
}
