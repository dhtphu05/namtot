import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildS5CriterionReviews,
  getStudentCitySubmissionGate,
  selectS5AdvisoryRecommendations,
  type S5GateInput,
} from "../precheck-review.ts";

const openWindow = {
  applicationId: "app-1",
  schoolYear: "2025-2026",
  submission: {
    status: "OPEN" as const,
    opensAt: "2026-09-01T00:00:00.000Z",
    closesAt: "2026-10-15T13:00:00.000Z",
    effectiveClosesAt: "2026-10-15T13:00:00.000Z",
    exceptionActive: false,
    exceptionValidUntil: null,
  },
  review: { deadlineAt: null, status: "NOT_CONFIGURED" as const },
  supplement: { deadlineAt: null, status: "NOT_CONFIGURED" as const },
  finalization: { deadlineAt: null, status: "NOT_CONFIGURED" as const },
};

const directCityEligible = {
  applicationId: "app-1",
  schoolYear: "2025-2026",
  route: "DIRECT_CITY" as const,
  status: "ELIGIBLE" as const,
  reasons: [],
};

const baseGate: S5GateInput = {
  applicationStatus: "draft",
  submittedAt: null,
  eligibility: directCityEligible,
  eligibilityLoading: false,
  eligibilityError: false,
  deadline: openWindow,
  deadlineLoading: false,
  deadlineError: false,
};

test("shows the five core criteria in their canonical order and ignores priority", () => {
  const rows = buildS5CriterionReviews([
    { criterion: "academic", status: "precheck_warning", evidenceCount: 2 },
    { criterion: "priority", status: "rejected", evidenceCount: 10 },
    { criterion: "ethics", status: "not_started", evidenceCount: 0 },
  ] as never);

  assert.deepEqual(
    rows.map((row) => row.criterion),
    ["ethics", "academic", "physical", "volunteer", "integration"],
  );
  assert.equal(rows[0]?.evidenceCount, 0);
  assert.equal(rows[1]?.evidenceCount, 2);
  assert.equal(rows[1]?.informationLabel, "Có thể kiểm tra thêm");
  assert.equal(rows[0]?.informationLabel, "Chưa thêm minh chứng");
  assert.ok(rows.every((row) => !/đạt|không đạt|pass|fail/i.test(row.informationLabel)));
});

test("unknown completion statuses use a Vietnamese fallback without exposing the status", () => {
  const [ethics] = buildS5CriterionReviews([
    { criterion: "ethics", status: "new_internal_state" },
  ] as never);

  assert.equal(ethics?.informationLabel, "Đang cập nhật thông tin");
  assert.ok(!ethics?.informationLabel.includes("new_internal_state"));
});

test("turns precheck findings into gentle criterion-linked advisory copy", () => {
  const recommendations = selectS5AdvisoryRecommendations({
    missingItems: [
      { criterion: "academic", code: "MISSING_EVIDENCE" },
      { criterion: "integration", code: "LOW_CONFIDENCE_EVIDENCE" },
      { criterion: "priority", code: "MISSING_EVIDENCE" },
    ],
    warnings: [],
    criteriaResults: [],
  } as never);

  assert.equal(recommendations.length, 2);
  assert.deepEqual(
    recommendations.map((item) => item.criterion),
    ["academic", "integration"],
  );
  assert.equal(recommendations[0]?.criterion, "academic");
  assert.equal(recommendations[0]?.href, "/app/application?criterion=academic");
  assert.ok(recommendations.every((item) => /có thể|kiểm tra|đối chiếu/i.test(item.description)));
  assert.ok(recommendations.every((item) => !/đạt|không đạt|pass|fail/i.test(item.description)));
});

