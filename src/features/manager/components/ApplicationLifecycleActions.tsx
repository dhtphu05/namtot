import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, Card } from "@/components/ui-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useArchiveManagerApplication,
  useCancelManagerApplication,
  useReopenCancelledManagerApplication,
  useUnarchiveManagerApplication,
} from "../hooks/useManager";
import type { ManagerResultDetail } from "../types";

type Action = "cancel" | "reopen" | "archive" | "unarchive" | null;

export function ApplicationLifecycleActions({
  application,
}: {
  application: ManagerResultDetail["application"];
}) {
  const cancel = useCancelManagerApplication();
  const reopen = useReopenCancelledManagerApplication();
  const archive = useArchiveManagerApplication();
  const unarchive = useUnarchiveManagerApplication();
  const [action, setAction] = useState<Action>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const applicationId = application.id;
  const isCancelled = Boolean(application.cancelledAt);
  const isArchived = Boolean(application.archivedAt);
  const hasCurrentFinal = Boolean(application.finalizedAt && application.finalStatus !== "pending");
  const canCancel = !isCancelled && Boolean(application.submittedAt || hasCurrentFinal);
  const canArchive =
    !isArchived && (isCancelled || ["completed", "rejected"].includes(application.status));

  function openAction(nextAction: Exclude<Action, null>) {
    setReason("");
    setError("");
    setAction(nextAction);
  }

  async function confirmAction() {
    setError("");
    try {
      if (action === "cancel") {
        await cancel.mutateAsync({ applicationId, payload: { reason: reason.trim() } });
      } else if (action === "reopen") {
        await reopen.mutateAsync({ applicationId, payload: { reason: reason.trim() } });
      } else if (action === "archive") {
        await archive.mutateAsync({
          applicationId,
          payload: reason.trim() ? { reason: reason.trim() } : {},
        });
      } else if (action === "unarchive") {
        await unarchive.mutateAsync({ applicationId });
      }
      setAction(null);
    } catch (mutationError) {
      setError(
        mutationError instanceof Error ? mutationError.message : "Không thể lưu thay đổi vòng đời.",
      );
    }
  }

  const isPending =
    cancel.isPending || reopen.isPending || archive.isPending || unarchive.isPending;
  const requiresReason = action === "cancel" || action === "reopen";
  const dialogTitle = {
    cancel: "Hủy hồ sơ",
    reopen: "Mở lại hồ sơ đã hủy",
    archive: "Lưu trữ hồ sơ",
    unarchive: "Bỏ lưu trữ hồ sơ",
  }[action ?? "cancel"];
  const confirmLabel = {
    cancel: "Xác nhận hủy hồ sơ",
    reopen: "Xác nhận mở lại hồ sơ",
    archive: "Xác nhận lưu trữ",
    unarchive: "Xác nhận bỏ lưu trữ",
  }[action ?? "cancel"];

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-brand-deep">Quản lý vòng đời hồ sơ</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Hồ sơ chính thức được giữ lại để tra cứu; thao tác dưới đây không xóa dữ liệu.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isCancelled ? <Badge variant="destructive">Đã hủy hồ sơ</Badge> : null}
            {isArchived ? <Badge variant="outline">Đã lưu trữ</Badge> : null}
          </div>
        </div>

        {isCancelled ? (
          <LifecycleInfo
            label="Lý do hủy"
            value={application.cancelReason}
            actor={application.cancelledBy?.fullName}
            at={application.cancelledAt}
          />
        ) : null}
        {isArchived ? (
          <LifecycleInfo
            label="Lý do lưu trữ"
            value={application.archiveReason}
            actor={application.archivedBy?.fullName}
            at={application.archivedAt}
          />
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {canCancel ? (
            <Button variant="danger" onClick={() => openAction("cancel")}>
              Hủy hồ sơ
            </Button>
          ) : null}
          {isCancelled ? (
            <Button variant="outline" onClick={() => openAction("reopen")}>
              Mở lại hồ sơ đã hủy
            </Button>
          ) : null}
          {canArchive ? (
            <Button variant="outline" onClick={() => openAction("archive")}>
              Lưu trữ hồ sơ
            </Button>
          ) : null}
          {isArchived ? (
            <Button variant="outline" onClick={() => openAction("unarchive")}>
              Bỏ lưu trữ hồ sơ
            </Button>
          ) : null}
        </div>
      </Card>

      <Dialog
        open={action !== null}
        onOpenChange={(open) => {
          if (!open && !isPending) setAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription(action)}</DialogDescription>
          </DialogHeader>

          {action === "cancel" && hasCurrentFinal ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Kết quả hiện tại sẽ được chuyển vào lịch sử và không còn được tính là kết quả chính
              thức hiện hành.
            </div>
          ) : null}
          {action === "reopen" ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p>Kết quả cũ sẽ không được khôi phục.</p>
              {isArchived ? (
                <p className="mt-1">Hồ sơ sẽ được bỏ lưu trữ cùng thao tác này.</p>
              ) : null}
            </div>
          ) : null}
          {requiresReason ? (
            <div className="space-y-2">
              <Label htmlFor="application-lifecycle-reason">
                {action === "cancel" ? "Lý do hủy hồ sơ" : "Lý do mở lại hồ sơ"}
              </Label>
              <Textarea
                id="application-lifecycle-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={2000}
                required
              />
            </div>
          ) : action === "archive" ? (
            <div className="space-y-2">
              <Label htmlFor="application-archive-reason">Lý do lưu trữ (không bắt buộc)</Label>
              <Textarea
                id="application-archive-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={2000}
              />
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button variant="outline" disabled={isPending} onClick={() => setAction(null)}>
              Đóng
            </Button>
            <Button
              variant={action === "cancel" ? "danger" : "primary"}
              disabled={isPending || (requiresReason && !reason.trim())}
              onClick={() => void confirmAction()}
            >
              {isPending ? "Đang lưu…" : confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LifecycleInfo({
  actor,
  at,
  label,
  value,
}: {
  actor?: string | null;
  at?: string | null;
  label: string;
  value?: string | null;
}) {
  return (
    <p className="mt-3 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{label}: </span>
      {value || "Không có lý do được ghi nhận."}
      {actor ? ` • ${actor}` : ""}
      {at ? ` • ${new Date(at).toLocaleString("vi-VN")}` : ""}
    </p>
  );
}

function dialogDescription(action: Action) {
  switch (action) {
    case "cancel":
      return "Hủy hồ sơ sẽ dừng xử lý chính thức và lưu lại lịch sử quyết định hiện có.";
    case "reopen":
      return "Hồ sơ được đưa lại vào luồng xử lý; các task và quyết định đã có sẽ được giữ nguyên.";
    case "archive":
      return "Lưu trữ chỉ thay đổi khả năng hiển thị trong danh sách quản lý.";
    case "unarchive":
      return "Hồ sơ sẽ xuất hiện lại trong danh sách phù hợp với trạng thái hiện tại.";
    default:
      return "Xác nhận thao tác với hồ sơ.";
  }
}
