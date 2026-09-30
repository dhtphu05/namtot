import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Info,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { AppIcon } from "@/components/AppIcon";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import type { StudentCriterionDisplayState } from "@/features/application/presentation";
import type { StudentHomeAction } from "@/features/student/selectors/student-home";
import { coreStudentCriteria } from "@/features/student/selectors/student-ui";
import { getCoreCriterionPresentation } from "@/lib/criteria-presentation";
import type { Criterion, CriterionCompletionItem } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { ButtonV2, InlineStateMessage, SectionHeading } from "./primitives";

type StudentHomeStatus = {
  label: string;
  tone: "brand" | "success" | "warning" | "error" | "muted";
};

export function StudentHomeHero({
  action,
  status,
  isStarting,
  onStart,
  evidenceSummary,
}: {
  action: StudentHomeAction;
  status: StudentHomeStatus;
  isStarting: boolean;
  onStart: () => void;
  evidenceSummary?: string;
}) {
  const StatusIcon = iconForTone(status.tone);
  const actionLink = (
    <Link
      to={action.href}
      search={action.criterion ? ({ criterion: action.criterion } as never) : undefined}
      className="inline-flex min-h-11 items-center justify-center gap-2"
    >
      {action.label}
      <ArrowRight aria-hidden="true" />
    </Link>
  );

  return (
    <section
      className="min-w-0 rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] p-4 sm:p-5 lg:p-6"
      aria-labelledby="student-home-hero-title"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <StatusBadge tone={status.tone}>
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{status.label}</span>
          </span>
        </StatusBadge>
      </div>

      <div className="mt-3 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <h2
            id="student-home-hero-title"
            className="m-0 max-w-4xl text-[21px] font-bold leading-7 text-[var(--student-v2-text-primary)] sm:text-[23px] sm:leading-8"
          >
            {action.title}
          </h2>
          <p className="mt-1 line-clamp-1 max-w-3xl text-[13px] leading-5 text-[var(--student-v2-text-secondary)]">
            {action.description}
          </p>
        </div>
        {action.kind === "start" ? (
          <ButtonV2 type="button" onClick={onStart} disabled={isStarting}>
            {isStarting ? (
              <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : null}
            {action.label}
            {!isStarting ? <ArrowRight aria-hidden="true" /> : null}
          </ButtonV2>
        ) : (
          <ButtonV2 asChild>{actionLink}</ButtonV2>
        )}
      </div>

      {evidenceSummary ? (
        <p className="mt-4 flex min-w-0 items-center gap-2 text-[13px] font-medium leading-5 text-[var(--student-v2-text-secondary)]">
          <FileText
            className="h-4 w-4 shrink-0 text-[var(--student-v2-text-muted)]"
            aria-hidden="true"
          />
          <span>{evidenceSummary}</span>
        </p>
      ) : null}
    </section>
  );
}

export function StudentCriteriaOverview({
  applicationId,
  displayStates,
  completionItems,
  evidenceCounts,
  isLoading,
}: {
  applicationId?: string;
  displayStates: Partial<Record<Criterion, StudentCriterionDisplayState>>;
  completionItems: CriterionCompletionItem[];
  evidenceCounts: Partial<Record<Criterion, number>>;
  isLoading: boolean;
}) {
  return (
    <section aria-label="Tổng quan 5 tiêu chí" aria-busy={isLoading}>
      <SectionHeading title="5 tiêu chí" className="gap-1" />
      <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {coreStudentCriteria.map((criterion, index) => {
          const presentation = getCoreCriterionPresentation(criterion);
          const display = displayStates[criterion];
          const completion = completionItems.find((item) => item.criterion === criterion);
          const evidenceCount = evidenceCounts[criterion];
          const statusLabel = display?.label ?? (applicationId ? "Đang cập nhật" : "Chưa bắt đầu");
          const cardClassName = cn(
            "group min-h-[78px] min-w-0 rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] p-3 text-left transition-colors duration-[120ms] hover:border-[var(--student-v2-institutional-blue)] hover:bg-[var(--student-v2-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-v2-focus-ring)] focus-visible:ring-offset-2 motion-reduce:transition-none xl:col-span-2",
            index === 3 && "xl:col-start-2",
            index === 4 && "xl:col-start-4",
          );
          const content = (
            <>
              <div className="flex min-w-0 items-start gap-2.5">
                <AppIcon
                  name={presentation?.icon ?? "criteria"}
                  size={19}
                  tone="muted"
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="m-0 line-clamp-1 text-[15px] font-semibold leading-[22px] text-[var(--student-v2-text-primary)]">
                    {presentation?.label ?? "Tiêu chí"}
                  </h3>
                  <CriterionStatus display={display} label={statusLabel} />
                </div>
                {applicationId && !isLoading ? (
                  <span className="shrink-0 text-[12px] leading-[18px] text-[var(--student-v2-text-muted)]">
                    {typeof evidenceCount === "number" ? `${evidenceCount} minh chứng` : null}
                  </span>
                ) : null}
              </div>
              {isLoading ? (
                <Skeleton className="mt-2 h-3 w-2/3 motion-reduce:animate-none" />
              ) : null}
              {completion?.completion?.needsVerification ? (
                <span className="sr-only">
                  {completion.completion.needsVerification} thông tin cần xác minh
                </span>
              ) : null}
            </>
          );

          return applicationId ? (
            <Link
              key={criterion}
              to="/app/application"
              search={{ criterion } as never}
              className={cardClassName}
              aria-label={`Mở tiêu chí ${presentation?.label ?? ""} trong hồ sơ`}
            >
              {content}
            </Link>
          ) : (
            <div key={criterion} className={cardClassName}>
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CriterionStatus({
  display,
  label,
}: {
  display?: StudentCriterionDisplayState;
  label: string;
}) {
  const tone = mapCriterionTone(display?.tone);
  const Icon =
    display?.status === "accepted" || display?.status === "ready"
      ? CheckCircle2
      : display?.status === "supplement_required" || display?.status === "rejected"
        ? AlertCircle
        : display?.status === "under_review" || display?.status === "resolution"
          ? Clock3
          : Info;

  return (
    <div className="mt-1.5 min-w-0">
      <StatusBadge tone={tone} compact>
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{label}</span>
        </span>
      </StatusBadge>
    </div>
  );
}

export type StudentHomeAttentionItem = {
  id: string;
  title: string;
  description: string;
  tone: "info" | "warning" | "error";
};

export function StudentAttentionPanel({ items }: { items: StudentHomeAttentionItem[] }) {
  if (!items.length) return null;

  return (
    <section
      className="min-w-0 border-t border-[var(--student-v2-divider)] pt-4"
      aria-label="Cần chú ý"
    >
      <SectionHeading title="Cần chú ý" />
      <ul className="mt-2 grid min-w-0 gap-2 p-0 sm:grid-cols-2">
        {items.map((item) => {
          const Icon =
            item.tone === "error" ? AlertCircle : item.tone === "warning" ? CalendarClock : Info;
          const iconClass =
            item.tone === "error"
              ? "text-[var(--status-danger)]"
              : item.tone === "warning"
                ? "text-[var(--status-warning)]"
                : "text-[var(--status-info)]";

          return (
            <li key={item.id} className="flex min-w-0 items-start gap-2.5 py-2">
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)} aria-hidden="true" />
              <div className="min-w-0">
                <h3 className="m-0 text-[13px] font-semibold leading-5 text-[var(--student-v2-text-primary)]">
                  {item.title}
                </h3>
                <p className="mt-0.5 line-clamp-1 whitespace-pre-line text-[12px] leading-[18px] text-[var(--student-v2-text-secondary)]">
                  {item.description}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function StudentCriteriaError({ onRetry }: { onRetry: () => void }) {
  return (
    <InlineStateMessage
      tone="warning"
      title="Chưa tải được tình trạng các tiêu chí"
      description="Thử tải lại để cập nhật tiến độ và minh chứng mới nhất."
      action={
        <ButtonV2 type="button" variant="tertiary" size="compact" onClick={onRetry}>
          Tải lại
        </ButtonV2>
      }
      className="mt-3"
    />
  );
}

export function StudentHomeSkeleton({ firstName }: { firstName: string }) {
  return (
    <div className="mx-auto flex min-w-0 flex-col gap-5 py-5 sm:gap-6" aria-busy="true">
      <header className="min-w-0">
        <h1 className="m-0 text-[26px] font-bold leading-8 text-[var(--student-v2-text-primary)]">
          Chào {firstName}
        </h1>
        <Skeleton className="mt-2 h-4 w-72 max-w-full motion-reduce:animate-none" />
      </header>
      <section className="rounded-[var(--student-v2-radius-section)] border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] p-4 sm:p-5">
        <Skeleton className="h-6 w-2/3 max-w-full motion-reduce:animate-none" />
        <Skeleton className="mt-3 h-11 w-40 motion-reduce:animate-none" />
      </section>
      <section aria-label="Đang tải 5 tiêu chí">
        <Skeleton className="h-5 w-28 motion-reduce:animate-none" />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {coreStudentCriteria.map((criterion, index) => (
            <Skeleton
              key={criterion}
              className={cn(
                "h-20 motion-reduce:animate-none xl:col-span-2",
                index === 3 && "xl:col-start-2",
                index === 4 && "xl:col-start-4",
              )}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function mapCriterionTone(tone?: StudentCriterionDisplayState["tone"]): StudentHomeStatus["tone"] {
  if (tone === "good") return "success";
  if (tone === "warning") return "warning";
  if (tone === "danger") return "error";
  if (tone === "info") return "brand";
  return "muted";
}

function iconForTone(tone: StudentHomeStatus["tone"]) {
  if (tone === "success") return CheckCircle2;
  if (tone === "warning" || tone === "error") return AlertCircle;
  if (tone === "brand") return Clock3;
  return FileText;
}
