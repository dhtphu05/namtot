import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedAppRoute } from "@/features/auth/route-guard";
import { AdminUsersPage } from "@/features/admin-users/components/AdminUsersPage";

export const Route = createFileRoute("/app/admin/users")({
  beforeLoad: ({ context }) =>
    requireAuthenticatedAppRoute("/app/admin/users", context.queryClient),
  component: () => <AdminUsersPage />,
});
