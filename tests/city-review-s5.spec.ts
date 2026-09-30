import { expect, test, type Page, type Route } from "@playwright/test";

const corsHeaders = {
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "access-control-allow-origin": "*",
};

test("City Officer can request criterion-scoped supplement and return to pending", async ({
  page,
}) => {
  const requests: Array<{ path: string; body: unknown }> = [];
  await installS5Task(page, { requests });
  await page.goto("/app/review/task-s5", { waitUntil: "domcontentloaded" });

  await page.getByTestId("decision-supplement_required").click();
  const submit = page.getByTestId("submit-supplement");
  await expect(submit).toBeDisabled();
  await page.getByTestId("supplement-reason").fill("Bổ sung bảng điểm có xác nhận.");
  await page.getByTestId("supplement-evidence-evidence-s5").click();
  await page.getByTestId("supplement-deadline").fill("2026-10-15");
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toEqual({
    path: "/api/review/tasks/task-s5/decision",
    body: expect.objectContaining({
      decision: "supplement_required",
      supplementRequestJson: expect.objectContaining({
        reason: "Bổ sung bảng điểm có xác nhận.",
        evidenceIds: ["evidence-s5"],
        deadline: "2026-10-15",
      }),
    }),
  });
  await expect(page.getByTestId("supplement-pending")).toBeVisible();
  await expect(page.getByTestId("decision-supplement_required")).not.toBeVisible();
});

test("City Officer can hand off Resolution with linked evidence and case id", async ({ page }) => {
  const requests: Array<{ path: string; body: unknown }> = [];
  await installS5Task(page, { requests, resolution: true });
  await page.goto("/app/review/task-s5", { waitUntil: "domcontentloaded" });

  await page.getByTestId("decision-resolution_needed").click();
  await page.getByTestId("resolution-reason").fill("Có thông tin mâu thuẫn cần Hội đồng xem xét.");
  await page.getByTestId("resolution-evidence-evidence-s5").click();
  await page.getByTestId("submit-resolution").click();

  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toEqual({
    path: "/api/review/tasks/task-s5/escalate-resolution",
    body: expect.objectContaining({
      reason: "Có thông tin mâu thuẫn cần Hội đồng xem xét.",
      evidenceIds: ["evidence-s5"],
    }),
  });
  await expect(page.getByTestId("resolution-pending")).toBeVisible();
  await expect(page.getByTestId("decision-resolution_needed")).not.toBeVisible();
});

test("City Officer refreshes the task after a stale mutation conflict", async ({ page }) => {
  const requests: Array<{ path: string; body: unknown }> = [];
  await installS5Task(page, { requests, conflict: true });
  await page.goto("/app/review/task-s5", { waitUntil: "domcontentloaded" });

  await page.getByTestId("decision-supplement_required").click();
  await page.getByTestId("supplement-reason").fill("Bổ sung giấy xác nhận mới.");
  await page.getByTestId("submit-supplement").click();

  expect(requests).toHaveLength(1);
  await expect(page.getByTestId("decision-supplement_required")).toBeVisible();
});

test("City Officer sees pending supplement as read-only", async ({ page }) => {
  await installS5Task(page, { pending: "supplement" });
  await page.goto("/app/review/task-s5", { waitUntil: "domcontentloaded" });

  await expect(page.getByTestId("supplement-pending")).toBeVisible();
  await expect(page.getByTestId("decision-supplement_required")).not.toBeVisible();
  await expect(page.getByText("Chế độ chỉ xem", { exact: true })).toBeVisible();
});

