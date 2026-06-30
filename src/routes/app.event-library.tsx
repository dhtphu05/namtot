import { createFileRoute } from "@tanstack/react-router";
import { EventLibrary } from "@/features/event/components/EventLibrary";

export const Route = createFileRoute("/app/event-library")({
  component: EventLibrary,
});
