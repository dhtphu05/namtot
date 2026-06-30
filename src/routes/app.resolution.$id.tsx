import { createFileRoute } from "@tanstack/react-router";
import { ResolutionDetails } from "@/features/resolution/components/ResolutionDetails";

export const Route = createFileRoute("/app/resolution/$id")({
  component: ResolutionDetails,
});
