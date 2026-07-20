import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/features/application/components/Dashboard";
import { StudentOverview } from "@/features/application/components/StudentOverview";
import { selectStudentApplicationSurface, StudentOverviewV2 } from "@/features/application/ui-v2";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";
import { STUDENT_APPLICATION_UI_V2 } from "@/lib/student-application-ui-v2";

export const Route = createFileRoute("/app/")({
  component: AppIndexRoute,
});

function AppIndexRoute() {
  const StudentOverviewSurface = selectStudentApplicationSurface(
    STUDENT_APPLICATION_UI_V2,
    StudentOverview,
    StudentOverviewV2,
  );

  return <StudentRoleSurface student={<StudentOverviewSurface />} fallback={<Dashboard />} />;
}
