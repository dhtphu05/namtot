import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui-kit";
import { useAuth } from "@/features/auth/store/auth-store";
import { useSmartUXTracking } from "@/hooks/useSmartUXTracking";
import { ACTIVE_LEVELS } from "@/lib/levels";
import { useSubmitReviewDecision } from "../hooks/useReview";
import type {
  Level,
  ReviewDecision,
  ReviewTaskDetail,
  SubmitReviewDecisionRequest,
} from "../types";
import { getCriterionLabel, getLevelLabel, getTaskStatusLabel } from "../utils/formatters";

type ReviewDecisionPanelProps = {
  task: ReviewTaskDetail;
  onSuccess?: () => void;
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
    description: "Minh chứng và dữ liệu đáp ứng yêu cầu.",
  },
  {
    value: "rejected",
    label: "Không đạt tiêu chí",
    description: "Không đáp ứng điều kiện, cần ghi rõ căn cứ.",
  },
  {
    value: "supplement_required",
    label: "Cần sinh viên bổ sung",
    description: "Gửi yêu cầu bổ sung minh chứng hoặc thông tin.",
  },
  {
    value: "resolution_needed",
    label: "Chuyển hội ý / xử lý mập mờ",
    description: "Cần hội đồng hoặc cấp có thẩm quyền xem xét.",
  },
];

const rejectReasonTemplates = [
  "Minh chứng không đáp ứng điều kiện của tiêu chí.",
  "Không đạt ngưỡng điểm/số ngày/số lượng theo cấp xét.",
  "Minh chứng không thể xác minh với dữ liệu hiện có.",
];

const supplementTemplates: Record<string, string[]> = {
  academic: [
    "Bổ sung bảng điểm rõ hơn.",
    "Bổ sung giấy xác nhận không có học phần điểm F.",
    "Bổ sung giấy xác nhận từ Phòng Đào tạo.",
  ],
  ethics: [
    "Bổ sung điểm rèn luyện có xác nhận.",
    "Bổ sung xác nhận không vi phạm kỷ luật.",
    "Bổ sung minh chứng hoạt động đạo đức/lối sống.",
  ],
  physical: [
    "Bổ sung giấy chứng nhận Sinh viên khỏe.",
    "Bổ sung minh chứng tham gia giải thể thao.",
    "Bổ sung thông tin thời gian/đơn vị tổ chức.",
  ],
  volunteer: [
    "Bổ sung số ngày tham gia.",
    "Bổ sung đơn vị xác nhận.",
    "Bổ sung danh sách tham gia có tên sinh viên.",
  ],
  integration: [
    "Bổ sung chứng chỉ ngoại ngữ còn hiệu lực.",
    "Bổ sung giấy chứng nhận hoạt động hội nhập.",
    "Bổ sung thông tin cấp tổ chức/chương trình.",
    "Bổ sung thời hạn/chứng nhận điểm số.",
  ],
};

