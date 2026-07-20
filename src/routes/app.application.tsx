import { createFileRoute } from "@tanstack/react-router";
import { StudentApplicationActionWorkspace } from "@/features/application/components/StudentApplicationActionWorkspace";
import { validateStudentApplicationSearch } from "@/features/application/route-search";
import {
  selectStudentApplicationSurface,
  StudentApplicationWorkspaceV2,
} from "@/features/application/ui-v2";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";
import { STUDENT_APPLICATION_UI_V2 } from "@/lib/student-application-ui-v2";

export const Route = createFileRoute("/app/application")({
  validateSearch: validateStudentApplicationSearch,
  component: StudentApplicationRoute,
});

function StudentApplicationRoute() {
  const StudentApplicationSurface = selectStudentApplicationSurface(
    STUDENT_APPLICATION_UI_V2,
    StudentApplicationActionWorkspace,
    StudentApplicationWorkspaceV2,
  );

  return (
    <StudentRoleSurface
      student={<StudentApplicationSurface />}
      fallback={<StudentApplicationSurface />}
    />
  );
}
