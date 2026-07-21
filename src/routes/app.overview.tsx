import { createFileRoute } from "@tanstack/react-router";
import { StudentOverviewV2 } from "@/features/application/ui-v2";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";

export const Route = createFileRoute("/app/overview")({
  component: StudentOverviewRoute,
});

function StudentOverviewRoute() {
  return <StudentRoleSurface student={<StudentOverviewV2 />} fallback={<StudentOverviewV2 />} />;
}
