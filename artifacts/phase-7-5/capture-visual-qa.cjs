const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const outDir = path.resolve("artifacts/phase-7-5");
const appBaseUrl = process.env.PHASE75_APP_BASE_URL || "http://127.0.0.1:5173";
const apiBaseUrl = process.env.PHASE75_API_BASE_URL || "http://localhost:8080";
const email = process.env.PLAYWRIGHT_DEMO_EMAIL || "student@dut.udn.vn";
const password = process.env.PLAYWRIGHT_DEMO_PASSWORD || "Password@123";

const allViewports = [
  [1280, 720],
  [1440, 900],
  [768, 1024],
  [390, 844],
];

const allSurfaces = [
  { label: "overview-default", route: "/app" },
  { label: "application-ethics", route: "/app/application?criterion=ethics" },
  { label: "application-academic", route: "/app/application?criterion=academic" },
  { label: "application-physical", route: "/app/application?criterion=physical" },
  { label: "application-volunteer", route: "/app/application?criterion=volunteer" },
  { label: "application-integration", route: "/app/application?criterion=integration" },
  { label: "feedback", route: "/app/feedback" },
  { label: "assistant-empty", route: "/app/assistant" },
];

const selectedLabels = process.env.PHASE75_LABELS?.split(",")
  .map((label) => label.trim())
  .filter(Boolean);
const selectedViewports = process.env.PHASE75_VIEWPORTS?.split(",")
  .map((viewport) => viewport.trim())
  .filter(Boolean);
const surfaces = selectedLabels?.length
  ? allSurfaces.filter((surface) => selectedLabels.includes(surface.label))
  : allSurfaces;
const viewports = selectedViewports?.length
  ? allViewports.filter((viewport) => selectedViewports.includes(`${viewport[0]}x${viewport[1]}`))
  : allViewports;
const observationFile = process.env.PHASE75_OBSERVATIONS_FILE || "observations.json";
const shouldClearOutput = process.env.PHASE75_NO_CLEAR !== "1";

async function loginPayload() {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${await response.text()}`);
  }
  const payload = await response.json();
  if (!payload.data?.accessToken || !payload.data?.refreshToken || !payload.data?.user) {
    throw new Error("Login response did not include auth data");
  }
  return payload.data;
}

async function preparePage(context, auth, viewport) {
  const page = await context.newPage();
  await page.setViewportSize({ width: viewport[0], height: viewport[1] });
  await page.goto(`${appBaseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate((authData) => {
    window.localStorage.setItem("5tot-auth", JSON.stringify({ state: authData, version: 0 }));
  }, auth);
  return page;
}

async function waitForStudentSurface(page, surface) {
  try {
    await page.goto(`${appBaseUrl}${surface.route}`, { waitUntil: "domcontentloaded" });
  } catch (error) {
    if (!String(error).includes("ERR_ABORTED")) throw error;
  }
  await page
    .waitForFunction(
      (label) => {
        const text = document.body?.innerText || "";
        if (
          text.length < 80 ||
          text.includes("Đang kiểm tra phiên đăng nhập") ||
          text.includes("Email đăng nhập")
        ) {
          return false;
        }
        if (label.startsWith("overview"))
          return text.includes("Xin chào") && text.includes("Tiến độ");
        if (label.startsWith("application")) {
          return (
            text.includes("Hồ sơ & minh chứng") &&
            text.includes("5 tiêu chí") &&
            (text.includes("Kiểm tra hồ sơ") ||
              text.includes("Dữ liệu") ||
              text.includes("Minh chứng"))
          );
        }
        if (label.startsWith("feedback"))
          return text.includes("Phản hồi") && text.includes("Hộp thư");
        if (label.startsWith("assistant"))
          return text.includes("Trợ lý") && text.includes("Hỏi về hồ sơ");
        return true;
      },
      surface.label,
      { timeout: 20000 },
    )
    .catch(() => undefined);
  await page.waitForTimeout(900);
}

async function collectObservation(page, label, viewport) {
  return page.evaluate(
    ({ label, viewport }) => {
      const rectOf = (el) => {
        const rect = el.getBoundingClientRect();
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top),
          left: Math.round(rect.left),
        };
      };
      const visible = (el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden";
      };
      const shortText = (el) =>
        (el.innerText || el.getAttribute("aria-label") || el.getAttribute("alt") || el.tagName)
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 80);
      const hasVisibleShadow = (shadow) => {
        if (!shadow || shadow === "none") return false;
        const transparentOnly = shadow
          .replaceAll("rgba(0, 0, 0, 0)", "")
          .replaceAll("0px", "")
          .replace(/[,\s]/g, "");
        return transparentOnly.length > 0;
      };
      const targetSelector = "button,a,input,select,textarea,summary,[role='button'],[role='tab']";
      const smallTargets = Array.from(document.querySelectorAll(targetSelector))
        .filter(visible)
        .map((el) => ({ tag: el.tagName.toLowerCase(), text: shortText(el), ...rectOf(el) }))
        .filter((item) => item.width < 44 || item.height < 44);
      const largeRadii = Array.from(document.querySelectorAll("body *"))
        .filter(visible)
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const radius = Number.parseFloat(getComputedStyle(el).borderTopLeftRadius || "0");
          const circle = radius > 16 && Math.abs(rect.width - rect.height) <= 2;
          const pill = radius > 16 && rect.width >= rect.height * 1.8;
          return {
            tag: el.tagName.toLowerCase(),
            text: shortText(el),
            radius: Math.round(radius),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            exemptShape: circle || pill,
          };
        })
        .filter((item) => item.radius > 16 && !item.exemptShape)
        .slice(0, 20);
      const shadows = Array.from(document.querySelectorAll("body *"))
        .filter(visible)
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: shortText(el),
          boxShadow: getComputedStyle(el).boxShadow,
          ...rectOf(el),
        }))
        .filter((item) => hasVisibleShadow(item.boxShadow))
        .slice(0, 20);
      const bodyText = document.body.innerText || "";
      const rawEnums = bodyText.match(
        /\b(student_research|journal_article|physical_education|healthy_student|sports_activity|foreign_language|international_exchange|supplement_required|not_started|under_review)\b/gi,
      );
      return {
        label,
        viewport,
        title: document.title,
        url: location.href,
        bodySample: bodyText.replace(/\s+/g, " ").trim().slice(0, 240),
        overflowX: Math.max(
          0,
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
        smallTargets,
        largeRadii,
        shadows,
        rawEnums: rawEnums ? Array.from(new Set(rawEnums)) : [],
        images: Array.from(document.images)
          .filter(visible)
          .map((img) => ({
            alt: img.alt,
            objectFit: getComputedStyle(img).objectFit,
            width: Math.round(img.getBoundingClientRect().width),
            height: Math.round(img.getBoundingClientRect().height),
            src: img.currentSrc || img.src,
          })),
      };
    },
    { label, viewport },
  );
}

