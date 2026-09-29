import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  coreCriterionKeys,
  getCoreCriterionKey,
  getCoreCriterionLabel,
} from "../criteria-presentation.ts";
import { getRoleNavigation } from "../role-navigation.ts";
import { getStatusPresentation } from "../status-labels.ts";

describe("5TOT criterion presentation", () => {
  it("defines exactly the five individual award criteria", () => {
    assert.deepEqual(coreCriterionKeys, [
      "ethics",
      "academic",
      "physical",
      "volunteer",
      "integration",
    ]);
    assert.equal(getCoreCriterionKey("priority"), null);
  });

  it("keeps legacy criterion aliases and safely labels unknown values", () => {
    assert.equal(getCoreCriterionKey("dao-duc"), "ethics");
    assert.equal(getCoreCriterionLabel("ethics"), "Đạo đức tốt");
    assert.equal(getCoreCriterionLabel("priority"), "Chưa rõ tiêu chí");
    assert.equal(getCoreCriterionLabel(undefined), "Chưa rõ tiêu chí");
  });
});

describe("status presentation domains", () => {
  it("uses the status meaning from its own backend domain", () => {
    assert.deepEqual(getStatusPresentation("reviewTask", "accepted"), {
      label: "Đã đạt",
      tone: "success",
    });
    assert.deepEqual(getStatusPresentation("evidence", "accepted"), {
      label: "Đã duyệt",
      tone: "success",
    });
    assert.deepEqual(getStatusPresentation("processing", "processing"), {
      label: "Đang xử lý",
      tone: "brand",
    });
  });

  it("does not surface an unknown backend status key", () => {
    assert.deepEqual(getStatusPresentation("resolution", "unexpected_state"), {
      label: "Chưa rõ",
      tone: "muted",
    });
  });
});

describe("role navigation", () => {
  const targetRoles = [
    "student",
    "data_uploader",
    "city_officer",
    "city_manager",
    "city_committee",
    "admin",
  ] as const;

  for (const role of targetRoles) {
    it(`${role} has only one navigation item per route`, () => {
      const routes = getRoleNavigation(role).flatMap((group) => group.items.map((item) => item.to));
      assert.equal(new Set(routes).size, routes.length);
    });
  }

  it("keeps legacy officer access distinct from the target City Officer menu", () => {
    const officerRoutes = getRoleNavigation("officer").flatMap((group) =>
      group.items.map((item) => item.to),
    );
    const cityOfficerRoutes = getRoleNavigation("city_officer").flatMap((group) =>
      group.items.map((item) => item.to),
    );
    assert.ok(officerRoutes.includes("/app/evidence-knowledge"));
    assert.deepEqual(cityOfficerRoutes, ["/app/queue", "/app/resolution"]);
  });

  it("keeps admin criteria read-only in navigation and omits unsupported pages", () => {
    const admin = getRoleNavigation("admin").flatMap((group) => group.items);
    assert.ok(admin.some((item) => item.to === "/app/settings" && item.label.includes("chỉ đọc")));
    assert.ok(!admin.some((item) => item.to === "/app/award-registry" || item.to === "/app"));
  });
});
