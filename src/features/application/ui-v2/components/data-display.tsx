import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DefinitionTableV2Row = {
  label: ReactNode;
  value: ReactNode;
  source: ReactNode;
  status: ReactNode;
  action?: ReactNode;
};

export type PathSelectorListV2Item = {
  id: string;
  title: string;
  description?: string;
  selected?: boolean;
  disabled?: boolean;
};

export type ActivityLedgerV2Row = {
  id: string;
  title: ReactNode;
  metadata?: ReactNode;
  status?: ReactNode;
  action?: ReactNode;
};

export function DefinitionTableV2({
  rows,
  className,
}: {
  rows: DefinitionTableV2Row[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)]",
        className,
      )}
    >
      <div className="hidden min-h-11 grid-cols-[minmax(150px,0.92fr)_minmax(160px,1fr)_minmax(150px,0.86fr)_minmax(128px,0.72fr)_minmax(104px,0.58fr)] items-center gap-4 bg-[var(--student-v2-surface-muted)] px-4 text-[13px] font-medium leading-[18px] text-[var(--student-v2-text-muted)] md:grid">
        <span>Nội dung</span>
        <span>Giá trị</span>
        <span>Nguồn</span>
        <span>Trạng thái</span>
        <span>Hành động</span>
      </div>
      <div className="divide-y divide-[var(--student-v2-divider)]">
        {rows.map((row, index) => (
          <div
            key={index}
            className="min-w-0 px-4 py-3 text-[15px] leading-[23px] md:grid md:min-h-[56px] md:grid-cols-[minmax(150px,0.92fr)_minmax(160px,1fr)_minmax(150px,0.86fr)_minmax(128px,0.72fr)_minmax(104px,0.58fr)] md:items-center md:gap-4"
          >
            <div className="hidden font-semibold text-[var(--student-v2-text-primary)] md:block md:whitespace-nowrap">
              {row.label}
            </div>
            <div className="hidden min-w-0 text-[var(--student-v2-text-primary)] md:block [&>*]:min-w-0">
              {row.value}
            </div>
            <div className="hidden min-w-0 text-[var(--student-v2-text-secondary)] md:block">
              {row.source}
            </div>
            <div className="hidden md:block">{row.status}</div>
            <div className="hidden md:block">{row.action}</div>

            <dl className="grid min-w-0 gap-2 md:hidden">
              <div>
                <dt className="text-[12px] font-medium leading-4 text-[var(--student-v2-text-muted)]">
                  Nội dung
                </dt>
                <dd className="mt-0.5 font-semibold text-[var(--student-v2-text-primary)]">
                  {row.label}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] font-medium leading-4 text-[var(--student-v2-text-muted)]">
                  Giá trị
                </dt>
                <dd className="mt-0.5 text-[var(--student-v2-text-primary)]">{row.value}</dd>
              </div>
              <div>
                <dt className="text-[12px] font-medium leading-4 text-[var(--student-v2-text-muted)]">
                  Nguồn
                </dt>
                <dd className="mt-0.5 text-[var(--student-v2-text-secondary)]">{row.source}</dd>
              </div>
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <div>
                  <dt className="text-[12px] font-medium leading-4 text-[var(--student-v2-text-muted)]">
                    Trạng thái
                  </dt>
                  <dd className="mt-0.5">{row.status}</dd>
                </div>
                {row.action ? <dd className="shrink-0">{row.action}</dd> : null}
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PathSelectorListV2({
  items,
  onSelect,
  className,
}: {
  items: PathSelectorListV2Item[];
  onSelect?: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "divide-y divide-[var(--student-v2-divider)] overflow-hidden rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)]",
        className,
      )}
      role="radiogroup"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="radio"
          aria-checked={item.selected ? "true" : "false"}
          disabled={item.disabled}
          onClick={() => onSelect?.(item.id)}
          className={cn(
            "flex min-h-16 w-full min-w-0 items-start gap-3 px-4 py-3 text-left transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-v2-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60",
            item.selected
              ? "bg-[var(--student-v2-surface-selected)]"
              : "bg-[var(--student-v2-surface-primary)] hover:bg-[var(--student-v2-surface-hover)]",
          )}
        >
          <span
            className={cn(
              "mt-1 h-4 w-4 shrink-0 rounded-full border",
              item.selected
                ? "border-[var(--student-v2-institutional-blue)] bg-[var(--student-v2-institutional-blue)]"
                : "border-[var(--student-v2-border-strong)] bg-[var(--student-v2-surface-primary)]",
            )}
            aria-hidden="true"
          />
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold leading-[23px] text-[var(--student-v2-text-primary)]">
              {item.title}
            </span>
            {item.description ? (
              <span className="mt-1 block line-clamp-1 text-[13px] leading-[18px] text-[var(--student-v2-text-secondary)]">
                {item.description}
              </span>
            ) : null}
          </span>
        </button>
      ))}
    </div>
  );
}

export function ActivityLedgerV2({
  rows,
  className,
}: {
  rows: ActivityLedgerV2Row[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)]",
        className,
      )}
    >
      <div className="divide-y divide-[var(--student-v2-divider)]">
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid min-h-[52px] min-w-0 gap-2 px-4 py-3 text-[15px] leading-[23px] md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
          >
            <div className="min-w-0">
              <div className="truncate font-semibold text-[var(--student-v2-text-primary)]">
                {row.title}
              </div>
              {row.metadata ? (
                <div className="mt-1 truncate text-[13px] leading-[18px] text-[var(--student-v2-text-secondary)]">
                  {row.metadata}
                </div>
              ) : null}
            </div>
            <div>{row.status}</div>
            <div>{row.action}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
