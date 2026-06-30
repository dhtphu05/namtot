import { createFileRoute } from "@tanstack/react-router";
import { AiPrecheck } from "@/features/ai/components/AiPrecheck";

export const Route = createFileRoute("/app/ai-precheck")({
  component: AiPrecheck,
});
