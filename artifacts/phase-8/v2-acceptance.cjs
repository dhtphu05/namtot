const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const appBaseUrl = process.env.PHASE8_APP_BASE_URL || "http://127.0.0.1:5176";
const outDir = path.resolve("artifacts/phase-8");
const viewports = [
  [1280, 720],
  [1440, 900],
  [768, 1024],
  [375, 667],
  [390, 844],
  [430, 932],
];
const criteria = ["ethics", "academic", "physical", "volunteer", "integration"];
const routeErrorPattern =
  /Unexpected Application Error|Application Error|Cannot read properties|Loading chunk \d+ failed|Failed to fetch dynamically imported module/i;
const rawEnumPattern =
  /\b(student_research|journal_article|physical_education|healthy_student|sports_activity|foreign_language|international_exchange|supplement_required|not_started|under_review)\b/i;
const mockCorsHeaders = {
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "access-control-allow-origin": "*",
};

const user = {
  id: "student-1",
  workspaceId: "workspace-1",
  email: "student@example.test",
  role: "student",
  fullName: "Nguyen Van Sinh",
  studentCode: "102220001",
  className: "22T_DT1",
  faculty: "Cong nghe Thong tin",
  phone: null,
  avatarUrl: null,
  isActive: true,
  lastLoginAt: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  workspace: {
    id: "workspace-1",
    code: "DDK",
    name: "Truong Dai hoc Bach khoa - Dai hoc Da Nang",
    shortName: "DDK",
  },
};

function envelope(data) {
  return { success: true, data, error: null, meta: { requestId: "phase-8-mock" } };
}

function errorEnvelope(message, code = "400") {
  return {
    success: false,
    data: null,
    error: { code, message },
    meta: { requestId: "phase-8-mock" },
  };
}

async function fulfillJson(route, data, status = 200) {
  await route.fulfill({
    status,
    headers: { ...mockCorsHeaders, "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(status >= 400 ? errorEnvelope(data, String(status)) : envelope(data)),
  });
}

function stateFromUrl(url) {
  const state = new URL(url).searchParams.get("state");
  return ["empty", "noTasks", "supplement", "completed", "submitted"].includes(state)
    ? state
    : "draft";
}

function criterionFromUrl(url) {
  const criterion = new URL(url).searchParams.get("criterion");
  return criteria.includes(criterion) ? criterion : null;
}

function criterionTitle(criterion) {
  return {
    ethics: "Dao duc tot",
    academic: "Hoc tap tot",
    physical: "The luc tot",
    volunteer: "Tinh nguyen tot",
    integration: "Hoi nhap tot",
  }[criterion];
}

function metric(id, metricType, value, scale, verificationStatus = "pending") {
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

function currentApplication(state) {
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
      targetLevel: "school",
      status,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      lastUpdatedAt: "2026-01-02T00:00:00Z",
      submittedAt: ["submitted", "completed"].includes(state) ? "2026-01-03T00:00:00Z" : null,
      currentDraftVersion: 2,
      metrics: [
        metric("metric-conduct", "conduct_score", 87, 100),
        metric("metric-gpa", "gpa", 3.6, 4),
      ],
      reviewTasks:
        state === "supplement"
          ? [
              {
                id: "review-1",
                criterion: "academic",
                status: "supplement_required",
                officerNote: "Bo sung bang diem co xac nhan ro hon.",
                supplementRequestJson: {
                  reason: "Bang diem can dau xac nhan",
                  requestedFields: ["gpa"],
                  evidenceIds: ["ev-pdf"],
                },
                updatedAt: "2026-01-04T08:00:00Z",
              },
            ]
          : [],
      basicInfo: {
        fullName: "Nguyen Van Sinh",
        studentCode: "102220001",
        faculty: "Cong nghe Thong tin",
        className: "22T_DT1",
      },
    },
  };
}

function requirement(key, title, type, status, acceptedSources, extra = {}) {
  return {
    key,
    title,
    description: `Yeu cau ${title}`,
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
              payloadJson: extra.payloadJson || {},
              createdAt: "2026-01-01T00:00:00Z",
            },
          ],
    ...extra,
  };
}

function optionalGroup(key, title, requirements = []) {
  return { key, title, operator: "at_least_n", requiredCount: 0, optional: true, requirements };
}

