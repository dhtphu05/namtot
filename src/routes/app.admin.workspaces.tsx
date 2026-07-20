import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { requireAuthenticatedAppRoute } from "@/features/auth/route-guard";
import { AdminWorkspacesPage } from "@/features/admin-workspace/components/AdminWorkspacesPage";

export const Route = createFileRoute("/app/admin/workspaces")({
  beforeLoad: ({ context }) =>
    requireAuthenticatedAppRoute("/app/admin/workspaces", context.queryClient),
  component: AdminWorkspacesRoute,
});

function AdminWorkspacesRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname !== "/app/admin/workspaces") {
    return <Outlet />;
  }

  return <AdminWorkspacesPage />;
}
