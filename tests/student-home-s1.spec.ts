import { expect, test, type Page, type Route } from "@playwright/test";

const apiPattern = "http://localhost:8080/api/**";
const criteria = [
  ["ethics", "Đạo đức tốt"],
  ["academic", "Học tập tốt"],
  ["physical", "Thể lực tốt"],
  ["volunteer", "Tình nguyện tốt"],
  ["integration", "Hội nhập tốt"],
] as const;

test.describe("Student Home S1", () => {
  test("shows one start action and no inferred season when no application exists", async ({
    page,
  }) => {
    let currentUrl = "";
    await installHomeMock(page, "none", (url) => {
      currentUrl = url;
    });
    await login(page, "none");

    const hero = page.locator('section[aria-labelledby="student-home-hero-title"]');
    await expect(hero.getByRole("button", { name: "Bắt đầu hồ sơ" })).toBeVisible();
    await expect(hero.getByRole("button")).toHaveCount(1);
    await expect(page.getByText("Chưa cấu hình thời hạn")).toHaveCount(0);
    await expect(page.getByText("Năm học 2025-2026")).toHaveCount(0);
    expect(currentUrl).toContain("/api/applications/current");
    expect(currentUrl).not.toContain("schoolYear=");
    await expectCriteria(page, false);
  });

  test("uses one criterion deep-link per card and a single primary CTA", async ({ page }) => {
    await installHomeMock(page, "draft");
    await login(page, "draft");

    await expectCriteria(page);
    const hero = page.locator('section[aria-labelledby="student-home-hero-title"]');
    await expect(hero.getByRole("link")).toHaveCount(1);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Bỏ qua điều hướng" })).toBeFocused();
    for (const [criterion] of criteria) {
      await expect(
        page
          .getByRole("region", { name: "Tổng quan 5 tiêu chí" })
          .locator(`a[href*="criterion=${criterion}"]`),
        `${criterion} should deep-link to its detail`,
      ).toHaveCount(1);
    }
    await expect(page.getByText(/Trợ lý AI|Gợi ý từ trợ lý/)).toHaveCount(0);
  });

  test("shows processing evidence without a duplicate task feed", async ({ page }) => {
    await installHomeMock(page, "processing");
    await login(page, "processing");

    await expect(page.getByText(/đang được phân tích/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cần chú ý" })).toBeVisible();
    await expect(
      page.locator('section[aria-labelledby="student-home-hero-title"]').getByRole("link"),
    ).toHaveCount(1);
  });

  test("prevents submission when eligibility is blocked", async ({ page }) => {
    await installHomeMock(page, "ineligible");
    await login(page, "ineligible");

    const hero = page.locator('section[aria-labelledby="student-home-hero-title"]');
    await expect(hero).toContainText("Chưa đủ điều kiện nộp hồ sơ");
    await expect(hero.getByRole("link")).toHaveCount(1);
    await expect(hero.getByRole("link")).not.toContainText("Gửi hồ sơ");
  });

  test("offers the submit action only after eligible status and an open deadline resolve", async ({
    page,
  }) => {
    await installHomeMock(page, "ready");
    await login(page, "ready");

    const hero = page.locator('section[aria-labelledby="student-home-hero-title"]');
    await expect(hero).toContainText("Hồ sơ đã sẵn sàng");
    await expect(hero.getByRole("link", { name: "Kiểm tra và gửi hồ sơ" })).toBeVisible();
  });

  test("does not request City-only gate APIs for another application level", async ({ page }) => {
    await installHomeMock(page, "school-level");
    let cityGateRequests = 0;
    page.on("request", (request) => {
      if (/\/api\/applications\/app-1\/(eligibility|submission-deadline)$/.test(request.url())) {
        cityGateRequests += 1;
      }
    });
    await login(page, "school-level");

    await expect(page.locator('section[aria-labelledby="student-home-hero-title"]')).toContainText(
      "Tải minh chứng",
    );
    expect(cityGateRequests).toBe(0);
  });

  test("shows not-configured deadlines only when an existing application returns that status", async ({
    page,
  }) => {
    await installHomeMock(page, "not-configured");
    await login(page, "not-configured");

    await expect(page.getByText("Chưa có thời hạn gửi hồ sơ").first()).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Cần chú ý" })
        .getByText("Thời hạn tiếp nhận hồ sơ cho năm học này chưa được cấu hình."),
    ).toBeVisible();
  });

  test("submitted and under-review applications lead to tracking", async ({ page }) => {
    for (const [scenario, title] of [
      ["submitted", "Hồ sơ của bạn đã được gửi"],
      ["under-review", "Hồ sơ đang được xét"],
    ] as const) {
      await installHomeMock(page, scenario);
      await login(page, scenario);
      const hero = page.locator('section[aria-labelledby="student-home-hero-title"]');
      await expect(hero).toContainText(title);
      await expect(hero.getByRole("link", { name: "Theo dõi hồ sơ" })).toBeVisible();
    }
  });

  test("supplement request and final result take priority", async ({ page }) => {
    await installHomeMock(page, "supplement");
    await login(page, "supplement");
    const supplementHero = page.locator('section[aria-labelledby="student-home-hero-title"]');
    await expect(supplementHero).toContainText("Cần bổ sung hồ sơ · Học tập tốt");
    await expect(supplementHero.getByRole("link", { name: "Bổ sung hồ sơ" })).toBeVisible();

    await installHomeMock(page, "final");
    await login(page, "final");
    const resultHero = page.locator('section[aria-labelledby="student-home-hero-title"]');
    await expect(resultHero).toContainText("Hồ sơ đã có kết quả cuối");
    await expect(resultHero.getByRole("link", { name: "Xem kết quả" })).toBeVisible();
  });

  test("shows a focused loading skeleton and recovers from a current-application API error", async ({
    page,
  }) => {
    await installHomeMock(page, "loading");
    await page.addInitScript((auth) => {
      if (window.location.protocol === "http:" || window.location.protocol === "https:") {
        window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 }));
      }
    }, authData);
    await page.goto("/app?scenario=loading", { waitUntil: "domcontentloaded" });
    await expect(page.locator('div[aria-busy="true"]').last()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Chào Sinh" })).toBeVisible();

    await installHomeMock(page, "error");
    await login(page, "error");
    await expect(page.getByText("Chưa tải được hồ sơ của bạn")).toBeVisible();
    await expect(page.getByRole("button", { name: "Thử tải lại" })).toBeVisible();
  });

  test("starts using the server default without sending a fixed school year", async ({ page }) => {
    await installHomeMock(page, "none");
    await login(page, "none");
    let startBody: Record<string, unknown> | null = null;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/applications/current/start")) {
        startBody = request.postDataJSON() as Record<string, unknown>;
      }
    });

    await page.getByRole("button", { name: "Bắt đầu hồ sơ" }).click();
    await expect.poll(() => startBody).toEqual({});
    expect(startBody).not.toHaveProperty("schoolYear");
    await page.goto("/app/application");
    await expect(page.locator("main").last()).toContainText("Hồ sơ của tôi");
  });

  test("keeps the result page minimal until a final result exists", async ({ page }) => {
    await installHomeMock(page, "draft");
    await login(page, "draft");
    await page.goto("/app/result");

    await expect(page.getByRole("heading", { name: "Kết quả", level: 1 })).toBeVisible();
    await expect(
      page.getByText("Kết quả sẽ hiển thị sau khi hồ sơ được xét và chốt."),
    ).toBeVisible();
    await expect(page.getByText("Chưa chốt")).toHaveCount(0);
    await expect(page.getByText("Thời gian chốt")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Quay lại hồ sơ" })).toBeVisible();

    await installHomeMock(page, "final");
    await login(page, "final");
    await page.goto("/app/result");

    await expect(page.getByText("Kết quả cuối")).toBeVisible();
    await expect(page.getByText("Thời gian chốt")).toBeVisible();
    await expect(page.getByText("Chưa có kết luận tiêu chí để hiển thị.")).toHaveCount(0);
  });

  test("fits the five-criterion grid at desktop widths and 125% effective zoom", async ({
    page,
  }) => {
    await installHomeMock(page, "draft");
    await login(page, "draft");

    for (const { width, height } of [
      { width: 1280, height: 720 },
      { width: 1422, height: 800 }, // 1280×720 effective viewport at 90% zoom.
      { width: 1366, height: 768 },
      { width: 1164, height: 655 }, // 1280×720 effective viewport at 110% zoom.
      { width: 1440, height: 900 },
      { width: 1600, height: 900 },
      { width: 1920, height: 1080 },
      { width: 1024, height: 576 },
    ]) {
      await page.setViewportSize({ width, height });
      await expectCriteria(page);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow, `horizontal overflow at ${width}px`).toBe(false);
      if (width === 1440 || width === 1024) {
        await page.screenshot({ path: `/tmp/5tot-student-home-s1-${width}.png`, fullPage: true });
      }
    }
  });
});

