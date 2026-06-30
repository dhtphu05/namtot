import { createFileRoute } from "@tanstack/react-router";
import { VnptIntegration } from "@/features/integration/components/VnptIntegration";

export const Route = createFileRoute("/app/vnpt")({
  component: VnptIntegration,
});
