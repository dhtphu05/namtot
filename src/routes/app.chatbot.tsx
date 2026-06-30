import { createFileRoute } from "@tanstack/react-router";
import { Chatbot } from "@/features/ai/components/Chatbot";

export const Route = createFileRoute("/app/chatbot")({
  component: Chatbot,
});
