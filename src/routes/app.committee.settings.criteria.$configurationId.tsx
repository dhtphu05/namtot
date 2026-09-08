import { createFileRoute } from "@tanstack/react-router";
import { CriteriaConfigurationEditorPage } from "@/features/committee-settings/components/CriteriaConfigurationEditorPage";
import { requireAuthenticatedAppRoute } from "@/features/auth/route-guard";

export const Route = createFileRoute("/app/committee/settings/criteria/$configurationId")({
  beforeLoad: ({ context, location }) =>
    requireAuthenticatedAppRoute(location.pathname, context.queryClient),
  validateSearch: (search: Record<string, unknown>) => ({
    section: typeof search.section === "string" ? search.section : undefined,
  }),
  component: CriteriaConfigurationRoute,
});

function CriteriaConfigurationRoute() {
  const { configurationId } = Route.useParams();
  const { section } = Route.useSearch();
  return <CriteriaConfigurationEditorPage configurationId={configurationId} section={section} />;
}
