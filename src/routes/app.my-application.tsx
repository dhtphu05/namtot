import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/my-application")({
  beforeLoad: () => {
    throw redirect({ to: "/app/application" });
  },
});
