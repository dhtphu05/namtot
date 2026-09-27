import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, Card } from "@/components/ui-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatVietnamDateTime, fromVietnamDateTimeInput } from "@/lib/datetime-vietnam";
import {
  useGrantSubmissionDeadlineException,
  useManagerSubmissionDeadline,
  useRevokeSubmissionDeadlineException,
} from "../hooks/useCitySeason";

export function CitySubmissionDeadlineExceptionPanel({ applicationId }: { applicationId: string }) {
  const deadline = useManagerSubmissionDeadline(applicationId);
  const grant = useGrantSubmissionDeadlineException();
  const revoke = useRevokeSubmissionDeadlineException();
  const [validUntil, setValidUntil] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [formError, setFormError] = useState("");
  const [mutationError, setMutationError] = useState("");
  const [confirmAction, setConfirmAction] = useState<"grant" | "revoke" | null>(null);

  const exception = deadline.data?.exception;
  const hasActiveException = Boolean(
    exception && exception.revokedAt === null && Date.parse(exception.validUntil) > Date.now(),
  );

  function requestGrant() {
    setFormError("");
    const expiration = fromVietnamDateTimeInput(validUntil);
    if (!expiration) {
      setFormError("Chọn thời điểm hết hiệu lực hợp lệ theo giờ Việt Nam.");
      return;
    }
    if (new Date(expiration).getTime() <= Date.now()) {
      setFormError("Thời điểm hết hiệu lực phải nằm trong tương lai.");
      return;
    }
    if (!grantReason.trim()) {
      setFormError("Nhập lý do cấp ngoại lệ.");
      return;
    }
    setConfirmAction("grant");
  }

  function requestRevoke() {
    setFormError("");
    if (!revokeReason.trim()) {
      setFormError("Nhập lý do thu hồi ngoại lệ.");
      return;
    }
    setConfirmAction("revoke");
  }

  async function confirm() {
    setMutationError("");
    try {
      if (confirmAction === "grant") {
        await grant.mutateAsync({
          applicationId,
          payload: {
            validUntil: fromVietnamDateTimeInput(validUntil)!,
            reason: grantReason.trim(),
          },
        });
        setGrantReason("");
      } else if (confirmAction === "revoke") {
        await revoke.mutateAsync({
          applicationId,
          payload: { reason: revokeReason.trim() },
        });
        setRevokeReason("");
      }
      setConfirmAction(null);
    } catch (error) {
      setConfirmAction(null);
      setMutationError(error instanceof Error ? error.message : "Không thể lưu thay đổi thời hạn.");
    }
  }

  return (
    <Card>
      <section aria-label="Hạn nộp hồ sơ">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-brand-deep">Thời hạn nộp hồ sơ cấp Thành phố</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ngoại lệ chỉ áp dụng cho lần nộp đầu tiên của hồ sơ này.
            </p>
          </div>
          {deadline.data ? (
            <Badge variant="outline">{deadlineStatusLabel(deadline.data.submission.status)}</Badge>
          ) : null}
        </div>

        {deadline.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Đang tải lịch hồ sơ…</p>
        ) : deadline.isError ? (
          <div className="mt-3 flex flex-wrap items-center gap-3" role="alert">
            <span className="text-sm text-rose-700">Không tải được lịch nộp hồ sơ.</span>
            <Button size="sm" variant="outline" onClick={() => void deadline.refetch()}>
              Tải lại
            </Button>
          </div>
        ) : deadline.data ? (
          <div className="mt-3 space-y-3">
            <dl className="grid gap-x-5 gap-y-2 text-sm sm:grid-cols-2">
              <DeadlineValue label="Mở nộp" value={deadline.data.submission.opensAt} />
              <DeadlineValue
                label="Hạn nộp hiện tại"
                value={deadline.data.submission.effectiveClosesAt}
              />
              <DeadlineValue label="Hạn review" value={deadline.data.review.deadlineAt} />
              <DeadlineValue label="Hạn bổ sung" value={deadline.data.supplement.deadlineAt} />
              <DeadlineValue
                label="Hạn chốt kết quả"
                value={deadline.data.finalization.deadlineAt}
              />
            </dl>
            {exception ? (
              <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <p className="font-semibold">
                  {hasActiveException
                    ? "Ngoại lệ có hiệu lực đến"
                    : exception.revokedAt
                      ? "Ngoại lệ đã được thu hồi"
                      : "Ngoại lệ đã hết hạn"}{" "}
                  {formatVietnamDateTime(exception.validUntil)}
                </p>
                <p className="mt-1">Lý do: {exception.reason}</p>
              </div>
            ) : null}

            {hasActiveException ? (
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
                  Lý do thu hồi ngoại lệ
                  <input
                    aria-label="Lý do thu hồi ngoại lệ"
                    value={revokeReason}
                    onChange={(event) => setRevokeReason(event.target.value)}
                    className="h-9 rounded-md border bg-white px-3 text-sm text-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                </label>
                <Button
                  className="self-end"
                  variant="outline"
                  onClick={requestRevoke}
                  disabled={revoke.isPending}
                >
                  Thu hồi ngoại lệ
                </Button>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
                  Hiệu lực đến
                  <input
                    type="datetime-local"
                    aria-label="Hiệu lực đến"
                    value={validUntil}
                    onChange={(event) => setValidUntil(event.target.value)}
                    className="h-9 rounded-md border bg-white px-2 text-sm text-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
                  Lý do cấp ngoại lệ
                  <input
                    aria-label="Lý do cấp ngoại lệ"
                    value={grantReason}
                    onChange={(event) => setGrantReason(event.target.value)}
                    className="h-9 rounded-md border bg-white px-3 text-sm text-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                </label>
                <div className="sm:col-span-2">
                  <Button onClick={requestGrant} disabled={grant.isPending}>
                    Cấp ngoại lệ
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {formError ? (
          <p className="mt-2 text-sm text-rose-700" role="alert">
            {formError}
          </p>
        ) : null}
        {mutationError ? (
          <p className="mt-2 text-sm text-rose-700" role="alert">
            {mutationError}
          </p>
        ) : null}
      </section>

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "grant" ? "Xác nhận cấp ngoại lệ" : "Xác nhận thu hồi ngoại lệ"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "grant"
                ? `Gia hạn tiếp nhận đến ${formatVietnamDateTime(fromVietnamDateTimeInput(validUntil))}. Lý do: ${grantReason.trim()}`
                : `Thu hồi ngoại lệ hiện tại. Lý do: ${revokeReason.trim()}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Quay lại
            </Button>
            <Button onClick={() => void confirm()} disabled={grant.isPending || revoke.isPending}>
              {confirmAction === "grant" ? "Xác nhận cấp" : "Xác nhận thu hồi"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function DeadlineValue({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex min-w-0 justify-between gap-3 border-b border-slate-100 py-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-brand-deep">{formatVietnamDateTime(value)}</dd>
    </div>
  );
}

function deadlineStatusLabel(status: string) {
  const labels: Record<string, string> = {
    NOT_CONFIGURED: "Chưa cấu hình",
    NOT_OPEN: "Chưa mở",
    OPEN: "Đang mở",
    CLOSED: "Đã đóng",
    EXCEPTION_ACTIVE: "Có ngoại lệ",
  };
  return labels[status] ?? status;
}
