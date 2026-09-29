import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAwardDecisionTitle,
  getAwardDecisionStatusPresentation,
  getAwardMatchPresentation,
  getAwardPreviewSummary,
  getAwardRowPresentation,
} from "../presentation.ts";

describe("Award Registry presentation", () => {
  it("uses a meaningful business title with a safe fallback", () => {
    assert.equal(getAwardDecisionTitle("10"), "Quyết định công nhận số 10");
    assert.equal(getAwardDecisionTitle("  05/QĐ-ĐTN  "), "Quyết định công nhận số 05/QĐ-ĐTN");
    assert.equal(getAwardDecisionTitle(null), "Quyết định công nhận");
    assert.equal(getAwardDecisionTitle(""), "Quyết định công nhận");
  });

  it("keeps the exact lifecycle states while showing Vietnamese business labels", () => {
    assert.deepEqual(getAwardDecisionStatusPresentation("DRAFT"), {
      label: "Bản nháp",
      description: "Đang hoàn thiện quyết định và dữ liệu sinh viên.",
      tone: "warning",
    });
    assert.deepEqual(getAwardDecisionStatusPresentation("CONFIRMED"), {
      label: "Đã xác nhận",
      description: "Dữ liệu công nhận đã trở thành dữ liệu chính thức.",
      tone: "success",
    });
    assert.deepEqual(getAwardDecisionStatusPresentation("ARCHIVED"), {
      label: "Đã lưu trữ",
      description: "Dữ liệu được giữ lại nhưng hiện không có hiệu lực sử dụng.",
      tone: "muted",
    });
  });

  it("explains matching states without treating them as lifecycle states", () => {
    assert.equal(getAwardMatchPresentation("MATCHED").label, "Đã xác định sinh viên tương ứng");
    assert.equal(getAwardMatchPresentation("UNMATCHED").label, "Chưa tìm thấy sinh viên phù hợp");
    assert.equal(getAwardMatchPresentation("CONFLICT").label, "Có dữ liệu cần kiểm tra");
  });

  it("derives deterministic issue groups from the current preview response", () => {
    assert.equal(
      getAwardRowPresentation({
        status: "VALID",
        matchStatus: "MATCHED",
        errors: [],
      }).key,
      "valid",
    );
    assert.equal(
      getAwardRowPresentation({
        status: "VALID",
        matchStatus: "UNMATCHED",
        errors: [],
      }).key,
      "warning",
    );
    assert.equal(
      getAwardRowPresentation({
        status: "INVALID",
        matchStatus: "CONFLICT",
        errors: ["STUDENT_CODE_REQUIRED"],
      }).key,
      "missing_student_code",
    );
    assert.equal(
      getAwardRowPresentation({
        status: "INVALID",
        matchStatus: "CONFLICT",
        errors: ["FULL_NAME_REQUIRED"],
      }).key,
      "invalid",
    );
    assert.equal(
      getAwardRowPresentation({
        status: "DUPLICATE",
        matchStatus: "MATCHED",
        errors: [],
      }).key,
      "duplicate",
    );
    assert.equal(
      getAwardRowPresentation({
        status: "CONFLICT",
        matchStatus: "CONFLICT",
        errors: ["INSTITUTION_CONTEXT_UNRESOLVED"],
      }).key,
      "needs_manual_review",
    );
  });

  it("keeps the server summary counts and exposes attention separately", () => {
    assert.deepEqual(
      getAwardPreviewSummary({
        total: 12,
        valid: 8,
        invalid: 2,
        duplicate: 1,
        conflict: 1,
        matched: 6,
        unmatched: 2,
      }),
      {
        total: 12,
        valid: 8,
        attention: 3,
        invalid: 2,
        duplicate: 1,
        matched: 6,
        unmatched: 2,
      },
    );
  });
});
