import { expect, test, type Page, type Route } from "@playwright/test";

type RegistryRole =
  | "data_uploader"
  | "admin"
  | "student"
  | "class_representative"
  | "officer"
  | "manager"
  | "committee"
  | "city_officer"
  | "city_manager"
  | "city_committee";

const corsHeaders = {
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "access-control-allow-origin": "*",
};

const decisionDraft = {
  id: "award-school-1",
  issuerWorkspace: {
    id: "school-1",
    code: "DDK",
    name: "Trường Đại học Bách khoa",
    shortName: "DUT",
    type: "SCHOOL",
  },
  awardLevel: "SCHOOL",
  schoolYear: "2025-2026",
  decisionNumber: "05/QĐ-ĐTN",
  decisionDate: "2026-05-01T00:00:00.000Z",
  status: "DRAFT",
  decisionFile: null,
  rosterFile: {
    id: "file-roster-1",
    originalName: "roster.csv",
    mimeType: "text/csv",
    fileSize: 1200,
    createdAt: "2026-05-01T10:00:00.000Z",
  },
  sourceImportId: null,
  recipientCount: 0,
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
};

const preview = {
  status: "preview_ready",
  columns: ["MSSV", "Họ và tên", "Lớp", "Trường"],
  suggestedMapping: {
    studentCode: "MSSV",
    fullName: "Họ và tên",
    className: "Lớp",
    institution: "Trường",
  },
  mapping: { studentCode: "MSSV", fullName: "Họ và tên", className: "Lớp", institution: "Trường" },
  validationSummary: {
    total: 3,
    valid: 1,
    invalid: 1,
    duplicate: 0,
    conflict: 1,
    matched: 1,
    unmatched: 0,
  },
  items: [
    {
      sourceRow: 2,
      studentCode: "0010220001",
      fullName: "Nguyễn An",
      className: "23CNTT1",
      institutionText: "DUT",
      institutionWorkspaceId: "school-1",
      matchStatus: "MATCHED",
      status: "VALID",
      errors: [],
    },
    {
      sourceRow: 3,
      studentCode: null,
      fullName: "Trần Bình",
      className: null,
      institutionText: null,
      institutionWorkspaceId: null,
      matchStatus: "CONFLICT",
      status: "INVALID",
      errors: ["STUDENT_CODE_REQUIRED", "INSTITUTION_CONTEXT_UNRESOLVED"],
    },
    {
      sourceRow: 4,
      studentCode: "0010220003",
      fullName: "Lê Chi",
      className: null,
      institutionText: "Không rõ",
      institutionWorkspaceId: null,
      matchStatus: "CONFLICT",
      status: "CONFLICT",
      errors: ["INSTITUTION_CONTEXT_UNRESOLVED"],
    },
  ],
  pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
};

const udnDecision = {
  ...decisionDraft,
  issuerWorkspace: {
    id: "udn-1",
    code: "UDN",
    name: "Đại học Đà Nẵng",
    shortName: "UDN",
    type: "UNIVERSITY_SYSTEM",
  },
  awardLevel: "UNIVERSITY_SYSTEM",
};

