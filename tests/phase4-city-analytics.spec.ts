import { expect, test, type Page, type Route } from "@playwright/test";

type Role =
  | "student"
  | "data_uploader"
  | "city_officer"
  | "city_manager"
  | "city_committee"
  | "manager"
  | "committee"
  | "admin";

const corsHeaders = {
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "access-control-allow-origin": "*",
};

test.describe("Phase 4 Part 3A City analytics", () => {
  for (const role of ["city_manager", "admin"] as const) {
    test(`${role} loads City analytics through the City API`, async ({ page }) => {
      const requests: string[] = [];
      await installMocks(page, role, requests);

      await page.goto("/app/analytics", { waitUntil: "domcontentloaded" });

      await expect(
        page.getByRole("heading", { name: "Theo dõi hồ sơ cấp Thành phố" }),
      ).toBeVisible();
      await expect(page.getByText("Hồ sơ đã nộp", { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Tiến độ theo 5 tiêu chí" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Theo trường" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Kết quả cuối" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Khối lượng City Officer" })).toBeVisible();
      await expect(page.getByRole("status")).toContainText("Thiếu 2 vị trí task");
      await expect(page.getByRole("button", { name: /Đã review đủ 5 tiêu chí/ })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /5 tiêu chí đã review/ })).toHaveCount(0);
      await expect(page.getByText("Nguyễn An", { exact: true })).toHaveCount(0);
      expect(requests.some((url) => new URL(url).pathname === "/api/analytics/city")).toBe(true);
      expect(requests.some((url) => url.includes("/api/manager/dashboard-summary"))).toBe(false);
      await expect(page.getByRole("heading", { name: "Quản lý mùa xét Thành phố" })).toBeVisible();
      expect(
        requests.some(
          (url) => new URL(url).pathname === "/api/manager/city-review-seasons/2025-2026",
        ),
      ).toBe(true);

      if (role === "city_manager") {
        await expect(
          page.getByRole("heading", { name: "Hồ sơ cần xác minh điều kiện" }),
        ).toBeVisible();
      } else {
        await expect(
          page.getByRole("heading", { name: "Hồ sơ cần xác minh điều kiện" }),
        ).toHaveCount(0);
      }
    });
  }

  for (const role of ["manager", "committee"] as const) {
    test(`${role} keeps the legacy workspace dashboard`, async ({ page }) => {
      const requests: string[] = [];
      await installMocks(page, role, requests);

      await page.goto("/app/analytics", { waitUntil: "domcontentloaded" });

      await expect(page.getByRole("heading", { name: "Tổng quan xét duyệt" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Quản lý mùa xét Thành phố" })).toHaveCount(0);
      expect(requests.some((url) => url.includes("/api/manager/dashboard-summary"))).toBe(true);
      expect(requests.some((url) => new URL(url).pathname.startsWith("/api/analytics/city"))).toBe(
        false,
      );
      expect(
        requests.some((url) =>
          new URL(url).pathname.startsWith("/api/manager/city-review-seasons"),
        ),
      ).toBe(false);
    });
  }

  for (const role of ["student", "city_officer", "city_committee", "data_uploader"] as const) {
    test(`${role} cannot load City analytics`, async ({ page }) => {
      const requests: string[] = [];
      await installMocks(page, role, requests);

      await page.goto("/app/analytics", { waitUntil: "domcontentloaded" });

      const landingPath = {
        student: "/app",
        city_officer: "/app/queue",
        city_committee: "/app/resolution",
        data_uploader: "/app/data-uploader",
      }[role];
      await expect(page).toHaveURL(new RegExp(`${landingPath.replaceAll("/", "\\/")}$`));
      await expect(page.getByRole("heading", { name: "Quản lý mùa xét Thành phố" })).toHaveCount(0);
      expect(requests.some((url) => new URL(url).pathname.startsWith("/api/analytics/city"))).toBe(
        false,
      );
      expect(
        requests.some((url) =>
          new URL(url).pathname.startsWith("/api/manager/city-review-seasons"),
        ),
      ).toBe(false);
    });
  }

  test("City Manager configures a season with reason and explicit Vietnam timezone", async ({
    page,
  }) => {
    const requests: string[] = [];
    let createBody: Record<string, unknown> | undefined;
    await installMocks(page, "city_manager", requests);
    await page.route(
      "http://localhost:8080/api/manager/city-review-seasons/2025-2026",
      async (route) => {
        requests.push(`${route.request().method()} ${route.request().url()}`);
        if (route.request().method() === "GET") return json(route, null);
        return json(route, null);
      },
    );
    await page.route("http://localhost:8080/api/manager/city-review-seasons", async (route) => {
      requests.push(`${route.request().method()} ${route.request().url()}`);
      if (route.request().method() === "POST") {
        createBody = route.request().postDataJSON() as Record<string, unknown>;
        return json(route, reviewSeason());
      }
      return json(route, null);
    });

    await page.goto("/app/analytics", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Cấu hình mùa xét/ }).click();

    await expect(page.getByRole("heading", { name: "Quản lý mùa xét Thành phố" })).toBeVisible();
    await page.getByLabel("Mở đợt nộp hồ sơ").fill("2026-09-03T09:00");
    await page.getByLabel("Đóng đợt nộp hồ sơ").fill("2026-09-02T09:00");
    await page.getByLabel("Hạn hoàn tất review").fill("2026-10-01T09:00");
    await page.getByLabel("Hạn xử lý bổ sung").fill("2026-10-07T09:00");
    await page.getByLabel("Hạn chốt kết quả").fill("2026-10-14T09:00");
    await page.getByLabel("Lý do thay đổi lịch").fill("Điều chỉnh theo kế hoạch năm học.");
    await page.getByRole("button", { name: "Lưu lịch mùa xét" }).click();
    await expect(page.getByText("Thời điểm đóng nộp phải sau thời điểm mở nộp.")).toBeVisible();
    expect(createBody).toBeUndefined();

    await page.getByLabel("Đóng đợt nộp hồ sơ").fill("2026-09-04T09:00");
    await page.getByRole("button", { name: "Lưu lịch mùa xét" }).click();
    await expect(page.getByRole("dialog", { name: "Xác nhận lưu lịch mùa xét" })).toBeVisible();
    await page.getByRole("button", { name: "Xác nhận lưu" }).click();

    await expect
      .poll(() => createBody)
      .toEqual({
        schoolYear: "2025-2026",
        submissionOpensAt: "2026-09-03T02:00:00.000Z",
        submissionClosesAt: "2026-09-04T02:00:00.000Z",
        reviewDeadlineAt: "2026-10-01T02:00:00.000Z",
        supplementDeadlineAt: "2026-10-07T02:00:00.000Z",
        finalizationDeadlineAt: "2026-10-14T02:00:00.000Z",
        reason: "Điều chỉnh theo kế hoạch năm học.",
      });
    expect(requests.some((item) => item.startsWith("POST "))).toBe(true);
  });

  test("admin edits an existing season with its optimistic version and reason", async ({
    page,
  }) => {
    const requests: string[] = [];
    let patchBody: Record<string, unknown> | undefined;
    await installMocks(page, "admin", requests);
    await page.route(
      "http://localhost:8080/api/manager/city-review-seasons/2025-2026",
      async (route) => {
        requests.push(`${route.request().method()} ${route.request().url()}`);
        if (route.request().method() === "GET") return json(route, reviewSeason());
        if (route.request().method() === "PATCH") {
          patchBody = route.request().postDataJSON() as Record<string, unknown>;
          return json(route, reviewSeason(8));
        }
        return json(route, null);
      },
    );

    await page.goto("/app/analytics", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Quản lý mùa xét Thành phố" })).toBeVisible();
    await page.getByRole("button", { name: "Chỉnh sửa lịch" }).click();
    await expect(page.getByLabel("Lý do thay đổi lịch")).toBeEnabled();
    await page.getByRole("button", { name: "Cập nhật lịch mùa xét" }).click();
    await expect(page.getByText("Nhập lý do thay đổi lịch.")).toBeVisible();
    expect(patchBody).toBeUndefined();

    await page.getByLabel("Lý do thay đổi lịch").fill("Cập nhật theo thông báo.");
    await page.getByRole("button", { name: "Cập nhật lịch mùa xét" }).click();
    await page.getByRole("button", { name: "Xác nhận lưu" }).click();
    await expect
      .poll(() => patchBody)
      .toMatchObject({ expectedVersion: 7, reason: "Cập nhật theo thông báo." });
    expect(requests.some((item) => item.startsWith("PATCH "))).toBe(true);
  });

  test("deadline exception controls grant and revoke only after confirmation and reason", async ({
    page,
  }) => {
    await page.clock.install({ time: new Date("2026-09-29T02:00:00.000Z") });
    const requests: Array<{ method: string; url: string; body?: Record<string, unknown> }> = [];
    let exceptionGranted = false;
    const detail = cityResultDetail();
    detail.application.status = "draft";
    detail.application.submittedAt = null;
    await installMocks(page, "city_manager", []);
    await page.route("http://localhost:8080/api/manager/results/app-city-1", async (route) =>
      json(route, detail),
    );
    await page.route(
      "http://localhost:8080/api/manager/applications/app-city-1/submission-deadline",
      async (route) => {
        requests.push({
          method: route.request().method(),
          url: route.request().url(),
          body: route.request().postDataJSON() as Record<string, unknown> | undefined,
        });
        return json(route, managerDeadline(exceptionGranted));
      },
    );
    await page.route(
      "http://localhost:8080/api/manager/applications/app-city-1/submission-deadline-exception",
      async (route) => {
        exceptionGranted = route.request().method() !== "DELETE";
        requests.push({
          method: route.request().method(),
          url: route.request().url(),
          body: route.request().postDataJSON() as Record<string, unknown> | undefined,
        });
        return json(route, managerDeadline(exceptionGranted));
      },
    );

    await page.goto("/app/manager/results/app-city-1", { waitUntil: "domcontentloaded" });
    const deadlines = page.getByRole("region", { name: "Hạn nộp hồ sơ" });
    await expect(deadlines).toBeVisible();
    await page.getByLabel("Hiệu lực đến").fill("2026-10-03T18:00");
    await page.getByRole("button", { name: "Cấp ngoại lệ" }).click();
    await expect(page.getByText("Nhập lý do cấp ngoại lệ.")).toBeVisible();
    expect(requests.some((item) => item.method === "PUT")).toBe(false);

    await page.getByLabel("Lý do cấp ngoại lệ").fill("Bổ sung hồ sơ sức khỏe.");
    await page.getByRole("button", { name: "Cấp ngoại lệ" }).click();
    await expect(page.getByRole("dialog", { name: "Xác nhận cấp ngoại lệ" })).toBeVisible();
    await page.getByRole("button", { name: "Xác nhận cấp" }).click();
    await expect.poll(() => requests.some((item) => item.method === "PUT")).toBe(true);
    expect(requests.find((item) => item.method === "PUT")?.body).toEqual({
      validUntil: "2026-10-03T11:00:00.000Z",
      reason: "Bổ sung hồ sơ sức khỏe.",
    });

    await page.getByRole("button", { name: "Thu hồi ngoại lệ" }).click();
    await expect(page.getByText("Nhập lý do thu hồi ngoại lệ.")).toBeVisible();
    expect(requests.some((item) => item.method === "DELETE")).toBe(false);

    await page.getByLabel("Lý do thu hồi ngoại lệ").fill("Đã nộp hồ sơ đúng hạn.");
    await page.getByRole("button", { name: "Thu hồi ngoại lệ" }).click();
    await expect(page.getByRole("dialog", { name: "Xác nhận thu hồi ngoại lệ" })).toBeVisible();
    await page.getByRole("button", { name: "Xác nhận thu hồi" }).click();
    await expect.poll(() => requests.some((item) => item.method === "DELETE")).toBe(true);
    expect(requests.find((item) => item.method === "DELETE")?.body).toEqual({
      reason: "Đã nộp hồ sơ đúng hạn.",
    });
  });

  test("allows deadline exception management for an unsubmitted supplement-required City application", async ({
    page,
  }) => {
    const detail = cityResultDetail();
    detail.application.status = "supplement_required";
    detail.application.submittedAt = null;
    await installMocks(page, "city_manager", []);
    await page.route("http://localhost:8080/api/manager/results/app-city-1", async (route) =>
      json(route, detail),
    );
    await page.route(
      "http://localhost:8080/api/manager/applications/app-city-1/submission-deadline",
      async (route) => json(route, managerDeadline(false)),
    );

    await page.goto("/app/manager/results/app-city-1", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("region", { name: "Hạn nộp hồ sơ" })).toBeVisible();
  });

  test("rejects an already-expired exception before asking for confirmation", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-09-29T02:00:00.000Z") });
    const requests: string[] = [];
    const detail = cityResultDetail();
    detail.application.status = "draft";
    detail.application.submittedAt = null;
    await installMocks(page, "city_manager", []);
    await page.route("http://localhost:8080/api/manager/results/app-city-1", async (route) =>
      json(route, detail),
    );
    await page.route(
      "http://localhost:8080/api/manager/applications/app-city-1/submission-deadline",
      async (route) => json(route, managerDeadline(false)),
    );
    await page.route(
      "http://localhost:8080/api/manager/applications/app-city-1/submission-deadline-exception",
      async (route) => {
        requests.push(route.request().method());
        return json(route, managerDeadline(true));
      },
    );

    await page.goto("/app/manager/results/app-city-1", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Hiệu lực đến").fill("2026-09-28T18:00");
    await page.getByLabel("Lý do cấp ngoại lệ").fill("Lý do kiểm thử.");
    await page.getByRole("button", { name: "Cấp ngoại lệ" }).click();

    await expect(page.getByText("Thời điểm hết hiệu lực phải nằm trong tương lai.")).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Xác nhận cấp ngoại lệ" })).toHaveCount(0);
    expect(requests).toEqual([]);
  });

  test("manager deadline panel follows the explicit initial-draft role allowlist", async ({
    page,
  }) => {
    const allowedRoles: Role[] = ["city_manager", "admin"];
    const deniedDetailRoles: Array<{ role: Role; landingPath: string }> = [
      { role: "city_officer", landingPath: "/app/queue" },
      { role: "data_uploader", landingPath: "/app/data-uploader" },
    ];
    const detailRolesWithoutDeadlineManagement: Role[] = ["city_committee", "manager", "committee"];

    for (const role of allowedRoles) {
      const requests: string[] = [];
      const draft = cityResultDetail();
      draft.application.status = "draft";
      draft.application.submittedAt = null;
      await installMocks(page, role, requests);
      await page.route("http://localhost:8080/api/manager/results/app-city-1", async (route) =>
        json(route, draft),
      );
      await page.route(
        "http://localhost:8080/api/manager/applications/app-city-1/submission-deadline",
        async (route) => {
          requests.push(route.request().url());
          return json(route, managerDeadline(false));
        },
      );
      await page.goto("/app/manager/results/app-city-1", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("region", { name: "Hạn nộp hồ sơ" })).toBeVisible();
      await expect
        .poll(() => requests.some((url) => url.includes("submission-deadline")))
        .toBe(true);
      await page.goto("about:blank");
    }

    for (const { role, landingPath } of deniedDetailRoles) {
      const requests: string[] = [];
      await installMocks(page, role, requests);
      await page.goto("/app/manager/results/app-city-1", { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(new RegExp(`${landingPath.replaceAll("/", "\\/")}$`));
      expect(requests.some((url) => url.includes("submission-deadline"))).toBe(false);
      await page.goto("about:blank");
    }

    for (const role of detailRolesWithoutDeadlineManagement) {
      const requests: string[] = [];
      const draft = cityResultDetail();
      draft.application.status = "draft";
      draft.application.submittedAt = null;
      await installMocks(page, role, requests);
      await page.route("http://localhost:8080/api/manager/results/app-city-1", async (route) =>
        json(route, draft),
      );
      await page.route(
        "http://localhost:8080/api/manager/applications/app-city-1/submission-deadline",
        async (route) => {
          requests.push(route.request().url());
          return json(route, managerDeadline(false));
        },
      );
      await page.goto("/app/manager/results/app-city-1", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Chi tiết kết quả hồ sơ" })).toBeVisible();
      await expect(page.getByRole("region", { name: "Hạn nộp hồ sơ" })).toHaveCount(0);
      expect(requests.some((url) => url.includes("submission-deadline"))).toBe(false);
      await page.goto("about:blank");
    }
  });

  test("a future deadline exception is visible and revocable before the base window closes", async ({
    page,
  }) => {
    await page.clock.install({ time: new Date("2026-09-29T02:00:00.000Z") });
    const requests: string[] = [];
    const draft = cityResultDetail();
    draft.application.status = "draft";
    draft.application.submittedAt = null;
    const response = managerDeadline(false);
    response.submission.status = "OPEN";
    response.submission.exceptionActive = false;
    response.exception = {
      validUntil: "2026-10-03T11:00:00.000Z",
      reason: "Kế hoạch hỗ trợ sinh viên.",
      grantedAt: "2026-09-20T02:00:00.000Z",
      revokedAt: null,
    };
    await installMocks(page, "admin", requests);
    await page.route("http://localhost:8080/api/manager/results/app-city-1", async (route) =>
      json(route, draft),
    );
    await page.route(
      "http://localhost:8080/api/manager/applications/app-city-1/submission-deadline",
      async (route) => {
        requests.push(route.request().url());
        return json(route, response);
      },
    );

    await page.goto("/app/manager/results/app-city-1", { waitUntil: "domcontentloaded" });
    const panel = page.getByRole("region", { name: "Hạn nộp hồ sơ" });
    await expect(panel.getByText(/Ngoại lệ có hiệu lực đến/)).toBeVisible();
    await expect(panel.getByText("Lý do: Kế hoạch hỗ trợ sinh viên.")).toBeVisible();
    await expect(panel.getByRole("button", { name: "Thu hồi ngoại lệ" })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Cấp ngoại lệ" })).toHaveCount(0);
  });

  test("filters the dashboard and paginated drill-down with the selected scope", async ({
    page,
  }) => {
    const requests: string[] = [];
    await installMocks(page, "city_manager", requests);

    await page.goto("/app/analytics", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Theo dõi hồ sơ cấp Thành phố" })).toBeVisible();

    await page.getByLabel("Năm học").selectOption("2024-2025");
    await page.getByRole("combobox", { name: "Trường", exact: true }).selectOption("school-dut");
    await page.getByLabel("Trạng thái hồ sơ").selectOption("supplement_required");
    await expect
      .poll(() =>
        requests.some((url) => {
          const parsed = new URL(url);
          return (
            parsed.pathname === "/api/analytics/city" &&
            parsed.searchParams.get("schoolYear") === "2024-2025" &&
            parsed.searchParams.get("workspaceId") === "school-dut" &&
            parsed.searchParams.get("status") === "supplement_required"
          );
        }),
      )
      .toBe(true);

    await page.getByRole("button", { name: /Cần bổ sung hồ sơ/i }).click();
    await expect(page.getByRole("heading", { name: "Danh sách hồ sơ" })).toBeVisible();
    await expect(page.getByText("Nguyễn An", { exact: true })).toBeVisible();
    await expect
      .poll(() =>
        requests.some((url) => {
          const parsed = new URL(url);
          return (
            parsed.pathname === "/api/analytics/city/applications" &&
            parsed.searchParams.get("schoolYear") === "2024-2025" &&
            parsed.searchParams.get("workspaceId") === "school-dut" &&
            parsed.searchParams.get("status") === "supplement_required" &&
            parsed.searchParams.get("supplementRequired") === "true" &&
            parsed.searchParams.get("page") === "1"
          );
        }),
      )
      .toBe(true);

    await page.getByLabel("Tìm hồ sơ").fill("001234");
    await expect
      .poll(() => requests.some((url) => new URL(url).searchParams.get("q") === "001234"))
      .toBe(true);

    await page.getByRole("button", { name: "Trang sau" }).click();
    await expect
      .poll(() =>
        requests.some((url) => {
          const parsed = new URL(url);
          return (
            parsed.pathname === "/api/analytics/city/applications" &&
            parsed.searchParams.get("page") === "2"
          );
        }),
      )
      .toBe(true);

    await page.getByRole("link", { name: /Nguyễn An/ }).click();
    await expect(page).toHaveURL(/\/app\/manager\/results\/app-city-1$/);
  });

  test("shows a clear empty-year state and no misleading counts", async ({ page }) => {
    const requests: string[] = [];
    await installMocks(page, "admin", requests, true);

    await page.goto("/app/analytics", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Chưa có hồ sơ Thành phố trong dữ liệu.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Hồ sơ đã nộp: 0/ })).toBeVisible();
    await expect(page.getByRole("img", { name: "5 tiêu chí đã review: 0 hồ sơ" })).toBeVisible();
    await page.getByLabel("Trạng thái hồ sơ").selectOption("not_started");
    await expect
      .poll(() =>
        requests.some(
          (url) =>
            new URL(url).pathname === "/api/analytics/city" &&
            new URL(url).searchParams.get("status") === "not_started",
        ),
      )
      .toBe(true);
  });

  test("criterion and final-result counts open precisely filtered lists", async ({ page }) => {
    const requests: string[] = [];
    await installMocks(page, "admin", requests);

    await page.goto("/app/analytics", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Theo dõi hồ sơ cấp Thành phố" })).toBeVisible();

    await page.getByRole("button", { name: /Đạo đức tốt: Chờ: 2/ }).click();
    await expect
      .poll(() =>
        requests.some((url) => {
          const parsed = new URL(url);
          return (
            parsed.pathname === "/api/analytics/city/applications" &&
            parsed.searchParams.get("criterion") === "ethics" &&
            parsed.searchParams.get("taskStatus") === "waiting"
          );
        }),
      )
      .toBe(true);

    await page.getByRole("button", { name: "Đạt: 1; xem hồ sơ", exact: true }).click();
    await expect
      .poll(() =>
        requests.some((url) => {
          const parsed = new URL(url);
          return (
            parsed.pathname === "/api/analytics/city/applications" &&
            parsed.searchParams.get("finalStatus") === "passed" &&
            parsed.searchParams.get("submitted") === "true"
          );
        }),
      )
      .toBe(true);
  });

  test("application KPI drilldowns use exact list filters", async ({ page }) => {
    const requests: string[] = [];
    await installMocks(page, "city_manager", requests);

    await page.goto("/app/analytics", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Vướng hội đồng: 1; mở danh sách hồ sơ" }).click();
    await expect
      .poll(() =>
        requests.some((url) => {
          const parsed = new URL(url);
          return (
            parsed.pathname === "/api/analytics/city/applications" &&
            parsed.searchParams.get("resolutionBlocked") === "true" &&
            !parsed.searchParams.has("status")
          );
        }),
      )
      .toBe(true);

    await page.getByRole("button", { name: "Cần bổ sung hồ sơ: 3; mở danh sách hồ sơ" }).click();
    await expect
      .poll(() =>
        requests.some(
          (url) =>
            new URL(url).pathname === "/api/analytics/city/applications" &&
            new URL(url).searchParams.get("supplementRequired") === "true",
        ),
      )
      .toBe(true);

    await page.getByRole("button", { name: "Chưa nộp: 2; mở danh sách hồ sơ" }).click();
    await expect
      .poll(() =>
        requests.some(
          (url) =>
            new URL(url).pathname === "/api/analytics/city/applications" &&
            new URL(url).searchParams.get("submitted") === "false",
        ),
      )
      .toBe(true);

    await page.getByRole("button", { name: "Hồ sơ đã nộp: 14; mở danh sách hồ sơ" }).click();
    await expect
      .poll(() =>
        requests.some(
          (url) =>
            new URL(url).pathname === "/api/analytics/city/applications" &&
            new URL(url).searchParams.get("submitted") === "true",
        ),
      )
      .toBe(true);

    await page.getByRole("button", { name: "Đang xét: 7; mở danh sách hồ sơ" }).click();
    await expect
      .poll(() =>
        requests.some(
          (url) =>
            new URL(url).pathname === "/api/analytics/city/applications" &&
            new URL(url).searchParams.get("inReview") === "true",
        ),
      )
      .toBe(true);

    await page.getByRole("button", { name: /Task cần bổ sung: 4/i }).click();
    await expect
      .poll(() =>
        requests.some((url) => {
          const parsed = new URL(url);
          return (
            parsed.pathname === "/api/analytics/city/applications" &&
            parsed.searchParams.get("taskStatus") === "supplement_required"
          );
        }),
      )
      .toBe(true);
  });

  test("year, school, and status controls stay the source of list filters", async ({ page }) => {
    const requests: string[] = [];
    await installMocks(page, "city_manager", requests);

    await page.goto("/app/analytics", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Trạng thái hồ sơ").selectOption("draft");
    await page.getByRole("button", { name: "Xem hồ sơ trường Trường Đại học Bách khoa" }).click();
    await expect(page.getByRole("combobox", { name: "Trường", exact: true })).toHaveValue(
      "school-dut",
    );

    await expect
      .poll(() =>
        requests.some((url) => {
          const parsed = new URL(url);
          return (
            parsed.pathname === "/api/analytics/city/applications" &&
            parsed.searchParams.get("workspaceId") === "school-dut" &&
            parsed.searchParams.get("status") === "draft"
          );
        }),
      )
      .toBe(true);

    await page.getByLabel("Trạng thái hồ sơ").selectOption("under_review");
    await expect
      .poll(() =>
        requests.some((url) => {
          const parsed = new URL(url);
          return (
            parsed.pathname === "/api/analytics/city/applications" &&
            parsed.searchParams.get("workspaceId") === "school-dut" &&
            parsed.searchParams.get("status") === "under_review"
          );
        }),
      )
      .toBe(true);

    await page.getByRole("combobox", { name: "Trường", exact: true }).selectOption("");
    await expect
      .poll(() =>
        requests.some((url) => {
          const parsed = new URL(url);
          return (
            parsed.pathname === "/api/analytics/city/applications" &&
            parsed.searchParams.get("schoolYear") === "2025-2026" &&
            parsed.searchParams.get("status") === "under_review" &&
            !parsed.searchParams.has("workspaceId")
          );
        }),
      )
      .toBe(true);

    await page.getByLabel("Trạng thái hồ sơ").selectOption("draft");
    await expect
      .poll(() =>
        requests.some((url) => {
          const parsed = new URL(url);
          return (
            parsed.pathname === "/api/analytics/city/applications" &&
            parsed.searchParams.get("status") === "draft" &&
            !parsed.searchParams.has("workspaceId")
          );
        }),
      )
      .toBe(true);

    await page.getByLabel("Năm học").selectOption("2024-2025");
    await expect
      .poll(() =>
        requests.some((url) => {
          const parsed = new URL(url);
          return (
            parsed.pathname === "/api/analytics/city/applications" &&
            parsed.searchParams.get("schoolYear") === "2024-2025" &&
            parsed.searchParams.get("status") === "draft" &&
            !parsed.searchParams.has("workspaceId")
          );
        }),
      )
      .toBe(true);
  });

  test("dashboard tables remain inside a mobile viewport", async ({ page }) => {
    const requests: string[] = [];
    await installMocks(page, "city_manager", requests);
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/app/analytics", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Theo dõi hồ sơ cấp Thành phố" })).toBeVisible();

    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(documentWidth).toBeLessThanOrEqual(viewportWidth);
  });

  test("admin retains existing City result access and assignment remains restricted", async ({
    page,
  }) => {
    const requests: string[] = [];
    await installMocks(page, "admin", requests);

    await page.goto("/app/manager/results/app-city-1", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/app\/manager\/results\/app-city-1$/);
    await expect(page.getByRole("heading", { name: "Kết quả hồ sơ" })).toBeVisible();
    expect(requests.some((url) => url.includes("/api/manager/results/app-city-1"))).toBe(true);
    await expect(page.getByRole("heading", { name: "Tổng hợp quyết định" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Chọn kết quả chốt" })).toBeVisible();

    await page.goto("/app/manager/results/app-city-final-1", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Kết quả đã chốt" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mở lại kết quả" })).toBeVisible();

    await page.goto("/app/assignment", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/app\/admin\/workspaces$/);

    await page.goto("/app/manager/results", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/app\/manager\/results$/);
  });

  for (const role of ["manager", "committee"] as const) {
    test(`${role} keeps existing result list and detail access`, async ({ page }) => {
      const requests: string[] = [];
      await installMocks(page, role, requests);

      await page.goto("/app/manager/results", { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/app\/manager\/results$/);
      await expect(page.getByRole("heading", { name: "Kết quả xét duyệt theo cấp" })).toBeVisible();

      await page.goto("/app/manager/results/app-city-1", { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/app\/manager\/results\/app-city-1$/);
      await expect(page.getByRole("heading", { name: "Kết quả hồ sơ" })).toBeVisible();
      expect(requests.some((url) => url.includes("/api/manager/results/app-city-1"))).toBe(true);
    });
  }
});

async function installMocks(page: Page, role: Role, requests: string[], empty = false) {
  const user = userFor(role);
  await page.route("http://localhost:8080/api/**", async (route) => {
    const request = route.request();
    const url = request.url();
    const path = new URL(url).pathname;
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      return;
    }
    if (path !== "/api/me" && path !== "/api/auth/me") requests.push(url);
    if (path === "/api/me" || path === "/api/auth/me") return json(route, user);
    if (path === "/api/analytics/city") return json(route, citySummary(empty));
    if (path === "/api/analytics/city/applications") {
      const requestedPage = Number(new URL(url).searchParams.get("page") ?? 1);
      return json(route, {
        items: [
          {
            id: "app-city-1",
            schoolYear: "2024-2025",
            status: "supplement_required",
            submittedAt: "2025-11-01T09:00:00.000Z",
            reviewProgress: { reviewed: 4, expected: 5, anomalous: false },
            finalStatus: "pending",
            supplementRequired: true,
            resolutionBlocked: false,
            student: { fullName: "Nguyễn An", studentCode: "001234" },
            school: { workspaceId: "school-dut", code: "DDK", name: "Trường Đại học Bách khoa" },
          },
        ],
        pagination: { page: requestedPage, limit: 20, total: 41, totalPages: 3 },
      });
    }
    if (
      path === "/api/manager/applications" &&
      new URL(url).searchParams.has("eligibilityVerification")
    ) {
      return json(route, {
        items: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    }
    if (path === "/api/manager/dashboard-summary") return json(route, {});
    if (path.startsWith("/api/manager/applications/")) return json(route, {});
    if (path === "/api/manager/results/app-city-1") return json(route, cityResultDetail());
    if (path === "/api/manager/results/app-city-final-1") {
      return json(route, cityResultDetail(true));
    }
    return json(route, null);
  });

  await page.addInitScript(
    (auth) => window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 })),
    { user, accessToken: `phase4-${role}-token`, refreshToken: "refresh" },
  );
}

function cityResultDetail(finalized = false) {
  const criteria = ["ethics", "academic", "physical", "volunteer", "integration"] as const;
  return {
    application: {
      id: finalized ? "app-city-final-1" : "app-city-1",
      schoolYear: "2025-2026",
      applicationType: "individual",
      targetLevel: "city",
      status: finalized ? "completed" : "under_review",
      submittedAt: "2026-01-03T00:00:00.000Z",
      readinessScore: 100,
      finalStatus: finalized ? "passed" : "pending",
      finalLevel: finalized ? "city" : null,
      finalizedAt: finalized ? "2026-09-27T00:00:00.000Z" : null,
      finalizedBy: finalized ? { id: "manager-1", fullName: "City Manager" } : null,
      finalNote: null,
      updatedAt: "2026-09-27T00:00:00.000Z",
      lastActivityAt: "2026-09-27T00:00:00.000Z",
    },
    student: {
      id: "student-1",
      fullName: "Nguyễn Văn An",
      studentCode: "00123456",
      className: "22T1",
      faculty: "Công nghệ thông tin",
    },
    metrics: [],
    reviewTasks: criteria.map((criterion, index) => ({
      id: `task-${index + 1}`,
      criterion,
      status: "accepted",
      decision: "accepted",
      evidences: [],
    })),
    applicationEvidences: [],
    criterionSummary: {},
    resolutionCases: [],
    auditTimeline: [],
    aggregation: {
      suggestedFinalStatus: "pending",
      suggestedFinalLevel: "city",
      reason: "Đã xử lý đủ năm tiêu chí.",
      canFinalize: true,
      blockingIssues: [],
    },
  };
}

function reviewSeason(version = 7) {
  return {
    id: "season-2025-2026",
    schoolYear: "2025-2026",
    submissionOpensAt: "2026-09-01T02:00:00.000Z",
    submissionClosesAt: "2026-09-02T02:00:00.000Z",
    reviewDeadlineAt: "2026-10-01T02:00:00.000Z",
    supplementDeadlineAt: "2026-10-07T02:00:00.000Z",
    finalizationDeadlineAt: "2026-10-14T02:00:00.000Z",
    version,
    updatedAt: "2026-08-20T02:00:00.000Z",
    submissionStatus: "NOT_OPEN",
    reviewStatus: "ON_TRACK",
    supplementStatus: "ON_TRACK",
    finalizationStatus: "ON_TRACK",
  };
}

function managerDeadline(exceptionActive: boolean) {
  return {
    applicationId: "app-city-1",
    schoolYear: "2025-2026",
    application: {
      applicationType: "individual",
      targetLevel: "city",
      status: "draft",
      submittedAt: null,
    },
    submission: {
      status: exceptionActive ? "EXCEPTION_ACTIVE" : "OPEN",
      opensAt: "2026-09-01T02:00:00.000Z",
      closesAt: "2026-10-01T02:00:00.000Z",
      effectiveClosesAt: exceptionActive ? "2026-10-03T11:00:00.000Z" : "2026-10-01T02:00:00.000Z",
      exceptionActive,
      exceptionValidUntil: exceptionActive ? "2026-10-03T11:00:00.000Z" : null,
    },
    review: { deadlineAt: "2026-10-10T02:00:00.000Z", status: "ON_TRACK" },
    supplement: { deadlineAt: "2026-10-13T02:00:00.000Z", status: "ON_TRACK" },
    finalization: { deadlineAt: "2026-10-20T02:00:00.000Z", status: "ON_TRACK" },
    exception: exceptionActive
      ? {
          validUntil: "2026-10-03T11:00:00.000Z",
          reason: "Bổ sung hồ sơ sức khỏe.",
          grantedAt: "2026-09-29T02:00:00.000Z",
          revokedAt: null,
        }
      : null,
  };
}

function userFor(role: Role) {
  const isStudent = role === "student";
  const isAdmin = role === "admin";
  const workspaceId = isAdmin
    ? null
    : isStudent
      ? "school-dut"
      : role === "city_manager"
        ? "danang-city"
        : "school-dut";
  return {
    id: `user-${role}`,
    workspaceId,
    email: `${role}@test.local`,
    role,
    fullName: "Người dùng kiểm thử",
    studentCode: isStudent ? "001234" : null,
    className: null,
    faculty: null,
    phone: null,
    avatarUrl: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    workspace: workspaceId
      ? {
          id: workspaceId,
          code: workspaceId === "danang-city" ? "DANANG_CITY" : "DDK",
          name: workspaceId === "danang-city" ? "Đà Nẵng" : "Trường Đại học Bách khoa",
          shortName: null,
        }
      : null,
    officerSpecializations: [],
  };
}

function citySummary(empty: boolean) {
  return {
    filters: { schoolYear: empty ? null : "2025-2026", workspaceId: null, status: null },
    availableSchoolYears: empty ? [] : ["2025-2026", "2024-2025"],
    filterOptions: {
      schools: [{ workspaceId: "school-dut", code: "DDK", name: "Trường Đại học Bách khoa" }],
    },
    applications: {
      created: empty ? 0 : 16,
      notSubmitted: empty ? 0 : 2,
      submitted: empty ? 0 : 14,
      inReview: empty ? 0 : 7,
      supplementRequired: empty ? 0 : 3,
      resolutionBlocked: empty ? 0 : 1,
      reviewComplete: empty ? 0 : 4,
      missingCriterionSlots: empty ? 0 : 2,
      progressDistribution: empty
        ? { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }
        : { "0": 0, "1": 1, "2": 2, "3": 3, "4": 3, "5": 5 },
      unexpectedTaskCount: 0,
    },
    criteria: [
      {
        criterion: "ethics",
        totalTasks: empty ? 0 : 5,
        pending: empty ? 0 : 2,
        inReview: 0,
        supplementRequired: 0,
        resolutionNeeded: 0,
        pass: empty ? 0 : 1,
        fail: 0,
      },
      ...(["academic", "physical", "volunteer", "integration"] as const).map((criterion) => ({
        criterion,
        totalTasks: empty ? 0 : 3,
        pending: 0,
        inReview: 0,
        supplementRequired: 0,
        resolutionNeeded: 0,
        pass: 0,
        fail: 0,
      })),
    ],
    bySchool: empty
      ? []
      : [
          {
            workspaceId: "school-dut",
            code: "DDK",
            name: "Trường Đại học Bách khoa",
            submitted: 14,
            inReview: 7,
            supplementRequired: 3,
            reviewComplete: 4,
            finalPassed: 1,
            finalFailed: 0,
          },
        ],
    reviewers: empty
      ? []
      : [
          {
            officerId: "officer-1",
            fullName: "Cán bộ A",
            assignedActive: 4,
            pending: 1,
            completed: 2,
            supplementRequired: 1,
            resolutionNeeded: 0,
          },
        ],
    finalResults: {
      finalized: empty ? 0 : 1,
      passed: empty ? 0 : 1,
      failed: 0,
      partiallyPassed: 0,
      notFinalized: empty ? 0 : 13,
    },
    supplement: { applications: empty ? 0 : 3, tasks: empty ? 0 : 4 },
    resolution: {
      openCases: empty ? 0 : 1,
      resolvedCases: 0,
      blockedApplications: empty ? 0 : 1,
    },
  };
}

async function json(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    headers: { ...corsHeaders, "content-type": "application/json" },
    body: JSON.stringify({ success: true, data, error: null, meta: {} }),
  });
}
