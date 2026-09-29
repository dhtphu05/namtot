import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldShowGlobalApplicationSubmit } from "@/features/application/ui-v2/view-models/supplement-submit-policy";

describe("supplement submit policy", () => {
  it("never shows the global application submit CTA while a submitted application is in supplement mode", () => {
    assert.equal(
      shouldShowGlobalApplicationSubmit({
        applicationStatus: "supplement_required",
        canSubmitApplication: true,
        completedCriteria: 5,
        totalCriteria: 5,
        cityFirstSubmitEligibleSurface: false,
        supplementMode: true,
      }),
      false,
    );
  });

  it("keeps the normal initial application submit CTA behavior", () => {
    assert.equal(
      shouldShowGlobalApplicationSubmit({
        applicationStatus: "ready_to_submit",
        canSubmitApplication: true,
        completedCriteria: 5,
        totalCriteria: 5,
        cityFirstSubmitEligibleSurface: true,
        supplementMode: false,
      }),
      true,
    );
  });
});
