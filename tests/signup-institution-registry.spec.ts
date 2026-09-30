import { expect, test, type Page, type Route } from "@playwright/test";

const apiBaseUrl = process.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const institutions = [
  {
    id: "school-dut",
    code: "DUT",
    name: "Đại học Duy Tân",
    shortName: "DUT",
  },
  {
    id: "school-long-name",
    code: "LONG-NAME",
    name: "Trường Cao đẳng Công nghệ Thông tin và Truyền thông Việt - Hàn - Đại học Đà Nẵng",
    shortName: "VKU",
  },
];

test.describe("institution registry signup contract", () => {
  test("loads/searches API schools and displays the complete canonical name only", async ({
    page,
  }) => {
    await installApiRoutes(page, pageRouteHandler({ workspaces: institutions }));
    await page.goto("/signup");

    const selector = page.getByRole("combobox", { name: "Trường / cơ sở đào tạo" });
    await expect(selector).toBeVisible();
    await selector.click();
    await page.getByPlaceholder("Tìm trường/cơ sở đào tạo...").fill("Việt - Hàn");

    const option = page.getByRole("option", { name: institutions[1].name });
    await expect(option).toBeVisible();
    await expect(option).not.toContainText(institutions[1].code);
    await expect(option.locator("span").last()).toHaveCSS("white-space", "normal");
    await expect(option.locator("span").last()).not.toHaveCSS("text-overflow", "ellipsis");
    await option.click();

    await expect(selector).toHaveText(institutions[1].name);
    await expect(selector.locator("span").first()).toHaveCSS("white-space", "normal");
    await expect(page.getByText("Hội Sinh viên Việt Nam TP. Đà Nẵng")).toBeVisible();
    await expect(page.getByRole("combobox")).toHaveCount(1);
  });

  test("reloads workspace eligibility after a server-side workspace rejection", async ({
    page,
  }) => {
    let listingCalls = 0;
    let registrationCalls = 0;
    await page.route(`${apiBaseUrl}/api/**`, async (route) => {
      const request = route.request();
      if (new URL(request.url()).pathname === "/api/workspaces") {
        listingCalls += 1;
        await fulfillData(route, institutions);
        return;
      }
      if (new URL(request.url()).pathname === "/api/auth/register") {
        registrationCalls += 1;
        await fulfillError(route, "WORKSPACE_TYPE_INVALID", "Chỉ trường học mới được đăng ký.");
        return;
      }
      await fulfillData(route, null);
    });
    await page.goto("/signup");
    await page.getByLabel("Họ và tên").fill("Nguyễn Văn A");
    await page.getByLabel("Mã số sinh viên").fill("21IT001");
    await page.getByLabel("Email").fill("student@example.test");
    await page.getByRole("combobox", { name: "Trường / cơ sở đào tạo" }).click();
    await page.getByPlaceholder("Tìm trường/cơ sở đào tạo...").fill("Duy Tân");
    await page.getByRole("option", { name: institutions[0].name }).click();
    await page.locator('input[type="password"]').nth(0).fill("password123");
    await page.locator('input[type="password"]').nth(1).fill("password123");
    const invalidInputs = await page.locator("form").evaluate((form: HTMLFormElement) =>
      Array.from(form.querySelectorAll("input"))
        .filter((input) => !input.validity.valid)
        .map((input) => ({
          placeholder: input.placeholder,
          value: input.value,
          message: input.validationMessage,
        })),
    );
    expect(invalidInputs).toEqual([]);
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();

    await expect.poll(() => registrationCalls).toBe(1);
    await expect.poll(() => listingCalls).toBe(2);
    await expect(page.getByText(/Chỉ trường\/cơ sở đào tạo/)).toBeVisible();
  });

  test("login stays email and password only", async ({ page }) => {
    await installApiRoutes(page, pageRouteHandler({ workspaces: institutions }));
    await page.goto("/login");

    await expect(page.getByPlaceholder("name@example.com")).toBeVisible();
    await expect(page.getByPlaceholder("Password@123")).toBeVisible();
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByText(/chọn trường/i)).toHaveCount(0);
  });
});

function pageRouteHandler(input: { workspaces: typeof institutions }) {
  return async (route: Route) => {
    if (new URL(route.request().url()).pathname === "/api/workspaces") {
      await fulfillData(route, input.workspaces);
      return;
    }
    await fulfillData(route, null);
  };
}

async function installApiRoutes(page: Page, handler: (route: Route) => Promise<void>) {
  await page.route(`${apiBaseUrl}/api/**`, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      return;
    }
    await handler(route);
  });
}

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "authorization,content-type",
};

async function fulfillData(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: corsHeaders,
    body: JSON.stringify({ success: true, data, error: null, meta: {} }),
  });
}

async function fulfillError(route: Route, code: string, message: string) {
  await route.fulfill({
    status: 403,
    contentType: "application/json",
    headers: corsHeaders,
    body: JSON.stringify({ success: false, data: null, error: { code, message }, meta: {} }),
  });
}