test("unknown recommendation codes become safe generic copy", () => {
  const [recommendation] = selectS5AdvisoryRecommendations({
    missingItems: [{ criterion: "physical", code: "INTERNAL_RULE_FAILURE" }],
    warnings: [],
    criteriaResults: [],
  } as never);

  assert.equal(recommendation?.description, "Bạn có thể kiểm tra thêm thông tin ở phần này.");
  assert.ok(!recommendation?.description.includes("INTERNAL_RULE_FAILURE"));
});

test("one or many advisory warnings never alter an otherwise open hard gate", () => {
  const clear = selectS5AdvisoryRecommendations({
    missingItems: [],
    warnings: [],
    criteriaResults: [],
  } as never);
  const several = selectS5AdvisoryRecommendations({
    missingItems: [
      { criterion: "academic", code: "MISSING_EVIDENCE" },
      { criterion: "volunteer", code: "OCR_FAILED" },
    ],
    warnings: ["Có thể kiểm tra lại tệp minh chứng."],
    criteriaResults: [],
  } as never);

  assert.equal(
    getStudentCitySubmissionGate({ ...baseGate, advisoryCount: clear.length }).allowed,
    true,
  );
  assert.equal(
    getStudentCitySubmissionGate({ ...baseGate, advisoryCount: several.length }).allowed,
    true,
  );
});

test("Direct City and confirmed UDN routes can submit when the server window is open", () => {
  assert.equal(getStudentCitySubmissionGate(baseGate).allowed, true);
  assert.equal(
    getStudentCitySubmissionGate({
      ...baseGate,
      eligibility: { ...directCityEligible, route: "UDN_PREREQUISITE" },
    }).allowed,
    true,
  );
});

test("real UDN eligibility states block submission with distinct gentle reasons", () => {
  const notMatched = getStudentCitySubmissionGate({
    ...baseGate,
    eligibility: { ...directCityEligible, route: "UDN_PREREQUISITE", status: "NOT_ELIGIBLE" },
  });
  const pending = getStudentCitySubmissionGate({
    ...baseGate,
    eligibility: {
      ...directCityEligible,
      route: "UDN_PREREQUISITE",
      status: "NEEDS_VERIFICATION",
    },
  });

  assert.equal(notMatched.allowed, false);
  assert.equal(notMatched.reason, "eligibility_not_matched");
  assert.equal(pending.allowed, false);
  assert.equal(pending.reason, "eligibility_verification");
});

test("unknown, loading, or failed hard-gate data fails closed", () => {
  for (const input of [
    { ...baseGate, eligibility: null },
    { ...baseGate, eligibilityLoading: true },
    { ...baseGate, eligibilityError: true },
    { ...baseGate, deadline: null },
    { ...baseGate, deadlineLoading: true },
    { ...baseGate, deadlineError: true },
  ]) {
    assert.equal(getStudentCitySubmissionGate(input).allowed, false);
  }
});

test("not configured, not open, and closed windows block; an active exception allows", () => {
  for (const status of ["NOT_CONFIGURED", "NOT_OPEN", "CLOSED"] as const) {
    assert.equal(
      getStudentCitySubmissionGate({
        ...baseGate,
        deadline: { ...openWindow, submission: { ...openWindow.submission, status } },
      }).allowed,
      false,
      status,
    );
  }
  assert.equal(
    getStudentCitySubmissionGate({
      ...baseGate,
      deadline: {
        ...openWindow,
        submission: { ...openWindow.submission, status: "EXCEPTION_ACTIVE" },
      },
    }).allowed,
    true,
  );
});

test("submitted, unsupported, and unknown lifecycle states do not offer a first submit", () => {
  assert.equal(
    getStudentCitySubmissionGate({ ...baseGate, submittedAt: "2026-09-01" }).reason,
    "already_submitted",
  );
  assert.equal(
    getStudentCitySubmissionGate({ ...baseGate, applicationStatus: "supplement_required" }).reason,
    "lifecycle_not_submittable",
  );
  assert.equal(
    getStudentCitySubmissionGate({ ...baseGate, applicationStatus: "new_status" }).reason,
    "lifecycle_not_submittable",
  );
});
