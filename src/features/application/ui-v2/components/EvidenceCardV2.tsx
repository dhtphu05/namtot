import {
  Eye,
  FileText,
  ImageIcon,
  ListChecks,
  Loader2,
  MoreHorizontal,
  TriangleAlert,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { StatusPillV2 } from "./primitives";
import {
  getEvidencePreviewKind,
  type EvidencePreviewKind,
  type StudentApplicationV2ProgressStatus,
} from "./visual-contract";

export type OfficialDataTileProps = {
  sourceLabel?: string | null;
  eventTitle?: string | null;
  recordedValue?: string | number | null;
};

export type EvidenceCardV2Preview =
  | {
      kind: EvidencePreviewKind;
      src?: string;
      alt?: string;
      officialData?: OfficialDataTileProps;
    }
  | {
      mimeType?: string | null;
      fileName?: string | null;
      evidenceName?: string | null;
      evidenceType?: string | null;
      requirementKey?: string | null;
      criterion?: string | null;
      sourceType?: string | null;
      isOfficialData?: boolean | null;
      isLoading?: boolean | null;
      isFailed?: boolean | null;
      src?: string;
      alt?: string;
      officialData?: OfficialDataTileProps;
    };

export type EvidenceCardV2Action = {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
};

export function EvidenceGallery({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {children}
    </div>
  );
}

export function EvidenceCardV2({
  title,
  metadata,
  context,
  processingDetail,
  status,
  preview,
  onOpen,
  actionItems,
  actions,
  className,
}: {
  title: string;
  metadata?: string;
  context?: string;
  processingDetail?: string;
  status: StudentApplicationV2ProgressStatus;
  preview: EvidenceCardV2Preview;
  onOpen?: () => void;
  actionItems?: EvidenceCardV2Action[];
  actions?: ReactNode;
  className?: string;
}) {
  const previewKind = "kind" in preview ? preview.kind : getEvidencePreviewKind(preview);
  const officialData = "officialData" in preview ? preview.officialData : undefined;

  return (
    <article
      className={cn(
        "flex min-h-[276px] min-w-0 flex-col overflow-hidden rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)]",
        className,
      )}
    >
      <EvidenceThumbnail
        kind={previewKind}
        src={preview.src}
        alt={preview.alt ?? title}
        title={title}
        officialData={officialData}
        onOpen={onOpen}
      />
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-[23px] text-[var(--student-v2-text-primary)]">
            {title}
          </h3>
          <StatusPillV2 status={status} />
        </div>
        {metadata ? (
          <p className="mt-2 line-clamp-1 text-[13px] leading-[18px] text-[var(--student-v2-text-secondary)]">
            {metadata}
          </p>
        ) : null}
        {context ? (
          <p className="mt-1 line-clamp-1 text-[13px] leading-[18px] text-[var(--student-v2-text-muted)]">
            {context}
          </p>
        ) : null}
        {processingDetail ? (
          <p className="mt-2 text-[13px] leading-[18px] text-[var(--student-v2-progress-waiting-text)]">
            {processingDetail}
          </p>
        ) : null}
        {actionItems?.length ? (
          <div className="mt-auto flex justify-end pt-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--student-v2-radius-control)] text-[var(--student-v2-text-secondary)] hover:bg-[var(--student-v2-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-v2-focus-ring)]"
                  aria-label={`Thao tác với minh chứng ${title}`}
                >
                  <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actionItems.map((item) => (
                  <DropdownMenuItem
                    key={item.label}
                    className={cn(item.destructive && "text-[var(--student-v2-critical-text)]")}
                    onSelect={item.onSelect}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : actions ? (
          <div className="mt-auto flex flex-wrap gap-2 pt-3">{actions}</div>
        ) : null}
      </div>
    </article>
  );
}

export const EvidencePreviewCard = EvidenceCardV2;

export function EvidenceThumbnail({
  kind,
  src,
  alt,
  title,
  officialData,
  onOpen,
}: {
  kind: EvidencePreviewKind;
  src?: string;
  alt: string;
  title: string;
  officialData?: OfficialDataTileProps;
  onOpen?: () => void;
}) {
  return (
    <button
      type="button"
      className="group relative block aspect-video w-full overflow-hidden bg-[var(--student-v2-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-v2-focus-ring)]"
      onClick={onOpen}
      aria-label={`Xem minh chứng ${title}`}
    >
      <EvidencePreviewFrame kind={kind} src={src} alt={alt} officialData={officialData} />
      <span className="absolute inset-0 flex items-center justify-center bg-[rgba(22,32,51,0.10)] opacity-100 transition-opacity duration-[120ms] sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
        <span className="inline-flex min-h-11 items-center gap-2 rounded-[var(--student-v2-radius-pill)] bg-[var(--student-v2-surface-primary)] px-4 text-[13px] font-semibold leading-[18px] text-[var(--student-v2-institutional-blue)]">
          <Eye className="h-4 w-4" aria-hidden="true" />
          Xem
        </span>
      </span>
    </button>
  );
}

function EvidencePreviewFrame({
  kind,
  src,
  alt,
  officialData,
}: {
  kind: EvidencePreviewKind;
  src?: string;
  alt: string;
  officialData?: OfficialDataTileProps;
}) {
  if (kind === "loading") {
    return (
      <div className="flex h-full w-full items-center justify-center text-[var(--student-v2-institutional-blue)]">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (kind === "failed") {
    return (
      <PreviewTile
        icon={<TriangleAlert className="h-6 w-6" aria-hidden="true" />}
        label="Không tải được ảnh"
      />
    );
  }

  if (kind === "official_data") {
    return <OfficialDataTile {...officialData} />;
  }

  if (kind === "photo" && src) {
    return <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />;
  }

  if (kind === "document" && src) {
    return <img src={src} alt={alt} loading="lazy" className="h-full w-full object-contain p-3" />;
  }

  return (
    <PreviewTile
      icon={
        kind === "photo" ? (
          <ImageIcon className="h-6 w-6" aria-hidden="true" />
        ) : (
          <FileText className="h-6 w-6" aria-hidden="true" />
        )
      }
      label={
        kind === "photo"
          ? "Ảnh minh chứng"
          : kind === "unknown"
            ? "Minh chứng"
            : "Tài liệu minh chứng"
      }
    />
  );
}

export function OfficialDataTile({
  sourceLabel = "Nguồn đã xác minh",
  eventTitle,
  recordedValue,
}: OfficialDataTileProps) {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-2 px-5 text-left text-[var(--student-v2-institutional-blue)]">
      <ListChecks className="h-6 w-6" aria-hidden="true" />
      <div className="text-[13px] font-semibold leading-[18px]">{sourceLabel}</div>
      {eventTitle ? (
        <div className="line-clamp-2 text-[14px] font-semibold leading-5 text-[var(--student-v2-text-primary)]">
          {eventTitle}
        </div>
      ) : null}
      {recordedValue !== undefined && recordedValue !== null && recordedValue !== "" ? (
        <div className="text-[13px] leading-[18px] text-[var(--student-v2-text-secondary)]">
          Giá trị ghi nhận: {recordedValue}
        </div>
      ) : null}
    </div>
  );
}

function PreviewTile({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-[var(--student-v2-institutional-blue)]">
      {icon}
      <span className="text-[13px] font-semibold leading-[18px]">{label}</span>
    </div>
  );
}
