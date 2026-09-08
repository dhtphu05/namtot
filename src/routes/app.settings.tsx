import { createFileRoute } from "@tanstack/react-router";
import { CriteriaSettingsOverviewPage } from "@/features/committee-settings/components/CriteriaSettingsOverviewPage";
import { requireAuthenticatedAppRoute } from "@/features/auth/route-guard";

export const Route = createFileRoute("/app/settings")({
  beforeLoad: ({ context, location }) =>
    requireAuthenticatedAppRoute(location.pathname, context.queryClient),
  component: CriteriaSettingsOverviewPage,
});
