import { Slot } from "@radix-ui/react-slot";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  Info,
  Loader2,
  PanelRightOpen,
  Radio,
  RefreshCw,
  School,
} from "lucide-react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import hsvvnEmblemUrl from "@/assets/hsvvn-emblem.webp";
import { cn } from "@/lib/utils";
import {
  buttonV2ClassName,
  criteriaNavigationRowV2ClassName,
  defaultApplicationContextBarLinks,
  getStatusPillV2ClassName,
  studentApplicationV2ProgressLabels,
  type ApplicationContextBarLink,
  type ButtonV2ClassOptions,
  type StudentApplicationV2ProgressStatus,
} from "./visual-contract";

type InstitutionalHeadingLevel = "h2" | "h3" | "div";

export function InstitutionalLockup({
  workspaceName,
  workspaceShortName,
  schoolYear,
  headingLevel = "h2",
  showReservedMark = true,
  className,
}: {
  workspaceName?: string | null;
  workspaceShortName?: string | null;
  schoolYear?: string | null;
  headingLevel?: InstitutionalHeadingLevel;
  showReservedMark?: boolean;
  className?: string;
}) {
  const Heading = headingLevel;
  const workspaceLabel = workspaceShortName || workspaceName || "Đơn vị triển khai";
  const titleNode = (
    <>
      <div className="text-[var(--student-v2-type-meta)] font-semibold uppercase leading-[var(--student-v2-type-meta-leading)] text-[var(--student-v2-institutional-navy)]">
        HỘI SINH VIÊN VIỆT NAM
      </div>
      <div className="mt-1 text-[15px] font-semibold leading-[23px] text-[var(--student-v2-text-primary)] [overflow-wrap:anywhere]">
        {workspaceLabel}
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-3 text-[var(--student-v2-text-primary)]",
        className,
      )}
    >
      {showReservedMark ? (
        <img
          src={hsvvnEmblemUrl}
          alt="Biểu trưng Hội Sinh viên Việt Nam"
          className="h-10 w-10 shrink-0 rounded-full object-contain"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        {headingLevel === "div" ? (
          <div>{titleNode}</div>
        ) : (
          <Heading className="m-0">{titleNode}</Heading>
        )}
        <div className="mt-1 text-[13px] font-medium leading-[18px] text-[var(--student-v2-text-secondary)]">
          Hệ thống Sinh viên 5 tốt
          {schoolYear ? <span className="block">Năm học {schoolYear}</span> : null}
        </div>
      </div>
    </div>
  );
}

