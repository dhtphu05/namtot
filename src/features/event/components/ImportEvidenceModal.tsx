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
import type { ApprovedEvidenceSearchItem } from "@/types/evidence";
import {
  criterionCopy,
  formatEventDateRange,
  formatImportedValue,
} from "./approved-evidence-utils";

type ImportEvidenceModalProps = {
  item: ApprovedEvidenceSearchItem | null;
  open: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ImportEvidenceModal({
  item,
  open,
  isSubmitting,
  onOpenChange,
  onConfirm,
}: ImportEvidenceModalProps) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Thêm minh chứng từ danh sách chính thức?</DialogTitle>
          <DialogDescription>
            Minh chứng này được lấy từ danh sách chính thức đã được cán bộ xác nhận.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 rounded-md border bg-muted/30 p-4 text-sm sm:grid-cols-2">
          <Info label="Tên hoạt động" value={item.event.eventName} />
          <Info
            label="Tiêu chí"
            value={criterionCopy[item.event.criterion] ?? item.event.criterion}
          />
          <Info label="Đơn vị tổ chức" value={item.event.organizer} />
          <Info
            label="Thời gian"
            value={formatEventDateRange(item.event.startDate, item.event.endDate)}
          />
          <Info label="Giá trị quy đổi" value={formatImportedValue(item)} />
          <Info label="Số quyết định" value={item.event.officialDocumentNo} />
        </div>

        <p className="rounded-md bg-sky-50 p-3 text-sm text-sky-900">
          Minh chứng sẽ được thêm vào hồ sơ của bạn.
        </p>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={onConfirm}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Thêm vào hồ sơ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-semibold text-foreground">{value || "--"}</div>
    </div>
  );
}
