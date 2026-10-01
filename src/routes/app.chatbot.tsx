import { createFileRoute, redirect } from "@tanstack/react-router";
import { STUDENT_ASSISTANT_UI_ENABLED } from "@/lib/student-assistant-ui";

export const Route = createFileRoute("/app/chatbot")({
  beforeLoad: () => {
    if (STUDENT_ASSISTANT_UI_ENABLED) {
      throw redirect({
        to: "/app/assistant",
        search: {
          source: undefined,
          applicationId: undefined,
          status: undefined,
          criterionKey: undefined,
          criterionLabel: undefined,
          feedbackId: undefined,
          message: undefined,
          nextActions: undefined,
          contextType: undefined,
          contextId: undefined,
          criterion: undefined,
          evidenceId: undefined,
          eventId: undefined,
          reviewTaskId: undefined,
        },
      });
    }
    throw redirect({ to: "/app" });
  },
});
