import type {
  ApplicationSubmissionDeadline,
  CitySubmissionEligibility,
  CriterionCompletionItem,
  EvidenceResponse,
  PrecheckResult,
} from "@/lib/api/types";
import {
  coreCriterionKeys as coreStudentCriteria,
  getCoreCriterionLabel,
  getCoreCriterionKey,
} from "../../../lib/criteria-presentation.ts";

export type S5CriterionReview = {
  criterion: (typeof coreStudentCriteria)[number];
  label: string;
  href: string;
  evidenceCount: number | null;
  informationLabel: string;
};

export type S5AdvisoryRecommendation = {
  criterion: (typeof coreStudentCriteria)[number] | null;
  label: string;
  description: string;
  href: string | null;
};

export type S5GateReason =
  | "already_submitted"
  | "lifecycle_not_submittable"
  | "eligibility_loading"
  | "eligibility_error"
  | "eligibility_not_matched"
  | "eligibility_verification"
  | "eligibility_unknown"
  | "deadline_loading"
  | "deadline_error"
  | "deadline_not_configured"
  | "deadline_not_open"
  | "deadline_closed"
  | "deadline_unknown";

export type S5GateInput = {
  applicationStatus: string | null | undefined;
  submittedAt?: string | null;
  finalStatus?: string | null;
  eligibility: CitySubmissionEligibility | null | undefined;
  eligibilityLoading: boolean;
  eligibilityError: boolean;
  deadline: ApplicationSubmissionDeadline | null | undefined;
  deadlineLoading: boolean;
  deadlineError: boolean;
  /** Advisory findings describe content; they never participate in the submit gate. */
  advisoryCount?: number;
};

export type S5GateResult =
  { allowed: true; reason: null } | { allowed: false; reason: S5GateReason };

const ADVISORY_COPY: Record<string, string> = {
  FOUNDATION_LEVEL_NEEDS_REVIEW: "Một số thông tin sẽ được cán bộ đối chiếu trong quá trình xét.",
  MISSING_EVIDENCE: "Bạn có thể thêm minh chứng phù hợp nếu thấy cần.",
  LOW_CONFIDENCE_EVIDENCE:
    "Có thể kiểm tra thêm: thông tin trên minh chứng chưa được hệ thống nhận diện đầy đủ.",
  OCR_FAILED: "Bạn có thể kiểm tra tệp hoặc gửi hồ sơ để cán bộ đối chiếu.",
  EVIDENCE_BLURRY: "Bạn có thể tải tệp rõ hơn nếu thuận tiện.",
  NEEDS_OFFICER_CONFIRMATION: "Thông tin sẽ được cán bộ đối chiếu trong quá trình xét.",
};

const GENERIC_RECOMMENDATION = "Bạn có thể kiểm tra thêm thông tin ở phần này.";

export function buildS5CriterionReviews(
  completionItems: readonly Pick<
    CriterionCompletionItem,
    "criterion" | "status" | "evidenceCount"
  >[] = [],
  evidences?: readonly Pick<EvidenceResponse, "criterion">[],
): S5CriterionReview[] {
  return coreStudentCriteria.map((criterion) => {
    const completion = completionItems.find((item) => item.criterion === criterion);
    const evidenceCount =
      typeof completion?.evidenceCount === "number" && completion.evidenceCount >= 0
        ? completion.evidenceCount
        : evidences
          ? evidences.filter((item) => item.criterion === criterion).length
          : null;

    return {
      criterion,
      label: getCoreCriterionLabel(criterion),
      href: `/app/application?criterion=${criterion}`,
      evidenceCount,
      informationLabel: criterionInformationLabel(completion?.status, evidenceCount),
    };
  });
}

