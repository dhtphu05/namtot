import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const corsHeaders = {
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "access-control-allow-origin": "*",
};

const read = (path: string) => readFileSync(path, "utf8");

test.describe("Staff contract alignment", () => {
  test("keeps canonical audit and role contract sources", () => {
    const auditApi = read("src/features/audit/api/audit.ts");
    const decisionImportApi = read("src/features/decision-import/api/decision-import.ts");
    const navigation = read("src/lib/role-navigation.ts");
    const routeGuard = read("src/features/auth/route-guard.ts");
    const reviewPanel = read("src/features/review/components/ReviewDecisionPanel.tsx");

    expect(auditApi).toContain("/api/audit/logs");
    expect(auditApi).not.toContain("getEntityAudit");
    expect(decisionImportApi).not.toContain("getEntityAudit");

    const committeeBlock = navigation.slice(
      navigation.indexOf("  committee: ["),
      navigation.indexOf("  city_manager: ["),
    );
    expect(committeeBlock).not.toContain('to: "/app/assignment"');
    expect(committeeBlock).not.toContain('to: "/app/decision-imports"');
    expect(committeeBlock).not.toContain('to: "/app/settings"');

    expect(routeGuard).toContain('pathname === "/app/committee/inbox"');
    expect(routeGuard).toContain('"city_committee"');
    const precedentGuard = reviewPanel.slice(
      reviewPanel.indexOf("const canSearchPrecedents"),
      reviewPanel.indexOf("const evidenceOptions"),
    );
    expect(precedentGuard).toContain('["officer", "manager", "committee", "admin"]');
    expect(precedentGuard).not.toContain('"city_officer"');
    expect(precedentGuard).not.toContain('"city_manager"');
  });

  test("uses the City-capable Committee Inbox endpoint for City Committee", async ({ page }) => {
    const requests: string[] = [];
    const user = {
      id: "city-committee-1",
      email: "committee@danang.gov.vn",
      fullName: "Hội đồng thành phố",
      role: "city_committee",
      workspaceId: "danang-city",
      isActive: true,
      officerSpecializations: [],
    };

    await page.route("http://localhost:8080/api/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
        return;
      }
      if (path === "/api/committee/inbox" || path === "/api/manager/committee-inbox") {
        requests.push(path);
      }
      const data =
        path === "/api/me"
          ? user
          : path === "/api/manager/committee-inbox"
            ? {
                summary: {
                  readyToFinalize: 0,
                  downgraded: 0,
                  noEligibleLevel: 0,
                  needsResolution: 0,
                  supplementRequired: 0,
                  overdue: 0,
                  recentlyFinalized: 0,
                },
                items: [],
                pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
              }
            : null;
      await route.fulfill({
        status: 200,
        headers: { ...corsHeaders, "content-type": "application/json" },
        body: JSON.stringify({ success: true, data, error: null, meta: {} }),
      });
    });

    await page.addInitScript(
      (auth) =>
        window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 })),
      { user, accessToken: "city-committee-token", refreshToken: "city-committee-refresh" },
    );

    await page.goto("/app/committee/inbox", { waitUntil: "domcontentloaded" });

    await expect.poll(() => requests).toContain("/api/manager/committee-inbox");
    expect(requests).not.toContain("/api/committee/inbox");
  });

  test("Staff Audit screen calls the real collection endpoint", async ({ page }) => {
    const auditRequests: string[] = [];
    const user = {
      id: "admin-1",
      email: "admin@example.test",
      fullName: "Admin",
      role: "admin",
      workspaceId: null,
      isActive: true,
      officerSpecializations: [],
    };

    await page.route("http://localhost:8080/api/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
        return;
      }
      if (path.startsWith("/api/audit")) auditRequests.push(path);
      const data = path === "/api/me" ? user : path === "/api/audit/logs" ? { items: [] } : null;
      await route.fulfill({
        status: 200,
        headers: { ...corsHeaders, "content-type": "application/json" },
        body: JSON.stringify({ success: true, data, error: null, meta: {} }),
      });
    });

    await page.addInitScript(
      (auth) =>
        window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 })),
      { user, accessToken: "admin-token", refreshToken: "admin-refresh" },
    );

    await page.goto("/app/audit", { waitUntil: "domcontentloaded" });

    await expect.poll(() => auditRequests).toContain("/api/audit/logs");
    expect(auditRequests).not.toContain("/api/audit");
  });
});
