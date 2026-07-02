import { Badge } from "@/components/ui/badge";
import type { Criterion } from "../types";
import { getCriterionLabel } from "../utils/formatters";

type CriterionBadgeProps = {
  criterion?: Criterion | null;
};

export function CriterionBadge({ criterion }: CriterionBadgeProps) {
  return <Badge variant="secondary">{getCriterionLabel(criterion)}</Badge>;
}
