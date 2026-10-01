import { createFileRoute } from "@tanstack/react-router";

import { TopBar } from "@/components/layout/TopBar";
import { AuditTimeline } from "@/features/audit/components/AuditTimeline";
import { useAuth } from "@/features/auth/store/auth-store";

export const Route = createFileRoute("/app/audit")({
  component: StaffAuditRoute,
});

function StaffAuditRoute() {
  const role = useAuth((state) => state.user?.role);
  return (
    <>
      <TopBar
        title="Nhật ký hoạt động"
        subtitle="Theo dõi các thay đổi trong quá trình xét duyệt hồ sơ."
      />
      <AuditTimeline limit={50} simpleLanguage={role === "city_committee"} />
    </>
  );
}
