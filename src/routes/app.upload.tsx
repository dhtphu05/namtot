import { createFileRoute } from "@tanstack/react-router";
import { EvidenceWorkspaceSafe } from "@/features/evidence/components/EvidenceWorkspace";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";

export const Route = createFileRoute("/app/upload")({
  component: () => (
    <StudentRoleSurface student={<EvidenceWorkspaceSafe />} fallback={<EvidenceWorkspaceSafe />} />
  ),
});
