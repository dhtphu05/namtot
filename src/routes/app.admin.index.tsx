import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedAppRoute } from "@/features/auth/route-guard";
import { AdminOperationsPage } from "@/features/admin/components/AdminOperationsPage";

export const Route = createFileRoute("/app/admin/")({
  beforeLoad: ({ context }) => requireAuthenticatedAppRoute("/app/admin", context.queryClient),
  component: AdminOperationsPage,
});
