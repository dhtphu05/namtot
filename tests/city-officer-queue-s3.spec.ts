import { expect, test, type Page, type Route } from "@playwright/test";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
};

const academicTask = (overrides: Record<string, unknown> = {}) => ({
  id: "task-city-academic",
  applicationId: "application-city-1",
  studentId: "student-city-1",
  studentName: "Nguyễn Văn An",
  studentCode: "00123456",
  faculty: "Công nghệ thông tin",
  className: "22T1",
  institutionName: "Trường Đại học Bách khoa - Đại học Đà Nẵng",
  schoolYear: "2025-2026",
  targetLevel: "city",
  applicationStatus: "submitted",
  criterion: "academic",
  status: "waiting",
  assignedOfficerId: null,
  assignedOfficerName: null,
  evidenceCount: 2,
  supplementCount: 0,
  dueDate: "2026-10-15T00:00:00.000Z",
  permissions: {
    canView: true,
    canAct: false,
    canClaim: true,
    canRequestSupport: false,
    reason: "claimable_by_specialization",
    reasonLabel: "Có thể nhận xử lý",
    availableActions: ["view", "claim"],
  },
  createdAt: "2026-09-25T00:00:00.000Z",
  updatedAt: "2026-09-25T00:00:00.000Z",
  ...overrides,
});

