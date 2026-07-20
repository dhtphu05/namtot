import type {
  ApplicationState,
  Criterion,
  CriterionCompletionItem,
  EvidenceResponse,
  PrecheckNextAction,
  RequirementGroup,
  RequirementItem,
} from "@/lib/api/types";

export type PresentationTone = "good" | "warning" | "danger" | "neutral" | "info";

export type CriterionDisplayStatus =
  | "accepted"
  | "rejected"
  | "supplement_required"
  | "resolution"
  | "under_review"
  | "ready"
  | "needs_verification"
  | "in_progress"
  | "not_started"
  | "unknown";

export type CriterionDisplaySource =
  | "final_result"
  | "review_decision"
  | "supplement_request"
  | "resolution"
  | "review_status"
  | "completion";

export type PresentationActionKind =
  | "choose_path"
  | "declare_data"
  | "find_official_data"
  | "upload_evidence"
  | "fix_missing_field"
  | "wait_for_confirmation"
  | "open_supplement"
  | "run_precheck"
  | "submit"
  | "unknown";

export type PresentationAction = {
  type: PresentationActionKind;
  label: string;
  description: string;
  isInteractive: boolean;
  route?: string;
  criterion?: Criterion;
  requirementKey?: string;
};

export type StudentCriterionDisplayState = {
  criterion: Criterion;
  status: CriterionDisplayStatus;
  source: CriterionDisplaySource;
  label: string;
  description: string;
  tone: PresentationTone;
  primaryAction?: PresentationAction;
  secondaryAction?: PresentationAction;
  completionDetail?: string;
  canShowCompletionDetail: boolean;
  finalStatus?: string | null;
  finalLevel?: string | null;
  finalNote?: string | null;
  reviewDecision?: string | null;
  reviewStatus?: string | null;
  supplementReason?: string | null;
};

export type CriterionDisplayInput = {
  criterion: Criterion;
  application?: Partial<ApplicationState> | null;
  completion?: CriterionCompletionItem | null;
  reviewTask?: {
    criterion?: Criterion;
    status?: string | null;
    decision?: string | null;
    officerNote?: string | null;
    decisionReason?: string | null;
    supplementRequestJson?: {
      reason?: string;
      deadline?: string | null;
      requestedFields?: string[];
      [key: string]: unknown;
    } | null;
  } | null;
  supplementRequest?: {
    criterion?: Criterion;
    reason?: string | null;
    deadline?: string | null;
    requestedFields?: string[];
  } | null;
  precheckAction?: PrecheckNextAction | null;
};

export type RequirementGroupPresentation = {
  key: string;
  label: string;
  description: string;
  progressLabel: string;
  helper?: string;
  tone: PresentationTone;
  selectedCount: number;
  requiredCount: number;
};

export type RequirementPresentation = {
  key: string;
  label: string;
  description?: string;
  isFallback: boolean;
};

export type EvidenceDisplayModel = {
  title: string;
  typeLabel: string;
  sourceLabel: string;
  statusLabel: string;
  tone: PresentationTone;
  warning?: string;
  primaryAction?: PresentationAction;
  secondaryActions: PresentationAction[];
  originalFilename?: string;
};

export type EvidenceDisplayInput = {
  evidence?: Partial<EvidenceResponse> | null;
  response?: {
    requirementKey?: string | null;
    responseKind?: string | null;
    status?: string | null;
    source?: string | null;
    [key: string]: unknown;
  } | null;
  requirement?: RequirementItem | null;
};

export type RequirementLike = Partial<RequirementItem> & {
  key: string;
  title?: string;
};

export type RequirementGroupLike = Partial<RequirementGroup> & {
  key: string;
  requirements?: RequirementLike[];
};
