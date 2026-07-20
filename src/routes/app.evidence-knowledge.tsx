import { createFileRoute } from "@tanstack/react-router";
import { OfficerEvidenceKnowledgePage } from "@/features/evidence-knowledge/components/OfficerEvidenceKnowledgePage";
import { requireAuthenticatedAppRoute } from "@/features/auth/route-guard";

type EvidenceKnowledgeSearch = {
  q?: string;
};

export const Route = createFileRoute("/app/evidence-knowledge")({
  beforeLoad: ({ context, location }) =>
    requireAuthenticatedAppRoute(location.pathname, context.queryClient),
  validateSearch: (search: Record<string, unknown>): EvidenceKnowledgeSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  component: OfficerEvidenceKnowledgePage,
});
