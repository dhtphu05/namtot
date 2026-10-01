import { expect, test, type Page, type Route } from "@playwright/test";

const requests: Array<{ method: string; url: string; body: unknown }> = [];
const corsHeaders = {
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "access-control-allow-origin": "*",
};
const cancelledWriteMessage = "Hồ sơ đã bị hủy. Mở lại hồ sơ trước khi tiếp tục xử lý.";

type LifecycleRequest = { method: string; url: string; body: unknown };

type LifecycleDetailOptions = {
  finalized?: boolean;
  cancelled?: boolean;
  archived?: boolean;
  historicalFinal?: boolean;
  draft?: boolean;
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

test("lifecycle actions invalidate officer queues and dashboard caches", async ({ page }) => {
  requests.length = 0;
  await page.route("http://localhost:8080/api/**", async (route) => respondToApi(route));
  await page.goto("/login", { waitUntil: "networkidle" });

  await page.evaluate(async () => {
    const source = await fetch("/src/features/manager/hooks/useManager.ts").then((response) =>
      response.text(),
    );
    const version = source.match(/@tanstack_react-query\.js(\?v=[^"]+)/)?.[1];
    if (!version) throw new Error("Could not resolve the Vite dependency version");
    const ReactModule = await import(`/node_modules/.vite/deps/react.js${version}`);
    const React = ReactModule.default;
    const { createRoot } = (await import(`/node_modules/.vite/deps/react-dom_client.js${version}`))
      .default;
    const { QueryClient, QueryClientProvider } = await import(
      `/node_modules/.vite/deps/@tanstack_react-query.js${version}`
    );
    const { useCancelManagerApplication } =
      await import("/src/features/manager/hooks/useManager.ts");
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const keys = [
      ["reviewTasks", { filter: "assigned" }],
      ["officerTasks", "officer-1", { filter: "assigned" }],
      ["officerDashboard", "officer-1"],
    ];
    for (const key of keys) queryClient.setQueryData(key, {});

    function MutationHarness() {
      const mutation = useCancelManagerApplication();
      return React.createElement(
        "button",
        {
          type: "button",
          "data-testid": "lifecycle-mutation-done",
          "data-done": mutation.isSuccess ? "true" : "false",
          onClick: () =>
            mutation.mutate({
              applicationId: "application-1",
              payload: { reason: "Duplicate submission" },
            }),
        },
        "Run lifecycle mutation",
      );
    }

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    root.render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(MutationHarness),
      ),
    );
    (window as Window & { __lifecycleQueryClient?: typeof queryClient }).__lifecycleQueryClient =
      queryClient;
  });

  await page.getByTestId("lifecycle-mutation-done").click();
  await expect(page.getByTestId("lifecycle-mutation-done")).toHaveAttribute("data-done", "true");
  const invalidationStates = await page.evaluate(() => {
    const queryClient = (
      window as Window & {
        __lifecycleQueryClient?: {
          getQueryCache: () => {
            findAll: (filters?: {
              queryKey?: unknown[];
            }) => Array<{ state: { isInvalidated: boolean } }>;
          };
        };
      }
    ).__lifecycleQueryClient;
    return queryClient
      ?.getQueryCache()
      .findAll()
      .map((query) => query.state.isInvalidated);
  });

  expect(requestFor("POST", "/api/manager/applications/application-1/cancel")).toBeDefined();
  expect(invalidationStates).toEqual([true, true, true]);
});

test("City Manager list defaults to active records and can discover cancelled and archived applications", async ({
  page,
}) => {
  const resultQueries: URL[] = [];
  await installResultsMocks(page, "city_manager", resultQueries);
  await page.goto("/app/manager/results", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: "Kết quả xét duyệt cấp Thành phố" }),
  ).toBeVisible();
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
  await page.getByRole("button", { name: "Chưa đạt Thành phố", exact: true }).click();

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

for (const role of ["city_manager", "city_committee", "admin"] as const) {
  test(`${role} result console shows City-only levels and counts from the scoped results API`, async ({
    page,
  }) => {
    const resultQueries: URL[] = [];
    const dashboardRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/manager/dashboard-summary")) {
        dashboardRequests.push(request.url());
      }
    });
    await installResultsMocks(page, role, resultQueries);
    await page.goto("/app/manager/results", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Kết quả xét duyệt cấp Thành phố" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Cấp Trường", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Cấp ĐHĐN", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Đạt Thành phố", exact: true })).toBeVisible();
    await expect(page.getByText("Bị hạ cấp", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Không đạt cấp nào", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Đạt cấp thấp hơn", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Cấp đăng ký", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Đạt Thành phố", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Đạt một phần", { exact: true })).toHaveCount(0);
    await expect(page.getByText("12", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Đạt Thành phố", { exact: true }).first().locator(".."),
    ).toContainText("5");
    await expect(
      page.getByText("Chưa đạt Thành phố", { exact: true }).first().locator(".."),
    ).toContainText("5");
    await expect(page.getByText("Chưa chốt", { exact: true }).first().locator("..")).toContainText(
      "2",
    );
    expect(dashboardRequests).toEqual([]);
    expect(resultQueries[0]?.searchParams.get("targetLevel")).toBeNull();
    expect(resultQueries[0]?.searchParams.get("schoolYear")).toBe("2025-2026");
  });
}

