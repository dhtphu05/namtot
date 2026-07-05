import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui-kit";
import { useAuth } from "@/features/auth/store/auth-store";
import { ACTIVE_LEVELS } from "@/lib/levels";
import { useSubmitReviewDecision } from "../hooks/useReview";
import type { Level, ReviewDecision, ReviewTaskDetail, SubmitReviewDecisionRequest } from "../types";
import { getCriterionLabel, getLevelLabel, getTaskStatusLabel } from "../utils/formatters";

type ReviewDecisionPanelProps = {
  task: ReviewTaskDetail;
  onSuccess?: () => void;
  submitLabel?: string;
};

type TaskDecision = ReviewDecision;

const finalStatuses = ["accepted", "rejected", "resolution_needed"] as const;

const decisionOptions: Array<{
  value: TaskDecision;
  label: string;
  description: string;
}> = [
  {
    value: "accepted",
    label: "Đạt tiêu chí",
    description: "Tài liệu và dữ liệu đáp ứng yêu cầu của tiêu chí.",
  },
  {
    value: "rejected",
    label: "Không đạt tiêu chí",
    description: "Hồ sơ không đáp ứng yêu cầu, cần ghi rõ căn cứ.",
  },
  {
    value: "supplement_required",
    label: "Cần sinh viên bổ sung",
    description: "Tài liệu chưa đủ rõ, gửi yêu cầu bổ sung cho sinh viên.",
  },
  {
    value: "resolution_needed",
    label: "Chuyển hội ý / xử lý mập mờ",
    description: "Trường hợp cần hội đồng hoặc cấp có thẩm quyền xem xét.",
  },
];

const reasonTemplates = [
  "Thiếu tệp xác nhận",
  "Không đạt ngưỡng điểm/số ngày/số lượng",
  "Tài liệu cần xem lại",
  "Cần hội đồng quyết định",
];

