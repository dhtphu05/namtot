import { createFileRoute } from "@tanstack/react-router";
import { ApprovedEvidencePage } from "@/features/event/components/ApprovedEvidencePage";

export const Route = createFileRoute("/app/event-library")({
  validateSearch: (search) => ({
    q: typeof search.q === "string" ? search.q : undefined,
    criterion: typeof search.criterion === "string" ? search.criterion : undefined,
  }),
  component: ApprovedEvidencePage,
});