test.describe("City Officer master-detail queue", () => {
  test("shows the assigned criterion in master-detail and hides other criteria", async ({
    page,
  }) => {
    const requestedCriteria: string[] = [];
    await stubCityOfficer(
      page,
      async (route, path) => {
        if (path === "/api/review/tasks" && route.request().method() === "GET") {
          requestedCriteria.push(
            new URL(route.request().url()).searchParams.get("criterion") ?? "",
          );
          await json(route, {
            items: [
              academicTask(),
              academicTask({
                id: "task-city-ethics",
                applicationId: "application-city-2",
                criterion: "ethics",
                studentName: "Sinh viên tiêu chí khác",
                studentCode: "00123457",
              }),
            ],
            pagination: { page: 1, limit: 100, total: 2, totalPages: 1 },
          });
          return;
        }
        await json(route, null);
      },
      [{ criterion: "academic", facultyScope: null, isActive: true }],
    );

    await page.goto("/app/queue", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Việc cần xử lý" }).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText("Tiêu chí phụ trách", { exact: true })).toBeVisible();
    await expect(page.getByText("Học tập tốt", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Nguyễn Văn An", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Sinh viên tiêu chí khác", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Lọc tiêu chí")).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Sinh viên" })).toHaveCount(0);
    expect(requestedCriteria).toContain("academic");
  });

  test("keeps claim confirmation and refreshes the master-detail after success", async ({
    page,
  }) => {
    let listRequestCount = 0;
    let claimCount = 0;
    const detailQueryParams: URLSearchParams[] = [];
    await stubCityOfficer(page, async (route, path) => {
      if (path === "/api/review/tasks" && route.request().method() === "GET") {
        listRequestCount += 1;
        const task =
          listRequestCount === 1
            ? academicTask()
            : academicTask({
                status: "reviewing",
                assignedOfficerId: "city-officer-1",
                assignedOfficerName: "Cán bộ xét duyệt Học tập",
                permissions: {
                  ...academicTask().permissions,
                  canAct: true,
                  canClaim: false,
                  reason: "assigned_to_current",
                  reasonLabel: "Đang do bạn xử lý",
                  availableActions: ["view", "decide"],
                },
              });
        await json(route, {
          items: [task],
          pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
        });
        return;
      }
      if (path === "/api/review/tasks/task-city-academic" && route.request().method() === "GET") {
        detailQueryParams.push(new URL(route.request().url()).searchParams);
        await json(route, {
          task: {
            id: "task-city-academic",
            criterion: "academic",
            status: listRequestCount === 1 ? "waiting" : "reviewing",
            permissions: {
              ...academicTask().permissions,
              canAct: listRequestCount > 1,
              canClaim: listRequestCount === 1,
            },
            application: {
              id: "application-city-1",
              schoolYear: "2025-2026",
              applicationType: "individual",
              targetLevel: "city",
              status: "submitted",
              student: {
                id: "student-city-1",
                fullName: "Nguyễn Văn An",
                studentCode: "00123456",
                email: "student@example.edu.vn",
                faculty: "Công nghệ thông tin",
                className: "22T1",
              },
            },
            evidences: [],
            metrics: [],
          },
        });
        return;
      }
      if (
        path === "/api/review/tasks/task-city-academic/claim" &&
        route.request().method() === "POST"
      ) {
        claimCount += 1;
        await json(route, { task: { id: "task-city-academic", status: "reviewing" } });
        return;
      }
      await json(route, null);
    });

    await page.goto("/app/queue", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Đi tới chốt tiêu chí" }).click();
    await page.getByRole("button", { name: "Nhận xử lý", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Học tập tốt");
    await page.getByRole("button", { name: "Xác nhận nhận xử lý" }).click();

    await expect.poll(() => claimCount).toBe(1);
    await expect(
      page.getByText("Đã nhận xử lý task. Task đã chuyển sang danh sách của bạn.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect.poll(() => listRequestCount).toBeGreaterThan(1);
    await expect(page.getByText("Tiêu chí phụ trách", { exact: true })).toBeVisible();
    await expect(page.getByText("Học tập tốt", { exact: true }).first()).toBeVisible();
    expect(detailQueryParams.some((params) => params.get("includeAudit") === "false")).toBe(true);
  });

  test("refreshes the criterion queue after a concurrent claim conflict", async ({ page }) => {
    let listRequestCount = 0;
    await stubCityOfficer(page, async (route, path) => {
      if (path === "/api/review/tasks" && route.request().method() === "GET") {
        listRequestCount += 1;
        const task =
          listRequestCount === 1
            ? academicTask()
            : academicTask({
                assignedOfficerId: "other-officer",
                assignedOfficerName: "Cán bộ khác",
                permissions: {
                  ...academicTask().permissions,
                  canClaim: false,
                  reason: "assigned_to_other",
                  reasonLabel: "Đang do cán bộ khác xử lý",
                  availableActions: ["view"],
                },
              });
        await json(route, {
          items: [task],
          pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
        });
        return;
      }
      if (path === "/api/review/tasks/task-city-academic" && route.request().method() === "GET") {
        await json(route, {
          task: {
            id: "task-city-academic",
            criterion: "academic",
            status: "waiting",
            permissions: academicTask().permissions,
            application: {
              id: "application-city-1",
              schoolYear: "2025-2026",
              applicationType: "individual",
              targetLevel: "city",
              status: "submitted",
              student: {
                id: "student-city-1",
                fullName: "Nguyễn Văn An",
                studentCode: "00123456",
                email: "student@example.edu.vn",
              },
            },
            evidences: [],
            metrics: [],
          },
        });
        return;
      }
      if (
        path === "/api/review/tasks/task-city-academic/claim" &&
        route.request().method() === "POST"
      ) {
        await route.fulfill({
          status: 409,
          headers: { ...corsHeaders, "content-type": "application/json" },
          body: JSON.stringify({
            success: false,
            data: null,
            error: { code: "CONFLICT", message: "Task đã được giao cho cán bộ khác." },
            meta: {},
          }),
        });
        return;
      }
      await json(route, null);
    });

    await page.goto("/app/queue", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Đi tới chốt tiêu chí" }).click();
    await page.getByRole("button", { name: "Nhận xử lý", exact: true }).click();
    await page.getByRole("button", { name: "Xác nhận nhận xử lý" }).click();

    await expect(
      page.getByText("Hồ sơ này vừa được cán bộ khác nhận xử lý. Danh sách đã được cập nhật.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect.poll(() => listRequestCount).toBeGreaterThan(1);
    await expect(page.getByRole("button", { name: "Nhận xử lý", exact: true })).toHaveCount(0);
    await expect(page.getByRole("main")).toContainText("Đang do cán bộ khác xử lý");
  });
});

async function stubCityOfficer(
  page: Page,
  handler: (route: Route, path: string) => Promise<void>,
  officerSpecializations = [{ criterion: "academic", facultyScope: null, isActive: true }],
) {
  const user = {
    id: "city-officer-1",
    email: "officer.academic@danang.gov.vn",
    fullName: "Cán bộ xét duyệt Học tập",
    role: "city_officer",
    workspaceId: "danang-city",
    isActive: true,
    officerSpecializations,
  };

  await page.route("**/*", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    if (!requestUrl.pathname.startsWith("/api/")) {
      await route.continue();
      return;
    }
    const path = requestUrl.pathname;
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      return;
    }
    if (path === "/api/me" || path === "/api/auth/me") {
      await json(route, user);
      return;
    }
    if (path === "/api/notifications") {
      await json(route, []);
      return;
    }
    await handler(route, path);
  });

  await page.addInitScript(
    (auth) => {
      window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 }));
    },
    { user, accessToken: "city-officer-token", refreshToken: "city-officer-refresh" },
  );
}

async function json(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    headers: { ...corsHeaders, "content-type": "application/json" },
    body: JSON.stringify({ success: true, data, error: null, meta: {} }),
  });
}
