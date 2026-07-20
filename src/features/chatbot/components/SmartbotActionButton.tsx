import { useNavigate } from "@tanstack/react-router";
import { ExternalLink, Loader2, MessageSquare, Navigation, Play } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui-kit";
import { chatbotApi } from "../api/chatbot";
import type { SmartbotAction } from "../types";

type Props = {
  action: SmartbotAction;
  onPostback: (payload: string, label: string) => void;
};

export function SmartbotActionButton({ action, onPostback }: Props) {
  const nav = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const handleClick = async () => {
    setResultMessage(null);
    if (action.type === "navigate") {
      openNavigation(action, nav);
      return;
    }

    if (action.type === "execute") {
      if (isRunning) return;
      if (action.requiresConfirmation) {
        setConfirmOpen(true);
        return;
      }
      await executeAction(false);
      return;
    }

    onPostback(action.payload ?? action.id, action.label);
  };

  const executeAction = async (confirmed: boolean) => {
    setIsRunning(true);
    try {
      if (confirmed) {
        await chatbotApi.confirmAction(action.id);
      }
      const response = await chatbotApi.executeAction(action.id);
      const result = response.data.result;
      if (result?.type === "navigation") {
        openNavigation(
          { ...action, route: result.route ?? action.route, query: result.query ?? action.query },
          nav,
        );
      } else if (result?.type === "postback") {
        onPostback(extractPostback(result.payload) ?? action.payload ?? action.id, action.label);
      } else if (result?.type === "message" && result.message) {
        setResultMessage(result.message);
      }
    } catch {
      setResultMessage("Hành động này sẽ được bật sau khi có xác nhận nghiệp vụ.");
    } finally {
      setIsRunning(false);
      setConfirmOpen(false);
    }
  };

  const cancelConfirmation = () => {
    setConfirmOpen(false);
    void chatbotApi.cancelAction(action.id).catch(() => undefined);
  };

  const Icon =
    action.type === "navigate" ? Navigation : action.type === "execute" ? Play : MessageSquare;
  const confirmation = confirmationCopy(action);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => void handleClick()}
        disabled={isRunning}
        className="max-w-full rounded-lg"
      >
        {isRunning ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : action.url ? (
          <ExternalLink className="h-3.5 w-3.5" />
        ) : (
          <Icon className="h-3.5 w-3.5" />
        )}
        <span className="min-w-0 truncate">{action.label}</span>
      </Button>
      {resultMessage ? (
        <div className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">
          {resultMessage}
        </div>
      ) : null}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <div className="text-sm font-bold text-brand-deep">{confirmation.title}</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {confirmation.description}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={cancelConfirmation}
                disabled={isRunning}
              >
                Hủy
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void executeAction(true)}
                disabled={isRunning}
              >
                {isRunning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {confirmation.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function confirmationCopy(action: SmartbotAction) {
  if (action.toolName === "createSchoolDemoHandoff" || action.label.includes("Hỏi cán bộ")) {
    return {
      title: "Tạo yêu cầu hỗ trợ cán bộ?",
      description:
        "Yêu cầu này sẽ được gửi để cán bộ phụ trách kiểm tra thêm. Bot không chốt kết quả hồ sơ.",
      confirmLabel: "Tạo yêu cầu",
    };
  }
  if (action.toolName === "addSchoolDemoEvidence" || action.label.includes("Thêm vào hồ sơ")) {
    return {
      title: "Thêm minh chứng vào hồ sơ?",
      description:
        "Hành động này cần xác nhận nghiệp vụ trước khi ghi vào hồ sơ thật. Hệ thống hiện chỉ ghi nhận thao tác xác nhận.",
      confirmLabel: "Xác nhận",
    };
  }
  return {
    title: "Xác nhận thao tác",
    description: `${action.label}. Hệ thống chỉ tạo thao tác xử lý, không chốt kết quả chính thức.`,
    confirmLabel: "Xác nhận",
  };
}

function openNavigation(
  action: Pick<SmartbotAction, "route" | "url" | "query">,
  nav: ReturnType<typeof useNavigate>,
) {
  if (action.url && isSafeExternalUrl(action.url)) {
    window.open(action.url, "_blank", "noopener,noreferrer");
    return;
  }
  if (action.route && isAllowedInternalRoute(action.route)) {
    nav({ to: action.route as never, search: action.query as never });
  }
}

function isSafeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isAllowedInternalRoute(route: string) {
  return [
    "/app",
    "/app/drafts",
    "/app/evidence",
    "/app/ai-precheck",
    "/app/event-library",
    "/app/notifications",
    "/app/review",
    "/app/manager",
    "/app/resolution",
  ].some((prefix) => route === prefix || route.startsWith(`${prefix}/`));
}

function extractPostback(payload: unknown): string | undefined {
  if (typeof payload === "string") return payload;
  if (payload && typeof payload === "object" && "payload" in payload) {
    const value = (payload as { payload?: unknown }).payload;
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}
