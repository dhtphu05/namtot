import { useMemo } from "react";
import { AlertCircle, ChevronDown, Clock3, History } from "lucide-react";
import { Card } from "@/components/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/features/auth/store/auth-store";
import type { Role } from "@/features/review/types";
import { formatDateTime } from "@/features/review/utils/formatters";
import { useAuditLogs } from "../hooks/useAudit";
import type { AuditLogEntry, AuditLogParams } from "../types";

type AuditTimelineProps = {
  applicationId?: string;
  taskId?: string;
  caseId?: string;
  limit?: number;
};

const fallbackText = "Chưa có dữ liệu";

export function AuditTimeline({ applicationId, caseId, limit = 10, taskId }: AuditTimelineProps) {
  const role = useAuth((state) => state.user?.role) as Role | undefined;
  const params = useMemo<AuditLogParams>(
    () => ({
      applicationId,
      taskId,
      caseId,
      limit,
    }),
    [applicationId, caseId, limit, taskId],
  );
  const { data, isError, isLoading } = useAuditLogs(params);
  const items = useMemo(() => sortChronologically(data?.items ?? []), [data?.items]);
  const canViewRawDetails = role === "manager" || role === "admin";

  return (
    <Collapsible defaultOpen>
      <Card>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-left">
          <div className="flex items-start gap-2">
            <History className="mt-0.5 h-5 w-5 text-brand-deep" />
            <div>
              <h2 className="text-base font-bold text-brand-deep">Lịch sử xử lý</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Theo dõi các thao tác quan trọng liên quan đến hồ sơ hoặc tác vụ này.
              </p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-4">
            {isLoading ? (
              <TimelineMessage label="Đang tải lịch sử thao tác..." />
            ) : isError ? (
              <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Không thể tải lịch sử thao tác. Nội dung xét duyệt vẫn có thể tiếp tục.</span>
              </div>
            ) : items.length ? (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <TimelineItem
                    key={item.id}
                    canViewRawDetails={canViewRawDetails}
                    isLast={index === items.length - 1}
                    item={item}
                  />
                ))}
              </div>
            ) : (
              <TimelineMessage label="Chưa có lịch sử thao tác." />
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function TimelineItem({
  canViewRawDetails,
  isLast,
  item,
}: {
  canViewRawDetails: boolean;
  isLast: boolean;
  item: AuditLogEntry;
}) {
  const safeDetails = getSafeDetails(item.details);

  return (
    <div className="relative flex gap-3">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-background text-brand-deep">
          <Clock3 className="h-4 w-4" />
        </div>
        {!isLast ? <div className="mt-2 h-full min-h-10 w-px bg-border" /> : null}
      </div>

      <div className="min-w-0 flex-1 rounded-md border p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="font-semibold text-brand-deep">{item.action || fallbackText}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {item.actor || fallbackText}
              {item.role ? ` / ${item.role}` : ""}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {item.entityType ? <Badge variant="outline">{item.entityType}</Badge> : null}
          {item.entityId ? <Badge variant="outline">#{item.entityId.slice(0, 8)}</Badge> : null}
        </div>

        <AuditNotes item={item} />

        {safeDetails.length ? (
          <div className="mt-3 rounded-md bg-muted/40 p-3 text-sm">
            {safeDetails.map(([key, value]) => (
              <div key={key} className="grid gap-1 py-1 sm:grid-cols-[140px_minmax(0,1fr)]">
                <div className="font-medium text-muted-foreground">{key}</div>
                <div className="break-words text-foreground">{value}</div>
              </div>
            ))}
          </div>
        ) : null}

        {canViewRawDetails && item.details && typeof item.details === "object" ? (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
              Xem chi tiết kỹ thuật
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
              {JSON.stringify(item.details, null, 2)}
            </pre>
          </details>
        ) : null}
      </div>
    </div>
  );
}

function AuditNotes({ item }: { item: AuditLogEntry }) {
  const rows = [
    ["Ghi chú", item.note],
    ["Lý do", item.reason],
    ["Trước", item.before],
    ["Sau", item.after],
  ].filter(([, value]) => Boolean(value));

  if (!rows.length) {
    return null;
  }

  return (
    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span className="font-medium text-foreground">{label}: </span>
          {value}
        </div>
      ))}
    </div>
  );
}

function TimelineMessage({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function sortChronologically(items: AuditLogEntry[]) {
  return [...items].sort((left, right) => {
    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  });
}

function getSafeDetails(details: unknown) {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return [];
  }

  return Object.entries(details)
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
