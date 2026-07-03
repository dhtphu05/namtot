import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFinalizeManagerApplication } from "@/features/manager/hooks/useManager";
import type { ManagerResultItem } from "@/features/manager/types";
import { getDownrankReason, getFinalizeActionLabel, getLevelLabel, isLegacyCentral } from "@/lib/levels";
import { getApplicationStatusLabel } from "@/lib/status-labels";

export function FinalizationDialog({
  item,
  onOpenChange,
  open,
}: {
  item: ManagerResultItem | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const finalizeMutation = useFinalizeManagerApplication();
  const [note, setNote] = useState("");

  useEffect(() => {
    setNote("");
  }, [item?.applicationId]);

  const decision = useMemo(() => {
    if (!item) return null;
    if (!item.suggestedLevel) {
      return { finalStatus: "failed" as const, finalLevel: null };
    }
    return { finalStatus: "passed" as const, finalLevel: item.suggestedLevel };
  }, [item]);

  if (!item || !decision) return null;

  const noteRequired = !note.trim();
  const blockedReason = item.blockingReasons?.join(" ") || "Hồ sơ chưa đủ điều kiện chốt.";
  const legacyCentral = isLegacyCentral(item.targetLevel) || isLegacyCentral(item.suggestedLevel);
  const submitDisabled =
    finalizeMutation.isPending || noteRequired || !item.canFinalize || legacyCentral;

  const submit = () => {
    if (submitDisabled) return;
    finalizeMutation.mutate(
      {
        applicationId: item.applicationId,
        payload: {
          finalStatus: decision.finalStatus,
          finalLevel: decision.finalLevel,
          finalNote: note.trim(),
          notifyStudent: true,
          overrideAggregation: false,
        },
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chốt kết quả hồ sơ</DialogTitle>
          <DialogDescription>
            Hệ thống sẽ kiểm tra lại gợi ý cấp đạt lần cuối trước khi lưu kết quả chính thức.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="text-sm font-bold text-brand-deep">{item.studentName}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {item.studentCode ?? "--"} - {item.className ?? "--"} - {item.faculty ?? "--"}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Info label="Cấp đăng ký" value={getLevelLabel(item.targetLevel)} />
              <Info label="Cấp đề xuất" value={getLevelLabel(item.suggestedLevel)} />
              <Info label="Readiness" value={`${item.readinessScore}`} />
              <Info label="Trạng thái" value={getApplicationStatusLabel(item.applicationStatus)} />
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-sm font-bold text-brand-deep">Tổng hợp xét duyệt</div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <Info label="Tổng task" value={`${item.reviewTaskSummary.total}`} />
              <Info label="Đạt" value={`${item.reviewTaskSummary.accepted}`} />
              <Info label="Không đạt" value={`${item.reviewTaskSummary.rejected}`} />
              <Info label="Bổ sung" value={`${item.reviewTaskSummary.supplementRequired}`} />
              <Info label="Hội ý" value={`${item.reviewTaskSummary.resolutionNeeded}`} />
              <Info label="Chờ" value={`${item.reviewTaskSummary.waiting}`} />
            </div>
          </div>
        </div>

        {!item.canFinalize ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {blockedReason}
          </div>
        ) : null}

        {legacyCentral ? (
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Hồ sơ cấp Trung ương đang nằm ngoài phạm vi flow chính hiện tại.</span>
          </div>
        ) : null}

        <div className="rounded-lg border p-4">
          <div className="text-sm font-bold text-brand-deep">Quyết định sẽ gửi</div>
          <div className="mt-3 rounded-lg bg-slate-50 px-4 py-3">
            <div className="text-base font-semibold text-brand-deep">
              {getFinalizeActionLabel(item.suggestedLevel)}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {getDownrankReason(item.targetLevel, item.suggestedLevel)}
            </div>
          </div>

          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-semibold text-brand-deep">Ghi chú kết quả</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Nhập căn cứ và ghi chú chốt kết quả..."
              className="min-h-24 w-full rounded-lg border border-[#DCE7F2] px-3 py-2 outline-none focus:ring-2 focus:ring-[#0057C2]/20"
            />
            {noteRequired ? <span className="text-xs text-red-600">Ghi chu la bat buoc.</span> : null}
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={submitDisabled}>
            {finalizeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {getFinalizeActionLabel(item.suggestedLevel)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-semibold text-brand-deep">{value}</div>
    </div>
  );
}
