import { createFileRoute } from "@tanstack/react-router";
import { StudentApplicationWorkspace } from "@/features/application/components/StudentApplicationWorkspace";
import { UploadEvidence } from "@/features/evidence/components/UploadEvidence";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";

export const Route = createFileRoute("/app/upload")({
  component: () => (
    <StudentRoleSurface
      student={<StudentApplicationWorkspace initialTab="criteria" />}
      fallback={<UploadEvidence />}
    />
  ),
});
