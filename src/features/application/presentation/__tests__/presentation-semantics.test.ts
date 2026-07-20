import assert from "node:assert/strict";
import test from "node:test";
import type {
  Criterion,
  CriterionCompletionItem,
  RequirementGroup,
  RequirementItem,
} from "@/lib/api/types";
import {
  formatSourceList,
  getActionPresentation,
  getEvidenceDisplayModel,
  getRequirementGroupPresentation,
  getRequirementPresentation,
  getSourcePresentation,
  getStudentCriterionDisplayState,
} from "../index";

test("final passed overrides completion warning", () => {
  const state = getStudentCriterionDisplayState({
    criterion: "academic",
    application: { finalStatus: "passed" },
    completion: completion("academic", "needs_verification"),
  });
  assert.equal(state.source, "final_result");
  assert.equal(state.status, "accepted");
  assert.equal(state.tone, "good");
});

test("final rejected overrides completion ready", () => {
  const state = getStudentCriterionDisplayState({
    criterion: "volunteer",
    application: { finalStatus: "failed" },
    completion: completion("volunteer", "ready_for_precheck"),
  });
  assert.equal(state.source, "final_result");
  assert.equal(state.status, "rejected");
});

test("review accepted overrides needs_verification", () => {
  const state = getStudentCriterionDisplayState({
    criterion: "ethics",
    reviewTask: { decision: "accepted", status: "completed" },
    completion: completion("ethics", "needs_verification"),
  });
  assert.equal(state.source, "review_decision");
  assert.equal(state.status, "accepted");
  assert.equal(state.label, "Đã xác nhận");
});

test("supplement overrides completion ready", () => {
  const state = getStudentCriterionDisplayState({
    criterion: "physical",
    supplementRequest: { criterion: "physical", reason: "Thiếu ngày cấp" },
    completion: completion("physical", "ready_for_precheck"),
  });
  assert.equal(state.source, "supplement_request");
  assert.equal(state.status, "supplement_required");
  assert.equal(state.description, "Thiếu ngày cấp");
});

test("resolution overrides completion", () => {
  const state = getStudentCriterionDisplayState({
    criterion: "integration",
    application: { status: "resolution_needed" },
    completion: completion("integration", "ready_for_precheck"),
  });
  assert.equal(state.source, "resolution");
  assert.equal(state.primaryAction?.isInteractive, false);
});

test("under_review overrides completion", () => {
  const state = getStudentCriterionDisplayState({
    criterion: "academic",
    application: { status: "under_review" },
    completion: completion("academic", "ready_for_precheck"),
  });
  assert.equal(state.source, "review_status");
  assert.equal(state.status, "under_review");
});

test("completion fallback", () => {
  const state = getStudentCriterionDisplayState({
    criterion: "ethics",
    completion: completion("ethics", "in_progress"),
  });
  assert.equal(state.source, "completion");
  assert.equal(state.status, "in_progress");
});

test("ONE_OF empty", () => {
  const group = oneOfGroup([]);
  const presentation = getRequirementGroupPresentation(group);
  assert.equal(presentation.progressLabel, "Chưa chọn hình thức đáp ứng");
  assert.match(presentation.description, /Chọn ít nhất một/);
});

test("ONE_OF selected", () => {
  const group = oneOfGroup([requirement("healthy_student_title", "needs_verification")]);
  const presentation = getRequirementGroupPresentation(group);
  assert.equal(presentation.progressLabel, "Đang hoàn thiện: Danh hiệu Sinh viên khỏe");
  assert.doesNotMatch(presentation.progressLabel, /\/5|\/4/);
});

test("ONE_OF declared", () => {
  const group = oneOfGroup([requirement("sports_team_member", "declared")]);
  const presentation = getRequirementGroupPresentation(group);
  assert.equal(presentation.progressLabel, "1 hình thức đã khai báo");
});

test("AT_LEAST_N", () => {
  const presentation = getRequirementGroupPresentation({
    key: "academic_additional",
    title: "Thành tích",
    operator: "at_least_n",
    requiredCount: 2,
    optional: false,
    requirements: [
      requirement("student_research", "verified"),
      requirement("academic_competition", "not_started"),
      requirement("academic_award", "not_started"),
    ],
  });
  assert.equal(presentation.requiredCount, 2);
  assert.equal(presentation.progressLabel, "Còn 1 mục cần hoàn thiện");
});

