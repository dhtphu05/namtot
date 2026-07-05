import { getStatusTone, getStudentApplicationStatusLabel, type StatusTone } from "@/lib/status-labels";

type StatusBadgeProps = {
  status?: string | null;
  label?: string;
  tone?: StatusTone;
  compact?: boolean;
};

const toneClass: Record<StatusTone, string> = {
  brand: "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]",
  success: "bg-[var(--surface-success)] text-emerald-700",
  warning: "bg-[var(--surface-warning)] text-amber-700",
  error: "bg-[var(--surface-danger)] text-rose-700",
  muted: "bg-[var(--surface-muted)] text-slate-600",
};

export function StatusBadge({ status, label, tone, compact = false }: StatusBadgeProps) {
  const resolvedTone = tone ?? getStatusTone(status);
  const resolvedLabel = label ?? getStudentApplicationStatusLabel(status);

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full font-semibold leading-none ${
        compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs"
      } ${toneClass[resolvedTone]}`}
      title={resolvedLabel}
    >
      <span className="truncate">{resolvedLabel}</span>
    </span>
  );
}
