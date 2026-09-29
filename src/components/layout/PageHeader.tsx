type PageHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  searchPlaceholder?: string;
  showSearch?: boolean;
};

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <section aria-labelledby="page-header-title" className="mb-5 min-w-0">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1
            id="page-header-title"
            className="break-words text-xl font-bold leading-tight text-[var(--text-primary)] md:text-2xl"
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 max-w-4xl text-[13px] leading-5 text-[var(--text-secondary)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
            {action}
          </div>
        ) : null}
      </div>
    </section>
  );
}
