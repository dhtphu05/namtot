import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectStudentApplicationSurface } from "@/features/application/ui-v2/entry-selection";

function legacySurface() {
  return "legacy";
}

function v2Surface() {
  return "v2";
}

describe("student application UI V2 entry selection", () => {
  it("keeps the legacy student surfaces when the flag is false", () => {
    assert.equal(selectStudentApplicationSurface(false, legacySurface, v2Surface), legacySurface);
  });

  it("selects the V2 entry points when the flag is true", () => {
    assert.equal(selectStudentApplicationSurface(true, legacySurface, v2Surface), v2Surface);
  });
});
