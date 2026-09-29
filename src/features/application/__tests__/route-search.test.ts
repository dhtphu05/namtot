import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateStudentApplicationSearch } from "../route-search.ts";

describe("student application route search validation", () => {
  it("keeps accepted deep-link search parameters", () => {
    assert.deepEqual(
      validateStudentApplicationSearch({
        criterion: "academic",
        evidenceId: "evidence-1",
        eventId: "event-1",
        mode: "confirm",
        reviewTaskId: "task-1",
        uploadEvidence: "1",
      }),
      {
        criterion: "academic",
        evidenceId: "evidence-1",
        eventId: "event-1",
        mode: "confirm",
        reviewTaskId: "task-1",
        uploadEvidence: "1",
      },
    );
  });

  it("normalizes TanStack's numeric uploadEvidence query value for direct links", () => {
    assert.equal(
      validateStudentApplicationSearch({ criterion: "physical", uploadEvidence: 1 }).uploadEvidence,
      "1",
    );
  });

  it("drops unsupported non-string values without throwing", () => {
    assert.deepEqual(
      validateStudentApplicationSearch({
        criterion: 5,
        evidenceId: null,
        eventId: false,
        mode: "unknown",
        reviewTaskId: null,
        uploadEvidence: true,
      }),
      {
        criterion: undefined,
        evidenceId: undefined,
        eventId: undefined,
        mode: undefined,
        reviewTaskId: undefined,
        uploadEvidence: undefined,
      },
    );
  });

  it("accepts suggested event import mode", () => {
    assert.deepEqual(
      validateStudentApplicationSearch({
        criterion: "volunteer",
        eventId: "event-1",
        mode: "suggested-import",
      }),
      {
        criterion: "volunteer",
        evidenceId: undefined,
        eventId: "event-1",
        mode: "suggested-import",
        reviewTaskId: undefined,
        uploadEvidence: undefined,
      },
    );
  });
});