test("aggregation verified/pending", () => {
  const presentation = getRequirementGroupPresentation({
    key: "volunteer_days",
    title: "Ngày tình nguyện",
    operator: "all_of",
    optional: false,
    requirements: [
      {
        ...requirement("accumulated_volunteer_days", "needs_verification"),
        aggregation: {
          verifiedTotal: 2,
          pendingVerificationTotal: 1,
          excludedTotal: 0,
          unit: "ngày",
          threshold: 3,
          activities: [],
        },
      },
    ],
  });
  assert.equal(presentation.progressLabel, "Tổng đã xác nhận 2/3 ngày");
  assert.match(presentation.description, /chờ xác minh 1 ngày/);
});

test("optional group", () => {
  const presentation = getRequirementGroupPresentation({
    key: "ethics_additional",
    title: "Bổ sung",
    operator: "one_of",
    optional: true,
    requirements: [],
  });
  assert.equal(presentation.progressLabel, "Không bắt buộc ở cấp hiện tại");
});

test("unknown requirement", () => {
  const presentation = getRequirementPresentation({ key: "raw_backend_key", title: "RAW_BACKEND" });
  assert.equal(presentation.label, "Điều kiện theo cấu hình hiện tại");
  assert.equal(presentation.isFallback, true);
});

test("unknown source", () => {
  assert.equal(getSourcePresentation("secret_source"), "Nguồn dữ liệu khác");
  assert.equal(
    formatSourceList(["system_data", "manual_metric"]),
    "Dữ liệu nhà trường hoặc Sinh viên khai báo",
  );
});

test("unknown action", () => {
  const action = getActionPresentation({ type: "dangerous_backend_action", label: "raw" });
  assert.equal(action?.isInteractive, false);
  assert.equal(action?.label, "Xem hồ sơ");
});

test("waiting action non-interactive", () => {
  const action = getActionPresentation({ type: "wait_for_confirmation" });
  assert.equal(action?.isInteractive, false);
  assert.equal(action?.label, "Đang chờ nhà trường/cán bộ xác nhận");
});

test("legacy evidence", () => {
  const display = getEvidenceDisplayModel({
    id: "ev1",
    evidenceName: "",
    criterion: "academic",
    sourceType: "unknown_source",
    status: "draft",
  });
  assert.equal(display.typeLabel, "Chưa phân loại");
  assert.equal(display.sourceLabel, "Nguồn dữ liệu khác");
});

test("filename not primary when evidenceName exists", () => {
  const display = getEvidenceDisplayModel({
    evidenceName: "Giấy chứng nhận Mùa hè xanh",
    criterion: "volunteer",
    sourceType: "manual_upload",
    status: "indexed",
    files: [{ originalName: "private-file-name.pdf" }],
  });
  assert.equal(display.title, "Giấy chứng nhận Mùa hè xanh");
  assert.equal(display.originalFilename, "private-file-name.pdf");
});

test("Vietnamese encoding", () => {
  assert.equal(getRequirementPresentation({ key: "foreign_language" }).label, "Ngoại ngữ");
  assert.equal(getSourcePresentation("manual_evidence"), "Sinh viên tải lên");
});

function completion(
  criterion: Criterion,
  status: CriterionCompletionItem["status"],
): CriterionCompletionItem {
  return {
    criterion,
    title: "",
    description: "",
    status,
    requirementGroups: [
      {
        key: `${criterion}_foundation`,
        title: "Nền tảng",
        operator: "all_of",
        optional: false,
        requirements: [requirement("conduct_score", "verified")],
      },
    ],
    completion: { satisfied: status === "not_started" ? 0 : 1, required: 2, needsVerification: 1 },
    evidenceCount: 0,
    nextAction: { type: "wait_for_confirmation", label: "raw wait" },
  };
}

function oneOfGroup(selected: RequirementItem[]): RequirementGroup {
  const defaults = [
    requirement("physical_course_result", "not_started"),
    requirement("healthy_student_title", "not_started"),
    requirement("sports_activity_or_award", "not_started"),
    requirement("sports_team_member", "not_started"),
    requirement("regular_sports_training", "not_started"),
  ];
  const selectedMap = new Map(selected.map((item) => [item.key, item]));
  return {
    key: "physical_path",
    title: "Cách chứng minh",
    operator: "one_of",
    optional: false,
    requirements: defaults.map((item) => selectedMap.get(item.key) ?? item),
  };
}

function requirement(key: string, status: RequirementItem["status"]): RequirementItem {
  return {
    key,
    title: key,
    type: "evidence",
    status,
    optional: false,
    acceptedSources: ["manual_evidence"],
    currentResponses:
      status === "not_started"
        ? []
        : [
            {
              id: `${key}-response`,
              responseKind: "evidence",
              status,
              payloadJson: { sourceType: "manual_evidence" },
            },
          ],
  };
}
