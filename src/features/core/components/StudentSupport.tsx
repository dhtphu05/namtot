import { useRouterState } from "@tanstack/react-router";
import { StudentAssistantExplanation } from "@/features/student-assistant/components/StudentAssistantExplanation";
import type {
  StudentAssistantContextParams,
  StudentAssistantContextType,
} from "@/features/student-assistant/api/student-assistant";
import type { Criterion } from "@/lib/api/types";

type AssistantSearch = {
  contextType?: StudentAssistantContextType;
  contextId?: string;
  applicationId?: string;
  criterion?: Criterion;
  evidenceId?: string;
  eventId?: string;
  reviewTaskId?: string;
  source?: string;
};

export function StudentSupport() {
  const search = useRouterState({ select: (state) => state.location.search }) as AssistantSearch;
  const params = buildAssistantParams(search);

  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-4 py-5">
      <header>
        <p className="text-[12px] font-semibold uppercase leading-[17px] text-[var(--student-v2-text-muted)]">
          Trợ lý theo ngữ cảnh
        </p>
        <h1 className="mt-1 text-[28px] font-bold leading-9 text-[var(--student-v2-text-primary)]">
          Hỏi trợ lý 5Tốt
        </h1>
        <p className="mt-1 max-w-3xl text-[14px] leading-[22px] text-[var(--student-v2-text-secondary)]">
          Trợ lý chỉ giải thích quy định và dữ liệu trong ngữ cảnh hồ sơ hiện tại, rồi hướng dẫn bạn
          đến đúng công cụ. Quyết định chính thức vẫn do cán bộ hoặc Hội đồng xác nhận.
        </p>
      </header>

      <StudentAssistantExplanation
        params={params}
        title={assistantTitle(params.contextType)}
        className="border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)]"
      />
    </div>
  );
}

function buildAssistantParams(search: AssistantSearch): StudentAssistantContextParams {
  const contextType = inferContextType(search);
  return {
    contextType,
    contextId:
      search.contextId ??
      search.evidenceId ??
      search.eventId ??
      search.reviewTaskId ??
      search.applicationId ??
      "current",
    applicationId: search.applicationId,
    criterion: search.criterion,
    evidenceId: search.evidenceId,
    eventId: search.eventId,
    reviewTaskId: search.reviewTaskId,
  };
}

function inferContextType(search: AssistantSearch): StudentAssistantContextType {
  if (search.contextType) return search.contextType;
  if (search.evidenceId) return "evidence_card";
  if (search.eventId) return "event_registry";
  if (search.reviewTaskId) return "supplement";
  if (search.criterion || search.source === "criterion") return "precheck";
  return "dashboard";
}

function assistantTitle(contextType: StudentAssistantContextType) {
  if (contextType === "evidence_card") return "Hỏi về minh chứng này";
  if (contextType === "precheck") return "Giải thích tiền kiểm";
  if (contextType === "event_registry") return "Hỏi về sự kiện được gợi ý";
  if (contextType === "supplement") return "Trợ lý bổ sung hồ sơ";
  return "Trợ lý theo hồ sơ";
}
