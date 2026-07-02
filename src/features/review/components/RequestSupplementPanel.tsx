import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui-kit";
import { useAuth } from "@/features/auth/store/auth-store";
import { useRequestSupplement } from "../hooks/useReview";
import type { RequestSupplementRequest, ReviewTaskDetail } from "../types";
import { getCriterionLabel, getTaskStatusLabel } from "../utils/formatters";

type RequestSupplementPanelProps = {
  task: ReviewTaskDetail;
  onSuccess?: () => void;
};

const disabledStatuses = ["accepted", "rejected"] as const;

export function RequestSupplementPanel({ task, onSuccess }: RequestSupplementPanelProps) {
  const role = useAuth((state) => state.user?.role);
  const requestSupplement = useRequestSupplement(task.id);
  const [note, setNote] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const evidences = useMemo(() => task.evidences ?? [], [task.evidences]);
  const taskClosed = disabledStatuses.includes(task.status as (typeof disabledStatuses)[number]);
  const canSubmit = role === "officer" && !taskClosed;
  const validationMessage = validateSupplementRequest(note, deadline);
  const apiError =
    requestSupplement.error instanceof Error
      ? requestSupplement.error.message
      : requestSupplement.error
        ? "Không thể gửi yêu cầu bổ sung."
        : null;
  const isDeadlineError = formError?.startsWith("Hạn bổ sung") ?? false;

  const toggleEvidence = (evidenceId: string, checked: boolean) => {
    setSelectedEvidenceIds((current) =>
      checked ? [...new Set([...current, evidenceId])] : current.filter((id) => id !== evidenceId),
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedMessage(null);

    if (!canSubmit) {
      setFormError("Bạn không thể gửi yêu cầu bổ sung cho tác vụ này.");
      return;
    }

    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    setFormError(null);

    const payload: RequestSupplementRequest = {
      note: note.trim(),
      deadline: deadline || null,
      ...(selectedEvidenceIds.length ? { evidenceIds: selectedEvidenceIds } : {}),
    };

    requestSupplement.mutate(
      { payload },
      {
        onSuccess: () => {
          const message = "Đã gửi yêu cầu bổ sung cho sinh viên.";
          setSubmittedMessage(message);
          toast.success(message);
          onSuccess?.();
        },
      },
    );
  };

  return (
    <Card>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <h2 className="text-base font-bold text-brand-deep">Yêu cầu sinh viên bổ sung</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Nêu rõ phần minh chứng cần bổ sung để sinh viên có thể chỉnh sửa.
          </p>
          {!canSubmit ? (
            <div className="mt-3 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              {taskClosed
                ? "Tác vụ đã được kết luận, không thể yêu cầu bổ sung thêm."
                : "Vai trò hiện tại chỉ được xem yêu cầu bổ sung."}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold text-brand-deep">Minh chứng liên quan</div>
          {evidences.length ? (
            <div className="space-y-2">
              {evidences.map((evidence) => (
                <label
                  key={evidence.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/40 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
                >
                  <Checkbox
                    checked={selectedEvidenceIds.includes(evidence.id)}
                    disabled={!canSubmit || requestSupplement.isPending}
                    onCheckedChange={(checked) => toggleEvidence(evidence.id, checked === true)}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-brand-deep">
                      {evidence.evidenceName || "Chưa có dữ liệu"}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {getCriterionLabel(evidence.criterion)} •{" "}
                      {getTaskStatusLabel(evidence.status)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              Backend chưa trả về minh chứng. Bạn vẫn có thể gửi yêu cầu bổ sung chung cho tác vụ
              này.
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-semibold text-brand-deep" htmlFor="supplement-note">
            Lý do / nội dung bổ sung
          </label>
          <Textarea
            className="mt-2 min-h-28"
            disabled={!canSubmit || requestSupplement.isPending}
            id="supplement-note"
            placeholder="Ví dụ: Minh chứng hoạt động tình nguyện chưa thể hiện rõ thời gian tham gia và đơn vị xác nhận..."
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setFormError(null);
            }}
          />
          {formError && !isDeadlineError ? (
            <div className="mt-1 text-xs text-destructive">{formError}</div>
          ) : null}
        </div>

        <div>
          <label className="text-sm font-semibold text-brand-deep" htmlFor="supplement-deadline">
            Hạn bổ sung
          </label>
          <Input
            className="mt-2"
            disabled={!canSubmit || requestSupplement.isPending}
            id="supplement-deadline"
            type="date"
            value={deadline}
            onChange={(event) => {
              setDeadline(event.target.value);
              setFormError(null);
            }}
          />
          <div className="mt-1 text-xs text-muted-foreground">
            Có thể bỏ trống nếu backend hoặc quy định hiện hành tự xác định hạn.
          </div>
          {formError && isDeadlineError ? (
            <div className="mt-1 text-xs text-destructive">{formError}</div>
          ) : null}
        </div>

        {apiError ? (
          <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{apiError}</span>
          </div>
        ) : null}

        {submittedMessage ? (
          <div className="flex gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{submittedMessage}</span>
          </div>
        ) : null}

        <Button
          className="w-full"
          disabled={!canSubmit || requestSupplement.isPending}
          type="submit"
        >
          <Send className="h-4 w-4" />
          {requestSupplement.isPending ? "Đang gửi..." : "Gửi yêu cầu bổ sung"}
        </Button>
      </form>
    </Card>
  );
}

function validateSupplementRequest(note: string, deadline: string) {
  const trimmedNote = note.trim();

  if (!trimmedNote) {
    return "Vui lòng nhập nội dung yêu cầu bổ sung.";
  }

  if (trimmedNote.length < 10) {
    return "Nội dung yêu cầu bổ sung cần ít nhất 10 ký tự.";
  }

  if (deadline) {
    const deadlineDate = new Date(`${deadline}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(deadlineDate.getTime())) {
      return "Hạn bổ sung không hợp lệ.";
    }

    if (deadlineDate <= today) {
      return "Hạn bổ sung phải là một ngày trong tương lai.";
    }
  }

  return null;
}
