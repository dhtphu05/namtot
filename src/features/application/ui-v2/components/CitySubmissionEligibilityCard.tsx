import { AlertCircle, BadgeCheck, Clock3, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import type { CitySubmissionEligibility } from "@/lib/api/types";
import { ButtonV2 } from "./primitives";

export function CitySubmissionEligibilityCard({
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
  const presentation = getEligibilityPresentation(data);
  const Icon = isLoading ? Loader2 : isError ? AlertCircle : presentation.icon;

  return (
    <section
      className="rounded-lg border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] px-4 py-4 sm:px-5"
      aria-labelledby="city-submission-eligibility-title"
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
              id="city-submission-eligibility-title"
              className="text-sm font-semibold leading-5 text-[var(--student-v2-text-primary)]"
            >
              Điều kiện nộp hồ sơ cấp Thành phố
            </h2>
            <span className="rounded-full bg-[var(--student-v2-surface-secondary)] px-2 py-0.5 text-xs font-medium text-[var(--student-v2-text-primary)]">
              {isLoading ? "Đang cập nhật" : isError ? "Chưa tải được" : presentation.label}
            </span>
          </div>
          <p
            className="mt-1 text-sm leading-5 text-[var(--student-v2-text-secondary)]"
            role="status"
            aria-atomic="true"
          >
            {isLoading
              ? "Đang kiểm tra điều kiện nộp hồ sơ của bạn."
              : isError
                ? "Chưa tải được trạng thái. Hãy thử lại trước khi nộp hồ sơ."
                : presentation.message}
          </p>
          {!isLoading && !isError && data?.reasons.length ? (
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-5 text-[var(--student-v2-text-secondary)]">
              {data.reasons.map((reason) => {
                const copy = reasonCopy[reason];
                return copy ? <li key={reason}>{copy}</li> : null;
              })}
            </ul>
          ) : null}
          {!isLoading && !isError && data?.status !== "ELIGIBLE" ? (
            <p className="mt-2 text-xs leading-5 text-[var(--student-v2-text-muted)]">
              Bạn vẫn có thể hoàn thiện hồ sơ, tải minh chứng và kiểm tra các tiêu chí. Trạng thái
              này chỉ liên quan đến lần nộp đầu tiên.
            </p>
          ) : null}
          {!isLoading && !isError && data?.status === "ELIGIBLE" ? (
            <p className="mt-2 text-xs leading-5 text-[var(--student-v2-text-muted)]">
              Đây là điều kiện nộp hồ sơ, chưa phải kết quả xét danh hiệu.
            </p>
          ) : null}
          {isError ? (
            <ButtonV2
              type="button"
              variant="secondary"
              size="compact"
              className="mt-3 min-h-11"
              onClick={onRetry}
              aria-label="Tải lại điều kiện nộp hồ sơ cấp Thành phố"
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

const reasonCopy: Record<string, string> = {
  MISSING_UNIVERSITY_SYSTEM_AWARD:
    "Chưa tìm thấy danh hiệu Sinh viên 5 tốt cấp Đại học Đà Nẵng đã được xác nhận cho năm học này.",
  MISSING_IDENTITY_CONTEXT:
    "Thông tin định danh sinh viên chưa đầy đủ để đối chiếu. Vui lòng kiểm tra thông tin hồ sơ với trường.",
  IDENTITY_MATCH_REQUIRES_VERIFICATION:
    "Thông tin danh hiệu cần cán bộ Thành phố xác minh với trường trước khi nộp.",
  AMBIGUOUS_UNIVERSITY_SYSTEM_AWARD_MATCH:
    "Có nhiều thông tin cần được cán bộ Thành phố đối chiếu với trường.",
  MANUAL_VERIFICATION_REJECTED:
    "Cán bộ Thành phố chưa xác nhận điều kiện này. Vui lòng liên hệ trường nếu cần hỗ trợ.",
};

function getEligibilityPresentation(data?: CitySubmissionEligibility) {
  if (data?.route === "DIRECT_CITY") {
    return {
      icon: BadgeCheck,
      label: "Xét trực tiếp",
      message:
        "Hồ sơ của bạn thuộc diện xét trực tiếp cấp Thành phố; không yêu cầu danh hiệu cấp Đại học Đà Nẵng.",
    };
  }

  if (data?.status === "ELIGIBLE") {
    return {
      icon: BadgeCheck,
      label: "Đủ điều kiện nộp",
      message:
        "Bạn đủ điều kiện nộp hồ sơ cấp Thành phố theo thông tin danh hiệu đã được xác nhận.",
    };
  }

  if (data?.status === "NEEDS_VERIFICATION") {
    return {
      icon: Clock3,
      label: "Chờ xác minh",
      message: "Thông tin điều kiện cần được cán bộ Thành phố xác minh trước khi bạn nộp hồ sơ.",
    };
  }

  return {
    icon: ShieldAlert,
    label: "Chưa đủ điều kiện",
    message: "Hiện hồ sơ chưa đủ điều kiện để nộp lần đầu cấp Thành phố.",
  };
}