test("City Manager cancels a current final with reason, explicit warning and immutable history", async ({
  page,
}) => {
  const requests: LifecycleRequest[] = [];
  const state = lifecycleDetailData({ finalized: true });
  await installLifecycleDetailMocks(page, "city_manager", state, requests, {
    conflictOnFirstCancel: true,
  });
  await page.goto("/app/manager/results/app-city-1", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("button", { name: "Hủy hồ sơ" })).toBeVisible();
  await page.getByRole("button", { name: "Hủy hồ sơ" }).click();
  const dialog = page.getByRole("dialog", { name: "Hủy hồ sơ" });
  await expect(dialog).toContainText(
    "Kết quả hiện tại sẽ được chuyển vào lịch sử và không còn được tính là kết quả chính thức hiện hành.",
  );
  const confirm = dialog.getByRole("button", { name: "Xác nhận hủy hồ sơ" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Lý do hủy hồ sơ").fill("Hồ sơ trùng đã được nộp.");
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(dialog.getByRole("alert")).toHaveText(cancelledWriteMessage);

  await confirm.click();
  await expect(page.getByText("Đã hủy hồ sơ", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lịch sử kết quả trước đây" })).toBeVisible();
  await expect(page.getByText("Kết quả trước đó: Đạt Thành phố")).toBeVisible();
  await expect(page.getByText("Đã chốt", { exact: true })).toHaveCount(0);
  expect(
    requests.filter((request) => request.url.endsWith("/cancel")).map((request) => request.body),
  ).toEqual([{ reason: "Hồ sơ trùng đã được nộp." }, { reason: "Hồ sơ trùng đã được nộp." }]);
  expect(
    requests.filter(
      (request) =>
        request.method === "GET" && request.url.endsWith("/api/manager/results/app-city-1"),
    ).length,
  ).toBeGreaterThan(1);
  await expect(page.getByRole("button", { name: /delete/i })).toHaveCount(0);
});

test("cancelled archived final reopens without restoring its final and preserves history", async ({
  page,
}) => {
  const requests: LifecycleRequest[] = [];
  const state = lifecycleDetailData({ cancelled: true, archived: true, historicalFinal: true });
  await installLifecycleDetailMocks(page, "city_manager", state, requests);
  await page.goto("/app/manager/results/app-city-1", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("button", { name: "Mở lại hồ sơ đã hủy" })).toBeVisible();
  await page.getByRole("button", { name: "Mở lại hồ sơ đã hủy" }).click();
  const dialog = page.getByRole("dialog", { name: "Mở lại hồ sơ đã hủy" });
  await expect(dialog).toContainText("Kết quả cũ sẽ không được khôi phục.");
  await expect(dialog).toContainText("Hồ sơ sẽ được bỏ lưu trữ cùng thao tác này.");
  const confirm = dialog.getByRole("button", { name: "Xác nhận mở lại hồ sơ" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Lý do mở lại hồ sơ").fill("Đã xác minh thông tin chính xác.");
  await confirm.click();

  await expect(page.getByText("Đã hủy hồ sơ", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Đã lưu trữ", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Lịch sử kết quả trước đây" })).toBeVisible();
  await expect(page.getByText("Kết quả trước đó: Đạt Thành phố")).toBeVisible();
  await expect(page.getByText("Đang xét duyệt", { exact: true })).toBeVisible();
  expect(requestForLifecycle(requests, "/reopen-cancelled")?.body).toEqual({
    reason: "Đã xác minh thông tin chính xác.",
  });
  await expect(page.getByRole("button", { name: /delete/i })).toHaveCount(0);
});

test("archive and unarchive preserve the result console and require no archive reason", async ({
  page,
}) => {
  const requests: LifecycleRequest[] = [];
  const state = lifecycleDetailData({ finalized: true });
  await installLifecycleDetailMocks(page, "admin", state, requests);
  await page.goto("/app/manager/results/app-city-1", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Lưu trữ hồ sơ" }).click();
  const archiveDialog = page.getByRole("dialog", { name: "Lưu trữ hồ sơ" });
  const archiveConfirm = archiveDialog.getByRole("button", { name: "Xác nhận lưu trữ" });
  await expect(archiveConfirm).toBeEnabled();
  await archiveConfirm.click();
  await expect(page.getByText("Đã lưu trữ", { exact: true })).toBeVisible();
  expect(requestForLifecycle(requests, "/archive")?.body).toEqual({});

  await page.getByRole("button", { name: "Bỏ lưu trữ hồ sơ" }).click();
  const unarchiveDialog = page.getByRole("dialog", { name: "Bỏ lưu trữ hồ sơ" });
  await unarchiveDialog.getByRole("button", { name: "Xác nhận bỏ lưu trữ" }).click();
  await expect(page.getByText("Đã lưu trữ", { exact: true })).toHaveCount(0);
  expect(requestForLifecycle(requests, "/unarchive")?.body).toEqual({});
  await expect(page.getByRole("heading", { name: "Hạn nộp hồ sơ" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /delete/i })).toHaveCount(0);
});

test("lifecycle controls remain restricted to City Manager and admin", async ({ page }) => {
  const committeeRequests: LifecycleRequest[] = [];
  await installLifecycleDetailMocks(
    page,
    "city_committee",
    lifecycleDetailData({ finalized: true }),
    committeeRequests,
  );
  await page.goto("/app/manager/results/app-city-1", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Hủy hồ sơ" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Lưu trữ hồ sơ" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mở lại hồ sơ đã hủy" })).toHaveCount(0);
});

test("legacy manager cannot use City application lifecycle controls", async ({ page }) => {
  await installLifecycleDetailMocks(page, "manager", lifecycleDetailData({ finalized: true }), []);
  await page.goto("/app/manager/results/app-city-1", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Hủy hồ sơ" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Lưu trữ hồ sơ" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Bỏ lưu trữ hồ sơ" })).toHaveCount(0);
});

test("draft detail keeps Part 3B deadline tools and cannot be cancelled", async ({ page }) => {
  const draftRequests: LifecycleRequest[] = [];
  await installLifecycleDetailMocks(
    page,
    "city_manager",
    lifecycleDetailData({ draft: true }),
    draftRequests,
  );
  await page.goto("/app/manager/results/app-city-1", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Hạn nộp hồ sơ" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Hủy hồ sơ" })).toHaveCount(0);
  expect(draftRequests.some((request) => request.url.endsWith("/submission-deadline"))).toBe(true);
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
  const user = lifecycleUser(role);

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
        summary: {
          totalApplications: showCancelled ? 1 : 12,
          passedCity: 5,
          notAchievedCity: 5,
          unfinalized: 2,
        },
      });
    }
    return fulfillJson(route, null);
  });

  await page.addInitScript(
    (auth) => window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 })),
    { user, accessToken: `lifecycle-${role}-token`, refreshToken: "refresh" },
  );
}

