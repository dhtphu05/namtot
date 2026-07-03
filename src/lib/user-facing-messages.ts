import type { PrecheckMissingItem } from "@/lib/api/types";

export type UserMessageSeverity = "info" | "warning" | "error" | "success";

export type UserFacingMessage = {
  code?: string;
  title: string;
  description: string;
  severity: UserMessageSeverity;
  actionLabel?: string;
};

const PRECHECK_MESSAGES: Record<string, UserFacingMessage> = {
  FOUNDATION_LEVEL_NEEDS_REVIEW: {
    code: "FOUNDATION_LEVEL_NEEDS_REVIEW",
    title: "Cần cán bộ xác nhận",
    description: "Hồ sơ đã có dữ liệu cơ bản, nhưng cần cán bộ kiểm tra trước khi kết luận mức đạt.",
    severity: "info",
    actionLabel: "Xem tiêu chí liên quan",
  },
  MISSING_EVIDENCE: {
    code: "MISSING_EVIDENCE",
    title: "Chưa có minh chứng",
    description: "Tiêu chí này chưa có minh chứng phù hợp. Hãy bổ sung file hoặc dữ liệu liên quan.",
    severity: "warning",
    actionLabel: "Bổ sung minh chứng",
  },
  LOW_CONFIDENCE_EVIDENCE: {
    code: "LOW_CONFIDENCE_EVIDENCE",
    title: "Minh chứng cần kiểm tra thêm",
    description: "Hệ thống chưa đủ tự tin với minh chứng này. Cán bộ sẽ đối chiếu khi xét duyệt.",
    severity: "info",
    actionLabel: "Xem minh chứng",
  },
  OCR_FAILED: {
    code: "OCR_FAILED",
    title: "Hệ thống chưa đọc được file",
    description: "Bạn có thể tải lại file rõ hơn hoặc gửi hồ sơ để cán bộ kiểm tra thủ công.",
    severity: "warning",
    actionLabel: "Tải lại file",
  },
  EVIDENCE_BLURRY: {
    code: "EVIDENCE_BLURRY",
    title: "File có thể bị mờ",
    description: "Minh chứng có thể khó đọc. Nên tải lên file rõ hơn trước khi nộp hồ sơ.",
    severity: "warning",
    actionLabel: "Tải lại file",
  },
  NEEDS_OFFICER_CONFIRMATION: {
    code: "NEEDS_OFFICER_CONFIRMATION",
    title: "Chờ cán bộ xác nhận",
    description: "Dữ liệu đã được ghi nhận và sẽ được cán bộ đối chiếu khi xét duyệt.",
    severity: "info",
  },
};

const STATUS_MESSAGES: Record<string, UserFacingMessage> = {
  needs_officer_confirmation: PRECHECK_MESSAGES.NEEDS_OFFICER_CONFIRMATION,
  risky: {
    title: "Cần kiểm tra thêm",
    description: "Dữ liệu có điểm cần đối chiếu thêm trước khi kết luận.",
    severity: "warning",
  },
  needs_supplement: {
    title: "Cần bổ sung",
    description: "Tiêu chí này cần thêm minh chứng hoặc thông tin để xét duyệt.",
    severity: "warning",
    actionLabel: "Bổ sung minh chứng",
  },
  failed: {
    title: "Cần bổ sung",
    description: "Tiêu chí này chưa đạt yêu cầu theo kết quả kiểm tra hiện tại.",
    severity: "warning",
    actionLabel: "Bổ sung minh chứng",
  },
  ai_failed: PRECHECK_MESSAGES.OCR_FAILED,
};