export function ReviewDecisionPanel({ task, onSuccess, submitLabel = "Gửi kết luận" }: ReviewDecisionPanelProps) {
  const role = useAuth((state) => state.user?.role);
  const [decision, setDecision] = useState<TaskDecision | "">("");
  const [suggestedLevel, setSuggestedLevel] = useState<Level | "">(task.officerSuggestedLevel ?? "");
  const [reasonTemplate, setReasonTemplate] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [evidenceStatuses, setEvidenceStatuses] = useState<Record<string, TaskDecision | "">>({});
  const submitDecision = useSubmitReviewDecision(task.id);

  const isFinal = finalStatuses.includes(task.status as (typeof finalStatuses)[number]);
  const canSubmit = task.permissions?.availableActions
    ? task.permissions.availableActions.includes("decide")
    : task.permissions
      ? task.permissions.canAct
      : role === "officer" && !isFinal;
  const canRequestSupplement = task.permissions?.availableActions
    ? task.permissions.availableActions.includes("request_supplement")
    : canSubmit;
  const canEscalateResolution = task.permissions?.availableActions
    ? task.permissions.availableActions.includes("escalate_resolution")
    : canSubmit;
  const evidenceOptions = useMemo(() => task.evidences ?? [], [task.evidences]);
  const visibleDecisionOptions = useMemo(
    () =>
      decisionOptions.filter((option) => {
        if (option.value === "supplement_required") return canRequestSupplement;
        if (option.value === "resolution_needed") return canEscalateResolution;
        return canSubmit;
      }),
    [canEscalateResolution, canRequestSupplement, canSubmit],
  );
  const aimImpactText = !decision
    ? "Chọn kết luận để hệ thống hiển thị tác động tới cấp xét."
    : decision === "accepted"
      ? suggestedLevel
        ? `Nếu các tiêu chí còn lại cũng đạt, hồ sơ có thể được xét tối đa ${getLevelLabel(suggestedLevel)}.`
        : "Chọn cấp tối đa mà tiêu chí này đáp ứng để hệ thống ghi nhận kết quả xét."
      : `Nếu tiêu chí này không đạt, hồ sơ có thể chưa phù hợp với ${getLevelLabel(task.application.targetLevel)} hoặc cần sinh viên bổ sung.`;

  const validationMessage = decision
    ? validateDecisionV2(decision, note, suggestedLevel, reasonTemplate)
    : "Vui lòng chọn kết luận xét duyệt.";
  const apiError =
    submitDecision.error instanceof Error
      ? submitDecision.error.message
      : submitDecision.error
        ? "Không thể gửi kết luận xét duyệt."
        : null;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedMessage(null);

    if (!canSubmit) {
      setFormError("Bạn không thể gửi kết luận cho tác vụ này.");
      return;
    }

    if (!decision) {
      setFormError("Vui lòng chọn kết luận xét duyệt.");
      return;
    }

    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    setFormError(null);

    const evidenceDecisions = Object.entries(evidenceStatuses)
      .filter(([, status]) => Boolean(status))
      .map(([evidenceId, status]) => ({
        evidenceId,
        status: status as TaskDecision,
      }));

    const payload: SubmitReviewDecisionRequest = {
      decision,
      officerSuggestedLevel: decision === "accepted" ? (suggestedLevel as Level) : null,
      levelAssessmentJson: task.criterionLevelAssessment ? { assessment: task.criterionLevelAssessment } : undefined,
      supplementRequestJson:
        decision === "supplement_required"
          ? {
              reason: note.trim(),
              evidenceIds: evidenceOptions.map((evidence) => evidence.id),
              requestedFields: [],
            }
          : undefined,
      note: note.trim(),
      ...(evidenceDecisions.length ? { evidenceDecisions } : {}),
    };

    submitDecision.mutate(
      { payload },
      {
        onSuccess: () => {
          const message = "Đã gửi kết luận xét duyệt.";
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-brand-deep">Kết luận xét duyệt</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Tiêu chí: {getCriterionLabel(task.criterion)}
              </p>
            </div>
            <Badge variant={isFinal ? "secondary" : "outline"}>
              {getTaskStatusLabel(task.status)}
            </Badge>
          </div>

          {!canSubmit ? (
            <div className="mt-3 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              {task.permissions?.reasonLabel ??
                (isFinal
                  ? "Tác vụ đã có kết luận cuối cùng, không thể gửi quyết định mới."
                  : "Vai trò hiện tại chỉ được xem kết luận, không thể gửi quyết định.")}
            </div>
          ) : null}
        </div>

        <RadioGroup
          className="grid gap-3"
          disabled={!canSubmit || submitDecision.isPending}
          value={decision}
          onValueChange={(value) => {
            setDecision(value as TaskDecision);
            setFormError(null);
          }}
        >
          {visibleDecisionOptions.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer gap-3 rounded-md border p-3 transition-colors hover:bg-muted/40 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
            >
              <RadioGroupItem className="mt-1" value={option.value} />
              <span>
                <span className="block text-sm font-semibold text-brand-deep">{option.label}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </RadioGroup>

        {decision === "accepted" ? (
          <div>
            <label className="text-sm font-semibold text-brand-deep" htmlFor="criterion-level">
              Tiêu chí này đủ đến cấp nào?
            </label>
            <select
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              disabled={!canSubmit || submitDecision.isPending}
              id="criterion-level"
              value={suggestedLevel}
              onChange={(event) => {
                setSuggestedLevel(event.target.value as Level | "");
                setFormError(null);
              }}
            >
              <option value="">Chọn cấp đạt</option>
              {([...ACTIVE_LEVELS] as Level[]).map((level) => (
                <option key={level} value={level}>
                  {getLevelLabel(level)}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <span className="font-semibold">Ảnh hưởng tới cấp xét: </span>
          {aimImpactText}
        </div>

        {decision !== "accepted" ? (
          <div>
            <label className="text-sm font-semibold text-brand-deep" htmlFor="review-reason-template">
              Mẫu lý do
            </label>
            <select
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              disabled={!canSubmit || submitDecision.isPending}
              id="review-reason-template"
              value={reasonTemplate}
              onChange={(event) => {
                const value = event.target.value;
                setReasonTemplate(value);
                if (value && !note.trim()) {
                  setNote(value);
                }
                setFormError(null);
              }}
            >
              <option value="">Chọn mẫu lý do</option>
              {reasonTemplates.map((template) => (
                <option key={template} value={template}>
                  {template}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label className="text-sm font-semibold text-brand-deep" htmlFor="review-decision-note">
            Ghi chú xét duyệt
          </label>
          <Textarea
            className="mt-2 min-h-28"
            disabled={!canSubmit || submitDecision.isPending}
            id="review-decision-note"
            placeholder="Nhập căn cứ xét duyệt, nhận xét và lý do kết luận..."
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setFormError(null);
            }}
          />
          <div className="mt-1 text-xs text-muted-foreground">
            Quyết định không đạt hoặc chuyển hội ý cần ghi chú ít nhất 10 ký tự.
          </div>
          {formError ? <div className="mt-1 text-xs text-destructive">{formError}</div> : null}
        </div>

        {evidenceOptions.length ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-brand-deep">Đánh dấu tài liệu</div>
            <div className="space-y-2">
              {evidenceOptions.map((evidence) => (
                <div
                  key={evidence.id}
                  className="grid gap-2 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_220px]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-brand-deep">
                      {evidence.evidenceName || "Chưa có dữ liệu"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {getCriterionLabel(evidence.criterion)} •{" "}
                      {getTaskStatusLabel(evidence.status)}
                    </div>
                  </div>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    disabled={!canSubmit || submitDecision.isPending}
                    value={evidenceStatuses[evidence.id] ?? ""}
                    onChange={(event) =>
                      setEvidenceStatuses((current) => ({
                        ...current,
                        [evidence.id]: event.target.value as TaskDecision | "",
                      }))
                    }
                  >
                    <option value="">Không đánh dấu</option>
                    <option value="accepted">Đạt</option>
                    <option value="rejected">Không đạt</option>
                    <option value="resolution_needed">Cần hội ý</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        ) : null}

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

        <Button className="w-full" disabled={!canSubmit || Boolean(validationMessage) || submitDecision.isPending} type="submit">
          <Send className="h-4 w-4" />
          {submitDecision.isPending ? "Đang gửi..." : submitLabel}
        </Button>
      </form>
    </Card>
  );
}

function validateDecision(decision: TaskDecision, note: string) {
  const trimmedNote = note.trim();

  if (!trimmedNote) {
    return "Vui lòng nhập ghi chú xét duyệt.";
  }

  if ((decision === "rejected" || decision === "resolution_needed") && trimmedNote.length < 10) {
    return "Ghi chú cho quyết định này cần ít nhất 10 ký tự.";
  }

  return null;
}

function validateDecisionV2(
  decision: TaskDecision,
  note: string,
  suggestedLevel: Level | "",
  reasonTemplate: string,
) {
  const trimmedNote = note.trim();

  if (decision === "accepted" && !suggestedLevel) {
    return "Vui lòng chọn cấp đạt của tiêu chí này.";
  }

  if (decision !== "accepted" && !reasonTemplate) {
    return "Vui lòng chọn mẫu lý do cho quyết định này.";
  }

  if (decision !== "accepted" && !trimmedNote) {
    return "Vui lòng nhập ghi chú xét duyệt.";
  }

  if ((decision === "rejected" || decision === "resolution_needed" || decision === "supplement_required") && trimmedNote.length < 10) {
    return "Ghi chú cho quyết định này cần ít nhất 10 ký tự.";
  }

  return null;
}
