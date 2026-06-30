import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "@/features/core/components/Settings";

export const Route = createFileRoute("/app/settings")({
  component: Settings,
});
