import {
  getStatusPresentation,
  getStatusTone,
  getStudentApplicationStatusLabel,
  type StatusDomain,
  type StatusTone,
} from "@/lib/status-labels";

type StatusBadgeProps = {
  status?: string | null;
  label?: string;
  children?: React.ReactNode;
  tone?: StatusTone | "info";
  compact?: boolean;
  domain?: StatusDomain;
};

const toneClass: Record<StatusTone | "info", string> = {
  brand: "bg-[var(--surface-info)] text-[var(--status-info)]",
  info: "bg-[var(--surface-info)] text-[var(--status-info)]",
  success: "bg-[var(--surface-success)] text-[var(--status-success)]",
  warning: "bg-[var(--surface-warning)] text-[var(--status-warning)]",
  error: "bg-[var(--surface-danger)] text-[var(--status-danger)]",
  muted: "bg-[var(--surface-muted)] text-[var(--text-secondary)]",
};

export function StatusBadge({
  status,
  label,
  children,
  tone,
  compact = false,
  domain,
}: StatusBadgeProps) {
  const presentation = domain ? getStatusPresentation(domain, status) : undefined;
  const resolvedTone = tone ?? presentation?.tone ?? getStatusTone(status);
  const resolvedLabel =
    label ?? children ?? presentation?.label ?? getStudentApplicationStatusLabel(status);

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full font-semibold leading-none ${
        compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs"
      } ${toneClass[resolvedTone]}`}
      title={typeof resolvedLabel === "string" ? resolvedLabel : undefined}
    >
      <span className="truncate">{resolvedLabel}</span>
    </span>
  );
}
