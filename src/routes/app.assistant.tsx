import { createFileRoute } from "@tanstack/react-router";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";
import { StudentSupport } from "@/features/core/components/StudentSupport";

export const Route = createFileRoute("/app/assistant")({
  component: () => (
    <StudentRoleSurface student={<StudentSupport />} fallback={<StudentSupport />} />
  ),
});
