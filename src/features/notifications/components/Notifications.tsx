import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Info,
  RefreshCw,
  User,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button, Card, Chip } from "@/components/ui-kit";
import type { Notification } from "@/features/notifications/api/notifications";
import { useMarkNotificationRead, useNotifications } from "@/features/notifications/hooks/useNotifications";
import {
  formatCriterionLabel,
  formatLevelLabel,
} from "@/features/review/utils/formatters";

type NotificationFilter = "all" | "unread" | "action" | "result";

type PresentedNotification = {
  bucket: "action" | "result" | "info";
  createdAt: string;
  ctaIcon: ReactNode;
  ctaLink: string;
  ctaText: string;
  id: string;
  isUnread: boolean;
  message: string;
  sourceIds: string[];
  title: string;
  type: string;
};

export function Notifications() {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const { data: items = [], isLoading, isError, refetch } = useNotifications();
  const markReadMutation = useMarkNotificationRead();

  const presentedItems = presentNotifications(items);
  const unreadCount = presentedItems.filter((n) => n.isUnread).length;
  const actionCount = presentedItems.filter((n) => n.bucket === "action").length;
  const resultCount = presentedItems.filter((n) => n.bucket === "result").length;
  const filteredItems = presentedItems.filter((n) => {
    if (filter === "unread") return n.isUnread;
    if (filter === "action") return n.bucket === "action";
    if (filter === "result") return n.bucket === "result";
    return true;
  });

  const markPresentedRead = (notification: PresentedNotification) => {
    notification.sourceIds.forEach((id) => markReadMutation.mutate(id));
  };

  const markAll = () => {
    items.filter((n) => !n.readAt).forEach((n) => markReadMutation.mutate(n.id));
  };

  if (isError) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-10 w-10 text-rose-500" />
        <div className="font-semibold text-red-500">Không thể tải trung tâm thông báo.</div>
        <Button onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Thử lại
        </Button>
      </div>
    );
  }

  return (
    <>
      <TopBar
        title="Trung tâm thông báo"
        subtitle="Việc được giao, yêu cầu bổ sung, hội ý và kết quả xử lý liên quan đến hồ sơ."
        action={
          unreadCount > 0 ? (
            <Button variant="secondary" onClick={markAll} disabled={markReadMutation.isPending}>
              <Check className="mr-2 h-4 w-4" /> Đánh dấu tất cả đã đọc
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5 rounded-xl bg-[var(--surface-secondary)] p-1.5">
        <NotificationTab active={filter === "all"} count={presentedItems.length} label="Tất cả" onClick={() => setFilter("all")} />
        <NotificationTab active={filter === "unread"} count={unreadCount} label="Chưa đọc" onClick={() => setFilter("unread")} />
        <NotificationTab active={filter === "action"} count={actionCount} label="Cần hành động" onClick={() => setFilter("action")} />
        <NotificationTab active={filter === "result"} count={resultCount} label="Kết quả/hội ý" onClick={() => setFilter("result")} />
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-4 py-4 animate-pulse">
            <div className="h-16 w-full rounded-2xl bg-slate-100" />
            <div className="h-16 w-full rounded-2xl bg-slate-100" />
            <div className="h-16 w-full rounded-2xl bg-slate-100" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
            <Bell className="h-10 w-10 text-slate-300" />
            <span className="font-semibold text-brand-deep">Bạn chưa có thông báo mới.</span>
            <p className="max-w-xs text-xs text-muted-foreground">
              Các việc cần xử lý, bổ sung hoặc kết quả hội ý sẽ hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredItems.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 py-3 transition-colors ${n.isUnread ? "-mx-3 rounded-xl bg-[var(--surface-selected)] px-3" : ""}`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tint(n.type)} text-white`}>
                  {iconFor(n.type)}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className={`text-[14px] font-bold leading-snug text-brand-deep ${n.isUnread ? "font-extrabold" : ""}`}>
                      {n.title}
                    </h4>
                    {n.isUnread ? <Chip tone="brand">Mới</Chip> : null}
                  </div>

                  <p className="text-xs leading-relaxed text-muted-foreground">{n.message}</p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString("vi-VN")}
                    </span>

                    <Link to={n.ctaLink} className="flex items-center gap-0.5 text-xs font-bold text-[#0057C2] hover:underline">
                      {n.ctaIcon} {n.ctaText} <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                {n.isUnread ? (
                  <button
                    onClick={() => markPresentedRead(n)}
                    disabled={markReadMutation.isPending}
                    className="shrink-0 self-center rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#0057C2] shadow-[0_0_0_1px_rgba(15,23,42,0.07)] hover:bg-[var(--brand-primary-soft)]"
                  >
                    Đọc
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function NotificationTab({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${active ? "bg-white text-[#0057C2] shadow-[0_1px_2px_rgba(15,23,42,0.04)]" : "text-muted-foreground hover:bg-white/60"}`}
    >
      {label} ({count})
    </button>
  );
}

function iconFor(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("success") || normalized.includes("resolved")) return <CheckCircle2 className="h-4 w-4" />;
  if (normalized.includes("warning") || normalized.includes("error") || normalized.includes("supplement")) return <AlertTriangle className="h-4 w-4" />;
  return <Info className="h-4 w-4" />;
}

function tint(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("success") || normalized.includes("resolved")) return "bg-emerald-500";
  if (normalized.includes("warning") || normalized.includes("supplement")) return "bg-amber-500";
  if (normalized.includes("error")) return "bg-rose-500";
  return "bg-[#0057C2]";
}

function presentNotifications(items: Notification[]): PresentedNotification[] {
  const groups = new Map<string, Notification[]>();
  for (const item of items) {
    const key = getNotificationGroupKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return Array.from(groups.values())
    .map(presentNotificationGroup)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function presentNotificationGroup(group: Notification[]): PresentedNotification {
  const sorted = [...group].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const newest = sorted[0];
  const metadata = newest.metadata ?? {};
  const criterion = String(metadata.criterion ?? metadata.criteria ?? "");
  const criterionLabel = formatCriterionLabel(criterion as never);
  const levelLabel = formatLevelLabel(String(metadata.targetLevel ?? metadata.level ?? "") as never);
  const studentName = String(metadata.studentName ?? metadata.fullName ?? "");
  const studentCode = String(metadata.studentCode ?? metadata.mssv ?? "");
  const context = [studentName, studentCode, levelLabel !== "Chưa có dữ liệu" ? levelLabel : ""].filter(Boolean).join(" · ");
  const lowerType = newest.type.toLowerCase();
  const lowerText = `${newest.title} ${newest.message}`.toLowerCase();
  const cta = getNotificationCta(newest);

  let title = sanitizeNotificationText(newest.title);
  if (group.length > 1 && newest.applicationId && criterion) {
    title = `Bạn được giao ${group.length} tiêu chí trong hồ sơ ${studentName || "sinh viên"}`;
  } else if (lowerType.includes("assigned") || lowerText.includes("được giao")) {
    title = `Bạn được giao xét tiêu chí ${criterionLabel}`;
  } else if (lowerType.includes("supplement") || lowerText.includes("bổ sung")) {
    title = "Sinh viên đã bổ sung minh chứng";
  } else if (lowerType.includes("resolution") || lowerText.includes("resolution") || lowerText.includes("hội ý")) {
    title = "Case hội ý đã được cập nhật";
  } else if (lowerType.includes("deadline") || lowerText.includes("quá hạn")) {
    title = "Tác vụ sắp quá hạn";
  }

  return {
    bucket: getNotificationBucket(newest),
    createdAt: newest.createdAt,
    ctaIcon: cta.icon,
    ctaLink: cta.link,
    ctaText: cta.text,
    id: group.map((item) => item.id).join(":"),
    isUnread: group.some((item) => !item.readAt),
    message: context || sanitizeNotificationText(newest.message) || "Mở chi tiết để xem thông tin xử lý.",
    sourceIds: group.map((item) => item.id),
    title,
    type: newest.type,
  };
}

function getNotificationGroupKey(item: Notification) {
  const criterion = String(item.metadata?.criterion ?? "");
  return [item.applicationId ?? "none", item.reviewTaskId ?? "none", criterion, item.type].join(":");
}

function getNotificationBucket(item: Notification): PresentedNotification["bucket"] {
  const lowerType = item.type.toLowerCase();
  const lowerText = `${item.title} ${item.message}`.toLowerCase();
  if (lowerType.includes("resolution") || lowerText.includes("hội ý") || lowerText.includes("resolved")) return "result";
  if (lowerType.includes("supplement") || lowerType.includes("assigned") || lowerType.includes("deadline") || item.reviewTaskId) return "action";
  return "info";
}

function getNotificationCta(item: Notification) {
  const lowerType = item.type.toLowerCase();
  const lowerTitle = item.title.toLowerCase();
  const caseId = String(item.metadata?.resolutionCaseId ?? item.metadata?.caseId ?? "");
  if (caseId || lowerType.includes("resolution") || lowerTitle.includes("resolution")) {
    return { icon: <FileText className="mr-1 h-3.5 w-3.5" />, link: caseId ? `/app/resolution/${caseId}` : "/app/resolution", text: "Xem case hội ý" };
  }
  if (item.reviewTaskId) {
    return { icon: <FileText className="mr-1 h-3.5 w-3.5" />, link: `/app/review/${item.reviewTaskId}`, text: "Mở xét duyệt" };
  }
  if (item.evidenceId || lowerType.includes("supplement")) {
    return { icon: <FileText className="mr-1 h-3.5 w-3.5" />, link: "/app/evidence", text: "Xem minh chứng" };
  }
  return { icon: <User className="mr-1 h-3.5 w-3.5" />, link: item.applicationId ? "/app/queue" : "/app", text: "Xem hồ sơ" };
}

function sanitizeNotificationText(value: string) {
  return value
    .replace(/\bintegration\b/g, "Hội nhập tốt")
    .replace(/\bvolunteer\b/g, "Tình nguyện tốt")
    .replace(/\bphysical\b/g, "Thể lực tốt")
    .replace(/\bacademic\b/g, "Học tập tốt")
    .replace(/\bethics\b/g, "Đạo đức tốt")
    .replace(/Resolution case updated/gi, "Case hội ý đã được cập nhật")
    .replace(/Resolution/gi, "Hội ý")
    .replace(/Officer/gi, "Cán bộ xét duyệt")
    .replace(/Manager/gi, "Cấp quản lý")
    .replace(/Committee/gi, "Hội đồng")
    .replace(/Application/gi, "Hồ sơ")
    .replace(/Evidence/gi, "Minh chứng")
    .replace(/Task/gi, "Tác vụ xét duyệt")
    .replace(/[A-Z]+_[A-Z0-9_]+/g, "Cập nhật xử lý");
}
