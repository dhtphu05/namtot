import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { CriterionDisplayStatus, StudentCriterionDisplayState } from "../../presentation";

export type StudentApplicationV2ProgressStatus =
  "complete" | "waiting" | "supplement" | "not-started";

export type EvidencePreviewSource = {
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
};

export type EvidencePreviewKind =
  "document" | "photo" | "official_data" | "unknown" | "loading" | "failed";

export type ApplicationContextBarLink = {
  label: string;
  href: string;
  ariaLabel?: string;
};

export const defaultApplicationContextBarLinks: ApplicationContextBarLink[] = [
  { label: "Quy định áp dụng", href: "/app/application#quy-dinh-ap-dung" },
  { label: "Trung tâm hỗ trợ", href: "/app/assistant" },
  { label: "Thông tin hệ thống", href: "/app/application#thong-tin-he-thong" },
];

export const studentApplicationV2ProgressLabels: Record<
  StudentApplicationV2ProgressStatus,
  string
> = {
  complete: "Hoàn thành",
  waiting: "Đang chờ",
  supplement: "Cần bổ sung",
  "not-started": "Chưa bắt đầu",
};

export function getStatusPillV2ClassName(status: StudentApplicationV2ProgressStatus) {
  return cn(
    "inline-flex min-h-6 max-w-full items-center gap-1 rounded-[var(--student-v2-radius-pill)] px-2.5 py-1 text-[13px] font-medium leading-[18px]",
    statusClassName[status],
  );
}

export const buttonV2Variants = cva(
  "inline-flex min-h-11 max-w-full items-center justify-center gap-2 whitespace-nowrap rounded-[var(--student-v2-radius-control)] px-4 py-2 text-[15px] font-semibold leading-[23px] transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-v2-focus-ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--student-v2-primary-action-blue)] text-[var(--student-v2-text-inverse)] hover:brightness-95",
        secondary:
          "bg-[var(--student-v2-surface-selected)] text-[var(--student-v2-institutional-blue)] hover:bg-[var(--student-v2-surface-hover)]",
        tertiary:
          "bg-transparent px-2 text-[var(--student-v2-institutional-blue)] hover:bg-[var(--student-v2-surface-hover)]",
        destructive:
          "bg-[var(--student-v2-critical-bg)] text-[var(--student-v2-critical-text)] hover:brightness-95",
      },
      size: {
        compact: "min-h-11 px-3 py-2 text-[13px] leading-[18px]",
        default: "min-h-11 px-4 py-2",
        touch: "min-h-11 px-4 py-2",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export type ButtonV2ClassOptions = VariantProps<typeof buttonV2Variants>;

export function buttonV2ClassName(options: ButtonV2ClassOptions = {}) {
  return buttonV2Variants(options);
}

export function criteriaNavigationRowV2ClassName({
  active = false,
  className,
}: {
  active?: boolean;
  className?: string;
} = {}) {
  return cn(
    "group relative flex min-h-16 w-full min-w-0 items-start gap-3 px-4 py-3 text-left transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-v2-focus-ring)]",
    "border-l-[3px]",
    active
      ? "border-l-[var(--student-v2-institutional-blue)] bg-[var(--student-v2-surface-selected)]"
      : "border-l-transparent bg-[var(--student-v2-surface-primary)] hover:bg-[var(--student-v2-surface-hover)]",
    className,
  );
}

export function mapStudentDisplayStatusToV2ProgressStatus(
  input: StudentCriterionDisplayState | CriterionDisplayStatus | string | null | undefined,
): StudentApplicationV2ProgressStatus {
  const status = typeof input === "string" ? input : input?.status;
  if (status === "accepted" || status === "ready") return "complete";
  if (status === "supplement_required") return "supplement";
  if (
    status === "under_review" ||
    status === "resolution" ||
    status === "needs_verification" ||
    status === "in_progress"
  ) {
    return "waiting";
  }
  return "not-started";
}

export function getEvidencePreviewKind(source: EvidencePreviewSource): EvidencePreviewKind {
  if (source.isLoading) return "loading";
  if (source.isFailed) return "failed";
  if (source.isOfficialData || source.sourceType === "event_import") return "official_data";

  const evidenceContext = [
    source.evidenceType,
    source.evidenceName,
    source.requirementKey,
    source.fileName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    /\b(photo|image|activity_photo|event_photo|sports_activity|volunteer_activity)\b/.test(
      evidenceContext,
    ) ||
    /(?:ảnh|hình ảnh|hoạt động|tình nguyện|tham gia)/i.test(evidenceContext)
  ) {
    return "photo";
  }

  if (
    source.mimeType === "application/pdf" ||
    /(?:pdf|certificate|transcript|award|decision|document|scan|giấy|bằng|chứng nhận|bảng điểm|quyết định)/i.test(
      evidenceContext,
    )
  ) {
    return "document";
  }

  if (source.mimeType?.startsWith("image/")) return "unknown";
  return "unknown";
}

const statusClassName: Record<StudentApplicationV2ProgressStatus, string> = {
  complete:
    "bg-[var(--student-v2-progress-complete-bg)] text-[var(--student-v2-progress-complete-text)]",
  waiting:
    "bg-[var(--student-v2-progress-waiting-bg)] text-[var(--student-v2-progress-waiting-text)]",
  supplement:
    "bg-[var(--student-v2-progress-supplement-bg)] text-[var(--student-v2-progress-supplement-text)]",
  "not-started":
    "bg-[var(--student-v2-progress-not-started-bg)] text-[var(--student-v2-progress-not-started-text)]",
};
