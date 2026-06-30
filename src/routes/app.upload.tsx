import { createFileRoute } from "@tanstack/react-router";
import { UploadEvidence } from "@/features/evidence/components/UploadEvidence";

export const Route = createFileRoute("/app/upload")({
  component: UploadEvidence,
});
