import type { ApplicationStatus, EvidenceStatus, ReviewTaskStatus } from "../types";
import { getTaskStatusLabel } from "../utils/formatters";

type ReviewStatusBadgeProps = {
  status?: ReviewTaskStatus | ApplicationStatus | EvidenceStatus | null;
};

function getStatusClass(status?: ReviewTaskStatus | ApplicationStatus | EvidenceStatus | null) {
  switch (status) {
    case "accepted":
    case "completed":
    case "indexed":
      return "bg-[var(--surface-success)] text-emerald-700";
    case "rejected":
      return "bg-[var(--surface-danger)] text-rose-700";
    case "supplement_required":
    case "resolution_needed":
      return "bg-[var(--surface-warning)] text-amber-800";
    case "reviewing":
    case "under_review":
      return "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]";
    default:
      return "bg-[var(--surface-muted)] text-slate-700";
  }
}

export function ReviewStatusBadge({ status }: ReviewStatusBadgeProps) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-md px-2 py-0.5 text-[11px] font-semibold leading-5 ${getStatusClass(status)}`}
    >
      <span className="truncate">{getTaskStatusLabel(status)}</span>
    </span>
  );
}
