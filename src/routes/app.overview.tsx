import { createFileRoute } from "@tanstack/react-router";
import { StudentOverview } from "@/features/application/components/StudentOverview";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";

export const Route = createFileRoute("/app/overview")({
  component: () => (
    <StudentRoleSurface student={<StudentOverview />} fallback={<StudentOverview />} />
  ),
});
