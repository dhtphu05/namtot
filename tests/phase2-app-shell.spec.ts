import { expect, test, type Page, type Route } from "@playwright/test";

const roles = [
  { role: "student", path: "/app", nav: "/app/application" },
  { role: "data_uploader", path: "/app/data-uploader", nav: "/app/award-registry" },
  { role: "city_officer", path: "/app/queue", nav: "/app/resolution" },
  { role: "city_manager", path: "/app/analytics", nav: "/app/export" },
  { role: "city_committee", path: "/app/resolution", nav: "/app/audit" },
  { role: "admin", path: "/app/admin/workspaces", nav: "/app/settings" },
] as const;

test.describe("Phase 2 app shell and role navigation", () => {
  for (const fixture of roles) {
    test(`${fixture.role} has the shared shell and role navigation`, async ({ page }) => {
      await loginAs(page, fixture.role);
      await page.goto(fixture.path, { waitUntil: "domcontentloaded" });

      await expect(page.getByRole("link", { name: "Về trang chính 5TOT Đà Nẵng" })).toBeVisible();
      await expect(page.locator("header").getByRole("link", { name: "Thông báo" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Menu tài khoản" })).toBeVisible();
      await expect(page.locator(`aside nav a[href="${fixture.nav}"]`)).toBeVisible();
      if (fixture.role === "student") {
        await expect(
          page.locator('section[aria-label="Ngữ cảnh hệ thống Sinh viên 5 tốt"]'),
        ).not.toContainText("Năm học");
      }

      const routes = await page
        .locator("aside nav a")
        .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
      expect(new Set(routes).size).toBe(routes.length);
    });
  }

  test("keeps legacy officer navigation and route access separate", async ({ page }) => {
    await loginAs(page, "officer");
    await page.goto("/app/queue", { waitUntil: "domcontentloaded" });
    await expect(page.locator("aside nav a[href='/app/evidence-knowledge']")).toBeVisible();
    await page.goto("/app/evidence-knowledge", { waitUntil: "domcontentloaded" });
    await expect.poll(() => new URL(page.url()).pathname).toBe("/app/evidence-knowledge");
  });

  test("criteria screen reads active configs without making a write request", async ({ page }) => {
    const writes: string[] = [];
    await loginAs(page, "admin", writes);
    await page.goto("/app/settings", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Bộ tiêu chí" })).toBeVisible();
    await expect(page.getByText(/không đại diện đầy đủ cho toàn bộ luật runtime/i)).toBeVisible();
    await expect(page.getByText("Đạo đức tốt", { exact: true })).toBeVisible();
    await expect.poll(() => writes.length).toBe(0);

    await expect(page.getByRole("button", { name: /kích hoạt|chỉnh sửa|cập nhật/i })).toHaveCount(
      0,
    );
  });

  test("account menu logout is keyboard reachable and clears the session", async ({ page }) => {
    const writes: string[] = [];
    await loginAs(page, "admin", writes);
    await page.goto("/app/admin/workspaces", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Menu tài khoản" })).toBeVisible();
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Bỏ qua điều hướng" });
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#app-content")).toBeFocused();
    await page.getByRole("button", { name: "Menu tài khoản" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menuitem", { name: "Đăng xuất" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menuitem", { name: "Đăng xuất" })).toHaveCount(0);
    await page.getByRole("button", { name: "Menu tài khoản" }).click();
    await page.getByRole("menuitem", { name: "Đăng xuất" }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
    expect(writes).toContain("POST /api/auth/logout");
  });

  test("shell content remains within target desktop widths and zoom levels", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/app/settings", { waitUntil: "domcontentloaded" });

    for (const width of [1280, 1366, 1440, 1600, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const zoom of [90, 100, 110, 125]) {
        await page.evaluate((scale) => {
          document.documentElement.style.zoom = `${scale}%`;
        }, zoom);
        const dimensions = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          root: document.documentElement.scrollWidth,
          app: document.querySelector<HTMLElement>("#app-content")?.scrollWidth ?? 0,
          appClient: document.querySelector<HTMLElement>("#app-content")?.clientWidth ?? 0,
        }));
        expect(dimensions.root).toBeLessThanOrEqual(dimensions.viewport + 1);
        expect(dimensions.app).toBeLessThanOrEqual(dimensions.appClient + 1);
      }
    }

    await page.evaluate(() => {
      document.documentElement.style.zoom = "100%";
    });
  });
});

async function loginAs(page: Page, role: string, writes: string[] = []) {
  const user = userFor(role);
  await page.route("http://localhost:8080/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      return;
    }
    if (method !== "GET" && method !== "HEAD") writes.push(`${method} ${path}`);
    if (path === "/api/me") {
      await json(route, user);
      return;
    }
    if (path === "/api/auth/logout") {
      await json(route, null);
      return;
    }
    if (path === "/api/notifications") {
      await json(route, []);
      return;
    }
    if (path === "/api/criteria/configs/active") {
      await json(route, { configs: [criteriaConfig] });
      return;
    }
    await json(route, null);
  });

  await page.addInitScript(
    (auth) => window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 })),
    { user, accessToken: "phase2-test-token", refreshToken: "phase2-refresh" },
  );
}

function userFor(role: string) {
  const isAdmin = role === "admin";
  const isStudent = role === "student";
  const workspaceId = isAdmin ? null : isStudent ? "school-dut" : "danang-city";
  return {
    id: `user-${role}`,
    workspaceId,
    email: `${role}@example.test`,
    role,
    fullName: `Người dùng ${role}`,
    studentCode: isStudent ? "102220001" : null,
    className: isStudent ? "22T_DT1" : null,
    faculty: isStudent ? "Công nghệ Thông tin" : null,
    phone: null,
    avatarUrl: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    workspace: workspaceId
      ? {
          id: workspaceId,
          code: isStudent ? "DDK" : "DANANG_CITY",
          name: isStudent ? "Trường Đại học Bách khoa - Đại học Đà Nẵng" : "Đà Nẵng",
          shortName: isStudent ? "DDK" : "Đà Nẵng",
        }
      : null,
    officerSpecializations:
      role === "city_officer"
        ? [{ criterion: "academic", facultyScope: null, isActive: true }]
        : [],
  };
}

const criteriaConfig = {
  id: "config-ethics",
  scope: "university",
  code: "SV5T-2026",
  title: "Tiêu chí Đạo đức tốt",
  description: "Nội dung tiêu chí đang công khai.",
  sourceDocumentName: "Quy định công tác Hội",
  sourceDocumentNumber: null,
  sourceIssuedAt: null,
  sourcePeriodLabel: null,
  sourceOrganization: null,
  sourceFileName: null,
  sourceNote: null,
  rules: [
    {
      criterion: "ethics",
      ruleKey: "ethics-conduct",
      title: "Điểm rèn luyện",
      mandatory: true,
      priorityRule: false,
      studentFriendlyText: "Đáp ứng yêu cầu điểm rèn luyện.",
      acceptedEvidenceHints: [],
      missingActionHints: [],
      source: { documentName: "Quy định công tác Hội", page: null, section: null },
    },
  ],
};

const corsHeaders = {
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "access-control-allow-origin": "http://127.0.0.1:5173",
  "access-control-allow-credentials": "true",
};

async function json(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    headers: { ...corsHeaders, "content-type": "application/json" },
    body: JSON.stringify({ success: true, data, error: null, meta: { requestId: "phase2-pw" } }),
  });
}
