import { createFileRoute } from "@tanstack/react-router";
import { Chatbot } from "@/features/ai/components/Chatbot";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";
import { StudentSupport } from "@/features/core/components/StudentSupport";

export const Route = createFileRoute("/app/chatbot")({
  component: () => <StudentRoleSurface student={<StudentSupport />} fallback={<Chatbot />} />,
});