function requirementGroups(criterion, accepted) {
  if (criterion === "ethics") {
    return [
      {
        key: "ethics_base",
        title: "Du lieu nen",
        operator: "all_of",
        optional: false,
        requirements: [
          requirement(
            "conduct_score",
            "Diem ren luyen",
            "metric",
            accepted ? "verified" : "declared",
            ["manual_metric"],
          ),
          requirement(
            "no_violation",
            "Tinh trang vi pham",
            "system_confirmation",
            accepted ? "verified" : "needs_verification",
            ["system_data"],
          ),
          requirement("valid_school_year", "Xac minh nam hoc", "system_confirmation", "verified", [
            "system_data",
          ]),
        ],
      },
      optionalGroup("ethics_extra", "Thanh tich dao duc bo sung"),
    ];
  }
  if (criterion === "academic") {
    return [
      {
        key: "academic_base",
        title: "Ket qua hoc tap",
        operator: "all_of",
        optional: false,
        requirements: [
          requirement(
            "gpa",
            "GPA/DTB",
            "metric",
            accepted ? "verified" : "declared",
            ["manual_metric"],
            {
              payloadJson: { scale: 4, schoolYear: "2025-2026" },
            },
          ),
          requirement(
            "no_f_grade",
            "Tinh trang diem F",
            "system_confirmation",
            accepted ? "verified" : "needs_verification",
            ["system_data"],
          ),
          requirement("academic_period", "Xac minh nam hoc", "system_confirmation", "verified", [
            "system_data",
          ]),
        ],
      },
      optionalGroup("academic_extra", "Thanh tich hoc thuat bo sung", [
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
        title: "Chon hinh thuc",
        operator: "one_of",
        optional: false,
        requirements: [
          requirement(
            "physical_education_result",
            "Ket qua hoc phan the duc",
            "metric",
            "not_started",
            ["manual_metric"],
          ),
          requirement(
            "healthy_student_title",
            "Danh hieu Sinh vien khoe",
            "evidence",
            "not_started",
            ["manual_evidence", "official_event"],
          ),
          requirement(
            "sports_activity_or_award",
            "Hoat dong hoac giai the thao",
            "evidence",
            "not_started",
            ["manual_evidence", "official_event"],
          ),
          requirement("sports_team_member", "Doi tuyen the thao", "evidence", "not_started", [
            "manual_evidence",
          ]),
          requirement(
            "regular_sports_training",
            "Ren luyen the thao thuong xuyen",
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
        title: "Ngay tinh nguyen",
        operator: "all_of",
        optional: false,
        requirements: [
          {
            ...requirement(
              "accumulated_volunteer_days",
              "Tong ngay tinh nguyen",
              "activity_aggregation",
              accepted ? "verified" : "needs_verification",
              ["manual_evidence", "official_event"],
            ),
            aggregation: {
              verifiedTotal: 12,
              pendingVerificationTotal: 3,
              excludedTotal: 0,
              unit: "ngay",
              threshold: 15,
              activities: [
                {
                  id: "act-1",
                  requirementKey: "accumulated_volunteer_days",
                  activityName: "Ngay hoi hien mau",
                  organizer: "HSV Truong",
                  startDate: "2026-01-09",
                  endDate: "2026-01-09",
                  declaredValue: 3,
                  declaredUnit: "ngay",
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
      title: "Chon hinh thuc hoi nhap",
      operator: "one_of",
      optional: false,
      requirements: [
        requirement(
          "foreign_language",
          "Ngoai ngu",
          "evidence",
          "not_started",
          ["manual_evidence"],
          {
            formSchema: { fields: [{ key: "score", type: "number", required: true }] },
          },
        ),
        requirement("skills_training", "Ky nang va dao tao", "evidence", "not_started", [
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

function criteriaCompletion(state) {
  const accepted = ["completed", "noTasks"].includes(state);
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
    applicationId: "app-1",
    criteriaVersionId: "criteria-v1",
    targetLevel: "school",
    items: criteria.map((criterion) => ({
      criterion,
      title: criterionTitle(criterion),
      description: `Hoan thien du lieu cho ${criterionTitle(criterion)}.`,
      status:
        accepted || state === "submitted"
          ? "accepted"
          : state === "supplement" && criterion === "academic"
            ? "supplement_required"
            : criterion === "integration"
              ? "not_started"
              : "needs_verification",
      requirementGroups: requirementGroups(criterion, accepted),
      completion: {
        satisfied: accepted ? 2 : criterion === "integration" ? 0 : 1,
        required: 2,
        needsVerification: accepted ? 0 : 1,
      },
      evidenceCount: evidencesFor(criterion).length,
      nextAction: accepted ? null : { type: "manual", label: "Bo sung ngay" },
    })),
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

function evidence(
  id,
  evidenceName,
  criterion,
  mimeType,
  status,
  indexingStatus,
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

function evidencesFor(criterion) {
  const all = [
    evidence("ev-pdf", "Bang diem hoc ky 2", "academic", "application/pdf", "accepted", "indexed"),
    evidence(
      "ev-image",
      "Giay xac nhan hoc luc",
      "academic",
      "image/png",
      "under_review",
      "indexed",
    ),
    evidence(
      "ev-photo",
      "Anh hoat dong tinh nguyen",
      "volunteer",
      "image/jpeg",
      "under_review",
      "indexed",
    ),
    evidence(
      "ev-official",
      "Ngay hoi Sinh vien 5 tot",
      "physical",
      null,
      "accepted",
      "indexed",
      "event_import",
    ),
    evidence("ev-failed", "Tep OCR loi", "integration", "application/pdf", "draft", "failed"),
  ];
  return criterion ? all.filter((item) => item.criterion === criterion) : all;
}

async function installMock(page, state) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathName = url.pathname;
    const criterion = criterionFromUrl(request.url());
    if (request.method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: mockCorsHeaders, body: "" });
    }
    let body = {};
    if (request.postData()) {
      try {
        body = request.postDataJSON();
      } catch {
        body = {};
      }
    }

    if (pathName === "/api/me" || pathName === "/api/auth/me") return fulfillJson(route, user);
    if (pathName === "/api/auth/login")
      return fulfillJson(route, { user, accessToken: "token", refreshToken: "refresh" });
    if (pathName === "/api/auth/logout") return fulfillJson(route, null);
    if (pathName === "/api/applications/current")
      return fulfillJson(route, currentApplication(state));
    if (pathName === "/api/applications/current/start")
      return fulfillJson(route, currentApplication("draft"));
    if (pathName.endsWith("/criteria-completion"))
      return fulfillJson(route, criteriaCompletion(state));
    if (pathName.endsWith("/precheck/latest") || pathName.endsWith("/precheck")) {
      return fulfillJson(route, {
        id: "precheck-1",
        status: state === "completed" ? "passed" : "pending",
        results: [],
      });
    }
    if (pathName.endsWith("/timeline")) {
      return fulfillJson(route, [
        { id: "tl-1", title: "Da kiem tra so bo", createdAt: "2026-01-02T08:00:00Z" },
      ]);
    }
    if (pathName.match(/\/api\/applications\/[^/]+\/evidences$/)) {
      if (request.method() === "POST")
        return fulfillJson(
          route,
          evidence(
            "ev-created",
            "Minh chung moi",
            criterion || "academic",
            "application/pdf",
            "draft",
            "not_started",
          ),
        );
      return fulfillJson(route, evidencesFor(criterion));
    }
    if (pathName.endsWith("/academic/gpa/declare")) {
      if ((body.value || 0) > 4) return fulfillJson(route, "GPA must be between 0 and 4", 400);
      return fulfillJson(route, { ok: true });
    }
    if (pathName.match(/\/api\/applications\/[^/]+\/(ethics|physical|volunteer|integration)/))
      return fulfillJson(route, { ok: true });
    if (pathName.endsWith("/submit"))
      return fulfillJson(route, { id: "app-1", status: "submitted" });
    if (pathName === "/api/evidence-matching/library") {
      return fulfillJson(route, {
        items: [
          {
            eventId: "event-1",
            title: "Ngay hoi Sinh vien 5 tot",
            organizer: "Hoi Sinh vien",
            organizerLevel: "school",
            criterion: criterion || "academic",
            state: "available",
          },
        ],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    }
    if (pathName.includes("/api/evidence-matching/") || pathName.includes("/api/events/")) {
      return fulfillJson(route, "Participant not found", 404);
    }
    if (pathName.match(/\/api\/evidences\/[^/]+\/card$/)) {
      return fulfillJson(route, {
        id: "card-1",
        evidenceId: "ev-pdf",
        readableSummary: { eventName: "Bang diem hoc ky 2", studentName: "Nguyen Van Sinh" },
        matchingStatus: { code: "matched", label: "Da doi chieu" },
        missingFields: [],
      });
    }
    if (pathName.match(/\/api\/evidences\/[^/]+\/audit$/)) return fulfillJson(route, { items: [] });
    if (pathName.match(/\/api\/evidences\/[^/]+$/))
      return fulfillJson(route, evidencesFor(null)[0]);
    if (pathName.match(/\/api\/files\/[^/]+\/signed-url$/)) {
      return fulfillJson(route, {
        url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      });
    }
    if (pathName === "/api/notifications") {
      return fulfillJson(
        route,
        state === "empty"
          ? []
          : [
              {
                id: "n-1",
                type: "supplement_request",
                title: "Bo sung bang diem",
                message: "Bang diem can co dau xac nhan ro hon.",
                readAt: null,
                applicationId: "app-1",
                metadata: { criterion: "academic", status: "supplement_required" },
                createdAt: "2026-01-04T08:00:00Z",
              },
            ],
      );
    }
    if (pathName.match(/\/api\/notifications\/[^/]+\/read$/)) return fulfillJson(route, null);
    if (pathName === "/api/chatbot/message")
      return fulfillJson(route, { message: "Huong dan da duoc ghi nhan.", cards: [] });
    if (pathName === "/api/chatbot/stream") {
      return route.fulfill({
        status: 200,
        headers: { ...mockCorsHeaders, "content-type": "text/event-stream" },
        body: 'event: final\ndata: {"message":"Minh da ghi nhan cau hoi."}\n\n',
      });
    }
    if (pathName === "/api/evidence-matching/search" || pathName === "/api/events/search")
      return fulfillJson(route, []);
    if (pathName === "/api/events")
      return fulfillJson(route, {
        items: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
      });
    return fulfillJson(route, null);
  });
}

async function seedAuth(page) {
  await page.addInitScript(
    (auth) => {
      window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 }));
    },
    { user, accessToken: "token", refreshToken: "refresh" },
  );
}

async function goto(page, route, state = "draft") {
  await page.unroute("**/api/**").catch(() => {});
  await installMock(page, state);
  console.log(`visit ${route} (${state})`);
  await seedAuth(page);
  try {
    await page.goto(`${appBaseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 15000 });
  } catch (error) {
    if (!String(error).includes("ERR_ABORTED")) throw error;
  }
  await page.waitForTimeout(700);
}

async function collectMetrics(page) {
  return page.evaluate(
    ({ rawEnumSource }) => {
      const visible = (el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden";
      };
      const smallTargets = Array.from(
        document.querySelectorAll(
          "button,a,input,select,textarea,summary,[role='button'],[role='tab']",
        ),
      )
        .filter(visible)
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            text: (el.innerText || el.getAttribute("aria-label") || el.tagName)
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 80),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        })
        .filter((item) => item.width < 44 || item.height < 44);
      const croppedDocuments = Array.from(document.images)
        .filter(
          (img) =>
            visible(img) &&
            /pdf|document|bang-diem|transcript/i.test(img.currentSrc || img.src || img.alt),
        )
        .filter((img) => getComputedStyle(img).objectFit !== "contain")
        .map((img) => img.alt || img.currentSrc || img.src);
      const body = document.body.innerText || "";
      return {
        title: document.title,
        url: location.href,
        bodySample: body.replace(/\s+/g, " ").trim().slice(0, 240),
        authLoading: body.includes("Đang kiểm tra phiên đăng nhập"),
        overflowX: Math.max(
          0,
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
        smallTargets,
        croppedDocuments,
        routeError: rawEnumSource.routeErrorPattern.test(body),
        rawEnum: rawEnumSource.rawEnumPattern.test(body),
      };
    },
    { rawEnumSource: { routeErrorPattern, rawEnumPattern } },
  );
}

function assertClean(record) {
  const { metrics, label } = record;
  const failures = [];
  if (metrics.routeError) failures.push("route error boundary text");
  if (metrics.authLoading) failures.push("auth-loading interstitial");
  if (metrics.overflowX > 1) failures.push(`horizontal overflow ${metrics.overflowX}`);
  if (metrics.smallTargets.length)
    failures.push(`small targets ${JSON.stringify(metrics.smallTargets.slice(0, 4))}`);
  if (metrics.rawEnum) failures.push("raw enum text");
  if (metrics.croppedDocuments.length)
    failures.push(`cropped documents ${metrics.croppedDocuments.join(", ")}`);
  if (failures.length) throw new Error(`${label}: ${failures.join("; ")}`);
}

async function capture(page, label, records) {
  const file = path.join(outDir, `${label}.png`);
  await page.screenshot({ path: file, fullPage: false });
  const metrics = await collectMetrics(page);
  const record = { label, screenshot: file, metrics };
  assertClean(record);
  records.push(record);
}

async function run() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const records = [];
  const browserErrors = [];
  const ignoredDevServerErrors = [];
  try {
    for (const [width, height] of viewports) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      page.on("pageerror", (error) => {
        if (
          /default-entry\/client\.tsx|Expected a JavaScript-or-Wasm module script/.test(
            error.message,
          )
        ) {
          ignoredDevServerErrors.push(error.message);
        } else {
          browserErrors.push(error.message);
        }
      });
      page.on("console", (message) => {
        if (message.type() === "error" && !/favicon|404/.test(message.text())) {
          const text = message.text();
          if (/default-entry\/client\.tsx|Expected a JavaScript-or-Wasm module script/.test(text)) {
            ignoredDevServerErrors.push(text);
          } else {
            browserErrors.push(text);
          }
        }
      });

      for (const state of ["draft", "empty", "noTasks", "supplement", "completed"]) {
        await goto(page, `/app?state=${state}`, state);
        await capture(page, `overview-${state}-${width}x${height}`, records);
      }
      for (const criterion of criteria) {
        await goto(page, `/app/application?criterion=${criterion}`, "draft");
        await capture(page, `application-${criterion}-${width}x${height}`, records);
      }
      await goto(page, "/app/application?criterion=academic&uploadEvidence=1", "draft");
      await capture(page, `uploadEvidence-${width}x${height}`, records);
      await page.keyboard.press("Escape").catch(() => {});

      await goto(page, "/app/feedback?state=empty", "empty");
      await capture(page, `feedback-empty-${width}x${height}`, records);
      await goto(page, "/app/feedback", "draft");
      await capture(page, `feedback-list-${width}x${height}`, records);
      await goto(page, "/app/assistant", "draft");
      await page.evaluate(() => {
        const log = document.querySelector("[role='log']");
        if (!log) return;
        for (let index = 0; index < 24; index += 1) {
          const row = document.createElement("div");
          row.textContent = `Tin nhan kiem thu ${index + 1}: noi dung dai de kiem tra cuon noi bo.`;
          row.style.padding = "12px";
          row.style.marginBottom = "8px";
          row.style.border = "1px solid var(--student-v2-divider)";
          row.style.borderRadius = "8px";
          log.appendChild(row);
        }
        log.scrollTop = log.scrollHeight;
      });
      await capture(page, `assistant-long-${width}x${height}`, records);
      await context.close();
    }

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await goto(page, "/app/application?criterion=ethics", "draft");
    const guide = page.getByRole("button", { name: /Xem dieu kien|Xem điều kiện/i }).first();
    if ((await guide.count()) > 0) {
      await guide.click();
      await page.waitForTimeout(300);
      await capture(page, "guide-sheet-1440x900", records);
      await page.keyboard.press("Escape").catch(() => {});
    }
    await goto(page, "/app/application?criterion=academic", "draft");
    const preview = page.getByRole("button", { name: /Xem minh/i }).first();
    if ((await preview.count()) > 0) {
      await preview.click();
      await page.waitForTimeout(500);
      await capture(page, "evidence-full-preview-1440x900", records);
      await page.keyboard.press("Escape").catch(() => {});
    }
    await context.close();
  } finally {
    await browser.close();
  }

  const result = {
    appBaseUrl,
    screenshotCount: records.length,
    records,
    browserErrors,
    ignoredDevServerErrors,
  };
  fs.writeFileSync(
    path.join(outDir, "v2-acceptance-results.json"),
    JSON.stringify(result, null, 2),
  );
  if (browserErrors.length) {
    throw new Error(`Browser errors captured: ${browserErrors.join(" | ")}`);
  }
  console.log(
    JSON.stringify(
      { screenshotCount: records.length, browserErrors: browserErrors.length },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
