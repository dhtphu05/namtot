import { createFileRoute } from "@tanstack/react-router";
import { Notifications } from "@/features/core/components/Notifications";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";
import { StudentSupport } from "@/features/core/components/StudentSupport";

export const Route = createFileRoute("/app/notifications")({
  component: () => <StudentRoleSurface student={<StudentSupport />} fallback={<Notifications />} />,
});
