import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/features/application/components/Dashboard";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});
