import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/features/application/components/Dashboard";
import { StudentOverview } from "@/features/application/components/StudentOverview";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";

export const Route = createFileRoute("/app/")({
  component: () => (
    <StudentRoleSurface
      student={<StudentOverview />}
      fallback={<Dashboard />}
    />
  ),
});