export function selectS5AdvisoryRecommendations(
  precheck?: Pick<PrecheckResult, "missingItems" | "warnings" | "criteriaResults"> | null,
): S5AdvisoryRecommendation[] {
  if (!precheck) return [];

  const copyByCriterion = new Map<string, Set<string>>();
  const add = (criterion: string | null | undefined, value: unknown) => {
    const coreCriterion = criterion ? getCoreCriterionKey(criterion) : null;
    if (criterion && !coreCriterion) return;
    const key = coreCriterion ?? "general";
    const copy = recommendationDescription(value);
    const descriptions = copyByCriterion.get(key) ?? new Set<string>();
    descriptions.add(copy);
    copyByCriterion.set(key, descriptions);
  };

  for (const item of precheck.missingItems ?? []) add(item.criterion, item);
  for (const result of precheck.criteriaResults ?? []) {
    for (const warning of result.warnings ?? []) add(result.criterion, warning);
  }
  for (const warning of precheck.warnings ?? []) add(null, warning);

  const recommendations: S5AdvisoryRecommendation[] = coreStudentCriteria.flatMap((criterion) => {
    const descriptions = copyByCriterion.get(criterion);
    if (!descriptions?.size) return [];
    return [
      {
        criterion,
        label: getCoreCriterionLabel(criterion),
        description: [...descriptions].slice(0, 2).join(" "),
        href: `/app/application?criterion=${criterion}`,
      },
    ];
  });

  const general = copyByCriterion.get("general");
  if (general?.size) {
    recommendations.push({
      criterion: null,
      label: "Gợi ý chung",
      description: [...general].slice(0, 2).join(" "),
      href: null,
    });
  }

  return recommendations;
}

export function getStudentCitySubmissionGate(input: S5GateInput): S5GateResult {
  if (input.submittedAt || (input.finalStatus && input.finalStatus !== "pending")) {
    return { allowed: false, reason: "already_submitted" };
  }
  if (
    !input.applicationStatus ||
    !["draft", "prechecked", "ready_to_submit"].includes(input.applicationStatus)
  ) {
    return { allowed: false, reason: "lifecycle_not_submittable" };
  }

  if (input.eligibilityLoading) return { allowed: false, reason: "eligibility_loading" };
  if (input.eligibilityError) return { allowed: false, reason: "eligibility_error" };
  if (!input.eligibility) return { allowed: false, reason: "eligibility_unknown" };
  if (input.eligibility.status === "NOT_ELIGIBLE") {
    return { allowed: false, reason: "eligibility_not_matched" };
  }
  if (input.eligibility.status === "NEEDS_VERIFICATION") {
    return { allowed: false, reason: "eligibility_verification" };
  }
  if (input.eligibility.status !== "ELIGIBLE") {
    return { allowed: false, reason: "eligibility_unknown" };
  }

  if (input.deadlineLoading) return { allowed: false, reason: "deadline_loading" };
  if (input.deadlineError) return { allowed: false, reason: "deadline_error" };
  const windowStatus = input.deadline?.submission?.status;
  if (!windowStatus) return { allowed: false, reason: "deadline_unknown" };
  if (windowStatus === "NOT_CONFIGURED") {
    return { allowed: false, reason: "deadline_not_configured" };
  }
  if (windowStatus === "NOT_OPEN") return { allowed: false, reason: "deadline_not_open" };
  if (windowStatus === "CLOSED") return { allowed: false, reason: "deadline_closed" };
  if (windowStatus !== "OPEN" && windowStatus !== "EXCEPTION_ACTIVE") {
    return { allowed: false, reason: "deadline_unknown" };
  }

  return { allowed: true, reason: null };
}

export function getS5GateMessage(reason: S5GateReason): { title: string; description: string } {
  const messages: Record<S5GateReason, { title: string; description: string }> = {
    already_submitted: {
      title: "Hồ sơ đã được gửi",
      description: "Bạn có thể theo dõi cập nhật trong hồ sơ của mình.",
    },
    lifecycle_not_submittable: {
      title: "Chưa thể gửi hồ sơ ở trạng thái hiện tại",
      description: "Mở hồ sơ để xem bước tiếp theo.",
    },
    eligibility_loading: {
      title: "Đang kiểm tra điều kiện nộp hồ sơ",
      description: "Nút gửi sẽ khả dụng khi hệ thống xác nhận xong điều kiện này.",
    },
    eligibility_error: {
      title: "Chưa tải được điều kiện nộp hồ sơ",
      description: "Thử tải lại trước khi gửi để hệ thống xác nhận thông tin mới nhất.",
    },
    eligibility_not_matched: {
      title: "Chưa tìm thấy thông tin công nhận phù hợp",
      description:
        "Nếu bạn đã được công nhận, thông tin có thể đang chờ đơn vị cập nhật hoặc xác nhận.",
    },
    eligibility_verification: {
      title: "Thông tin điều kiện đang được kiểm tra",
      description: "Hệ thống sẽ cập nhật khi việc đối chiếu hoàn tất.",
    },
    eligibility_unknown: {
      title: "Chưa xác định được điều kiện nộp hồ sơ",
      description: "Thử tải lại thông tin trước khi gửi hồ sơ.",
    },
    deadline_loading: {
      title: "Đang tải thời gian nhận hồ sơ",
      description: "Nút gửi sẽ khả dụng sau khi hệ thống xác nhận thời hạn.",
    },
    deadline_error: {
      title: "Chưa tải được thời gian nhận hồ sơ",
      description: "Thử tải lại thời hạn trước khi gửi.",
    },
    deadline_not_configured: {
      title: "Thời gian nhận hồ sơ chưa được công bố",
      description: "Vui lòng quay lại sau khi thời gian tiếp nhận được cập nhật.",
    },
    deadline_not_open: {
      title: "Thời gian nhận hồ sơ chưa bắt đầu",
      description: "Bạn có thể xem ngày mở nhận hồ sơ bên dưới.",
    },
    deadline_closed: {
      title: "Thời gian nhận hồ sơ hiện đã kết thúc",
      description: "Thông tin này không phải đánh giá chất lượng hồ sơ.",
    },
    deadline_unknown: {
      title: "Chưa xác định được thời gian nhận hồ sơ",
      description: "Thử tải lại thời hạn trước khi gửi.",
    },
  };
  return messages[reason];
}