async function installHomeMock(page: Page, scenario: string, onCurrentUrl?: (url: string) => void) {
  let started = false;
  await page.route(apiPattern, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const activeScenario = new URL(page.url()).searchParams.get("scenario") ?? scenario;

    if (request.method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    }
    if (path === "/api/me" || path === "/api/auth/me") return json(route, studentUser);
    if (path === "/api/auth/logout") return json(route, null);
    if (path === "/api/notifications") return json(route, []);
    if (path === "/api/applications/current") {
      onCurrentUrl?.(request.url());
      if (activeScenario === "loading") await new Promise((resolve) => setTimeout(resolve, 700));
      if (activeScenario === "error")
        return route.fulfill({ status: 503, body: "service unavailable" });
      return json(route, currentResponse(started ? "draft" : activeScenario));
    }
    if (path === "/api/applications/current/start") {
      started = true;
      return json(route, currentResponse("draft"));
    }
    if (/\/api\/applications\/app-1\/eligibility$/.test(path)) {
      return json(route, {
        applicationId: "app-1",
        schoolYear: "2025-2026",
        route: "DIRECT_CITY",
        status: activeScenario === "ineligible" ? "NOT_ELIGIBLE" : "ELIGIBLE",
        reasons: activeScenario === "ineligible" ? ["MISSING_REQUIREMENT"] : [],
      });
    }
    if (/\/api\/applications\/app-1\/submission-deadline$/.test(path)) {
      return json(route, deadlineResponse(activeScenario));
    }
    if (path.endsWith("/criteria-completion"))
      return json(route, criteriaCompletion(activeScenario));
    if (path.endsWith("/precheck/latest")) return json(route, null);
    if (/\/api\/applications\/app-1\/evidences$/.test(path)) {
      return json(route, evidenceResponse(activeScenario));
    }
    return json(route, null);
  });
}

