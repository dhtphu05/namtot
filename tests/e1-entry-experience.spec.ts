import { expect, test, type Route } from "@playwright/test";

const school = {
  id: "school-dut",
  code: "DUT",
  name: "Trường Đại học Bách khoa - Đại học Đà Nẵng",
  shortName: "DUT",
};

test.describe("E1 public entry", () => {
  test("landing shows the institutional identity, entry links and exactly five shared criteria", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1, name: "5TOT Đà Nẵng" })).toBeVisible();
    await expect(
      page.getByText("Hệ thống quản lý và xét chọn Sinh viên 5 tốt cấp Thành phố"),
    ).toBeVisible();
    await expect(page.getByText("Hội Sinh viên Việt Nam thành phố Đà Nẵng").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Đăng nhập hệ thống" }).first()).toHaveAttribute(
      "href",
      "/login",
    );
    await expect(
      page.getByRole("link", { name: "Tạo tài khoản sinh viên" }).first(),
    ).toHaveAttribute("href", "/signup");
    await expect(page.locator("#tieu-chi > ol > li")).toHaveCount(5);
    for (const criterion of [
      "Đạo đức tốt",
      "Học tập tốt",
      "Thể lực tốt",
      "Tình nguyện tốt",
      "Hội nhập tốt",
    ]) {
      await expect(page.locator("#tieu-chi")).toContainText(criterion);
    }
    await expect(page.getByText(/10\.000|50 trường|99%|98%/)).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Try AI|Explore Platform/i })).toHaveCount(0);
  });

  test("login starts blank, toggles password visibility and maps credential errors safely", async ({
    page,
  }) => {
    await page.route("http://localhost:8080/api/auth/login", async (route) => {
      await apiResponse(route, 401, null, {
        code: "INVALID_CREDENTIALS",
        message: "Invalid credentials",
      });
    });

    await page.goto("/login");
    const email = page.getByLabel("Email");
    const password = page.getByRole("textbox", { name: "Mật khẩu", exact: true });
    await expect(email).toHaveValue("");
    await expect(password).toHaveValue("");
    await expect(password).toHaveAttribute("autocomplete", "current-password");

    await password.fill("correcthorsebattery");
    await page.getByRole("button", { name: "Hiện mật khẩu" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Ẩn mật khẩu" }).click();
    await expect(password).toHaveAttribute("type", "password");

    await email.fill("student@example.edu.vn");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page.getByRole("alert")).toHaveText("Email hoặc mật khẩu chưa đúng.");
    await expect(page.getByText(/INVALID_CREDENTIALS|Invalid credentials|401/)).toHaveCount(0);
  });

  test("student signup uses the registration API, searchable server list and backend payload", async ({
    page,
  }) => {
    let registerBody: Record<string, unknown> | undefined;
    await page.route("http://localhost:8080/api/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname === "/api/workspaces" && url.searchParams.get("registration") === "true") {
        await apiResponse(route, 200, [school]);
      } else if (url.pathname === "/api/auth/register" && request.method() === "POST") {
        registerBody = request.postDataJSON() as Record<string, unknown>;
        await apiResponse(route, 201, {
          user: studentUser(),
          accessToken: "e1-access-token",
          refreshToken: "e1-refresh-token",
        });
      } else {
        await apiResponse(route, 200, null);
      }
    });

    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: "Tạo tài khoản sinh viên" })).toBeVisible();
    await expect(page.locator("select")).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Trường / cơ sở đào tạo" })).toBeVisible();
    await expect(page.getByLabel("Mã số sinh viên")).toBeVisible();

    await page.getByLabel("Họ và tên").fill("Nguyễn An");
    await page.getByLabel("Mã số sinh viên").fill("SV123");
    await page.getByLabel("Email").fill("an@example.edu.vn");
    await page.getByRole("combobox", { name: "Trường / cơ sở đào tạo" }).click();
    await page.getByRole("combobox", { name: "Tìm trường / cơ sở đào tạo" }).fill("Bách khoa");
    await page.getByRole("option", { name: /Trường Đại học Bách khoa - Đại học Đà Nẵng/ }).click();
    await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("12345678");
    await page.getByRole("textbox", { name: "Xác nhận mật khẩu", exact: true }).fill("12345678");
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();

    await expect
      .poll(() => registerBody)
      .toEqual({
        fullName: "Nguyễn An",
        studentCode: "SV123",
        email: "an@example.edu.vn",
        password: "12345678",
        workspaceId: school.id,
      });
    await expect(page).toHaveURL(/\/app(?:\/)?$/);
    expect(registerBody).not.toHaveProperty("role");
  });

  test("signup reports confirmation and duplicate conflicts inline", async ({ page }) => {
    await page.route("http://localhost:8080/api/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname === "/api/workspaces" && url.searchParams.get("registration") === "true") {
        await apiResponse(route, 200, [school]);
      } else if (url.pathname === "/api/auth/register" && request.method() === "POST") {
        await apiResponse(route, 409, null, { code: "CONFLICT", message: "Conflict" });
      } else {
        await apiResponse(route, 200, null);
      }
    });

    await page.goto("/signup");
    await page.getByLabel("Họ và tên").fill("Nguyễn An");
    await page.getByLabel("Mã số sinh viên").fill("SV123");
    await page.getByLabel("Email").fill("an@example.edu.vn");
    await page.getByRole("combobox", { name: "Trường / cơ sở đào tạo" }).click();
    await page.getByRole("option", { name: /Trường Đại học Bách khoa - Đại học Đà Nẵng/ }).click();
    await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("12345678");
    await page.getByRole("textbox", { name: "Xác nhận mật khẩu", exact: true }).fill("87654321");
    await expect(page.getByText("Mật khẩu xác nhận chưa khớp.")).toBeVisible();
    await page.getByRole("textbox", { name: "Xác nhận mật khẩu", exact: true }).fill("12345678");
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "Email hoặc mã số sinh viên đã được đăng ký. Vui lòng kiểm tra lại hoặc đăng nhập.",
    );
  });

  test("public entry routes have no horizontal overflow at desktop and narrow widths", async ({
    page,
  }) => {
    await page.route("http://localhost:8080/api/**", async (route) => {
      const url = new URL(route.request().url());
      await apiResponse(route, 200, url.pathname === "/api/workspaces" ? [school] : null);
    });

    for (const width of [375, 768, 1280, 1366, 1440, 1600, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/", "/login", "/signup"]) {
        await page.goto(path);
        await expect(page.locator("main")).toBeVisible();
        const horizontalOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        );
        expect(horizontalOverflow, `${path} overflows at ${width}px`).toBe(false);
      }
    }
  });
});

async function apiResponse(route: Route, status: number, data: unknown, error: unknown = null) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify({ success: status < 400, data, error, meta: {} }),
  });
}

function studentUser() {
  return {
    id: "e1-student",
    workspaceId: school.id,
    email: "an@example.edu.vn",
    role: "student",
    fullName: "Nguyễn An",
    studentCode: "SV123",
    className: null,
    faculty: null,
    phone: null,
    avatarUrl: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: "2026-09-30T00:00:00.000Z",
    updatedAt: "2026-09-30T00:00:00.000Z",
    workspace: school,
  };
}
