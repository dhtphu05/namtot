import { motion } from "framer-motion";
import { ArrowRight, RefreshCw } from "lucide-react";
import type { StudentAssistantContext } from "@/features/application/api/student-assistant";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

type Props = {
  context?: StudentAssistantContext | null;
  isLoading?: boolean;
  isError?: boolean;
  narrativeText?: string;
  streamStatus?: "idle" | "connecting" | "streaming" | "complete" | "error";
  isStarting?: boolean;
  onPrimaryAction: () => void;
  onRetryNarrative?: () => void;
  className?: string;
};

export function StudentAssistantSurface({
  className,
  context,
  isError,
  isLoading,
  isStarting,
  narrativeText,
  onPrimaryAction,
  onRetryNarrative,
  streamStatus,
}: Props) {
  const reducedMotion = usePrefersReducedMotion();
  if (isLoading) return <StudentAssistantSkeleton className={className} />;

  const action = context?.nextBestAction ?? null;
  const displayText =
    narrativeText ||
    context?.narrative.fallbackText ||
    "Hồ sơ sẽ được cập nhật khi có dữ liệu mới.";
  const showConnecting = streamStatus === "connecting" && !narrativeText;

  return (
    <motion.section
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.2, ease: "easeOut" }}
      className={cn(
        "relative min-h-[196px] overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm",
        "sm:p-6",
        className,
      )}
      aria-labelledby="student-assistant-heading"
    >
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            Gợi ý tiếp theo
          </p>
          <h2
            id="student-assistant-heading"
            className="mt-1 text-xl font-bold leading-7 text-slate-950 sm:text-2xl"
          >
            {context?.greeting.title ?? "Xin chào"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {context?.greeting.deterministicMessage ??
              "Hệ thống đang tải trạng thái hồ sơ mới nhất."}
          </p>
          <p
            className="mt-4 min-h-[56px] max-w-3xl text-sm leading-6 text-slate-700"
            aria-live={streamStatus === "complete" || streamStatus === "error" ? "polite" : "off"}
          >
            {showConnecting ? "Đang cập nhật hướng dẫn..." : displayText}
            {streamStatus === "streaming" && !reducedMotion ? (
              <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-slate-400" />
            ) : null}
          </p>
          {isError ? (
            <p className="mt-2 text-xs text-amber-700">
              Chưa tải được gợi ý mới nhất. Dashboard vẫn dùng dữ liệu hiện có.
            </p>
          ) : null}
        </div>

        <div className="min-w-0 lg:w-[320px]">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Việc nên làm</p>
            <h3 className="mt-1 text-base font-bold leading-6 text-slate-950">
              {action?.title ?? "Không có việc cần xử lý ngay"}
            </h3>
            <p className="mt-1 min-h-10 text-sm leading-5 text-slate-600">
              {action?.deterministicDescription ??
                "Khi hồ sơ có yêu cầu mới, hệ thống sẽ hiển thị tại đây."}
            </p>
            {action?.urgency && action.urgency !== "normal" ? (
              <p className="mt-2 text-xs font-semibold text-amber-700">
                {action.urgency === "urgent" ? "Cần xử lý gấp" : "Nên xử lý sớm"}
              </p>
            ) : null}
            {action ? (
              <button
                type="button"
                onClick={onPrimaryAction}
                disabled={isStarting}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0057C2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#004bA8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={action.ctaLabel}
              >
                {action.ctaLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
            {streamStatus === "error" && onRetryNarrative ? (
              <button
                type="button"
                onClick={onRetryNarrative}
                className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2] focus-visible:ring-offset-2"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Cập nhật lại hướng dẫn
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {context?.criterionSummary.length ? (
        <div className="mt-5 flex flex-wrap gap-2" aria-label="Tóm tắt năm tiêu chí">
          {context.criterionSummary.map((item) => (
            <span
              key={item.criterion}
              className={cn(
                "inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-semibold",
                criterionToneClass(item.status),
              )}
            >
              {item.label}
            </span>
          ))}
        </div>
      ) : null}

      {context?.secondaryInsights.length ? (
        <div className="mt-3 space-y-1 text-xs leading-5 text-slate-600">
          {context.secondaryInsights.map((insight) => (
            <p key={insight.id}>{insight.title}</p>
          ))}
        </div>
      ) : null}
    </motion.section>
  );
}

function StudentAssistantSkeleton({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "min-h-[196px] rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6",
        className,
      )}
      aria-busy="true"
    >
      <div className="h-4 w-32 animate-pulse rounded-full bg-slate-100" />
      <div className="mt-4 h-7 w-56 animate-pulse rounded-full bg-slate-100" />
      <div className="mt-5 h-4 w-4/5 animate-pulse rounded-full bg-slate-100" />
      <div className="mt-3 h-4 w-2/3 animate-pulse rounded-full bg-slate-100" />
      <div className="mt-5 h-11 w-40 animate-pulse rounded-md bg-slate-100" />
    </section>
  );
}

function criterionToneClass(status: StudentAssistantContext["criterionSummary"][number]["status"]) {
  if (status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "processing") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "needs_confirmation" || status === "needs_attention") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === "under_review") return "border-slate-200 bg-slate-50 text-slate-700";
  return "border-slate-200 bg-white text-slate-600";
}
