import type { ReactNode } from "react";
import { Button } from "@/components/ui-kit";

export function SummaryCard({
  title,
  subtitle,
  status,
  children,
  action,
  tone = "default",
}: {
  title: string;
  subtitle?: string;
  status?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  tone?: "default" | "warning" | "success" | "info" | "error";
}) {
  return (
    <section
      className={`rounded-2xl p-4 shadow-[var(--shadow-card)] md:p-5 ${summaryToneClass[tone]}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-brand-deep">{title}</h2>
            {status}
          </div>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-[#475569]">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}

export function NextActionList({
  title = "Việc cần làm tiếp theo",
  emptyText,
  children,
}: {
  title?: string;
  emptyText?: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-[var(--shadow-card)] md:p-5">
      <h2 className="text-lg font-bold text-brand-deep">{title}</h2>
      <div className="mt-4 space-y-3">
        {children || (
          <EmptyState
            title="Không có việc cần xử lý"
            description={
              emptyText ?? "Các việc cần làm sẽ hiển thị tại đây khi hệ thống có dữ liệu mới."
            }
          />
        )}
      </div>
    </section>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-[var(--surface-secondary)] p-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{children}</div>
    </section>
  );
}

export function StickyActionBar({
  message,
  primary,
  secondary,
}: {
  message: string;
  primary?: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-white/95 px-4 py-3 shadow-[0_-1px_0_rgba(15,23,42,0.06),0_-14px_36px_-32px_rgba(15,23,42,0.45)] backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-medium text-[#475569]">{message}</div>
        <div className="flex flex-wrap gap-2">
          {secondary}
          {primary}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-muted)] px-4 py-5 text-center">
      <div className="font-semibold text-brand-deep">{title}</div>
      {description ? (
        <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-[#475569]">{description}</p>
      ) : null}
      {actionLabel && onAction ? (
        <Button className="mt-3" size="sm" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

const summaryToneClass = {
  default: "bg-white",
  warning: "bg-[var(--surface-warning)]",
  success: "bg-[var(--surface-success)]",
  info: "bg-[var(--brand-primary-soft)]",
  error: "bg-[var(--surface-danger)]",
};