async function safeScreenshot(page, label, viewport, observations, screenshots) {
  const file = path.join(outDir, `${label}-${viewport}.png`);
  await page.screenshot({ path: file, fullPage: false });
  screenshots.push(file);
  observations.push(await collectObservation(page, label, viewport));
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  if (shouldClearOutput) {
    for (const file of fs.readdirSync(outDir)) {
      if (file.endsWith(".png") || file === "observations.json")
        fs.unlinkSync(path.join(outDir, file));
    }
  }

  const auth = await loginPayload();
  const browser = await chromium.launch({ headless: true });
  const observations = [];
  const screenshots = [];
  const seriousLogs = [];

  try {
    for (const viewport of viewports) {
      const viewportLabel = `${viewport[0]}x${viewport[1]}`;
      const context = await browser.newContext({
        viewport: { width: viewport[0], height: viewport[1] },
      });
      await context.addInitScript((authData) => {
        window.localStorage.setItem("5tot-auth", JSON.stringify({ state: authData, version: 0 }));
      }, auth);

      const page = await preparePage(context, auth, viewport);
      for (const surface of surfaces) {
        console.log(`capture ${surface.label} ${viewportLabel}`);
        page.on("console", (message) => {
          if (message.type() === "error") seriousLogs.push(`${surface.label}: ${message.text()}`);
        });
        page.on("pageerror", (error) => seriousLogs.push(`${surface.label}: ${error.message}`));
        await waitForStudentSurface(page, surface);
        await safeScreenshot(page, surface.label, viewportLabel, observations, screenshots);
        console.log(`saved ${surface.label} ${viewportLabel}`);

        if (surface.label === "application-ethics" && viewportLabel === "1440x900") {
          const guide = page.locator("button[aria-label*='Xem điều kiện']").first();
          if ((await guide.count()) > 0) {
            await guide.click();
            await page.waitForTimeout(500);
            await safeScreenshot(page, "guide-sheet", viewportLabel, observations, screenshots);
            await page.keyboard.press("Escape").catch(() => undefined);
          } else {
            observations.push({
              label: "guide-sheet",
              viewport: viewportLabel,
              missing: "guide trigger not found",
            });
          }

          const preview = page.locator("button[aria-label^='Xem minh chứng']").first();
          if ((await preview.count()) > 0) {
            await preview.click();
            await page.waitForTimeout(700);
            await safeScreenshot(
              page,
              "evidence-full-preview",
              viewportLabel,
              observations,
              screenshots,
            );
            await page.keyboard.press("Escape").catch(() => undefined);
          } else {
            observations.push({
              label: "evidence-full-preview",
              viewport: viewportLabel,
              missing: "evidence preview trigger not found",
            });
          }
        }

        if (surface.label === "assistant-empty" && viewportLabel === "390x844") {
          await page.evaluate(() => {
            const log = document.querySelector("[role='log']");
            if (!log) return;
            for (let i = 0; i < 22; i += 1) {
              const wrapper = document.createElement("div");
              wrapper.className =
                i % 2 === 0 ? "flex max-w-full gap-3" : "flex max-w-full gap-3 justify-end";
              const bubble = document.createElement("div");
              bubble.textContent = `Tin nhắn kiểm thử ${i + 1}: nội dung dài để xác nhận khung hội thoại cuộn bên trong và composer vẫn ở cuối màn hình.`;
              bubble.style.maxWidth = "300px";
              bubble.style.padding = "12px 16px";
              bubble.style.borderRadius = "8px";
              bubble.style.background =
                i % 2 === 0
                  ? "var(--student-v2-surface-selected)"
                  : "var(--student-v2-primary-action-blue)";
              bubble.style.color =
                i % 2 === 0 ? "var(--student-v2-text-primary)" : "var(--student-v2-text-inverse)";
              wrapper.appendChild(bubble);
              log.appendChild(wrapper);
            }
            log.scrollTop = log.scrollHeight;
          });
          await page.waitForTimeout(300);
          await safeScreenshot(
            page,
            "assistant-long-conversation",
            viewportLabel,
            observations,
            screenshots,
          );
        }
      }

      await page.close();
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const result = { screenshots, observations, seriousLogs };
  fs.writeFileSync(path.join(outDir, observationFile), JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify(
      {
        screenshotCount: screenshots.length,
        observationCount: observations.length,
        seriousLogCount: seriousLogs.length,
        outDir,
      },
      null,
      2,
    ),
  );
})();
