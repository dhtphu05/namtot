import { unknownSourceLabel } from "./presentation-copy";

const sourceLabels: Record<string, string> = {
  system_data: "Dữ liệu nhà trường",
  official_event: "Dữ liệu đã xác nhận",
  manual_evidence: "Sinh viên tải lên",
  manual_metric: "Sinh viên khai báo",
  event_import: "Danh sách đã xác nhận",
  manual_upload: "Tải lên từ sinh viên",
  metric_input: "Chỉ số đã nhập",
  collective_import: "Dữ liệu tập thể",
  legacy_event: "Dữ liệu đã xác nhận",
  system_confirmation: "Nhà trường xác nhận",
};

export function getSourcePresentation(source?: string | null) {
  return source ? (sourceLabels[source] ?? unknownSourceLabel) : unknownSourceLabel;
}

export function formatSourceList(sources?: readonly (string | null | undefined)[] | null) {
  const labels = [...new Set((sources ?? []).map((source) => getSourcePresentation(source)))];
  if (!labels.length) return unknownSourceLabel;
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} hoặc ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} hoặc ${labels[labels.length - 1]}`;
}

export function getResponseSourcePresentation(input?: {
  responseKind?: string | null;
  source?: string | null;
  payloadJson?: unknown;
}) {
  const payload =
    input?.payloadJson && typeof input.payloadJson === "object" && !Array.isArray(input.payloadJson)
      ? (input.payloadJson as Record<string, unknown>)
      : {};
  const payloadSource = typeof payload.sourceType === "string" ? payload.sourceType : null;
  return getSourcePresentation(payloadSource ?? input?.responseKind ?? input?.source);
}
