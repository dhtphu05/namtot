import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  DecisionImport,
  DecisionImportConfirmInput,
  DecisionImportMetadata,
  DecisionImportPreview,
} from "@/types/decision-import";
import {
  compactFacts,
  formatConvertedValue,
  formatCriterion,
  formatDecisionDate,
  formatEventDateRange,
  formatLevel,
  getDecisionDisplayTitle,
  isPresentDisplayValue,
} from "./decision-import-utils";

type ConfirmDecisionImportModalProps = {
  open: boolean;
  item?: DecisionImport | null;
  metadata?: DecisionImportMetadata | null;
  preview?: DecisionImportPreview | null;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: DecisionImportConfirmInput) => void;
};

export function ConfirmDecisionImportModal({
  open,
  item,
  metadata,
  preview,
  isSubmitting,
  onOpenChange,
  onConfirm,
}: ConfirmDecisionImportModalProps) {
  const [includeRows, setIncludeRows] = useState<"valid_only" | "valid_and_warnings">("valid_only");
  const [confirmWarnings, setConfirmWarnings] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setIncludeRows("valid_only");
      setConfirmWarnings(false);
      setNote("");
    }
  }, [open]);

  const warningRows = preview?.summary.warningRows ?? 0;
  const validRows = preview?.summary.validRows ?? 0;
  const includesWarnings = includeRows === "valid_and_warnings";
  const canConfirm = useMemo(() => {
    if (item?.status !== "preview_ready") return false;
    if (!validRows) return false;
    if (includesWarnings && warningRows > 0 && (!confirmWarnings || !note.trim())) return false;
    return true;
  }, [confirmWarnings, includesWarnings, item?.status, note, validRows, warningRows]);
  const decisionFacts = compactFacts([
    { label: "Sự kiện", value: getDecisionDisplayTitle(item) },
    { label: "Tiêu chí", value: formatCriterion(item?.criterion) },
    { label: "Đơn vị tổ chức", value: item?.organizer },
    { label: "Cấp tổ chức", value: formatLevel(item?.organizerLevel) },
    { label: "Thời gian", value: formatEventDateRange(item?.startDate, item?.endDate) },
    {
      label: "Giá trị quy đổi",
      value: formatConvertedValue(item?.convertedValue, item?.convertedUnit),
    },
    { label: "Số văn bản", value: metadata?.documentNo ?? metadata?.decisionNumber },
    { label: "Đơn vị ban hành", value: metadata?.issuer ?? metadata?.organizer },
    { label: "Ngày ban hành", value: formatDecisionDate(metadata?.issueDate) },
    { label: "Người ký", value: metadata?.signer },
  ]);
  const summaryFacts = compactFacts([
    { label: "Tổng dòng", value: preview?.summary.totalRows ?? 0 },
    { label: "Hợp lệ", value: validRows },
    ...(warningRows > 0 ? [{ label: "Cần xem lại", value: warningRows }] : []),
    ...((preview?.summary.duplicateRows ?? 0) > 0
      ? [{ label: "Trùng", value: preview?.summary.duplicateRows ?? 0 }]
      : []),
    ...((preview?.summary.invalidRows ?? 0) > 0
      ? [{ label: "Không hợp lệ", value: preview?.summary.invalidRows ?? 0 }]
      : []),
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Xác nhận lưu vào kho minh chứng chính thức?</DialogTitle>
          <DialogDescription>
            Sau khi xác nhận, sinh viên trong danh sách có thể import minh chứng này vào hồ sơ SV5T.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          {decisionFacts.map((fact) => (
            <Info key={fact.label} label={fact.label} value={fact.value} />
          ))}
        </div>

        <div className="grid gap-3 rounded-md border bg-muted/30 p-4 text-sm sm:grid-cols-4">
          {summaryFacts.map((fact) => (
            <Info key={fact.label} label={fact.label} value={fact.value} />
          ))}
        </div>

        <div className="grid gap-3">
          <label className="grid gap-2 text-sm font-medium">
            Phạm vi import
            <Select
              value={includeRows}
              onValueChange={(value) => setIncludeRows(value as typeof includeRows)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="valid_only">Chỉ dòng hợp lệ</SelectItem>
                <SelectItem value="valid_and_warnings">Dòng hợp lệ và dòng cần xem lại</SelectItem>
              </SelectContent>
            </Select>
          </label>

          {includesWarnings && warningRows > 0 ? (
            <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={confirmWarnings}
                  onChange={(event) => setConfirmWarnings(event.target.checked)}
                />
                <span>Tôi đã kiểm tra các dòng cần xem lại và xác nhận vẫn muốn import.</span>
              </label>
              <label className="grid gap-2 font-medium">
                Ghi chú xác nhận warning
                <Textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Ví dụ: Đã đối chiếu với văn bản gốc, các dòng warning được chấp nhận."
                />
              </label>
            </div>
          ) : null}

          {item?.status !== "preview_ready" ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              Chỉ có thể xác nhận khi preview đã sẵn sàng.
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            type="button"
            disabled={!canConfirm || isSubmitting}
            onClick={() =>
              onConfirm({ includeRows, confirmWarnings, note: note.trim() || undefined })
            }
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Xác nhận vào kho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  if (!isPresentDisplayValue(value)) return null;

  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-semibold text-foreground">{value}</div>
    </div>
  );
}
