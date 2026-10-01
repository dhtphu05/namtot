import { expect, test } from "@playwright/test";

const apiPattern = /^https?:\/\/(?:localhost|127\.0\.0\.1):\d+\/api(?:\/|\?)/;
const headers = {
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

test("saving GPA updates cached application metrics without reloading the current application", async ({
  page,
}) => {
  let currentReads = 0;

  await page.route(apiPattern, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers, body: "" });
      return;
    }
    if (path === "/api/me" || path === "/api/auth/me") {
      await fulfill(route, student);
      return;
    }
    if (path === "/api/applications/current") {
      currentReads += 1;
      await fulfill(route, currentApplication);
      return;
    }
    if (path === "/api/applications/app-1/criteria-completion") {
      await fulfill(route, criteriaCompletion);
      return;
    }
    if (path === "/api/applications/app-1/academic/gpa/declare") {
      const body = JSON.parse(request.postData() ?? "{}") as { value?: number; scale?: number };
      await fulfill(route, {
        id: "response-gpa",
        applicationId: "app-1",
        criterion: "academic",
        requirementKey: "academic_gpa",
        responseKind: "metric",
        metricId: "metric-gpa",
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:01.000Z",
        payloadJson: {
          value: body.value,
          scale: body.scale,
          verificationStatus: "unverified",
        },
      });
      return;
    }
    await fulfill(route, null);
  });

  await page.addInitScript((user) => {
    window.localStorage.setItem(
      "5tot-auth",
      JSON.stringify({
        state: {
          user,
          accessToken: "test-token",
          refreshToken: "test-refresh-token",
        },
        version: 0,
      }),
    );
  }, student);

  await page.goto("/app/application?criterion=academic", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Học tập tốt" })).toBeVisible();
  await expect.poll(() => currentReads).toBe(1);

  await page.getByRole("button", { name: /Chỉnh kết quả|Tự khai báo kết quả/ }).click();
  const gpaInput = page.getByLabel(/GPA|ĐTB/);
  await gpaInput.fill("3.8");
  await page.getByRole("button", { name: /Lưu/ }).click();
  await expect(gpaInput).toBeHidden();

  await page.getByRole("button", { name: /Chỉnh kết quả|Tự khai báo kết quả/ }).click();
  await expect(gpaInput).toHaveValue("3.8");
  expect(currentReads).toBe(1);
});

async function fulfill(route: import("@playwright/test").Route, data: unknown) {
  await route.fulfill({
    status: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data,
      error: null,
      meta: { requestId: "gpa-cache-test" },
    }),
  });
}

const student = {
  id: "student-1",
  email: "student@example.test",
  fullName: "Test Student",
  role: "student",
  workspaceId: "workspace-1",
};

const currentApplication = {
  state: "draft",
  application: {
    id: "app-1",
    studentId: "student-1",
    schoolYear: "2025-2026",
    applicationType: "individual",
    targetLevel: "city",
    status: "draft",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    submittedAt: null,
    currentDraftVersion: 1,
    metrics: [
      {
        id: "metric-gpa",
        applicationId: "app-1",
        metricType: "gpa",
        value: 3.6,
        scale: 4,
        verificationStatus: "pending",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    ],
    reviewTasks: [],
    basicInfo: { fullName: "Test Student", studentCode: "00012345", className: "26A" },
  },
};

const criteriaCompletion = {
  applicationId: "app-1",
  criteriaVersionId: "criteria-v1",
  targetLevel: "city",
  items: [
    {
      criterion: "academic",
      title: "Học tập tốt",
      description: "Hoàn thiện dữ liệu học tập.",
      status: "in_progress",
      completion: { satisfied: 1, required: 2, needsVerification: 0 },
      requirementGroups: [
        {
          key: "academic_base",
          title: "Kết quả học tập",
          operator: "all_of",
          optional: false,
          requirements: [
            {
              key: "gpa",
              title: "GPA/ĐTB",
              type: "metric",
              status: "declared",
              sources: ["manual_metric"],
              config: { metricType: "gpa", threshold: 3.2 },
              latestResponse: { payloadJson: { rawScale: 4 } },
            },
            {
              key: "no_f_grade",
              title: "Không có điểm F",
              type: "system_confirmation",
              status: "verified",
              sources: ["system_data"],
            },
          ],
        },
      ],
    },
  ],
  summary: { notStarted: 0, inProgress: 1, needsVerification: 0, readyForPrecheck: 0, accepted: 0 },
  generatedAt: "2026-10-01T00:00:00.000Z",
};
