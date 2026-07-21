import { createFileRoute } from "@tanstack/react-router";
import { validateStudentApplicationSearch } from "@/features/application/route-search";
import { StudentApplicationWorkspaceV2 } from "@/features/application/ui-v2";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";

export const Route = createFileRoute("/app/application")({
  validateSearch: validateStudentApplicationSearch,
  component: StudentApplicationRoute,
});

function StudentApplicationRoute() {
  return (
    <StudentRoleSurface
      student={<StudentApplicationWorkspaceV2 />}
      fallback={<StudentApplicationWorkspaceV2 />}
    />
  );
}
