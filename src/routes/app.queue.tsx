import { createFileRoute } from "@tanstack/react-router";
import { ReviewQueue } from "@/features/review/components/ReviewQueue";

export const Route = createFileRoute("/app/queue")({
  component: ReviewQueue,
});