const validPreview = {
  ...preview,
  validationSummary: {
    total: 1,
    valid: 1,
    invalid: 0,
    duplicate: 0,
    conflict: 0,
    matched: 1,
    unmatched: 0,
  },
  items: [preview.items[0]],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

test.describe("Award Decision Registry", () => {
  test("Data Uploader home explains the job and exposes one primary next action", async ({
    page,
  }) => {
    await installMocks(page, "data_uploader");
    await page.goto("/app/data-uploader");

    await expect(page.getByRole("heading", { name: "Tổng quan dữ liệu công nhận" })).toBeVisible();
    await expect(
      page.getByText(
        "Đưa quyết định và danh sách sinh viên đã được đơn vị công nhận vào hệ thống để phục vụ kiểm tra điều kiện hồ sơ cấp Thành phố.",
      ),
    ).toBeVisible();
    await expect(page.getByText("Đơn vị quản lý dữ liệu", { exact: true })).toBeVisible();
    await expect(page.getByText("Không gian làm việc", { exact: true })).toHaveCount(0);
    await expect(page.getByText("05/QĐ-ĐTN", { exact: true })).toBeVisible();
    const currentWorkTop = await page
      .getByRole("heading", { name: "Những quyết định cần tiếp tục" })
      .evaluate((element) => element.getBoundingClientRect().top);
    const processTop = await page
      .getByRole("heading", { name: "Lộ trình xử lý" })
      .evaluate((element) => element.getBoundingClientRect().top);
    expect(currentWorkTop).toBeLessThan(processTop);
    await expect(
      page.getByRole("link", { name: "Tạo quyết định công nhận", exact: true }),
    ).toBeVisible();
  });

  test("School uploader opens Registry and sees the backend list response", async ({ page }) => {
    const requests: string[] = [];
    await installMocks(page, "data_uploader", requests);
    await page.goto("/app/award-registry");

    await expect(page).toHaveURL(/\/app\/award-registry$/);
    await expect(page.getByRole("heading", { name: "Quyết định công nhận" })).toBeVisible();
    await expect(page.getByText("05/QĐ-ĐTN")).toBeVisible();
    await expect(page.getByText("2025–2026")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Ngày quyết định" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Ghi nhận lúc" })).toBeVisible();
    await expect(page.getByRole("table").getByText("Bản nháp")).toBeVisible();
    expect(
      requests.some(
        (url) => url.includes("GET /api/award-decisions?") && url.includes("archive=exclude"),
      ),
    ).toBeTruthy();
  });

  test("UDN uploader sees issuer and year filters without City review controls", async ({
    page,
  }) => {
    await installMocks(page, "data_uploader", [], "UNIVERSITY_SYSTEM", {
      decision: async (route) => await json(route, udnDecision),
    });
    await page.goto("/app/award-registry");

    await expect(page.getByText("Đại học Đà Nẵng").first()).toBeVisible();
    await expect(page.getByLabel("Năm học", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /phân công|resolution|hồ sơ và kết quả/i }),
    ).toHaveCount(0);
  });

  for (const role of [
    "student",
    "class_representative",
    "officer",
    "manager",
    "committee",
    "city_officer",
    "city_manager",
    "city_committee",
  ] as const) {
    test(`${role} cannot see or open Award Registry management`, async ({ page }) => {
      await installMocks(page, role);
      await page.goto("/app/award-registry");

      await expect
        .poll(() => new URL(page.url()).pathname)
        .toBe(
          role === "student"
            ? "/app"
            : role === "class_representative"
              ? "/app/collective"
              : role === "officer" || role === "city_officer"
                ? "/app/queue"
                : role === "manager" || role === "committee" || role === "city_manager"
                  ? "/app/analytics"
                  : "/app/resolution",
        );
      await expect(page.locator("aside nav a[href='/app/award-registry']")).toHaveCount(0);
    });
  }

  test("admin can use the backend-supported global registry route", async ({ page }) => {
    await installMocks(page, "admin");
    await page.goto("/app/award-registry");
    await expect(page.getByRole("heading", { name: "Quyết định công nhận" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tạo quyết định công nhận" })).toBeVisible();
  });

  test("filters are sent to the server and retain pagination metadata", async ({ page }) => {
    const requests: string[] = [];
    await installMocks(page, "data_uploader", requests);
    await page.goto("/app/award-registry");
    await page.getByLabel("Năm học", { exact: true }).fill("2024-2025");
    await page.getByLabel("Trạng thái").selectOption("CONFIRMED");
    await page.getByRole("button", { name: "Lọc" }).click();

    await expect
      .poll(() =>
        requests.some(
          (request) =>
            request.includes("schoolYear=2024-2025") && request.includes("status=CONFIRMED"),
        ),
      )
      .toBeTruthy();
  });

  test("archived decisions can be retrieved with the server status filter", async ({ page }) => {
    const requests: string[] = [];
    await installMocks(page, "data_uploader", requests, "SCHOOL", {
      list: async (route) =>
        await json(
          route,
          { items: [{ ...decisionDraft, status: "ARCHIVED" }] },
          { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
        ),
    });
    await page.goto("/app/award-registry");
    await page.getByLabel("Trạng thái").selectOption("ARCHIVED");
    await page.getByRole("button", { name: "Lọc" }).click();
    await expect
      .poll(() =>
        requests.some(
          (request) => request.includes("status=ARCHIVED") && request.includes("archive=only"),
        ),
      )
      .toBeTruthy();
    await expect(page.getByRole("table").getByText("Đã lưu trữ")).toBeVisible();
  });

  test("archive visibility defaults to active and supports archived and all server filters", async ({
    page,
  }) => {
    const requests: string[] = [];
    await installMocks(page, "data_uploader", requests);
    await page.goto("/app/award-registry");
    await expect
      .poll(() => requests.some((request) => request.includes("archive=exclude")))
      .toBeTruthy();

    await page.getByLabel("Lưu trữ").selectOption("only");
    await page.getByRole("button", { name: "Lọc" }).click();
    await expect
      .poll(() => requests.some((request) => request.includes("archive=only")))
      .toBeTruthy();

    await page.getByLabel("Lưu trữ").selectOption("all");
    await page.getByRole("button", { name: "Lọc" }).click();
    await expect
      .poll(() => requests.some((request) => request.includes("archive=all")))
      .toBeTruthy();
  });

  test("shows the backend authorization message for a workspace denial", async ({ page }) => {
    await installMocks(page, "data_uploader", [], "SCHOOL", {
      list: async (route) =>
        await route.fulfill({
          status: 403,
          headers: { ...corsHeaders, "content-type": "application/json" },
          body: JSON.stringify({
            success: false,
            data: null,
            error: {
              code: "FORBIDDEN",
              message: "Không có quyền truy cập quyết định của workspace này.",
            },
            meta: { requestId: "award-denied" },
          }),
        }),
    });
    await page.goto("/app/award-registry");
    await expect(
      page.getByText("Không có quyền truy cập quyết định của workspace này."),
    ).toBeVisible();
  });

  test("creates a draft, uploads CSV, processes and confirms from server state", async ({
    page,
  }) => {
    const requests: string[] = [];
    let currentDecision = {
      ...decisionDraft,
      rosterFile: null as typeof decisionDraft.rosterFile | null,
    };
    let confirmed = false;
    let processStarted = false;
    await installMocks(page, "data_uploader", requests, "SCHOOL", {
      create: async (route) => {
        currentDecision = { ...decisionDraft, rosterFile: null };
        await json(route, currentDecision, {}, 201);
      },
      upload: async (route) => {
        currentDecision = { ...currentDecision, rosterFile: decisionDraft.rosterFile };
        await json(route, currentDecision, {}, 201);
      },
      processing: async (route) =>
        await json(route, { status: processStarted ? "preview_ready" : "not_started" }),
      process: async (route) => {
        processStarted = true;
        await json(route, { status: "processing" }, {}, 202);
      },
      preview: async (route) =>
        await json(route, validPreview, { pagination: validPreview.pagination }),
      confirm: async (route) => {
        confirmed = true;
        currentDecision = { ...currentDecision, status: "CONFIRMED", recipientCount: 3 };
        await json(route, { recipientCount: 3 });
      },
      detail: async (route) => await json(route, currentDecision),
      recipients: async (route) =>
        await json(
          route,
          {
            items: [
              {
                id: "r-1",
                studentCode: "0010220001",
                fullName: "Nguyễn An",
                institutionWorkspaceId: "school-1",
                institutionWorkspace: {
                  id: "school-1",
                  code: "DDK",
                  name: "Trường Đại học Bách khoa",
                  shortName: "DUT",
                },
                className: "23CNTT1",
                matchStatus: "MATCHED",
                sourceRow: 2,
                createdAt: "2026-05-01T10:00:00.000Z",
              },
            ],
          },
          { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
        ),
    });
    await page.goto("/app/award-registry");
    await page.getByRole("button", { name: "Tạo quyết định công nhận" }).click();
    await page.getByLabel("Năm học", { exact: true }).last().fill("2025-2026");
    await page.getByRole("button", { name: "Tạo bản nháp" }).click();
    await expect(page).toHaveURL(/\/app\/award-registry\/award-school-1$/);
    await expect(
      page.getByRole("heading", { name: "Quyết định công nhận số 05/QĐ-ĐTN" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Tiến độ hoàn thiện quyết định" }),
    ).toBeVisible();
    await expect(page.getByText("Workflow", { exact: true })).toHaveCount(0);
    await expect(
      page.getByText("Tiến độ này được suy ra từ dữ liệu máy chủ.", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText("Văn bản quyết định", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText("Danh sách sinh viên được công nhận", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("Không có phần trăm xử lý giả", { exact: true })).toHaveCount(0);
    await expect(
      page.getByText(/máy chủ|workspace|Workflow|suy ra từ dữ liệu máy chủ/i),
    ).toHaveCount(0);

    await page.getByLabel("Tệp danh sách").setInputFiles({
      name: "roster.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("MSSV,Họ và tên\n0010220001,Nguyễn An"),
    });
    await page.getByRole("button", { name: "Đọc danh sách" }).click();
    await expect(page.getByText("Sẵn sàng kiểm tra")).toBeVisible();
    await expect(page.getByText("0010220001", { exact: true })).toBeVisible();
    await expect(
      page.getByText(/máy chủ|workspace|Workflow|suy ra từ dữ liệu máy chủ/i),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Xác nhận dữ liệu công nhận" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Xác nhận và lưu" }).click();
    await expect(page.getByText("Đã xác nhận").first()).toBeVisible();
    await expect(page.getByText("Nguyễn An")).toBeVisible();
    expect(confirmed).toBeTruthy();
    expect(
      requests.some((request) =>
        request.startsWith("POST /api/award-decisions/award-school-1/files/roster"),
      ),
    ).toBeTruthy();
    expect(
      requests.some(
        (request) => request === "POST /api/award-decisions/award-school-1/process-roster",
      ),
    ).toBeTruthy();
    expect(
      requests.some((request) => request === "POST /api/award-decisions/award-school-1/confirm"),
    ).toBeTruthy();
  });

  test("rejects legacy XLS before any upload request", async ({ page }) => {
    const requests: string[] = [];
    await installMocks(page, "data_uploader", requests);
    await page.goto("/app/award-registry/award-school-1");
    await page.getByLabel("Tệp danh sách").setInputFiles({
      name: "roster.xls",
      mimeType: "application/vnd.ms-excel",
      buffer: Buffer.from("legacy"),
    });
    await expect(page.getByText(/\.xls.*không.*hỗ trợ/i)).toBeVisible();
    expect(requests.some((request) => request.includes("/files/roster"))).toBeFalsy();
  });

  test("accepts XLSX and sends it to the roster upload endpoint", async ({ page }) => {
    const requests: string[] = [];
    await installMocks(page, "data_uploader", requests);
    await page.goto("/app/award-registry/award-school-1");
    await page.getByLabel("Tệp danh sách").setInputFiles({
      name: "roster.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("xlsx"),
    });
    await expect
      .poll(() =>
        requests.some((request) =>
          request.startsWith("POST /api/award-decisions/award-school-1/files/roster"),
        ),
      )
      .toBeTruthy();
  });

  test("renders invalid and unresolved rows, saves server mapping, and blocks confirmation", async ({
    page,
  }) => {
    const requests: string[] = [];
    let savedMapping: unknown;
    await installMocks(page, "data_uploader", requests, "SCHOOL", {
      processing: async (route) => await json(route, { status: "preview_ready" }),
      updateMapping: async (route) => {
        savedMapping = route.request().postDataJSON();
        await json(route, {
          mapping: preview.mapping,
          validationSummary: preview.validationSummary,
          items: preview.items,
          pagination: preview.pagination,
        });
      },
    });
    await page.goto("/app/award-registry/award-school-1");
    await expect(
      page.getByRole("heading", { name: "Kiểm tra dữ liệu", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Số sinh viên", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Lưu thông tin" })).toBeDisabled();
    await page.getByLabel("Số quyết định").fill("06/QĐ-ĐTN");
    await expect(page.getByRole("button", { name: "Lưu thông tin" })).toBeEnabled();
    await expect(page.getByText("Tóm tắt kiểm tra", { exact: true })).toBeVisible();
    await expect(page.getByText("Cần kiểm tra", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("table").getByText("Thiếu MSSV", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("table").getByText("Cần kiểm tra thủ công", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Chưa resolve được đơn vị")).toBeVisible();
    await expect(page.getByRole("button", { name: "Xác nhận dữ liệu công nhận" })).toBeDisabled();
    await page.getByLabel("Cột trường (không bắt buộc với School)").selectOption("Trường");
    await page.getByRole("button", { name: "Cập nhật mapping" }).click();
    await expect.poll(() => savedMapping).toEqual(preview.mapping);
    expect(
      requests.some(
        (request) => request === "PATCH /api/award-decisions/award-school-1/roster-mapping",
      ),
    ).toBeTruthy();
  });

  test("reviews OCR rows, saves a server correction, filters corrected rows, and reverts it", async ({
    page,
  }) => {
    const requests: string[] = [];
    let currentPreview = {
      ...validPreview,
      items: [
        {
          ...validPreview.items[0],
          fullName: "Nguyễn An OCR",
          original: {
            studentCode: "0010220001",
            fullName: "Nguyễn An OCR",
            className: "23CNTT1",
            institutionText: "DUT",
          },
          isCorrected: false,
        },
      ],
    };
    await installMocks(page, "data_uploader", requests, "SCHOOL", {
      processing: async (route) => await json(route, { status: "preview_ready" }),
      preview: async (route) =>
        await json(route, currentPreview, { pagination: currentPreview.pagination }),
      updateRow: async (route) => {
        const body = route.request().postDataJSON() as { studentCode?: string; fullName?: string };
        requests.push(`BODY ${JSON.stringify(body)}`);
        currentPreview = {
          ...currentPreview,
          items: [
            {
              ...currentPreview.items[0],
              studentCode: body.studentCode ?? currentPreview.items[0].studentCode,
              fullName: body.fullName ?? currentPreview.items[0].fullName,
              isCorrected: true,
            },
          ],
        };
        await json(route, {
          mapping: currentPreview.mapping,
          validationSummary: currentPreview.validationSummary,
          items: currentPreview.items,
          pagination: currentPreview.pagination,
        });
      },
      revertRowCorrection: async (route) => {
        currentPreview = {
          ...currentPreview,
          items: [
            {
              ...currentPreview.items[0],
              studentCode: currentPreview.items[0].original!.studentCode,
              fullName: currentPreview.items[0].original!.fullName,
              isCorrected: false,
            },
          ],
        };
        await json(route, {
          mapping: currentPreview.mapping,
          validationSummary: currentPreview.validationSummary,
          items: currentPreview.items,
          pagination: currentPreview.pagination,
        });
      },
    });

    await page.goto("/app/award-registry/award-school-1");
    const previewRow = page.getByRole("row").filter({ hasText: "23CNTT1" });
    await expect(previewRow).toContainText("Nguyễn An OCR");
    await page.getByRole("button", { name: "Sửa dòng 2" }).click();
    await page.getByLabel("MSSV dòng 2").fill("0010220009");
    await page.getByLabel("Họ tên dòng 2").fill("Nguyễn An đã sửa");
    await page.getByRole("button", { name: "Lưu chỉnh sửa" }).click();

    await expect(previewRow).toContainText("Nguyễn An đã sửa");
    await expect(previewRow).toContainText("Đã chỉnh thủ công");
    expect(requests).toContain('BODY {"studentCode":"0010220009","fullName":"Nguyễn An đã sửa"}');

    await page.getByLabel("Lọc dòng cần xử lý").selectOption("corrected");
    await expect
      .poll(() => requests.some((request) => request.includes("filter=corrected")))
      .toBeTruthy();
    await page.getByRole("button", { name: "Hoàn tác sửa dòng 2" }).click();
    await expect(previewRow).toContainText("Nguyễn An OCR");
    await expect(previewRow).not.toContainText("Đã chỉnh thủ công");
    expect(
      requests.some(
        (request) =>
          request === "DELETE /api/award-decisions/award-school-1/roster-preview/2/correction",
      ),
    ).toBeTruthy();
  });

  test("confirmed decisions keep the roster preview read-only", async ({ page }) => {
    const requests: string[] = [];
    await installMocks(page, "data_uploader", requests, "SCHOOL", {
      decision: async (route) => await json(route, { ...decisionDraft, status: "CONFIRMED" }),
      processing: async (route) => await json(route, { status: "preview_ready" }),
      recipients: async (route) =>
        await json(route, {
          items: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        }),
    });
    await page.goto("/app/award-registry/award-school-1");

    await expect(page.getByText("Đã xác nhận").first()).toBeVisible();
    await expect(page.getByTestId("award-workspace-main")).toContainText("Người nhận đã lưu");
    await expect(page.getByRole("button", { name: /Sửa dòng/ })).toHaveCount(0);
    await expect(page.getByLabel("Lọc dòng cần xử lý")).toHaveCount(0);
    expect(
      requests.some(
        (request) =>
          request.startsWith("PATCH /api/award-decisions/") && request.includes("roster-preview"),
      ),
    ).toBeFalsy();
  });

  test("shows PDF processing and parser failure details with retry", async ({ page }) => {
    const requests: string[] = [];
    let processingReads = 0;
    await installMocks(page, "data_uploader", requests, "SCHOOL", {
      decision: async (route) =>
        await json(route, {
          ...decisionDraft,
          rosterFile: {
            ...decisionDraft.rosterFile!,
            originalName: "roster.pdf",
            mimeType: "application/pdf",
          },
        }),
      processing: async (route) => {
        processingReads += 1;
        return processingReads === 1
          ? json(route, { status: "processing" })
          : json(route, { status: "failed", errorCode: "ROSTER_PARSE_FAILED", retryable: true });
      },
      process: async (route) => {
        await json(route, { status: "processing" }, {}, 202);
      },
    });
    await page.goto("/app/award-registry/award-school-1");
    await expect(page.getByText("Đang đọc danh sách", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Làm mới trạng thái" }).click();
    await expect(page.getByText(/ROSTER_PARSE_FAILED|không đọc được danh sách/i)).toBeVisible();
    await page.getByRole("button", { name: /thử lại/i }).click();
    await expect
      .poll(() =>
        requests.some(
          (request) => request === "POST /api/award-decisions/award-school-1/process-roster",
        ),
      )
      .toBeTruthy();
  });

  test("shows the server preview after a PDF roster finishes OCR processing", async ({ page }) => {
    let processingReads = 0;
    await installMocks(page, "data_uploader", [], "SCHOOL", {
      decision: async (route) =>
        await json(route, {
          ...decisionDraft,
          rosterFile: {
            ...decisionDraft.rosterFile!,
            originalName: "roster.pdf",
            mimeType: "application/pdf",
          },
        }),
      processing: async (route) => {
        processingReads += 1;
        return json(
          route,
          processingReads === 1 ? { status: "not_started" } : { status: "preview_ready" },
        );
      },
      process: async (route) => await json(route, { status: "processing" }, {}, 202),
      preview: async (route) =>
        await json(route, validPreview, { pagination: validPreview.pagination }),
    });
    await page.goto("/app/award-registry/award-school-1");
    await page.getByRole("button", { name: "Đọc danh sách" }).click();
    await expect(page.getByText("Sẵn sàng kiểm tra")).toBeVisible();
    await expect(page.getByText("Kiểm tra dữ liệu", { exact: true }).first()).toBeVisible();
  });

  test("keeps the Award workspace desktop layout contained across QA widths and zooms", async ({
    page,
  }) => {
    await installMocks(page, "data_uploader", [], "SCHOOL", {
      processing: async (route) => await json(route, { status: "preview_ready" }),
    });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/app/award-registry/award-school-1");
    await expect(
      page.getByRole("heading", { name: "Kiểm tra dữ liệu", exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId("award-workspace-main")).toContainText("Kiểm tra dữ liệu");
    await expect(page.getByTestId("award-workspace-rail")).toContainText("Thông tin quyết định");

    for (const viewport of [
      { width: 1280, height: 720 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1600, height: 900 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport);
      for (const zoom of [0.9, 1, 1.1, 1.25]) {
        await page.evaluate((scale) => {
          document.documentElement.style.zoom = String(scale);
        }, zoom);
        const layout = await page.evaluate(() => {
          const table = document.querySelector("table");
          const tableContainer = table?.parentElement;
          return {
            documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
            tableOverflow: Boolean(
              table && tableContainer && table.scrollWidth > tableContainer.clientWidth,
            ),
          };
        });
        expect(
          layout.documentOverflow,
          `${viewport.width}x${viewport.height} at ${zoom * 100}%`,
        ).toBe(false);
        expect(layout.tableOverflow, `${viewport.width}x${viewport.height} at ${zoom * 100}%`).toBe(
          true,
        );
      }
    }
    await page.evaluate(() => {
      document.documentElement.style.zoom = "1";
    });
  });

  test("confirmed UDN recipient rows show exact server institution resolution", async ({
    page,
  }) => {
    await installMocks(page, "data_uploader", [], "UNIVERSITY_SYSTEM", {
      decision: async (route) =>
        await json(route, {
          ...decisionDraft,
          issuerWorkspace: {
            id: "udn-1",
            code: "UDN",
            name: "Đại học Đà Nẵng",
            shortName: "UDN",
            type: "UNIVERSITY_SYSTEM",
          },
          awardLevel: "UNIVERSITY_SYSTEM",
          status: "CONFIRMED",
        }),
      recipients: async (route) =>
        await json(
          route,
          {
            items: [
              {
                id: "r-udn-1",
                studentCode: "0010220001",
                fullName: "Nguyễn An",
                institutionWorkspaceId: "school-1",
                institutionWorkspace: {
                  id: "school-1",
                  code: "DDK",
                  name: "Trường Đại học Bách khoa",
                  shortName: "DUT",
                },
                className: "23CNTT1",
                matchStatus: "UNMATCHED",
                sourceRow: 2,
                createdAt: "2026-05-01T10:00:00.000Z",
              },
            ],
          },
          { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
        ),
    });
    await page.goto("/app/award-registry/award-school-1");
    await expect(page.getByText("Đại học Đà Nẵng", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText("Đại học Đà Nẵng · Cấp Đại học Đà Nẵng · Năm học 2025–2026", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText("Trường Đại học Bách khoa (DUT)", { exact: true })).toBeVisible();
    await expect(page.getByText("Chưa tìm thấy sinh viên phù hợp")).toBeVisible();
  });

  test("archives a draft and renders the server-refetched archived state", async ({ page }) => {
    const requests: string[] = [];
    let currentDecision = { ...decisionDraft };
    await installMocks(page, "data_uploader", requests, "SCHOOL", {
      decision: async (route) => await json(route, currentDecision),
      archive: async (route) => {
        currentDecision = { ...currentDecision, status: "ARCHIVED" };
        await json(route, currentDecision);
      },
    });
    await page.goto("/app/award-registry/award-school-1");
    await expect(page.getByRole("button", { name: "Lưu trữ", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Lưu trữ", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toContainText(
      "Quyết định lưu trữ sẽ không còn được dùng để xác định điều kiện nộp hồ sơ cấp Thành phố. Dữ liệu quyết định và danh sách sinh viên vẫn được giữ lại.",
    );
    await page.getByRole("button", { name: "Xác nhận lưu trữ" }).click();
    await expect(page.getByText("Đã lưu trữ").first()).toBeVisible();
    await expect(page.getByText(/máy chủ/i)).toHaveCount(0);
    expect(
      requests.some((request) => request === "POST /api/award-decisions/award-school-1/archive"),
    ).toBeTruthy();
    await expect(page.getByRole("button", { name: "Khôi phục" })).toBeVisible();
  });

  test("confirmed archive emphasizes eligibility impact and unarchive restores CONFIRMED from server", async ({
    page,
  }) => {
    const requests: string[] = [];
    let currentDecision = { ...decisionDraft, status: "CONFIRMED", recipientCount: 1 };
    await installMocks(page, "data_uploader", requests, "SCHOOL", {
      decision: async (route) => await json(route, currentDecision),
      archive: async (route) => {
        currentDecision = { ...currentDecision, status: "ARCHIVED" };
        await json(route, currentDecision);
      },
      unarchive: async (route) => {
        currentDecision = { ...currentDecision, status: "CONFIRMED" };
        await json(route, currentDecision);
      },
    });
    await page.goto("/app/award-registry/award-school-1");
    await page.getByRole("button", { name: "Lưu trữ", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toContainText(
      "không còn được dùng để xác định điều kiện",
    );
    await page.getByRole("button", { name: "Xác nhận lưu trữ" }).click();
    await expect(page.getByRole("button", { name: "Khôi phục" })).toBeVisible();
    await page.getByRole("button", { name: "Khôi phục", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toContainText(
      "Nếu quyết định đã được xác nhận, hiệu lực eligibility sẽ được khôi phục.",
    );
    await page.getByRole("button", { name: "Khôi phục quyết định" }).click();
    await expect(page.getByText("Đã xác nhận").first()).toBeVisible();
    expect(
      requests.some((request) => request === "POST /api/award-decisions/award-school-1/unarchive"),
    ).toBeTruthy();
  });

  test("unarchives a former draft as DRAFT and surfaces an archive conflict", async ({ page }) => {
    let currentDecision = { ...decisionDraft, status: "ARCHIVED" };
    await installMocks(page, "data_uploader", [], "SCHOOL", {
      decision: async (route) => await json(route, currentDecision),
      processing: async (route) => await json(route, { status: "not_started" }),
      unarchive: async (route) => {
        currentDecision = { ...currentDecision, status: "DRAFT" };
        await json(route, currentDecision);
      },
    });
    await page.goto("/app/award-registry/award-school-1");
    await page.getByRole("button", { name: "Khôi phục" }).click();
    await page.getByRole("button", { name: "Khôi phục quyết định" }).click();
    await expect(page.getByRole("button", { name: "Lưu trữ", exact: true })).toBeVisible();
    await expect(page.getByLabel("Năm học quyết định")).toBeEnabled();

    await page.route(
      "http://localhost:8080/api/award-decisions/award-school-1/archive",
      async (route) => {
        await route.fulfill({
          status: 409,
          headers: { ...corsHeaders, "content-type": "application/json" },
          body: JSON.stringify({
            success: false,
            data: null,
            error: { code: "CONFLICT", message: "Award decision is already archived" },
            meta: { requestId: "award-conflict" },
          }),
        });
      },
    );
    await page.getByRole("button", { name: "Lưu trữ", exact: true }).click();
    await page.getByRole("button", { name: "Xác nhận lưu trữ" }).click();
    await expect(
      page.getByText("Award decision is already archived", { exact: true }),
    ).toBeVisible();
  });
});

type OverrideHandlers = Partial<{
  list: (route: Route) => Promise<void>;
  create: (route: Route) => Promise<void>;
  upload: (route: Route) => Promise<void>;
  processing: (route: Route) => Promise<void>;
  preview: (route: Route) => Promise<void>;
  process: (route: Route) => Promise<void>;
  confirm: (route: Route) => Promise<void>;
  decision: (route: Route) => Promise<void>;
  detail: (route: Route) => Promise<void>;
  recipients: (route: Route) => Promise<void>;
  updateMapping: (route: Route) => Promise<void>;
  updateRow: (route: Route) => Promise<void>;
  revertRowCorrection: (route: Route) => Promise<void>;
  archive: (route: Route) => Promise<void>;
  unarchive: (route: Route) => Promise<void>;
}>;

async function installMocks(
  page: Page,
  role: RegistryRole,
  requests: string[] = [],
  workspaceType: "SCHOOL" | "UNIVERSITY_SYSTEM" = "SCHOOL",
  overrides: OverrideHandlers = {},
) {
  const user = userFor(role, workspaceType);
  await page.route("http://localhost:8080/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    requests.push(`${request.method()} ${path}${url.search}`);
    if (request.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    if (path === "/api/me" || path === "/api/auth/me") return json(route, user);
    if (path === "/api/auth/login")
      return json(route, { user, accessToken: "award-token", refreshToken: "award-refresh" });
    if (path === "/api/workspaces")
      return json(route, [
        { id: "school-1", code: "DDK", name: "Trường Đại học Bách khoa", shortName: "DUT" },
        { id: "school-2", code: "DUE", name: "Trường Đại học Kinh tế", shortName: "DUE" },
      ]);
    if (path === "/api/award-decisions" && request.method() === "GET" && overrides.list)
      return overrides.list(route);
    if (path === "/api/award-decisions" && request.method() === "GET") {
      const decision = workspaceType === "UNIVERSITY_SYSTEM" ? udnDecision : decisionDraft;
      return json(
        route,
        { items: [decision] },
        { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      );
    }
    if (path === "/api/award-decisions" && request.method() === "POST" && overrides.create)
      return overrides.create(route);
    if (path.endsWith("/files/roster") && request.method() === "POST" && overrides.upload)
      return overrides.upload(route);
    if (path.endsWith("/process-roster") && request.method() === "POST" && overrides.process)
      return overrides.process(route);
    if (path.endsWith("/roster-processing") && overrides.processing)
      return overrides.processing(route);
    if (path.endsWith("/roster-preview") && request.method() === "GET" && overrides.preview)
      return overrides.preview(route);
    if (path.endsWith("/roster-preview") && request.method() === "GET")
      return json(route, preview, { pagination: preview.pagination });
    if (path.endsWith("/roster-mapping") && request.method() === "PATCH" && overrides.updateMapping)
      return overrides.updateMapping(route);
    if (/\/roster-preview\/\d+$/.test(path) && request.method() === "PATCH" && overrides.updateRow)
      return overrides.updateRow(route);
    if (
      /\/roster-preview\/\d+\/correction$/.test(path) &&
      request.method() === "DELETE" &&
      overrides.revertRowCorrection
    )
      return overrides.revertRowCorrection(route);
    if (path.endsWith("/roster-mapping") && request.method() === "PATCH")
      return json(route, {
        mapping: preview.mapping,
        validationSummary: preview.validationSummary,
        items: preview.items,
        pagination: preview.pagination,
      });
    if (path.endsWith("/confirm") && request.method() === "POST" && overrides.confirm)
      return overrides.confirm(route);
    if (path.endsWith("/archive") && request.method() === "POST" && overrides.archive)
      return overrides.archive(route);
    if (path.endsWith("/unarchive") && request.method() === "POST" && overrides.unarchive)
      return overrides.unarchive(route);
    if (path.endsWith("/recipients") && request.method() === "GET" && overrides.recipients)
      return overrides.recipients(route);
    const isDecisionDetail = /^\/api\/award-decisions\/[^/]+$/.test(path);
    if (isDecisionDetail && request.method() === "GET" && overrides.decision)
      return overrides.decision(route);
    if (isDecisionDetail && request.method() === "GET" && overrides.detail)
      return overrides.detail(route);
    if (isDecisionDetail && request.method() === "GET") return json(route, decisionDraft);
    if (path.startsWith("/api/award-decisions/") && request.method() === "POST")
      return json(route, decisionDraft, {}, 202);
    return json(route, null);
  });

  await page.addInitScript(
    (auth) => {
      window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 }));
    },
    { user, accessToken: "award-token", refreshToken: "award-refresh" },
  );
}

function userFor(role: RegistryRole, workspaceType: "SCHOOL" | "UNIVERSITY_SYSTEM") {
  const workspaceId = role === "admin" ? null : workspaceType === "SCHOOL" ? "school-1" : "udn-1";
  const isStudent = role === "student";
  const cityRole = role === "city_officer" || role === "city_manager" || role === "city_committee";
  return {
    id: `user-${role}`,
    workspaceId,
    email: `${role}@test.local`,
    role,
    fullName: "Người dùng kiểm thử",
    studentCode: isStudent ? "0010220001" : null,
    className: isStudent ? "23CNTT1" : null,
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
          code: workspaceType === "SCHOOL" ? "DDK" : "UDN",
          name: workspaceType === "SCHOOL" ? "Trường Đại học Bách khoa" : "Đại học Đà Nẵng",
          shortName: workspaceType === "SCHOOL" ? "DUT" : "UDN",
        }
      : null,
    officerSpecializations:
      cityRole && role === "city_officer"
        ? [{ criterion: "academic", facultyScope: null, isActive: true }]
        : [],
  };
}

async function json(route: Route, data: unknown, meta: Record<string, unknown> = {}, status = 200) {
  await route.fulfill({
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
    body: JSON.stringify({
      success: true,
      data,
      error: null,
      meta: { requestId: "award-registry-pw", ...meta },
    }),
  });
}
