import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedAppRoute } from "@/features/auth/route-guard";
import { AwardDecisionDetail } from "@/features/award-registry/components/AwardDecisionDetail";

export const Route = createFileRoute("/app/award-registry/$awardDecisionId")({
  beforeLoad: ({ context }) =>
    requireAuthenticatedAppRoute("/app/award-registry", context.queryClient),
  component: AwardDecisionDetailRoute,
});

function AwardDecisionDetailRoute() {
  const { awardDecisionId } = Route.useParams();
  return <AwardDecisionDetail decisionId={awardDecisionId} />;
}
