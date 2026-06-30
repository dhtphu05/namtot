import { createFileRoute } from "@tanstack/react-router";
import { TaskAssignment } from "@/features/review/components/TaskAssignment";

export const Route = createFileRoute("/app/assignment")({
  component: TaskAssignment,
});
