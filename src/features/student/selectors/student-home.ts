import type {
  ApplicationReviewTaskSummary,
  ApplicationSubmissionDeadline,
  ApplicationStatus,
  CitySubmissionEligibility,
  Criterion,
  SubmissionWindowStatus,
} from "@/lib/api/types";
import { getCoreCriterionKey, getCoreCriterionLabel } from "../../../lib/criteria-presentation.ts";

export type StudentHomeApplication = {
  status: ApplicationStatus | string;
  finalStatus?: string | null;
  finalNote?: string | null;
  submittedAt?: string | null;
  reviewTasks?: ApplicationReviewTaskSummary[];
};

export type StudentHomeCandidate = {
  title: string;
  description?: string;
  actionLabel?: string;
  route?: string;
  criterionKey?: Criterion;
  actionType?: string;
  isInteractive?: boolean;
  priority?: number;
};

export type StudentHomeAction = {
  kind:
    | "start"
    | "result"
    | "supplement"
    | "track"
    | "eligibility"
    | "deadline"
    | "check-submit"
    | "ready"
    | "criterion"
    | "continue"
    | "unknown";
  title: string;
  description: string;
  label: string;
  href: "/app/application" | "/app/ai-precheck" | "/app/result";
  criterion?: Extract<Criterion, "ethics" | "academic" | "physical" | "volunteer" | "integration">;
};

type StudentHomeActionInput = {
  application?: StudentHomeApplication | null;
  eligibility?: Pick<CitySubmissionEligibility, "status"> | null;
  eligibilityResolved?: boolean;
  deadline?: Pick<ApplicationSubmissionDeadline, "submission"> | null;
  deadlineResolved?: boolean;
  cityGateRequired?: boolean;
  candidates?: StudentHomeCandidate[];
};

