import { CheckCircle2, Eye, FileCheck2, LockKeyhole, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UxStatusCard } from "@/components/status/UxStatusCard";
import type { ApprovedEvidenceSearchItem } from "@/types/evidence";
import {
  criterionCopy,
  formatEventDateRange,
  formatImportedValue,
  levelCopy,
} from "./approved-evidence-utils";

type ApprovedEvidenceCardProps = {
  item: ApprovedEvidenceSearchItem;
  evidenceId?: string | null;
  isImporting: boolean;
  onImport: () => void;
  onViewEvidence: () => void;
};

export function ApprovedEvidenceCard({
  item,
  evidenceId,
  isImporting,
  onImport,
  onViewEvidence,
}: ApprovedEvidenceCardProps) {
  const alreadyImported = item.alreadyImported || Boolean(evidenceId);
  const unavailable = !item.importable && !alreadyImported;

  return (
    <article className="rounded-md border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge variant="outline">
              {criterionCopy[item.event.criterion] ?? item.event.criterion}
            </Badge>
            <Badge variant="outline">Danh sách chính thức</Badge>
            {alreadyImported ? (
              <Badge
                className="border-emerald-200 bg-emerald-50 text-emerald-700"
                variant="outline"
              >
                Đã thêm
              </Badge>
            ) : unavailable ? (
              <Badge className="border-slate-200 bg-slate-50 text-slate-700" variant="outline">
                Không khả dụng
              </Badge>
            ) : (
              <Badge className="border-sky-200 bg-sky-50 text-sky-700" variant="outline">
                Có thể thêm
              </Badge>
            )}
          </div>
          <h2 className="line-clamp-2 text-base font-bold text-brand-deep">
            {item.event.eventName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {item.event.organizer || "Đơn vị tổ chức"}
          </p>
        </div>
        <FileCheck2 className="h-6 w-6 shrink-0 text-primary" />
      </div>

      {item.uxStatus ? <UxStatusCard status={item.uxStatus} className="mt-4 p-3" /> : null}

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <Info
          label="Cấp tổ chức"
          value={levelCopy[item.event.organizerLevel ?? ""] ?? item.event.organizerLevel}
        />
        <Info
          label="Thời gian"
          value={formatEventDateRange(item.event.startDate, item.event.endDate)}
        />
        <Info label="Giá trị quy đổi" value={formatImportedValue(item)} />
        <Info label="Số quyết định" value={item.event.officialDocumentNo} />
        <Info label="Đơn vị ban hành" value={item.event.officialIssuer} />
      </div>

      {item.reason && unavailable ? (
        <div className="mt-3 flex gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
          {item.reason}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
        {alreadyImported ? (
          <Button type="button" size="sm" onClick={onViewEvidence} disabled={!evidenceId}>
            <Eye className="h-4 w-4" />
            Xem minh chứng
          </Button>
        ) : item.importable ? (
          <Button type="button" size="sm" onClick={onImport} disabled={isImporting}>
            <PlusCircle className="h-4 w-4" />
            Thêm vào hồ sơ
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline" disabled>
            Không khả dụng
          </Button>
        )}

        {alreadyImported ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Minh chứng này đã có trong hồ sơ.
          </span>
        ) : null}
      </div>
    </article>
  );
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === "") return null;

  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-semibold text-foreground">{value}</div>
    </div>
  );
}
