import { expect, test, type Page, type Route } from "@playwright/test";

type PhaseOneRole =
  "student" | "data_uploader" | "city_officer" | "city_manager" | "city_committee" | "admin";

type RoleFixture = {
  role: PhaseOneRole;
  email: string;
  fullName: string;
  landingPath: string;
  navigationHref: string;
};

const roles: RoleFixture[] = [
  {
    role: "student",
    email: "student@dut.udn.vn",
    fullName: "Nguyễn Văn Sinh",
    landingPath: "/app",
    navigationHref: "/app/application",
  },
  {
    role: "data_uploader",
    email: "uploader@danang.gov.vn",
    fullName: "Cán bộ nhập liệu",
    landingPath: "/app/data-uploader",
    navigationHref: "/app/data-uploader",
  },
  {
    role: "city_officer",
    email: "officer@danang.gov.vn",
    fullName: "Cán bộ xét duyệt thành phố",
    landingPath: "/app/queue",
    navigationHref: "/app/queue",
  },
  {
    role: "city_manager",
    email: "manager@danang.gov.vn",
    fullName: "Quản lý thành phố",
    landingPath: "/app/analytics",
    navigationHref: "/app/assignment",
  },
  {
    role: "city_committee",
    email: "committee@danang.gov.vn",
    fullName: "Hội đồng thành phố",
    landingPath: "/app/resolution",
    navigationHref: "/app/resolution",
  },
  {
    role: "admin",
    email: "admin@dut.udn.vn",
    fullName: "Quản trị hệ thống",
    landingPath: "/app/admin/workspaces",
    navigationHref: "/app/admin/workspaces",
  },
];

const roleByName = Object.fromEntries(roles.map((fixture) => [fixture.role, fixture])) as Record<
  PhaseOneRole,
  RoleFixture
>;

const mockCorsHeaders = {
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "access-control-allow-origin": "*",
};

