import { createFileRoute } from "@tanstack/react-router";
import { AiPrecheck } from "@/features/ai/components/AiPrecheck";
import { StudentPrecheckReviewPage } from "@/features/application/s5/StudentPrecheckReviewPage";
import { StudentRoleSurface } from "@/features/core/components/StudentRoleSurface";

export const Route = createFileRoute("/app/ai-precheck")({
  component: () => (
    <StudentRoleSurface student={<StudentPrecheckReviewPage />} fallback={<AiPrecheck />} />
  ),
});
