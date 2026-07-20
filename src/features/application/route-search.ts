export type StudentApplicationSearch = {
  criterion?: string;
  evidenceId?: string;
  uploadEvidence?: string;
};

export function validateStudentApplicationSearch(
  search: Record<string, unknown>,
): StudentApplicationSearch {
  return {
    criterion: typeof search.criterion === "string" ? search.criterion : undefined,
    evidenceId: typeof search.evidenceId === "string" ? search.evidenceId : undefined,
    uploadEvidence: typeof search.uploadEvidence === "string" ? search.uploadEvidence : undefined,
  };
}
