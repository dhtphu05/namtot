import { createFileRoute } from "@tanstack/react-router";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";
import { StudentFinalResult } from "@/features/student/components/StudentFinalResult";

export const Route = createFileRoute("/app/result")({
  component: () => (
    <StudentRoleSurface student={<StudentFinalResult />} fallback={<StudentFinalResult />} />
  ),
});
