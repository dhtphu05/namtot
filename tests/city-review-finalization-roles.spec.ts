import { expect, test, type Page } from "@playwright/test";

const corsHeaders = {
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "access-control-allow-origin": "*",
};

test.describe("final authority for individual City review", () => {
  for (const role of ["city_manager", "city_committee"] as const) {
    test(`${role} can open the final decision action`, async ({ page }) => {
      await installCityResultMock(page, role);
      await page.goto("/app/manager/results/app-city-1", { waitUntil: "domcontentloaded" });

      await expect(page.getByRole("heading", { name: "Tổng hợp quyết định" })).toBeVisible();
      await expect(page.getByText("5/5 tiêu chí đã xử lý")).toBeVisible();
      await expect(page.getByRole("button", { name: "Chọn kết quả chốt" })).toBeEnabled();
    });
  }

  test("City Manager keeps the existing final action for a non-City application", async ({
    page,
  }) => {
    await installCityResultMock(page, "city_manager", "school");
    await page.goto("/app/manager/results/app-school-1", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Tổng hợp quyết định" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Chọn kết quả chốt" })).toBeEnabled();
  });

  test("City Officer cannot open the result finalization route", async ({ page }) => {
    await installCityResultMock(page, "city_officer");
    await page.goto("/app/manager/results/app-city-1", { waitUntil: "domcontentloaded" });

    await expect(page).not.toHaveURL(/\/app\/manager\/results\/app-city-1/);
  });
});

async function installCityResultMock(
  page: Page,
  role: string,
  targetLevel: "city" | "school" = "city",
) {
  const user = {
    id: `${role}-1`,
    email: `${role}@5tot.test`,
    fullName: role,
    role,
    workspaceId: "danang-city",
    isActive: true,
    officerSpecializations: [],
  };

  await page.route("http://localhost:8080/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      return;
    }
    const data =
      path === "/api/me" || path === "/api/auth/me"
        ? user
        : path === `/api/manager/results/app-${targetLevel}-1`
          ? cityResultDetail(targetLevel)
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
    { user, accessToken: "manager-token", refreshToken: "manager-refresh" },
  );
}

function cityResultDetail(targetLevel: "city" | "school") {
  const criteria = ["ethics", "academic", "physical", "volunteer", "integration"] as const;
  return {
    application: {
      id: "app-city-1",
      schoolYear: "2025-2026",
      applicationType: "individual",
      targetLevel,
      status: "under_review",
      readinessScore: 100,
      finalStatus: "pending",
      finalLevel: null,
      updatedAt: "2026-09-27T00:00:00.000Z",
      lastActivityAt: "2026-09-27T00:00:00.000Z",
    },
    student: {
      id: "student-1",
      fullName: "Nguyễn Văn An",
      studentCode: "00123456",
      className: "22T1",
      faculty: "Công nghệ thông tin",
    },
    metrics: [],
    reviewTasks: criteria.map((criterion, index) => ({
      id: `task-${index + 1}`,
      criterion,
      status: "accepted",
      decision: "accepted",
      evidences: [],
    })),
    applicationEvidences: [],
    criterionSummary: {},
    resolutionCases: [],
    auditTimeline: [],
    aggregation: {
      suggestedFinalStatus: "pending",
      suggestedFinalLevel: targetLevel,
      reason: "Đã xử lý đủ năm tiêu chí.",
      canFinalize: true,
      blockingIssues: [],
    },
  };
}
