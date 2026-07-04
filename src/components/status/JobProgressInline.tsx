import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { JobResponse } from "@/types/jobs";

type JobProgressInlineProps = {
  job?: JobResponse | null;
  label?: string;
  className?: string;
};

export function JobProgressInline({ job, label, className }: JobProgressInlineProps) {
  if (!job) {
    return null;
  }

  const progress = clampProgress(job.progressPercent ?? job.progress ?? null);
  const isProcessing = job.status === "queued" || job.status === "processing";

  return (
    <div className={cn("space-y-2 rounded-md border bg-background p-3", className)}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex min-w-0 items-center gap-2 font-medium">
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : null}
          <span className="truncate">{job.uxStatus?.label ?? label ?? "Đang xử lý tác vụ"}</span>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{job.status}</span>
      </div>
      {progress !== null ? <Progress value={progress} /> : null}
      {job.uxStatus?.nextAction ? (
        <p className="text-xs text-muted-foreground">{job.uxStatus.nextAction}</p>
      ) : null}
    </div>
  );
}

function clampProgress(value: number | null) {
  if (typeof value !== "number") {
    return null;
  }

  return Math.min(100, Math.max(0, value));
}
