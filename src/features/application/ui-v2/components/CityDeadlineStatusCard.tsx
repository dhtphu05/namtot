import { AlertCircle, Clock3, Loader2, RefreshCw } from "lucide-react";
import type { ApplicationSubmissionDeadline } from "@/lib/api/types";
import { formatVietnamDateTime } from "@/lib/datetime-vietnam";
import { ButtonV2 } from "./primitives";

export function CityDeadlineStatusCard({
  data,
  isLoading,
  isError,
  isSupplement,
  onRetry,
}: {
  data?: ApplicationSubmissionDeadline;
  isLoading: boolean;
  isError: boolean;
  isSupplement: boolean;
  onRetry: () => void;
}) {
  const title = isSupplement ? "Thời hạn bổ sung hồ sơ" : "Thời hạn nộp hồ sơ cấp Thành phố";
  const titleId = isSupplement
    ? "city-supplement-deadline-title"
    : "city-submission-deadline-title";
  const info = isSupplement ? getSupplementInfo(data) : getSubmissionInfo(data);
  const Icon = isLoading ? Loader2 : isError ? AlertCircle : Clock3;

  return (
    <section
      className="rounded-lg border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-4 py-4 sm:px-5"
      aria-labelledby={titleId}
      aria-busy={isLoading}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--student-v2-surface-secondary)] text-[var(--student-v2-text-primary)]"
          aria-hidden="true"
        >
          <Icon className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2
              id={titleId}
              className="text-sm font-semibold leading-5 text-[var(--student-v2-text-primary)]"
            >
              {title}
            </h2>
            <span className="rounded-full bg-[var(--student-v2-surface-secondary)] px-2 py-0.5 text-xs font-medium text-[var(--student-v2-text-primary)]">
              {isLoading ? "Đang cập nhật" : isError ? "Chưa tải được" : info.label}
            </span>
          </div>
          <p
            className="mt-1 text-sm leading-5 text-[var(--student-v2-text-secondary)]"
            role="status"
          >
            {isLoading
              ? "Đang tải thời hạn của năm học này."
              : isError
                ? "Chưa tải được thời hạn. Hãy thử lại trước khi gửi hồ sơ."
                : info.message}
          </p>
          {!isLoading && !isError && info.deadlineAt ? (
            <p className="mt-2 text-xs leading-5 text-[var(--student-v2-text-muted)]">
              {info.deadlineLabel}: {formatVietnamDateTime(info.deadlineAt)}
            </p>
          ) : null}
          {isError ? (
            <ButtonV2
              type="button"
              variant="secondary"
              size="compact"
              className="mt-3 min-h-11"
              onClick={onRetry}
              aria-label="Tải lại thời hạn hồ sơ cấp Thành phố"
            >
              <RefreshCw aria-hidden="true" />
              Thử tải lại
            </ButtonV2>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function getSubmissionInfo(data?: ApplicationSubmissionDeadline) {
  const submission = data?.submission;
  if (!submission || submission.status === "NOT_CONFIGURED") {
    return {
      label: "Chưa cấu hình",
      message: "Chưa cấu hình thời hạn nộp hồ sơ cấp Thành phố cho năm học này.",
      deadlineAt: null,
      deadlineLabel: "Hạn nộp",
    };
  }
  if (submission.status === "NOT_OPEN") {
    return {
      label: "Chưa mở",
      message: "Chưa đến thời gian tiếp nhận hồ sơ cấp Thành phố.",
      deadlineAt: submission.opensAt,
      deadlineLabel: "Mở nhận hồ sơ",
    };
  }
  if (submission.status === "CLOSED") {
    return {
      label: "Đã đóng",
      message: "Đã hết thời hạn nộp hồ sơ cấp Thành phố.",
      deadlineAt: submission.effectiveClosesAt ?? submission.closesAt,
      deadlineLabel: "Thời hạn kết thúc",
    };
  }
  if (submission.status === "EXCEPTION_ACTIVE") {
    return {
      label: "Có ngoại lệ",
      message: "Ngoại lệ nộp hồ sơ đang có hiệu lực.",
      deadlineAt: submission.effectiveClosesAt ?? submission.exceptionValidUntil,
      deadlineLabel: "Ngoại lệ có hiệu lực đến",
    };
  }
  return {
    label: "Đang mở",
    message: "Đang trong thời hạn tiếp nhận hồ sơ cấp Thành phố.",
    deadlineAt: submission.effectiveClosesAt ?? submission.closesAt,
    deadlineLabel: "Hạn nộp",
  };
}

function getSupplementInfo(data?: ApplicationSubmissionDeadline) {
  const supplement = data?.supplement;
  if (!supplement || supplement.status === "NOT_CONFIGURED") {
    return {
      label: "Chưa cấu hình",
      message: "Chưa cấu hình hạn bổ sung cho hồ sơ này.",
      deadlineAt: supplement?.deadlineAt,
      deadlineLabel: "Hạn bổ sung",
    };
  }
  if (supplement.status === "OVERDUE") {
    return {
      label: "Quá hạn",
      message: "Đã quá hạn bổ sung theo thời hạn của hồ sơ.",
      deadlineAt: supplement.deadlineAt,
      deadlineLabel: "Hạn bổ sung",
    };
  }
  return {
    label: "Còn hạn",
    message: "Hồ sơ đang trong thời hạn bổ sung riêng.",
    deadlineAt: supplement.deadlineAt,
    deadlineLabel: "Hạn bổ sung",
  };
}
