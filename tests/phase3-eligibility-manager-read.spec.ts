import { expect, test, type Page, type Route } from "@playwright/test";

type Role =
  "student" | "city_officer" | "city_manager" | "city_committee" | "data_uploader" | "admin";

const corsHeaders = {
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "access-control-allow-origin": "*",
};

test.describe("Phase 3 City Manager eligibility verification UI", () => {
  test("manager can inspect scoped candidates and approve with a reason and confirmation", async ({
    page,
  }) => {
    const requests: Array<{ method: string; url: string; body: unknown }> = [];
    await installManagerMock(page, "city_manager", requests, () =>
      requests.filter((request) => request.url.includes("eligibilityVerification=pending")).length >
      1
        ? 1
        : 0,
    );
    await page.goto("/app/analytics", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Tổng quan xét duyệt" })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Hồ sơ cần xác minh điều kiện" })).toBeVisible();
    await expect(page.getByText("Nguyễn An", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Xem hồ sơ cần xác minh/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Trường Đại học Bách khoa - Đại học Đà Nẵng");
    await expect(dialog).toContainText("Nguyễn An");
    await expect(dialog).toContainText("22T_DT1");
    await expect(dialog).toContainText("Danh sách SV5T cấp ĐHĐN");
    await expect(dialog).not.toContainText("Người nhận không liên quan");

    await dialog.getByLabel("Lý do xác minh").fill("Đã đối chiếu với trường.");
    await dialog.getByRole("button", { name: "Phê duyệt điều kiện" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("Phê duyệt điều kiện nộp hồ sơ");
    await page.getByRole("alertdialog").getByRole("button", { name: "Xác nhận phê duyệt" }).click();

    await expect.poll(() => requests.filter((request) => request.method === "POST").length).toBe(1);
    const verificationRequest = requests.find((request) => request.method === "POST");
    expect(verificationRequest?.url).toContain(
      "/api/applications/app-city-1/eligibility-verification",
    );
    expect(verificationRequest?.body).toEqual({
      decision: "APPROVED",
      reason: "Đã đối chiếu với trường.",
    });
    await expect(dialog).toContainText(/Đã phê duyệt|APPROVED/i);
  });

  test("manager can reject only with a reason and rejection copy is distinct from review rejection", async ({
    page,
  }) => {
    const requests: Array<{ method: string; url: string; body: unknown }> = [];
    await installManagerMock(page, "city_manager", requests);
    await page.goto("/app/analytics", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Tổng quan xét duyệt" })).toBeVisible();
    await page.getByRole("button", { name: /Xem hồ sơ cần xác minh/i }).click();

    const dialog = page.getByRole("dialog");
    const rejectButton = dialog.getByRole("button", { name: "Từ chối xác minh điều kiện" });
    await expect(rejectButton).toBeDisabled();
    await dialog.getByLabel("Lý do xác minh").fill("Không khớp dữ liệu do trường xác nhận.");
    await expect(rejectButton).toBeEnabled();
    await expect(dialog).not.toContainText(/Từ chối hồ sơ xét duyệt/);
    await rejectButton.click();

    await expect.poll(() => requests.filter((request) => request.method === "POST").length).toBe(1);
    expect(requests.find((request) => request.method === "POST")?.body).toEqual({
      decision: "REJECTED",
      reason: "Không khớp dữ liệu do trường xác nhận.",
    });
  });

  for (const role of [
    "student",
    "city_officer",
    "city_committee",
    "data_uploader",
    "admin",
  ] as const) {
    test(`${role} does not see the manager eligibility panel`, async ({ page }) => {
      const requests: Array<{ method: string; url: string; body: unknown }> = [];
      await installManagerMock(page, role, requests);
      await page.goto("/app/analytics", { waitUntil: "domcontentloaded" });
      await expect(page.getByText(/Đang kiểm tra phiên đăng nhập/)).toHaveCount(0);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Hồ sơ cần xác minh điều kiện" })).toHaveCount(
        0,
      );
      expect(
        requests.some((request) => request.url.includes("eligibilityVerification=pending")),
      ).toBe(false);
    });
  }
});

async function installManagerMock(
  page: Page,
  role: Role,
  requests: Array<{ method: string; url: string; body: unknown }>,
  getPendingListCount: () => number = () => 0,
) {
  const user = userFor(role);
  let savedDecision: "APPROVED" | "REJECTED" | null = null;
  await page.route("http://localhost:8080/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      return;
    }
    if (path === "/api/me" || path === "/api/auth/me") return json(route, user);
    if (path === "/api/manager/dashboard-summary") return json(route, {});
    if (
      path === "/api/manager/applications" &&
      url.searchParams.get("eligibilityVerification") === "pending"
    ) {
      requests.push({ method: request.method(), url: request.url(), body: null });
      return json(
        route,
        getPendingListCount() > 0
          ? { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
          : {
              items: [
                {
                  id: "app-city-1",
                  schoolYear: "2025-2026",
                  student: { fullName: "Nguyễn An", studentCode: "001234", className: "22T_DT1" },
                  school: { code: "DDK", name: "Trường Đại học Bách khoa - Đại học Đà Nẵng" },
                  autoStatus: "NEEDS_VERIFICATION",
                  effectiveStatus: "NEEDS_VERIFICATION",
                  reasons: ["IDENTITY_MATCH_REQUIRES_VERIFICATION"],
                },
              ],
              pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
            },
      );
    }
    if (path === "/api/manager/applications/app-city-1/eligibility-verification") {
      requests.push({ method: request.method(), url: request.url(), body: null });
      return json(route, {
        applicationId: "app-city-1",
        schoolYear: "2025-2026",
        route: "UDN_PREREQUISITE",
        autoStatus: "NEEDS_VERIFICATION",
        effectiveStatus:
          savedDecision === "APPROVED"
            ? "ELIGIBLE"
            : savedDecision === "REJECTED"
              ? "NOT_ELIGIBLE"
              : "NEEDS_VERIFICATION",
        reasons: ["IDENTITY_MATCH_REQUIRES_VERIFICATION"],
        student: { fullName: "Nguyễn An", studentCode: "001234", className: "22T_DT1" },
        school: { code: "DDK", name: "Trường Đại học Bách khoa - Đại học Đà Nẵng" },
        existingDecision: savedDecision
          ? { decision: savedDecision, decidedAt: "2026-09-25T10:00:00.000Z" }
          : null,
        candidates: [
          {
            fullName: "Nguyễn An",
            studentCode: "001234",
            className: "22T_DT1",
            institution: { code: "DDK", name: "Danh sách SV5T cấp ĐHĐN" },
          },
        ],
      });
    }
    if (
      path === "/api/applications/app-city-1/eligibility-verification" &&
      request.method() === "POST"
    ) {
      const body = parseJson(request.postData()) as { decision?: "APPROVED" | "REJECTED" } | null;
      savedDecision = body?.decision ?? null;
      requests.push({ method: request.method(), url: request.url(), body });
      return json(route, { status: body?.decision === "APPROVED" ? "ELIGIBLE" : "NOT_ELIGIBLE" });
    }
    return json(route, null);
  });

  await page.addInitScript(
    (auth) => window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 })),
    { user, accessToken: `phase3-${role}-token`, refreshToken: "refresh" },
  );
}

function userFor(role: Role) {
  const isStudent = role === "student";
  const isAdmin = role === "admin";
  const workspaceId = isStudent ? "school-dut" : isAdmin ? null : "danang-city";
  return {
    id: `user-${role}`,
    workspaceId,
    email: `${role}@test.local`,
    role,
    fullName: role === "city_manager" ? "Quản lý thành phố" : "Người dùng kiểm thử",
    studentCode: isStudent ? "001234" : null,
    className: isStudent ? "22T_DT1" : null,
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
          code: isStudent ? "DDK" : "DANANG_CITY",
          name: isStudent ? "Trường" : "Đà Nẵng",
          shortName: null,
        }
      : null,
    officerSpecializations: [],
  };
}

function parseJson(body: string | null): unknown {
  if (!body) return null;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

async function json(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    headers: { ...corsHeaders, "content-type": "application/json" },
    body: JSON.stringify({ success: true, data, error: null, meta: { requestId: "phase3-pw" } }),
  });
}
