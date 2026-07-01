import { createFileRoute } from "@tanstack/react-router";
import { Notifications } from "@/features/notifications/components/Notifications";

export const Route = createFileRoute("/app/notifications")({
  component: Notifications,
});
