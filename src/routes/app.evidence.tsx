import { createFileRoute } from "@tanstack/react-router";
import { EvidenceWorkspaceSafe } from "@/features/evidence/components/EvidenceWorkspace";

export const Route = createFileRoute("/app/evidence")({
  component: EvidenceWorkspaceSafe,
});
