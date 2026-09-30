import assert from "node:assert/strict";
import { test } from "node:test";
import { selectStudentHomeAction } from "../student-home.ts";

const openDeadline = {
  submission: {
    status: "OPEN" as const,
    opensAt: null,
    closesAt: null,
    effectiveClosesAt: null,
    exceptionActive: false,
    exceptionValidUntil: null,
  },
};
const eligible = { status: "ELIGIBLE" as const };

test("starts a new application only when no current application exists", () => {
  assert.equal(selectStudentHomeAction({ application: null }).kind, "start");
});

test("an official final decision takes priority over all other actions", () => {
  const action = selectStudentHomeAction({
    application: { status: "under_review", finalStatus: "partially_passed" },
    candidates: [
      {
        title: "Học tập tốt cần kiểm tra",
        actionLabel: "Xem minh chứng",
        criterionKey: "academic",
      },
    ],
  });

  assert.equal(action.kind, "result");
  assert.equal(action.href, "/app/result");
  assert.equal(action.label, "Xem kết quả");
});

test("an active supplement request takes priority and deep-links to its criterion", () => {
  const action = selectStudentHomeAction({
    application: {
      status: "supplement_required",
      reviewTasks: [
        {
          id: "task-1",
          criterion: "volunteer",
          status: "supplement_required",
          decision: "supplement_required",
          supplementRequestJson: { reason: "Cần bổ sung thời gian tham gia." },
        },
      ],
    },
  });

  assert.equal(action.kind, "supplement");
  assert.equal(action.criterion, "volunteer");
  assert.equal(action.href, "/app/application");
  assert.match(action.description, /thời gian tham gia/i);
});

test("submitted, under-review, and resolution states lead to tracking", () => {
  for (const status of ["submitted", "under_review", "resolution_needed"] as const) {
    const action = selectStudentHomeAction({ application: { status } });
    assert.equal(action.kind, "track", status);
    assert.equal(action.href, "/app/application", status);
  }
});

test("server eligibility blocks the initial submit action", () => {
  for (const status of ["NOT_ELIGIBLE", "NEEDS_VERIFICATION"] as const) {
    const action = selectStudentHomeAction({
      application: { status: "ready_to_submit" },
      eligibility: { status },
      eligibilityResolved: true,
      deadline: openDeadline,
      deadlineResolved: true,
    });
    assert.equal(action.kind, "eligibility", status);
    assert.equal(action.label, "Xem điều kiện nộp hồ sơ");
    assert.equal(action.href, "/app/ai-precheck");
  }
});

test("a missing or closed submission window never offers the submit action", () => {
  for (const status of ["NOT_CONFIGURED", "NOT_OPEN", "CLOSED"] as const) {
    const action = selectStudentHomeAction({
      application: { status: "ready_to_submit" },
      eligibility: eligible,
      eligibilityResolved: true,
      deadline: {
        submission: {
          status,
          opensAt: null,
          closesAt: null,
          effectiveClosesAt: null,
          exceptionActive: false,
          exceptionValidUntil: null,
        },
      },
      deadlineResolved: true,
    });
    assert.equal(action.kind, "deadline", status);
    assert.notEqual(action.label, "Kiểm tra và gửi hồ sơ");
    assert.equal(action.href, "/app/ai-precheck");
  }
});

test("eligibility and deadline must both resolve before ready-to-submit is presented", () => {
  const action = selectStudentHomeAction({
    application: { status: "ready_to_submit" },
    eligibility: eligible,
    eligibilityResolved: false,
    deadline: openDeadline,
    deadlineResolved: false,
  });

  assert.equal(action.kind, "check-submit");
  assert.equal(action.label, "Kiểm tra hồ sơ");
  assert.equal(action.href, "/app/ai-precheck");
});

test("the ready action appears only when backend eligibility and window allow initial submit", () => {
  const action = selectStudentHomeAction({
    application: { status: "ready_to_submit" },
    eligibility: eligible,
    eligibilityResolved: true,
    deadline: openDeadline,
    deadlineResolved: true,
  });

  assert.equal(action.kind, "ready");
  assert.equal(action.label, "Kiểm tra và gửi hồ sơ");
  assert.equal(action.href, "/app/ai-precheck");
});

test("non-City applications do not wait on City-only eligibility and deadline gates", () => {
  const action = selectStudentHomeAction({
    application: { status: "ready_to_submit" },
    cityGateRequired: false,
  });

  assert.equal(action.kind, "ready");
  assert.equal(action.label, "Kiểm tra và gửi hồ sơ");
});

test("an actionable student-domain candidate preserves its criterion deep link", () => {
  const action = selectStudentHomeAction({
    application: { status: "draft" },
    candidates: [
      {
        title: "Hội nhập tốt cần hoàn thiện",
        description: "Bổ sung thông tin còn thiếu.",
        actionLabel: "Xử lý yêu cầu",
        criterionKey: "integration",
        route: "/app/application",
      },
    ],
  });

  assert.equal(action.kind, "criterion");
  assert.equal(action.criterion, "integration");
  assert.equal(action.label, "Xử lý yêu cầu");
});

test("a precheck submit suggestion cannot bypass the application eligibility and deadline gates", () => {
  const action = selectStudentHomeAction({
    application: { status: "draft" },
    candidates: [
      {
        title: "Hồ sơ đã sẵn sàng",
        description: "Nộp hồ sơ",
        actionLabel: "Nộp hồ sơ",
        actionType: "submit",
        priority: 1,
      },
    ],
  });

  assert.equal(action.kind, "continue");
  assert.notEqual(action.label, "Nộp hồ sơ");
});

test("draft and unknown states fall back to a truthful application action", () => {
  assert.equal(
    selectStudentHomeAction({ application: { status: "draft" } }).label,
    "Tiếp tục hồ sơ",
  );
  assert.equal(
    selectStudentHomeAction({ application: { status: "new_backend_state" } }).label,
    "Mở hồ sơ",
  );
});
