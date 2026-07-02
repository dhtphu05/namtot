import { createFileRoute } from "@tanstack/react-router";
import { AiPrecheck } from "@/features/ai/components/AiPrecheck";
import { StudentApplicationWorkspace } from "@/features/application/components/StudentApplicationWorkspace";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";

export const Route = createFileRoute("/app/ai-precheck")({
  component: () => (
    <StudentRoleSurface
      student={<StudentApplicationWorkspace initialTab="precheck" />}
      fallback={<AiPrecheck />}
    />
  ),
});
