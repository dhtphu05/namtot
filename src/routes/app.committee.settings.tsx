import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { CriteriaSettingsOverviewPage } from "@/features/committee-settings/components/CriteriaSettingsOverviewPage";
import { requireAuthenticatedAppRoute } from "@/features/auth/route-guard";

export const Route = createFileRoute("/app/committee/settings")({
  beforeLoad: ({ context, location }) =>
    requireAuthenticatedAppRoute(location.pathname, context.queryClient),
  component: CommitteeSettingsRoute,
});

function CommitteeSettingsRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname !== "/app/committee/settings") {
    return <Outlet />;
  }

  return <CriteriaSettingsOverviewPage />;
}
