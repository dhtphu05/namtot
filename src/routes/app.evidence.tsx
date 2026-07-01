import { createFileRoute } from "@tanstack/react-router";
import { EvidenceWorkspaceSafe } from "@/features/evidence/components/EvidenceWorkspace";
import { StudentApplicationWorkspace } from "@/features/application/components/StudentApplicationWorkspace";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";

export const Route = createFileRoute("/app/evidence")({
  component: () => (
    <StudentRoleSurface
      student={<StudentApplicationWorkspace initialTab="criteria" />}
      fallback={<EvidenceWorkspaceSafe />}
    />
  ),
});
