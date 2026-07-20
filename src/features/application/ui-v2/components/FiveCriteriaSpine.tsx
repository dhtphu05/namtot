import { cn } from "@/lib/utils";
import { StatusPillV2 } from "./primitives";
import type { StudentApplicationV2ProgressStatus } from "./visual-contract";

export type FiveCriteriaSpineV2Item = {
  key: string;
  number: string;
  title: string;
  status: StudentApplicationV2ProgressStatus;
  detail?: string;
};

export function FiveCriteriaSpineV2({
  items,
  activeKey,
  onSelect,
  className,
}: {
  items: FiveCriteriaSpineV2Item[];
  activeKey?: string;
  onSelect?: (key: string) => void;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)]",
        className,
      )}
      aria-label="Hành trình 5 tiêu chí"
    >
      <ol className="flex min-w-0 snap-x overflow-x-auto lg:grid lg:grid-cols-5 lg:overflow-visible">
        {items.map((item) => (
          <li
            key={item.key}
            className="min-w-[150px] snap-start border-r border-[var(--student-v2-divider)] last:border-r-0 lg:min-w-0"
          >
            <button
              type="button"
              onClick={() => onSelect?.(item.key)}
              aria-current={item.key === activeKey ? "step" : undefined}
              className={cn(
                "relative flex h-full min-h-[104px] w-full min-w-0 flex-col items-start gap-2 border-l-[3px] px-4 py-4 text-left transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-v2-focus-ring)] lg:flex-row lg:gap-3 lg:px-5",
                item.key === activeKey
                  ? "border-l-[var(--student-v2-institutional-blue)] bg-[var(--student-v2-surface-selected)]"
                  : "border-l-transparent bg-[var(--student-v2-surface-primary)] hover:bg-[var(--student-v2-surface-hover)]",
              )}
            >
              <span className="shrink-0 text-[20px] font-bold leading-7 text-[var(--student-v2-institutional-navy)] lg:w-9">
                {item.number}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold leading-[23px] text-[var(--student-v2-text-primary)]">
                  {item.title}
                </span>
                <span className="mt-1 flex min-w-0 flex-col items-start gap-1">
                  <StatusPillV2 status={item.status} />
                  {item.detail ? (
                    <span className="line-clamp-2 text-[13px] font-medium leading-[18px] text-[var(--student-v2-text-muted)]">
                      {item.detail}
                    </span>
                  ) : null}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
