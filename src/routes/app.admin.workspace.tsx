import { createFileRoute, redirect } from "@tanstack/react-router";
import { requireAuthenticatedAppRoute } from "@/features/auth/route-guard";

export const Route = createFileRoute("/app/admin/workspace")({
  beforeLoad: async ({ context }) => {
    await requireAuthenticatedAppRoute("/app/admin/workspace", context.queryClient);
    throw redirect({ to: "/app/admin/workspaces" });
  },
});
