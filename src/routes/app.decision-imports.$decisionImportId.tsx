import { createFileRoute } from "@tanstack/react-router";
import { DecisionImportDetail } from "@/features/decision-import/components/DecisionImportDetail";

export const Route = createFileRoute("/app/decision-imports/$decisionImportId")({
  component: DecisionImportDetailRoute,
});

function DecisionImportDetailRoute() {
  const { decisionImportId } = Route.useParams();
  return <DecisionImportDetail importId={decisionImportId} />;
}
