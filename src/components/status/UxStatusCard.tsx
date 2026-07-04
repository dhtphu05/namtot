import { AlertCircle, CheckCircle2, Clock3, Info, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui-kit";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { UxSeverity, UxStatus } from "@/types/api";
import { ProgressBadges } from "./ProgressBadges";

type UxStatusCardProps = {
  status?: UxStatus | null;
  className?: string;
};

const severityStyles: Record<NonNullable<UxSeverity>, string> = {
  info: "border-sky-200 bg-sky-50/70 text-sky-900",
  success: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
  warning: "border-amber-200 bg-amber-50/70 text-amber-900",
  error: "border-rose-200 bg-rose-50/70 text-rose-900",
  neutral: "border-border bg-muted/30 text-foreground",
};

const iconMap = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
  neutral: Clock3,
};

export function UxStatusCard({ status, className }: UxStatusCardProps) {
  if (!status) {
    return null;
  }

  const severity = status.severity ?? "neutral";
  const Icon = iconMap[severity];
  const label = safeText(status.label, "Đang xử lý");
  const message = safeText(status.message);
  const nextAction = safeText(status.nextAction);
  const progress =
    typeof status.progressPercent === "number"
      ? Math.min(100, Math.max(0, status.progressPercent))
      : null;

  return (
    <Card className={cn("border p-4", severityStyles[severity], className)}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{label}</div>
          {message ? (
            <p className="mt-1 text-sm leading-relaxed text-current/80">{message}</p>
          ) : null}
          {progress !== null ? (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs font-medium text-current/75">
                <span>Tiến độ</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="bg-background/70" />
            </div>
          ) : null}
          {nextAction ? (
            <div className="mt-3 rounded-md bg-background/70 px-3 py-2 text-sm">
              <span className="font-medium">Việc tiếp theo: </span>
              {nextAction}
            </div>
          ) : null}
          <div className="mt-3">
            <ProgressBadges badges={status.badges} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function safeText(value: unknown, fallback = "") {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    return safeText(record.label ?? record.message ?? record.status ?? record.value, fallback);
  }

  return fallback;
}
