import { expect, test, type Page, type Route } from "@playwright/test";

const apiPattern = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/api\/.*$/;
const criteria = [
  ["ethics", "Đạo đức tốt"],
  ["academic", "Học tập tốt"],
  ["physical", "Thể lực tốt"],
  ["volunteer", "Tình nguyện tốt"],
  ["integration", "Hội nhập tốt"],
] as const;

test.describe("Student precheck S5", () => {
  test("presents five criteria and allows submission when precheck has advisory findings", async ({
    page,
  }) => {
    await installS5Mock(page, "advisory");
    await login(page);

    await expect(page.getByRole("heading", { name: "Kiểm tra hồ sơ" })).toBeVisible();
    await expect(page.getByText("Có 2 gợi ý bạn có thể kiểm tra thêm")).toBeVisible();
    const criteriaCards = page.locator('[aria-label="Năm tiêu chí Sinh viên 5 tốt"]');
    await expect(criteriaCards.locator("a")).toHaveCount(5);
    for (const [criterion] of criteria) {
      await expect(
        criteriaCards.locator(`a[href="/app/application?criterion=${criterion}"]`),
      ).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Gửi hồ sơ" })).toBeEnabled();
    await expect(
      page.getByText(/readinessScore|readyToSubmit|targetLevel|priority|PASS|FAIL/),
    ).toHaveCount(0);
    await expect(page.getByText(/Đạt|Không đạt/)).toHaveCount(0);
  });

  test("real City gates control submit, while an active exception permits it", async ({ page }) => {
    for (const [scenario, message] of [
      ["unmatched", "Chưa tìm thấy thông tin công nhận phù hợp"],
      ["verification", "Thông tin điều kiện đang được kiểm tra"],
      ["not-configured", "Thời gian nhận hồ sơ chưa được công bố"],
      ["not-open", "Thời gian nhận hồ sơ chưa bắt đầu"],
      ["closed", "Thời gian nhận hồ sơ hiện đã kết thúc"],
    ] as const) {
      await installS5Mock(page, scenario);
      await login(page);
      await expect(page.getByRole("button", { name: "Gửi hồ sơ" })).toBeDisabled();
      await expect(page.getByText(message).first()).toBeVisible();
    }

    await installS5Mock(page, "exception");
    await login(page);
    await expect(page.getByText("Đang nhận hồ sơ theo thời hạn riêng")).toBeVisible();
    await expect(page.getByText("Hạn chung:")).toBeVisible();
    await expect(page.getByRole("button", { name: "Gửi hồ sơ" })).toBeEnabled();
  });

  test("shows direct City and confirmed UDN eligibility without backend enum names", async ({
    page,
  }) => {
    await installS5Mock(page, "direct");
    await login(page);
    await expect(page.getByText("Có thể gửi hồ sơ cấp Thành phố")).toBeVisible();
    await expect(page.getByText(/DIRECT_CITY|UDN_PREREQUISITE/)).toHaveCount(0);

    await installS5Mock(page, "udn-eligible");
    await login(page);
    await expect(page.getByText("Điều kiện nộp hồ sơ đã được xác nhận")).toBeVisible();
    await expect(page.getByRole("button", { name: "Gửi hồ sơ" })).toBeEnabled();
  });

  test("rechecks hard gates, submits once, and switches to the server submitted state", async ({
    page,
  }) => {
    let submitCount = 0;
    let submittedBody: Record<string, unknown> | null = null;
    await installS5Mock(page, "advisory", {
      onSubmit: (body) => {
        submitCount += 1;
        submittedBody = body;
      },
    });
    await login(page);

    await page.getByRole("button", { name: "Gửi hồ sơ" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Hội Sinh viên Thành phố");
    await expect(dialog).toContainText("Bạn đã xem lại");
    await expect
      .poll(() => dialog.evaluate((element) => element.contains(document.activeElement)))
      .toBe(true);
    await page.keyboard.press("Tab");
    await expect
      .poll(() => dialog.evaluate((element) => element.contains(document.activeElement)))
      .toBe(true);
    await dialog.getByRole("button", { name: "Vẫn gửi hồ sơ" }).evaluate((element) => {
      element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    await expect.poll(() => submitCount).toBe(1);
    await expect.poll(() => submittedBody).toMatchObject({ allowSubmitWithWarnings: true });
    expect(submittedBody).not.toHaveProperty("targetLevel");
    await expect(page.getByText("Hồ sơ đã được tiếp nhận")).toBeVisible();
    await expect(page.getByRole("button", { name: "Gửi hồ sơ" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Theo dõi hồ sơ" })).toBeVisible();
  });

  test("displays no inferred season for an application that does not exist", async ({ page }) => {
    await installS5Mock(page, "none");
    await login(page);

    await expect(page.getByText("Bạn chưa có hồ sơ trong hệ thống")).toBeVisible();
    await expect(page.getByText(/Chưa công bố|Chưa bắt đầu|Đang nhận hồ sơ/)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Bắt đầu hồ sơ" })).toBeVisible();
  });

  test("fails closed with safe retry copy when a hard-gate or current API fails", async ({
    page,
  }) => {
    for (const [scenario, message] of [
      ["eligibility-error", "Chưa tải được điều kiện nộp hồ sơ"],
      ["deadline-error", "Chưa tải được thời gian nhận hồ sơ"],
    ] as const) {
      await installS5Mock(page, scenario);
      await login(page);
      await expect(page.getByRole("button", { name: "Gửi hồ sơ" })).toBeDisabled();
      await expect(page.getByText(message).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /Tải lại/ })).toBeVisible();
    }

    await installS5Mock(page, "current-error");
    await login(page);
    await expect(page.getByText("Chưa tải được hồ sơ của bạn")).toBeVisible();
    await expect(page.getByRole("button", { name: "Thử tải lại" })).toBeVisible();
  });

  test("keeps the page and primary action inside the viewport at desktop and 125% widths", async ({
    page,
  }) => {
    await installS5Mock(page, "advisory");
    await login(page);

    for (const { width, height } of [
      { width: 1280, height: 720 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1600, height: 900 },
      { width: 1920, height: 1080 },
      { width: 1024, height: 720 },
    ]) {
      await page.setViewportSize({ width, height });
      await expect(page.getByRole("heading", { name: "Kiểm tra hồ sơ" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Gửi hồ sơ" })).toBeVisible();
      const criterionColumns = await page
        .locator('[aria-label="Năm tiêu chí Sinh viên 5 tốt"]')
        .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
      if (width === 1024) expect(criterionColumns).toBe(2);
      if (width === 1280) expect(criterionColumns).toBe(3);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `horizontal overflow at ${width}px`,
      ).toBe(true);
      if (width === 1280 || width === 1024 || width === 1920) {
        await page.screenshot({
          path: `/tmp/5tot-student-precheck-s5-${width}.png`,
          fullPage: true,
        });
      }
    }
  });

  test("retains the existing Student route fallback for legacy and supplement applications", async ({
    page,
  }) => {
    await installS5Mock(page, "school-level");
    await login(page);
    await expect(page.getByRole("heading", { name: "Hồ sơ của tôi" })).toBeVisible();

    await installS5Mock(page, "supplement");
    await login(page);
    await expect(page.getByRole("heading", { name: "Bổ sung hồ sơ theo yêu cầu" })).toBeVisible();
  });

  test("keeps the existing AI precheck fallback for a class representative", async ({ page }) => {
    const collectiveUser = { ...studentUser, role: "class_representative" };
    await installS5Mock(page, "none", { user: collectiveUser });
    await login(page, collectiveUser);
    await expect(page.getByRole("button", { name: "Chạy tiền kiểm" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Kiểm tra hồ sơ" })).toHaveCount(0);
  });

  test("keeps City Officer outside the student precheck through the existing route guard", async ({
    page,
  }) => {
    const cityOfficer = { ...studentUser, role: "city_officer" };
    await installS5Mock(page, "none", { user: cityOfficer });
    await login(page, cityOfficer);
    await expect(page).toHaveURL(/\/app\/queue$/);
    await expect(page.getByRole("heading", { name: "Việc cần xử lý" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Kiểm tra hồ sơ" })).toHaveCount(0);
  });
});

async function installS5Mock(
  page: Page,
  scenario: string,
  options: {
    onSubmit?: (body: Record<string, unknown>) => void;
    user?: typeof studentUser;
  } = {},
) {
  let submitted = false;
  let precheckUpdated = false;
  const apiUser = options.user ?? studentUser;
  await page.route(apiPattern, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (request.method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    }
    if (path === "/api/me" || path === "/api/auth/me") return json(route, apiUser);
    if (path === "/api/auth/logout") return json(route, null);
    if (path === "/api/notifications") return json(route, []);
    if (path === "/api/applications/current") {
      if (scenario === "current-error") {
        return route.fulfill({ status: 503, body: "service unavailable" });
      }
      return json(
        route,
        scenario === "none"
          ? { application: null, state: "not_started" }
          : currentResponse(scenario, submitted),
      );
    }
    if (/\/api\/applications\/app-1\/eligibility$/.test(path)) {
      if (scenario === "eligibility-error") {
        return route.fulfill({ status: 503, body: "service unavailable" });
      }
      return json(route, eligibilityResponse(scenario));
    }
    if (/\/api\/applications\/app-1\/submission-deadline$/.test(path)) {
      if (scenario === "deadline-error") {
        return route.fulfill({ status: 503, body: "service unavailable" });
      }
      return json(route, deadlineResponse(scenario));
    }
    if (path.endsWith("/criteria-completion")) return json(route, criteriaCompletion());
    if (path.endsWith("/precheck/latest")) {
      return json(
        route,
        precheckUpdated
          ? cleanPrecheck
          : scenario === "advisory"
            ? advisoryPrecheck
            : cleanPrecheck,
      );
    }
    if (/\/api\/applications\/app-1\/evidences$/.test(path)) return json(route, evidenceResponse());
    if (/\/api\/applications\/app-1\/precheck$/.test(path) && request.method() === "POST") {
      precheckUpdated = true;
      return json(route, advisoryPrecheck);
    }
    if (/\/api\/applications\/app-1\/submit$/.test(path) && request.method() === "POST") {
      submitted = true;
      options.onSubmit?.(request.postDataJSON() as Record<string, unknown>);
      return json(route, { status: "under_review", submittedAt: "2026-09-01T00:00:00.000Z" });
    }
    return json(route, null);
  });
}

async function login(page: Page, user = studentUser) {
  const auth = { ...authData, user };
  await page.addInitScript((auth) => {
    window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 }));
    window.localStorage.setItem(
      "5tot-app-v3",
      JSON.stringify({ state: { role: auth.user.role }, version: 0 }),
    );
  }, auth);
  await page.goto("/app/ai-precheck", { waitUntil: "domcontentloaded" });
}

function currentResponse(scenario: string, submitted: boolean) {
  const status = submitted
    ? "under_review"
    : scenario === "supplement"
      ? "supplement_required"
      : scenario === "ready"
        ? "ready_to_submit"
        : "draft";
  const city = scenario !== "school-level";
  return {
    state: status,
    application: {
      id: "app-1",
      studentId: "student-1",
      schoolYear: "2025-2026",
      applicationType: "individual",
      targetLevel: city ? "city" : "school",
      status,
      finalStatus: null,
      finalNote: null,
      submittedAt: submitted ? "2026-09-01T00:00:00.000Z" : null,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      lastUpdatedAt: "2026-09-01T00:00:00.000Z",
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

function eligibilityResponse(scenario: string) {
  const udn =
    scenario === "udn-eligible" || scenario === "unmatched" || scenario === "verification";
  return {
    applicationId: "app-1",
    schoolYear: "2025-2026",
    route: udn ? "UDN_PREREQUISITE" : "DIRECT_CITY",
    status:
      scenario === "unmatched"
        ? "NOT_ELIGIBLE"
        : scenario === "verification"
          ? "NEEDS_VERIFICATION"
          : "ELIGIBLE",
    reasons: scenario === "unmatched" ? ["MISSING_UNIVERSITY_SYSTEM_AWARD"] : [],
  };
}

function deadlineResponse(scenario: string) {
  const status =
    scenario === "not-configured"
      ? "NOT_CONFIGURED"
      : scenario === "not-open"
        ? "NOT_OPEN"
        : scenario === "closed"
          ? "CLOSED"
          : scenario === "exception"
            ? "EXCEPTION_ACTIVE"
            : "OPEN";
  return {
    applicationId: "app-1",
    schoolYear: "2025-2026",
    submission: {
      status,
      opensAt: "2026-09-01T00:00:00.000Z",
      closesAt: "2026-10-15T13:00:00.000Z",
      effectiveClosesAt:
        scenario === "exception" ? "2026-10-20T13:00:00.000Z" : "2026-10-15T13:00:00.000Z",
      exceptionActive: scenario === "exception",
      exceptionValidUntil: scenario === "exception" ? "2026-10-20T13:00:00.000Z" : null,
    },
    review: { deadlineAt: null, status: "NOT_CONFIGURED" },
    supplement: { deadlineAt: null, status: "NOT_CONFIGURED" },
    finalization: { deadlineAt: null, status: "NOT_CONFIGURED" },
  };
}

function criteriaCompletion() {
  return {
    applicationId: "app-1",
    criteriaVersionId: "criteria-v1",
    targetLevel: "city",
    items: criteria.map(([criterion, title], index) => ({
      criterion,
      title,
      description: "",
      status: index === 1 ? "precheck_warning" : "in_progress",
      requirementGroups: [],
      completion: { satisfied: 1, required: 2, needsVerification: 0 },
      evidenceCount: index === 0 ? 1 : 0,
      nextAction: null,
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

function evidenceResponse() {
  return [
    {
      id: "evidence-1",
      applicationId: "app-1",
      evidenceName: "Minh chứng học tập",
      criterion: "academic",
      sourceType: "manual_upload",
      status: "pending_indexing",
      indexingStatus: "ocr_processing",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
  ];
}

const cleanPrecheck = {
  applicationId: "app-1",
  missingItems: [],
  warnings: [],
  criteriaResults: [],
};
const advisoryPrecheck = {
  applicationId: "app-1",
  readinessScore: 17,
  readyToSubmit: false,
  missingItems: [
    { criterion: "academic", code: "MISSING_EVIDENCE" },
    { criterion: "integration", code: "LOW_CONFIDENCE_EVIDENCE" },
  ],
  warnings: [],
  criteriaResults: [],
  humanConfirmationRequired: true,
};

async function json(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data, error: null, meta: { requestId: "s5-mock" } }),
  });
}

const corsHeaders = {
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods":
    "authorization, content-type, GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "access-control-allow-origin": "*",
};

const studentUser = {
  id: "student-1",
  workspaceId: "workspace-1",
  email: "student@example.test",
  role: "student",
  fullName: "Nguyễn Văn Sinh",
  studentCode: "102220001",
  className: "",
  faculty: "",
  phone: "",
  avatarUrl: null,
  isActive: true,
  lastLoginAt: null,
  workspace: { id: "workspace-1", code: "DDK", name: "Đại học Đà Nẵng", shortName: "ĐHĐN" },
};

const authData = { user: studentUser, accessToken: "test-token", refreshToken: "refresh" };