function lifecycleUser(role: string) {
  return {
    id: `user-${role}`,
    workspaceId:
      role === "admin"
        ? null
        : role === "city_manager" || role === "city_committee"
          ? "danang-city"
          : "school-dut",
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
            id: role === "city_manager" || role === "city_committee" ? "danang-city" : "school-dut",
            code: role === "city_manager" || role === "city_committee" ? "DANANG_CITY" : "DDK",
            name: role === "city_manager" || role === "city_committee" ? "Đà Nẵng" : "Trường",
            shortName: null,
          },
    officerSpecializations: [],
  };
}

function lifecycleDetailData(options: LifecycleDetailOptions = {}) {
  const finalized = options.finalized ?? false;
  const cancelled = options.cancelled ?? false;
  const archived = options.archived ?? false;
  const draft = options.draft ?? false;
  const history =
    options.historicalFinal || (cancelled && finalized)
      ? [
          {
            id: "final-history-1",
            finalStatus: "passed",
            finalLevel: "city",
            finalNote: "Kết quả trước đó",
            finalizedAt: "2026-09-12T08:00:00.000Z",
            finalizedBy: { id: "manager-1", fullName: "City Manager" },
            supersededAt: "2026-09-20T08:00:00.000Z",
            supersededBy: { id: "manager-1", fullName: "City Manager" },
            supersedeReason: "Hủy hồ sơ",
          },
        ]
      : [];
  return {
    application: {
      id: "app-city-1",
      schoolYear: "2025-2026",
      applicationType: "individual",
      targetLevel: "city",
      status: cancelled ? "completed" : draft ? "draft" : "completed",
      readinessScore: 100,
      submittedAt: draft ? null : "2026-09-01T00:00:00.000Z",
      finalStatus: finalized ? "passed" : "pending",
      finalLevel: finalized ? "city" : null,
      finalNote: finalized ? "Đạt Thành phố" : null,
      finalizedAt: finalized ? "2026-09-12T08:00:00.000Z" : null,
      finalizedBy: finalized ? { id: "manager-1", fullName: "City Manager" } : null,
      updatedAt: "2026-09-20T08:00:00.000Z",
      lastActivityAt: "2026-09-20T08:00:00.000Z",
      cancelledAt: cancelled ? "2026-09-20T08:00:00.000Z" : null,
      cancelledBy: cancelled ? { id: "manager-1", fullName: "City Manager" } : null,
      cancelReason: cancelled ? "Đã hủy theo yêu cầu." : null,
      archivedAt: archived ? "2026-09-21T08:00:00.000Z" : null,
      archivedBy: archived ? { id: "manager-1", fullName: "City Manager" } : null,
      archiveReason: archived ? "Đã đóng đợt xét." : null,
    },
    finalDecisionHistory: history,
    student: {
      id: "student-1",
      fullName: "Student One",
      studentCode: "001234",
      email: null,
      phone: null,
      className: "26A",
      faculty: "Engineering",
      avatarUrl: null,
    },
    metrics: [],
    reviewTasks: ["ethics", "academic", "physical", "volunteer", "integration"].map(
      (criterion, index) => ({
        id: `task-${index}`,
        criterion,
        status: "accepted",
        decision: "accepted",
        officerNote: null,
        officerSuggestedLevel: "city",
        decisionReason: null,
        assignedOfficer: null,
        evidences: [],
      }),
    ),
    applicationEvidences: [],
    criterionSummary: {},
    latestPrecheck: null,
    latestCascade: { suggestedLevel: "city" },
    resolutionCases: [],
    auditTimeline: [],
    aggregation: {
      suggestedFinalStatus: "passed",
      suggestedFinalLevel: "city",
      reason: "Đủ điều kiện nghiệp vụ.",
      canFinalize: !cancelled,
      blockingIssues: [],
    },
  };
}

