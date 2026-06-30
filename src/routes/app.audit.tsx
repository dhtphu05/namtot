import { createFileRoute } from "@tanstack/react-router";
import { AuditLogs } from "@/features/core/components/AuditLogs";

export const Route = createFileRoute("/app/audit")({
  component: AuditLogs,
});
