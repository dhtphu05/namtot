import { expect, test, type Page, type Route } from "@playwright/test";

const corsHeaders = {
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "access-control-allow-origin": "http://127.0.0.1:5174",
  "access-control-allow-credentials": "true",
};

test("admin manages accounts and City Officer specializations", async ({ page }) => {
  const writes: Array<{ path: string; method: string; body: unknown }> = [];
  await installAdminMocks(page, writes);

  await page.goto("/app/admin/users", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Đơn vị / Trường" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Người dùng" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Chuyên môn City Officer" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quản lý người dùng" })).toBeVisible();
  await expect(page.getByText("nguyen.an@example.test")).toBeVisible();

  await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  await page.getByLabel("Họ và tên").fill("Nguyễn An mới");
  await page.getByLabel("Email", { exact: true }).fill("an.moi@example.test");
  await page.getByLabel("Mật khẩu khởi tạo").fill("temporary-pass-123");
  await page.getByLabel("Mã sinh viên").fill("001235");
  await page.getByLabel("Đơn vị tài khoản").selectOption("school-1");
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).last().click();
  await expect
    .poll(() => writes.some((item) => item.path === "/api/admin/users" && item.method === "POST"))
    .toBe(true);
  expect(
    writes.find((item) => item.path === "/api/admin/users" && item.method === "POST")?.body,
  ).toMatchObject({
    role: "student",
    workspaceId: "school-1",
    studentCode: "001235",
  });

  await page.goto("/app/admin/officers", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Chuyên môn City Officer" })).toBeVisible();
  await page.getByRole("button", { name: "Chuyên môn Trần Officer" }).click();
  await page.getByLabel("Đạo đức").check();
  await page.getByRole("button", { name: "Lưu chuyên môn" }).click();
  await expect
    .poll(() =>
      writes.some((item) => item.path.endsWith("/specializations") && item.method === "PUT"),
    )
    .toBe(true);
  expect(writes.find((item) => item.path.endsWith("/specializations"))?.body).toEqual({
    criteria: ["academic", "ethics"],
  });
});

test("admin account form offers only compatible workspaces for uploader and City roles", async ({
  page,
}) => {
  const writes: Array<{ path: string; method: string; body: unknown }> = [];
  await installAdminMocks(page, writes);
  await page.goto("/app/admin/users", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  await page.getByLabel("Họ và tên").fill("Data Uploader mới");
  await page.getByLabel("Email", { exact: true }).fill("uploader@example.test");
  await page.getByLabel("Mật khẩu khởi tạo").fill("temporary-pass-123");
  await page.getByLabel("Vai trò tài khoản").selectOption("data_uploader");
  const uploaderWorkspace = page.getByLabel("Đơn vị tài khoản");
  const uploaderOptions = await uploaderWorkspace
    .locator("option")
    .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
  expect(uploaderOptions).toContain("school-1");
  expect(uploaderOptions).toContain("udn-1");
  expect(uploaderOptions).not.toContain("city-1");
  await uploaderWorkspace.selectOption("udn-1");
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).last().click();
  await expect
    .poll(() =>
      writes.some(
        (item) =>
          item.method === "POST" && (item.body as { role?: string }).role === "data_uploader",
      ),
    )
    .toBe(true);

  await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  await page.getByLabel("Họ và tên").fill("City Officer mới");
  await page.getByLabel("Email", { exact: true }).fill("city.officer@example.test");
  await page.getByLabel("Mật khẩu khởi tạo").fill("temporary-pass-123");
  await page.getByLabel("Vai trò tài khoản").selectOption("city_officer");
  const cityWorkspace = page.getByLabel("Đơn vị tài khoản");
  const cityOptions = await cityWorkspace
    .locator("option")
    .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
  expect(cityOptions).toEqual(["", "city-1"]);
  await cityWorkspace.selectOption("city-1");
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).last().click();
  await expect
    .poll(() =>
      writes.some(
        (item) =>
          item.method === "POST" && (item.body as { role?: string }).role === "city_officer",
      ),
    )
    .toBe(true);
});

test("non-admin cannot open Admin account screens directly", async ({ page }) => {
  await installAdminMocks(page, [], "city_manager");
  await page.goto("/app/analytics", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Đơn vị / Trường" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Người dùng" })).toHaveCount(0);
  await page.goto("/app/admin/users", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/login$/);
});

