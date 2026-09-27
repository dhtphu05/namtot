import { useAuth } from "@/features/auth/store/auth-store";
import { SmartbotPanel } from "@/features/chatbot/components/SmartbotPanel";
import type { ChatbotContextScope } from "@/features/chatbot/types";

export function Chatbot() {
  const role = useAuth((state) => state.user?.role);

  return (
    <SmartbotPanel
      title="Chatbot SV5T"
      subtitle="VNPT Smartbot hỗ trợ theo ngữ cảnh quy trình. Smartbot không chấm hay chốt kết quả chính thức."
      contextScope={scopeForRole(role)}
    />
  );
}

function scopeForRole(role?: string): ChatbotContextScope {
  if (role === "officer" || role === "city_officer") return "reviewer_copilot";
  if (role === "manager" || role === "city_manager") return "manager_assistant";
  if (role === "committee" || role === "city_committee" || role === "admin")
    return "committee_assistant";
  return "student_helpdesk";
}
