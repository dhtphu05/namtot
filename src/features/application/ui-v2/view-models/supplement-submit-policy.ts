type SupplementSubmitPolicyInput = {
  applicationStatus: string | undefined;
  canSubmitApplication: boolean;
  completedCriteria: number;
  totalCriteria: number;
  cityFirstSubmitEligibleSurface: boolean;
  supplementMode: boolean;
};

export function shouldShowGlobalApplicationSubmit({
  applicationStatus,
  canSubmitApplication,
  completedCriteria,
  totalCriteria,
  cityFirstSubmitEligibleSurface,
  supplementMode,
}: SupplementSubmitPolicyInput): boolean {
  if (supplementMode) return false;

  return Boolean(
    applicationStatus === "ready_to_submit" ||
      (canSubmitApplication && completedCriteria === totalCriteria) ||
      (cityFirstSubmitEligibleSurface && canSubmitApplication),
  );
}
