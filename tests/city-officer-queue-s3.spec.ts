import { expect, test, type Page, type Route } from "@playwright/test";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
};

const task = (overrides: Record<string, unknown> = {}) => ({
  id: "task-city-academic",
  applicationId: "application-city-1",
  studentId: "student-city-1",
  studentName: "Nguyễn Văn An",
  studentCode: "00123456",
  faculty: "Công nghệ thông tin",
  className: "22T1",
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

test.describe("S3 City Officer queue", () => {
  test.describe.configure({ timeout: 90_000 });

  test("uses truthful server tabs, core criteria, pagination, and claim affordance", async ({
    page,
  }) => {
    const taskRequests: string[] = [];
    await stubCityOfficer(page, async (route, path) => {
      if (path === "/api/review/tasks" && route.request().method() === "GET") {
        taskRequests.push(route.request().url());
        const url = new URL(route.request().url());
        const status = url.searchParams.get("status");
        const statuses = url.searchParams.get("statuses");
        const criterion = url.searchParams.get("criterion");
        const completed = statuses === "accepted,rejected";
        const requestedStatus = status ?? "waiting";
        const makeStatusItem = (nextStatus: string) => {
          if (nextStatus === "reviewing") {
            return task({
              status: nextStatus,
              assignedOfficerId: "city-officer-1",
              assignedOfficerName: "Cán bộ xét duyệt thành phố",
              permissions: { ...task().permissions, canClaim: false, canAct: true },
            });
          }
          return task({
            status: nextStatus,
            permissions: {
              ...task().permissions,
              canClaim: nextStatus === "waiting",
              canAct: false,
            },
          });
        };
        const items = completed
          ? [
              task({
                status: "accepted",
                permissions: { ...task().permissions, canClaim: false },
              }),
              task({
                id: "task-city-ethics",
                criterion: "ethics",
                studentName: "Trần Thị Bình",
                studentCode: "00123457",
                status: "rejected",
                permissions: { ...task().permissions, canClaim: false },
              }),
            ]
          : [makeStatusItem(requestedStatus)];
        if (!completed) {
          items[0] = { ...items[0], criterion: criterion ?? "academic" };
        }
        await json(route, {
          items,
          pagination: {
            page: Number(url.searchParams.get("page") ?? 1),
            limit: 20,
            total: completed ? 2 : 21,
            totalPages: completed ? 1 : 2,
          },
        });
        return;
      }
      await json(route, null);
    });

    await page.goto("/app/queue", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Việc cần xử lý" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText("Nhận xử lý", { exact: true })).toBeVisible();
    await expect(page.getByText("Có thể nhận xử lý", { exact: true })).toBeVisible();
    await expect(page.getByText("Đạo đức tốt", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Cấp xét" })).toHaveCount(0);
    await expect(page.getByText(/Ưu tiên|Tập thể|Trường học/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Cần xử lý \(\d+\)/ })).toHaveCount(0);
    await page.screenshot({
      path: "D:/02_PROJECTS/5TOT/s3-city-queue-1440x900-can-xu-ly.png",
      fullPage: false,
    });

    await page.getByLabel("Tìm sinh viên hoặc MSSV").fill("00123456");
    await expect
      .poll(() => new URL(taskRequests.at(-1) ?? "http://localhost").searchParams.get("q"))
      .toBe("00123456");
    await page.getByLabel("Lọc tiêu chí").selectOption("academic");
    await expect
      .poll(() => new URL(taskRequests.at(-1) ?? "http://localhost").searchParams.get("criterion"))
      .toBe("academic");
    await page.getByRole("button", { name: "Trang sau" }).click();
    await expect
      .poll(() => new URL(taskRequests.at(-1) ?? "http://localhost").searchParams.get("page"))
      .toBe("2");

    const tabs: Array<[string, string]> = [
      ["Đang xét", "reviewing"],
      ["Chờ bổ sung", "supplement_required"],
      ["Cần Hội đồng", "resolution_needed"],
    ];
    for (const [label, value] of tabs) {
      await page.getByRole("tab", { name: label, exact: true }).click();
      await expect
        .poll(() => new URL(taskRequests.at(-1) ?? "http://localhost").searchParams.get("status"))
        .toBe(value);
      await expect(
        page.getByRole("button", {
          name:
            value === "reviewing"
              ? "Tiếp tục xét"
              : value === "supplement_required"
                ? "Xem yêu cầu"
                : "Xem hồ sơ",
          exact: true,
        }),
      ).toBeVisible();
      await page.screenshot({
        path: `D:/02_PROJECTS/5TOT/s3-city-queue-1440x900-${value}.png`,
        fullPage: false,
      });
    }

    await page.getByLabel("Tìm sinh viên hoặc MSSV").fill("");
    await page.getByLabel("Lọc tiêu chí").selectOption("all");
    await page.getByRole("tab", { name: "Đã hoàn thành", exact: true }).click();
    await expect
      .poll(() => new URL(taskRequests.at(-1) ?? "http://localhost").searchParams.get("statuses"))
      .toBe("accepted,rejected");
    await expect(page.getByText("Tiêu chí đạt", { exact: true })).toBeVisible();
    await expect(page.getByText("Tiêu chí không đạt", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Xem kết quả", exact: true })).toHaveCount(2);
    await page.screenshot({
      path: "D:/02_PROJECTS/5TOT/s3-city-queue-1440x900-da-hoan-thanh.png",
      fullPage: false,
    });
    expect(
      taskRequests.filter((request) => new URL(request).searchParams.has("statuses")),
    ).toHaveLength(1);
  });

  test("claims once without confirmation and navigates after server success", async ({ page }) => {
    let claimCount = 0;
    await stubCityOfficer(page, async (route, path) => {
      if (path === "/api/review/tasks" && route.request().method() === "GET") {
        await json(route, {
          items: [task()],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        });
        return;
      }
      if (path === "/api/review/tasks/task-city-academic/claim") {
        claimCount += 1;
        await json(route, {
          task: task({ status: "reviewing", assignedOfficerId: "city-officer-1" }),
        });
        return;
      }
      await json(route, null);
    });

    await page.goto("/app/queue", { waitUntil: "domcontentloaded" });
    const claimButton = page.getByRole("button", { name: "Nhận xử lý", exact: true });
    await expect(claimButton).toBeVisible({ timeout: 60_000 });
    await claimButton.evaluate((button) => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await expect.poll(() => claimCount).toBe(1);
    await expect.poll(() => new URL(page.url()).pathname).toBe("/app/review/task-city-academic");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("shows conflict feedback and refreshes a stale claim", async ({ page }) => {
    let listCount = 0;
    await stubCityOfficer(page, async (route, path) => {
      if (path === "/api/review/tasks" && route.request().method() === "GET") {
        listCount += 1;
        await json(route, {
          items: [
            listCount === 1
              ? task()
              : task({
                  assignedOfficerId: "other-officer",
                  assignedOfficerName: "Cán bộ khác",
                  permissions: {
                    ...task().permissions,
                    canClaim: false,
                    canAct: false,
                    reason: "assigned_to_other",
                    reasonLabel: "Đang do cán bộ khác xử lý",
                  },
                }),
          ],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        });
        return;
      }
      if (path === "/api/review/tasks/task-city-academic/claim") {
        await route.fulfill({
          status: 409,
          headers: { ...corsHeaders, "content-type": "application/json" },
          body: JSON.stringify({
            success: false,
            data: null,
            error: { code: "CONFLICT", message: "Task này vừa được giao cho cán bộ khác." },
            meta: {},
          }),
        });
        return;
      }
      await json(route, null);
    });

    await page.goto("/app/queue", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Nhận xử lý", exact: true }).click();

    await expect(
      page.getByText("Hồ sơ này vừa được cán bộ khác nhận xử lý. Danh sách đã được cập nhật.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect.poll(() => listCount).toBeGreaterThan(1);
    await expect(page.getByRole("button", { name: "Nhận xử lý", exact: true })).toHaveCount(0);
    await expect(page.getByText("Cán bộ khác", { exact: true })).toBeVisible();
  });

  test("keeps the City Officer work surface usable across desktop viewport and zoom matrix", async ({
    page,
  }) => {
    await stubCityOfficer(page, async (route, path) => {
      if (path === "/api/review/tasks" && route.request().method() === "GET") {
        await json(route, {
          items: [
            task({
              studentName:
                "Nguyễn Văn An có tên sinh viên rất dài để kiểm tra khả năng xuống dòng trong bảng",
            }),
          ],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        });
        return;
      }
      await json(route, null);
    });

    await page.goto("/app/queue", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Việc cần xử lý" })).toBeVisible({
      timeout: 60_000,
    });

    const viewports = [
      [1280, 720],
      [1366, 768],
      [1440, 900],
      [1600, 900],
      [1920, 1080],
    ] as const;
    const zooms = [90, 100, 110, 125] as const;

    for (const [width, height] of viewports) {
      for (const zoom of zooms) {
        await page.setViewportSize({ width, height });
        await page.evaluate((scale) => {
          document.documentElement.style.zoom = `${scale}%`;
        }, zoom);
        await expect(page.getByRole("tab", { name: "Cần xử lý", exact: true })).toBeVisible();
        await expect(page.getByLabel("Tìm sinh viên hoặc MSSV")).toBeVisible();
        await expect(page.getByLabel("Lọc tiêu chí")).toBeVisible();
        await expect(page.getByRole("button", { name: "Nhận xử lý", exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: "Trang sau", exact: true })).toBeVisible();

        if (width === 1366 && height === 768 && zoom === 100) {
          await page.screenshot({
            path: "D:/02_PROJECTS/5TOT/s3-closeout-city-queue-1366x768-can-xu-ly.png",
            fullPage: false,
          });
        }

        const overflow = await page.evaluate(() => {
          const boxes = Array.from(document.querySelectorAll<HTMLElement>("body *"))
            .map((element) => element.getBoundingClientRect())
            .filter((box) => box.width > 0 && box.height > 0);

          return {
            left: Math.min(...boxes.map((box) => box.left)),
            right: Math.max(...boxes.map((box) => box.right)),
            viewport: window.innerWidth,
          };
        });
        expect(
          overflow.right,
          `${width}x${height} at ${zoom}% has page-level horizontal overflow`,
        ).toBeLessThanOrEqual(width + 1);
        expect(
          overflow.left,
          `${width}x${height} at ${zoom}% has content beyond the left edge`,
        ).toBeGreaterThanOrEqual(-1);
      }
    }
  });
});

async function stubCityOfficer(page: Page, handler: (route: Route, path: string) => Promise<void>) {
  await page.setViewportSize({ width: 1440, height: 900 });
  const user = {
    id: "city-officer-1",
    email: "officer@danang.gov.vn",
    fullName: "Cán bộ xét duyệt thành phố",
    role: "city_officer",
    workspaceId: "danang-city",
    studentCode: null,
    className: null,
    faculty: null,
    phone: null,
    avatarUrl: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    workspace: {
      id: "danang-city",
      code: "DANANG_CITY",
      name: "Đà Nẵng",
      shortName: "Đà Nẵng",
    },
    officerSpecializations: [
      { criterion: "academic", facultyScope: null, isActive: true },
      { criterion: "ethics", facultyScope: null, isActive: true },
      { criterion: "physical", facultyScope: null, isActive: true },
      { criterion: "volunteer", facultyScope: null, isActive: true },
      { criterion: "integration", facultyScope: null, isActive: true },
    ],
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
    if (path === "/api/auth/login" && request.method() === "POST") {
      await json(route, {
        user,
        accessToken: "city-officer-token",
        refreshToken: "city-officer-refresh",
      });
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

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(user.email);
  await page.getByRole("textbox", { name: "Mật khẩu" }).fill("Password@123");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/app/queue");
}

async function json(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    headers: { ...corsHeaders, "content-type": "application/json" },
    body: JSON.stringify({ success: true, data, error: null, meta: {} }),
  });
}
