import { expect, test, type Route } from "@playwright/test";

const requests: Array<{ method: string; url: string; body: unknown }> = [];
const corsHeaders = {
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "access-control-allow-origin": "*",
};

test("manager lifecycle API serializes filters and mutation payloads", async ({ page }) => {
  requests.length = 0;
  await page.route("http://localhost:8080/api/**", async (route) => respondToApi(route));
  await page.goto("/login", { waitUntil: "networkidle" });

  await page.evaluate(async () => {
    const { managerApi } = await import("/src/features/manager/api/manager.ts");
    await managerApi.getManagerResults({
      workspaceId: "33333333-3333-4333-8333-333333333333",
      lifecycle: "cancelled",
      archive: "only",
      status: "under_review",
    } as never);
    await managerApi.cancelApplication("application-1", { reason: "Duplicate submission" });
    await managerApi.reopenCancelledApplication("application-1", { reason: "Corrected record" });
    await managerApi.archiveApplication("application-1", { reason: "Season closed" });
    await managerApi.unarchiveApplication("application-1");
  });

  const resultRequest = requests.find((request) => request.url.includes("/api/manager/results?"));
  expect(resultRequest).toBeDefined();
  const resultUrl = new URL(resultRequest!.url);
  expect(resultUrl.searchParams.get("workspaceId")).toBe("33333333-3333-4333-8333-333333333333");
  expect(resultUrl.searchParams.get("lifecycle")).toBe("cancelled");
  expect(resultUrl.searchParams.get("archive")).toBe("only");
  expect(resultUrl.searchParams.get("status")).toBe("under_review");

  expect(requestFor("POST", "/api/manager/applications/application-1/cancel")?.body).toEqual({
    reason: "Duplicate submission",
  });
  expect(
    requestFor("POST", "/api/manager/applications/application-1/reopen-cancelled")?.body,
  ).toEqual({ reason: "Corrected record" });
  expect(requestFor("POST", "/api/manager/applications/application-1/archive")?.body).toEqual({
    reason: "Season closed",
  });
  expect(requestFor("POST", "/api/manager/applications/application-1/unarchive")?.body).toEqual({});
});

function requestFor(method: string, path: string) {
  return requests.find(
    (request) => request.method === method && new URL(request.url).pathname === path,
  );
}

async function respondToApi(route: Route) {
  const request = route.request();
  if (request.method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    return;
  }

  requests.push({
    method: request.method(),
    url: request.url(),
    body: request.postDataJSON() as unknown,
  });
  await route.fulfill({
    status: 200,
    headers: { ...corsHeaders, "content-type": "application/json" },
    body: JSON.stringify({
      success: true,
      data: null,
      error: null,
      meta: { requestId: "lifecycle" },
    }),
  });
}
