import { createFileRoute } from "@tanstack/react-router";
import { CollectiveDetails } from "@/features/collective/components/CollectiveDetails";

export const Route = createFileRoute("/app/collective/$id")({
  component: CollectiveDetails,
});
