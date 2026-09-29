import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedAppRoute } from "@/features/auth/route-guard";
import { AdminUsersPage } from "@/features/admin-users/components/AdminUsersPage";

export const Route = createFileRoute("/app/admin/officers")({
  beforeLoad: ({ context }) =>
    requireAuthenticatedAppRoute("/app/admin/officers", context.queryClient),
  component: () => <AdminUsersPage officersOnly />,
});