export function ReviewDecisionPanel({ task, onSuccess }: ReviewDecisionPanelProps) {
  const role = useAuth((state) => state.user?.role);
  const [decision, setDecision] = useState<TaskDecision | "">("");
  const [suggestedLevel, setSuggestedLevel] = useState<Level | "">(
    task.officerSuggestedLevel ?? task.application.targetLevel,
  );
  const [reasonTemplate, setReasonTemplate] = useState("");
  const [note, setNote] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const submitDecision = useSubmitReviewDecision(task.id);
  const { trackAction } = useSmartUXTracking();

  const isFinal = finalStatuses.includes(task.status as (typeof finalStatuses)[number]);
  const canDecide = task.permissions?.availableActions
    ? task.permissions.availableActions.includes("decide")
    : task.permissions
      ? task.permissions.canAct
      : role === "officer" && !isFinal;
  const canRequestSupplement = task.permissions?.availableActions
    ? task.permissions.availableActions.includes("request_supplement")
    : canDecide;
  const canEscalateResolution = task.permissions?.availableActions
    ? task.permissions.availableActions.includes("escalate_resolution")
    : canDecide;
  const evidenceOptions = useMemo(() => task.evidences ?? [], [task.evidences]);
  const visibleDecisionOptions = useMemo(
    () =>
      decisionOptions.filter((option) => {
        if (option.value === "supplement_required") return canRequestSupplement;
        if (option.value === "resolution_needed") return canEscalateResolution;
        return canDecide;
      }),
    [canDecide, canEscalateResolution, canRequestSupplement],
  );
  const selectedCanSubmit = decision
    ? canSubmitDecision(decision, canDecide, canRequestSupplement, canEscalateResolution)
    : false;
  const validationMessage = decision
    ? validateDecision({
        decision,
        note,
        suggestedLevel,
        reasonTemplate,
        deadline,
      })
    : "Vui lòng chọn kết luận xét duyệt.";
  const apiError =
    submitDecision.error instanceof Error
      ? submitDecision.error.message
      : submitDecision.error
        ? "Không thể gửi kết luận xét duyệt."
        : null;
  const warningText = getDecisionWarning(task);
  const ctaLabel = getCtaLabel(decision);

  const toggleEvidence = (evidenceId: string, checked: boolean) => {
    setSelectedEvidenceIds((current) =>
      checked ? [...new Set([...current, evidenceId])] : current.filter((id) => id !== evidenceId),
    );
  };

  const appendTemplate = (template: string) => {
    setNote((current) => (current.trim() ? `${current.trim()}\n${template}` : template));
    setFormError(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedMessage(null);

    if (!decision) {
      setFormError("Vui lòng chọn kết luận xét duyệt.");
      return;
    }

    if (!selectedCanSubmit) {
      setFormError("Bạn không có quyền gửi quyết định này.");
      return;
    }

    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    setFormError(null);
    trackAction(getOfficerDecisionEvent(decision), {
      role: "officer",
      criterion: task.criterion,
      target_level: suggestedLevel || task.application.targetLevel,
      status: task.status,
      count: selectedEvidenceIds.length,
    });

    const payload: SubmitReviewDecisionRequest = {
      decision,
      officerSuggestedLevel: decision === "accepted" ? (suggestedLevel as Level) : null,
      levelAssessmentJson: task.criterionLevelAssessment
        ? { assessment: task.criterionLevelAssessment }
        : undefined,
      supplementRequestJson:
        decision === "supplement_required"
          ? {
              reason: note.trim(),
              evidenceIds: selectedEvidenceIds,
              deadline: deadline || null,
              requestedFields: [],
            }
          : undefined,
      note: note.trim(),
    };

    submitDecision.mutate(
      { payload },
      {
        onSuccess: () => {
          trackAction(getOfficerDecisionEvent(decision), {
            role: "officer",
            criterion: task.criterion,
            target_level: suggestedLevel || task.application.targetLevel,
            status: "success",
            count: selectedEvidenceIds.length,
          });
          const message = "Đã gửi kết luận xét duyệt.";
          setSubmittedMessage(message);
          toast.success(message);
          onSuccess?.();
        },
      },
    );
  };

  return (
    <Card className="flex min-h-0 flex-1 flex-col border border-[#E5E7EB] bg-white p-0 shadow-none">
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <div className="flex items-start justify-between gap-3">
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

            {warningText ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {warningText}
              </div>
            ) : null}

            {!visibleDecisionOptions.length ? (
              <div className="mt-3 rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
                {task.permissions?.reasonLabel ??
                  (isFinal
                    ? "Tác vụ đã có kết luận cuối cùng, không thể gửi quyết định mới."
                    : "Vai trò hiện tại chỉ được xem kết luận, không thể gửi quyết định.")}
              </div>
            ) : null}
          </div>

          <RadioGroup
            className="grid gap-2"
            disabled={!visibleDecisionOptions.length || submitDecision.isPending}
            value={decision}
            onValueChange={(value) => {
              setDecision(value as TaskDecision);
              setFormError(null);
            }}
          >
            {visibleDecisionOptions.map((option) => (
              <label
                key={option.value}
                className="flex min-h-14 cursor-pointer gap-3 rounded-xl border border-[#E5E7EB] p-3 transition-colors hover:bg-slate-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
                data-smartux-tag={getOfficerDecisionEvent(option.value)}
              >
                <RadioGroupItem className="mt-1" value={option.value} />
                <span>
                  <span className="block text-sm font-semibold text-brand-deep">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </RadioGroup>

          {decision === "accepted" ? (
            <div className="space-y-3">
              <label
                className="block text-sm font-semibold text-brand-deep"
                htmlFor="criterion-level"
              >
                Cấp đạt ghi nhận
                <select
                  className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  disabled={!selectedCanSubmit || submitDecision.isPending}
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
              </label>
              <DecisionTextarea
                disabled={!selectedCanSubmit || submitDecision.isPending}
                label="Ghi chú nội bộ"
                optional
                placeholder="Có thể bỏ trống nếu minh chứng đã rõ."
                value={note}
                onChange={setNote}
                onClearError={() => setFormError(null)}
              />
            </div>
          ) : null}

          {decision === "rejected" ? (
            <div className="space-y-3">
              <ReasonTemplateSelect
                disabled={!selectedCanSubmit || submitDecision.isPending}
                templates={rejectReasonTemplates}
                value={reasonTemplate}
                onChange={(value) => {
                  setReasonTemplate(value);
                  if (value && !note.trim()) setNote(value);
                  setFormError(null);
                }}
              />
              <DecisionTextarea
                disabled={!selectedCanSubmit || submitDecision.isPending}
                label="Ghi chú bắt buộc"
                placeholder="Nhập căn cứ không đạt, tối thiểu 10 ký tự."
                value={note}
                onChange={setNote}
                onClearError={() => setFormError(null)}
              />
            </div>
          ) : null}

          {decision === "supplement_required" ? (
            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-brand-deep">Minh chứng liên quan</div>
                {evidenceOptions.length ? (
                  <div className="mt-2 space-y-2">
                    {evidenceOptions.map((evidence) => (
                      <label
                        key={evidence.id}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E5E7EB] p-3 hover:bg-slate-50"
                      >
                        <Checkbox
                          checked={selectedEvidenceIds.includes(evidence.id)}
                          disabled={!selectedCanSubmit || submitDecision.isPending}
                          onCheckedChange={(checked) =>
                            toggleEvidence(evidence.id, checked === true)
                          }
                        />
                        <span className="min-w-0">
                          <span className="line-clamp-1 text-sm font-semibold text-brand-deep">
                            {evidence.evidenceName || "Tên minh chứng chưa có"}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {getCriterionLabel(evidence.criterion)} •{" "}
                            {getTaskStatusLabel(evidence.status)}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                    Chưa có minh chứng liên quan. Có thể gửi yêu cầu bổ sung chung cho tiêu chí.
                  </div>
                )}
              </div>

              <div>
                <div className="text-sm font-semibold text-brand-deep">Mẫu nhanh</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(supplementTemplates[task.criterion] ?? []).map((template) => (
                    <Button
                      key={template}
                      disabled={!selectedCanSubmit || submitDecision.isPending}
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => appendTemplate(template)}
                    >
                      {template}
                    </Button>
                  ))}
                </div>
              </div>

              <DecisionTextarea
                disabled={!selectedCanSubmit || submitDecision.isPending}
                label="Nội dung bổ sung"
                placeholder="Nêu rõ sinh viên cần bổ sung hoặc chỉnh sửa phần nào."
                value={note}
                onChange={setNote}
                onClearError={() => setFormError(null)}
              />

              <label
                className="block text-sm font-semibold text-brand-deep"
                htmlFor="supplement-deadline"
              >
                Hạn bổ sung
                <Input
                  className="mt-2"
                  disabled={!selectedCanSubmit || submitDecision.isPending}
                  id="supplement-deadline"
                  type="date"
                  value={deadline}
                  onChange={(event) => {
                    setDeadline(event.target.value);
                    setFormError(null);
                  }}
                />
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Có thể bỏ trống nếu quy định hiện hành tự xác định hạn.
                </span>
              </label>
            </div>
          ) : null}

          {decision === "resolution_needed" ? (
            <DecisionTextarea
              disabled={!selectedCanSubmit || submitDecision.isPending}
              label="Lý do chuyển hội ý"
              placeholder="Nêu điểm mập mờ hoặc căn cứ cần hội đồng xem xét."
              value={note}
              onChange={setNote}
              onClearError={() => setFormError(null)}
            />
          ) : null}

          {formError ? <div className="text-xs text-destructive">{formError}</div> : null}

          {apiError ? (
            <div className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{apiError}</span>
            </div>
          ) : null}

          {submittedMessage ? (
            <div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{submittedMessage}</span>
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-0 z-10 border-t bg-white p-4 shadow-[0_-10px_18px_rgba(255,255,255,0.96)]">
          <Button
            className="w-full rounded-xl shadow-sm"
            disabled={!selectedCanSubmit || Boolean(validationMessage) || submitDecision.isPending}
            type="submit"
            data-smartux-tag={decision ? getOfficerDecisionEvent(decision) : "officer_open_task"}
          >
            <Send className="h-4 w-4" />
            {submitDecision.isPending ? "Đang gửi..." : ctaLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ReasonTemplateSelect({
  disabled,
  templates,
  value,
  onChange,
}: {
  disabled: boolean;
  templates: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-semibold text-brand-deep" htmlFor="review-reason-template">
      Mẫu lý do
      <select
        className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        disabled={disabled}
        id="review-reason-template"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Chọn mẫu lý do</option>
        {templates.map((template) => (
          <option key={template} value={template}>
            {template}
          </option>
        ))}
      </select>
    </label>
  );
}

function DecisionTextarea({
  disabled,
  label,
  optional,
  placeholder,
  value,
  onChange,
  onClearError,
}: {
  disabled: boolean;
  label: string;
  optional?: boolean;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onClearError: () => void;
}) {
  return (
    <label className="block text-sm font-semibold text-brand-deep" htmlFor="review-decision-note">
      {label}
      {optional ? (
        <span className="font-normal text-muted-foreground"> (không bắt buộc)</span>
      ) : null}
      <Textarea
        className="mt-2 min-h-24"
        disabled={disabled}
        id="review-decision-note"
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          onClearError();
        }}
      />
    </label>
  );
}

function canSubmitDecision(
  decision: TaskDecision,
  canDecide: boolean,
  canRequestSupplement: boolean,
  canEscalateResolution: boolean,
) {
  if (decision === "supplement_required") return canRequestSupplement;
  if (decision === "resolution_needed") return canEscalateResolution;
  return canDecide;
}

function getOfficerDecisionEvent(decision: TaskDecision) {
  if (decision === "accepted") return "officer_accept_criterion";
  if (decision === "rejected") return "officer_reject_criterion";
  if (decision === "supplement_required") return "officer_request_supplement";
  return "officer_escalate_resolution";
}

function validateDecision({
  decision,
  note,
  suggestedLevel,
  reasonTemplate,
  deadline,
}: {
  decision: TaskDecision;
  note: string;
  suggestedLevel: Level | "";
  reasonTemplate: string;
  deadline: string;
}) {
  const trimmedNote = note.trim();

  if (decision === "accepted" && !suggestedLevel) {
    return "Vui lòng chọn cấp đạt của tiêu chí này.";
  }

  if (decision === "rejected" && !reasonTemplate) {
    return "Vui lòng chọn mẫu lý do không đạt.";
  }

  if (decision !== "accepted" && trimmedNote.length < 10) {
    return "Nội dung cho quyết định này cần ít nhất 10 ký tự.";
  }

  if (deadline && Number.isNaN(new Date(`${deadline}T00:00:00`).getTime())) {
    return "Hạn bổ sung không hợp lệ.";
  }

  return null;
}

function getCtaLabel(decision: TaskDecision | "") {
  if (decision === "accepted") return "Xác nhận đạt";
  if (decision === "rejected") return "Xác nhận không đạt";
  if (decision === "supplement_required") return "Gửi yêu cầu bổ sung";
  if (decision === "resolution_needed") return "Chuyển Resolution Hub";
  return "Chọn quyết định";
}

function getDecisionWarning(task: ReviewTaskDetail) {
  const evidenceWithoutFile = task.evidences?.find((evidence) => !evidence.files?.length);
  if (evidenceWithoutFile) return "Có minh chứng chưa có tệp xác nhận.";

  const manualReview = task.evidences?.find(
    (evidence) =>
      evidence.indexingStatus === "needs_manual_review" || evidence.status === "needs_supplement",
  );
  if (manualReview) return "Có minh chứng cần cán bộ kiểm tra thêm.";

  return null;
}
