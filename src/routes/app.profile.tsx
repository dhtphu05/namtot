import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/profile")({
  beforeLoad: () => {
    throw redirect({ to: "/app/application" });
  },
});
