import type { ReactNode } from "react";

export function AwardNextAction({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Bước tiếp theo</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-700">{description}</p>
        </div>
        {action}
      </div>
    </div>
  );
}
