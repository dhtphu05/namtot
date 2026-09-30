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
  await expect(
    page.getByText("Trường Đại học Bách khoa - Đại học Đà Nẵng", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Mốc xử lý", { exact: true })).toBeVisible();
  await expect(page.getByText("bang-diem-ocr-loi.pdf", { exact: true })).toBeVisible();
  await page.getByText("Đạt tiêu chí", { exact: true }).click();
  await page.getByLabel("Đánh giá Bảng điểm năm học").selectOption("invalid");
  await page.getByLabel("Ghi chú đánh giá Bảng điểm năm học").fill("Không khớp dữ liệu sinh viên.");
  await page.getByRole("button", { name: "Xác nhận đạt" }).click();

  await expect.poll(() => requests.length).toBe(1);
  expect(new URL(requests[0].url).pathname).toBe("/api/review/tasks/task-city-2/decision");
  expect(requests[0].body).toEqual(
    expect.objectContaining({
      decision: "accepted",
      officerSuggestedLevel: "city",
      evidenceAssessments: [
        expect.objectContaining({
          evidenceId: "evidence-city-2",
          assessment: "invalid",
          note: "Không khớp dữ liệu sinh viên.",
        }),
      ],
    }),
  );
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

test("City Officer sees the configured criteria contract instead of a hardcoded threshold", async ({
  page,
}) => {
  const requests: Array<{ url: string; body: unknown }> = [];
  await installDecidableTask(page, requests, "pass_suggested", "indexed");
  await page.goto("/app/review/task-city-2", { waitUntil: "domcontentloaded" });

  await page.getByText("Điều kiện xét", { exact: true }).click();
  await expect(
    page.getByText("GPA tối thiểu theo bộ tiêu chí hiện hành: 3.9", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("GPA từ 3.2", { exact: true })).not.toBeVisible();
});

test("City Officer does not see a fallback threshold when criteria authority is unavailable", async ({
  page,
}) => {
  const requests: Array<{ url: string; body: unknown }> = [];
  await installDecidableTask(page, requests, "human_review_required", "indexed", false);
  await page.goto("/app/review/task-city-2", { waitUntil: "domcontentloaded" });

  await page.getByText("Điều kiện xét", { exact: true }).click();
  await expect(
    page.getByText("Chưa có bộ tiêu chí authoritative cho hồ sơ Thành phố.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("GPA từ 3.2", { exact: true })).not.toBeVisible();
});

async function installDecidableTask(
  page: Page,
  requests: Array<{ url: string; body: unknown }>,
  advisoryStatus: string,
  indexingStatus: string,
  hasCriteriaAuthority = true,
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
                dueDate: "2026-10-15T00:00:00.000Z",
                assignedOfficerId: user.id,
                workspace: {
                  id: "school-dhbk",
                  name: "Trường Đại học Bách khoa - Đại học Đà Nẵng",
                  shortName: "DHBK",
                  type: "SCHOOL",
                  isActive: true,
                },
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
                  submittedAt: "2026-09-01T00:00:00.000Z",
                  finalStatus: "pending",
                  student: {
                    id: "student-2",
                    fullName: "Nguyễn Văn Bình",
                    studentCode: "00123457",
                    className: "22T2",
                    faculty: "Công nghệ thông tin",
                  },
                  metrics: [{ id: "metric-2", metricType: "gpa", value: 2.8, scale: 4 }],
                  criterionLevelAssessment: {
                    taskId: "task-city-2",
                    criterion: "academic",
                    targetLevel: "city",
                    humanConfirmationRequired: true,
                    ...(hasCriteriaAuthority
                      ? {
                          criteriaAuthority: {
                            source: "CriteriaVersion",
                            applicationWorkspaceId: "danang-city",
                            schoolYear: "2025-2026",
                            targetLevel: "city",
                            levels: [
                              {
                                level: "city",
                                status: "resolved",
                                criteriaVersionId: "criteria-city-2025",
                                versionName: "Bộ tiêu chí thành phố 2025",
                                unitScope: "DHBK-DHDN",
                                warnings: [],
                              },
                            ],
                          },
                        }
                      : {}),
                    levels: [
                      {
                        level: "city",
                        status: "failed",
                        score: 0,
                        summary: "GPA chưa đạt ngưỡng cấu hình.",
                        criteriaVersion: {
                          id: "criteria-city-2025",
                          versionName: "Bộ tiêu chí thành phố 2025",
                        },
                        requirements: [
                          {
                            key: "configured-gpa",
                            label: "GPA tối thiểu theo bộ tiêu chí hiện hành: 3.9",
                            status: "failed",
                            requiredValue: ">= 3.9",
                            source: "criteria_version",
                            check: { metric: "gpa", operator: ">=", value: 3.9 },
                            reason: "GPA hiện tại chưa đạt ngưỡng cấu hình.",
                          },
                        ],
                      },
                    ],
                  },
                  criteriaChecklist: [
                    {
                      id: "city-configured-gpa",
                      label: "GPA tối thiểu theo bộ tiêu chí hiện hành: 3.9",
                      passed: false,
                      required: true,
                      note: "GPA hiện tại chưa đạt ngưỡng cấu hình.",
                    },
                  ],
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
