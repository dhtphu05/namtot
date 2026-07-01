import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip } from "@/components/ui-kit";
import { Bell, Check, AlertTriangle, Info, Loader2, RefreshCw, CheckCircle2, ChevronRight, FileText, User } from "lucide-react";
import { useNotifications, useMarkNotificationRead } from "@/features/notifications/hooks/useNotifications";
import { useState } from "react";
import { Link } from "@tanstack/react-router";

export function Notifications() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { data: items = [], isLoading, isError, refetch } = useNotifications();
  const markReadMutation = useMarkNotificationRead();

  const handleMarkRead = (id: string) => {
    markReadMutation.mutate(id);
  };

  const markAll = () => {
    const unread = items.filter((n) => !n.readAt);
    unread.forEach((n) => {
      markReadMutation.mutate(n.id);
    });
  };

  const filteredItems = items.filter((n) => {
    if (filter === "unread") return !n.readAt;
    return true;
  });

  const unreadCount = items.filter((n) => !n.readAt).length;

  const iconFor = (t: string) =>
    t === "success" ? <CheckCircle2 className="w-4 h-4" /> :
    t === "warning" || t === "error" || t.includes("supplement") ? <AlertTriangle className="w-4 h-4" /> :
    <Info className="w-4 h-4" />;

  const tint = (t: string) =>
    t === "success" ? "bg-emerald-500" :
    t === "warning" || t.includes("supplement") ? "bg-amber-500" :
    t === "error" ? "bg-rose-500" :
    "bg-[#0057C2]";

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertTriangle className="w-10 h-10 text-rose-500" />
        <div className="text-red-500 font-semibold">Đã xảy ra lỗi khi tải danh sách thông báo.</div>
        <Button onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2" /> Thử lại</Button>
      </div>
    );
  }

  return (
    <>
      <TopBar
        title="Trung tâm thông báo"
        subtitle="Cập nhật trạng thái hồ sơ, yêu cầu bổ sung, hoặc phản hồi xét duyệt"
        action={
          unreadCount > 0 ? (
            <Button variant="secondary" onClick={markAll} disabled={markReadMutation.isPending}>
              <Check className="w-4 h-4 mr-2" /> Đánh dấu tất cả đã đọc
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === "all" ? "bg-[#0057C2] text-white shadow-sm" : "bg-white text-muted-foreground border border-slate-100 hover:bg-slate-50"}`}
        >
          Tất cả ({items.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === "unread" ? "bg-[#0057C2] text-white shadow-sm" : "bg-white text-muted-foreground border border-slate-100 hover:bg-slate-50"}`}
        >
          Chưa đọc ({unreadCount})
        </button>
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-4 py-4 animate-pulse">
            <div className="h-16 bg-slate-100 rounded-2xl w-full" />
            <div className="h-16 bg-slate-100 rounded-2xl w-full" />
            <div className="h-16 bg-slate-100 rounded-2xl w-full" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Bell className="w-10 h-10 text-slate-300" />
            <span className="font-semibold text-brand-deep">Chưa có thông báo nào</span>
            <p className="text-xs text-muted-foreground max-w-xs">Thông báo mới nhất về hồ sơ của bạn sẽ hiển thị ở đây.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredItems.map((n) => {
              const isUnread = !n.readAt;
              // Determine CTA Link
              let ctaText = "";
              let ctaLink = "";
              let ctaIcon = null;

              if (n.evidenceId || n.type.toLowerCase().includes("supplement")) {
                ctaText = "Bổ sung minh chứng";
                ctaLink = "/app/evidence";
                ctaIcon = <FileText className="w-3.5 h-3.5 mr-1" />;
              } else if (n.applicationId) {
                ctaText = "Xem hồ sơ";
                ctaLink = "/app/wizard";
                ctaIcon = <User className="w-3.5 h-3.5 mr-1" />;
              }

              return (
                <div
                  key={n.id}
                  className={`py-4 first:pt-0 last:pb-0 flex items-start gap-4 transition-colors ${isUnread ? "bg-[#F4FBFF]/40 -mx-4 px-4 rounded-xl" : ""}`}
                >
                  <div className={`w-9 h-9 rounded-xl ${tint(n.type)} text-white flex items-center justify-center shrink-0 shadow-sm`}>
                    {iconFor(n.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-[14px] font-bold text-brand-deep leading-snug ${isUnread ? "font-extrabold" : ""}`}>{n.title}</h4>
                      {isUnread && <Chip tone="brand">Mới</Chip>}
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">{n.message}</p>

                    <div className="flex items-center gap-3 pt-2 flex-wrap">
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {new Date(n.createdAt).toLocaleString("vi-VN")}
                      </span>

                      {ctaLink && (
                        <Link to={ctaLink} className="text-xs text-[#0057C2] hover:underline font-bold flex items-center gap-0.5">
                          {ctaIcon} {ctaText} <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {isUnread && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      disabled={markReadMutation.isPending}
                      className="text-xs text-[#0057C2] hover:underline font-bold shrink-0 self-center cursor-pointer border border-[#EEF2F7] px-3 py-1.5 rounded-lg bg-white"
                    >
                      Đọc
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}
