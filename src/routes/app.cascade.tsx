import { createFileRoute } from "@tanstack/react-router";
import { CascadeReview } from "@/features/review/components/CascadeReview";

export const Route = createFileRoute("/app/cascade")({
  component: CascadeReview,
});
