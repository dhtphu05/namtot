import type { StudentAssistantContext } from "@/features/application/api/student-assistant";
import type { Level } from "@/lib/api/types";

type FallbackApplication = {
  id?: string | null;
  status?: string | null;
  targetLevel?: Level | null;
  readinessScore?: number | null;
};

export function buildDashboardAssistantFallback({
  application,
  firstName,
  schoolYear,
}: {
  application?: FallbackApplication | null;
  firstName: string;
  schoolYear: string;
}): StudentAssistantContext {
  const hasApplication = Boolean(application?.id);
  const actionType = hasApplication ? "continue_application" : "start_application";
  return {
    contextVersion: `frontend-fallback-${schoolYear}`,
    generatedAt: new Date(0).toISOString(),
    state: hasApplication ? "draft_in_progress" : "new_user",
    greeting: {
      title: `Xin chào, ${firstName}`,
      deterministicMessage: "Chưa tải được gợi ý mới. Bạn vẫn có thể tiếp tục với hồ sơ.",
    },
    application: {
      id: application?.id ?? null,
      status: application?.status ?? "not_started",
      targetLevel: application?.targetLevel ?? null,
      readinessScore: application?.readinessScore ?? null,
      precheckIsStale: false,
    },
    criterionSummary: [],
    nextBestAction: {
      id: `frontend-fallback:${actionType}`,
      type: actionType,
      priority: 999,
      title: hasApplication ? "Tiếp tục hồ sơ" : "Bắt đầu hồ sơ",
      deterministicDescription: "Gợi ý tạm thời trong lúc hệ thống chưa phản hồi.",
      ctaLabel: hasApplication ? "Mở hồ sơ" : "Bắt đầu",
      destination: { route: "/app/application" },
      applicationId: application?.id ?? "current",
      reasonCode: "frontend_fallback_api_error",
    },
    secondaryInsights: [],
    narrative: {
      streamingAvailable: false,
      fallbackText:
        "Không thể tải lời gợi ý mới nhất. Bạn vẫn có thể mở hồ sơ hiện tại hoặc bắt đầu hồ sơ mới.",
    },
  };
}
