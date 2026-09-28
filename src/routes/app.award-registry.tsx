import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { requireAuthenticatedAppRoute } from "@/features/auth/route-guard";
import { AwardDecisionList } from "@/features/award-registry/components/AwardDecisionList";

export const Route = createFileRoute("/app/award-registry")({
  beforeLoad: ({ context }) =>
    requireAuthenticatedAppRoute("/app/award-registry", context.queryClient),
  component: AwardRegistryRoute,
});

function AwardRegistryRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== "/app/award-registry") return <Outlet />;
  return <AwardDecisionList />;
}
