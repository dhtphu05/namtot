import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Download, FileSpreadsheet, Filter } from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/store/auth-store";
import type { ExportApplicationsParams, ExportDataset } from "@/features/export/api/export";
import {
  getExportFilenameExample,
  type ExportPresentation,
} from "@/features/export/hooks/useExport";
import { useExportApplications } from "@/features/export/hooks/useExport";
import type { ApplicationStatus, Level, Role } from "@/features/review/types";
import { getLevelLabel, getTaskStatusLabel } from "@/features/review/utils/formatters";
import { ACTIVE_LEVELS } from "@/lib/levels";
import { cityPilotSchoolYear } from "@/features/manager/city-analytics/constants";
import { CityCommitteeSubmittedApplications } from "@/features/manager/city-analytics/CityCommitteeSubmittedApplications";

export const Route = createFileRoute("/app/export")({
  component: ExportRoute,
});

const allowedRoles: Role[] = ["manager", "committee", "city_manager", "city_committee", "admin"];
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
          subtitle="Tải báo cáo Excel theo phạm vi và bộ lọc được phép."
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

  return <ExportContent role={role} />;
}

function ExportContent({ role }: { role: Role }) {
  const cityOnly = role === "city_manager" || role === "city_committee" || role === "admin";
  const [filters, setFilters] = useState<ExportApplicationsParams>({});
  const { downloadDataset, error, exportingDataset, isExporting } = useExportApplications();
  const normalizedFilters = useMemo(
    () => ({
      schoolYear: cityOnly ? cityPilotSchoolYear : filters.schoolYear?.trim() || undefined,
      targetLevel: cityOnly ? "city" : filters.targetLevel,
      status: filters.status,
      faculty: filters.faculty?.trim() || undefined,
    }),
    [cityOnly, filters],
  );

  const getPresentation = (reportName: string): ExportPresentation => ({
    reportName,
    organizationName: cityOnly
      ? "HỘI SINH VIÊN VIỆT NAM THÀNH PHỐ ĐÀ NẴNG"
      : "HỘI SINH VIÊN VIỆT NAM",
  });

  const handleExport = async (
    dataset: ExportDataset,
    reportName: string,
    params = normalizedFilters,
  ) => {
    try {
      await downloadDataset(dataset, params, getPresentation(reportName));
      toast.success(`Đã tải tệp Excel: ${reportName}.`);
    } catch {
      // Error text is rendered below from the hook.
    }
  };

  return (
    <>
      <TopBar
        title={cityOnly ? "Xuất dữ liệu xét duyệt Thành phố" : "Xuất dữ liệu hồ sơ"}
        subtitle={
          cityOnly
            ? `Dữ liệu hồ sơ cá nhân Thành phố · Năm học ${cityPilotSchoolYear}. Kết quả chỉ phản ánh quyết định của mùa xét này.`
            : "Tải báo cáo Excel theo phạm vi và bộ lọc được phép."
        }
      />

      <div className="space-y-5">
        {role === "city_committee" ? <CityCommitteeSubmittedApplications /> : null}

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
            <FilterField label={cityOnly ? "Phạm vi" : "Năm học"}>
              <Input
                aria-label={cityOnly ? "Phạm vi" : undefined}
                disabled={isExporting || cityOnly}
                placeholder="Ví dụ: 2025-2026"
                value={
                  cityOnly ? `Cấp Thành phố · ${cityPilotSchoolYear}` : (filters.schoolYear ?? "")
                }
                onChange={(event) =>
                  setFilters((current) => ({ ...current, schoolYear: event.target.value }))
                }
              />
            </FilterField>

            {!cityOnly ? (
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
            ) : null}

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
            description="Tải danh sách hồ sơ theo bộ lọc, mở trực tiếp bằng Microsoft Excel."
            disabled={isExporting}
            filenameExample={getExportFilenameExample(
              "Danh sách hồ sơ",
              normalizedFilters.schoolYear,
            )}
            icon={<FileSpreadsheet className="h-6 w-6" />}
            isLoading={exportingDataset === "applications"}
            title="Danh sách hồ sơ Excel"
            onExport={() => void handleExport("applications", "Danh sách hồ sơ")}
          />
          <ExportOptionCard
            description="Đối chiếu công việc xét duyệt, minh chứng, hội ý và ghi chú xử lý."
            disabled={isExporting}
            fields={[
              "Mã hồ sơ",
              "Sinh viên",
              "Tiêu chí",
              "Cán bộ phụ trách",
              "Trạng thái",
              "Số minh chứng",
              "Ghi chú xử lý",
            ]}
            filenameExample={getExportFilenameExample(
              "Chi tiết xét duyệt, minh chứng và hội ý",
              normalizedFilters.schoolYear,
            )}
            icon={<FileSpreadsheet className="h-6 w-6" />}
            isLoading={exportingDataset === "reviewTasks"}
            title="Chi tiết xét duyệt, minh chứng và hội ý Excel"
            onExport={() =>
              void handleExport("reviewTasks", "Chi tiết xét duyệt, minh chứng và hội ý")
            }
          />
          <ExportOptionCard
            description={
              cityOnly
                ? "Biên bản kết quả Thành phố theo quyết định cuối đã được xác nhận."
                : "Kết quả xét duyệt đã tổng hợp, gồm kết quả cuối và dữ liệu đối chiếu."
            }
            disabled={isExporting}
            fields={["Sinh viên", "Năm học", "Kết quả cuối", "Người chốt", "Ghi chú"]}
            filenameExample={getExportFilenameExample(
              cityOnly ? "Biên bản kết quả xét duyệt Thành phố" : "Biên bản kết quả xét duyệt",
              normalizedFilters.schoolYear,
            )}
            icon={<FileSpreadsheet className="h-6 w-6" />}
            isLoading={exportingDataset === "reviewResults"}
            title={cityOnly ? "Biên bản kết quả Thành phố Excel" : "Biên bản kết quả cuối Excel"}
            onExport={() =>
              void handleExport(
                "reviewResults",
                cityOnly ? "Biên bản kết quả xét duyệt Thành phố" : "Biên bản kết quả xét duyệt",
              )
            }
          />
          {!cityOnly ? (
            <ExportOptionCard
              description="Danh sách hồ sơ đã chốt đạt, phục vụ tổng hợp danh sách công nhận theo cấp."
              disabled={isExporting}
              fields={[
                "Sinh viên",
                "Cấp đăng ký",
                "Cấp công nhận",
                "Thời điểm chốt",
                "Người chốt",
                "Ghi chú",
              ]}
              filenameExample={getExportFilenameExample(
                "Danh sách sinh viên đạt",
                normalizedFilters.schoolYear,
              )}
              icon={<FileSpreadsheet className="h-6 w-6" />}
              isLoading={exportingDataset === "reviewResults"}
              title="Danh sách sinh viên đạt Excel"
              onExport={() =>
                void handleExport("reviewResults", "Danh sách sinh viên đạt", {
                  ...normalizedFilters,
                  status: "completed",
                })
              }
            />
          ) : null}
          {!cityOnly ? (
            <ExportOptionCard
              description="Danh sách hồ sơ có kết quả công nhận thấp hơn cấp đăng ký."
              disabled={isExporting}
              fields={[
                "Sinh viên",
                "Cấp đăng ký",
                "Cấp đề xuất",
                "Cấp công nhận",
                "Lý do",
                "Năm tiêu chí",
              ]}
              filenameExample={getExportFilenameExample(
                "Danh sách hồ sơ điều chỉnh cấp",
                normalizedFilters.schoolYear,
              )}
              icon={<FileSpreadsheet className="h-6 w-6" />}
              isLoading={exportingDataset === "reviewResults"}
              title="Danh sách hồ sơ điều chỉnh cấp Excel"
              onExport={() => void handleExport("reviewResults", "Danh sách hồ sơ điều chỉnh cấp")}
            />
          ) : null}
          {!cityOnly ? (
            <ExportOptionCard
              description="Danh sách hồ sơ đã chốt chưa đạt, phục vụ đối soát và phản hồi."
              disabled={isExporting}
              fields={["Sinh viên", "Cấp đăng ký", "Kết quả cuối", "Năm tiêu chí", "Ghi chú"]}
              filenameExample={getExportFilenameExample(
                "Danh sách sinh viên chưa đạt",
                normalizedFilters.schoolYear,
              )}
              icon={<FileSpreadsheet className="h-6 w-6" />}
              isLoading={exportingDataset === "reviewResults"}
              title="Danh sách sinh viên chưa đạt Excel"
              onExport={() =>
                void handleExport("reviewResults", "Danh sách sinh viên chưa đạt", {
                  ...normalizedFilters,
                  status: "rejected",
                })
              }
            />
          ) : null}
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
            Tất cả báo cáo trên trang được tải dưới dạng tệp Excel (.xlsx).
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
  filenameExample,
  icon,
  isLoading,
  title,
  onExport,
}: {
  description: string;
  disabled?: boolean;
  fields?: string[];
  filenameExample: string;
  icon: React.ReactNode;
  isLoading?: boolean;
  title: string;
  onExport: () => void;
}) {
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
            Tên tệp: {filenameExample}
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
        {isLoading ? "Đang tạo tệp Excel..." : title}
      </Button>
    </Card>
  );
}
