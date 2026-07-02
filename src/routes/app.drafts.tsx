import { createFileRoute } from "@tanstack/react-router";
import { DraftWorkspace } from "@/features/application/components/DraftWorkspace";
import { StudentApplicationWorkspace } from "@/features/application/components/StudentApplicationWorkspace";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";

export const Route = createFileRoute("/app/drafts")({
  component: () => (
    <StudentRoleSurface
      student={<StudentApplicationWorkspace initialTab="info" />}
      fallback={<DraftWorkspace />}
    />
  ),
});
