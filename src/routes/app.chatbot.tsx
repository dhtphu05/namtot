import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/chatbot")({
  beforeLoad: () => {
    throw redirect({ to: "/app/assistant" });
  },
});
