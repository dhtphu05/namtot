import { expect, test, type Page, type Route } from "@playwright/test";

const apiBase = "http://localhost:8080";

test.describe("Student evidence workspace S3 + S4", () => {
  test("shows the evidence library with exactly five criteria and friendly status copy", async ({
    page,
  }) => {
    await installEvidenceApi(page, {
      evidences: [
        evidence("ev-processing", "Giấy xác nhận hoạt động", "volunteer", "pending_indexing"),
        evidence("ev-ready", "Bảng điểm học kỳ", "academic", "indexed"),
        evidence("ev-attention", "Chứng nhận nghiên cứu", "academic", "indexed", {
          card: { confirmationStatus: "pending", requiresHumanConfirmation: true },
        }),
        evidence("ev-failed", "Tài liệu cần thay", "integration", "failed", { jobId: "job-1" }),
        evidence("ev-priority", "Thành tích ưu tiên", "priority", "indexed"),
      ],
    });
    await openStudentPage(page, "/app/upload");

    const filters = page.getByRole("group", { name: "Lọc theo tiêu chí" });
    await expect(filters.getByRole("button")).toHaveCount(6);
    for (const criterion of [
      "Đạo đức tốt",
      "Học tập tốt",
      "Thể lực tốt",
      "Tình nguyện tốt",
      "Hội nhập tốt",
    ]) {
      await expect(filters.getByRole("button", { name: new RegExp(criterion) })).toBeVisible();
    }
    await expect(filters.getByText(/Thành tích ưu tiên/)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Minh chứng" })).toBeVisible();
    await expect(page.getByText("Đang đọc tài liệu")).toBeVisible();
    await expect(page.getByText("Cần bạn kiểm tra").first()).toBeVisible();
    await expect(page.getByText("Không thể đọc tài liệu")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      /\b(?:pending_indexing|ocr_processing|extracting_fields|academic|volunteer|priority)\b/,
    );

    await filters.getByRole("button", { name: /Học tập tốt/ }).click();
    await expect(page.getByRole("article")).toHaveCount(2);
    await expect(
      page.getByRole("article").filter({ hasText: "Giấy xác nhận hoạt động" }),
    ).toHaveCount(0);
    await expect(page.getByRole("article").filter({ hasText: "Tài liệu cần thay" })).toHaveCount(0);
  });

  test("deep link opens contextual Add Evidence with the requested criterion selected", async ({
    page,
  }) => {
    await installEvidenceApi(page);
    await openStudentPage(page, "/app/upload?criterion=academic&action=upload");

    const dialog = page.getByRole("dialog", { name: "Thêm minh chứng" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Học tập tốt" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(dialog.getByRole("button", { name: "Tình nguyện tốt" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("library upload requires a criterion and immediately shows the uploaded item", async ({
    page,
  }) => {
    let createdCriterion: string | undefined;
    await installEvidenceApi(page, {
      onCreate: (body) => {
        createdCriterion = body.criterion;
      },
    });
    await openStudentPage(page, "/app/upload");
    await page.getByRole("button", { name: "Thêm minh chứng" }).first().click();

    const dialog = page.getByRole("dialog", { name: "Thêm minh chứng" });
    const submit = dialog.getByRole("button", { name: "Thêm vào hồ sơ" });
    await expect(submit).toBeDisabled();
    await dialog.getByRole("button", { name: "Tình nguyện tốt" }).click();
    await expect(submit).toBeEnabled();
    await dialog.getByLabel("Tên minh chứng").fill("Giấy xác nhận chiến dịch tình nguyện");
    await dialog.locator("#evidence-upload").setInputFiles({
      name: "xac-nhan-tinh-nguyen.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF S3 fixture"),
    });
    await expect(dialog.getByText(/xac-nhan-tinh-nguyen\.pdf/).first()).toBeVisible();
    await submit.click();

    await expect(dialog).toBeHidden();
    await expect.poll(() => createdCriterion).toBe("volunteer");
    const newCard = page
      .getByRole("article")
      .filter({ hasText: "Giấy xác nhận chiến dịch tình nguyện" });
    await expect(newCard).toContainText("Tình nguyện tốt");
    await expect(newCard).toContainText("Đang đọc tài liệu");
    await expect(page.getByText("Đã thêm minh chứng. Hệ thống đang đọc tài liệu.")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      /pending_indexing|ocr_processing|extracting_fields/,
    );
  });

  test("rejects unsupported and oversized files before creating evidence", async ({ page }) => {
    let createCount = 0;
    await installEvidenceApi(page, {
      onCreate: () => {
        createCount += 1;
      },
    });
    await page.setViewportSize({ width: 1280, height: 720 });
    await openStudentPage(page, "/app/upload");
    await page.getByRole("button", { name: "Thêm minh chứng" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Thêm minh chứng" });
    await dialog.getByRole("button", { name: "Đạo đức tốt" }).click();
    await dialog.getByLabel("Tên minh chứng").fill("Tài liệu kiểm thử");
    const fileInput = dialog.locator("#evidence-upload");

    await fileInput.setInputFiles({
      name: "anh.gif",
      mimeType: "image/gif",
      buffer: Buffer.from("GIF89a"),
    });
    await expect(dialog.getByRole("alert")).toContainText("Định dạng chưa được hỗ trợ");
    await fileInput.evaluate((element) => {
      const oversized = new File(["fixture"], "qua-lon.pdf", { type: "application/pdf" });
      Object.defineProperty(oversized, "size", { value: 20 * 1024 * 1024 + 1 });
      const transfer = new DataTransfer();
      transfer.items.add(oversized);
      const input = element as HTMLInputElement;
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(dialog.getByRole("alert")).toContainText("vượt quá giới hạn 20 MB");
    await page.screenshot({ path: "/tmp/student-evidence-upload-validation-1280x720.png" });
    await dialog.getByRole("button", { name: "Thêm vào hồ sơ" }).click();
    await expect.poll(() => createCount).toBe(0);
  });

  test("distinguishes empty and no-results states", async ({ page }) => {
    await installEvidenceApi(page);
    await openStudentPage(page, "/app/upload");
    await expect(page.getByText("Bạn chưa thêm minh chứng nào.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Thêm minh chứng" }).first()).toBeVisible();

    await installEvidenceApi(page, {
      evidences: [evidence("ev-1", "Giấy khen học tập", "academic", "indexed")],
    });
    await page.reload();
    await expect(page.getByRole("article")).toHaveCount(1);
    await page.getByLabel("Tìm minh chứng theo tên hoặc tên tệp").fill("không có kết quả");
    await expect(page.getByText("Không tìm thấy minh chứng phù hợp")).toBeVisible();
    await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
    await expect(page.getByRole("article")).toHaveCount(1);
  });

  test("submitted application keeps evidence visible and hides mutations", async ({ page }) => {
    let retryCount = 0;
    await installEvidenceApi(page, {
      applicationStatus: "submitted",
      evidences: [
        evidence("ev-submitted", "Bảng điểm đã gửi", "academic", "failed", {
          jobId: "job-retry",
        }),
      ],
      onRetry: () => {
        retryCount += 1;
      },
    });
    await openStudentPage(page, "/app/upload");

    await expect(page.getByRole("article")).toContainText("Bảng điểm đã gửi");
    await expect(
      page.getByText("Hồ sơ đang được xét. Bạn vẫn có thể xem các tài liệu đã gửi."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Thêm minh chứng" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Sửa" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Thay thế" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Xóa" })).toHaveCount(0);

    await page.getByRole("article").getByRole("button", { name: "Xem minh chứng" }).first().click();
    const detailDialog = page.getByRole("dialog");
    await expect(detailDialog.getByRole("button", { name: "Thử xử lý lại" })).toHaveCount(0);
    expect(retryCount).toBe(0);
  });

  test("backend-decided evidence remains read-only inside an editable draft", async ({ page }) => {
    let retryCount = 0;
    await installEvidenceApi(page, {
      evidences: [
        evidence("ev-accepted", "Minh chứng đã xác nhận", "academic", "failed", {
          jobId: "job-retry",
          status: "accepted",
        }),
      ],
      onRetry: () => {
        retryCount += 1;
      },
    });
    await openStudentPage(page, "/app/upload");

    const decidedCard = page.getByRole("article").filter({ hasText: "Minh chứng đã xác nhận" });
    await expect(decidedCard).toContainText("Học tập tốt");
    await expect(decidedCard.getByRole("button", { name: "Xem minh chứng" })).toHaveCount(2);
    await expect(decidedCard.getByRole("button", { name: "Sửa" })).toHaveCount(0);
    await expect(decidedCard.getByRole("button", { name: "Thay thế" })).toHaveCount(0);
    await expect(decidedCard.getByRole("button", { name: "Xóa" })).toHaveCount(0);

    await decidedCard.getByRole("button", { name: "Xem minh chứng" }).first().click();
    const detailDialog = page.getByRole("dialog");
    await expect(detailDialog.getByRole("button", { name: "Thử xử lý lại" })).toHaveCount(0);
    expect(retryCount).toBe(0);
  });

  test("a direct evidence link opens the existing detail view and only retryable evidence offers retry", async ({
    page,
  }) => {
    let retryCount = 0;
    await installEvidenceApi(page, {
      evidences: [
        evidence("ev-retry", "Tài liệu cần thử lại", "integration", "failed", {
          jobId: "job-retry",
        }),
        evidence("ev-no-retry", "Tài liệu đã hết lượt thử", "integration", "failed", {
          jobId: "job-no-retry",
        }),
      ],
      onRetry: () => {
        retryCount += 1;
      },
    });
    await openStudentPage(page, "/app/upload?evidenceId=ev-retry&mode=confirm");

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Tài liệu cần thử lại" }).first(),
    ).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Thử xử lý lại" })).toBeVisible();
    await dialog.getByRole("button", { name: "Thử xử lý lại" }).click();
    await expect.poll(() => retryCount).toBe(1);

    await page.goto("/app/upload?evidenceId=ev-no-retry&mode=confirm", {
      waitUntil: "domcontentloaded",
    });
    const nonRetryableDialog = page.getByRole("dialog");
    await expect(
      nonRetryableDialog.getByRole("heading", { name: "Tài liệu đã hết lượt thử" }).first(),
    ).toBeVisible();
    await expect(nonRetryableDialog.getByRole("button", { name: "Thử xử lý lại" })).toHaveCount(0);
  });

  test("S4 detail keeps the document beside recognized fields and preserves correction/confirmation contracts", async ({
    page,
  }) => {
    let correctionBody: Record<string, unknown> | undefined;
    let confirmationBody: Record<string, unknown> | undefined;
    await installEvidenceApi(page, {
      evidences: [
        evidence("ev-confirm", "Giấy xác nhận hoạt động", "volunteer", "indexed", {
          card: editableCard(),
        }),
      ],
      onCorrection: (body) => {
        correctionBody = body;
      },
      onConfirmCard: (body) => {
        confirmationBody = body;
      },
    });
    await openStudentPage(page, "/app/upload?evidenceId=ev-confirm&mode=confirm");

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Tài liệu đã tải" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Thông tin nhận diện" })).toBeVisible();
    await expect(dialog.locator("iframe[title='Bản xem trước: ev-confirm.pdf']")).toBeVisible();
    await expect(dialog.getByText("Ngày hội tình nguyện mùa xuân")).toBeVisible();
    await expect(
      dialog.getByText("Giá trị nhận diện ban đầu: Ngày hội tình nguyện mùa xuân"),
    ).toHaveCount(0);
    await expect(
      dialog.getByText(/0\.98|98%|Độ tin cậy|AI|OCR|extraction|pending_indexing/i),
    ).toHaveCount(0);

    await dialog.getByRole("button", { name: "Chỉnh sửa" }).click();
    await dialog.getByLabel("Tên hoạt động").fill("Ngày hội tình nguyện mùa xuân 2026");
    await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(page.getByText("Đã lưu thông tin đã chỉnh.")).toBeVisible();
    await expect(
      dialog.getByText("Giá trị nhận diện ban đầu: Ngày hội tình nguyện mùa xuân"),
    ).toBeVisible();
    await expect(dialog.getByText("Ngày hội tình nguyện mùa xuân 2026")).toBeVisible();
    await expect
      .poll(() => correctionBody)
      .toEqual({
        fields: { event_name: "Ngày hội tình nguyện mùa xuân 2026" },
        expectedUpdatedAt: "2026-01-02T00:00:00.000Z",
      });

    await dialog.getByRole("button", { name: "Xác nhận thông tin" }).click();
    await expect(page.getByText("Đã xác nhận thông tin minh chứng.")).toBeVisible();
    await expect
      .poll(() => confirmationBody)
      .toEqual({
        expectedUpdatedAt: "2026-01-03T00:00:00.000Z",
      });
  });

  test("S4 hides correction and confirmation controls for submitted or decision-locked evidence", async ({
    page,
  }) => {
    await installEvidenceApi(page, {
      applicationStatus: "submitted",
      evidences: [
        evidence("ev-submitted-card", "Minh chứng đã gửi", "academic", "indexed", {
          card: editableCard(),
        }),
      ],
    });
    await openStudentPage(page, "/app/upload?evidenceId=ev-submitted-card&mode=confirm");
    const submittedDialog = page.getByRole("dialog");
    await expect(submittedDialog.getByText("Thông tin nhận diện").first()).toBeVisible();
    await expect(submittedDialog.getByRole("button", { name: "Chỉnh sửa" })).toHaveCount(0);
    await expect(submittedDialog.getByRole("button", { name: "Xác nhận thông tin" })).toHaveCount(
      0,
    );

    await installEvidenceApi(page, {
      evidences: [
        evidence("ev-locked-card", "Minh chứng đã được xác nhận", "academic", "indexed", {
          status: "accepted",
          card: editableCard(),
        }),
      ],
    });
    await page.goto("/app/upload?evidenceId=ev-locked-card&mode=confirm", {
      waitUntil: "domcontentloaded",
    });
    const lockedDialog = page.getByRole("dialog");
    await expect(
      lockedDialog.getByRole("heading", { name: "Minh chứng đã được xác nhận" }),
    ).toBeVisible();
    await expect(lockedDialog.getByRole("button", { name: "Chỉnh sửa" })).toHaveCount(0);
    await expect(lockedDialog.getByRole("button", { name: "Xác nhận thông tin" })).toHaveCount(0);
    await expect(lockedDialog.getByText(/chế độ chỉ xem/i)).toBeVisible();
  });

  test("S4 presents signed-url errors inline and supports unsupported document originals", async ({
    page,
  }) => {
    await installEvidenceApi(page, {
      evidences: [evidence("ev-preview-error", "Tài liệu mất liên kết xem", "ethics", "indexed")],
      failSignedUrl: true,
    });
    await openStudentPage(page, "/app/upload?evidenceId=ev-preview-error");
    const errorDialog = page.getByRole("dialog");
    await expect(errorDialog.getByRole("alert")).toContainText("Không thể tải bản xem trước");
    await expect(errorDialog.getByRole("button", { name: "Thử lại" })).toBeVisible();
    await expect(errorDialog.getByRole("link", { name: "Mở bản gốc" })).toHaveCount(0);

    await installEvidenceApi(page, {
      evidences: [
        evidence("ev-unsupported", "Tài liệu cần ứng dụng khác", "ethics", "indexed", {
          files: [
            {
              id: "file-unsupported",
              fileName: "tai-lieu.docx",
              mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            },
          ],
        }),
      ],
    });
    await page.goto("/app/upload?evidenceId=ev-unsupported", { waitUntil: "domcontentloaded" });
    const unsupportedDialog = page.getByRole("dialog");
    await expect(unsupportedDialog.getByText("Không thể hiển thị bản xem trước.")).toBeVisible();
    await expect(unsupportedDialog.getByRole("link", { name: "Mở bản gốc" })).toBeVisible();
  });

  test("S4 dialog remains usable across desktop widths and 125% effective viewport", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await installEvidenceApi(page, {
      evidences: [
        evidence(
          "ev-long-detail",
          "Giấy xác nhận thành tích hoạt động và nghiên cứu cấp Thành phố năm học 2025–2026",
          "integration",
          "indexed",
          {
            fileName: "giay-xac-nhan-thanh-tich-hoat-dong-nghien-cuu-2025-2026.pdf",
            card: editableCard(),
          },
        ),
      ],
    });
    await openStudentPage(page, "/app/upload?evidenceId=ev-long-detail&mode=confirm");
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Đóng" }).focus();
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);

    for (const viewport of [
      { width: 1280, height: 720 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1600, height: 900 },
      { width: 1920, height: 1080 },
      { width: 1024, height: 576 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(dialog.getByRole("heading", { name: "Tài liệu đã tải" })).toBeVisible();
      await page.screenshot({
        path: `/tmp/student-evidence-detail-${viewport.width}x${viewport.height}.png`,
      });
      await expect
        .poll(async () => (await dialog.boundingBox())?.x ?? -1)
        .toBeGreaterThanOrEqual(0);
      const bounds = await dialog.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        viewport.width,
      );
    }
  });

  test("library and upload dialog fit required desktop widths without horizontal overflow", async ({
    page,
  }) => {
    await installEvidenceApi(page, {
      evidences: [
        evidence(
          "ev-long",
          "Giấy xác nhận thành tích học tập và nghiên cứu khoa học cấp Thành phố năm học 2025–2026",
          "academic",
          "indexed",
          { fileName: "giay-xac-nhan-thanh-tich-hoc-tap-va-nghien-cuu-khoa-hoc-2025-2026.pdf" },
        ),
      ],
    });
    await openStudentPage(page, "/app/upload");

    for (const viewport of [
      { width: 1280, height: 720 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1600, height: 900 },
      { width: 1920, height: 1080 },
      { width: 1024, height: 576 }, // 1280×720 effective viewport at 125% zoom.
    ]) {
      await page.setViewportSize(viewport);
      await expect(page.getByRole("article")).toBeVisible();
      const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(
        pageWidth,
        `horizontal overflow at ${viewport.width}×${viewport.height}`,
      ).toBeLessThanOrEqual(viewport.width);
      await page.screenshot({
        path: `/tmp/student-evidence-${viewport.width}x${viewport.height}.png`,
        fullPage: true,
      });
    }

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByRole("button", { name: "Thêm minh chứng" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Thêm minh chứng" });
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(1280);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(720);
    await page.screenshot({ path: "/tmp/student-evidence-upload-1280x720.png", fullPage: true });
    await dialog.getByRole("button", { name: "Học tập tốt" }).click();
    await dialog.locator("#evidence-upload").setInputFiles({
      name: "giay-xac-nhan-thanh-tich-hoc-tap.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF selected state"),
    });
    await dialog
      .getByText(/giay-xac-nhan-thanh-tich-hoc-tap\.pdf/)
      .first()
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: "/tmp/student-evidence-upload-selected-1280x720.png" });
  });
});

