import { createFileRoute } from "@tanstack/react-router";
import { Wizard } from "@/features/application/components/Wizard";

export const Route = createFileRoute("/app/wizard")({
  component: Wizard,
});
