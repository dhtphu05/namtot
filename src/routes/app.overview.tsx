import { createFileRoute } from "@tanstack/react-router";
import { StudentOverview } from "@/features/application/components/StudentOverview";
import { selectStudentApplicationSurface, StudentOverviewV2 } from "@/features/application/ui-v2";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";
import { STUDENT_APPLICATION_UI_V2 } from "@/lib/student-application-ui-v2";

export const Route = createFileRoute("/app/overview")({
  component: StudentOverviewRoute,
});

function StudentOverviewRoute() {
  const StudentOverviewSurface = selectStudentApplicationSurface(
    STUDENT_APPLICATION_UI_V2,
    StudentOverview,
    StudentOverviewV2,
  );

  return (
    <StudentRoleSurface
      student={<StudentOverviewSurface />}
      fallback={<StudentOverviewSurface />}
    />
  );
}
