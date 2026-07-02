import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus, EvidenceStatus, ReviewTaskStatus } from "../types";
import { getTaskStatusLabel } from "../utils/formatters";

type ReviewStatusBadgeProps = {
  status?: ReviewTaskStatus | ApplicationStatus | EvidenceStatus | null;
};

function getStatusVariant(
  status?: ReviewTaskStatus | ApplicationStatus | EvidenceStatus | null,
): React.ComponentProps<typeof Badge>["variant"] {
  switch (status) {
    case "accepted":
    case "completed":
    case "indexed":
      return "secondary";
    case "rejected":
      return "destructive";
    case "waiting":
    case "draft":
    case "prechecked":
    case "ready_to_submit":
    case "submitted":
    case "pending_indexing":
      return "outline";
    default:
      return "default";
  }
}

export function ReviewStatusBadge({ status }: ReviewStatusBadgeProps) {
  return <Badge variant={getStatusVariant(status)}>{getTaskStatusLabel(status)}</Badge>;
}
