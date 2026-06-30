import { createFileRoute } from "@tanstack/react-router";
import { EkycIntegration } from "@/features/integration/components/EkycIntegration";

export const Route = createFileRoute("/app/ekyc")({
  component: EkycIntegration,
});
