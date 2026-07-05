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
  }),
  component: () => (
    <StudentRoleSurface student={<StudentSupport />} fallback={<StudentSupport />} />
  ),
});
