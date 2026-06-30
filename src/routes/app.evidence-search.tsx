import { createFileRoute } from "@tanstack/react-router";
import { EvidenceSearch } from "@/features/evidence/components/EvidenceSearch";

export const Route = createFileRoute("/app/evidence-search")({
  component: EvidenceSearch,
});
