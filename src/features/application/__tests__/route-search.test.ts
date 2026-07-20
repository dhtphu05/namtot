import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateStudentApplicationSearch } from "@/features/application/route-search";

describe("student application route search validation", () => {
  it("keeps accepted deep-link search parameters", () => {
    assert.deepEqual(
      validateStudentApplicationSearch({
        criterion: "academic",
        evidenceId: "evidence-1",
        uploadEvidence: "1",
      }),
      {
        criterion: "academic",
        evidenceId: "evidence-1",
        uploadEvidence: "1",
      },
    );
  });

  it("drops unsupported non-string values without throwing", () => {
    assert.deepEqual(
      validateStudentApplicationSearch({
        criterion: 5,
        evidenceId: null,
        uploadEvidence: true,
      }),
      {
        criterion: undefined,
        evidenceId: undefined,
        uploadEvidence: undefined,
      },
    );
  });
});
