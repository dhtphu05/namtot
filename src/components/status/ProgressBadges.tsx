import { Badge } from "@/components/ui/badge";

type ProgressBadgesProps = {
  badges?: string[] | null;
};

export function ProgressBadges({ badges }: ProgressBadgesProps) {
  if (!badges?.length) {
    return null;
  }

  const safeBadges = badges.map((badge) => safeText(badge)).filter(Boolean);
  if (!safeBadges.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {safeBadges.map((badge) => (
        <Badge key={badge} variant="outline" className="bg-background">
          {badge}
        </Badge>
      ))}
    </div>
  );
}

function safeText(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const label = record.label ?? record.status ?? record.value;
    return typeof label === "string" || typeof label === "number" || typeof label === "boolean"
      ? String(label)
      : "";
  }

  return "";
}
