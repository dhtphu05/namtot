import { useState } from "react";
import { Download, Loader2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button, Card } from "@/components/ui-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getApplicationStatusLabel, getFinalStatusLabel } from "@/lib/status-labels";
import { cityPilotSchoolYear } from "./constants";
import { cityAnalyticsApi } from "./api";
import { useCityAnalyticsSummary } from "./hooks";
import type { CityAnalyticsApplication } from "./types";

const pageLimit = 100;

export function CityCommitteeSubmittedApplications() {
  const summaryQuery = useCityAnalyticsSummary({ schoolYear: cityPilotSchoolYear });
  const [exporting, setExporting] = useState<string | null>(null);
  const schools = summaryQuery.data?.bySchool ?? [];
  const submittedCount = summaryQuery.data?.applications.submitted ?? 0;

  async function exportList(workspaceId?: string, schoolName?: string) {
    const exportKey = workspaceId ?? "all";
    setExporting(exportKey);
    try {
      const applications = await getAllSubmittedApplications(workspaceId);
      if (applications.length === 0) {
        toast.info("Không có hồ sơ đã nộp trong phạm vi đã chọn.");
        return;
      }
      await downloadXlsx(applications, schoolName);
      toast.success(`Đã xuất ${applications.length} hồ sơ đã nộp.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xuất danh sách hồ sơ.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <Card className="mb-5 p-0">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-brand-deep">Hồ sơ đã nộp theo trường</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hồ sơ cá nhân cấp Thành phố trong mùa xét {cityPilotSchoolYear}; tải danh sách Excel
            toàn Thành phố hoặc theo từng trường.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={submittedCount === 0 || exporting !== null || summaryQuery.isLoading}
          onClick={() => void exportList()}
        >
          {exporting === "all" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          Xuất Excel toàn bộ danh sách đã nộp ({submittedCount})
        </Button>
      </div>

      {summaryQuery.isLoading ? (
        <div
          className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Đang tải thống kê theo trường...
        </div>
      ) : summaryQuery.isError ? (
        <div className="flex flex-col items-center gap-3 p-8 text-sm" role="alert">
          <span className="text-rose-700">Không thể tải thống kê hồ sơ theo trường.</span>
          <Button variant="outline" size="sm" onClick={() => void summaryQuery.refetch()}>
            <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Tải lại
          </Button>
        </div>
      ) : schools.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Chưa có trường trong dữ liệu mùa xét {cityPilotSchoolYear}.
        </div>
      ) : (
        <div
          className="overflow-x-auto"
          role="region"
          aria-label="Bảng hồ sơ đã nộp theo trường"
          tabIndex={0}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trường</TableHead>
                <TableHead className="text-right">Hồ sơ đã nộp</TableHead>
                <TableHead className="text-right">Danh sách</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools.map((school) => (
                <TableRow key={school.workspaceId}>
                  <TableCell>
                    <span className="font-semibold">{school.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{school.code}</span>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{school.submitted}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Xuất Excel danh sách đã nộp: ${school.name}`}
                      disabled={school.submitted === 0 || exporting !== null}
                      onClick={() => void exportList(school.workspaceId, school.name)}
                    >
                      {exporting === school.workspaceId ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                      )}
                      Xuất Excel
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold">
                <TableCell>Tổng hồ sơ đã nộp</TableCell>
                <TableCell className="text-right">{submittedCount}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

async function getAllSubmittedApplications(workspaceId?: string) {
  const firstPage = await fetchSubmittedPage(workspaceId, 1);

  if (firstPage.pagination.totalPages <= 1) return firstPage.items;

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.pagination.totalPages - 1 }, (_, index) =>
      fetchSubmittedPage(workspaceId, index + 2),
    ),
  );

  return [...firstPage.items, ...remainingPages.flatMap((response) => response.items)];
}

async function fetchSubmittedPage(workspaceId: string | undefined, page: number) {
  const response = await cityAnalyticsApi.getApplications({
    schoolYear: cityPilotSchoolYear,
    submitted: true,
    workspaceId,
    page,
    limit: pageLimit,
  });
  if (!response.data) throw new Error("Không thể tải danh sách hồ sơ đã nộp.");
  return response.data;
}

async function downloadXlsx(applications: CityAnalyticsApplication[], schoolName?: string) {
  const ExcelJS = (await import("exceljs")).default;
  const exportedAt = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hội Sinh viên Việt Nam thành phố Đà Nẵng";
  workbook.subject = `Danh sách hồ sơ đã nộp cấp Thành phố năm học ${cityPilotSchoolYear}`;
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet("Danh sách hồ sơ", {
    views: [{ state: "frozen", ySplit: 5 }],
  });
  worksheet.columns = [
    { width: 8 },
    { width: 36 },
    { width: 44 },
    { width: 16 },
    { width: 32 },
    { width: 20 },
    { width: 16 },
    { width: 22 },
    { width: 24 },
    { width: 22 },
  ];
  worksheet.mergeCells("A1:J1");
  worksheet.getCell("A1").value = "HỘI SINH VIÊN VIỆT NAM THÀNH PHỐ ĐÀ NẴNG";
  worksheet.getCell("A1").font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0057C2" },
  };
  worksheet.getRow(1).height = 30;

  worksheet.mergeCells("A2:J2");
  worksheet.getCell("A2").value = "DANH SÁCH HỒ SƠ ĐÃ NỘP CẤP THÀNH PHỐ";
  worksheet.getCell("A2").font = { bold: true, size: 12, color: { argb: "FF12345B" } };
  worksheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(2).height = 24;

  worksheet.addRow(["Năm học", cityPilotSchoolYear]);
  worksheet.addRow(["Ngày xuất", exportedAt]);
  worksheet.addRow([
    "STT",
    "Mã hồ sơ",
    "Trường",
    "Mã trường",
    "Họ và tên sinh viên",
    "Mã sinh viên",
    "Năm học",
    "Ngày nộp",
    "Trạng thái hồ sơ",
    "Kết quả cuối",
  ]);
  const headerRow = worksheet.getRow(5);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  headerRow.height = 32;
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1769AA" },
  };
  worksheet.autoFilter = { from: "A5", to: "J5" };

  applications.forEach((application, index) => {
    worksheet.addRow([
      index + 1,
      application.id,
      application.school.name,
      application.school.code,
      application.student.fullName,
      application.student.studentCode,
      application.schoolYear,
      formatDateTime(application.submittedAt),
      getApplicationStatusLabel(application.status),
      getFinalStatusLabel(application.finalStatus),
    ]);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const objectUrl = URL.createObjectURL(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const anchor = document.createElement("a");
  const scope = schoolName ? ` - ${sanitizeFilenamePart(schoolName)}` : " - Toàn thành phố";
  anchor.href = objectUrl;
  anchor.download = `Danh sách hồ sơ đã nộp cấp Thành phố${scope} - Năm học ${cityPilotSchoolYear}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function formatDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function sanitizeFilenamePart(value: string) {
  return Array.from(value)
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 0x20 && code !== 0x7f;
    })
    .join("")
    .replace(/[<>:"/\\|?*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
