import { expect, test, type Browser, type Page } from "@playwright/test";

const apiBaseUrl = process.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const password = process.env.PLAYWRIGHT_DEMO_PASSWORD ?? "Password@123";

const seriousConsolePatterns = [
  /uncaught/i,
  /hydration/i,
  /failed to fetch dynamically imported module/i,
  /loading chunk \d+ failed/i,
  /cannot read properties/i,
];

const errorBoundaryPatterns =
  /Unexpected Application Error|Application Error|Cannot read properties|Failed to fetch dynamically imported module|Loading chunk \d+ failed/i;

const studentRoutes = [
  "/app",
  "/app/application",
  "/app/feedback",
  "/app/assistant",
  "/app/wizard",
  "/app/ai-precheck",
  "/app/cascade",
  "/app/evidence",
  "/app/upload",
  "/app/chatbot",
];

const responsiveViewports = [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
];

const roleSmokeCases = [
  { label: "officer queue/detail", email: "officer.academic@dut.udn.vn", routes: ["/app/queue"] },
  {
    label: "manager dashboard",
    email: "manager@dut.udn.vn",
    routes: ["/app/manager", "/app/analytics"],
  },
  { label: "committee resolution", email: "committee@dut.udn.vn", routes: ["/app/resolution"] },
  { label: "collective", email: "classrep@dut.udn.vn", routes: ["/app/collective"] },
  { label: "admin workspace", email: "admin@dut.udn.vn", routes: ["/app/admin/workspaces"] },
];

test.describe("presentation semantics acceptance", () => {
  test.setTimeout(90_000);

  test("student route matrix does not crash with V2 enabled", async ({ page }) => {
    await loginAs(page, "student@dut.udn.vn");

    for (const route of studentRoutes) {
      await smokeRoute(page, route);
    }
  });

  for (const roleCase of roleSmokeCases) {
    test(`role route smoke: ${roleCase.label}`, async ({ browser }) => {
      await smokeRole(browser, roleCase.email, roleCase.routes);
    });
  }

  test("student application route has no document overflow across acceptance viewports", async ({
    page,
  }) => {
    await loginAs(page, "student@dut.udn.vn");

    for (const viewport of responsiveViewports) {
      await page.setViewportSize(viewport);
      await smokeRoute(page, "/app/application");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(1);
    }
  });
});

async function smokeRole(browser: Browser, email: string, routes: string[]) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await loginAs(page, email);
    for (const route of routes) {
      await smokeRoute(page, route);
    }
  } finally {
    await context.close();
  }
}

async function loginAs(page: Page, email: string) {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  expect(response.ok, `login ${email}`).toBeTruthy();
  const payload = (await response.json()) as {
    data?: { user?: unknown; accessToken?: string; refreshToken?: string };
  };
  expect(payload.data?.user, `login user ${email}`).toBeTruthy();
  expect(payload.data?.accessToken, `login access token ${email}`).toBeTruthy();
  expect(payload.data?.refreshToken, `login refresh token ${email}`).toBeTruthy();

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.evaluate((auth) => {
    window.localStorage.setItem("5tot-auth", JSON.stringify({ state: auth, version: 0 }));
  }, payload.data);
}

async function smokeRoute(page: Page, route: string) {
  const seriousErrors: string[] = [];
  const onConsole = (message: { type: () => string; text: () => string }) => {
    if (
      message.type() === "error" &&
      seriousConsolePatterns.some((pattern) => pattern.test(message.text()))
    ) {
      seriousErrors.push(message.text());
    }
  };
  const onPageError = (error: Error) => seriousErrors.push(error.message);

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  try {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.locator("body").waitFor({ state: "visible", timeout: 10_000 });

    const bodyText = await page.locator("body").innerText({ timeout: 7_500 });
    expect(bodyText.trim().length, `${route} body text`).toBeGreaterThan(20);
    expect(bodyText, `${route} error boundary`).not.toMatch(errorBoundaryPatterns);
    expect(seriousErrors, `${route} serious console/page errors`).toEqual([]);
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }
}
