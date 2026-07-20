import assert from "node:assert/strict";
import test from "node:test";
import type { PrecheckResult } from "@/lib/api/types";
import { buildCriterionSummary } from "../submit-confirmation-summary";

test("evidence count alone is not presented as criterion completion", () => {
  const summary = buildCriterionSummary("academic", 2, null);

  assert.equal(summary.label, "Chờ kết quả kiểm tra");
  assert.equal(summary.tone, "brand");
  assert.equal(summary.requiredAttention, false);
  assert.match(summary.explanation, /2 minh chứng/);
  assert.doesNotMatch(summary.label, /Đủ dữ liệu/);
});

test("missing precheck item still requires attention", () => {
  const summary = buildCriterionSummary("ethics", 1, {
    missingItems: [
      {
        criterion: "ethics",
        code: "conduct_score_missing",
        message: "missing",
        severity: "warning",
      },
    ],
  } as PrecheckResult);

  assert.equal(summary.label, "Cần bổ sung");
  assert.equal(summary.tone, "warning");
  assert.equal(summary.requiredAttention, true);
});

test("passed precheck result outranks evidence metadata", () => {
  const summary = buildCriterionSummary("volunteer", 1, {
    criteriaResults: [
      {
        criterion: "volunteer",
        status: "passed",
        passed: true,
        reasons: ["Đáp ứng tiêu chí tình nguyện"],
      },
    ],
  } as PrecheckResult);

  assert.equal(summary.tone, "success");
  assert.equal(summary.requiredAttention, false);
  assert.match(summary.explanation, /Đáp ứng/);
});
