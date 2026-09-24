import { createFileRoute } from "@tanstack/react-router";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";
import { StudentSupport } from "@/features/core/components/StudentSupport";

export const Route = createFileRoute("/app/assistant")({
  validateSearch: (search) => ({
    source:
      search.source === "overview" || search.source === "criterion" || search.source === "feedback"
        ? search.source
        : undefined,
    applicationId: typeof search.applicationId === "string" ? search.applicationId : undefined,
    status: typeof search.status === "string" ? search.status : undefined,
    criterionKey: typeof search.criterionKey === "string" ? search.criterionKey : undefined,
    criterionLabel: typeof search.criterionLabel === "string" ? search.criterionLabel : undefined,
    feedbackId: typeof search.feedbackId === "string" ? search.feedbackId : undefined,
    message: typeof search.message === "string" ? search.message : undefined,
    nextActions: typeof search.nextActions === "string" ? search.nextActions : undefined,
    contextType:
      search.contextType === "dashboard" ||
      search.contextType === "evidence_card" ||
      search.contextType === "precheck" ||
      search.contextType === "event_registry" ||
      search.contextType === "supplement"
        ? search.contextType
        : undefined,
    contextId: typeof search.contextId === "string" ? search.contextId : undefined,
    criterion: typeof search.criterion === "string" ? search.criterion : undefined,
    evidenceId: typeof search.evidenceId === "string" ? search.evidenceId : undefined,
    eventId: typeof search.eventId === "string" ? search.eventId : undefined,
    reviewTaskId: typeof search.reviewTaskId === "string" ? search.reviewTaskId : undefined,
  }),
  component: () => (
    <StudentRoleSurface student={<StudentSupport />} fallback={<StudentSupport />} />
  ),
});
