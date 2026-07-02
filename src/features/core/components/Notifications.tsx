import { TopBar } from "@/components/layout/TopBar";
import { Button, Card, Chip } from "@/components/ui-kit";
import { AlertTriangle, Bell, Check, Info, Loader2 } from "lucide-react";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "../hooks/useNotifications";
import type { NotificationItem } from "../api/notifications";

export function Notifications() {
  const { data, isLoading, isError, error, refetch, isFetching } = useNotifications({ page: 1, limit: 50 });
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const items = data?.items ?? [];
  const unreadIds = items.filter((item) => !item.readAt).map((item) => item.id);

  return (
    <>
      <TopBar
        title="Thông báo"
        subtitle="Cập nhật trạng thái hồ sơ, yêu cầu bổ sung và deadline theo tài khoản đang đăng nhập"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              Tải lại
            </Button>
            <Button
              variant="secondary"
              onClick={() => markAll.mutate(unreadIds)}
              disabled={unreadIds.length === 0 || markAll.isPending}
            >
              Đánh dấu đã đọc
            </Button>
          </div>
        }
      />
      <Card>
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải thông báo...
          </div>
        )}
        {isError && <div className="py-12 text-center font-semibold text-rose-600">{(error as Error)?.message || "Không thể tải thông báo."}</div>}
        {!isLoading && !isError && (
          <div className="space-y-2">
            {items.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                pending={markOne.isPending}
                onMarkRead={() => markOne.mutate(item.id)}
              />
            ))}
            {items.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">Chưa có thông báo.</div>}
          </div>
        )}
      </Card>
    </>
  );
}

function NotificationRow({
  item,
  pending,
  onMarkRead,
}: {
  item: NotificationItem;
  pending: boolean;
  onMarkRead: () => void;
}) {
  const unread = !item.readAt;
  return (
    <div className={`flex items-start gap-4 rounded-lg p-4 ${unread ? "bg-[#F4FBFF]" : "bg-white"}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${tint(item.type)}`}>
        {iconFor(item.type)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-brand-deep">{item.title}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">{item.message}</div>
        <div className="mt-1 text-xs text-muted-foreground">{formatDate(item.createdAt)}</div>
      </div>
      {unread ? (
        <Button size="sm" variant="secondary" onClick={onMarkRead} disabled={pending}>
          Đã đọc
        </Button>
      ) : (
        <Chip tone="muted">Đã đọc</Chip>
      )}
    </div>
  );
}

function iconFor(type: string) {
  if (type.includes("result")) return <Check className="h-4 w-4" />;
  if (type.includes("supplement") || type.includes("deadline")) return <AlertTriangle className="h-4 w-4" />;
  if (type.includes("review")) return <Bell className="h-4 w-4" />;
  return <Info className="h-4 w-4" />;
}

function tint(type: string) {
  if (type.includes("result")) return "bg-emerald-500";
  if (type.includes("supplement") || type.includes("deadline")) return "bg-amber-500";
  if (type.includes("rejected")) return "bg-rose-500";
  return "bg-[#00AEEF]";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