async function login(page: Page, scenario: string) {
  await page.addInitScript((auth) => {
    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
      window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 }));
    }
  }, authData);
  await page.goto(`/app?scenario=${scenario}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Chào Sinh" })).toBeVisible();
}

async function expectCriteria(page: Page, linksExpected = true) {
  for (const [, label] of criteria) {
    await expect(page.getByRole("heading", { name: label, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("region", { name: "Tổng quan 5 tiêu chí" }).locator("a")).toHaveCount(
    linksExpected ? 5 : 0,
  );
}

function currentResponse(scenario: string) {
  if (scenario === "none") return { application: null, state: "not_started" };
  const status =
    scenario === "supplement"
      ? "supplement_required"
      : scenario === "submitted"
        ? "submitted"
        : scenario === "under-review"
          ? "under_review"
          : scenario === "ready"
            ? "ready_to_submit"
            : scenario === "final"
              ? "completed"
              : scenario === "ineligible" || scenario === "not-configured"
                ? "ready_to_submit"
                : "draft";
  return {
    state: status,
    application: {
      id: "app-1",
      studentId: "student-1",
      schoolYear: "2025-2026",
      applicationType: "individual",
      targetLevel: scenario === "school-level" ? "school" : "city",
      status,
      finalStatus: scenario === "final" ? "passed" : null,
      finalNote: null,
      finalizedAt: scenario === "final" ? "2026-01-04T00:00:00.000Z" : null,
      finalLevel: scenario === "final" ? "city" : null,
      submittedAt: ["supplement", "submitted", "under-review", "final"].includes(scenario)
        ? "2026-01-03T00:00:00.000Z"
        : null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      lastUpdatedAt: "2026-01-02T00:00:00.000Z",
      currentDraftVersion: 1,
      reviewTasks:
        scenario === "supplement"
          ? [
              {
                id: "task-1",
                criterion: "academic",
                status: "supplement_required",
                decision: "supplement_required",
                supplementRequestJson: { reason: "Bổ sung bảng điểm có xác nhận." },
              },
            ]
          : [],
      metrics: [],
    },
  };
}

function criteriaCompletion(scenario: string) {
  const completionStatus =
    scenario === "supplement"
      ? "supplement_required"
      : scenario === "final"
        ? "accepted"
        : scenario === "ineligible" || scenario === "not-configured"
          ? "ready_for_precheck"
          : "in_progress";
  return {
    applicationId: "app-1",
    criteriaVersionId: "criteria-v1",
    targetLevel: "city",
    items: criteria.map(([criterion, title]) => ({
      criterion,
      title,
      description: "",
      status:
        criterion === "academic" && scenario === "supplement"
          ? "supplement_required"
          : completionStatus,
      requirementGroups: [],
      completion: { satisfied: 1, required: 2, needsVerification: 0 },
      evidenceCount: 1,
      nextAction: { type: "upload_evidence", label: "Tải minh chứng", route: "/app/application" },
    })),
    summary: {
      notStarted: 0,
      inProgress: 5,
      needsVerification: 0,
      readyForPrecheck: 0,
      accepted: 0,
    },
  };
}

function evidenceResponse(scenario: string) {
  if (scenario !== "processing") return [];
  return [
    {
      id: "evidence-1",
      applicationId: "app-1",
      evidenceName: "Bảng điểm",
      criterion: "academic",
      sourceType: "manual_upload",
      status: "pending_indexing",
      indexingStatus: "pending_indexing",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];
}

function deadlineResponse(scenario: string) {
  const status = scenario === "not-configured" ? "NOT_CONFIGURED" : "OPEN";
  return {
    applicationId: "app-1",
    schoolYear: "2025-2026",
    submission: {
      status,
      opensAt: null,
      closesAt: null,
      effectiveClosesAt: null,
      exceptionActive: false,
      exceptionValidUntil: null,
    },
    review: { deadlineAt: null, status: "NOT_CONFIGURED" },
    supplement: { deadlineAt: null, status: "NOT_CONFIGURED" },
    finalization: { deadlineAt: null, status: "NOT_CONFIGURED" },
  };
}

async function json(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data, error: null, meta: { requestId: "s1-mock" } }),
  });
}

const corsHeaders = {
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "access-control-allow-origin": "*",
};

const studentUser = {
  id: "student-1",
  workspaceId: "workspace-1",
  email: "student@example.test",
  role: "student",
  fullName: "Nguyễn Văn Sinh",
  studentCode: "102220001",
  workspace: { id: "workspace-1", code: "DDK", name: "Đại học Đà Nẵng", shortName: "ĐHĐN" },
};

const authData = { user: studentUser, accessToken: "test-token", refreshToken: "refresh" };
