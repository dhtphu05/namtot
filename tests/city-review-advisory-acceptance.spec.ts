import { expect, test } from "@playwright/test";

const corsHeaders = {
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "access-control-allow-origin": "*",
};

test("city reviewer sees criteria precheck as reference, not an official decision", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const precedentRequests: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const user = {
    id: "city-officer-1",
    email: "officer@danang.gov.vn",
    fullName: "Cán bộ xét duyệt thành phố",
    role: "city_officer",
    workspaceId: "danang-city",
    isActive: true,
    officerSpecializations: [{ criterion: "academic", facultyScope: null, isActive: true }],
  };
  await page.route("http://localhost:8080/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/precedents/check")) precedentRequests.push(path);
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      return;
    }
    const data =
      path === "/api/me" || path === "/api/auth/me"
        ? user
        : path === "/api/review/tasks/task-city-1"
          ? {
              task: {
                id: "task-city-1",
                criterion: "academic",
                status: "waiting",
                permissions: {
                  canView: true,
                  canAct: false,
                  canClaim: false,
                  canRequestSupport: false,
                  reason: "out_of_scope",
                  reasonLabel: "Chỉ xem",
                  availableActions: ["view"],
                },
                application: {
                  id: "application-city-1",
                  schoolYear: "2025-2026",
                  applicationType: "individual",
                  targetLevel: "city",
                  status: "submitted",
                  student: {
                    id: "student-1",
                    fullName: "Nguyễn Văn An",
                    studentCode: "00123456",
                    email: "student@example.edu.vn",
                    faculty: "Công nghệ thông tin",
                    className: "22T1",
                  },
                },
                evidences: [
                  {
                    id: "evidence-city-1",
                    evidenceName: "Bảng điểm năm học",
                    criterion: "academic",
                    sourceType: "manual_upload",
                    status: "under_review",
                    createdAt: "2026-09-26T00:00:00.000Z",
                    files: [],
                  },
                ],
                metrics: [],
              },
              precheck: {
                applicationId: "application-city-1",
                level: "city",
                readinessScore: 35,
                readyToSubmit: false,
                criteriaResults: [
                  {
                    criterion: "academic",
                    status: "human_review_required",
                    missingRequirements: [{ title: "Chưa đủ dữ liệu để xác định hệ đào tạo" }],
                    needsVerification: [{ title: "Cần cán bộ đối chiếu minh chứng" }],
                    warnings: ["ACADEMIC_PROGRAM_TYPE_UNKNOWN", "OUTSIDE_SCHOOL_YEAR"],
                  },
                ],
                missingItems: [],
                warnings: ["OUTSIDE_SCHOOL_YEAR"],
                nextBestAction: "review",
                humanConfirmationRequired: true,
                createdAt: "2026-09-26T00:00:00.000Z",
              },
            }
          : null;
    await route.fulfill({
      status: 200,
      headers: { ...corsHeaders, "content-type": "application/json" },
      body: JSON.stringify({ success: true, data, error: null, meta: {} }),
    });
  });
  await page.addInitScript(
    (auth) => {
      window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 }));
    },
    { user, accessToken: "review-token", refreshToken: "review-refresh" },
  );

  await page.goto("/app/review/task-city-1", { waitUntil: "domcontentloaded" });

  const advisory = page.getByRole("region", { name: /gợi ý tiền kiểm/i });
  await expect(advisory).toBeVisible();
  expect(pageErrors).toEqual([]);
  expect(precedentRequests).toEqual([]);
  await expect(advisory).toContainText(/tham khảo/i);
  await expect(advisory).toContainText(/OUTSIDE_SCHOOL_YEAR|nằm ngoài năm học/i);
  await expect(advisory).toContainText(/đối chiếu file gốc/i);
  await expect(advisory).not.toContainText(/tự động quyết định|kết luận chính thức/i);
  await expect(page.getByRole("button", { name: /chấp nhận|từ chối/i })).toHaveCount(0);
});
