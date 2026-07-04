import { Clock3, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AuditLogEntry } from "@/types/audit";

type AuditTimelineProps = {
  items?: AuditLogEntry[] | null;
  className?: string;
};

export function AuditTimeline({ items, className }: AuditTimelineProps) {
  const sortedItems = [...(items ?? [])].sort((left, right) => {
    return getTimestamp(left).getTime() - getTimestamp(right).getTime();
  });

  if (!sortedItems.length) {
    return (
      <div
        className={cn(
          "rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        Chưa có lịch sử thao tác.
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {sortedItems.map((item, index) => (
        <AuditTimelineItem key={item.id} item={item} isLast={index === sortedItems.length - 1} />
      ))}
    </div>
  );
}

function AuditTimelineItem({ item, isLast }: { item: AuditLogEntry; isLast: boolean }) {
  const metadata = summarizeMetadata(item.metadata ?? item.details);

  return (
    <div className="relative flex gap-3">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-background text-primary">
          <Clock3 className="h-4 w-4" />
        </div>
        {!isLast ? <div className="mt-2 h-full min-h-8 w-px bg-border" /> : null}
      </div>

      <div className="min-w-0 flex-1 rounded-md border bg-background p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="font-semibold text-foreground">{item.action}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserRound className="h-3.5 w-3.5" />
              <span>{getActorLabel(item)}</span>
            </div>
          </div>
          <time className="text-xs text-muted-foreground">
            {formatTimestamp(getTimestamp(item))}
          </time>
        </div>

        {item.message || item.note || item.reason ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {item.message ?? item.note ?? item.reason}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          {item.entityType ? <Badge variant="outline">{item.entityType}</Badge> : null}
          {item.entityId ? <Badge variant="outline">#{item.entityId.slice(0, 8)}</Badge> : null}
        </div>

        {metadata.length ? (
          <dl className="mt-3 grid gap-2 rounded-md bg-muted/40 p-3 text-sm sm:grid-cols-[140px_minmax(0,1fr)]">
            {metadata.map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="font-medium text-muted-foreground">{key}</dt>
                <dd className="break-words text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </div>
  );
}

function getTimestamp(item: AuditLogEntry) {
  return new Date(item.timestamp ?? item.createdAt ?? 0);
}

function getActorLabel(item: AuditLogEntry) {
  if (typeof item.actor === "string") return item.actor;
  return item.actor?.name ?? item.actorName ?? item.actorId ?? "Hệ thống";
}

function summarizeMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }

  return Object.entries(metadata)
    .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
    .slice(0, 6)
    .map(([key, value]) => [formatKey(key), String(value)] as const);
}

function formatKey(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

function formatTimestamp(date: Date) {
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
