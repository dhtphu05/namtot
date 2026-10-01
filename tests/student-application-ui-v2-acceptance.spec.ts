import { expect, test, type Page, type Route } from "@playwright/test";

type AppMode = "draft" | "empty" | "noTasks" | "supplement" | "completed" | "submitted";
type Criterion = "ethics" | "academic" | "physical" | "volunteer" | "integration";

const viewports = [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
];

const criteria: Criterion[] = ["ethics", "academic", "physical", "volunteer", "integration"];

const routeErrorPattern =
  /Unexpected Application Error|Application Error|Cannot read properties|Loading chunk \d+ failed|Failed to fetch dynamically imported module/i;
const rawEnumPattern =
  /\b(student_research|journal_article|physical_education|healthy_student|sports_activity|foreign_language|international_exchange|supplement_required|not_started|under_review)\b/i;
const acceptanceMode = process.env.PW_STUDENT_UI_MODE ?? "v2";
const mockCorsHeaders = {
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "access-control-allow-origin": "*",
};

test.describe("student application UI V2 acceptance", () => {
  test.skip(acceptanceMode === "legacy", "Run this block against a V2-enabled dev server.");

  test.beforeEach(async ({ page }) => {
    await installStudentApiMock(page);
  });

  for (const viewport of viewports) {
    test(`V2 student route matrix is stable at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);

      const routes = [
        "/app?state=draft",
        "/app?state=empty",
        "/app?state=noTasks",
        "/app?state=supplement",
        "/app?state=completed",
        "/app/application?criterion=ethics",
        "/app/application?criterion=academic",
        "/app/application?criterion=physical",
        "/app/application?criterion=volunteer",
        "/app/application?criterion=integration",
        "/app/application?criterion=academic&uploadEvidence=1",
        "/app/feedback?state=list",
        "/app/feedback?state=empty",
        "/app/assistant",
      ];

      for (const route of routes) {
        const errors = collectPageErrors(page);
        await loginAndGoto(page, route);
        await expect(page.locator("body")).toContainText(
          /Hệ thống Sinh viên 5 tốt|Hồ sơ|Trợ lý|Phản hồi/,
        );
        await expectNoRouteCrash(page, route);
        await expectNoLayoutViolations(page, route);
        expect(errors.messages, `${route} uncaught browser errors`).toEqual([]);
        errors.dispose();
      }
    });
  }

  test("criterion query deep links select each criterion without route crashes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    for (const criterion of criteria) {
      await loginAndGoto(page, `/app/application?criterion=${criterion}`);
      await expect(studentContentMain(page)).toContainText(criterionTitle(criterion));
      await expectNoRouteCrash(page, criterion);
      await expectNoLayoutViolations(page, criterion);
    }
  });

  test("assistant context does not pin an earlier School year", async ({ page }) => {
    const assistantContextRequests: URL[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.pathname === "/api/student-assistant/context") assistantContextRequests.push(url);
    });

    await loginAndGoto(page, "/app/assistant");
    await expect.poll(() => assistantContextRequests.length > 0).toBe(true);

    expect(assistantContextRequests.every((url) => !url.searchParams.has("schoolYear"))).toBe(true);
  });

  test("application opens on an overview of exactly five canonical criteria", async ({ page }) => {
    await loginAndGoto(page, "/app/application");

    await expect(page.getByRole("heading", { name: "Hồ sơ của tôi", level: 1 })).toBeVisible();
    const cards = page.getByTestId("criterion-overview-card");
    await expect(cards).toHaveCount(5);
    await expect(cards).toHaveText([
      /Đạo đức tốt/,
      /Học tập tốt/,
      /Thể lực tốt/,
      /Tình nguyện tốt/,
      /Hội nhập tốt/,
    ]);
    await expect(page.getByText("priority", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Cấp Trường|Cấp ĐHĐN|Cấp Trung ương/)).toHaveCount(0);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content - dimensions.viewport).toBeLessThanOrEqual(1);
  });

  test("loads evidence preview URLs only for cards near the viewport", async ({ page }) => {
    const signedFileIds: string[] = [];
    const manyEvidences = Array.from({ length: 24 }, (_, index) =>
      evidence(
        `perf-evidence-${index + 1}`,
        `Perf minh chứng ${index + 1}`,
        "academic",
        "image/png",
        "under_review",
        "indexed",
      ),
    );

    await page.route(apiUrl("/api/applications/app-1/evidences*"), async (route) =>
      json(route, manyEvidences),
    );
    page.on("request", (request) => {
      const url = new URL(request.url());
      const match = url.pathname.match(/^\/api\/files\/([^/]+)\/signed-url$/);
      if (match) signedFileIds.push(match[1]);
    });

    await loginAndGoto(page, "/app/application?criterion=academic");
    await expect(page.getByRole("heading", { name: /^Perf minh chứng / })).toHaveCount(24);
    await page
      .getByRole("heading", { name: "Perf minh chứng 1", exact: true })
      .scrollIntoViewIfNeeded();
    await expect.poll(() => signedFileIds.length).toBeGreaterThan(0);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );

    const firstViewportRequestCount = signedFileIds.length;
    expect(firstViewportRequestCount).toBeLessThanOrEqual(8);

    await page
      .getByRole("heading", { name: "Perf minh chứng 24", exact: true })
      .scrollIntoViewIfNeeded();
    await expect.poll(() => signedFileIds.length).toBeGreaterThan(firstViewportRequestCount);
    expect(signedFileIds.length).toBeLessThan(24);
  });

  test("application overview fits the required desktop widths and 125% equivalent viewport", async ({
    page,
  }, testInfo) => {
    const viewports = [
      { width: 1280, height: 720 },
      { width: 1422, height: 800 }, // 1280×720 effective viewport at 90% zoom.
      { width: 1366, height: 768 },
      { width: 1164, height: 655 }, // 1280×720 effective viewport at 110% zoom.
      { width: 1440, height: 900 },
      { width: 1600, height: 900 },
      { width: 1920, height: 1080 },
      { width: 1093, height: 614 },
    ];
    await page.setViewportSize(viewports[0]);
    await loginAndGoto(page, "/app/application");

    for (const [index, viewport] of viewports.entries()) {
      await page.setViewportSize(viewport);
      await page.goto("/app/application");
      await expect(page.getByTestId("criterion-overview-card")).toHaveCount(5);
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(
        dimensions.content - dimensions.viewport,
        `${viewport.width}x${viewport.height}`,
      ).toBeLessThanOrEqual(1);
      await page.screenshot({
        path: testInfo.outputPath(`application-overview-${index + 1}.png`),
        fullPage: true,
      });
    }
  });

  test("student compatibility route keeps the legacy URL without a target-level selector", async ({
    page,
  }) => {
    await loginAndGoto(page, "/app/wizard");
    await expect(
      page.getByRole("heading", { name: /Còn \d\/5 tiêu chí cần bổ sung/ }),
    ).toBeVisible();

    await expect(page.getByRole("heading", { name: "Khả năng đạt cấp xét" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Chọn cấp này" })).toHaveCount(0);
  });

  test("legacy school-level applications cannot be submitted from either student workspace", async ({
    page,
  }) => {
    await loginAndGoto(page, "/app/application");
    await expect(page.getByText(/hệ thống chỉ tiếp nhận hồ sơ cấp Thành phố/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Nộp hồ sơ|Gửi hồ sơ|Gửi lại hồ sơ/ }),
    ).toHaveCount(0);

    await page.goto("/app/wizard");
    await expect(page.getByText(/hệ thống chỉ tiếp nhận hồ sơ cấp Thành phố/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Nộp hồ sơ|Gửi hồ sơ|Gửi lại hồ sơ/ }),
    ).toHaveCount(0);
  });

  test("legacy school-level supplement cannot be resubmitted", async ({ page }) => {
    await loginAndGoto(page, "/app/application?state=supplement");
    await expect(page.getByText(/hệ thống chỉ tiếp nhận hồ sơ cấp Thành phố/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Nộp hồ sơ|Gửi hồ sơ|Gửi lại hồ sơ/ }),
    ).toHaveCount(0);

    await page.goto("/app/wizard?state=supplement");
    await expect(page.getByText(/hệ thống chỉ tiếp nhận hồ sơ cấp Thành phố/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Nộp hồ sơ|Gửi hồ sơ|Gửi lại hồ sơ/ }),
    ).toHaveCount(0);
  });

  test("overview opens a criterion workspace and returns without losing the URL contract", async ({
    page,
  }) => {
    await loginAndGoto(page, "/app/application");
    await page.getByRole("button", { name: /^Xem và hoàn thiện Học tập tốt/ }).click();

    await expect(page).toHaveURL(/criterion=academic/);
    await expect(
      studentContentMain(page).getByRole("heading", { name: "Học tập tốt" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Tổng quan hồ sơ" }).click();

    await expect(page.getByTestId("criterion-overview-card")).toHaveCount(5);
    await expect(page).not.toHaveURL(/criterion=/);
  });

  test("switching away from an open criterion form asks before discarding its draft", async ({
    page,
  }) => {
    await loginAndGoto(page, "/app/application?criterion=academic");
    await page.getByRole("button", { name: /Chỉnh kết quả|Tự khai báo kết quả/ }).click();
    const gpaInput = page.getByLabel(/GPA|ĐTB/);
    await gpaInput.fill("3.4");

    page.once("dialog", (dialog) => void dialog.dismiss());
    await page
      .getByRole("button", { name: /Đạo đức tốt/ })
      .first()
      .click();

    await expect(gpaInput).toHaveValue("3.4");
    await expect(
      studentContentMain(page).getByRole("heading", { name: "Học tập tốt" }),
    ).toBeVisible();
  });

  test("upload evidence deep link opens and closes the drawer", async ({ page }) => {
    await loginAndGoto(page, "/app/application?criterion=academic&uploadEvidence=1");
    const dialog = page.getByRole("dialog").filter({ hasText: /minh chứng/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Học tập");
    await expect(page).toHaveURL(/criterion=academic/);
    await expect(page).not.toHaveURL(/uploadEvidence=1/);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("dialog").filter({ hasText: /minh chứng/i })).toHaveCount(0);
    await expectNoLayoutViolations(page, "uploadEvidence");
  });

  test("browser Back after consuming an upload deep link returns without reopening the drawer", async ({
    page,
  }) => {
    await loginAndGoto(page, "/app/application?criterion=ethics");
    await page.goto("/app/application?criterion=physical&uploadEvidence=1");
    const dialog = page.getByRole("dialog").filter({ hasText: /minh chứng/i });
    await expect(dialog).toBeVisible();
    await expect(page).not.toHaveURL(/uploadEvidence=1/);

    await page.goBack();

    await expect(page).toHaveURL(/criterion=ethics/);
    await expect(dialog).toHaveCount(0);
  });

  test("criteria guide sheet opens and closes", async ({ page }) => {
    await loginAndGoto(page, "/app/application?criterion=ethics");
    await page.getByRole("button", { name: /Xem điều kiện/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Dữ liệu nền");
    await expect(dialog).toContainText("Hoàn thiện dữ liệu cho Đạo đức tốt.");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("academic edit success closes the form and API error preserves input", async ({ page }) => {
    await loginAndGoto(page, "/app/application?criterion=academic");

    await page.getByRole("button", { name: /Chỉnh kết quả|Tự khai báo kết quả/ }).click();
    await page.getByLabel(/GPA|ĐTB/).fill("4.4");
    await page.getByRole("button", { name: /Lưu/ }).click();
    await expect(page.getByText(/0-4|không được vượt quá 4/i)).toBeVisible();
    await expect(page.getByLabel(/GPA|ĐTB/)).toHaveValue("4.4");

    await page.getByLabel(/GPA|ĐTB/).fill("3.8");
    await page.getByRole("button", { name: /Lưu/ }).click();
    await expect(page.getByLabel(/GPA|ĐTB/)).toBeHidden();
  });

  test("City academic workspace follows configured GPA track and omits School-only checks", async ({
    page,
  }) => {
    await mockCityApplication(page, "draft");
    await page.route(/\/api\/applications\/app-1\/criteria-completion/, async (route) => {
      const payload = criteriaCompletion("draft");
      payload.targetLevel = "city";
      const academic = payload.items.find((item) => item.criterion === "academic");
      if (academic) {
        academic.requirementGroups = [
          {
            key: "academic_foundation",
            title: "GPA theo hệ đào tạo",
            operator: "one_of",
            optional: false,
            requirements: [
              requirement(
                "gpa_university",
                "GPA đại học",
                "metric",
                "rejected",
                ["manual_metric"],
                {
                  config: { metricType: "gpa", threshold: 3.2 },
                  payloadJson: { value: 3, scale: 4, schoolYear: "2025-2026" },
                },
              ),
              requirement(
                "gpa_college",
                "GPA cao đẳng",
                "metric",
                "needs_verification",
                ["manual_metric"],
                {
                  config: { metricType: "gpa", threshold: 3 },
                  payloadJson: { value: 3, scale: 4, schoolYear: "2025-2026" },
                },
              ),
            ],
          },
        ] as typeof academic.requirementGroups;
      }
      return json(route, payload);
    });

    await loginAndGoto(page, "/app/application?criterion=academic");

    await expect(studentContentMain(page).getByText("Cần xác minh").first()).toBeVisible();
    await expect(
      studentContentMain(page).getByText("Tình trạng điểm F", { exact: true }),
    ).toHaveCount(0);
    await expect(
      studentContentMain(page).getByText("Xác minh năm học", { exact: true }),
    ).toHaveCount(0);
    await expect(
      studentContentMain(page).getByRole("button", { name: /Chỉnh kết quả|Tự khai báo kết quả/ }),
    ).toBeVisible();
  });

  test("ethics verification is passive for students", async ({ page }) => {
    await loginAndGoto(page, "/app/application?criterion=ethics");
    await expect(
      page.locator("p").filter({ hasText: "Sinh viên không tự xác minh mục này" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Xác nhận tình trạng vi phạm/i })).toHaveCount(0);
  });

  test("city eligibility copy distinguishes direct, eligible, not eligible, and verification states", async ({
    page,
  }) => {
    for (const [status, route, expectedCopy] of [
      ["ELIGIBLE", "DIRECT_CITY", /xét trực tiếp cấp Thành phố/i],
      ["ELIGIBLE", "UDN_PREREQUISITE", /đủ điều kiện nộp hồ sơ cấp Thành phố/i],
      ["NOT_ELIGIBLE", "UDN_PREREQUISITE", /chưa đủ điều kiện để nộp lần đầu cấp Thành phố/i],
      ["NEEDS_VERIFICATION", "UDN_PREREQUISITE", /cần được cán bộ Thành phố xác minh/i],
    ] as const) {
      await loginAndGotoCityApplication(page, status, route);
      await expect(
        page.getByRole("heading", { name: /Điều kiện nộp hồ sơ cấp Thành phố/i }),
      ).toBeVisible();
      const eligibilityCard = page.locator(
        'section[aria-labelledby="city-submission-eligibility-title"]',
      );
      await expect(eligibilityCard).toContainText(expectedCopy);
      await expect(eligibilityCard).not.toContainText(/kết quả danh hiệu|được xét đạt/i);
    }
  });

  test("not eligible blocks only initial submit while drafting and precheck stay available", async ({
    page,
  }) => {
    await loginAndGotoCityApplication(page, "NOT_ELIGIBLE", "UDN_PREREQUISITE");

    await expect(page.getByRole("button", { name: /Kiểm tra hồ sơ/ }).first()).toBeEnabled();
    await expect(page.getByRole("button", { name: /Nộp hồ sơ/ }).first()).toBeDisabled();
    await page.getByTestId("criterion-overview-card").first().click();
    await expect(page.getByRole("button", { name: /Tải minh chứng/ }).first()).toBeEnabled();
  });

  test("City first submission stays available with incomplete criteria and offers add-or-submit-anyway", async ({
    page,
  }) => {
    let submitCount = 0;
    await mockCityApplication(page, "draft");
    await page.route(apiUrl("/api/applications/app-1/eligibility"), async (route) => {
      await json(route, {
        applicationId: "app-1",
        schoolYear: "2025-2026",
        route: "DIRECT_CITY",
        status: "ELIGIBLE",
        reasons: [],
      });
    });
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.endsWith("/submit")) submitCount += 1;
    });

    await loginAndGoto(page, "/app/application");
    const submitButton = page.getByRole("button", { name: /Nộp hồ sơ/ }).first();
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    const modal = page.getByRole("heading", { name: /kiểm tra trước khi nộp hồ sơ thành phố/i });
    await expect(modal).toBeVisible();
    const confirmation = page.locator(".fixed.inset-0");
    await expect(confirmation).toContainText(
      /bạn vẫn có thể nộp hồ sơ để hội sinh viên thành phố xem xét/i,
    );
    await expect(confirmation).toContainText(/đạo đức tốt|đạo đức/i);
    await expect(confirmation).toContainText(/học tập tốt|học tập/i);
    await expect(confirmation).toContainText(/thể lực tốt|thể lực/i);
    await expect(confirmation).toContainText(/tình nguyện tốt|tình nguyện/i);
    await expect(confirmation).toContainText(/hội nhập tốt|hội nhập/i);
    await expect(confirmation).toContainText("BỔ SUNG HỒ SƠ");
    await expect(confirmation).toContainText("VẪN NỘP HỒ SƠ");
    await expect(confirmation).not.toContainText(/không đạt/i);

    await page.getByRole("button", { name: "BỔ SUNG HỒ SƠ" }).click();
    await expect(modal).toBeHidden();
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    await page.getByRole("button", { name: "VẪN NỘP HỒ SƠ" }).click();
    await expect.poll(() => submitCount).toBe(1);
  });

  test("City OCR failure keeps the original file and asks staff to check it", async ({ page }) => {
    await mockCityApplication(page, "draft");
    await page.route(apiUrl("/api/applications/app-1/evidences**"), async (route) => {
      await json(route, [
        evidence(
          "ev-city-ocr-failed",
          "Bảng điểm gốc",
          "academic",
          "application/pdf",
          "draft",
          "failed",
        ),
      ]);
    });

    await loginAndGotoCityApplication(page, "ELIGIBLE", "DIRECT_CITY");
    await page.getByRole("button", { name: /Học tập tốt/ }).click();

    const evidenceCard = page.locator("article").filter({ hasText: "Bảng điểm gốc" });
    await expect(evidenceCard).toContainText(/cán bộ sẽ kiểm tra file gốc/i);
    await expect(evidenceCard).toContainText("bang-diem.pdf");
    await expect(evidenceCard).not.toContainText(/không đọc được minh chứng/i);
  });

  test("eligibility is refreshed at final submit and a newly blocked result prevents submission", async ({
    page,
  }) => {
    let submitCount = 0;
    let eligibilityReadCount = 0;
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (path.endsWith("/submit")) submitCount += 1;
    });
    await mockCityApplication(page, "noTasks");
    await page.route(apiUrl("/api/applications/app-1/eligibility"), async (route) => {
      eligibilityReadCount += 1;
      await json(route, {
        applicationId: "app-1",
        schoolYear: "2025-2026",
        route: "UDN_PREREQUISITE",
        status: eligibilityReadCount > 1 ? "NEEDS_VERIFICATION" : "ELIGIBLE",
        reasons: eligibilityReadCount > 1 ? ["IDENTITY_MATCH_REQUIRES_VERIFICATION"] : [],
      });
    });
    await loginAndGoto(page, "/app/application");
    await expect(page.getByRole("heading", { name: "Hồ sơ của tôi" })).toBeVisible();
    await page
      .getByRole("button", { name: /Nộp hồ sơ/ })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Kiểm tra trước khi nộp hồ sơ Thành phố" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "VẪN NỘP HỒ SƠ" }).click();

    await expect(
      page.locator('section[aria-labelledby="city-submission-eligibility-title"]'),
    ).toContainText(/cần được cán bộ Thành phố xác minh/i);
    expect(eligibilityReadCount).toBeGreaterThanOrEqual(2);
    expect(submitCount).toBe(0);
  });

  test("a backend eligibility conflict refreshes the V2 card and shows one explanation", async ({
    page,
  }) => {
    let eligibilityReadCount = 0;
    await mockCityApplication(page, "noTasks");
    await page.route(apiUrl("/api/applications/app-1/eligibility"), async (route) => {
      eligibilityReadCount += 1;
      await json(route, {
        applicationId: "app-1",
        schoolYear: "2025-2026",
        route: "UDN_PREREQUISITE",
        status: eligibilityReadCount > 2 ? "NEEDS_VERIFICATION" : "ELIGIBLE",
        reasons: eligibilityReadCount > 2 ? ["IDENTITY_MATCH_REQUIRES_VERIFICATION"] : [],
      });
    });
    await page.route(apiUrl("/api/applications/app-1/submit"), async (route) => {
      await jsonErrorWithCode(
        route,
        409,
        "CITY_SUBMISSION_NEEDS_VERIFICATION",
        "Manual verification is required.",
      );
    });

    await loginAndGoto(page, "/app/application");
    await expect(page.getByRole("button", { name: /Nộp hồ sơ/ }).first()).toBeEnabled();
    await page
      .getByRole("button", { name: /Nộp hồ sơ/ })
      .first()
      .click();
    await page
      .getByRole("button", { name: /Gửi hồ sơ|Nộp hồ sơ/i })
      .last()
      .click();

    await expect(
      page.locator('section[aria-labelledby="city-submission-eligibility-title"]'),
    ).toContainText(/cần được cán bộ Thành phố xác minh/i);
    await expect(
      page.getByText(/Điều kiện nộp hồ sơ cấp Thành phố đang chờ cán bộ xác minh/i),
    ).toHaveCount(1);
    expect(eligibilityReadCount).toBeGreaterThanOrEqual(3);
  });

  test("supplement resubmission hides and skips city eligibility", async ({ page }) => {
    let eligibilityReadCount = 0;
    let submitCount = 0;
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (path.endsWith("/eligibility")) eligibilityReadCount += 1;
      if (path.endsWith("/submit")) submitCount += 1;
    });

    await mockCityApplication(page, "supplement");
    await loginAndGoto(page, "/app/application");
    await expect(page.getByRole("heading", { name: "Hồ sơ của tôi" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Điều kiện nộp hồ sơ cấp Thành phố/i }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: /Nộp hồ sơ/ })
      .first()
      .click();
    await page.getByRole("button", { name: /Gửi lại hồ sơ bổ sung/ }).click();

    await expect.poll(() => submitCount).toBe(1);
    expect(eligibilityReadCount).toBe(0);
  });

  test("initial City deadline status shows an active exception without overriding eligibility", async ({
    page,
  }) => {
    await mockCityApplication(page, "noTasks");
    let deadlineRequests = 0;
    await page.route(apiUrl("/api/applications/app-1/eligibility"), async (route) => {
      await json(route, {
        applicationId: "app-1",
        schoolYear: "2025-2026",
        route: "UDN_PREREQUISITE",
        status: "NEEDS_VERIFICATION",
        reasons: ["IDENTITY_MATCH_REQUIRES_VERIFICATION"],
      });
    });
    await page.route(apiUrl("/api/applications/app-1/submission-deadline"), async (route) => {
      deadlineRequests += 1;
      await json(route, {
        applicationId: "app-1",
        schoolYear: "2025-2026",
        submission: {
          status: "EXCEPTION_ACTIVE",
          opensAt: "2026-02-01T08:00:00.000Z",
          closesAt: "2026-02-01T14:00:00.000Z",
          effectiveClosesAt: "2026-02-02T15:00:00.000Z",
          exceptionActive: true,
          exceptionValidUntil: "2026-02-02T15:00:00.000Z",
        },
        review: { deadlineAt: null, status: "NOT_CONFIGURED" },
        supplement: { deadlineAt: null, status: "NOT_CONFIGURED" },
        finalization: { deadlineAt: null, status: "NOT_CONFIGURED" },
      });
    });

    await loginAndGoto(page, "/app/application");

    const deadline = page.locator('section[aria-labelledby="city-submission-deadline-title"]');
    await expect(deadline).toContainText("Ngoại lệ nộp hồ sơ đang có hiệu lực");
    await expect(deadline).toContainText("22:00");
    await expect(
      page.locator('section[aria-labelledby="city-submission-eligibility-title"]'),
    ).toContainText("cần được cán bộ Thành phố xác minh");
    await expect(page.getByRole("button", { name: /Nộp hồ sơ/ }).first()).toBeDisabled();
    expect(deadlineRequests).toBe(1);
  });

  test("a closed City window blocks initial submit while eligible status stays visible", async ({
    page,
  }) => {
    await mockCityApplication(page, "noTasks");
    await page.route(apiUrl("/api/applications/app-1/eligibility"), async (route) => {
      await json(route, {
        applicationId: "app-1",
        schoolYear: "2025-2026",
        route: "UDN_PREREQUISITE",
        status: "ELIGIBLE",
        reasons: [],
      });
    });
    await page.route(apiUrl("/api/applications/app-1/submission-deadline"), async (route) =>
      json(route, {
        applicationId: "app-1",
        schoolYear: "2025-2026",
        submission: {
          status: "CLOSED",
          opensAt: "2026-01-01T00:00:00.000Z",
          closesAt: "2026-02-01T00:00:00.000Z",
          effectiveClosesAt: "2026-02-01T00:00:00.000Z",
          exceptionActive: false,
          exceptionValidUntil: null,
        },
        review: { deadlineAt: null, status: "NOT_CONFIGURED" },
        supplement: { deadlineAt: null, status: "NOT_CONFIGURED" },
        finalization: { deadlineAt: null, status: "NOT_CONFIGURED" },
      }),
    );

    await loginAndGoto(page, "/app/application");

    await expect(
      page.locator('section[aria-labelledby="city-submission-deadline-title"]'),
    ).toContainText("Đã hết thời hạn nộp hồ sơ");
    await expect(
      page.locator('section[aria-labelledby="city-submission-eligibility-title"]'),
    ).toContainText("đủ điều kiện nộp hồ sơ cấp Thành phố");
    await expect(page.getByRole("button", { name: /Nộp hồ sơ/ }).first()).toBeDisabled();
  });

  test("supplement uses its own deadline and skips initial eligibility", async ({ page }) => {
    await mockCityApplication(page, "supplement");
    let eligibilityRequests = 0;
    let deadlineRequests = 0;
    await page.route(apiUrl("/api/applications/app-1/eligibility"), async (route) => {
      eligibilityRequests += 1;
      await json(route, {
        applicationId: "app-1",
        schoolYear: "2025-2026",
        route: "UDN_PREREQUISITE",
        status: "NOT_ELIGIBLE",
        reasons: ["MISSING_UNIVERSITY_SYSTEM_AWARD"],
      });
    });
    await page.route(apiUrl("/api/applications/app-1/submission-deadline"), async (route) => {
      deadlineRequests += 1;
      await json(route, {
        applicationId: "app-1",
        schoolYear: "2025-2026",
        submission: {
          status: "CLOSED",
          opensAt: "2026-01-01T00:00:00.000Z",
          closesAt: "2026-02-01T00:00:00.000Z",
          effectiveClosesAt: "2026-02-01T00:00:00.000Z",
          exceptionActive: false,
          exceptionValidUntil: null,
        },
        review: { deadlineAt: "2026-02-03T17:00:00.000Z", status: "ON_TRACK" },
        supplement: { deadlineAt: "2026-02-05T17:00:00.000Z", status: "OVERDUE" },
        finalization: { deadlineAt: null, status: "NOT_CONFIGURED" },
      });
    });

    await loginAndGoto(page, "/app/application");

    const deadline = page.locator('section[aria-labelledby="city-supplement-deadline-title"]');
    await expect(deadline).toContainText("Hạn bổ sung");
    await expect(deadline).toContainText("00:00");
    await expect(deadline).not.toContainText("Đã hết thời hạn nộp hồ sơ");
    await expect(
      page.locator('section[aria-labelledby="city-submission-eligibility-title"]'),
    ).toHaveCount(0);
    expect(deadlineRequests).toBe(1);
    expect(eligibilityRequests).toBe(0);
  });

  test("non-City individual application does not request City deadlines", async ({ page }) => {
    await page.route(
      /^https?:\/\/(?:localhost|127\.0\.0\.1):\d+\/api\/applications\/current(?:\?.*)?$/,
      async (route) => {
        await json(route, currentApplication("noTasks", "school"));
      },
    );
    let deadlineRequests = 0;
    await page.route(apiUrl("/api/applications/app-1/submission-deadline"), async (route) => {
      deadlineRequests += 1;
      await json(route, null);
    });

    await loginAndGoto(page, "/app/application");

    await expect(
      page.locator('section[aria-labelledby="city-submission-deadline-title"]'),
    ).toHaveCount(0);
    expect(deadlineRequests).toBe(0);
  });

  test("supplement-required with no submittedAt is still checked as an initial City submission", async ({
    page,
  }) => {
    let eligibilityReadCount = 0;
    await mockCityApplication(page, "supplement", null);
    await page.route(apiUrl("/api/applications/app-1/eligibility"), async (route) => {
      eligibilityReadCount += 1;
      await json(route, {
        applicationId: "app-1",
        schoolYear: "2025-2026",
        route: "UDN_PREREQUISITE",
        status: "NOT_ELIGIBLE",
        reasons: ["MISSING_UNIVERSITY_SYSTEM_AWARD"],
      });
    });

    await loginAndGoto(page, "/app/application");
    await expect(
      page.locator('section[aria-labelledby="city-submission-eligibility-title"]'),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Nộp hồ sơ/ }).first()).toBeDisabled();
    expect(eligibilityReadCount).toBe(1);
  });

  test("a non-V2 student route explains a backend City eligibility conflict", async ({ page }) => {
    const applicationResponse = currentApplication("noTasks", "city");
    if (!applicationResponse.application) throw new Error("Test application fixture is missing.");
    applicationResponse.application.readinessScore = 100;
    applicationResponse.application.metrics.push(
      metric("metric-volunteer-days", "volunteer_days", 15, 20, "pending"),
    );
    await page.route(
      /^https?:\/\/(?:localhost|127\.0\.0\.1):\d+\/api\/applications\/current(?:\?.*)?$/,
      async (route) => {
        await json(route, applicationResponse);
      },
    );
    await page.route(apiUrl("/api/applications/app-1/evidences*"), async (route) => {
      const allEvidence = [
        ...evidencesFor(null),
        evidence(
          "ev-ethics",
          "Phiếu xác nhận đạo đức",
          "ethics",
          "application/pdf",
          "accepted",
          "indexed",
        ),
      ];
      const criterion = new URL(route.request().url()).searchParams.get(
        "criterion",
      ) as Criterion | null;
      await json(
        route,
        criterion ? allEvidence.filter((item) => item.criterion === criterion) : allEvidence,
      );
    });
    await page.route(apiUrl("/api/applications/app-1/precheck/latest"), async (route) => {
      await json(route, { ...latestPrecheck("noTasks"), readinessScore: 100 });
    });
    await page.route(apiUrl("/api/applications/app-1/submit"), async (route) => {
      await jsonErrorWithCode(
        route,
        409,
        "CITY_SUBMISSION_NOT_ELIGIBLE",
        "City submission requires an eligible award prerequisite.",
      );
    });

    await loginAndGoto(page, "/app/wizard");
    await page
      .getByRole("button", { name: /Nộp hồ sơ/ })
      .last()
      .click();
    await page.getByRole("button", { name: "Xác nhận nộp hồ sơ" }).click();

    await expect(page.getByText(/chưa đủ điều kiện nộp hồ sơ cấp Thành phố/i)).toBeVisible();
  });

  test("physical path selection reveals the matching input action", async ({ page }) => {
    await loginAndGoto(page, "/app/application?criterion=physical");
    await page.getByRole("radio", { name: /Kết quả học phần thể dục/ }).click();
    await expect(studentContentMain(page)).toContainText("Hình thức đang chọn");
    await expect(studentContentMain(page)).toContainText("Kết quả học phần thể dục");
    await expect(
      studentContentMain(page).getByRole("button", { name: "Tự khai báo và tải minh chứng" }),
    ).toBeVisible();
  });

  test("physical path can attach an already uploaded evidence to the selected requirement", async ({
    page,
  }) => {
    const pathEvidenceRequests: Record<string, unknown>[] = [];
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname === "/api/applications/app-1/physical/path-evidence"
      ) {
        pathEvidenceRequests.push(request.postDataJSON() as Record<string, unknown>);
      }
    });

    await loginAndGoto(page, "/app/application?criterion=physical");
    await page.getByRole("radio", { name: /Hoạt động hoặc giải thể thao/ }).click();
    await page.getByRole("button", { name: /Gắn minh chứng đã tải/ }).click();

    await expect.poll(() => pathEvidenceRequests.length).toBe(1);
    expect(pathEvidenceRequests[0]).toMatchObject({
      requirementKey: "sports_activity_or_award",
      evidenceId: "ev-official",
      sourceType: "official_event",
    });
  });

  test("uploading evidence from a selected physical path records that path", async ({ page }) => {
    const pathEvidenceRequests: Record<string, unknown>[] = [];
    const pathEvidence = evidence(
      "ev-physical-upload",
      "Minh chứng thành tích thể thao",
      "physical",
      "application/pdf",
      "draft",
      "not_started",
    );
    await page.route(apiUrl("/api/applications/app-1/evidences"), async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      await json(route, pathEvidence);
    });
    await page.route(apiUrl("/api/evidences/ev-physical-upload/files"), async (route) =>
      json(route, pathEvidence),
    );
    await page.route(apiUrl("/api/evidences/ev-physical-upload/start-indexing"), async (route) =>
      json(route, pathEvidence),
    );
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname === "/api/applications/app-1/physical/path-evidence"
      ) {
        pathEvidenceRequests.push(request.postDataJSON() as Record<string, unknown>);
      }
    });

    await loginAndGoto(page, "/app/application?criterion=physical");
    await page.getByRole("radio", { name: /Hoạt động hoặc giải thể thao/ }).click();
    await studentContentMain(page)
      .getByRole("button", { name: "Tự khai báo và tải minh chứng" })
      .click();
    const drawer = page.getByRole("dialog", { name: "Thêm minh chứng" });
    await drawer.getByLabel("Tên minh chứng").fill("Minh chứng thành tích thể thao");
    await drawer.locator('input[type="file"]').setInputFiles({
      name: "the-thao.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 test"),
    });
    await expect(drawer.getByText("the-thao.pdf")).toBeVisible();
    await drawer.getByRole("button", { name: "Thêm vào hồ sơ" }).click();

    await expect.poll(() => pathEvidenceRequests.length).toBe(1);
    expect(pathEvidenceRequests[0]).toMatchObject({
      requirementKey: "sports_activity_or_award",
      evidenceId: "ev-physical-upload",
      sourceType: "manual_evidence",
    });
  });

  test("volunteer student view does not expose day totals", async ({ page }) => {
    await loginAndGoto(page, "/app/application?criterion=volunteer");
    const workspace = page.getByTestId("volunteer-workspace");
    await expect(workspace).toBeVisible();
    await expect(workspace).toContainText("Ảnh hoạt động tình nguyện");
    await expect(workspace).not.toContainText("12");
    await expect(workspace).not.toContainText("3");
    await expect(workspace).not.toContainText("15");
    await expect(workspace).not.toContainText("Đã xác minh");
    await expect(workspace).not.toContainText("Đã ghi nhận");
    await expect(studentContentMain(page)).not.toContainText(/conversionRate|convertVolunteer/i);
  });

  test("volunteer declarations and supporting evidence are managed in one workspace", async ({
    page,
  }) => {
    const writes: Array<{ method: string; path: string; body: unknown }> = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (
        url.pathname.startsWith("/api/requirement-responses/") ||
        url.pathname.endsWith("/volunteer/activities")
      ) {
        writes.push({
          method: request.method(),
          path: url.pathname,
          body: request.postDataJSON(),
        });
      }
    });

    await page.setViewportSize({ width: 375, height: 667 });
    await loginAndGoto(page, "/app/application?criterion=volunteer");
    const workspace = page.getByTestId("volunteer-workspace");

    await expect(
      workspace.getByRole("heading", { name: "Khai báo hoạt động và minh chứng" }),
    ).toHaveCount(0);
    await expect(workspace.getByRole("heading", { name: "Minh chứng" })).toBeVisible();
    await expect(workspace.getByText("Ảnh hoạt động tình nguyện")).toBeVisible();
    await expect(workspace.getByTestId("volunteer-ledger")).toHaveCount(0);
    await expect(workspace).not.toContainText("Đã xác minh");
    await expect(workspace).not.toContainText("Đã ghi nhận");
    await expect(workspace).not.toContainText("Mục tiêu");
    await expect(
      workspace.getByRole("button", { name: "Thêm minh chứng", exact: true }),
    ).toBeVisible();
    await workspace.getByRole("button", { name: "Thêm minh chứng", exact: true }).click();
    const createDialog = page.getByRole("dialog", { name: "Thêm minh chứng" });
    await expectNoLayoutViolations(page, "volunteer evidence modal on mobile");
    await expect(createDialog.getByLabel("Tên hoạt động / minh chứng")).toBeVisible();
    await expect(createDialog.getByLabel("Tên hoạt động / minh chứng")).toHaveValue("");
    await expect(createDialog.getByLabel("Số ngày tham gia")).toHaveCount(0);
    await createDialog.getByLabel("Tên hoạt động / minh chứng").fill("Ngày hội hiến máu mới");
    await createDialog.getByLabel("Loại hoạt động").selectOption("blood_donation");
    await createDialog.locator('input[type="file"]').setInputFiles({
      name: "ngay-hoi.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 test"),
    });
    await createDialog.getByRole("button", { name: "Thêm vào hồ sơ" }).click();
    await expect
      .poll(() => writes.some((write) => write.path.endsWith("/volunteer/activities")))
      .toBeTruthy();
    expect(writes.find((write) => write.path.endsWith("/volunteer/activities"))).toMatchObject({
      method: "POST",
      body: {
        activityName: "Ngày hội hiến máu mới",
        declaredValue: 1,
        evidenceId: "ev-volunteer-upload",
      },
    });
  });

  test("integration path is dynamic and unknown backend keys render safely", async ({ page }) => {
    await loginAndGoto(page, "/app/application?criterion=integration");
    await expect(studentContentMain(page)).toContainText(/Ngoại ngữ|Kỹ năng|Hình thức khác/);
    await page.getByRole("radio", { name: /Hình thức khác/ }).click();
    await expect(studentContentMain(page)).toContainText("Hình thức đang chọn");
    await expect(studentContentMain(page)).toContainText("Hình thức khác");
    await expectNoLayoutViolations(page, "integration unknown path");
  });

  test("evidence thumbnails and Event Library reference entry preserve the criterion deep link", async ({
    page,
  }) => {
    await loginAndGoto(page, "/app/application?criterion=academic");

    const documentImage = page
      .locator("img")
      .filter({ has: page.locator("xpath=.") })
      .first();
    await expect(page.getByText(/Bảng điểm học kỳ 2/)).toBeVisible();
    await expect(page.getByText(/Giấy xác nhận học lực/)).toBeVisible();
    await expect(documentImage).toHaveCSS("object-fit", "contain");

    await page.getByRole("button", { name: /Xem minh chứng Bảng điểm học kỳ 2/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");

    const createRequests: unknown[] = [];
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname === "/api/applications/app-1/evidences"
      ) {
        createRequests.push(request.postDataJSON());
      }
    });

    await page.goto("/app/event-library?criterion=academic");
    await page.getByRole("button", { name: /Ngày hội Sinh viên 5 tốt/ }).click();
    const addEvidenceDialog = page.getByRole("dialog", { name: "Thêm minh chứng" });
    await expect(addEvidenceDialog.getByLabel("Tên minh chứng")).toHaveValue(
      "Ngày hội Sinh viên 5 tốt",
    );
    await expect(addEvidenceDialog).toContainText("Học tập tốt");
    await page.locator('input[type="file"]').setInputFiles({
      name: "evidence.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 test"),
    });
    await addEvidenceDialog.getByRole("button", { name: "Thêm vào hồ sơ" }).click();
    await expect(page).toHaveURL(/\/app\/application\?criterion=academic.*evidenceId=ev-created/);
    expect(createRequests).toHaveLength(1);
    expect(createRequests[0]).toMatchObject({
      evidenceName: "Ngày hội Sinh viên 5 tốt",
      criterion: "academic",
      eventId: "event-1",
      metadata: {
        referenceEventId: "event-1",
        referenceEventTitle: "Ngày hội Sinh viên 5 tốt",
        referenceSource: "student_reference_library",
      },
    });
  });

  test("readonly submitted state and supplement-limited editing hide unsafe actions", async ({
    page,
  }) => {
    await loginAndGoto(page, "/app/application?state=submitted&criterion=academic");
    await expect(
      page.getByRole("button", { name: /Lưu|Bổ sung ngay|Tự khai báo|Chỉnh/ }),
    ).toHaveCount(0);

    await loginAndGoto(page, "/app/application?state=supplement&criterion=academic");
    await expect(
      page.getByRole("button", { name: /Chỉnh kết quả|Tự khai báo kết quả/ }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /03 Thể lực tốt|Thể lực tốt/ })
      .first()
      .click();
    await expect(
      studentContentMain(page).getByRole("button", { name: "Tải minh chứng" }),
    ).toBeDisabled();
    await expect(studentContentMain(page).getByRole("radio").first()).toBeDisabled();
  });

  test("feedback empty/list states and assistant long conversation layout are stable", async ({
    page,
  }) => {
    await loginAndGoto(page, "/app/feedback?state=empty");
    await expect(studentContentMain(page)).toContainText(/Không có phản hồi cần xử lý/);

    await loginAndGoto(page, "/app/feedback?state=list");
    await expect(page.getByRole("tablist")).toBeVisible();
    await expect(studentContentMain(page)).toContainText(/Bổ sung bảng điểm/);
    await expect(studentContentMain(page)).not.toContainText(/Quay lại hồ sơ/);

    await loginAndGoto(page, "/app/assistant");
    await injectAssistantMessages(page);
    const messageList = page.locator("section[aria-labelledby^='student-assistant-'] div.max-h-56");
    await expect(messageList).toBeVisible();
    await expect(page.getByRole("textbox")).toBeVisible();
    const metrics = await page.evaluate(() => {
      const log = document.querySelector(
        "section[aria-labelledby^='student-assistant-'] div.max-h-56",
      );
      const form = document.querySelector("form");
      return {
        logScrollable: log ? log.scrollHeight > log.clientHeight : false,
        formBottom: form?.getBoundingClientRect().bottom ?? 0,
        viewportHeight: window.innerHeight,
      };
    });
    expect(metrics.logScrollable).toBeTruthy();
    expect(metrics.formBottom).toBeLessThanOrEqual(metrics.viewportHeight + 1);
  });
});

test.describe("student legacy flag smoke", () => {
  test.skip(acceptanceMode !== "legacy", "Run this block against a flag-off dev server.");

  test.beforeEach(async ({ page }) => {
    await installStudentApiMock(page);
  });

  test("legacy student routes keep rendering with the flag off", async ({ page }) => {
    await loginAndGoto(page, "/app?state=draft");
    await expect(page.getByRole("main")).toContainText(/Tổng quan|Sinh viên 5 tốt/);
    await expectNoRouteCrash(page, "legacy overview");

    for (const route of [
      "/app/application?criterion=academic",
      "/app/event-library",
      "/app/feedback",
      "/app/assistant",
      "/login",
      "/app/admin/workspaces",
      "/app/application?state=submitted",
      "/app/application?state=completed",
    ]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible();
      await expectNoRouteCrash(page, route);
    }
  });
});

function apiUrl(pathPattern: string) {
  return new RegExp(
    `^https?:\\/\\/(?:localhost|127\\.0\\.0\\.1):\\d+${pathPattern.replaceAll("*", ".*")}$`,
  );
}

async function installStudentApiMock(page: Page) {
  await page.route(/^https?:\/\/(?:localhost|127\.0\.0\.1):\d+\/api(?:\/|\?)/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const state = routeState(new URL(page.url()));

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: mockCorsHeaders, body: "" });
      return;
    }

    if (path === "/api/me" || path === "/api/auth/me") return json(route, studentUser);
    if (path === "/api/auth/login") {
      return json(route, { user: studentUser, accessToken: "test-token", refreshToken: "refresh" });
    }
    if (path === "/api/auth/logout") return json(route, null);
    if (path === "/api/applications/current") {
      return json(route, currentApplication(state));
    }
    if (path.match(/\/api\/applications\/[^/]+\/eligibility$/)) {
      const status = "ELIGIBLE";
      return json(route, {
        applicationId: "app-1",
        schoolYear: "2025-2026",
        route: "UDN_PREREQUISITE",
        status,
        reasons: status === "NOT_ELIGIBLE" ? ["MISSING_UNIVERSITY_SYSTEM_AWARD"] : [],
      });
    }
    if (path === "/api/applications/current/start") return json(route, currentApplication("draft"));
    if (path.endsWith("/criteria-completion")) return json(route, criteriaCompletion(state));
    if (path.endsWith("/precheck/latest")) return json(route, latestPrecheck(state));
    if (path.endsWith("/timeline")) return json(route, timeline);
    if (path.match(/\/api\/applications\/[^/]+\/evidences$/)) {
      if (request.method() === "POST") {
        const body = request.postDataJSON() as { criterion?: Criterion };
        return json(
          route,
          body.criterion === "volunteer"
            ? evidence(
                "ev-volunteer-upload",
                "Ảnh tình nguyện mới",
                "volunteer",
                "application/pdf",
                "draft",
                "pending_indexing",
              )
            : evidenceCreated,
        );
      }
      return json(route, evidencesFor(url.searchParams.get("criterion") as Criterion | null));
    }
    if (path.match(/\/api\/evidences\/[^/]+\/(files|start-indexing)$/)) {
      return json(
        route,
        path.includes("ev-volunteer-upload")
          ? evidence(
              "ev-volunteer-upload",
              "Ảnh tình nguyện mới",
              "volunteer",
              "application/pdf",
              "draft",
              "pending_indexing",
            )
          : evidenceCreated,
      );
    }
    if (path.endsWith("/academic/gpa/declare")) {
      const body = parseJsonBody(request.postData()) as { value?: number };
      if ((body.value ?? 0) > 4) {
        return jsonError(route, 400, "GPA must be between 0 and 4");
      }
      return json(route, { ok: true });
    }
    if (path.endsWith("/ethics/conduct-score/declare")) return json(route, { ok: true });
    if (path.endsWith("/physical/course-result/declare")) return json(route, { ok: true });
    if (path.endsWith("/physical/path-evidence")) return json(route, { ok: true });
    if (path.endsWith("/volunteer/activities")) return json(route, { ok: true });
    if (path.endsWith("/integration/path-responses")) return json(route, { ok: true });
    if (path.endsWith("/precheck")) return json(route, latestPrecheck(state));
    if (path.endsWith("/submit")) return json(route, { id: "app-1", status: "submitted" });
    if (path === "/api/evidence-matching/library") return json(route, officialLibrary);
    if (path.includes("/api/evidence-matching/") && path.endsWith("/import")) {
      return jsonError(route, 404, "Participant not found");
    }
    if (path.match(/\/api\/events\/[^/]+\/import-as-evidence$/)) {
      return jsonError(route, 404, "Participant not found");
    }
    if (path.match(/\/api\/events\/[^/]+\/check-participant$/)) {
      return jsonError(route, 404, "Participant not found");
    }
    if (path.match(/\/api\/evidences\/[^/]+$/)) return json(route, evidenceDetail(path));
    if (path.match(/\/api\/evidences\/[^/]+\/card$/)) return json(route, evidenceCard);
    if (path.match(/\/api\/evidences\/[^/]+\/audit$/)) return json(route, { items: [] });
    if (path.match(/\/api\/files\/[^/]+\/signed-url$/)) {
      return json(route, {
        url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      });
    }
    if (path === "/api/notifications") {
      return json(route, state === "empty" ? [] : notifications);
    }
    if (
      path === "/api/student-assistant/context" &&
      new URL(page.url()).pathname === "/app/assistant"
    ) {
      return json(route, studentAssistantContext);
    }
    if (path.match(/\/api\/notifications\/[^/]+\/read$/)) return json(route, null);
    if (path === "/api/chatbot/message") {
      return json(route, { message: "Bạn có thể kiểm tra từng tiêu chí trong hồ sơ.", cards: [] });
    }
    if (path === "/api/chatbot/stream") {
      return route.fulfill({
        status: 200,
        headers: { ...mockCorsHeaders, "content-type": "text/event-stream" },
        body: 'event: final\ndata: {"message":"Mình đã ghi nhận câu hỏi."}\n\n',
      });
    }
    if (path === "/api/evidence-matching/search" || path === "/api/events/search") {
      return json(route, []);
    }
    if (path === "/api/events") return json(route, { items: [], pagination: emptyPagination });

    return json(route, null);
  });
}

function parseJsonBody(postData: string | null) {
  if (!postData) return {};
  try {
    return JSON.parse(postData) as unknown;
  } catch {
    return {};
  }
}

async function loginAndGoto(page: Page, route: string) {
  await page.addInitScript(
    (auth) => {
      if (window.location.protocol === "http:" || window.location.protocol === "https:") {
        window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 }));
      }
    },
    { user: studentUser, accessToken: "test-token", refreshToken: "refresh" },
  );
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.locator("body").waitFor({ state: "visible" });
  await expect(page.getByText("Đang kiểm tra phiên đăng nhập...")).toHaveCount(0);
  await expect(page.locator("body")).toContainText("Hệ thống Sinh viên 5 tốt");
}

async function loginAndGotoCityApplication(
  page: Page,
  eligibilityStatus: "ELIGIBLE" | "NOT_ELIGIBLE" | "NEEDS_VERIFICATION",
  eligibilityRoute: "DIRECT_CITY" | "UDN_PREREQUISITE",
) {
  await mockCityApplication(page, "noTasks");
  await page.route(apiUrl("/api/applications/app-1/eligibility"), async (route) => {
    await json(route, {
      applicationId: "app-1",
      schoolYear: "2025-2026",
      route: eligibilityRoute,
      status: eligibilityStatus,
      reasons: eligibilityStatus === "NOT_ELIGIBLE" ? ["MISSING_UNIVERSITY_SYSTEM_AWARD"] : [],
    });
  });
  await loginAndGoto(page, "/app/application");
  await expect(page.getByRole("heading", { name: "Hồ sơ của tôi" })).toBeVisible();
}

async function mockCityApplication(page: Page, state: AppMode, submittedAt?: string | null) {
  await page.route(
    /^https?:\/\/(?:localhost|127\.0\.0\.1):\d+\/api\/applications\/current(?:\?.*)?$/,
    async (route) => {
      await json(route, currentApplication(state, "city", submittedAt));
    },
  );
  await page.route(apiUrl("/api/applications/app-1/submission-deadline"), async (route) =>
    json(route, {
      applicationId: "app-1",
      schoolYear: "2025-2026",
      submission: {
        status: "OPEN",
        opensAt: "2026-01-01T00:00:00.000Z",
        closesAt: "2026-02-01T00:00:00.000Z",
        effectiveClosesAt: "2026-02-01T00:00:00.000Z",
        exceptionActive: false,
        exceptionValidUntil: null,
      },
      review: { deadlineAt: "2026-02-03T17:00:00.000Z", status: "ON_TRACK" },
      supplement: { deadlineAt: "2026-02-05T17:00:00.000Z", status: "ON_TRACK" },
      finalization: { deadlineAt: "2026-02-10T17:00:00.000Z", status: "ON_TRACK" },
    }),
  );
}

function collectPageErrors(page: Page) {
  const messages: string[] = [];
  const onConsole = (message: { type: () => string; text: () => string }) => {
    if (message.type() === "error" && !/favicon|404/.test(message.text())) {
      messages.push(message.text());
    }
  };
  const onPageError = (error: Error) => messages.push(error.message);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  return {
    messages,
    dispose: () => {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    },
  };
}

async function expectNoRouteCrash(page: Page, label: string) {
  const text = await page.locator("body").innerText();
  expect(text, `${label} route error boundary`).not.toMatch(routeErrorPattern);
}

async function expectNoLayoutViolations(page: Page, label: string) {
  const metrics = await page.evaluate(() => {
    const visible = (el: Element) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden";
    };
    const actionable = Array.from(
      document.querySelectorAll(
        "button,a,input,select,textarea,summary,[role='button'],[role='tab']",
      ),
    ).filter(visible);
    const smallTargets = actionable
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          text: ((el as HTMLElement).innerText || el.getAttribute("aria-label") || el.tagName)
            .replace(/\s+/g, " ")
            .trim(),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter((item) => item.width < 44 || item.height < 44);
    const croppedDocuments = Array.from(document.images)
      .filter(
        (img) =>
          visible(img) &&
          /pdf|document|transcript|bang-diem/i.test(img.currentSrc || img.src || img.alt),
      )
      .filter((img) => getComputedStyle(img).objectFit !== "contain")
      .map((img) => img.alt || img.currentSrc || img.src);

    return {
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      smallTargets,
      croppedDocuments,
      body: document.body.innerText,
    };
  });

  expect(metrics.overflowX, `${label} document overflow`).toBeLessThanOrEqual(1);
  expect(metrics.smallTargets, `${label} touch target size`).toEqual([]);
  expect(metrics.croppedDocuments, `${label} document crop`).toEqual([]);
  expect(metrics.body, `${label} raw enum copy`).not.toMatch(rawEnumPattern);
}

async function injectAssistantMessages(page: Page) {
  await page.evaluate(() => {
    const log = document.querySelector(
      "section[aria-labelledby^='student-assistant-'] div.max-h-56",
    );
    if (!log) return;
    for (let i = 0; i < 24; i += 1) {
      const row = document.createElement("div");
      row.textContent = `Tin nhắn kiểm thử ${i + 1}: nội dung đủ dài để kiểm tra vùng hội thoại cuộn nội bộ.`;
      row.style.padding = "12px";
      row.style.marginBottom = "8px";
      row.style.border = "1px solid var(--student-v2-divider)";
      row.style.borderRadius = "8px";
      log.appendChild(row);
    }
    log.scrollTop = log.scrollHeight;
  });
}

function routeState(url: URL): AppMode {
  const state = url.searchParams.get("state");
  if (
    state === "empty" ||
    state === "noTasks" ||
    state === "supplement" ||
    state === "completed" ||
    state === "submitted"
  ) {
    return state;
  }
  return "draft";
}

function studentContentMain(page: Page) {
  return page.locator("main").last();
}

function currentApplication(
  state: AppMode,
  targetLevel: "school" | "city" = "school",
  submittedAt?: string | null,
) {
  if (state === "empty") {
    return { application: null, state: "not_started", schoolYear: "2025-2026" };
  }
  const status =
    state === "supplement"
      ? "supplement_required"
      : state === "completed"
        ? "completed"
        : state === "submitted"
          ? "submitted"
          : state === "noTasks"
            ? "ready_to_submit"
            : "draft";
  return {
    state: status,
    application: {
      id: "app-1",
      studentId: "student-1",
      schoolYear: "2025-2026",
      applicationType: "individual",
      targetLevel,
      status,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      lastUpdatedAt: "2026-01-02T00:00:00Z",
      submittedAt:
        submittedAt !== undefined
          ? submittedAt
          : state === "submitted" || state === "completed" || state === "supplement"
            ? "2026-01-03T00:00:00Z"
            : null,
      currentDraftVersion: 2,
      metrics: [
        metric("metric-conduct", "conduct_score", 87, 100, "pending"),
        metric("metric-gpa", "gpa", 3.6, 4, "pending"),
      ],
      reviewTasks:
        state === "supplement"
          ? [
              {
                id: "review-1",
                criterion: "academic",
                status: "supplement_required",
                officerNote: "Bổ sung bảng điểm có xác nhận rõ hơn.",
                supplementRequestJson: {
                  reason: "Bảng điểm cần dấu xác nhận",
                  requestedFields: ["gpa"],
                  evidenceIds: ["ev-pdf"],
                },
                updatedAt: "2026-01-04T08:00:00Z",
              },
            ]
          : [],
      basicInfo: {
        fullName: "Nguyễn Văn Sinh",
        studentCode: "102220001",
        faculty: "Công nghệ Thông tin",
        className: "22T_DT1",
      },
    },
  };
}

function criteriaCompletion(state: AppMode) {
  const status =
    state === "supplement"
      ? "supplement_required"
      : state === "completed"
        ? "completed"
        : state === "submitted"
          ? "submitted"
          : state === "noTasks"
            ? "ready_to_submit"
            : "draft";
  const accepted = state === "completed" || state === "noTasks";
  return {
    applicationId: "app-1",
    criteriaVersionId: "criteria-v1",
    targetLevel: "school",
    items: criteria.map((criterion) => completionItem(criterion, state, accepted)),
    summary: {
      notStarted: accepted ? 0 : 1,
      inProgress: accepted ? 0 : 2,
      needsVerification: accepted ? 0 : 2,
      readyForPrecheck: accepted ? 5 : 1,
      accepted: accepted ? 5 : 0,
    },
    status,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
  };
}

function completionItem(criterion: Criterion, state: AppMode, accepted: boolean) {
  const status = accepted
    ? "accepted"
    : state === "supplement" && criterion === "academic"
      ? "supplement_required"
      : criterion === "integration"
        ? "not_started"
        : "needs_verification";
  return {
    criterion,
    title: criterionTitle(criterion),
    description: `Hoàn thiện dữ liệu cho ${criterionTitle(criterion)}.`,
    status,
    requirementGroups: requirementGroups(criterion, accepted),
    completion: {
      satisfied: accepted ? 2 : criterion === "integration" ? 0 : 1,
      required: 2,
      needsVerification: accepted ? 0 : 1,
    },
    evidenceCount: evidencesFor(criterion).length,
    nextAction: accepted ? null : { type: "manual", label: "Bổ sung ngay" },
  };
}

function requirementGroups(criterion: Criterion, accepted: boolean) {
  if (criterion === "ethics") {
    return [
      {
        key: "ethics_base",
        title: "Dữ liệu nền",
        operator: "all_of",
        optional: false,
        requirements: [
          requirement(
            "conduct_score",
            "Điểm rèn luyện",
            "metric",
            accepted ? "verified" : "declared",
            ["manual_metric"],
            {
              payloadJson: { schoolYear: "2025-2026" },
            },
          ),
          requirement(
            "no_violation",
            "Tình trạng vi phạm",
            "system_confirmation",
            accepted ? "verified" : "needs_verification",
            ["system_data"],
          ),
          requirement("valid_school_year", "Xác minh năm học", "system_confirmation", "verified", [
            "system_data",
          ]),
        ],
      },
      optionalGroup("ethics_extra", "Thành tích đạo đức bổ sung"),
    ];
  }
  if (criterion === "academic") {
    return [
      {
        key: "academic_base",
        title: "Kết quả học tập",
        operator: "all_of",
        optional: false,
        requirements: [
          requirement(
            "gpa",
            "GPA/ĐTB",
            "metric",
            accepted ? "verified" : "declared",
            ["manual_metric"],
            {
              payloadJson: { scale: 4, schoolYear: "2025-2026" },
            },
          ),
          requirement(
            "no_f_grade",
            "Tình trạng điểm F",
            "system_confirmation",
            accepted ? "verified" : "needs_verification",
            ["system_data"],
          ),
          requirement("academic_period", "Xác minh năm học", "system_confirmation", "verified", [
            "system_data",
          ]),
        ],
      },
      optionalGroup("academic_extra", "Thành tích học thuật bổ sung", [
        requirement("student_research", "student_research", "evidence", "not_started", [
          "manual_evidence",
        ]),
        requirement("journal_article", "journal_article", "evidence", "not_started", [
          "manual_evidence",
        ]),
      ]),
    ];
  }
  if (criterion === "physical") {
    return [
      {
        key: "physical_path",
        title: "Chọn hình thức",
        operator: "one_of",
        optional: false,
        requirements: [
          requirement(
            "physical_education_result",
            "Kết quả học phần thể dục",
            "metric",
            "not_started",
            ["manual_metric"],
          ),
          requirement(
            "healthy_student_title",
            "Danh hiệu Sinh viên khỏe",
            "evidence",
            "not_started",
            ["manual_evidence", "official_event"],
          ),
          requirement(
            "sports_activity_or_award",
            "Hoạt động hoặc giải thể thao",
            "evidence",
            "not_started",
            ["manual_evidence", "official_event"],
          ),
          requirement("sports_team_member", "Đội tuyển thể thao", "evidence", "not_started", [
            "manual_evidence",
          ]),
          requirement(
            "regular_sports_training",
            "Rèn luyện thể thao thường xuyên",
            "evidence",
            "not_started",
            ["manual_evidence"],
          ),
        ],
      },
    ];
  }
  if (criterion === "volunteer") {
    return [
      {
        key: "volunteer_days",
        title: "Ngày tình nguyện",
        operator: "all_of",
        optional: false,
        requirements: [
          {
            ...requirement(
              "accumulated_volunteer_days",
              "Tổng ngày tình nguyện",
              "activity_aggregation",
              accepted ? "verified" : "needs_verification",
              ["manual_evidence", "official_event"],
            ),
            aggregation: {
              verifiedTotal: 12,
              pendingVerificationTotal: 3,
              excludedTotal: 0,
              unit: "ngày",
              threshold: 15,
              activities: [
                {
                  id: "act-1",
                  requirementKey: "accumulated_volunteer_days",
                  activityType: "blood_donation",
                  activityName: "Ngày hội hiến máu",
                  organizer: "HSV Trường",
                  startDate: "2026-01-09",
                  endDate: "2026-01-09",
                  declaredValue: 3,
                  declaredUnit: "ngày",
                  countedValue: 3,
                  status: "needs_verification",
                  sourceType: "manual_evidence",
                  evidenceId: "ev-photo",
                },
              ],
            },
            currentResponses: [
              {
                id: "response-act-1",
                responseKind: "activity_aggregation",
                status: "needs_verification",
                evidenceId: "ev-photo",
                payloadJson: {
                  id: "act-1",
                  applicationId: "app-1",
                  requirementKey: "accumulated_volunteer_days",
                  activityType: "blood_donation",
                  activityName: "Ngày hội hiến máu",
                  organizer: "HSV Trường",
                  startDate: "2026-01-09",
                  endDate: "2026-01-09",
                  declaredValue: 3,
                  declaredUnit: "day",
                  sourceType: "manual_evidence",
                  evidenceId: "ev-photo",
                },
              },
            ],
          },
        ],
      },
    ];
  }
  return [
    {
      key: "integration_path",
      title: "Chọn hình thức hội nhập",
      operator: "one_of",
      optional: false,
      requirements: [
        requirement(
          "foreign_language",
          "Ngoại ngữ",
          "evidence",
          "not_started",
          ["manual_evidence"],
          {
            formSchema: { fields: [{ key: "score", type: "number", required: true }] },
          },
        ),
        requirement("skills_training", "Kỹ năng và đào tạo", "evidence", "not_started", [
          "manual_evidence",
          "official_event",
        ]),
        requirement("custom_backend_path", "custom_backend_path", "evidence", "not_started", [
          "manual_evidence",
        ]),
      ],
    },
  ];
}

function requirement(
  key: string,
  title: string,
  type: string,
  status: string,
  acceptedSources: string[],
  overrides: Record<string, unknown> = {},
) {
  return {
    key,
    title,
    description: `Yêu cầu ${title}`,
    type,
    status,
    optional: false,
    acceptedSources,
    currentResponses:
      status === "not_started"
        ? []
        : [
            {
              id: `${key}-response`,
              responseKind: type,
              status,
              payloadJson: overrides.payloadJson ?? {},
              createdAt: "2026-01-01T00:00:00Z",
            },
          ],
    ...overrides,
  };
}

function optionalGroup(key: string, title: string, requirements = []) {
  return { key, title, operator: "at_least_n", requiredCount: 0, optional: true, requirements };
}

function latestPrecheck(state: AppMode) {
  return {
    id: "precheck-1",
    applicationId: "app-1",
    status: state === "completed" || state === "noTasks" ? "passed" : "pending",
    results: criteria.map((criterion) => ({
      criterion,
      status: criterion === "integration" ? "not_started" : "needs_verification",
      label: criterionTitle(criterion),
    })),
    summary: "Kết quả kiểm tra sơ bộ",
    createdAt: "2026-01-02T00:00:00Z",
  };
}

function evidencesFor(criterion: Criterion | null) {
  const all = [
    evidence("ev-pdf", "Bảng điểm học kỳ 2", "academic", "application/pdf", "accepted", "indexed"),
    evidence(
      "ev-image",
      "Giấy xác nhận học lực",
      "academic",
      "image/png",
      "under_review",
      "indexed",
    ),
    evidence(
      "ev-photo",
      "Ảnh hoạt động tình nguyện",
      "volunteer",
      "image/jpeg",
      "under_review",
      "indexed",
    ),
    evidence(
      "ev-official",
      "Ngày hội Sinh viên 5 tốt",
      "physical",
      null,
      "accepted",
      "indexed",
      "event_import",
    ),
    evidence("ev-failed", "Tệp OCR lỗi", "integration", "application/pdf", "draft", "failed"),
  ];
  return criterion ? all.filter((item) => item.criterion === criterion) : all;
}

function evidence(
  id: string,
  evidenceName: string,
  criterion: Criterion,
  mimeType: string | null,
  status: string,
  indexingStatus: string,
  sourceType = "manual_upload",
) {
  return {
    id,
    applicationId: "app-1",
    evidenceName,
    criterion,
    sourceType,
    status,
    indexingStatus,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    files: mimeType
      ? [
          {
            id: `${id}-file`,
            evidenceId: id,
            fileName: mimeType.includes("pdf") ? "bang-diem.pdf" : "thumbnail.png",
            fileSize: 1200,
            mimeType,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        ]
      : [],
  };
}

function evidenceDetail(path: string) {
  const id = path.split("/").pop() ?? "ev-pdf";
  return evidencesFor(null).find((item) => item.id === id) ?? evidencesFor(null)[0];
}

function metric(
  id: string,
  metricType: string,
  value: number,
  scale: number,
  verificationStatus: string,
) {
  return {
    id,
    applicationId: "app-1",
    metricType,
    value,
    scale,
    verificationStatus,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
  };
}

function criterionTitle(criterion: Criterion) {
  return {
    ethics: "Đạo đức tốt",
    academic: "Học tập tốt",
    physical: "Thể lực tốt",
    volunteer: "Tình nguyện tốt",
    integration: "Hội nhập tốt",
  }[criterion];
}

async function json(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    headers: { ...mockCorsHeaders, "content-type": "application/json" },
    body: JSON.stringify({ success: true, data, error: null, meta: { requestId: "pw-mock" } }),
  });
}

async function jsonError(route: Route, status: number, message: string) {
  await route.fulfill({
    status,
    headers: { ...mockCorsHeaders, "content-type": "application/json" },
    body: JSON.stringify({
      success: false,
      data: null,
      error: { code: String(status), message },
      meta: { requestId: "pw-mock" },
    }),
  });
}

async function jsonErrorWithCode(route: Route, status: number, code: string, message: string) {
  await route.fulfill({
    status,
    headers: { ...mockCorsHeaders, "content-type": "application/json" },
    body: JSON.stringify({
      success: false,
      data: null,
      error: { code, message },
      meta: { requestId: "pw-mock" },
    }),
  });
}

const studentUser = {
  id: "student-1",
  workspaceId: "workspace-1",
  email: "student@example.test",
  role: "student",
  fullName: "Nguyễn Văn Sinh",
  studentCode: "102220001",
  className: "22T_DT1",
  faculty: "Công nghệ Thông tin",
  phone: null,
  avatarUrl: null,
  isActive: true,
  lastLoginAt: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  workspace: {
    id: "workspace-1",
    code: "DDK",
    name: "Trường Đại học Bách khoa - Đại học Đà Nẵng",
    shortName: "DDK",
  },
};

const timeline = [
  {
    id: "timeline-1",
    type: "precheck",
    title: "Đã kiểm tra sơ bộ hồ sơ",
    message: "Hệ thống đã ghi nhận dữ liệu.",
    createdAt: "2026-01-02T08:00:00Z",
  },
];

const studentAssistantContext = {
  contextType: "dashboard",
  contextId: "app-1",
  contextVersion: "test-v1",
  generatedAt: "2026-01-02T08:00:00Z",
  title: "Trợ lý theo hồ sơ",
  deterministicSummary: "Trợ lý chỉ giải thích dữ liệu đang có trong hồ sơ của bạn.",
  facts: [],
  warnings: [],
  primaryAction: null,
  allowedActions: [],
  suggestedQuestions: ["Tôi cần bổ sung gì?", "Quy định áp dụng ra sao?"],
  boundaries: {
    canAnswerAboutCriteria: true,
    canAnswerAboutEvidence: true,
    canAnswerAboutEvents: false,
    canAnswerAboutSupplement: false,
    requiresOfficerForOfficialDecision: true,
  },
};

const notifications = [
  {
    id: "notification-1",
    type: "supplement_request",
    title: "Bổ sung bảng điểm",
    message: "Bảng điểm cần có dấu xác nhận rõ hơn.",
    readAt: null,
    applicationId: "app-1",
    metadata: { criterion: "academic", status: "supplement_required" },
    createdAt: "2026-01-04T08:00:00Z",
  },
  {
    id: "notification-2",
    type: "status_update",
    title: "Đã kiểm tra sơ bộ",
    message: "Hồ sơ đã được kiểm tra sơ bộ.",
    readAt: "2026-01-04T09:00:00Z",
    applicationId: "app-1",
    metadata: { criterion: "ethics" },
    createdAt: "2026-01-03T08:00:00Z",
  },
];

const officialLibrary = {
  items: [
    {
      eventId: "event-1",
      title: "Ngày hội Sinh viên 5 tốt",
      organizer: "Hội Sinh viên",
      organizerLevel: "school",
      criterion: "academic",
      state: "available",
    },
  ],
  page: 1,
  limit: 10,
  total: 1,
  totalPages: 1,
};

const evidenceCreated = evidence(
  "ev-created",
  "Minh chứng mới",
  "academic",
  "application/pdf",
  "draft",
  "not_started",
);

const evidenceCard = {
  id: "card-1",
  evidenceId: "ev-pdf",
  readableSummary: { eventName: "Bảng điểm học kỳ 2", studentName: "Nguyễn Văn Sinh" },
  matchingStatus: { code: "matched", label: "Đã đối chiếu" },
  missingFields: [],
};

const emptyPagination = { page: 1, limit: 20, total: 0, totalPages: 1 };
