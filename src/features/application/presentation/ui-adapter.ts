import { getActionPresentation } from "./action-presentation";
import type { StudentCriterionDisplayState } from "./presentation-types";

type ExistingCriterionState = {
  status: "ok" | "missing" | "needs_review" | "empty" | "processing";
  statusLabel: string;
  tone: "good" | "warning" | "danger" | "neutral" | "info";
  warningCount: number;
  description: string;
  primaryMissingReason: string;
  completionText?: string;
  completionSource?: "criteria_completion";
};

export function applyCriterionDisplayToUiState<T extends ExistingCriterionState>(
  state: T,
  display: StudentCriterionDisplayState,
): T {
  const warningCount =
    display.status === "accepted" || display.status === "ready" ? 0 : state.warningCount;
  return {
    ...state,
    status: mapDisplayStatus(display.status),
    statusLabel: display.label,
    tone: display.tone,
    warningCount,
    description: display.description,
    primaryMissingReason: display.primaryAction?.isInteractive
      ? display.primaryAction.label
      : display.description,
    completionText: display.canShowCompletionDetail ? display.completionDetail : undefined,
    completionSource: display.canShowCompletionDetail ? "criteria_completion" : undefined,
  };
}

export function applyActionPresentationToUiAction<
  T extends {
    actionLabel: string;
    description: string;
    actionType?: string;
    route?: string;
    requirementKey?: string;
  },
>(action: T): T & { isInteractive?: boolean } {
  const presentation = getActionPresentation({
    type: action.actionType,
    route: action.route,
    requirementKey: action.requirementKey,
  });
  if (!presentation) return action;
  return {
    ...action,
    actionLabel: presentation.label,
    description: presentation.description,
    isInteractive: presentation.isInteractive,
  };
}

function mapDisplayStatus(status: StudentCriterionDisplayState["status"]) {
  if (status === "accepted" || status === "ready") return "ok";
  if (status === "needs_verification") return "needs_review";
  if (status === "under_review" || status === "resolution") return "processing";
  if (status === "not_started") return "empty";
  return "missing";
}
