import { createFileRoute } from "@tanstack/react-router";
import { CascadeReview } from "@/features/review/components/CascadeReview";
import { StudentApplicationWorkspace } from "@/features/application/components/StudentApplicationWorkspace";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";

export const Route = createFileRoute("/app/cascade")({
  component: () => (
    <StudentRoleSurface
      student={<StudentApplicationWorkspace initialTab="precheck" />}
      fallback={<CascadeReview />}
    />
  ),
});
