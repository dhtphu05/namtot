import { AppIcon } from "@/components/AppIcon";
import { getCoreCriterionLabel, getCoreCriterionPresentation } from "@/lib/criteria-presentation";

export function CriterionBadge({
  criterion,
  compact = false,
}: {
  criterion?: string | null;
  compact?: boolean;
}) {
  const presentation = getCoreCriterionPresentation(criterion);
  const label = getCoreCriterionLabel(criterion);

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--surface-muted)] font-medium text-[var(--text-secondary)] ${compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs"}`}
      title={label}
    >
      <AppIcon name={presentation?.icon ?? "criteria"} size={compact ? 13 : 14} tone="muted" />
      <span className="truncate">{label}</span>
    </span>
  );
}
