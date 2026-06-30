import { createFileRoute } from "@tanstack/react-router";
import { EventRegistry } from "@/features/event/components/EventRegistry";

export const Route = createFileRoute("/app/event-registry")({
  component: EventRegistry,
});
