import { createFileRoute } from "@tanstack/react-router";
import { DraftWorkspace } from "@/features/application/components/DraftWorkspace";

export const Route = createFileRoute("/app/drafts")({
  component: DraftWorkspace,
});
