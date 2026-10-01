import { useCallback, useState } from "react";
import { exportApi, type ExportApplicationsParams, type ExportDataset } from "../api/export";
import {
  getCriterionLabel,
  getLevelLabel,
  getTaskStatusLabel,
} from "@/features/review/utils/formatters";
import type { Level } from "@/features/review/types";
import { getFinalStatusLabel } from "@/lib/status-labels";

export type ExportPresentation = {
  reportName: string;
  organizationName: string;
};

const columnLabels: Record<string, string> = {
  serialNumber: "STT",
  applicationId: "Mã hồ sơ",
  schoolYear: "Năm học",
  applicationType: "Loại hồ sơ",
  targetLevel: "Cấp đăng ký",
  status: "Trạng thái",
  studentCode: "Mã sinh viên",
  studentName: "Họ và tên sinh viên",
  fullName: "Họ và tên sinh viên",
  className: "Lớp",
  faculty: "Khoa",
  schoolName: "Trường",
  schoolCode: "Mã trường",
  evidenceCount: "Số minh chứng",
  reviewTaskCount: "Số tiêu chí",
  acceptedTaskCount: "Số tiêu chí đã đạt",
  rejectedTaskCount: "Số tiêu chí chưa đạt",
  supplementTaskCount: "Số tiêu chí cần bổ sung",
  resolutionTaskCount: "Số tiêu chí cần hội ý",
  updatedAt: "Cập nhật lúc",
  reviewTaskId: "Mã công việc xét duyệt",
  applicationStatus: "Trạng thái hồ sơ",
  criterion: "Tiêu chí",
  decision: "Quyết định xử lý",
  officerNote: "Ghi chú xử lý",
  assignedOfficerId: "Mã cán bộ phụ trách",
  assignedOfficerName: "Cán bộ phụ trách",
  dueDate: "Hạn xử lý",
  finalStatus: "Kết quả cuối",
  cascadeSuggestedLevel: "Cấp đề xuất",
  finalLevel: "Cấp công nhận",
  downrankReason: "Lý do điều chỉnh cấp",
  readinessScore: "Điểm sẵn sàng",
  submittedAt: "Ngày nộp hồ sơ",
  completedAt: "Ngày chốt kết quả",
  criteriaTaskStatuses: "Trạng thái năm tiêu chí",
  cascadeReviewCreatedAt: "Thời điểm đề xuất cấp",
  cascadeSnapshot: "Dữ liệu đối chiếu cấp",
  finalizedByName: "Người chốt kết quả",
  finalNote: "Ghi chú kết quả",
};

const emptyDatasetColumns: Record<ExportDataset, string[]> = {
  applications: [
    "applicationId",
    "schoolYear",
    "applicationType",
    "targetLevel",
    "status",
    "studentCode",
    "studentName",
    "className",
    "faculty",
    "evidenceCount",
    "reviewTaskCount",
    "updatedAt",
  ],
  reviewTasks: [
    "reviewTaskId",
    "applicationId",
    "schoolYear",
    "criterion",
    "status",
    "decision",
    "officerNote",
    "assignedOfficerName",
    "studentCode",
    "studentName",
    "className",
    "faculty",
    "evidenceCount",
    "dueDate",
    "updatedAt",
  ],
  reviewResults: [
    "studentCode",
    "fullName",
    "schoolYear",
    "finalStatus",
    "applicationStatus",
    "submittedAt",
    "completedAt",
    "finalizedByName",
    "finalNote",
  ],
  cityAwardees: ["serialNumber", "studentCode", "fullName", "className", "faculty", "schoolName"],
};

export function getVietnameseExportFilename(reportName: string, schoolYear?: string) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const season = schoolYear ? `Năm học ${schoolYear}` : "Theo bộ lọc";
  return `${reportName} - ${season} - ${date}.xlsx`;
}

export function getExportFilenameExample(reportName: string, schoolYear?: string) {
  const season = schoolYear ? `Năm học ${schoolYear}` : "Năm học phù hợp";
  return `${reportName} - ${season} - YYYY-MM-DD.xlsx`;
}

function extractRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (!isRecord(value)) return [];

  for (const key of ["items", "data", "rows"]) {
    if (key in value) {
      const rows = extractRows(value[key]);
      if (rows.length > 0 || Array.isArray(value[key])) return rows;
    }
  }
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getColumnLabel(key: string) {
  return columnLabels[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function formatCellValue(key: string, value: unknown): string | number | boolean {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (key === "finalStatus") return getFinalStatusLabel(String(value));
  if (["targetLevel", "finalLevel", "cascadeSuggestedLevel"].includes(key)) {
    return getLevelLabel(String(value) as Level);
  }
  if (key === "criterion") return getCriterionLabel(String(value) as never);
  if (key === "status" || key === "applicationStatus" || key === "decision") {
    return getTaskStatusLabel(String(value) as never);
  }
  if (key === "applicationType") {
    return value === "individual" ? "Cá nhân" : value === "collective" ? "Tập thể" : String(value);
  }
  if (key === "criteriaTaskStatuses" && isRecord(value)) {
    return Object.entries(value)
      .map(
        ([criterion, status]) =>
          `${getCriterionLabel(criterion as never)}: ${getTaskStatusLabel(String(status) as never)}`,
      )
      .join("; ");
  }
  if (typeof value === "string" && /(?:At|Date)$/.test(key)) return formatDate(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

async function createWorkbook(
  source: Blob,
  dataset: ExportDataset,
  params: ExportApplicationsParams,
  presentation: ExportPresentation,
) {
  const payload = JSON.parse(await source.text()) as unknown;
  const rows = extractRows(payload);
  const columns = rows.length > 0 ? Object.keys(rows[0]) : emptyDatasetColumns[dataset];
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = presentation.organizationName;
  workbook.subject = presentation.reportName;
  const worksheet = workbook.addWorksheet("Danh sách", {
    views: [{ state: "frozen", ySplit: 5 }],
  });
  worksheet.columns = columns.map((key) => ({
    key,
    width: Math.max(18, Math.min(40, getColumnLabel(key).length + 7)),
  }));

  worksheet.addRow([presentation.organizationName]);
  worksheet.mergeCells(1, 1, 1, columns.length);
  worksheet.getCell(1, 1).font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  worksheet.getCell(1, 1).alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getCell(1, 1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0057C2" },
  };
  worksheet.getRow(1).height = 30;

  worksheet.addRow([presentation.reportName.toLocaleUpperCase("vi-VN")]);
  worksheet.mergeCells(2, 1, 2, columns.length);
  worksheet.getCell(2, 1).font = { bold: true, size: 12, color: { argb: "FF12345B" } };
  worksheet.getCell(2, 1).alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(2).height = 24;
  worksheet.addRow(["Năm học", params.schoolYear ?? "Theo bộ lọc"]);
  worksheet.addRow(["Ngày xuất", formatDate(new Date().toISOString())]);

  const header = worksheet.addRow(columns.map(getColumnLabel));
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1769AA" } };
  header.height = 32;
  worksheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: columns.length } };

  rows.forEach((row) => worksheet.addRow(columns.map((key) => formatCellValue(key, row[key]))));
  return workbook.xlsx.writeBuffer();
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export function useExportApplications() {
  const [exportingDataset, setExportingDataset] = useState<ExportDataset | null>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadDataset = useCallback(
    async (
      dataset: ExportDataset,
      params: ExportApplicationsParams,
      presentation: ExportPresentation,
    ) => {
      setExportingDataset(dataset);
      setError(null);

      try {
        const source =
          dataset === "applications"
            ? await exportApi.downloadApplicationsExport("json", params)
            : dataset === "reviewTasks"
              ? await exportApi.downloadReviewTasksJson(params)
              : await exportApi.downloadReviewResultsExport("json", params);
        const buffer = await createWorkbook(source, dataset, params, presentation);
        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        triggerBlobDownload(
          blob,
          getVietnameseExportFilename(presentation.reportName, params.schoolYear),
        );
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Không thể xuất dữ liệu thành Excel.";
        setError(message);
        throw caughtError;
      } finally {
        setExportingDataset(null);
      }
    },
    [],
  );

  return {
    error,
    exportingDataset,
    exportingFormat: exportingDataset ? "xlsx" : null,
    isExporting: Boolean(exportingDataset),
    downloadDataset,
  };
}
