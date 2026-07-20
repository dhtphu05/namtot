import type { Criterion } from "@/lib/api/types";

export type ChatbotContextScope =
  "student_helpdesk" | "reviewer_copilot" | "manager_assistant" | "committee_assistant";

export type ChatbotPage =
  | "dashboard"
  | "evidence"
  | "precheck"
  | "matching_hub"
  | "chatbot"
  | "cascade"
  | "review_task"
  | "manager_dashboard"
  | "resolution_hub";

export type ChatbotPageContext = {
  page?: ChatbotPage;
  criterion?: Criterion;
  evidenceId?: string;
  taskId?: string;
  resolutionCaseId?: string;
};

export type SmartbotAction = {
  id: string;
  label: string;
  type: "navigate" | "postback" | "execute";
  actionType?: "postback" | "web_url" | "phone_number" | "internal_action";
  toolName?: string;
  payload?: string;
  route?: string;
  url?: string;
  phoneNumber?: string;
  query?: Record<string, string>;
  requiresConfirmation: boolean;
  status?: "pending" | "confirmed" | "executed" | "cancelled" | "failed";
  expiresAt?: string;
};

export type ChatbotActionExecutionResult = {
  action: SmartbotAction;
  result?: {
    type: "navigation" | "postback" | "message";
    route?: string | null;
    query?: Record<string, string> | null;
    payload?: unknown;
    message?: string;
  };
  message?: string;
};

export type SmartbotMessageCard = {
  type:
    | "text"
    | "quickreply"
    | "image"
    | "carousel"
    | "handoff"
    | "action_cards"
    | "gap_item"
    | "evidence_summary"
    | "matching_event"
    | "reviewer_draft"
    | "unknown";
  text?: string;
  title?: string;
  subtitle?: string;
  status?: string;
  description?: string;
  url?: string;
  items?: SmartbotMessageCard[];
  buttons?: SmartbotAction[];
};

export type ChatbotResponse = {
  sessionId: string;
  answer: string;
  messages: SmartbotMessageCard[];
  cards: SmartbotMessageCard[];
  actions: SmartbotAction[];
  suggestedQuestions: string[];
  handoffRequired: boolean;
  smartbot: {
    intentName?: string;
    status?: number;
    rawType: string;
  };
};

export type ChatbotMessageRequest = {
  text: string;
  sessionId?: string;
  applicationId?: string;
  contextScope?: ChatbotContextScope;
  pageContext?: ChatbotPageContext;
};