export function getUserFacingMessage(input?: unknown, fallback?: Partial<UserFacingMessage>): UserFacingMessage {
  const raw = extractMessageInput(input);
  const code = raw.code ?? normalizeCode(raw.text);
  const mapped = code ? PRECHECK_MESSAGES[code] ?? STATUS_MESSAGES[code] : undefined;

  if (mapped) {
    return { ...mapped, ...fallback, code: mapped.code ?? code };
  }

  const embeddedMessages = getEmbeddedTechnicalMessages(raw.text);
  if (embeddedMessages.length) {
    return {
      code: embeddedMessages.map((message) => message.code).filter(Boolean).join(","),
      title: fallback?.title ?? embeddedMessages[0].title,
      description: joinUniqueDescriptions(embeddedMessages),
      severity: fallback?.severity ?? highestSeverity(embeddedMessages),
      actionLabel: fallback?.actionLabel ?? embeddedMessages.find((message) => message.actionLabel)?.actionLabel,
    };
  }

  if (raw.text && !isTechnicalCode(raw.text)) {
    return {
      code,
      title: fallback?.title ?? titleFromSeverity(fallback?.severity ?? raw.severity),
      description: raw.text,
      severity: fallback?.severity ?? raw.severity ?? "info",
      actionLabel: fallback?.actionLabel,
    };
  }

  return {
    code,
    title: fallback?.title ?? titleFromSeverity(fallback?.severity ?? raw.severity),
    description: fallback?.description ?? "Mục này cần được kiểm tra thêm trước khi kết luận.",
    severity: fallback?.severity ?? raw.severity ?? "info",
    actionLabel: fallback?.actionLabel,
  };
}

export function getPrecheckMissingMessage(item: PrecheckMissingItem): UserFacingMessage {
  return getUserFacingMessage(item, {
    title: "Cần xử lý",
    description: "Tiêu chí này còn thiếu thông tin cần bổ sung.",
    severity: item.severity === "error" ? "warning" : "info",
    actionLabel: "Bổ sung minh chứng",
  });
}

export function getUserFacingText(input?: unknown, fallback = "Cần kiểm tra thêm thông tin."): string {
  return getUserFacingMessage(input, { description: fallback }).description;
}

function extractMessageInput(input?: unknown): { code?: string; text?: string; severity?: UserMessageSeverity } {
  if (!input) return {};
  if (typeof input === "string") return { code: normalizeCode(input), text: input };
  if (typeof input !== "object") return { text: String(input) };

  const record = input as Record<string, unknown>;
  const code = normalizeCode(record.code ?? record.status ?? record.reasonCode);
  const text = firstString(record.message, record.description, record.reason, record.explanation, record.title, code);
  return {
    code,
    text,
    severity: normalizeSeverity(record.severity),
  };
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function normalizeCode(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (PRECHECK_MESSAGES[trimmed] || STATUS_MESSAGES[trimmed] || isTechnicalCode(trimmed)) return trimmed;
  return undefined;
}

function isTechnicalCode(value: string) {
  return /^[A-Z0-9_]{6,}$/.test(value.trim());
}

function getEmbeddedTechnicalMessages(text?: string) {
  if (!text) return [];
  const codes = text.match(/[A-Z][A-Z0-9_]{5,}/g) ?? [];
  const uniqueCodes = Array.from(new Set(codes));
  return uniqueCodes
    .map((item) => PRECHECK_MESSAGES[item] ?? STATUS_MESSAGES[item])
    .filter((item): item is UserFacingMessage => Boolean(item));
}

function joinUniqueDescriptions(messages: UserFacingMessage[]) {
  const descriptions = Array.from(new Set(messages.map((message) => message.description)));
  return descriptions.join(" ");
}

function highestSeverity(messages: UserFacingMessage[]): UserMessageSeverity {
  if (messages.some((message) => message.severity === "error")) return "error";
  if (messages.some((message) => message.severity === "warning")) return "warning";
  if (messages.some((message) => message.severity === "success")) return "success";
  return "info";
}

function normalizeSeverity(value: unknown): UserMessageSeverity | undefined {
  if (value === "error") return "error";
  if (value === "warning") return "warning";
  if (value === "success") return "success";
  if (value === "info") return "info";
  return undefined;
}

function titleFromSeverity(severity: UserMessageSeverity = "info") {
  if (severity === "error") return "Cần xử lý";
  if (severity === "warning") return "Cần chú ý";
  if (severity === "success") return "Đã sẵn sàng";
  return "Cần kiểm tra thêm";
}
