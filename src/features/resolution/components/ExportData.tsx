import { TopBar } from "@/components/layout/TopBar";
import { Button, Card, Chip } from "@/components/ui-kit";
import { Download, FileSpreadsheet, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { exportsApi, type ExportReviewResultRow } from "../api/exports";
import type { ApplicationStatus, Level } from "@/lib/api/types";

const STATUS_OPTIONS: Array<{ value: ApplicationStatus | "all"; label: string }> = [
  { value: "all", label: "Mọi trạng thái" },
  { value: "submitted", label: "Đã nộp" },
  { value: "under_review", label: "Đang xét" },
  { value: "supplement_required", label: "Cần bổ sung" },
  { value: "resolution_needed", label: "Cần hội đồng" },
  { value: "completed", label: "Hoàn tất" },
  { value: "rejected", label: "Không đạt" },
];

const LEVEL_OPTIONS: Array<{ value: Level | "all"; label: string }> = [
  { value: "all", label: "Mọi cấp" },
  { value: "school", label: "Cấp trường" },
  { value: "university", label: "Cấp ĐH Đà Nẵng" },
  { value: "city", label: "Cấp thành phố" },
  { value: "central", label: "Cấp Trung ương" },
];

export function ExportData() {
  const [schoolYear, setSchoolYear] = useState("2025-2026");
  const [status, setStatus] = useState<ApplicationStatus | "all">("all");
  const [targetLevel, setTargetLevel] = useState<Level | "all">("all");
  const [faculty, setFaculty] = useState("");
  const [rows, setRows] = useState<ExportReviewResultRow[]>([]);
  const [loading, setLoading] = useState<"json" | "csv" | null>(null);

  const payload = {
    schoolYear: schoolYear.trim() || undefined,
    status: status === "all" ? undefined : status,
    targetLevel: targetLevel === "all" ? undefined : targetLevel,
    faculty: faculty.trim() || undefined,
  };

  const preview = async () => {
    setLoading("json");
    try {
      const result = await exportsApi.exportReviewResults({ ...payload, format: "json" });
      if (result.format === "json") {
        setRows(result.data);
        toast.success(`Đã tải preview ${result.data.length} dòng`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải preview export");
    } finally {
      setLoading(null);
    }
  };

  const downloadCsv = async () => {
    setLoading("csv");
    try {
      const result = await exportsApi.exportReviewResults({ ...payload, format: "csv" });
      if (result.format === "csv") {
        const { blob, filename } = await exportsApi.downloadExportFile(result.file.id);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename ?? result.file.originalName ?? "review-results.csv";
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Đã tải file CSV");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xuất file CSV");
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <TopBar title="Export Center" subtitle="Xuất kết quả xét duyệt từ backend theo bộ lọc quản lý" />

      <Card className="mb-5">
        <div className="grid gap-3 md:grid-cols-5">
          <label className="text-xs font-semibold text-brand-deep">
            Năm học
            <input
              value={schoolYear}
              onChange={(event) => setSchoolYear(event.target.value)}
              className="mt-1 w-full rounded-lg bg-[#F6F9FC] px-3 py-2 text-[13px]"
            />
          </label>
          <label className="text-xs font-semibold text-brand-deep">
            Trạng thái
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as ApplicationStatus | "all")}
              className="mt-1 w-full rounded-lg bg-[#F6F9FC] px-3 py-2 text-[13px]"
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-brand-deep">
            Cấp xét
            <select
              value={targetLevel}
              onChange={(event) => setTargetLevel(event.target.value as Level | "all")}
              className="mt-1 w-full rounded-lg bg-[#F6F9FC] px-3 py-2 text-[13px]"
            >
              {LEVEL_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-brand-deep">
            Khoa
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={faculty}
                onChange={(event) => setFaculty(event.target.value)}
                placeholder="VD: CNTT"
                className="w-full rounded-lg bg-[#F6F9FC] py-2 pl-8 pr-3 text-[13px]"
              />
            </div>
          </label>
          <div className="flex items-end gap-2">
            <Button onClick={preview} disabled={loading !== null} className="flex-1">
              {loading === "json" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Preview
            </Button>
            <Button variant="outline" onClick={downloadCsv} disabled={loading !== null}>
              {loading === "csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              CSV
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-brand-deep">Xem trước</h3>
          <Chip tone="muted">{rows.length} dòng</Chip>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">MSSV</th>
                <th className="px-3 py-2">Họ tên</th>
                <th className="px-3 py-2">Khoa</th>
                <th className="px-3 py-2">Lớp</th>
                <th className="px-3 py-2">Cấp aim</th>
                <th className="px-3 py-2">Cấp đạt</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2">Readiness</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.studentCode ?? "row"}-${index}`} className="hover:bg-[#F4FBFF]">
                  <td className="px-3 py-2 font-mono text-xs">{row.studentCode ?? "-"}</td>
                  <td className="px-3 py-2 font-semibold text-brand-deep">{row.fullName}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.faculty ?? "-"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.className ?? "-"}</td>
                  <td className="px-3 py-2">{row.targetLevel}</td>
                  <td className="px-3 py-2">{row.finalLevel ?? "-"}</td>
                  <td className="px-3 py-2">
                    <Chip tone={row.applicationStatus === "completed" ? "success" : row.applicationStatus === "rejected" ? "error" : "brand"}>
                      {row.applicationStatus}
                    </Chip>
                  </td>
                  <td className="px-3 py-2">{row.readinessScore}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                    Bấm Preview để tải dữ liệu export từ backend.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