export function getStudentSubmitErrorCopy(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  const messages: Record<string, string> = {
    CITY_SUBMISSION_NOT_ELIGIBLE: getS5GateMessage("eligibility_not_matched").description,
    CITY_SUBMISSION_NEEDS_VERIFICATION: getS5GateMessage("eligibility_verification").description,
    CITY_SUBMISSION_NOT_OPEN: getS5GateMessage("deadline_not_open").description,
    CITY_SUBMISSION_CLOSED: getS5GateMessage("deadline_closed").title,
    CITY_SUBMISSION_WINDOW_NOT_CONFIGURED: getS5GateMessage("deadline_not_configured").title,
    APPLICATION_CANCELLED: "Hồ sơ hiện không thể gửi. Vui lòng liên hệ đơn vị phụ trách.",
    APPLICATION_NOT_SUBMITTABLE: "Hồ sơ hiện không thể gửi ở trạng thái này.",
    SUBMIT_ALREADY_PROCESSED: "Hồ sơ đã được tiếp nhận. Hãy tải lại trạng thái mới nhất.",
    APPLICATION_LOCKED: "Hồ sơ đang được xử lý và tạm thời không thể gửi lại.",
    APPLICATION_NOT_READY: "Hệ thống chưa tiếp nhận hồ sơ. Vui lòng kiểm tra lại thông tin.",
  };
  return messages[code] ?? "Chưa thể gửi hồ sơ lúc này. Vui lòng thử lại sau.";
}

function criterionInformationLabel(status: string | undefined, evidenceCount: number | null) {
  if (status === "under_review") return "Đang được xem xét";
  if (status === "accepted") return "Đã được ghi nhận";
  if (status === "precheck_warning" || status === "needs_verification") {
    return "Có thể kiểm tra thêm";
  }
  if (status === "ready_for_precheck") return "Đã có thông tin";
  if (status === "in_progress") return "Đã có thông tin";
  if (status === "not_started") {
    return evidenceCount && evidenceCount > 0 ? "Đã có thông tin" : "Chưa thêm minh chứng";
  }
  if (status === "supplement_required") return "Cần xem yêu cầu bổ sung";
  if (status === "rejected") return "Có thể kiểm tra thêm";
  if (evidenceCount === null) return "Đang cập nhật thông tin";
  return evidenceCount > 0 ? "Đã có thông tin" : "Chưa thêm minh chứng";
}

function recommendationDescription(value: unknown) {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  const code = typeof record?.code === "string" ? record.code : "";
  if (ADVISORY_COPY[code]) return ADVISORY_COPY[code];

  const candidate =
    typeof value === "string"
      ? value
      : [record?.message, record?.description, record?.reason, record?.title].find(
          (item): item is string => typeof item === "string" && Boolean(item.trim()),
        );
  if (!candidate) return GENERIC_RECOMMENDATION;

  const description = candidate.trim();
  if (
    !description ||
    /\b(pass(?:ed)?|fail(?:ed)?|error|rejected)\b|đạt|không đạt|^[A-Z][A-Z0-9_:-]+$/.test(
      description,
    ) ||
    description.length > 220
  ) {
    return GENERIC_RECOMMENDATION;
  }
  return description;
}