export function ApplicationContextBar({
  workspaceName,
  workspaceShortName,
  schoolYear,
  links = defaultApplicationContextBarLinks,
  className,
}: {
  workspaceName?: string | null;
  workspaceShortName?: string | null;
  schoolYear?: string | null;
  links?: ApplicationContextBarLink[];
  className?: string;
}) {
  const workspaceLabel = workspaceShortName || workspaceName || "Đơn vị đang tải";

  return (
    <section
      aria-label="Ngữ cảnh hệ thống Sinh viên 5 tốt"
      className={cn(
        "rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-3 py-3 text-[var(--student-v2-text-primary)]",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <School
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--student-v2-institutional-blue)]"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <div className="text-[13px] font-semibold leading-[18px] [overflow-wrap:anywhere]">
            {workspaceLabel}
          </div>
          {schoolYear ? (
            <div className="mt-0.5 text-[12px] leading-[17px] text-[var(--student-v2-text-muted)]">
              Năm học {schoolYear}
            </div>
          ) : null}
        </div>
      </div>
      {links.length ? (
        <nav aria-label="Liên kết hỗ trợ sinh viên" className="mt-3">
          <ul className="flex flex-wrap gap-1.5">
            {links.map((link) => (
              <li key={`${link.href}-${link.label}`}>
                <ContextBarLink href={link.href} aria-label={link.ariaLabel}>
                  {link.label}
                </ContextBarLink>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </section>
  );
}

function ContextBarLink({
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
}) {
  return (
    <a
      className={cn(
        "inline-flex min-h-11 items-center rounded-[var(--student-v2-radius-control)] px-2.5 text-[12px] font-semibold leading-[17px] text-[var(--student-v2-institutional-blue)] transition-colors duration-[120ms] hover:bg-[var(--student-v2-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-v2-focus-ring)] focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    />
  );
}

export function PageTitleV2({
  eyebrow,
  title,
  description,
  display = false,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  display?: boolean;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex min-w-0 flex-col gap-3 text-[var(--student-v2-text-primary)] md:flex-row md:items-start md:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1 text-[13px] font-medium leading-[18px] text-[var(--student-v2-institutional-blue)]">
            {eyebrow}
          </div>
        ) : null}
        <h1
          className={cn(
            "line-clamp-2 font-bold text-[var(--student-v2-text-primary)] md:line-clamp-1",
            display ? "text-[32px] leading-10" : "text-[28px] leading-9",
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-1 line-clamp-2 max-w-3xl text-[15px] leading-[23px] text-[var(--student-v2-text-secondary)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function ButtonV2({
  asChild = false,
  variant,
  size,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonV2ClassOptions & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonV2ClassName({ variant, size }), className)} {...props} />;
}

export function StatusPillV2({
  status,
  label = studentApplicationV2ProgressLabels[status],
  className,
}: {
  status: StudentApplicationV2ProgressStatus;
  label?: string;
  className?: string;
}) {
  const Icon = statusIcon[status];
  return (
    <span className={cn(getStatusPillV2ClassName(status), className)}>
      <Icon className={cn("h-3.5 w-3.5 shrink-0", statusIconClass[status])} aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 text-[var(--student-v2-text-primary)] sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1 text-[12px] font-semibold leading-[17px] text-[var(--student-v2-text-muted)]">
            {eyebrow}
          </div>
        ) : null}
        <h2 className="m-0 text-[var(--student-v2-type-section-title)] font-semibold leading-[var(--student-v2-type-section-title-leading)] text-[var(--student-v2-text-primary)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-3xl text-[14px] leading-[22px] text-[var(--student-v2-text-secondary)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function HairlineList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "divide-y divide-[var(--student-v2-divider)] border-y border-[var(--student-v2-divider)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AccessibleIconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--student-v2-radius-control)] text-[var(--student-v2-text-secondary)] transition-colors duration-[120ms] hover:bg-[var(--student-v2-surface-hover)] hover:text-[var(--student-v2-institutional-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-v2-focus-ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [&_svg]:h-4 [&_svg]:w-4",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function CriticalStateV2({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-[var(--student-v2-radius-section)] bg-[var(--student-v2-critical-bg)] px-4 py-3 text-[var(--student-v2-critical-text)]",
        className,
      )}
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold leading-[23px]">{title}</div>
        {description ? <p className="mt-1 text-[13px] leading-[18px]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CriteriaNavigationRowV2({
  number,
  title,
  status,
  statusLabel,
  detail,
  active = false,
  onClick,
  className,
}: {
  number?: string;
  title: string;
  status: StudentApplicationV2ProgressStatus;
  statusLabel?: string;
  detail?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={criteriaNavigationRowV2ClassName({ active, className })}
      aria-pressed={active}
    >
      {number ? (
        <span className="mt-0.5 w-9 shrink-0 text-[20px] font-bold leading-7 text-[var(--student-v2-institutional-navy)]">
          {number}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-[23px] text-[var(--student-v2-text-primary)]">
          {title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-2">
          <StatusPillV2 status={status} label={statusLabel} />
          {detail ? (
            <span className="truncate text-[13px] font-medium leading-[18px] text-[var(--student-v2-text-muted)]">
              {detail}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

export function CompactEmptyStateV2({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-32 min-w-0 flex-col justify-center rounded-[var(--student-v2-radius-section)] border border-dashed border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-4 py-5 text-center",
        className,
      )}
    >
      <Info className="mx-auto h-6 w-6 text-[var(--student-v2-text-muted)]" aria-hidden="true" />
      <h3 className="mt-3 truncate text-[16px] font-semibold leading-6 text-[var(--student-v2-text-primary)]">
        {title}
      </h3>
      <p className="mx-auto mt-1 line-clamp-2 max-w-md text-[13px] leading-[18px] text-[var(--student-v2-text-secondary)]">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export const CompactEmptyState = CompactEmptyStateV2;

export function InlineStateMessage({
  tone = "info",
  title,
  description,
  action,
  className,
}: {
  tone?: "info" | "success" | "warning" | "critical";
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  const Icon = inlineStateIcon[tone];
  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-[var(--student-v2-radius-section)] px-4 py-3",
        inlineStateClassName[tone],
        className,
      )}
      role={tone === "critical" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold leading-[23px]">{title}</div>
        {description ? <p className="mt-1 text-[13px] leading-[18px]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function InlineErrorStateV2({
  title,
  description,
  onRetry,
  className,
}: {
  title: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <InlineStateMessage
      tone="critical"
      title={title}
      description={description}
      className={className}
      action={
        onRetry ? (
          <ButtonV2 type="button" variant="tertiary" size="compact" onClick={onRetry}>
            <RefreshCw aria-hidden="true" />
            Thử lại
          </ButtonV2>
        ) : undefined
      }
    />
  );
}

export function StickyNextActionBarV2({
  title,
  description,
  secondaryAction,
  primaryAction,
  className,
}: {
  title: string;
  description?: string;
  secondaryAction?: ReactNode;
  primaryAction?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 min-h-[72px] border-t border-[var(--student-v2-divider)] bg-[var(--student-v2-surface-primary)] px-4 py-3",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold leading-[23px] text-[var(--student-v2-text-primary)]">
            {title}
          </div>
          {description ? (
            <p className="line-clamp-1 text-[13px] leading-[18px] text-[var(--student-v2-text-secondary)]">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {secondaryAction}
          {primaryAction}
        </div>
      </div>
    </div>
  );
}

export function GuideSheetTriggerV2({
  criterionName,
  onClick,
  className,
}: {
  criterionName: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <ButtonV2
      type="button"
      variant="tertiary"
      size="compact"
      onClick={onClick}
      className={className}
      aria-label={`Xem điều kiện cho tiêu chí ${criterionName}`}
    >
      <PanelRightOpen aria-hidden="true" />
      Xem điều kiện
    </ButtonV2>
  );
}

const statusIcon = {
  complete: CheckCircle2,
  waiting: Clock3,
  supplement: AlertCircle,
  "not-started": Radio,
};

const statusIconClass: Record<StudentApplicationV2ProgressStatus, string> = {
  complete: "text-[var(--student-v2-progress-complete-icon)]",
  waiting: "text-[var(--student-v2-progress-waiting-icon)]",
  supplement: "text-[var(--student-v2-progress-supplement-icon)]",
  "not-started": "text-[var(--student-v2-progress-not-started-icon)]",
};

const inlineStateIcon = {
  info: Info,
  success: CheckCircle2,
  warning: Clock3,
  critical: AlertCircle,
};

const inlineStateClassName = {
  info: "bg-[var(--student-v2-surface-selected)] text-[var(--student-v2-institutional-blue)]",
  success:
    "bg-[var(--student-v2-progress-complete-bg)] text-[var(--student-v2-progress-complete-text)]",
  warning:
    "bg-[var(--student-v2-progress-waiting-bg)] text-[var(--student-v2-progress-waiting-text)]",
  critical: "bg-[var(--student-v2-critical-bg)] text-[var(--student-v2-critical-text)]",
};

export { FileText, Loader2 };
