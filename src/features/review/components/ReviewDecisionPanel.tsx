import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui-kit";
import { EvidencePrecedentSheet } from "@/features/evidence-knowledge/components/EvidencePrecedentSheet";
import {
  getApprovalSourcesLabel,
  getLevelLabel as getKnowledgeLevelLabel,
  getMatchReasonLabel,
} from "@/features/evidence-knowledge/components/evidence-knowledge-labels";
import { useOfficerEvidenceKnowledgeEvent } from "@/features/evidence-knowledge/hooks/useEvidenceKnowledge";
import type { OfficerEvidenceKnowledgeSearchItem } from "@/features/evidence-knowledge/types";
import { useAuth } from "@/features/auth/store/auth-store";
import { useSmartUXTracking } from "@/hooks/useSmartUXTracking";
import { ApiError } from "@/lib/api/client";
import { ACTIVE_LEVELS } from "@/lib/levels";
import {
  useEscalateResolution,
  useReviewTaskPrecedents,
  useSubmitReviewDecision,
} from "../hooks/useReview";
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
type EvidenceAssessmentValue = "valid" | "invalid" | "needs_supplement" | "ambiguous";
type EvidenceAssessmentDraft = {
  assessment: EvidenceAssessmentValue;
  note: string;
};
type PrecedentGuardReason =
  "different_level" | "different_organizer" | "conflicting_information" | "other";

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
    label: "Chuyển Hội đồng xem xét",
    description: "Cần Hội đồng hoặc cấp có thẩm quyền xem xét.",
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
  const [evidenceAssessments, setEvidenceAssessments] = useState<
    Record<string, EvidenceAssessmentDraft>
  >({});
  const [selectedPrecedentEventId, setSelectedPrecedentEventId] = useState<string | null>(null);
  const [resolutionGuardReason, setResolutionGuardReason] = useState<PrecedentGuardReason | "">("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const submitDecision = useSubmitReviewDecision(task.id);
  const escalateResolution = useEscalateResolution(task.id);
  const { trackAction } = useSmartUXTracking();

  const isFinal = finalStatuses.includes(task.status as (typeof finalStatuses)[number]);
  const canDecide = task.permissions?.availableActions
    ? task.permissions.availableActions.includes("decide")
    : task.permissions
      ? task.permissions.canAct
      : (role === "officer" || role === "city_officer" || role === "city_manager") && !isFinal;
  const canRequestSupplement = task.permissions?.availableActions
    ? task.permissions.availableActions.includes("request_supplement")
    : canDecide;
  const canEscalateResolution = task.permissions?.availableActions
    ? task.permissions.availableActions.includes("escalate_resolution")
    : canDecide;
  const canSearchPrecedents = ["officer", "manager", "committee", "admin"].includes(role ?? "");
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
  const precedentQuery = useReviewTaskPrecedents(
    task.id,
    canSearchPrecedents && canUsePrecedentSearch(task),
    3,
  );
  const precedentItems = canSearchPrecedents ? (precedentQuery.data?.items ?? []) : [];
  const primaryPrecedent = precedentItems[0] ?? null;
  const needsResolutionGuard = decision === "resolution_needed" && Boolean(primaryPrecedent);
  const guardValidationMessage =
    needsResolutionGuard && !resolutionGuardReason
      ? "Vui lòng chọn lý do vẫn chuyển Hội đồng."
      : null;
  const validationMessage = decision
    ? validateDecision({
        decision,
        note,
        suggestedLevel,
        reasonTemplate,
        deadline,
        evidenceAssessments,
      })
    : "Vui lòng chọn kết luận xét duyệt.";
  const apiError =
    submitDecision.error instanceof Error
      ? submitDecision.error.message
      : escalateResolution.error instanceof Error
        ? escalateResolution.error.message
        : submitDecision.error
          ? "Không thể gửi kết luận xét duyệt."
          : escalateResolution.error
            ? "Không thể chuyển Hội đồng."
            : null;
  const warningText = getDecisionWarning(task);
  const ctaLabel = getCtaLabel(decision);
  const isSubmitting = submitDecision.isPending || escalateResolution.isPending;
  const precedentDetail = useOfficerEvidenceKnowledgeEvent(
    selectedPrecedentEventId ?? undefined,
    canSearchPrecedents && Boolean(selectedPrecedentEventId),
  );
  const selectedPrecedentEvidence = precedentDetail.data?.acceptedEvidence[0] ?? null;
  const evidenceAssessmentPayload = buildEvidenceAssessmentPayload(evidenceAssessments);

  const handleMutationError = (error: unknown) => {
    if (!isConflictError(error)) return;
    setSubmittedMessage(null);
    toast.error("Tác vụ đã thay đổi. Đang tải lại dữ liệu mới nhất để bạn kiểm tra lại.");
    onSuccess?.();
  };

  const toggleEvidence = (evidenceId: string, checked: boolean) => {
    setSelectedEvidenceIds((current) =>
      checked ? [...new Set([...current, evidenceId])] : current.filter((id) => id !== evidenceId),
    );
  };

  const appendTemplate = (template: string) => {
    setNote((current) => (current.trim() ? `${current.trim()}\n${template}` : template));
    setFormError(null);
  };

  const handleAcceptWithPrecedent = (precedent: OfficerEvidenceKnowledgeSearchItem) => {
    setSubmittedMessage(null);
    const precedentRef = getPrecedentReference(precedent, precedentDetail.data);
    if (!canDecide) {
      setFormError("Bạn không có quyền chấp nhận minh chứng theo tiền lệ.");
      return;
    }
    if (!suggestedLevel) {
      setDecision("accepted");
      setFormError("Vui lòng chọn cấp đạt của tiêu chí này.");
      return;
    }

    setFormError(null);
    trackAction("officer_accept_criterion", {
      role: "officer",
      criterion: task.criterion,
      target_level: suggestedLevel || task.application.targetLevel,
      status: task.status,
      count: selectedEvidenceIds.length,
    });

    submitDecision.mutate(
      {
        payload: {
          decision: "accepted",
          officerSuggestedLevel: suggestedLevel as Level,
          levelAssessmentJson: task.criterionLevelAssessment
            ? { assessment: task.criterionLevelAssessment }
            : undefined,
          note: note.trim() || "Chấp nhận theo tiền lệ đã kiểm tra.",
          evidenceAssessments: evidenceAssessmentPayload,
          precedentId: precedentRef.precedentId,
          precedentEventId: precedent.eventId,
          precedentEvidenceId: precedentRef.precedentEvidenceId,
        },
      },
      {
        onSuccess: () => {
          const message = "Đã chấp nhận minh chứng theo tiền lệ.";
          setDecision("accepted");
          setSubmittedMessage(message);
          toast.success(message);
          onSuccess?.();
        },
        onError: handleMutationError,
      },
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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

    if (decision === "resolution_needed" && canSearchPrecedents) {
      const refreshed = await precedentQuery.refetch();
      const guardPrecedent = refreshed.data?.items?.[0] ?? primaryPrecedent;
      if (guardPrecedent && !resolutionGuardReason) {
        setFormError("Vui lòng chọn lý do vẫn chuyển Hội đồng.");
        return;
      }
    }

    setFormError(null);
    trackAction(getOfficerDecisionEvent(decision), {
      role: "officer",
      criterion: task.criterion,
      target_level: suggestedLevel || task.application.targetLevel,
      status: task.status,
      count: selectedEvidenceIds.length,
    });

    if (decision === "resolution_needed") {
      const guardPrecedent = precedentQuery.data?.items?.[0] ?? primaryPrecedent;
      const guardPrecedentRef = guardPrecedent
        ? getPrecedentReference(guardPrecedent, precedentDetail.data)
        : null;
      escalateResolution.mutate(
        {
          payload: {
            reason: note.trim(),
            evidenceIds: selectedEvidenceIds,
            precedentId: guardPrecedentRef?.precedentId,
            precedentGuardViewed: Boolean(guardPrecedent),
            precedentGuardReason: guardPrecedent
              ? (resolutionGuardReason as PrecedentGuardReason)
              : undefined,
          },
        },
        {
          onSuccess: () => {
            const message = "Đã chuyển Hội đồng xem xét.";
            setSubmittedMessage(message);
            toast.success(message);
            onSuccess?.();
          },
          onError: handleMutationError,
        },
      );
      return;
    }

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
      evidenceAssessments: evidenceAssessmentPayload,
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
        onError: handleMutationError,
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

            {canSearchPrecedents ? (
              <ReviewPrecedentPanel
                item={primaryPrecedent}
                isLoading={precedentQuery.isLoading}
                isError={precedentQuery.isError}
                canAccept={canDecide && !isFinal}
                isAccepting={isSubmitting}
                onRetry={() => void precedentQuery.refetch()}
                onView={(eventId) => setSelectedPrecedentEventId(eventId)}
                onAccept={handleAcceptWithPrecedent}
              />
            ) : null}

            <EvidenceAssessmentSection
              disabled={!selectedCanSubmit || isSubmitting}
              evidences={evidenceOptions}
              values={evidenceAssessments}
              onAssessmentChange={(evidenceId, assessment) => {
                setEvidenceAssessments((current) => ({
                  ...current,
                  [evidenceId]: {
                    assessment,
                    note: current[evidenceId]?.note ?? "",
                  },
                }));
                setFormError(null);
              }}
              onNoteChange={(evidenceId, value) => {
                setEvidenceAssessments((current) => ({
                  ...current,
                  [evidenceId]: {
                    assessment: current[evidenceId]?.assessment ?? "valid",
                    note: value,
                  },
                }));
                setFormError(null);
              }}
            />

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
            disabled={!visibleDecisionOptions.length || isSubmitting}
            value={decision}
            onValueChange={(value) => {
              setDecision(value as TaskDecision);
              setFormError(null);
              if (value !== "resolution_needed") setResolutionGuardReason("");
            }}
          >
            {visibleDecisionOptions.map((option) => (
              <label
                key={option.value}
                className="flex min-h-14 cursor-pointer gap-3 rounded-xl border border-[#E5E7EB] p-3 transition-colors hover:bg-slate-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
                data-smartux-tag={getOfficerDecisionEvent(option.value)}
                data-testid={`decision-${option.value}`}
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
                  disabled={!selectedCanSubmit || isSubmitting}
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
                disabled={!selectedCanSubmit || isSubmitting}
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
                disabled={!selectedCanSubmit || isSubmitting}
                templates={rejectReasonTemplates}
                value={reasonTemplate}
                onChange={(value) => {
                  setReasonTemplate(value);
                  if (value && !note.trim()) setNote(value);
                  setFormError(null);
                }}
              />
              <DecisionTextarea
                disabled={!selectedCanSubmit || isSubmitting}
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
                          data-testid={`supplement-evidence-${evidence.id}`}
                          disabled={!selectedCanSubmit || isSubmitting}
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
                      disabled={!selectedCanSubmit || isSubmitting}
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
                disabled={!selectedCanSubmit || isSubmitting}
                label="Nội dung bổ sung"
                placeholder="Nêu rõ sinh viên cần bổ sung hoặc chỉnh sửa phần nào."
                testId="supplement-reason"
                value={note}
                onChange={setNote}
                onClearError={() => setFormError(null)}
              />

              <label
                className="block text-sm font-semibold text-brand-deep"
                htmlFor="supplement-deadline"
              >
                Hạn đề nghị bổ sung
                <Input
                  className="mt-2"
                  disabled={!selectedCanSubmit || isSubmitting}
                  id="supplement-deadline"
                  data-testid="supplement-deadline"
                  type="date"
                  value={deadline}
                  onChange={(event) => {
                    setDeadline(event.target.value);
                    setFormError(null);
                  }}
                />
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Mốc nhắc cho yêu cầu này; ngày này không tự khóa thao tác gửi lại.
                </span>
              </label>
            </div>
          ) : null}

          {decision === "resolution_needed" ? (
            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-brand-deep">
                  Minh chứng chuyển Hội đồng
                </div>
                {evidenceOptions.length ? (
                  <div className="mt-2 space-y-2">
                    {evidenceOptions.map((evidence) => (
                      <label
                        key={evidence.id}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E5E7EB] p-3 hover:bg-slate-50"
                      >
                        <Checkbox
                          checked={selectedEvidenceIds.includes(evidence.id)}
                          data-testid={`resolution-evidence-${evidence.id}`}
                          disabled={!selectedCanSubmit || isSubmitting}
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
                    Chưa có minh chứng liên quan. Có thể chuyển Hội đồng theo tiêu chí.
                  </div>
                )}
              </div>
              <DecisionTextarea
                disabled={!selectedCanSubmit || isSubmitting}
                label="Lý do chuyển hội ý"
                placeholder="Nêu điểm mập mờ hoặc căn cứ cần hội đồng xem xét."
                testId="resolution-reason"
                value={note}
                onChange={setNote}
                onClearError={() => setFormError(null)}
              />
              {primaryPrecedent ? (
                <ResolutionGuard
                  value={resolutionGuardReason}
                  onChange={(value) => {
                    setResolutionGuardReason(value);
                    setFormError(null);
                  }}
                  onView={() => setSelectedPrecedentEventId(primaryPrecedent.eventId)}
                />
              ) : null}
            </div>
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
            disabled={
              !selectedCanSubmit ||
              Boolean(validationMessage) ||
              Boolean(guardValidationMessage) ||
              isSubmitting
            }
            type="submit"
            data-testid={
              decision === "supplement_required"
                ? "submit-supplement"
                : decision === "resolution_needed"
                  ? "submit-resolution"
                  : undefined
            }
            data-smartux-tag={decision ? getOfficerDecisionEvent(decision) : "officer_open_task"}
          >
            <Send className="h-4 w-4" />
            {isSubmitting
              ? "Đang gửi..."
              : decision === "resolution_needed" && primaryPrecedent
                ? "Vẫn chuyển Hội đồng"
                : ctaLabel}
          </Button>
        </div>
      </form>
      <EvidencePrecedentSheet
        open={canSearchPrecedents && Boolean(selectedPrecedentEventId)}
        event={precedentDetail.data}
        item={selectedPrecedentEvidence}
        index={0}
        onOpenChange={(open) => {
          if (!open) setSelectedPrecedentEventId(null);
        }}
      />
    </Card>
  );
}

function ReviewPrecedentPanel({
  item,
  isLoading,
  isError,
  canAccept,
  isAccepting,
  onRetry,
  onView,
  onAccept,
}: {
  item?: OfficerEvidenceKnowledgeSearchItem | null;
  isLoading: boolean;
  isError: boolean;
  canAccept: boolean;
  isAccepting: boolean;
  onRetry: () => void;
  onView: (eventId: string) => void;
  onAccept: (item: OfficerEvidenceKnowledgeSearchItem) => void;
}) {
  if (isLoading) {
    return (
      <div className="mt-3 rounded-md border border-[#E5E7EB] bg-white p-3">
        <div className="h-4 w-44 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-3 w-64 max-w-full animate-pulse rounded bg-slate-100" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mt-3 rounded-md border border-rose-100 bg-rose-50 p-3 text-sm text-rose-800">
        <div className="font-semibold">Không tải được tiền lệ phù hợp.</div>
        <Button className="mt-2 min-h-11" type="button" variant="outline" onClick={onRetry}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (!item) return null;

  return (
    <section className="mt-3 rounded-md border border-[#B9D7FF] bg-[#F8FBFF] p-3">
      <div className="text-sm font-bold text-brand-deep">Đã tìm thấy tiền lệ phù hợp</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{item.canonicalTitle}</div>
      <div className="mt-1 text-xs leading-5 text-muted-foreground">
        {getApprovalSourcesLabel(item.approvalSources)} - {getCriterionLabel(item.criterion)} -{" "}
        {getKnowledgeLevelLabel(item.applicableLevel)}
        {item.organizer ? ` - ${item.organizer}` : ""}
        {item.year ? ` - ${item.year}` : ""}
      </div>
      {item.matchReasons.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.matchReasons.map((reason) => (
            <span key={reason} className="rounded-md bg-white px-2 py-1 text-xs text-slate-700">
              {getMatchReasonLabel(reason)}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          className="min-h-11"
          type="button"
          variant="outline"
          onClick={() => onView(item.eventId)}
        >
          <Eye className="h-4 w-4" />
          Xem tiền lệ
        </Button>
        <Button
          className="min-h-11"
          type="button"
          disabled={!canAccept || isAccepting}
          onClick={() => onAccept(item)}
        >
          Chấp nhận theo tiền lệ
        </Button>
      </div>
    </section>
  );
}

function ResolutionGuard({
  value,
  onChange,
  onView,
}: {
  value: PrecedentGuardReason | "";
  onChange: (value: PrecedentGuardReason) => void;
  onView: () => void;
}) {
  const reasons: Array<{ value: PrecedentGuardReason; label: string }> = [
    { value: "different_level", label: "Khác cấp xét" },
    { value: "different_organizer", label: "Khác đơn vị tổ chức" },
    { value: "conflicting_information", label: "Thông tin minh chứng mâu thuẫn" },
    { value: "other", label: "Lý do khác" },
  ];

  return (
    <section className="rounded-md border border-amber-200 bg-amber-50 p-3">
      <div className="text-sm font-semibold text-amber-950">
        Có tiền lệ phù hợp trước khi chuyển Hội đồng xem xét
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button className="min-h-11" type="button" variant="outline" onClick={onView}>
          <Eye className="h-4 w-4" />
          Xem tiền lệ
        </Button>
      </div>
      <RadioGroup
        className="mt-3 grid gap-2"
        value={value}
        onValueChange={(next) => onChange(next as PrecedentGuardReason)}
      >
        {reasons.map((reason) => (
          <label
            key={reason.value}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-amber-950"
          >
            <RadioGroupItem value={reason.value} />
            {reason.label}
          </label>
        ))}
      </RadioGroup>
    </section>
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
  testId,
  value,
  onChange,
  onClearError,
}: {
  disabled: boolean;
  label: string;
  optional?: boolean;
  placeholder: string;
  testId?: string;
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
        data-testid={testId ?? "reviewer-note"}
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

function EvidenceAssessmentSection({
  disabled,
  evidences,
  values,
  onAssessmentChange,
  onNoteChange,
}: {
  disabled: boolean;
  evidences: ReviewTaskDetail["evidences"];
  values: Record<string, EvidenceAssessmentDraft>;
  onAssessmentChange: (evidenceId: string, assessment: EvidenceAssessmentValue) => void;
  onNoteChange: (evidenceId: string, value: string) => void;
}) {
  if (!evidences.length) return null;

  return (
    <section
      className="mt-3 rounded-xl border border-[#E5E7EB] bg-slate-50 p-3"
      data-testid="evidence-assessment-section"
    >
      <div className="text-sm font-semibold text-brand-deep">Đánh giá từng minh chứng</div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Ghi nhận đánh giá hỗ trợ cho từng minh chứng; kết luận cuối vẫn do cán bộ xác nhận.
      </p>
      <div className="mt-3 space-y-3">
        {evidences.map((evidence) => {
          const value = values[evidence.id];
          const label = evidence.evidenceName || "Minh chứng chưa có tên";
          return (
            <div
              key={evidence.id}
              className="rounded-lg border border-[#E5E7EB] bg-white p-3"
              data-testid={`evidence-item-${evidence.id}`}
            >
              <div className="text-sm font-semibold text-brand-deep">{label}</div>
              <select
                aria-label={`Đánh giá ${label}`}
                className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                disabled={disabled}
                value={value?.assessment ?? ""}
                onChange={(event) => {
                  const next = event.target.value as EvidenceAssessmentValue | "";
                  if (next) onAssessmentChange(evidence.id, next);
                }}
              >
                <option value="">Chưa đánh giá</option>
                <option value="valid">Hợp lệ</option>
                <option value="invalid">Không hợp lệ</option>
                <option value="needs_supplement">Cần bổ sung</option>
                <option value="ambiguous">Mơ hồ</option>
              </select>
              {value && value.assessment !== "valid" ? (
                <label className="mt-2 block text-xs font-semibold text-brand-deep">
                  Ghi chú đánh giá
                  <Textarea
                    aria-label={`Ghi chú đánh giá ${label}`}
                    className="mt-1 min-h-16 bg-white text-sm"
                    disabled={disabled}
                    placeholder="Nêu ngắn gọn căn cứ cần lưu ý."
                    value={value.note}
                    onChange={(event) => onNoteChange(evidence.id, event.target.value)}
                  />
                </label>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function buildEvidenceAssessmentPayload(
  values: Record<string, EvidenceAssessmentDraft>,
): SubmitReviewDecisionRequest["evidenceAssessments"] {
  return Object.entries(values)
    .filter(([, value]) => Boolean(value.assessment))
    .map(([evidenceId, value]) => ({
      evidenceId,
      assessment: value.assessment,
      note: value.note.trim() || undefined,
    }));
}

function isConflictError(error: unknown) {
  return error instanceof ApiError && (error.status === 409 || error.code === "CONFLICT");
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

function getPrecedentReference(
  item: OfficerEvidenceKnowledgeSearchItem,
  detail?: {
    eventId: string;
    acceptedEvidence: Array<{ precedentId: string; evidenceId: string }>;
  } | null,
) {
  const detailEvidence = detail?.eventId === item.eventId ? detail.acceptedEvidence[0] : undefined;

  return {
    precedentId: item.precedentId ?? detailEvidence?.precedentId,
    precedentEvidenceId: item.precedentEvidenceId ?? detailEvidence?.evidenceId,
  };
}

function canUsePrecedentSearch(task: ReviewTaskDetail) {
  return (
    !finalStatuses.includes(task.status as (typeof finalStatuses)[number]) &&
    Boolean(task.evidences?.length)
  );
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
  evidenceAssessments,
}: {
  decision: TaskDecision;
  note: string;
  suggestedLevel: Level | "";
  reasonTemplate: string;
  deadline: string;
  evidenceAssessments: Record<string, EvidenceAssessmentDraft>;
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

  const incompleteAssessment = Object.values(evidenceAssessments).find(
    (assessment) => assessment.assessment !== "valid" && assessment.note.trim().length < 3,
  );
  if (incompleteAssessment) {
    return "Vui lòng ghi ít nhất 3 ký tự cho đánh giá minh chứng chưa hợp lệ.";
  }

  return null;
}

function getCtaLabel(decision: TaskDecision | "") {
  if (decision === "accepted") return "Xác nhận đạt";
  if (decision === "rejected") return "Xác nhận không đạt";
  if (decision === "supplement_required") return "Gửi yêu cầu bổ sung";
  if (decision === "resolution_needed") return "Chuyển Hội đồng xem xét";
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
