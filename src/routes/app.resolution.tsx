import { createFileRoute } from "@tanstack/react-router";
import { ResolutionHub } from "@/features/resolution/components/ResolutionHub";

export const Route = createFileRoute("/app/resolution")({
  component: ResolutionHub,
});
