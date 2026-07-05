import { createFileRoute } from "@tanstack/react-router";
import { StudentApplicationActionWorkspace } from "@/features/application/components/StudentApplicationActionWorkspace";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";

export const Route = createFileRoute("/app/application")({
  component: () => (
    <StudentRoleSurface
      student={<StudentApplicationActionWorkspace />}
      fallback={<StudentApplicationActionWorkspace />}
    />
  ),
});
