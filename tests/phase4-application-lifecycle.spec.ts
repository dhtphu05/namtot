import { expect, test, type Page, type Route } from "@playwright/test";

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

test("City Manager list defaults to active records and can discover cancelled and archived applications", async ({
  page,
}) => {
  const resultQueries: URL[] = [];
  await installResultsMocks(page, "city_manager", resultQueries);
  await page.goto("/app/manager/results", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Kết quả xét duyệt theo cấp" })).toBeVisible();
  const lifecycleFilter = page.getByLabel("Vòng đời hồ sơ");
  const archiveFilter = page.getByLabel("Trạng thái lưu trữ");
  await expect(lifecycleFilter).toHaveValue("active");
  await expect(archiveFilter).toHaveValue("exclude");
  await expect
    .poll(() => resultQueries.some((url) => url.searchParams.get("lifecycle") === "active"))
    .toBe(true);
  expect(resultQueries.at(-1)?.searchParams.get("archive")).toBe("exclude");

  await lifecycleFilter.selectOption("cancelled");
  await archiveFilter.selectOption("only");
  await expect
    .poll(() =>
      resultQueries.some(
        (url) =>
          url.searchParams.get("lifecycle") === "cancelled" &&
          url.searchParams.get("archive") === "only",
      ),
    )
    .toBe(true);
  await expect(page.getByText("Đã hủy hồ sơ", { exact: true })).toBeVisible();
  await expect(page.getByRole("article").getByText("Đã lưu trữ", { exact: true })).toBeVisible();
  await expect(page.getByText("Hồ sơ trùng đã dừng xử lý", { exact: true })).toBeVisible();
});

test("legacy manager keeps the existing result list without City lifecycle controls", async ({
  page,
}) => {
  await installResultsMocks(page, "manager", []);
  await page.goto("/app/manager/results", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Kết quả xét duyệt theo cấp" })).toBeVisible();
  await expect(page.getByLabel("Vòng đời hồ sơ")).toHaveCount(0);
  await expect(page.getByLabel("Trạng thái lưu trữ")).toHaveCount(0);
});

test("lifecycle filters preserve existing search and final-result filters", async ({ page }) => {
  const resultQueries: URL[] = [];
  await installResultsMocks(page, "city_manager", resultQueries);
  await page.goto("/app/manager/results", { waitUntil: "domcontentloaded" });

  await page.getByPlaceholder("Tìm sinh viên, MSSV, lớp, khoa...").fill("Student");
  await page.getByRole("button", { name: "Chưa đạt", exact: true }).click();

  await expect
    .poll(() =>
      resultQueries.some(
        (url) =>
          url.searchParams.get("search") === "Student" &&
          url.searchParams.get("finalStatus") === "failed" &&
          url.searchParams.get("lifecycle") === "active" &&
          url.searchParams.get("archive") === "exclude",
      ),
    )
    .toBe(true);
});

test("admin can inspect lifecycle and archive filters", async ({ page }) => {
  await installResultsMocks(page, "admin", []);
  await page.goto("/app/manager/results", { waitUntil: "domcontentloaded" });

  await expect(page.getByLabel("Vòng đời hồ sơ")).toHaveValue("active");
  await expect(page.getByLabel("Trạng thái lưu trữ")).toHaveValue("exclude");
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

async function installResultsMocks(page: Page, role: string, resultQueries: URL[]) {
  const user = {
    id: `user-${role}`,
    workspaceId: role === "admin" ? null : role === "city_manager" ? "danang-city" : "school-dut",
    email: `${role}@test.local`,
    role,
    fullName: role === "city_manager" ? "City Manager" : "Test Manager",
    studentCode: null,
    className: null,
    faculty: null,
    phone: null,
    avatarUrl: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    workspace:
      role === "admin"
        ? null
        : {
            id: role === "city_manager" ? "danang-city" : "school-dut",
            code: role === "city_manager" ? "DANANG_CITY" : "DDK",
            name: role === "city_manager" ? "Đà Nẵng" : "Trường",
            shortName: null,
          },
    officerSpecializations: [],
  };

  await page.route("http://localhost:8080/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      return;
    }
    if (url.pathname === "/api/me" || url.pathname === "/api/auth/me") {
      return fulfillJson(route, user);
    }
    if (url.pathname === "/api/manager/dashboard-summary") return fulfillJson(route, {});
    if (url.pathname === "/api/manager/results") {
      resultQueries.push(url);
      const showCancelled =
        url.searchParams.get("lifecycle") === "cancelled" &&
        url.searchParams.get("archive") === "only";
      return fulfillJson(route, {
        items: showCancelled ? [cancelledResultItem()] : [],
        pagination: {
          page: 1,
          pageSize: 10,
          total: showCancelled ? 1 : 0,
          totalPages: showCancelled ? 1 : 0,
        },
        sort: { sortBy: "lastActivityAt", sortOrder: "desc" },
      });
    }
    return fulfillJson(route, null);
  });

  await page.addInitScript(
    (auth) => window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 })),
    { user, accessToken: `lifecycle-${role}-token`, refreshToken: "refresh" },
  );
}

function cancelledResultItem() {
  return {
    applicationId: "application-cancelled",
    studentId: "student-1",
    studentName: "Student Cancelled",
    studentCode: "001234",
    className: "26A",
    faculty: "Engineering",
    schoolYear: "2025-2026",
    targetLevel: "city",
    suggestedLevel: "city",
    finalStatus: "pending",
    finalLevel: null,
    finalNote: null,
    applicationStatus: "completed",
    readinessScore: 100,
    submittedAt: "2026-09-01T00:00:00.000Z",
    finalizedAt: null,
    cancelledAt: "2026-09-10T00:00:00.000Z",
    cancelReason: "Hồ sơ trùng đã dừng xử lý",
    archivedAt: "2026-09-11T00:00:00.000Z",
    archiveReason: "Đã đóng đợt xét",
    updatedAt: "2026-09-11T00:00:00.000Z",
    lastActivityAt: "2026-09-11T00:00:00.000Z",
    finalizedBy: null,
    reviewTaskSummary: {
      total: 5,
      accepted: 5,
      rejected: 0,
      supplementRequired: 0,
      resolutionNeeded: 0,
      waiting: 0,
    },
    criterionStatuses: {},
    taskProgress: { accepted: 5, total: 5 },
    canFinalize: false,
    blockingReasons: [],
    topBlockerReason: null,
  };
}

async function fulfillJson(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    headers: { ...corsHeaders, "content-type": "application/json" },
    body: JSON.stringify({
      success: true,
      data,
      error: null,
      meta: { requestId: "lifecycle-list" },
    }),
  });
}
