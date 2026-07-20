import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/features/core/components/AppLayout";
import { requireAuthenticatedAppRoute } from "@/features/auth/route-guard";

export const Route = createFileRoute("/app")({
  beforeLoad: ({ context, location }) =>
    requireAuthenticatedAppRoute(location.pathname, context.queryClient),
  component: AppLayout,
});
