import {
  BadgeCheck,
  CalendarClock,
  Clock3,
  Dumbbell,
  GraduationCap,
  HeartHandshake,
  Info,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  UserRoundCheck,
  Globe2,
  type LucideIcon,
} from "lucide-react";
import { ButtonV2 } from "@/features/application/ui-v2/components";
import type { ApplicationSubmissionDeadline, CitySubmissionEligibility } from "@/lib/api/types";
import { coreCriterionPresentation } from "@/lib/criteria-presentation";
import { formatVietnamDateTime } from "@/lib/datetime-vietnam";

const criterionIcons = {
  ethics: ShieldCheck,
  academic: GraduationCap,
  physical: Dumbbell,
  volunteer: HeartHandshake,
  integration: Globe2,
} as const;

export function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-w-0 flex-col gap-5 py-5 sm:gap-6 sm:py-6">{children}</main>
  );
}

export function CriterionReviewCard({
  criterion,
  title,
  informationLabel,
  evidenceCount,
  href,
}: {
  criterion: keyof typeof coreCriterionPresentation;
  title: string;
  informationLabel: string;
  evidenceCount: number | null;
  href?: string;
}) {
  const Icon = criterionIcons[criterion];
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--student-v2-surface-secondary)] text-[var(--student-v2-institutional-blue)]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-5 text-[var(--student-v2-text-primary)]">
          {title}
        </span>
        <span className="mt-1 block text-sm text-[var(--student-v2-text-secondary)]">
          {informationLabel}
          {evidenceCount !== null &&
          !(evidenceCount === 0 && informationLabel === "Chưa thêm minh chứng")
            ? ` · ${evidenceCount} minh chứng`
            : ""}
        </span>
      </span>
      {href ? (
        <span className="shrink-0 text-sm font-semibold text-[var(--student-v2-institutional-blue)]">
          Xem
        </span>
      ) : null}
    </>
  );
  const className =
    "flex min-w-0 items-center gap-3 rounded-lg border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-v2-focus-ring)]";

  return href ? (
    <a
      href={href}
      className={`${className} transition-colors hover:bg-[var(--student-v2-surface-hover)]`}
    >
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function EligibilityPanel({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data?: CitySubmissionEligibility;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  let title = "Đang cập nhật điều kiện nộp hồ sơ";
  let description = "Đang kiểm tra điều kiện nộp hồ sơ của bạn.";
  let Icon = Clock3;
  let tone: "info" | "success" | "warning" | "critical" = "info";

  if (!isLoading && isError) {
    title = "Chưa tải được điều kiện nộp hồ sơ";
    description = "Thử tải lại trước khi gửi để hệ thống xác nhận thông tin mới nhất.";
    Icon = TriangleAlert;
    tone = "critical";
  } else if (data?.status === "ELIGIBLE" && data.route === "DIRECT_CITY") {
    title = "Có thể gửi hồ sơ cấp Thành phố";
    description = "Hồ sơ của bạn thuộc nhóm nộp trực tiếp lên cấp Thành phố.";
    Icon = BadgeCheck;
    tone = "success";
  } else if (data?.status === "ELIGIBLE") {
    title = "Điều kiện nộp hồ sơ đã được xác nhận";
    description = "Thông tin công nhận của bạn đã được xác nhận trong hệ thống.";
    Icon = UserRoundCheck;
    tone = "success";
  } else if (data?.status === "NOT_ELIGIBLE") {
    title = "Chưa tìm thấy thông tin công nhận phù hợp";
    description =
      "Nếu bạn đã được công nhận, thông tin có thể đang chờ đơn vị cập nhật hoặc xác nhận.";
    Icon = Info;
    tone = "warning";
  } else if (data?.status === "NEEDS_VERIFICATION") {
    title = "Thông tin điều kiện đang được kiểm tra";
    description = "Hệ thống sẽ cập nhật khi việc đối chiếu hoàn tất.";
    Icon = Clock3;
    tone = "warning";
  }

  return (
    <GatePanel title="Điều kiện nộp hồ sơ" icon={Icon} tone={tone}>
      <p className="font-medium text-[var(--student-v2-text-primary)]">{title}</p>
      <p
        role="status"
        aria-live="polite"
        className="text-sm leading-5 text-[var(--student-v2-text-secondary)]"
      >
        {isLoading ? "Đang kiểm tra điều kiện nộp hồ sơ của bạn." : description}
      </p>
      {!isLoading && isError ? (
        <RetryButton onClick={onRetry} label="Tải lại điều kiện nộp hồ sơ" />
      ) : null}
      {!isLoading && !isError && data?.status === "ELIGIBLE" ? (
        <p className="mt-2 text-xs text-[var(--student-v2-text-muted)]">
          Đây là điều kiện gửi hồ sơ, chưa phải kết quả xét danh hiệu.
        </p>
      ) : null}
    </GatePanel>
  );
}

export function SubmissionWindowPanel({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data?: ApplicationSubmissionDeadline;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const submission = data?.submission;
  const status = submission?.status;
  const exceptionDeadline = submission?.effectiveClosesAt ?? submission?.exceptionValidUntil;
  const normalDeadline = submission?.closesAt;

  let label = "Đang cập nhật";
  let description = "Đang tải thời gian nhận hồ sơ.";
  let tone: "info" | "success" | "warning" | "critical" = "info";
  if (isError) {
    label = "Chưa tải được";
    description = "Thử tải lại thời hạn trước khi gửi hồ sơ.";
    tone = "critical";
  } else if (!isLoading && status === "NOT_CONFIGURED") {
    label = "Chưa công bố";
    description = "Thời gian nhận hồ sơ chưa được công bố.";
    tone = "warning";
  } else if (!isLoading && status === "NOT_OPEN") {
    label = "Chưa bắt đầu";
    description = "Thời gian nhận hồ sơ chưa bắt đầu.";
    tone = "warning";
  } else if (!isLoading && status === "CLOSED") {
    label = "Đã kết thúc";
    description = "Thời gian nhận hồ sơ hiện đã kết thúc.";
    tone = "warning";
  } else if (!isLoading && status === "EXCEPTION_ACTIVE") {
    label = "Đang nhận hồ sơ theo thời hạn riêng";
    description = "Hồ sơ của bạn có thời hạn gửi riêng đang có hiệu lực.";
    tone = "success";
  } else if (!isLoading && status === "OPEN") {
    label = "Đang nhận hồ sơ";
    description = "Hệ thống đang tiếp nhận hồ sơ trong thời gian đã công bố.";
    tone = "success";
  }

  return (
    <GatePanel title="Thời gian nhận hồ sơ" icon={CalendarClock} tone={tone}>
      <p className="font-medium text-[var(--student-v2-text-primary)]">{label}</p>
      <p
        role="status"
        aria-live="polite"
        className="text-sm leading-5 text-[var(--student-v2-text-secondary)]"
      >
        {description}
      </p>
      {status === "NOT_OPEN" && submission?.opensAt ? (
        <DateLine label="Mở nhận hồ sơ" value={submission.opensAt} />
      ) : null}
      {status === "OPEN" && normalDeadline ? (
        <DateLine label="Hạn gửi" value={normalDeadline} />
      ) : null}
      {status === "EXCEPTION_ACTIVE" && exceptionDeadline ? (
        <>
          <DateLine label="Hạn gửi dành cho hồ sơ của bạn" value={exceptionDeadline} />
          {normalDeadline && normalDeadline !== exceptionDeadline ? (
            <DateLine label="Hạn chung" value={normalDeadline} />
          ) : null}
        </>
      ) : null}
      {status === "CLOSED" && (submission?.effectiveClosesAt ?? normalDeadline) ? (
        <DateLine
          label="Thời hạn kết thúc"
          value={submission?.effectiveClosesAt ?? normalDeadline ?? ""}
        />
      ) : null}
      {isError ? <RetryButton onClick={onRetry} label="Tải lại thời gian nhận hồ sơ" /> : null}
      {!isLoading && label === "Đang cập nhật" ? (
        <p className="mt-1 text-sm text-[var(--student-v2-text-secondary)]">
          Chưa xác định được thời hạn. Thử tải lại trước khi gửi.
        </p>
      ) : null}
    </GatePanel>
  );
}

function GatePanel({
  title,
  icon: Icon,
  tone,
  children,
}: {
  title: string;
  icon: LucideIcon;
  tone: "info" | "success" | "warning" | "critical";
  children: React.ReactNode;
}) {
  const toneClass = {
    info: "text-[var(--student-v2-institutional-blue)]",
    success: "text-[var(--student-v2-progress-complete-text)]",
    warning: "text-[var(--student-v2-progress-supplement-text)]",
    critical: "text-[var(--student-v2-critical-text)]",
  }[tone];
  return (
    <section className="min-w-0 rounded-lg border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] p-4 sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${toneClass}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-[var(--student-v2-text-primary)]">{title}</h2>
          <div className="mt-2">{children}</div>
        </div>
      </div>
    </section>
  );
}

function DateLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="mt-2 flex min-w-0 flex-wrap items-center gap-x-1 text-sm text-[var(--student-v2-text-primary)]">
      <Clock3 className="h-4 w-4 shrink-0 text-[var(--student-v2-text-muted)]" aria-hidden="true" />
      <span>{label}:</span>
      <time dateTime={value} className="font-medium">
        {formatVietnamDateTime(value)}
      </time>
    </p>
  );
}

export function RetryButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <ButtonV2
      type="button"
      variant="tertiary"
      size="compact"
      className="mt-2"
      aria-label={label}
      onClick={onClick}
    >
      <RefreshCw aria-hidden="true" />
      Thử tải lại
    </ButtonV2>
  );
}
