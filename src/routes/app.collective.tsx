import { createFileRoute } from "@tanstack/react-router";
import { CollectiveWorkspace } from "@/features/collective/components/CollectiveWorkspace";

export const Route = createFileRoute("/app/collective")({
  component: CollectiveWorkspace,
});
