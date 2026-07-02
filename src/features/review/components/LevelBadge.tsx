import { Badge } from "@/components/ui/badge";
import type { Level } from "../types";
import { getLevelLabel } from "../utils/formatters";

type LevelBadgeProps = {
  level?: Level | null;
};

export function LevelBadge({ level }: LevelBadgeProps) {
  return <Badge variant="outline">{getLevelLabel(level)}</Badge>;
}
