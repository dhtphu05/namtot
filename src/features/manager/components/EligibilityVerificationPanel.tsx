import { useState } from "react";
import { BadgeCheck, Building2, Clock3, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui-kit";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  useEligibilityVerificationDetail,
  useEligibilityVerificationQueue,
  useVerifyApplicationEligibility,
} from "@/features/manager/hooks/useManager";
import type {
  EligibilityVerificationQueueItem,
  VerifyEligibilityInput,
} from "@/features/manager/types";

export function EligibilityVerificationPanel() {
  const queue = useEligibilityVerificationQueue();
  const verify = useVerifyApplicationEligibility();
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | undefined>();
  const [reason, setReason] = useState("");
  const [approveConfirmationOpen, setApproveConfirmationOpen] = useState(false);
  const detail = useEligibilityVerificationDetail(selectedApplicationId);
  const canDecide = Boolean(
    detail.data?.autoStatus === "NEEDS_VERIFICATION" &&
    detail.data.effectiveStatus === "NEEDS_VERIFICATION",
  );

  const selectApplication = (applicationId: string) => {
    setReason("");
    setSelectedApplicationId(applicationId);
  };

  const saveDecision = async (decision: VerifyEligibilityInput["decision"]) => {
    if (!selectedApplicationId || !reason.trim() || !canDecide) return;
    try {
      await verify.mutateAsync({
        applicationId: selectedApplicationId,
        payload: { decision, reason: reason.trim() },
      });
      setApproveConfirmationOpen(false);
    } catch {
      // The mutation hook shows the API error; keep the dialog open for correction or retry.
    }
  };

  return (
    <section aria-labelledby="eligibility-verification-panel-title">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="eligibility-verification-panel-title"
              className="text-base font-semibold text-brand-deep"
            >
              Hồ sơ cần xác minh điều kiện
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Hồ sơ cá nhân cấp Thành phố đang chờ đối chiếu điều kiện nộp.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11"
            onClick={() => void queue.refetch()}
            disabled={queue.isFetching}
            aria-label="Tải lại hồ sơ cần xác minh điều kiện"
          >
            {queue.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Tải lại
          </Button>
        </div>

        {queue.isLoading ? (
          <p role="status" className="mt-4 text-sm text-muted-foreground">
            Đang tải danh sách hồ sơ cần xác minh…
          </p>
        ) : queue.isError ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <p>Không thể tải danh sách hồ sơ cần xác minh.</p>
            <Button
              variant="link"
              className="mt-1 min-h-11 px-0"
              onClick={() => void queue.refetch()}
            >
              Thử tải lại
            </Button>
          </div>
        ) : queue.data?.items.length ? (
          <ul className="mt-4 divide-y rounded-md border">
            {queue.data.items.map((item) => (
              <VerificationQueueRow
                key={item.id}
                item={item}
                onOpen={() => selectApplication(item.id)}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
            Hiện không có hồ sơ nào chờ xác minh điều kiện.
          </p>
        )}
      </Card>

      <Dialog
        open={Boolean(selectedApplicationId)}
        onOpenChange={(open) => {
          if (!open && !verify.isPending) {
            setSelectedApplicationId(undefined);
            setApproveConfirmationOpen(false);
          }
        }}
      >
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Xác minh điều kiện nộp hồ sơ cấp Thành phố</DialogTitle>
            <DialogDescription>
              Đối chiếu thông tin với trường. Quyết định này chỉ áp dụng cho điều kiện nộp hồ sơ.
            </DialogDescription>
          </DialogHeader>

          {detail.isLoading ? (
            <p role="status" className="py-5 text-sm text-muted-foreground">
              Đang tải thông tin xác minh…
            </p>
          ) : detail.isError || !detail.data ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <p>Không thể tải chi tiết hồ sơ.</p>
              <Button
                variant="link"
                className="mt-1 min-h-11 px-0"
                onClick={() => void detail.refetch()}
              >
                Thử tải lại
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <dl className="grid gap-3 rounded-md border p-3 text-sm sm:grid-cols-2">
                <DetailValue label="Sinh viên" value={detail.data.student.fullName} />
                <DetailValue
                  label="Mã sinh viên"
                  value={detail.data.student.studentCode || "Chưa có"}
                />
                <DetailValue label="Lớp" value={detail.data.student.className || "Chưa có"} />
                <DetailValue label="Trường" value={detail.data.school.name} />
                <DetailValue label="Mã trường" value={detail.data.school.code} />
                <DetailValue label="Năm học" value={detail.data.schoolYear} />
              </dl>

              <div className="grid gap-2 sm:grid-cols-2">
                <StatusLine label="Trạng thái tự động" status={detail.data.autoStatus} />
                <StatusLine label="Trạng thái hiện tại" status={detail.data.effectiveStatus} />
              </div>

              {detail.data.reasons.length ? (
                <ul className="list-inside list-disc rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                  {detail.data.reasons.map((code) => (
                    <li key={code}>
                      {managerReasonCopy[code] ?? "Thông tin cần đối chiếu với trường."}
                    </li>
                  ))}
                </ul>
              ) : null}

              {detail.data.existingDecision ? (
                <p role="status" className="rounded-md bg-muted/40 p-3 text-sm">
                  Đã{" "}
                  {detail.data.existingDecision.decision === "APPROVED" ? "phê duyệt" : "từ chối"}{" "}
                  xác minh điều kiện vào{" "}
                  {new Date(detail.data.existingDecision.decidedAt).toLocaleString("vi-VN")}.
                </p>
              ) : null}

              <section aria-labelledby="verification-candidates-title">
                <h3
                  id="verification-candidates-title"
                  className="text-sm font-semibold text-brand-deep"
                >
                  Dòng cần đối chiếu trong danh hiệu đã xác nhận
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Chỉ hiển thị các dòng có tín hiệu trùng tên và lớp với sinh viên này.
                </p>
                {detail.data.candidates.length ? (
                  <ul className="mt-2 space-y-2">
                    {detail.data.candidates.map((candidate, index) => (
                      <li
                        key={`${candidate.institution.code}-${candidate.studentCode}-${index}`}
                        className="rounded-md border p-3 text-sm"
                      >
                        <div className="font-medium text-brand-deep">
                          {candidate.institution.name}
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          {candidate.fullName} · MSSV {candidate.studentCode} ·{" "}
                          {candidate.className || "Chưa có lớp"}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                    Không có dòng ứng viên để hiển thị. Hãy liên hệ trường để xác minh.
                  </p>
                )}
              </section>

              {canDecide ? (
                <div className="space-y-2">
                  <label htmlFor="eligibility-verification-reason" className="text-sm font-medium">
                    Lý do xác minh <span aria-hidden="true">*</span>
                  </label>
                  <Textarea
                    id="eligibility-verification-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Ghi rõ căn cứ đối chiếu với trường"
                    aria-describedby="eligibility-verification-reason-help"
                    maxLength={1000}
                    required
                    className="min-h-24"
                  />
                  <p
                    id="eligibility-verification-reason-help"
                    className="text-xs text-muted-foreground"
                  >
                    Bắt buộc cho cả hai quyết định. Không nhập thông tin ngoài nội dung cần xác
                    minh.
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {canDecide ? (
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={!reason.trim() || verify.isPending}
                onClick={() => void saveDecision("REJECTED")}
              >
                {verify.isPending && verify.variables?.payload.decision === "REJECTED" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Từ chối xác minh điều kiện
              </Button>
              <Button
                type="button"
                className="min-h-11"
                disabled={!reason.trim() || verify.isPending}
                onClick={() => setApproveConfirmationOpen(true)}
              >
                Phê duyệt điều kiện
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={approveConfirmationOpen} onOpenChange={setApproveConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Phê duyệt điều kiện nộp hồ sơ?</AlertDialogTitle>
            <AlertDialogDescription>
              Quyết định sẽ cho phép sinh viên tiếp tục lần nộp đầu tiên. Hãy chắc chắn lý do đã ghi
              rõ căn cứ đối chiếu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={verify.isPending}>Quay lại</AlertDialogCancel>
            <AlertDialogAction
              disabled={!reason.trim() || verify.isPending}
              onClick={(event) => {
                event.preventDefault();
                void saveDecision("APPROVED");
              }}
            >
              {verify.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Xác nhận phê duyệt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function VerificationQueueRow({
  item,
  onOpen,
}: {
  item: EligibilityVerificationQueueItem;
  onOpen: () => void;
}) {
  return (
    <li className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="min-w-0">
        <div className="font-medium text-brand-deep">{item.student.fullName}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>{item.school.name}</span>
          <span>{item.student.className || "Chưa có lớp"}</span>
          <span>Năm học {item.schoolYear}</span>
        </div>
      </div>
      <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={onOpen}>
        Xem hồ sơ cần xác minh
      </Button>
    </li>
  );
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-medium text-brand-deep">{value}</dd>
    </div>
  );
}

function StatusLine({ label, status }: { label: string; status: string }) {
  const Icon =
    status === "ELIGIBLE" ? BadgeCheck : status === "NEEDS_VERIFICATION" ? Clock3 : ShieldAlert;
  return (
    <div className="flex items-center gap-2 rounded-md border p-3 text-sm">
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-brand-deep">
        {eligibilityStatusLabel[status] ?? status}
      </span>
    </div>
  );
}

const eligibilityStatusLabel: Record<string, string> = {
  ELIGIBLE: "Đủ điều kiện",
  NOT_ELIGIBLE: "Chưa đủ điều kiện",
  NEEDS_VERIFICATION: "Cần xác minh",
};

const managerReasonCopy: Record<string, string> = {
  MISSING_IDENTITY_CONTEXT: "Thông tin định danh sinh viên chưa đủ để tự động đối chiếu.",
  IDENTITY_MATCH_REQUIRES_VERIFICATION: "Tên và lớp gợi ý một dòng cần được trường xác minh.",
  AMBIGUOUS_UNIVERSITY_SYSTEM_AWARD_MATCH:
    "Có nhiều dòng tên và lớp phù hợp cần được trường làm rõ.",
};