test("admin can configure UDN hierarchy and safely delete an empty season", async ({ page }) => {
  const writes: Array<{ path: string; method: string; body: unknown }> = [];
  await installAdminMocks(page, writes);

  await page.goto("/app/admin/workspaces", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Quản lý trường triển khai" })).toBeVisible();
  await page.getByRole("button", { name: "Thêm trường triển khai" }).click();
  const createWorkspaceDialog = page.getByRole("dialog", { name: "Thêm đơn vị" });
  await createWorkspaceDialog.getByLabel("Loại đơn vị").selectOption("SCHOOL");
  await createWorkspaceDialog.getByLabel("Đơn vị đại học trực thuộc").selectOption("udn-1");
  await createWorkspaceDialog.getByLabel("Tên đơn vị").fill("Trường thành viên mới");
  await createWorkspaceDialog.getByLabel("Mã đơn vị").fill("SCHOOL-NEW");
  await createWorkspaceDialog.getByRole("button", { name: "Tạo đơn vị" }).click();
  await expect
    .poll(() =>
      writes.some((item) => item.path === "/api/admin/workspaces" && item.method === "POST"),
    )
    .toBe(true);
  expect(
    writes.find((item) => item.path === "/api/admin/workspaces" && item.method === "POST")?.body,
  ).toMatchObject({
    type: "SCHOOL",
    parentWorkspaceId: "udn-1",
    code: "SCHOOL-NEW",
  });

  await page.goto("/app/analytics", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Quản lý mùa xét Thành phố" })).toBeVisible();
  await page.getByRole("button", { name: "Xóa mùa rỗng" }).click();
  await page.getByLabel("Lý do xóa mùa xét").fill("Tạo lại cấu hình rỗng");
  await page.getByRole("button", { name: "Xóa mùa rỗng", exact: true }).last().click();
  await expect
    .poll(() =>
      writes.some(
        (item) => item.path.endsWith("/city-review-seasons/2025-2026") && item.method === "DELETE",
      ),
    )
    .toBe(true);
  expect(
    writes.find(
      (item) => item.path.endsWith("/city-review-seasons/2025-2026") && item.method === "DELETE",
    )?.body,
  ).toEqual({ reason: "Tạo lại cấu hình rỗng" });
});

test("admin can create, edit, delete, and recreate an empty season", async ({ page }) => {
  const writes: Array<{ path: string; method: string; body: unknown }> = [];
  let currentSeason: (typeof season & Record<string, unknown>) | null = null;
  await installRoleMocks(page, "admin", async (route, path, method) => {
    const request = route.request();
    if (method !== "GET") writes.push({ path, method, body: request.postDataJSON() });
    if (path === "/api/analytics/city") return json(route, citySummary());
    if (path === "/api/analytics/city/applications")
      return json(route, {
        items: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    if (path === "/api/manager/city-review-seasons" && method === "GET")
      return json(route, currentSeason ? [currentSeason] : []);
    if (path === "/api/manager/city-review-seasons" && method === "POST") {
      const body = request.postDataJSON() as Record<string, unknown>;
      currentSeason = { ...season, ...body, version: 1, applicationCount: 0, canDelete: true };
      return json(route, currentSeason, {}, 201);
    }
    if (path === "/api/manager/city-review-seasons/2025-2026" && method === "GET")
      return json(route, currentSeason);
    if (path === "/api/manager/city-review-seasons/2025-2026" && method === "PATCH") {
      const body = request.postDataJSON() as Record<string, unknown>;
      currentSeason = { ...currentSeason!, ...body, version: currentSeason!.version + 1 };
      return json(route, currentSeason);
    }
    if (path === "/api/manager/city-review-seasons/2025-2026" && method === "DELETE") {
      const deleted = currentSeason;
      currentSeason = null;
      return json(route, deleted);
    }
    return json(route, null);
  });

  await page.goto("/app/analytics", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Cấu hình mùa xét" }).click();
  await fillSeasonForm(page, "Tạo mùa thử nghiệm");
  await page.getByRole("button", { name: "Lưu lịch mùa xét" }).click();
  await page.getByRole("button", { name: "Xác nhận lưu" }).click();
  await expect
    .poll(
      () =>
        writes.filter(
          (item) => item.path === "/api/manager/city-review-seasons" && item.method === "POST",
        ).length,
    )
    .toBe(1);

  await page.getByRole("button", { name: "Chỉnh sửa lịch" }).click();
  await page.getByLabel("Đóng đợt nộp hồ sơ").fill("2026-10-05T12:00");
  await page.getByLabel("Lý do thay đổi lịch").fill("Điều chỉnh lịch");
  await page.getByRole("button", { name: "Cập nhật lịch mùa xét" }).click();
  await page.getByRole("button", { name: "Xác nhận lưu" }).click();
  await expect
    .poll(
      () =>
        writes.filter((item) => item.path.endsWith("/2025-2026") && item.method === "PATCH").length,
    )
    .toBe(1);

  await page.getByRole("button", { name: "Xóa mùa rỗng" }).click();
  await page.getByLabel("Lý do xóa mùa xét").fill("Tạo lại mùa rỗng");
  await page.getByRole("button", { name: "Xóa mùa rỗng", exact: true }).last().click();
  await expect
    .poll(
      () =>
        writes.filter((item) => item.path.endsWith("/2025-2026") && item.method === "DELETE")
          .length,
    )
    .toBe(1);

  await page.getByRole("button", { name: "Cấu hình mùa xét" }).click();
  await fillSeasonForm(page, "Tạo lại cùng năm học");
  await page.getByRole("button", { name: "Lưu lịch mùa xét" }).click();
  await page.getByRole("button", { name: "Xác nhận lưu" }).click();
  await expect
    .poll(
      () =>
        writes.filter(
          (item) => item.path === "/api/manager/city-review-seasons" && item.method === "POST",
        ).length,
    )
    .toBe(2);
});

test("used season stays visible with a reason it cannot be deleted", async ({ page }) => {
  const usedSeason = { ...season, applicationCount: 2, canDelete: false };
  await installAdminMocks(page, [], "admin", usedSeason);
  await page.goto("/app/analytics", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/Mùa đã phát sinh hồ sơ và không thể xóa/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Xóa mùa rỗng" })).toBeDisabled();
});

async function installAdminMocks(
  page: Page,
  writes: Array<{ path: string; method: string; body: unknown }>,
  role = "admin",
  configuredSeason = season,
) {
  await installRoleMocks(page, role, async (route, path, method) => {
    const request = route.request();
    if (method !== "GET") writes.push({ path, method, body: request.postDataJSON() });
    if (path === "/api/admin/workspaces" && method === "GET") {
      const items = [school, university, city];
      return json(route, items, {
        pagination: { page: 1, limit: 100, total: items.length, totalPages: 1 },
      });
    }
    if (path === "/api/admin/workspaces" && method === "POST")
      return json(route, { ...school, ...request.postDataJSON() }, {}, 201);
    if (path === "/api/admin/users" && method === "GET") {
      const isOfficer = new URL(request.url()).searchParams.get("role") === "city_officer";
      return json(route, [isOfficer ? officer : student], {
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
    }
    if (path === "/api/admin/users" && method === "POST") return json(route, student, {}, 201);
    if (path.endsWith("/specializations") && method === "PUT") return json(route, []);
    if (path === "/api/analytics/city") return json(route, citySummary());
    if (path === "/api/analytics/city/applications")
      return json(route, {
        items: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    if (path === "/api/manager/city-review-seasons" && method === "GET")
      return json(route, [configuredSeason]);
    if (path === "/api/manager/city-review-seasons/2025-2026" && method === "GET")
      return json(route, configuredSeason);
    if (path === "/api/manager/city-review-seasons/2025-2026" && method === "DELETE")
      return json(route, configuredSeason);
    return json(route, null);
  });
}

async function installRoleMocks(
  page: Page,
  role: string,
  handler?: (route: Route, path: string, method: string) => Promise<void>,
) {
  await page.route("http://localhost:8080/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeadersFor(route), body: "" });
      return;
    }
    if (path === "/api/me" || path === "/api/auth/me") return json(route, userFor(role));
    if (handler) return handler(route, path, method);
    return json(route, null);
  });
  await page.addInitScript(
    (auth) => window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 })),
    {
      user: userFor(role),
      accessToken: "admin-ops-token",
      refreshToken: "admin-ops-refresh",
    },
  );
}

async function json(route: Route, data: unknown, meta: Record<string, unknown> = {}, status = 200) {
  await route.fulfill({
    status,
    headers: { ...corsHeadersFor(route), "content-type": "application/json" },
    body: JSON.stringify({ success: true, data, error: null, meta }),
  });
}

function corsHeadersFor(route: Route) {
  const origin = route.request().headers().origin;
  return origin ? { ...corsHeaders, "access-control-allow-origin": origin } : corsHeaders;
}

const school = {
  id: "school-1",
  code: "DUT",
  name: "Trường Đại học Bách khoa",
  shortName: "DUT",
  type: "SCHOOL",
  parentWorkspaceId: null,
  parentWorkspace: null,
  isActive: true,
  registrationEnabled: false,
  userCount: 1,
  applicationCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const university = {
  id: "udn-1",
  code: "UDN",
  name: "Đại học Đà Nẵng",
  shortName: "UDN",
  type: "UNIVERSITY_SYSTEM",
  parentWorkspaceId: null,
  parentWorkspace: null,
  isActive: true,
  registrationEnabled: false,
  userCount: 1,
  applicationCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const city = {
  id: "city-1",
  code: "DANANG_CITY",
  name: "Thành phố Đà Nẵng",
  shortName: "Đà Nẵng",
  type: "CITY",
  parentWorkspaceId: null,
  parentWorkspace: null,
  isActive: true,
  registrationEnabled: false,
  userCount: 1,
  applicationCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const student = {
  id: "student-1",
  workspaceId: "school-1",
  fullName: "Nguyễn An",
  email: "nguyen.an@example.test",
  phone: null,
  role: "student",
  studentCode: "001234",
  className: "22T1",
  faculty: null,
  avatarUrl: null,
  isActive: true,
  lastLoginAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  workspace: { id: "school-1", code: "DUT", name: "Trường Đại học Bách khoa", shortName: "DUT" },
  officerSpecializations: [],
};
const officer = {
  ...student,
  id: "officer-1",
  fullName: "Trần Officer",
  email: "officer@example.test",
  role: "city_officer",
  workspaceId: "city-1",
  workspace: { id: "city-1", code: "DANANG_CITY", name: "Đà Nẵng", shortName: null },
  officerSpecializations: [{ criterion: "academic", facultyScope: null, isActive: true }],
};
const season = {
  id: "season-1",
  schoolYear: "2025-2026",
  submissionOpensAt: "2026-09-01T00:00:00.000Z",
  submissionClosesAt: "2026-10-01T00:00:00.000Z",
  reviewDeadlineAt: "2026-10-10T00:00:00.000Z",
  supplementDeadlineAt: "2026-10-13T00:00:00.000Z",
  finalizationDeadlineAt: "2026-10-20T00:00:00.000Z",
  version: 1,
  updatedAt: "2026-08-20T00:00:00.000Z",
  submissionStatus: "OPEN",
  reviewStatus: "ON_TRACK",
  supplementStatus: "ON_TRACK",
  finalizationStatus: "ON_TRACK",
  applicationCount: 0,
  canDelete: true,
};

function userFor(role: string) {
  const workspaceId = role === "admin" ? null : role === "city_manager" ? "city-1" : "school-1";
  return {
    id: `user-${role}`,
    workspaceId,
    email: `${role}@test.local`,
    role,
    fullName: role,
    studentCode: null,
    className: null,
    faculty: null,
    phone: null,
    avatarUrl: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    workspace: workspaceId
      ? { id: workspaceId, code: "DANANG_CITY", name: "Đà Nẵng", shortName: null }
      : null,
    officerSpecializations: [],
  };
}

function citySummary() {
  return {
    filters: { schoolYear: "2025-2026", workspaceId: null, status: null },
    availableSchoolYears: ["2025-2026"],
    filterOptions: { schools: [] },
    applications: {
      created: 0,
      notSubmitted: 0,
      submitted: 0,
      inReview: 0,
      supplementRequired: 0,
      resolutionBlocked: 0,
      reviewComplete: 0,
      missingCriterionSlots: 0,
      progressDistribution: { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
      unexpectedTaskCount: 0,
    },
    criteria: [],
    bySchool: [],
    reviewers: [],
    finalResults: { finalized: 0, passed: 0, failed: 0, partiallyPassed: 0, notFinalized: 0 },
    supplement: { applications: 0, tasks: 0 },
    resolution: { openCases: 0, resolvedCases: 0, blockedApplications: 0 },
  };
}

async function fillSeasonForm(page: Page, reason: string) {
  const dates: Array<[string, string]> = [
    ["Mở đợt nộp hồ sơ", "2026-09-01T00:00"],
    ["Đóng đợt nộp hồ sơ", "2026-10-01T00:00"],
    ["Hạn hoàn tất review", "2026-10-10T00:00"],
    ["Hạn xử lý bổ sung", "2026-10-13T00:00"],
    ["Hạn chốt kết quả", "2026-10-20T00:00"],
  ];
  for (const [label, value] of dates) await page.getByLabel(label).fill(value);
  await page.getByLabel("Lý do thay đổi lịch").fill(reason);
}