async function installLifecycleDetailMocks(
  page: Page,
  role: string,
  initialState: ReturnType<typeof lifecycleDetailData>,
  requests: LifecycleRequest[],
  options: { conflictOnFirstCancel?: boolean } = {},
) {
  const user = lifecycleUser(role);
  const state = structuredClone(initialState);
  let cancelAttempts = 0;
  await page.route("http://localhost:8080/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      return;
    }
    if (url.pathname === "/api/me" || url.pathname === "/api/auth/me")
      return fulfillJson(route, user);
    if (url.pathname === "/api/manager/results/app-city-1") {
      requests.push({ method: request.method(), url: request.url(), body: request.postData() });
      return fulfillJson(route, state);
    }
    if (url.pathname === "/api/manager/applications/app-city-1/submission-deadline") {
      requests.push({ method: request.method(), url: request.url(), body: request.postDataJSON() });
      return fulfillJson(route, {
        submission: {
          status: "OPEN",
          exceptionActive: false,
          effectiveClosesAt: "2026-10-01T00:00:00.000Z",
        },
        review: { deadlineAt: null },
        supplement: { deadlineAt: null },
        finalization: { deadlineAt: null },
        exception: null,
      });
    }
    const lifecycleAction = url.pathname.match(
      /^\/api\/manager\/applications\/app-city-1\/(cancel|reopen-cancelled|archive|unarchive)$/,
    )?.[1];
    if (lifecycleAction && request.method() === "POST") {
      const body = request.postDataJSON() as unknown;
      requests.push({ method: request.method(), url: request.url(), body });
      if (lifecycleAction === "cancel" && options.conflictOnFirstCancel && cancelAttempts++ === 0) {
        await route.fulfill({
          status: 409,
          headers: { ...corsHeaders, "content-type": "application/json" },
          body: JSON.stringify({
            success: false,
            data: null,
            error: { code: "APPLICATION_CANCELLED", message: cancelledWriteMessage },
            meta: { requestId: "cancel-race" },
          }),
        });
        return;
      }
      if (lifecycleAction === "cancel") {
        const oldFinal =
          state.application.finalizedAt && state.application.finalStatus !== "pending";
        if (oldFinal && !state.finalDecisionHistory.length) {
          state.finalDecisionHistory.push({
            id: "final-history-1",
            finalStatus: state.application.finalStatus,
            finalLevel: state.application.finalLevel,
            finalNote: state.application.finalNote,
            finalizedAt: state.application.finalizedAt,
            finalizedBy: state.application.finalizedBy,
            supersededAt: "2026-09-20T08:00:00.000Z",
            supersededBy: { id: "manager-1", fullName: "City Manager" },
            supersedeReason: (body as { reason: string }).reason,
          });
        }
        state.application.cancelledAt = "2026-09-20T08:00:00.000Z";
        state.application.cancelledBy = { id: "manager-1", fullName: "City Manager" };
        state.application.cancelReason = (body as { reason: string }).reason;
        state.application.finalStatus = "pending";
        state.application.finalLevel = null;
        state.application.finalNote = null;
        state.application.finalizedAt = null;
        state.application.finalizedBy = null;
        state.application.status = "completed";
        state.aggregation.canFinalize = false;
      }
      if (lifecycleAction === "reopen-cancelled") {
        state.application.cancelledAt = null;
        state.application.cancelledBy = null;
        state.application.cancelReason = null;
        state.application.archivedAt = null;
        state.application.archivedBy = null;
        state.application.archiveReason = null;
        state.application.status = "under_review";
        state.application.finalStatus = "pending";
        state.aggregation.canFinalize = true;
      }
      if (lifecycleAction === "archive") {
        state.application.archivedAt = "2026-09-21T08:00:00.000Z";
        state.application.archivedBy = { id: "manager-1", fullName: "City Manager" };
        state.application.archiveReason = (body as { reason?: string }).reason ?? null;
      }
      if (lifecycleAction === "unarchive") {
        state.application.archivedAt = null;
        state.application.archivedBy = null;
        state.application.archiveReason = null;
      }
      await fulfillJson(route, { updated: true });
      return;
    }
    return fulfillJson(route, null);
  });
  await page.addInitScript(
    (auth) => window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 })),
    { user, accessToken: `lifecycle-${role}-token`, refreshToken: "refresh" },
  );
}

function requestForLifecycle(requests: LifecycleRequest[], suffix: string) {
  return requests.find((request) => request.url.endsWith(suffix));
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
