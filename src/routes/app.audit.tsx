import { createFileRoute } from "@tanstack/react-router";

import { TopBar } from "@/components/layout/TopBar";
import { AuditTimeline } from "@/features/audit/components/AuditTimeline";

export const Route = createFileRoute("/app/audit")({
  component: StaffAuditRoute,
});

function StaffAuditRoute() {
  return (
    <>
      <TopBar title="Audit Log" subtitle="Theo dõi các thao tác trong hệ thống" />
      <AuditTimeline limit={50} />
    </>
  );
}
