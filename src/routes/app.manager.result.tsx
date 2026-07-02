import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/manager/result")({
  beforeLoad: () => {
    throw redirect({ to: "/app/manager/results" });
  },
});
