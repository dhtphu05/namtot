import { createFileRoute } from "@tanstack/react-router";
import { ExportData } from "@/features/resolution/components/ExportData";

export const Route = createFileRoute("/app/export")({
  component: ExportData,
});
