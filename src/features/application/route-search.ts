export type StudentApplicationSearch = {
  criterion?: string;
  evidenceId?: string;
  mode?: "confirm" | "recover" | "supplement";
  reviewTaskId?: string;
  uploadEvidence?: string;
};

export function validateStudentApplicationSearch(
  search: Record<string, unknown>,
): StudentApplicationSearch {
  return {
    criterion: typeof search.criterion === "string" ? search.criterion : undefined,
    evidenceId: typeof search.evidenceId === "string" ? search.evidenceId : undefined,
    mode:
      search.mode === "confirm" || search.mode === "recover" || search.mode === "supplement"
        ? search.mode
        : undefined,
    reviewTaskId: typeof search.reviewTaskId === "string" ? search.reviewTaskId : undefined,
    uploadEvidence: typeof search.uploadEvidence === "string" ? search.uploadEvidence : undefined,
  };
}
