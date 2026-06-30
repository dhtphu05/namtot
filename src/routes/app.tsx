import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/features/core/components/AppLayout";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});
