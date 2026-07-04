import { createFileRoute } from "@tanstack/react-router";
import { ApprovedEvidencePage } from "@/features/event/components/ApprovedEvidencePage";

export const Route = createFileRoute("/app/event-library")({
  component: ApprovedEvidencePage,
});
