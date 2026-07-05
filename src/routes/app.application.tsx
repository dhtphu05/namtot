import { createFileRoute } from "@tanstack/react-router";
import { StudentApplicationActionWorkspace } from "@/features/application/components/StudentApplicationActionWorkspace";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";

export const Route = createFileRoute("/app/application")({
  validateSearch: (search) => ({
    criterion: typeof search.criterion === "string" ? search.criterion : undefined,
    evidenceId: typeof search.evidenceId === "string" ? search.evidenceId : undefined,
  }),
  component: () => (
    <StudentRoleSurface
      student={<StudentApplicationActionWorkspace />}
      fallback={<StudentApplicationActionWorkspace />}
    />
  ),
});
