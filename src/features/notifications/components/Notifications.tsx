import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
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
import {
  ButtonV2,
  StatusPillV2,
  type StudentApplicationV2ProgressStatus,
} from "@/features/application/ui-v2/components";
import { toUiRole } from "@/features/auth/role-map";
import { useAuth } from "@/features/auth/store/auth-store";
import type { Notification } from "@/features/notifications/api/notifications";
import {
  useMarkNotificationRead,
  useNotifications,
} from "@/features/notifications/hooks/useNotifications";
import { formatCriterionLabel, formatLevelLabel } from "@/features/review/utils/formatters";
import { PageHeader, ScrollSafeModal } from "@/features/student/components/primitives";
import { criterionLabels, getFeedbackUiItems } from "@/features/student/selectors/student-ui";

type NotificationFilter = "all" | "unread" | "action" | "result";
type StudentFeedbackTab = "action" | "handled" | "all";
type FeedbackItem = ReturnType<typeof getFeedbackUiItems>[number];

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
  const user = useAuth((state) => state.user);
  const role = user ? toUiRole(user.role) : "student";

  if (role === "student") {
    return (
      <StudentFeedbackCenter
        items={items}
        isLoading={isLoading}
        isError={isError}
        isPending={markReadMutation.isPending}
        onRetry={() => void refetch()}
        onMarkRead={(id) => markReadMutation.mutate(id)}
      />
    );
  }

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
        <NotificationTab
          active={filter === "all"}
          count={presentedItems.length}
          label="Tất cả"
          onClick={() => setFilter("all")}
        />
        <NotificationTab
          active={filter === "unread"}
          count={unreadCount}
          label="Chưa đọc"
          onClick={() => setFilter("unread")}
        />
        <NotificationTab
          active={filter === "action"}
          count={actionCount}
          label="Cần hành động"
          onClick={() => setFilter("action")}
        />
        <NotificationTab
          active={filter === "result"}
          count={resultCount}
          label="Kết quả/hội ý"
          onClick={() => setFilter("result")}
        />
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
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tint(n.type)} text-white`}
                >
                  {iconFor(n.type)}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4
                      className={`text-[14px] font-bold leading-snug text-brand-deep ${n.isUnread ? "font-extrabold" : ""}`}
                    >
                      {n.title}
                    </h4>
                    {n.isUnread ? <Chip tone="brand">Mới</Chip> : null}
                  </div>

                  <p className="text-xs leading-relaxed text-muted-foreground">{n.message}</p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString("vi-VN")}
                    </span>

                    <Link
                      to={n.ctaLink}
                      className="flex items-center gap-0.5 text-xs font-bold text-[#0057C2] hover:underline"
                    >
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

function StudentFeedbackCenter({
  items,
  isLoading,
  isError,
  isPending,
  onRetry,
  onMarkRead,
}: {
  items: Notification[];
  isLoading: boolean;
  isError: boolean;
  isPending: boolean;
  onRetry: () => void;
  onMarkRead: (id: string) => void;
}) {
  const [tab, setTab] = useState<StudentFeedbackTab>("action");
  const [expandedItem, setExpandedItem] = useState<FeedbackItem | null>(null);
  const [page, setPage] = useState(1);
  const feedbackItems = getFeedbackUiItems(items);
  const actionableCount = feedbackItems.filter((item) => item.isActionable).length;
  const handledCount = feedbackItems.filter(
    (item) => !item.isActionable && item.status === "read",
  ).length;
  const filteredItems = feedbackItems.filter((item) => {
    if (tab === "action") return item.isActionable;
    if (tab === "handled") return !item.isActionable && item.status === "read";
    return true;
  });
  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const visibleItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);
  const unreadCount = items.filter((item) => !item.readAt).length;
  const showPartialError = isError && feedbackItems.length > 0;

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  if (isError && feedbackItems.length === 0) {
    return (
      <>
        <PageHeader
          title="Phản hồi"
          description="Xem yêu cầu bổ sung, kết quả và phản hồi liên quan đến hồ sơ của bạn."
        />
        <div className="rounded-[12px] border border-[var(--student-v2-critical-text)]/25 bg-[var(--student-v2-critical-bg)] px-4 py-3 text-sm text-[var(--student-v2-critical-text)]">
          <div className="font-semibold">Chưa tải được phản hồi</div>
          <p className="mt-1 text-[13px] leading-5">
            Vui lòng thử lại sau. Các minh chứng đã lưu của bạn không bị mất.
          </p>
          <ButtonV2 className="mt-3" size="compact" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" /> Thử lại
          </ButtonV2>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Phản hồi"
        description="Xem yêu cầu bổ sung, kết quả và phản hồi liên quan đến hồ sơ của bạn."
        rightAction={
          unreadCount > 0 ? (
            <ButtonV2
              variant="secondary"
              disabled={isPending}
              onClick={() =>
                items.filter((item) => !item.readAt).forEach((item) => onMarkRead(item.id))
              }
            >
              <Check className="h-4 w-4" /> Đã đọc tất cả
            </ButtonV2>
          ) : undefined
        }
      />

      <div
        role="tablist"
        aria-label="Bộ lọc phản hồi"
        className="mb-4 flex min-w-0 flex-wrap gap-1 rounded-[10px] bg-[var(--student-v2-surface-secondary)] p-1"
      >
        <FeedbackTab
          active={tab === "action"}
          label="Cần xử lý"
          count={actionableCount}
          onClick={() => {
            setTab("action");
            setPage(1);
          }}
        />
        <FeedbackTab
          active={tab === "handled"}
          label="Đã xử lý"
          count={handledCount}
          onClick={() => {
            setTab("handled");
            setPage(1);
          }}
        />
        <FeedbackTab
          active={tab === "all"}
          label="Tất cả"
          count={feedbackItems.length}
          onClick={() => {
            setTab("all");
            setPage(1);
          }}
        />
      </div>

      <section className="overflow-hidden rounded-[12px] border border-[var(--student-v2-divider)] bg-[var(--student-v2-surface-primary)]">
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-[var(--student-v2-divider)] px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold text-[var(--student-v2-text-primary)]">
              Hộp thư phản hồi
            </h2>
            <p className="mt-0.5 text-[13px] text-[var(--student-v2-text-muted)]">
              {filteredItems.length} mục trong bộ lọc hiện tại
            </p>
          </div>
          {showPartialError ? (
            <button
              type="button"
              onClick={onRetry}
              className="min-h-11 shrink-0 rounded-[8px] px-3 text-sm font-semibold text-[var(--student-v2-critical-text)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--student-v2-focus-ring)]"
            >
              Tải lại
            </button>
          ) : null}
        </div>
        {showPartialError ? (
          <div className="border-b border-[var(--student-v2-divider)] bg-[var(--student-v2-critical-bg)] px-4 py-2 text-[13px] text-[var(--student-v2-critical-text)]">
            Một phần phản hồi có thể chưa cập nhật. Danh sách bên dưới vẫn giữ dữ liệu đã tải.
          </div>
        ) : null}
        {isLoading ? (
          <div className="divide-y divide-[var(--student-v2-divider)]">
            <div className="h-[76px] animate-pulse bg-[var(--student-v2-surface-secondary)]" />
            <div className="h-[76px] animate-pulse bg-white" />
            <div className="h-[76px] animate-pulse bg-[var(--student-v2-surface-secondary)]" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="px-4 py-8 text-sm text-[var(--student-v2-text-secondary)]">
            <div className="font-semibold text-[var(--student-v2-text-primary)]">
              {tab === "action" ? "Không có phản hồi cần xử lý" : "Chưa có phản hồi trong mục này"}
            </div>
            <p className="mt-1 max-w-2xl text-[13px] leading-5">
              {tab === "action"
                ? "Khi cán bộ yêu cầu bổ sung minh chứng hoặc hồ sơ có kết quả, thông tin sẽ xuất hiện tại đây."
                : "Các phản hồi phù hợp sẽ xuất hiện khi hồ sơ của bạn được cập nhật."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--student-v2-divider)]">
            {visibleItems.map((item) => (
              <FeedbackRow
                key={item.id}
                item={item}
                isPending={isPending}
                onMarkRead={onMarkRead}
                onExpand={setExpandedItem}
              />
            ))}
          </div>
        )}
        {filteredItems.length > pageSize ? (
          <FeedbackPagination
            page={page}
            pageCount={pageCount}
            onPrevious={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => Math.min(pageCount, current + 1))}
          />
        ) : null}
      </section>

      <ScrollSafeModal
        open={Boolean(expandedItem)}
        onOpenChange={(open) => {
          if (!open) setExpandedItem(null);
        }}
        title={expandedItem?.title ?? "Chi tiết phản hồi"}
        description={expandedItem?.criterionLabel || undefined}
        widthClassName="max-w-2xl"
        footer={
          <div className="flex justify-end">
            <ButtonV2 onClick={() => setExpandedItem(null)}>Đóng</ButtonV2>
          </div>
        }
      >
        <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
          {expandedItem?.message}
        </p>
      </ScrollSafeModal>
    </>
  );
}

function FeedbackTab({
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
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`min-h-11 rounded-[8px] px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--student-v2-focus-ring)] ${
        active
          ? "bg-[var(--student-v2-surface-primary)] text-[var(--student-v2-primary-action-blue)]"
          : "text-[var(--student-v2-text-secondary)] hover:bg-white/70"
      }`}
    >
      {label} ({count})
    </button>
  );
}

function FeedbackRow({
  item,
  isPending,
  onMarkRead,
  onExpand,
}: {
  item: FeedbackItem;
  isPending: boolean;
  onMarkRead: (id: string) => void;
  onExpand: (item: FeedbackItem) => void;
}) {
  const actionHref = item.criterionKey
    ? `/app/application?criterion=${encodeURIComponent(item.criterionKey)}${
        item.evidenceId ? `&evidenceId=${encodeURIComponent(String(item.evidenceId))}` : ""
      }`
    : item.route;
  const assistantHref = buildAssistantHref({
    criterionKey: item.criterionKey,
    criterionLabel: item.criterionLabel,
    feedbackId: item.id,
    message: item.message,
    source: "feedback",
  });
  const isLong = item.message.length > 180;
  const isAcknowledgeOnly = item.actionLabel === "Đã hiểu";
  const source = getFeedbackSourceLabel(item);
  const progressStatus = getFeedbackProgressStatus(item);

  return (
    <article className="grid min-w-0 gap-3 px-4 py-3 transition-colors hover:bg-[var(--student-v2-surface-secondary)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--student-v2-text-muted)]">
          <span className="font-semibold text-[var(--student-v2-text-secondary)]">{source}</span>
          {item.criterionKey ? (
            <span>{item.criterionLabel || criterionLabels[item.criterionKey]}</span>
          ) : (
            <span>Hệ thống</span>
          )}
          <time dateTime={item.createdAt}>{formatFeedbackTimestamp(item.createdAt)}</time>
          {item.dueDate ? (
            <span className="font-semibold text-[var(--student-v2-progress-supplement-text)]">
              Hạn: {formatFeedbackDate(item.dueDate)}
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="min-w-0 text-[15px] font-semibold leading-6 text-[var(--student-v2-text-primary)]">
            {item.title}
          </h3>
          <StatusPillV2 status={progressStatus} label={item.statusLabel} />
        </div>
        <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-[var(--student-v2-text-secondary)]">
          {item.message}
        </p>
        {isLong ? (
          <button
            type="button"
            className="mt-1 min-h-11 text-[13px] font-semibold text-[var(--student-v2-primary-action-blue)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--student-v2-focus-ring)]"
            onClick={() => onExpand(item)}
          >
            Xem đầy đủ
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {isAcknowledgeOnly ? (
          <ButtonV2
            size="compact"
            variant="secondary"
            disabled={isPending || item.status === "read"}
            onClick={() => onMarkRead(item.id)}
          >
            {isPending ? "Đang lưu" : "Đã hiểu"}
          </ButtonV2>
        ) : (
          <ButtonV2 asChild size="compact" variant={item.isActionable ? "primary" : "secondary"}>
            <Link to={toStudentHref(actionHref)}>{item.actionLabel}</Link>
          </ButtonV2>
        )}
        <ButtonV2 asChild size="compact" variant="tertiary">
          <Link to={toStudentHref(assistantHref)}>Hỏi trợ lý</Link>
        </ButtonV2>
        {!isAcknowledgeOnly && (item.status === "new" || item.isActionable) ? (
          <ButtonV2
            size="compact"
            variant="tertiary"
            disabled={isPending}
            onClick={() => onMarkRead(item.id)}
          >
            {isPending ? "Đang lưu" : "Đã hiểu"}
          </ButtonV2>
        ) : null}
      </div>
    </article>
  );
}

function FeedbackPagination({
  page,
  pageCount,
  onPrevious,
  onNext,
}: {
  page: number;
  pageCount: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <nav
      className="flex items-center justify-between gap-3 border-t border-[var(--student-v2-divider)] px-4 py-3 text-sm"
      aria-label="Phân trang phản hồi"
    >
      <span className="text-[var(--student-v2-text-muted)]">
        Trang {page}/{pageCount}
      </span>
      <div className="flex gap-2">
        <ButtonV2 size="compact" variant="secondary" disabled={page <= 1} onClick={onPrevious}>
          Trước
        </ButtonV2>
        <ButtonV2 size="compact" variant="secondary" disabled={page >= pageCount} onClick={onNext}>
          Sau
        </ButtonV2>
      </div>
    </nav>
  );
}

function getFeedbackProgressStatus(item: FeedbackItem): StudentApplicationV2ProgressStatus {
  if (item.isActionable) return "supplement";
  if (item.status === "read") return "complete";
  return "waiting";
}

function getFeedbackSourceLabel(item: FeedbackItem) {
  if (item.feedbackType === "action") return "Yêu cầu bổ sung";
  if (item.feedbackType === "result") return "Kết quả";
  if (item.feedbackType === "review") return "Cập nhật trạng thái";
  if (item.feedbackType === "system") return "Thông báo hệ thống";
  return "Phản hồi";
}

function formatFeedbackTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildAssistantHref({
  criterionKey,
  criterionLabel,
  feedbackId,
  message,
  source,
}: {
  criterionKey?: string | null;
  criterionLabel?: string | null;
  feedbackId?: string;
  message?: string;
  source: "feedback";
}) {
  const params = new URLSearchParams({ source });
  if (feedbackId) params.set("feedbackId", feedbackId);
  if (criterionKey) params.set("criterionKey", criterionKey);
  if (criterionLabel) params.set("criterionLabel", criterionLabel);
  if (message) params.set("message", message);
  return `/app/assistant?${params.toString()}`;
}

function toStudentHref(href: string) {
  return href as "/app/application" | "/app/feedback" | "/app/assistant";
}

function formatFeedbackDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
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
  if (normalized.includes("success") || normalized.includes("resolved"))
    return <CheckCircle2 className="h-4 w-4" />;
  if (
    normalized.includes("warning") ||
    normalized.includes("error") ||
    normalized.includes("supplement")
  )
    return <AlertTriangle className="h-4 w-4" />;
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
    .sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
}

function presentNotificationGroup(group: Notification[]): PresentedNotification {
  const sorted = [...group].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const newest = sorted[0];
  const metadata = newest.metadata ?? {};
  const criterion = String(metadata.criterion ?? metadata.criteria ?? "");
  const criterionLabel = formatCriterionLabel(criterion as never);
  const levelLabel = formatLevelLabel(
    String(metadata.targetLevel ?? metadata.level ?? "") as never,
  );
  const studentName = String(metadata.studentName ?? metadata.fullName ?? "");
  const studentCode = String(metadata.studentCode ?? metadata.mssv ?? "");
  const context = [studentName, studentCode, levelLabel !== "Chưa có dữ liệu" ? levelLabel : ""]
    .filter(Boolean)
    .join(" · ");
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
  } else if (
    lowerType.includes("resolution") ||
    lowerText.includes("resolution") ||
    lowerText.includes("hội ý")
  ) {
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
    message:
      context || sanitizeNotificationText(newest.message) || "Mở chi tiết để xem thông tin xử lý.",
    sourceIds: group.map((item) => item.id),
    title,
    type: newest.type,
  };
}

function getNotificationGroupKey(item: Notification) {
  const criterion = String(item.metadata?.criterion ?? "");
  return [
    item.applicationId ?? "none",
    item.reviewTaskId ?? "none",
    item.resolutionCaseId ?? item.metadata?.resolutionCaseId ?? "none",
    item.evidenceId ?? item.metadata?.evidenceId ?? "none",
    criterion,
    item.type,
  ].join(":");
}

function getNotificationBucket(item: Notification): PresentedNotification["bucket"] {
  const lowerType = item.type.toLowerCase();
  const lowerText = `${item.title} ${item.message}`.toLowerCase();
  if (
    lowerType.includes("resolution") ||
    lowerText.includes("hội ý") ||
    lowerText.includes("resolved")
  )
    return "result";
  if (
    lowerType.includes("supplement") ||
    lowerType.includes("assigned") ||
    lowerType.includes("deadline") ||
    item.reviewTaskId
  )
    return "action";
  return "info";
}

function getNotificationCta(item: Notification) {
  const lowerType = item.type.toLowerCase();
  const lowerTitle = item.title.toLowerCase();
  const caseId = String(
    item.resolutionCaseId ?? item.metadata?.resolutionCaseId ?? item.metadata?.caseId ?? "",
  );
  if (caseId || lowerType.includes("resolution") || lowerTitle.includes("resolution")) {
    return {
      icon: <FileText className="mr-1 h-3.5 w-3.5" />,
      link: caseId ? `/app/resolution/${caseId}` : "/app/resolution",
      text: "Xem case hội ý",
    };
  }
  if (item.reviewTaskId) {
    return {
      icon: <FileText className="mr-1 h-3.5 w-3.5" />,
      link: `/app/review/${item.reviewTaskId}`,
      text: "Mở xét duyệt",
    };
  }
  if (item.evidenceId || lowerType.includes("supplement")) {
    const criterion = String(item.metadata?.criterion ?? "");
    const evidenceId = String(item.evidenceId ?? item.metadata?.evidenceId ?? "");
    const params = new URLSearchParams();
    if (criterion) params.set("criterion", criterion);
    if (evidenceId) params.set("evidenceId", evidenceId);
    return {
      icon: <FileText className="mr-1 h-3.5 w-3.5" />,
      link: `/app/application${params.toString() ? `?${params.toString()}` : ""}`,
      text: "Xem minh chứng",
    };
  }
  return {
    icon: <User className="mr-1 h-3.5 w-3.5" />,
    link: item.applicationId ? "/app/queue" : "/app",
    text: "Xem hồ sơ",
  };
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
