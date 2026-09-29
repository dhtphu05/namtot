import { StatusBadge } from "@/components/status/StatusBadge";
import type { ApplicationStatus, EvidenceStatus, ReviewTaskStatus } from "../types";

type ReviewStatusBadgeProps = {
  status?: ReviewTaskStatus | ApplicationStatus | EvidenceStatus | null;
};

export function ReviewStatusBadge({ status }: ReviewStatusBadgeProps) {
  return <StatusBadge status={status} domain="workflow" compact />;
}
