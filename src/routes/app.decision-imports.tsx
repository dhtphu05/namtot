import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { DecisionImportList } from "@/features/decision-import/components/DecisionImportList";

export const Route = createFileRoute("/app/decision-imports")({
  component: DecisionImportRoute,
});

function DecisionImportRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname !== "/app/decision-imports") {
    return <Outlet />;
  }

  return <DecisionImportList />;
}
