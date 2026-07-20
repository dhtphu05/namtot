import { SmartbotPanel } from "@/features/chatbot/components/SmartbotPanel";
import { useCurrentApplication } from "@/features/application/hooks/useApplication";

const SCHOOL_YEAR = "2025-2026";

export function StudentSupport() {
  const current = useCurrentApplication(SCHOOL_YEAR);
  const applicationId = current.data?.application?.id;

  return (
    <SmartbotPanel
      title="Trợ lý hồ sơ"
      subtitle="Trợ lý hướng dẫn theo quy định và ngữ cảnh hồ sơ hiện tại. Quyết định chính thức vẫn do cán bộ hoặc Hội đồng xác nhận."
      applicationId={applicationId}
      contextScope="student_helpdesk"
      pageContext={{ page: "dashboard" }}
    />
  );
}
