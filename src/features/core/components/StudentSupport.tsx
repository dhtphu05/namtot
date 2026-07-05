import { SmartbotPanel } from "@/features/chatbot/components/SmartbotPanel";
import { useCurrentApplication } from "@/features/application/hooks/useApplication";

const SCHOOL_YEAR = "2025-2026";

export function StudentSupport() {
  const current = useCurrentApplication(SCHOOL_YEAR);
  const applicationId = current.data?.application?.id;

  return (
    <SmartbotPanel
      title="Hỗ trợ"
      subtitle="Hỏi nhanh về hồ sơ, minh chứng, hạn bổ sung và bước tiếp theo. Kết quả chính thức do cán bộ/Hội đồng xác nhận."
      applicationId={applicationId}
      contextScope="student_helpdesk"
      pageContext={{ page: "dashboard" }}
    />
  );
}