test.describe("Phase 1 role migration and route authorization", () => {
  for (const fixture of roles) {
    test(`${fixture.role} lands on its own workspace and sees its navigation`, async ({ page }) => {
      await loginAs(page, fixture);

      await page.goto("/app", { waitUntil: "domcontentloaded" });
      await expectPathname(page, fixture.landingPath);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("body")).not.toContainText(
        /Unexpected Application Error|Application Error|Cannot read properties/i,
      );
      await expect(
        page.locator(`aside nav a[href="${fixture.navigationHref}"]`).first(),
      ).toBeVisible();

      if (fixture.role === "data_uploader") {
        await expect(page.locator("aside nav a[href^='/app/queue']")).toHaveCount(0);
        await expect(page.locator("aside nav a[href^='/app/resolution']")).toHaveCount(0);
        await expect(page.locator("aside nav a[href^='/app/assignment']")).toHaveCount(0);
        await expect(page.locator("input[type='file']")).toHaveCount(0);
        await expect(page.getByRole("button", { name: /tải lên|upload/i })).toHaveCount(0);
      }

      if (fixture.role === "city_officer") {
        await expect(page.locator("aside nav a[href^='/app/assignment']")).toHaveCount(0);
        await expect(page.locator("aside nav a[href='/app/evidence-knowledge']")).toHaveCount(0);
      }

      if (fixture.role === "city_committee") {
        await expect(page.locator("aside nav a[href^='/app/resolution']").first()).toBeVisible();
        await expect(page.locator("aside nav a[href^='/app/assignment']")).toHaveCount(0);
        await expect(page.locator("aside nav a[href='/app/evidence-knowledge']")).toHaveCount(0);
      }

      if (fixture.role === "city_manager") {
        await expect(page.locator("aside nav a[href^='/app/assignment']").first()).toBeVisible();
        await expect(page.locator("aside nav a[href^='/app/admin']")).toHaveCount(0);
        await expect(page.locator("aside nav a[href='/app/evidence-knowledge']")).toHaveCount(0);
      }

      if (fixture.role === "admin") {
        await expect(page.locator("aside nav a[href^='/app/admin/workspaces']")).toBeVisible();
        await expect(page.locator("aside nav a[href^='/app/queue']")).toHaveCount(0);
      }
    });
  }

  const deniedRoutes: Array<{ role: PhaseOneRole; path: string }> = [
    { role: "data_uploader", path: "/app/queue" },
    { role: "data_uploader", path: "/app/resolution" },
    { role: "data_uploader", path: "/app/assignment" },
    { role: "city_officer", path: "/app/assignment" },
    { role: "city_committee", path: "/app/queue" },
    { role: "city_committee", path: "/app/assignment" },
    { role: "city_manager", path: "/app/admin/workspaces" },
    { role: "city_officer", path: "/app/evidence-knowledge" },
    { role: "city_manager", path: "/app/evidence-knowledge" },
    { role: "city_committee", path: "/app/evidence-knowledge" },
    { role: "city_officer", path: "/app/decision-imports" },
    { role: "city_manager", path: "/app/decision-imports" },
    { role: "city_committee", path: "/app/decision-imports" },
  ];

  for (const denied of deniedRoutes) {
    const fixture = roleByName[denied.role];
    const expectedPath = denied.path.startsWith("/app/admin") ? "/login" : fixture.landingPath;

    test(`${denied.role} cannot open ${denied.path} directly`, async ({ page }) => {
      await loginAs(page, fixture);

      await page.goto(denied.path, { waitUntil: "domcontentloaded" });
      await expectPathname(page, expectedPath);
    });
  }

  const allowedRoutes: Array<{ role: PhaseOneRole; path: string }> = [
    { role: "student", path: "/app/application" },
    { role: "data_uploader", path: "/app/data-uploader" },
    { role: "city_officer", path: "/app/queue" },
    { role: "city_manager", path: "/app/assignment" },
    { role: "city_committee", path: "/app/resolution" },
    { role: "admin", path: "/app/admin/workspaces" },
  ];

  for (const allowed of allowedRoutes) {
    test(`${allowed.role} can open ${allowed.path} directly`, async ({ page }) => {
      await loginAs(page, roleByName[allowed.role]);

      await page.goto(allowed.path, { waitUntil: "domcontentloaded" });
      await expectPathname(page, allowed.path);
      await expect(page.locator("main")).toBeVisible();
    });
  }
});

async function loginAs(page: Page, fixture: RoleFixture) {
  const user = userFor(fixture);

  await page.route("http://localhost:8080/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: mockCorsHeaders, body: "" });
      return;
    }

    if (path === "/api/me" || path === "/api/auth/me") {
      await json(route, user);
      return;
    }

    if (path === "/api/auth/login") {
      await json(route, { user, accessToken: "phase1-test-token", refreshToken: "phase1-refresh" });
      return;
    }

    await json(route, null);
  });

  await page.addInitScript(
    (auth) => {
      window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 }));
    },
    {
      user,
      accessToken: "phase1-test-token",
      refreshToken: "phase1-refresh",
    },
  );
}

function userFor(fixture: RoleFixture) {
  const isAdmin = fixture.role === "admin";
  const isStudent = fixture.role === "student";
  const workspaceId = isAdmin ? null : isStudent ? "school-dut" : "danang-city";

  return {
    id: `user-${fixture.role}`,
    workspaceId,
    email: fixture.email,
    role: fixture.role,
    fullName: fixture.fullName,
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
      fixture.role === "city_officer"
        ? [{ criterion: "academic", facultyScope: null, isActive: true }]
        : [],
  };
}

async function expectPathname(page: Page, pathname: string) {
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 10_000 }).toBe(pathname);
}

async function json(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    headers: { ...mockCorsHeaders, "content-type": "application/json" },
    body: JSON.stringify({ success: true, data, error: null, meta: { requestId: "phase1-pw" } }),
  });
}
