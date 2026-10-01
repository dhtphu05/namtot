import type { EvidenceResponse, RequirementItem } from "@/lib/api/types";
import { getRequirementPresentation } from "./requirement-presentation";
import { getResponseSourcePresentation, getSourcePresentation } from "./source-presentation";
import { unknownEvidenceLabel } from "./presentation-copy";
import type {
  EvidenceDisplayInput,
  EvidenceDisplayModel,
  PresentationTone,
} from "./presentation-types";

export function getEvidenceDisplayModel(
  evidenceInput?: Partial<EvidenceResponse> | EvidenceDisplayInput | null,
  responseInput?: EvidenceDisplayInput["response"],
  requirementInput?: RequirementItem | null,
): EvidenceDisplayModel {
  const wrapped = isEvidenceDisplayInput(evidenceInput) ? evidenceInput : null;
  const evidence = (wrapped?.evidence ?? evidenceInput) as
    Partial<EvidenceResponse> | null | undefined;
  const response = wrapped?.response ?? responseInput;
  const requirement = wrapped?.requirement ?? requirementInput;
  const file = getPrimaryFile(evidence);
  const title = getString(evidence?.evidenceName) || getRequirementPresentation(requirement).label;
  const status = getEvidenceStatus(evidence?.status, evidence?.indexingStatus);
  const source =
    getSourcePresentation(getString(evidence?.sourceType)) ||
    getResponseSourcePresentation(response);
  const hasRequirement = Boolean(response?.requirementKey ?? requirement?.key);

  return {
    title: title || unknownEvidenceLabel,
    typeLabel: hasRequirement ? getRequirementPresentation(requirement).label : "Chưa phân loại",
    sourceLabel: source,
    statusLabel: status.label,
    tone: status.tone,
    warning: status.warning,
    primaryAction: status.primaryAction,
    secondaryActions: [
      {
        type: "fix_missing_field",
        label: "Xem",
        description: "Mở chi tiết minh chứng.",
        isInteractive: true,
      },
    ],
    originalFilename: file,
  };
}

function isEvidenceDisplayInput(value: unknown): value is EvidenceDisplayInput {
  return Boolean(
    value && typeof value === "object" && ("evidence" in value || "response" in value),
  );
}

function getEvidenceStatus(
  status?: unknown,
  indexingStatus?: unknown,
): {
  label: string;
  tone: PresentationTone;
  warning?: string;
  primaryAction?: EvidenceDisplayModel["primaryAction"];
} {
  const raw = getString(status) || getString(indexingStatus);
  if (["accepted", "indexed"].includes(raw)) return { label: "Đã ghi nhận", tone: "good" };
  if (
    [
      "under_review",
      "pending_indexing",
      "uploaded",
      "ocr_processing",
      "extracting",
      "checking_registry",
    ].includes(raw)
  ) {
    return { label: "Đang xử lý", tone: "info" };
  }
  if (raw === "needs_manual_review") return { label: "Đã tiếp nhận", tone: "info" };
  if (raw === "needs_supplement") {
    return {
      label: "Cần bổ sung",
      tone: "warning",
      warning: "Minh chứng cần được bổ sung theo yêu cầu.",
    };
  }
  if (raw === "resolution_needed") {
    return { label: "Đang được xem xét thêm", tone: "info" };
  }
  if (["rejected", "failed"].includes(raw)) {
    return {
      label: "Chưa phù hợp",
      tone: "danger",
      warning: "Vui lòng kiểm tra lại tệp hoặc thông tin minh chứng.",
    };
  }
  if (raw === "draft") return { label: "Đã lưu", tone: "neutral" };
  return { label: unknownEvidenceLabel, tone: "neutral" };
}

function getPrimaryFile(evidence?: Partial<EvidenceResponse> | null) {
  const files = Array.isArray(evidence?.files) ? evidence.files : [];
  const first = files[0] as { originalName?: string; fileName?: string } | undefined;
  return (
    getString(first?.originalName) || getString(first?.fileName) || getString(evidence?.fileName)
  );
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}
