import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/features/application/components/Dashboard";
import { StudentOverviewV2 } from "@/features/application/ui-v2";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";

export const Route = createFileRoute("/app/")({
  component: AppIndexRoute,
});

function AppIndexRoute() {
  return <StudentRoleSurface student={<StudentOverviewV2 />} fallback={<Dashboard />} />;
}
