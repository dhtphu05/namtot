import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Download, FileJson, FileSpreadsheet, Filter } from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/store/auth-store";
import type { ExportApplicationsParams, ExportFormat } from "@/features/export/api/export";
import { useExportApplications } from "@/features/export/hooks/useExport";
import type { ApplicationStatus, Level, Role } from "@/features/review/types";
import { getLevelLabel, getTaskStatusLabel } from "@/features/review/utils/formatters";
import { ACTIVE_LEVELS } from "@/lib/levels";

export const Route = createFileRoute("/app/export")({
  component: ExportRoute,
});

const allowedRoles: Role[] = ["manager", "committee", "admin"];
const levelOptions: Level[] = [...ACTIVE_LEVELS];
const statusOptions: ApplicationStatus[] = [
  "submitted",
  "under_review",
  "supplement_required",
  "resolution_needed",
  "completed",
  "rejected",
];

function ExportRoute() {
  const user = useAuth((state) => state.user);
  const role = user?.role as Role | undefined;

  if (!role || !allowedRoles.includes(role)) {
    return (
      <>
        <TopBar
          title="Xuất dữ liệu hồ sơ"
          subtitle="Xuất CSV hoặc JSON phục vụ báo cáo và xử lý ngoại tuyến."
        />
        <Card>
          <div className="py-8 text-center">
            <div className="text-base font-semibold text-brand-deep">
              Bạn không có quyền truy cập trang xuất dữ liệu.
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Chức năng này dành cho quản lý, hội đồng và quản trị viên.
            </div>
          </div>
        </Card>
      </>
    );
  }

  return <ExportContent />;
}

