import { createFileRoute } from "@tanstack/react-router";
import { ReviewDetails } from "@/features/review/components/ReviewDetails";

export const Route = createFileRoute("/app/review/$id")({
  component: ReviewDetails,
});
