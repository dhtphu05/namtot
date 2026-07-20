import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedAppRoute } from "@/features/auth/route-guard";
import { AdminWorkspaceDetailPage } from "@/features/admin-workspace/components/AdminWorkspaceDetailPage";

export const Route = createFileRoute("/app/admin/workspaces/$workspaceId")({
  beforeLoad: ({ context }) =>
    requireAuthenticatedAppRoute("/app/admin/workspaces", context.queryClient),
  component: AdminWorkspaceDetailRoute,
});

function AdminWorkspaceDetailRoute() {
  const { workspaceId } = Route.useParams();
  return <AdminWorkspaceDetailPage workspaceId={workspaceId} />;
}