async function installS5Task(
  page: Page,
  options: {
    requests?: Array<{ path: string; body: unknown }>;
    resolution?: boolean;
    pending?: "supplement" | "resolution";
    conflict?: boolean;
  } = {},
) {
  const user = {
    id: "city-officer-s5",
    email: "officer@danang.city",
    fullName: "Cán bộ thành phố",
    role: "city_officer",
    workspaceId: "city-workspace",
    isActive: true,
    officerSpecializations: [{ criterion: "academic", facultyScope: null, isActive: true }],
  };
  let status =
    options.pending === "supplement"
      ? "supplement_required"
      : options.pending === "resolution"
        ? "resolution_needed"
        : "waiting";
  let actionAllowed = !options.pending;

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!url.pathname.startsWith("/api/")) {
      await route.continue();
      return;
    }
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      return;
    }
    if (request.method() === "POST" && url.pathname.includes("/api/review/tasks/task-s5/")) {
      options.requests?.push({ path: url.pathname, body: request.postDataJSON() });
      if (options.conflict) {
        await route.fulfill({
          status: 409,
          headers: { ...corsHeaders, "content-type": "application/json" },
          body: JSON.stringify({
            success: false,
            data: null,
            error: { code: "CONFLICT", message: "Task đã thay đổi, vui lòng tải lại." },
            meta: {},
          }),
        });
        return;
      }
      status = url.pathname.endsWith("decision") ? "supplement_required" : "resolution_needed";
      actionAllowed = false;
      await json(route, {
        task: { id: "task-s5", status },
        resolutionCaseId: status === "resolution_needed" ? "resolution-case-s5" : undefined,
      });
      return;
    }

    if (request.method() === "GET" && url.pathname === "/api/review/tasks/task-s5") {
      await json(route, buildTask(user, status, actionAllowed));
      return;
    }
    if (request.method() === "GET" && url.pathname.endsWith("/precedents")) {
      await json(route, { items: [], hasStrongPrecedent: false });
      return;
    }
    if (url.pathname === "/api/me" || url.pathname === "/api/auth/me") {
      await json(route, user);
      return;
    }
    await json(route, { items: [] });
  });

  await page.addInitScript(
    (auth) => {
      window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 }));
    },
    { user, accessToken: "review-token", refreshToken: "review-refresh" },
  );
}

function buildTask(user: { id: string }, status: string, actionAllowed: boolean) {
  const taskStatus = status === "waiting" ? "waiting" : status;
  return {
    task: {
      id: "task-s5",
      criterion: "academic",
      status: taskStatus,
      dueDate: "2026-10-15T00:00:00.000Z",
      assignedOfficerId: user.id,
      workspace: {
        id: "school-workspace",
        name: "Trường Đại học Bách khoa - Đại học Đà Nẵng",
        shortName: "DHBK",
        type: "SCHOOL",
        isActive: true,
      },
      permissions: {
        canView: true,
        canAct: actionAllowed,
        canClaim: false,
        canRequestSupport: false,
        reason: actionAllowed ? "assigned_to_you" : "finalized",
        reasonLabel: actionAllowed
          ? "Bạn được xử lý hồ sơ này"
          : "Sinh viên đang bổ sung, cán bộ chờ nộp lại hồ sơ.",
        availableActions: actionAllowed
          ? ["view", "decide", "request_supplement", "escalate_resolution"]
          : ["view"],
      },
      application: {
        id: "application-s5",
        schoolYear: "2025-2026",
        applicationType: "individual",
        targetLevel: "city",
        status: actionAllowed ? "under_review" : taskStatus,
        submittedAt: "2026-09-01T00:00:00.000Z",
        finalStatus: "pending",
        student: {
          id: "student-s5",
          fullName: "Nguyễn Văn S5",
          studentCode: "00123458",
          className: "22T2",
          faculty: "Công nghệ thông tin",
        },
        metrics: [],
        criterionLevelAssessment: null,
      },
      evidences: [
        {
          id: "evidence-s5",
          evidenceName: "Bảng điểm năm học",
          criterion: "academic",
          sourceType: "manual_upload",
          status: "under_review",
          indexingStatus: "indexed",
          confidence: 0.9,
          note: null,
          reviewerNote: null,
          createdAt: "2026-09-01T00:00:00.000Z",
          updatedAt: "2026-09-01T00:00:00.000Z",
          files: [],
          card: null,
          event: null,
        },
      ],
      metrics: [],
      checklist: [],
      decisionHistory: [],
      precheck: null,
    },
    metrics: [],
  };
}

async function json(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    headers: { ...corsHeaders, "content-type": "application/json" },
    body: JSON.stringify({ success: true, data, error: null, meta: {} }),
  });
}
