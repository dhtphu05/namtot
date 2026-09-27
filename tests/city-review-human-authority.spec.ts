import { expect, test, type Page } from "@playwright/test";

const corsHeaders = {
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "access-control-allow-origin": "*",
};

test("City Officer can PASS despite incomplete rules advice and failed OCR when the source file exists", async ({
  page,
}) => {
  const requests: Array<{ url: string; body: unknown }> = [];
  await installDecidableTask(page, requests, "human_review_required", "failed");
  await page.goto("/app/review/task-city-2", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("region", { name: /gợi ý tiền kiểm/i })).toContainText(
    "Chưa đủ dữ liệu để xác định hệ đào tạo",
  );
  await expect(page.getByText("bang-diem-ocr-loi.pdf", { exact: true })).toBeVisible();
  await page.getByText("Đạt tiêu chí", { exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận đạt" }).click();

  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toMatchObject({
    url: "http://localhost:8080/api/review/tasks/task-city-2/decision",
    body: expect.objectContaining({ decision: "accepted", officerSuggestedLevel: "city" }),
  });
});

test("City Officer can FAIL despite a positive rules suggestion", async ({ page }) => {
  const requests: Array<{ url: string; body: unknown }> = [];
  await installDecidableTask(page, requests, "pass_suggested", "indexed");
  await page.goto("/app/review/task-city-2", { waitUntil: "domcontentloaded" });

  await page.getByText("Không đạt tiêu chí", { exact: true }).click();
  await page.getByLabel("Mẫu lý do").selectOption({
    label: "Minh chứng không đáp ứng điều kiện của tiêu chí.",
  });
  await page.getByRole("button", { name: "Xác nhận không đạt" }).click();

  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0].body).toEqual(
    expect.objectContaining({
      decision: "rejected",
      officerNote: "Minh chứng không đáp ứng điều kiện của tiêu chí.",
    }),
  );
});

async function installDecidableTask(
  page: Page,
  requests: Array<{ url: string; body: unknown }>,
  advisoryStatus: string,
  indexingStatus: string,
) {
  const user = {
    id: "city-officer-2",
    email: "officer.academic@danang.gov.vn",
    fullName: "Cán bộ xét duyệt thành phố",
    role: "city_officer",
    workspaceId: "danang-city",
    isActive: true,
    officerSpecializations: [{ criterion: "academic", facultyScope: null, isActive: true }],
  };

  await page.route("http://localhost:8080/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      return;
    }
    if (request.method() === "POST" && path === "/api/review/tasks/task-city-2/decision") {
      requests.push({ url: request.url(), body: request.postDataJSON() });
      await json(route, { task: { id: "task-city-2", status: "accepted" } });
      return;
    }
    const data =
      path === "/api/me" || path === "/api/auth/me"
        ? user
        : path === "/api/review/tasks/task-city-2"
          ? {
              task: {
                id: "task-city-2",
                criterion: "academic",
                status: "waiting",
                assignedOfficerId: user.id,
                permissions: {
                  canView: true,
                  canAct: true,
                  canClaim: false,
                  canRequestSupport: false,
                  availableActions: ["view", "decide", "request_supplement", "escalate_resolution"],
                },
                application: {
                  id: "application-city-2",
                  schoolYear: "2025-2026",
                  applicationType: "individual",
                  targetLevel: "city",
                  status: "submitted",
                  student: {
                    id: "student-2",
                    fullName: "Nguyễn Văn Bình",
                    studentCode: "00123457",
                    className: "22T2",
                    faculty: "Công nghệ thông tin",
                  },
                  metrics: [{ id: "metric-2", metricType: "gpa", value: 2.8, scale: 4 }],
                },
                evidences: [
                  {
                    id: "evidence-city-2",
                    evidenceName: "Bảng điểm năm học",
                    criterion: "academic",
                    status: "under_review",
                    indexingStatus,
                    files: [
                      {
                        id: "file-city-2",
                        originalName: "bang-diem-ocr-loi.pdf",
                        mimeType: "application/pdf",
                        size: 512,
                        url: "https://files.example.test/bang-diem-ocr-loi.pdf",
                        createdAt: "2026-05-01T00:00:00.000Z",
                      },
                    ],
                    card: { ocrText: "", warningsJson: ["OCR_FAILED"] },
                  },
                ],
              },
              metrics: [{ id: "metric-2", metricType: "gpa", value: 2.8, scale: 4 }],
              precheck: {
                applicationId: "application-city-2",
                level: "city",
                readinessScore: 35,
                readyToSubmit: false,
                criteriaResults: [
                  {
                    criterion: "academic",
                    status: advisoryStatus,
                    missingRequirements: [{ title: "Chưa đủ dữ liệu để xác định hệ đào tạo" }],
                    needsVerification: [],
                    warnings: ["ACADEMIC_PROGRAM_TYPE_UNKNOWN"],
                  },
                ],
                missingItems: [],
                warnings: [],
                nextBestAction: "review",
                humanConfirmationRequired: true,
                createdAt: "2026-09-27T00:00:00.000Z",
              },
            }
          : { items: [] };
    await json(route, data);
  });
  await page.addInitScript(
    (auth) => {
      window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 }));
    },
    { user, accessToken: "review-token", refreshToken: "review-refresh" },
  );
}

async function json(route: import("@playwright/test").Route, data: unknown) {
  await route.fulfill({
    status: 200,
    headers: { ...corsHeaders, "content-type": "application/json" },
    body: JSON.stringify({ success: true, data, error: null, meta: {} }),
  });
}
