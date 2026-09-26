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
      await expect(page.getByRole("main")).toContainText(criterionTitle(criterion));
      await expectNoRouteCrash(page, criterion);
      await expectNoLayoutViolations(page, criterion);
    }
  });

  test("upload evidence deep link opens and closes the drawer", async ({ page }) => {
    await loginAndGoto(page, "/app/application?criterion=academic&uploadEvidence=1");
    const dialog = page.getByRole("dialog").filter({ hasText: /minh chứng/i });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expectNoLayoutViolations(page, "uploadEvidence");
  });

  test("criteria guide sheet opens and closes", async ({ page }) => {
    await loginAndGoto(page, "/app/application?criterion=ethics");
    await page.getByRole("button", { name: /Xem điều kiện/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/Nguồn:/);
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

  test("ethics verification is passive for students", async ({ page }) => {
    await loginAndGoto(page, "/app/application?criterion=ethics");
    await expect(
      page.getByText(/Sinh viên không tự xác minh|chờ nhà trường xác nhận/i),
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
    await expect(page.getByRole("button", { name: /Tải minh chứng/ }).first()).toBeEnabled();
  });

  test("City first submission stays available with incomplete criteria and offers add-or-submit-anyway", async ({
    page,
  }) => {
    let submitCount = 0;
    await mockCityApplication(page, "draft");
    await page.route("http://localhost:8080/api/applications/app-1/eligibility", async (route) => {
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
    await page.route("http://localhost:8080/api/applications/app-1/evidences**", async (route) => {
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
    await page.route("http://localhost:8080/api/applications/app-1/eligibility", async (route) => {
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
    await expect(page.getByRole("heading", { name: "Hồ sơ & minh chứng" })).toBeVisible();
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
    await page.route("http://localhost:8080/api/applications/app-1/eligibility", async (route) => {
      eligibilityReadCount += 1;
      await json(route, {
        applicationId: "app-1",
        schoolYear: "2025-2026",
        route: "UDN_PREREQUISITE",
        status: eligibilityReadCount > 2 ? "NEEDS_VERIFICATION" : "ELIGIBLE",
        reasons: eligibilityReadCount > 2 ? ["IDENTITY_MATCH_REQUIRES_VERIFICATION"] : [],
      });
    });
    await page.route("http://localhost:8080/api/applications/app-1/submit", async (route) => {
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
    await expect(page.getByRole("heading", { name: "Hồ sơ & minh chứng" })).toBeVisible();
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

  test("supplement-required with no submittedAt is still checked as an initial City submission", async ({
    page,
  }) => {
    let eligibilityReadCount = 0;
    await mockCityApplication(page, "supplement", null);
    await page.route("http://localhost:8080/api/applications/app-1/eligibility", async (route) => {
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
    await page.route("http://localhost:8080/api/applications/current*", async (route) => {
      await json(route, applicationResponse);
    });
    await page.route("http://localhost:8080/api/applications/app-1/evidences*", async (route) => {
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
    await page.route(
      "http://localhost:8080/api/applications/app-1/precheck/latest",
      async (route) => {
        await json(route, { ...latestPrecheck("noTasks"), readinessScore: 100 });
      },
    );
    await page.route("http://localhost:8080/api/applications/app-1/submit", async (route) => {
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

  test("physical path selection requires confirmation before changing dirty input", async ({
    page,
  }) => {
    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      await dialog.dismiss();
    });
    await loginAndGoto(page, "/app/application?criterion=physical");
    await page.getByRole("button", { name: /Kết quả học phần thể dục/i }).click();
    await page
      .getByLabel(/Điểm|Kết quả/)
      .first()
      .fill("8");
    await page.getByRole("button", { name: /Danh hiệu Sinh viên khỏe/i }).click();
    await expect(page.getByRole("main")).toContainText(/Kết quả học phần thể dục/);
  });

  test("volunteer ledger uses backend aggregation values", async ({ page }) => {
    await loginAndGoto(page, "/app/application?criterion=volunteer");
    await expect(page.getByRole("main")).toContainText(/12/);
    await expect(page.getByRole("main")).toContainText(/3/);
    await expect(page.getByRole("main")).toContainText(/15/);
    await expect(page.getByRole("main")).toContainText(/Ngày hội hiến máu/);
    await expect(page.getByRole("main")).not.toContainText(/conversionRate|convertVolunteer/i);
  });

  test("integration path is dynamic and unknown backend keys render safely", async ({ page }) => {
    await loginAndGoto(page, "/app/application?criterion=integration");
    await expect(page.getByRole("main")).toContainText(/Ngoại ngữ|Kỹ năng|Hình thức khác/);
    await page.getByRole("button", { name: /Hình thức khác/i }).click();
    await expect(page.getByRole("main")).toContainText(/Hình thức khác/);
    await expectNoLayoutViolations(page, "integration unknown path");
  });

  test("evidence thumbnails, full preview, official import entry and participant fallback work", async ({
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

    await page.getByRole("button", { name: /Tìm trong kho/ }).click();
    await expect(page.getByRole("dialog")).toContainText(/Ngày hội Sinh viên 5 tốt/);
    await page
      .getByRole("button", { name: /Dùng minh chứng|Nhập vào hồ sơ/ })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      /không tìm thấy|không có tên|tải minh chứng/i,
    );
    await page.keyboard.press("Escape");
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
    await expect(page.getByRole("button", { name: /Lưu|Thêm|Tự khai báo|Chọn/ })).toHaveCount(0);
  });

  test("feedback empty/list states and assistant long conversation layout are stable", async ({
    page,
  }) => {
    await loginAndGoto(page, "/app/feedback?state=empty");
    await expect(page.getByRole("main")).toContainText(/Không có phản hồi|Chưa có phản hồi/);

    await loginAndGoto(page, "/app/feedback?state=list");
    await expect(page.getByRole("tablist")).toBeVisible();
    await expect(page.getByRole("main")).toContainText(/Bổ sung bảng điểm/);
    await expect(page.getByRole("main")).not.toContainText(/Quay lại hồ sơ/);

    await loginAndGoto(page, "/app/assistant");
    await injectAssistantMessages(page);
    await expect(page.locator("[role='log']")).toBeVisible();
    await expect(page.getByRole("textbox")).toBeVisible();
    const metrics = await page.evaluate(() => {
      const log = document.querySelector("[role='log']");
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

async function installStudentApiMock(page: Page) {
  await page.route("http://localhost:8080/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const state = routeState(url);

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
      if (request.method() === "POST") return json(route, evidenceCreated);
      return json(route, evidencesFor(url.searchParams.get("criterion") as Criterion | null));
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
      window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 }));
    },
    { user: studentUser, accessToken: "test-token", refreshToken: "refresh" },
  );
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.locator("body").waitFor({ state: "visible" });
}

async function loginAndGotoCityApplication(
  page: Page,
  eligibilityStatus: "ELIGIBLE" | "NOT_ELIGIBLE" | "NEEDS_VERIFICATION",
  eligibilityRoute: "DIRECT_CITY" | "UDN_PREREQUISITE",
) {
  await mockCityApplication(page, "noTasks");
  await page.route("http://localhost:8080/api/applications/app-1/eligibility", async (route) => {
    await json(route, {
      applicationId: "app-1",
      schoolYear: "2025-2026",
      route: eligibilityRoute,
      status: eligibilityStatus,
      reasons: eligibilityStatus === "NOT_ELIGIBLE" ? ["MISSING_UNIVERSITY_SYSTEM_AWARD"] : [],
    });
  });
  await loginAndGoto(page, "/app/application");
  await expect(page.getByRole("heading", { name: "Hồ sơ & minh chứng" })).toBeVisible();
}

async function mockCityApplication(page: Page, state: AppMode, submittedAt?: string | null) {
  await page.route("http://localhost:8080/api/applications/current?*", async (route) => {
    await json(route, currentApplication(state, "city", submittedAt));
  });
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
    const log = document.querySelector("[role='log']");
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
                  activityName: "Ngày hội hiến máu",
                  organizer: "HSV Trường",
                  startDate: "2026-01-09",
                  endDate: "2026-01-09",
                  declaredValue: 3,
                  declaredUnit: "ngày",
                  countedValue: 3,
                  status: "needs_verification",
                  sourceType: "manual_evidence",
                },
              ],
            },
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