async function installEvidenceApi(
  page: Page,
  options: {
    applicationStatus?: string;
    evidences?: EvidenceFixture[];
    onCreate?: (body: Record<string, unknown>) => void;
    onRetry?: () => void;
    onCorrection?: (body: Record<string, unknown>) => void;
    onConfirmCard?: (body: Record<string, unknown>) => void;
    failSignedUrl?: boolean;
  } = {},
) {
  const rows = [...(options.evidences ?? [])];
  const retriedJobs = new Set<string>();
  let nextId = 1;
  await page.route(`${apiBase}/api/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    if (path === "/api/me" || path === "/api/auth/me") return json(route, studentUser);
    if (path === "/api/auth/refresh") return json(route, { accessToken: "test-token" });
    if (path === "/api/auth/logout") return json(route, null);
    if (path === "/api/notifications") return json(route, []);
    if (path === "/api/applications/current") {
      const status = options.applicationStatus ?? "draft";
      return json(route, {
        state: status,
        application: {
          id: "app-1",
          studentId: "student-1",
          schoolYear: "2025-2026",
          applicationType: "individual",
          targetLevel: "city",
          status,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
          submittedAt: status === "draft" ? null : "2026-01-03T00:00:00.000Z",
        },
      });
    }
    if (path === "/api/applications/app-1/evidences" && request.method() === "GET") {
      return json(route, rows);
    }
    if (path === "/api/applications/app-1/evidences" && request.method() === "POST") {
      const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
      options.onCreate?.(body);
      const created = evidence(
        `ev-new-${nextId++}`,
        String(body.evidenceName ?? "Minh chứng mới"),
        String(body.criterion ?? "academic"),
        "not_started",
        { status: "draft", files: [] },
      );
      rows.unshift(created);
      return json(route, created);
    }
    const fileUploadMatch = path.match(/^\/api\/evidences\/([^/]+)\/files$/);
    if (fileUploadMatch && request.method() === "POST") {
      const row = rows.find((item) => item.id === fileUploadMatch[1]);
      if (row) {
        row.indexingStatus = "pending_indexing";
        row.jobId = "job-new-evidence";
        row.fileName = "xac-nhan-tinh-nguyen.pdf";
        row.files = [{ id: "file-new", fileName: row.fileName, mimeType: "application/pdf" }];
      }
      return json(route, { evidence: row, jobId: "job-new-evidence" });
    }
    if (path.match(/^\/api\/evidences\/[^/]+\/card$/)) {
      const id = path.split("/")[3];
      const row = rows.find((item) => item.id === id);
      return json(route, {
        card: row?.card ?? { uxStatus: { step: row?.indexingStatus ?? "queued" } },
        uxStatus: { step: row?.indexingStatus ?? "queued" },
      });
    }
    const evidenceCorrectionMatch = path.match(/^\/api\/evidences\/([^/]+)\/card\/corrections$/);
    if (evidenceCorrectionMatch && request.method() === "PATCH") {
      const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
      options.onCorrection?.(body);
      const row = rows.find((item) => item.id === evidenceCorrectionMatch[1]);
      const fields = (body.fields ?? {}) as Record<string, unknown>;
      if (row?.card) {
        const correctedFields = {
          ...(row.card.confirmedFields as Record<string, unknown>),
          ...fields,
        };
        row.card = {
          ...row.card,
          updatedAt: "2026-01-03T00:00:00.000Z",
          confirmationStatus: "correction_required",
          confirmedFields: correctedFields,
          fieldDetails: ((row.card.fieldDetails ?? []) as Array<Record<string, unknown>>).map(
            (field) =>
              Object.prototype.hasOwnProperty.call(fields, field.key)
                ? {
                    ...field,
                    correctedValue: fields[String(field.key)],
                    effectiveValue: fields[String(field.key)],
                  }
                : field,
          ),
        };
      }
      return json(route, { card: row?.card ?? {} });
    }
    const evidenceConfirmMatch = path.match(/^\/api\/evidences\/([^/]+)\/card\/confirm$/);
    if (evidenceConfirmMatch && request.method() === "POST") {
      const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
      options.onConfirmCard?.(body);
      const row = rows.find((item) => item.id === evidenceConfirmMatch[1]);
      if (row?.card) {
        row.card = {
          ...row.card,
          updatedAt: "2026-01-04T00:00:00.000Z",
          confirmationStatus: "confirmed",
          requiresHumanConfirmation: false,
          canConfirm: false,
          confirmedAt: "2026-01-04T00:00:00.000Z",
        };
      }
      return json(route, { card: row?.card ?? {} });
    }
    if (path.match(/^\/api\/evidences\/[^/]+\/audit$/)) return json(route, { items: [] });
    const retryJobMatch = path.match(/^\/api\/jobs\/([^/]+)\/retry$/);
    if (retryJobMatch && request.method() === "POST") {
      options.onRetry?.();
      retriedJobs.add(retryJobMatch[1]);
      return json(route, { id: retryJobMatch[1], status: "queued", retryable: false });
    }
    const getJobMatch = path.match(/^\/api\/jobs\/([^/]+)$/);
    if (getJobMatch && request.method() === "GET") {
      return json(route, {
        id: getJobMatch[1],
        status: retriedJobs.has(getJobMatch[1]) ? "queued" : "failed",
        retryable: getJobMatch[1] === "job-retry",
      });
    }
    if (path.match(/^\/api\/evidences\/[^/]+$/) && request.method() === "GET") {
      const id = path.split("/").pop();
      return json(route, rows.find((item) => item.id === id) ?? rows[0] ?? null);
    }
    if (path.match(/^\/api\/files\/[^/]+\/signed-url$/)) {
      if (options.failSignedUrl) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            data: null,
            error: { code: "UNAVAILABLE", message: "Signed URL service unavailable" },
          }),
        });
        return;
      }
      return json(route, { url: "data:application/pdf;base64,JVBERi0xLjQ=" });
    }
    if (path === "/api/evidence-matching/library") return json(route, { items: [], total: 0 });
    if (path.includes("evidence-event-suggestions")) return json(route, { suggestions: [] });
    if (path.includes("/api/events/") && path.endsWith("/check-participant")) {
      return json(route, { canImport: false, reason: "Chưa xác nhận" });
    }
    if (path.includes("/api/events/") && path.endsWith("/import-as-evidence")) {
      return json(route, { evidence: rows[0] ?? null });
    }
    if (path === "/api/events")
      return json(route, {
        items: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
      });
    return json(route, null);
  });

  await page.addInitScript(
    (auth) => {
      window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 }));
    },
    { user: studentUser, accessToken: "test-token", refreshToken: "test-refresh" },
  );
}

async function openStudentPage(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText("Hệ thống Sinh viên 5 tốt");
}

type EvidenceFixture = {
  id: string;
  evidenceName: string;
  criterion: string;
  status: string;
  indexingStatus: string;
  sourceType: string;
  applicationId: string;
  createdAt: string;
  updatedAt: string;
  fileName?: string;
  jobId?: string;
  files: Array<Record<string, unknown>>;
  card?: Record<string, unknown>;
  studentStatus?: Record<string, unknown>;
};

function evidence(
  id: string,
  evidenceName: string,
  criterion: string,
  indexingStatus: string,
  extra: Partial<EvidenceFixture> = {},
): EvidenceFixture {
  return {
    id,
    evidenceName,
    criterion,
    status: "under_review",
    indexingStatus,
    sourceType: "manual_upload",
    applicationId: "app-1",
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    fileName: `${id}.pdf`,
    files: [{ id: `file-${id}`, fileName: `${id}.pdf`, mimeType: "application/pdf" }],
    ...extra,
  };
}

function editableCard(): Record<string, unknown> {
  return {
    id: "card-1",
    evidenceId: "ev-confirm",
    updatedAt: "2026-01-02T00:00:00.000Z",
    confirmationStatus: "pending",
    requiresHumanConfirmation: true,
    canEdit: true,
    canConfirm: true,
    fieldDetails: [
      {
        key: "event_name",
        label: "Tên hoạt động",
        extractedValue: "Ngày hội tình nguyện mùa xuân",
        correctedValue: null,
        effectiveValue: "Ngày hội tình nguyện mùa xuân",
        editable: true,
        confidence: 0.98,
        warningCodes: ["provider_debug_only"],
      },
      {
        key: "student_code",
        label: "MSSV",
        extractedValue: "102220001",
        correctedValue: null,
        effectiveValue: "102220001",
        editable: false,
        confidence: 0.99,
      },
    ],
    evidencePrecheck: {
      status: "ready_for_confirmation",
      completeness: { score: 0.98, missingImportantFields: [] },
      quality: { level: "clear" },
      identityCheck: { status: "matched" },
    },
  };
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
  workspace: {
    id: "workspace-1",
    code: "DDK",
    name: "Trường Đại học Bách khoa - Đại học Đà Nẵng",
    shortName: "DDK",
  },
};

async function json(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data, error: null, meta: { requestId: "s3-test" } }),
  });
}
