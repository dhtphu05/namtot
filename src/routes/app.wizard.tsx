import { createFileRoute } from "@tanstack/react-router";
import { StudentApplicationWorkspace } from "@/features/application/components/StudentApplicationWorkspace";
import { Wizard } from "@/features/application/components/Wizard";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";

export const Route = createFileRoute("/app/wizard")({
  component: () => (
    <StudentRoleSurface
      student={<StudentApplicationWorkspace initialTab="info" />}
      fallback={<Wizard />}
    />
  ),
});
