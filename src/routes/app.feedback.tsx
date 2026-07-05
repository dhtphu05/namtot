import { createFileRoute } from "@tanstack/react-router";
import { Notifications } from "@/features/notifications/components/Notifications";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";

export const Route = createFileRoute("/app/feedback")({
  component: () => <StudentRoleSurface student={<Notifications />} fallback={<Notifications />} />,
});