function ExportContent() {
  const [filters, setFilters] = useState<ExportApplicationsParams>({});
  const { downloadDataset, error, exportingDataset, exportingFormat, isExporting } = useExportApplications();
  const normalizedFilters = useMemo(
    () => ({
      schoolYear: filters.schoolYear?.trim() || undefined,
      targetLevel: filters.targetLevel,
      status: filters.status,
      faculty: filters.faculty?.trim() || undefined,
    }),
    [filters],
  );

  const handleExport = async (format: ExportFormat) => {
    try {
      await downloadDataset("applications", format, normalizedFilters);
      toast.success(
        format === "csv" ? "Đã tải danh sách hồ sơ CSV." : "Đã tải dữ liệu hồ sơ JSON.",
      );
    } catch {
      // Error text is rendered below from the hook.
    }
  };

  return (
    <>
      <TopBar
        title="Xuất dữ liệu hồ sơ"
        subtitle="Xuất CSV hoặc JSON phục vụ báo cáo và xử lý ngoại tuyến."
      />

      <div className="space-y-5">
        <Card>
          <div className="mb-4 flex items-start gap-2">
            <Filter className="mt-0.5 h-5 w-5 text-brand-deep" />
            <div>
              <h2 className="text-base font-bold text-brand-deep">Bộ lọc xuất dữ liệu</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Các trường để trống sẽ không gửi lên backend.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FilterField label="Năm học">
              <Input
                disabled={isExporting}
                placeholder="Ví dụ: 2025-2026"
                value={filters.schoolYear ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, schoolYear: event.target.value }))
                }
              />
            </FilterField>

            <FilterField label="Cấp xét">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                disabled={isExporting}
                value={filters.targetLevel ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    targetLevel: event.target.value ? (event.target.value as Level) : undefined,
                  }))
                }
              >
                <option value="">Tất cả cấp xét</option>
                {levelOptions.map((level) => (
                  <option key={level} value={level}>
                    {getLevelLabel(level)}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Trạng thái hồ sơ">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                disabled={isExporting}
                value={filters.status ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value
                      ? (event.target.value as ApplicationStatus)
                      : undefined,
                  }))
                }
              >
                <option value="">Tất cả trạng thái</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {getTaskStatusLabel(status)}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Khoa">
              <Input
                disabled={isExporting}
                placeholder="Nhập tên khoa"
                value={filters.faculty ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, faculty: event.target.value }))
                }
              />
            </FilterField>
          </div>

          <div className="mt-4">
            <Button
              disabled={isExporting}
              type="button"
              variant="outline"
              onClick={() => setFilters({})}
            >
              Xóa bộ lọc
            </Button>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <ExportOptionCard
            description="Tải danh sách hồ sơ ở định dạng bảng, phù hợp cho Excel hoặc công cụ xử lý dữ liệu."
            disabled={isExporting}
            format="csv"
            icon={<FileSpreadsheet className="h-6 w-6" />}
            isLoading={exportingDataset === "applications" && exportingFormat === "csv"}
            title="Xuất danh sách hồ sơ CSV"
            onExport={() => void handleExport("csv")}
          />
          <ExportOptionCard
            description="Tải dữ liệu hồ sơ có cấu trúc để tích hợp hoặc xử lý ngoại tuyến."
            disabled={isExporting}
            format="json"
            icon={<FileJson className="h-6 w-6" />}
            isLoading={exportingDataset === "applications" && exportingFormat === "json"}
            title="Xuất dữ liệu hồ sơ JSON"
            onExport={() => void handleExport("json")}
          />
          <ExportOptionCard
            description="Tải danh sách task xét duyệt, cán bộ phụ trách, trạng thái và số minh chứng kèm theo."
            disabled={isExporting}
            format="csv"
            icon={<FileSpreadsheet className="h-6 w-6" />}
            isLoading={exportingDataset === "reviewTasks"}
            title="Chi tiết task xét duyệt CSV"
            onExport={() => void downloadDataset("reviewTasks", "csv", normalizedFilters)}
          />
          <ExportOptionCard
            description="Tải kết quả xét duyệt đã tổng hợp, gồm final result và snapshot cascade tại thời điểm xuất/chốt."
            disabled={isExporting}
            format="csv"
            icon={<FileSpreadsheet className="h-6 w-6" />}
            isLoading={exportingDataset === "reviewResults" && exportingFormat === "csv"}
            title="Biên bản kết quả cuối CSV"
            onExport={() => void downloadDataset("reviewResults", "csv", normalizedFilters)}
          />
          <ExportOptionCard
            description="Tải review results dạng JSON để đối soát, tích hợp hoặc lưu snapshot ngoài hệ thống."
            disabled={isExporting}
            format="json"
            icon={<FileJson className="h-6 w-6" />}
            isLoading={exportingDataset === "reviewResults" && exportingFormat === "json"}
            title="Snapshot kết quả cuối JSON"
            onExport={() => void downloadDataset("reviewResults", "json", normalizedFilters)}
          />
          <ExportOptionCard
            description="Báo cáo hồ sơ đã chốt đạt, dùng để tổng hợp danh sách công nhận theo cấp."
            disabled={isExporting}
            fields={["student", "aim", "final level", "finalized at", "finalized by", "final note"]}
            format="csv"
            icon={<FileSpreadsheet className="h-6 w-6" />}
            isLoading={exportingDataset === "reviewResults" && exportingFormat === "csv"}
            title="Danh sách đạt theo cấp"
            onExport={() => void downloadDataset("reviewResults", "csv", { ...normalizedFilters, status: "completed" })}
          />
          <ExportOptionCard
            description="Báo cáo hồ sơ bị hạ so với aim đăng ký, dựa trên aim, đề xuất cấp đạt và final level trong file kết quả."
            disabled={isExporting}
            fields={["student", "aim", "suggested level", "final level", "downrank reason", "5 criteria"]}
            format="csv"
            icon={<FileSpreadsheet className="h-6 w-6" />}
            isLoading={exportingDataset === "reviewResults" && exportingFormat === "csv"}
            title="Danh sách bị hạ cấp"
            onExport={() => void downloadDataset("reviewResults", "csv", normalizedFilters)}
          />
          <ExportOptionCard
            description="Báo cáo hồ sơ đã chốt chưa đạt, phục vụ đối soát và phản hồi."
            disabled={isExporting}
            fields={["student", "aim", "final status", "5 criteria", "final note", "cascade snapshot"]}
            format="csv"
            icon={<FileSpreadsheet className="h-6 w-6" />}
            isLoading={exportingDataset === "reviewResults" && exportingFormat === "csv"}
            title="Danh sách chưa đạt"
            onExport={() => void downloadDataset("reviewResults", "csv", { ...normalizedFilters, status: "rejected" })}
          />
          <ExportOptionCard
            description="Dữ liệu phục vụ đối chiếu minh chứng và các case hội ý, gồm task status và ghi chú xử lý."
            disabled={isExporting}
            fields={["student", "criterion", "evidence count", "task decision", "officer note", "updated at"]}
            format="csv"
            icon={<FileSpreadsheet className="h-6 w-6" />}
            isLoading={exportingDataset === "reviewTasks"}
            title="Chi tiết minh chứng/hội ý"
            onExport={() => void downloadDataset("reviewTasks", "csv", normalizedFilters)}
          />
        </div>

        {error ? (
          <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <Card>
          <h2 className="text-base font-bold text-brand-deep">Phạm vi sprint</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Trang này chỉ hỗ trợ xuất CSV và JSON. Báo cáo PDF không nằm trong phạm vi hiện tại.
          </p>
        </Card>
      </div>
    </>
  );
}

function FilterField({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function ExportOptionCard({
  description,
  disabled,
  fields,
  format,
  icon,
  isLoading,
  title,
  onExport,
}: {
  description: string;
  disabled?: boolean;
  fields?: string[];
  format: ExportFormat;
  icon: React.ReactNode;
  isLoading?: boolean;
  title: string;
  onExport: () => void;
}) {
  const fileName = `sv5t-applications-YYYY-MM-DD.${format}`;

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-brand-deep">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <div className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
            Tên file: {fileName}
          </div>
          {fields?.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {fields.map((field) => (
                <span
                  key={field}
                  className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600"
                >
                  {field}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <Button className="mt-5 w-full" disabled={disabled} type="button" onClick={onExport}>
        <Download className="h-4 w-4" />
        {isLoading ? "Đang xuất..." : title}
      </Button>
    </Card>
  );
}
