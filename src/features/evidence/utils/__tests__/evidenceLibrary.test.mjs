import assert from "node:assert/strict";
import test from "node:test";
import {
  CORE_EVIDENCE_CRITERIA,
  filterStudentEvidences,
  getEvidenceLibraryStatus,
  isCoreEvidenceCriterion,
  EVIDENCE_UPLOAD_LIMIT_BYTES,
  validateEvidenceUploadFile,
} from "../evidenceLibrary.ts";

const evidence = (overrides = {}) => ({
  id: "evidence-1",
  criterion: "academic",
  evidenceName: "Giấy chứng nhận nghiên cứu khoa học",
  indexingStatus: "indexed",
  sourceType: "manual_upload",
  files: [{ fileName: "chung-nhan.pdf" }],
  ...overrides,
});

test("student evidence library exposes only its five canonical criteria", () => {
  assert.deepEqual(CORE_EVIDENCE_CRITERIA, [
    "ethics",
    "academic",
    "physical",
    "volunteer",
    "integration",
  ]);
  assert.equal(isCoreEvidenceCriterion("priority"), false);
  assert.equal(isCoreEvidenceCriterion("academic"), true);
});

test("filters by criterion and searches evidence and file names", () => {
  const rows = [
    evidence(),
    evidence({
      id: "evidence-2",
      criterion: "volunteer",
      evidenceName: "Ngày hội hiến máu",
      files: [{ fileName: "ngay-hoi.pdf" }],
    }),
  ];
  assert.deepEqual(
    filterStudentEvidences(rows, { criterion: "academic" }).map((row) => row.id),
    ["evidence-1"],
  );
  assert.deepEqual(
    filterStudentEvidences(rows, { search: "chung-nhan" }).map((row) => row.id),
    ["evidence-1"],
  );
  assert.deepEqual(
    filterStudentEvidences(rows, { search: "HIẾN MÁU" }).map((row) => row.id),
    ["evidence-2"],
  );
});

test("maps processing and confirmation states to student-friendly labels", () => {
  assert.equal(
    getEvidenceLibraryStatus(evidence({ indexingStatus: "ocr_processing" })).key,
    "processing",
  );
  for (const status of ["uploaded", "pending_indexing", "extracting", "checking_registry"]) {
    assert.equal(getEvidenceLibraryStatus(evidence({ indexingStatus: status })).key, "processing");
  }
  assert.equal(
    getEvidenceLibraryStatus(
      evidence({ indexingStatus: "indexed", studentStatus: { code: "needs_more_info" } }),
    ).key,
    "attention",
  );
  assert.equal(
    getEvidenceLibraryStatus(evidence({ indexingStatus: "indexed" }), {
      confirmationStatus: "pending",
      requiresHumanConfirmation: true,
    }).label,
    "Cần bạn kiểm tra",
  );
  assert.equal(
    getEvidenceLibraryStatus(
      evidence({ indexingStatus: "indexed", studentStatus: { code: "evidence_read" } }),
      { confirmationStatus: "confirmed", requiresHumanConfirmation: false },
    ).key,
    "ready",
  );
  assert.equal(
    getEvidenceLibraryStatus(evidence({ indexingStatus: "needs_manual_review" })).key,
    "waiting",
  );
  assert.equal(
    getEvidenceLibraryStatus(evidence({ indexingStatus: "failed" })).label,
    "Không thể đọc tài liệu",
  );
  assert.equal(
    getEvidenceLibraryStatus(evidence({ indexingStatus: "failed" })).message,
    "Mở minh chứng để xem tình trạng đọc tài liệu và hướng xử lý.",
  );
  assert.equal(
    getEvidenceLibraryStatus(evidence({ indexingStatus: "unfamiliar_backend_value" })).label,
    "Đã ghi nhận",
  );
  const fallback = getEvidenceLibraryStatus(
    evidence({ indexingStatus: "unfamiliar_backend_value" }),
  );
  assert.doesNotMatch(`${fallback.label} ${fallback.message}`, /OCR|indexing|failed/i);
});

test("does not display evidence under non-criterion backend categories", () => {
  const rows = [evidence(), evidence({ id: "priority-1", criterion: "priority" })];
  assert.deepEqual(
    filterStudentEvidences(rows).map((row) => row.id),
    ["evidence-1"],
  );
});

test("validates the evidence upload formats and configured size limit", () => {
  assert.equal(
    validateEvidenceUploadFile({ name: "scan.pdf", type: "application/pdf", size: 500 }),
    null,
  );
  assert.equal(
    validateEvidenceUploadFile({ name: "scan.webp", type: "image/webp", size: 500 }),
    null,
  );
  assert.equal(
    validateEvidenceUploadFile({
      name: "phone-photo.jpg",
      type: "application/octet-stream",
      size: 500,
    }),
    null,
  );
  assert.match(
    validateEvidenceUploadFile({ name: "scan.gif", type: "image/gif", size: 500 }),
    /PDF, JPG, PNG hoặc WEBP/,
  );
  assert.match(
    validateEvidenceUploadFile({
      name: "scan.pdf",
      type: "application/pdf",
      size: EVIDENCE_UPLOAD_LIMIT_BYTES + 1,
    }),
    /20 MB/,
  );
});