export function selectStudentHomeAction({
  application,
  eligibility,
  eligibilityResolved = false,
  deadline,
  deadlineResolved = false,
  cityGateRequired = true,
  candidates = [],
}: StudentHomeActionInput): StudentHomeAction {
  if (!application) {
    return action(
      "start",
      "Bắt đầu hồ sơ",
      "Tạo hồ sơ Sinh viên 5 tốt cấp Thành phố để bắt đầu.",
      "Bắt đầu hồ sơ",
    );
  }

  if (application.finalStatus && application.finalStatus !== "pending") {
    return action(
      "result",
      "Hồ sơ đã có kết quả cuối",
      application.finalNote || "Xem kết quả chính thức của hồ sơ.",
      "Xem kết quả",
      "/app/result",
    );
  }

  if (application.status === "supplement_required") {
    const requestTask = application.reviewTasks?.find(
      (task) => task.status === "supplement_required" || task.decision === "supplement_required",
    );
    const criterion = asCoreCriterion(requestTask?.criterion);
    const reason = requestTask?.supplementRequestJson?.reason?.trim();
    return action(
      "supplement",
      criterion ? `Cần bổ sung hồ sơ · ${getCoreCriterionLabel(criterion)}` : "Cần bổ sung hồ sơ",
      reason || "Cán bộ đã gửi yêu cầu bổ sung. Mở hồ sơ để xem nội dung cần cập nhật.",
      "Bổ sung hồ sơ",
      "/app/application",
      criterion,
    );
  }

  if (isTrackingStatus(application.status)) {
    const trackingCopy: Record<TrackingStatus, { title: string; description: string }> = {
      submitted: {
        title: "Hồ sơ của bạn đã được gửi",
        description: "Theo dõi cập nhật và trạng thái xử lý của hồ sơ.",
      },
      under_review: {
        title: "Hồ sơ đang được xét",
        description: "Hồ sơ đã được gửi và đang được cán bộ xử lý.",
      },
      resolution_needed: {
        title: "Hồ sơ đang được xem xét thêm",
        description: "Theo dõi cập nhật tiếp theo trong hồ sơ của bạn.",
      },
    };
    const copy = trackingCopy[application.status];
    return action("track", copy.title, copy.description, "Theo dõi hồ sơ");
  }

  if (application.status === "ready_to_submit") {
    if (
      cityGateRequired &&
      eligibilityResolved &&
      eligibility &&
      eligibility.status !== "ELIGIBLE"
    ) {
      const needsVerification = eligibility.status === "NEEDS_VERIFICATION";
      return action(
        "eligibility",
        needsVerification ? "Điều kiện nộp hồ sơ đang được đối chiếu" : "Chưa đủ điều kiện nộp hồ sơ",
        needsVerification
          ? "Bạn vẫn có thể tiếp tục hoàn thiện hồ sơ trong lúc thông tin được đối chiếu."
          : "Bạn vẫn có thể xem và tiếp tục hoàn thiện hồ sơ.",
        "Xem điều kiện nộp hồ sơ",
        "/app/ai-precheck",
      );
    }

    const windowStatus = cityGateRequired ? deadline?.submission.status : undefined;
    if (
      cityGateRequired &&
      deadlineResolved &&
      windowStatus &&
      !isSubmissionWindowOpen(windowStatus)
    ) {
      const deadlineCopy: Partial<
        Record<SubmissionWindowStatus, { title: string; description: string }>
      > = {
        NOT_CONFIGURED: {
          title: "Chưa có thời hạn gửi hồ sơ",
          description: "Thời hạn tiếp nhận hồ sơ cho năm học này chưa được cấu hình.",
        },
        NOT_OPEN: {
          title: "Chưa đến hạn gửi hồ sơ",
          description: "Bạn có thể tiếp tục kiểm tra hồ sơ và theo dõi thời gian tiếp nhận.",
        },
        CLOSED: {
          title: "Đã hết thời hạn gửi hồ sơ",
          description: "Xem thông tin thời hạn và trạng thái hồ sơ hiện tại.",
        },
      };
      const copy = deadlineCopy[windowStatus] ?? {
        title: "Chưa xác định thời hạn gửi hồ sơ",
        description: "Mở hồ sơ để kiểm tra thông tin thời hạn mới nhất.",
      };
      return action("deadline", copy.title, copy.description, "Xem hồ sơ", "/app/ai-precheck");
    }

    if (
      cityGateRequired &&
      (!eligibilityResolved || !deadlineResolved || !eligibility || !deadline)
    ) {
      return action(
        "check-submit",
        "Kiểm tra điều kiện nộp hồ sơ",
        "Mở hồ sơ để kiểm tra điều kiện và thời hạn trước khi gửi.",
        "Kiểm tra hồ sơ",
        "/app/ai-precheck",
      );
    }

    return action(
      "ready",
      "Hồ sơ đã sẵn sàng",
      "Kiểm tra lại hồ sơ trước khi gửi đến Hội Sinh viên Thành phố.",
      "Kiểm tra và gửi hồ sơ",
      "/app/ai-precheck",
    );
  }

  const candidate = [...candidates]
    .filter((item) => item.title.trim() && item.actionType !== "submit")
    .sort((left, right) => (left.priority ?? 99) - (right.priority ?? 99))[0];
  if (candidate) {
    const criterion = asCoreCriterion(candidate.criterionKey);
    const description = candidate.description?.trim() || candidate.title;
    return action(
      "criterion",
      candidate.title,
      description,
      candidate.actionLabel?.trim() || "Xem hồ sơ",
      "/app/application",
      criterion,
    );
  }

  if (application.status === "draft" || application.status === "prechecked") {
    return action(
      "continue",
      "Tiếp tục hoàn thiện hồ sơ",
      "Tiếp tục cập nhật thông tin và minh chứng cho hồ sơ.",
      "Tiếp tục hồ sơ",
    );
  }

  return action("unknown", "Mở hồ sơ", "Xem trạng thái mới nhất của hồ sơ.", "Mở hồ sơ");
}

export function getStudentHomeSupplementTasks(application?: StudentHomeApplication | null) {
  if (application?.status !== "supplement_required") return [];
  return (application.reviewTasks ?? []).filter(
    (task) => task.status === "supplement_required" || task.decision === "supplement_required",
  );
}

function isSubmissionWindowOpen(status: string) {
  return status === "OPEN" || status === "EXCEPTION_ACTIVE";
}

type TrackingStatus = "submitted" | "under_review" | "resolution_needed";

function isTrackingStatus(status: string): status is TrackingStatus {
  return status === "submitted" || status === "under_review" || status === "resolution_needed";
}

function action(
  kind: StudentHomeAction["kind"],
  title: string,
  description: string,
  label: string,
  href: StudentHomeAction["href"] = "/app/application",
  criterion?: StudentHomeAction["criterion"],
): StudentHomeAction {
  return { kind, title, description, label, href, criterion };
}

function asCoreCriterion(criterion?: Criterion | null): StudentHomeAction["criterion"] {
  return criterion ? (getCoreCriterionKey(criterion) ?? undefined) : undefined;
}
