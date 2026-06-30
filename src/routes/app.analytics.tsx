import { createFileRoute } from "@tanstack/react-router";
import { Analytics } from "@/features/core/components/Analytics";

export const Route = createFileRoute("/app/analytics")({
  component: Analytics,
});
