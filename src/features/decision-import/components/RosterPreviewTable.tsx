import { useMemo, useState } from "react";
import { Eye, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  DecisionImportPreviewRow,
  DecisionImportValidationStatus,
} from "@/types/decision-import";
import {
  compactFacts,
  formatConvertedValue,
  formatParticipationStatus,
  formatSourceLocation,
  hasColumnValue,
  isPresentDisplayValue,
  validationStatusLabel,
  validationStatusOptions,
  warningLabel,
} from "./decision-import-utils";

type RosterPreviewTableProps = {
  rows: DecisionImportPreviewRow[];
};

const pageSize = 15;

export function RosterPreviewTable({ rows }: RosterPreviewTableProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<DecisionImportValidationStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<DecisionImportPreviewRow | null>(null);
  const columns = useMemo(
    () => ({
      className: hasColumnValue(rows, (row) => row.className),
      faculty: hasColumnValue(rows, (row) => row.faculty),
      convertedValue: rows.some(
        (row) => typeof row.convertedValue === "number" || isPresentDisplayValue(row.convertedUnit),
      ),
      participationStatus: hasColumnValue(rows, (row) => row.participationStatus),
      source: rows.some((row) => Boolean(formatSourceLocation(row))),
      warnings: rows.some((row) => row.validationWarnings.length > 0),
    }),
    [rows],
  );
  const columnCount = 5 + Object.values(columns).filter(Boolean).length;

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = status === "all" || row.validationStatus === status;
      const matchesQuery =
        !normalizedQuery ||
        [row.studentCode, row.studentName, row.className, row.faculty]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [query, rows, status]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <section className="rounded-md border bg-white">
      <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Preview danh sách sinh viên</h2>
          <p className="text-sm text-muted-foreground">
            Kiểm tra dữ liệu đã chuẩn hoá trước khi lưu vào kho chính thức.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_220px]">
          <label className="relative block">
            <span className="sr-only">Tìm MSSV hoặc họ tên</span>
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              className="pl-9"
              placeholder="Tìm MSSV, họ tên, lớp..."
            />
          </label>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as DecisionImportValidationStatus | "all");
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              {validationStatusOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="sticky top-0 bg-muted/70 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <Th>STT</Th>
              <Th>MSSV</Th>
              <Th>Họ và tên</Th>
              {columns.className ? <Th>Lớp</Th> : null}
              {columns.faculty ? <Th>Khoa</Th> : null}
              {columns.convertedValue ? <Th>Giá trị</Th> : null}
              {columns.participationStatus ? <Th>Tham gia</Th> : null}
              {columns.source ? <Th>Nguồn</Th> : null}
              <Th>Trạng thái</Th>
              {columns.warnings ? <Th>Cảnh báo</Th> : null}
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.length ? (
              pagedRows.map((row) => (
                <tr key={row.rowId} className="border-t align-top">
                  <Td>{row.index ?? ""}</Td>
                  <Td className="font-semibold text-foreground">
                    {row.studentCode ? (
                      row.studentCode
                    ) : (
                      <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                        Thiếu MSSV
                      </Badge>
                    )}
                  </Td>
                  <Td>{row.studentName ?? ""}</Td>
                  {columns.className ? <Td>{row.className ?? ""}</Td> : null}
                  {columns.faculty ? <Td>{row.faculty ?? ""}</Td> : null}
                  {columns.convertedValue ? (
                    <Td>{formatConvertedValue(row.convertedValue, row.convertedUnit) ?? ""}</Td>
                  ) : null}
                  {columns.participationStatus ? (
                    <Td>{formatParticipationStatus(row.participationStatus) ?? ""}</Td>
                  ) : null}
                  {columns.source ? <Td>{formatSourceLocation(row) ?? ""}</Td> : null}
                  <Td>
                    <Badge variant="outline" className={getStatusClass(row.validationStatus)}>
                      {validationStatusLabel[row.validationStatus]}
                    </Badge>
                  </Td>
                  {columns.warnings ? (
                    <Td>
                      <div className="flex max-w-[220px] flex-wrap gap-1">
                        {row.validationWarnings.length
                          ? row.validationWarnings.slice(0, 3).map((warning) => (
                              <Badge key={warning} variant="outline">
                                {warningLabel(warning)}
                              </Badge>
                            ))
                          : null}
                      </div>
                    </Td>
                  ) : null}
                  <Td>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRow(row)}
                    >
                      <Eye className="h-4 w-4" />
                      Chi tiết
                    </Button>
                  </Td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columnCount} className="p-6 text-center text-muted-foreground">
                  Không có dòng nào phù hợp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm">
        <div className="text-muted-foreground">
          Hiển thị {pagedRows.length} / {filteredRows.length} dòng
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Trước
          </Button>
          <span className="text-muted-foreground">
            Trang {currentPage}/{totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          >
            Sau
          </Button>
        </div>
      </div>

      <RowDetailDrawer row={selectedRow} onOpenChange={(open) => !open && setSelectedRow(null)} />
    </section>
  );
}

function RowDetailDrawer({
  row,
  onOpenChange,
}: {
  row: DecisionImportPreviewRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={Boolean(row)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Chi tiết dòng preview</SheetTitle>
          <SheetDescription>Dữ liệu đã chuẩn hoá từ dòng trong danh sách.</SheetDescription>
        </SheetHeader>
        {row ? (
          <div className="mt-6 space-y-4">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              {compactFacts([
                { label: "MSSV", value: row.studentCode },
                { label: "Họ tên", value: row.studentName },
                { label: "Lớp", value: row.className },
                { label: "Khoa", value: row.faculty },
                {
                  label: "Giá trị quy đổi",
                  value: formatConvertedValue(row.convertedValue, row.convertedUnit),
                },
                {
                  label: "Trạng thái tham gia",
                  value: formatParticipationStatus(row.participationStatus),
                },
                { label: "Nguồn", value: formatSourceLocation(row) },
              ]).map((fact) => (
                <Info key={fact.label} label={fact.label} value={fact.value} />
              ))}
            </div>

            {row.validationWarnings.length ? (
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="font-semibold text-foreground">Cảnh báo</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {row.validationWarnings.map((warning) => (
                    <Badge key={warning} variant="outline" className="bg-white">
                      {warningLabel(warning)}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {row.safeRawSummary ? (
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="font-semibold text-foreground">Tóm tắt dòng nguồn</div>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[150px_minmax(0,1fr)]">
                  {Object.entries(row.safeRawSummary)
                    .filter(([, value]) => isPresentDisplayValue(value))
                    .map(([key, value]) => (
                      <div key={key} className="contents">
                        <dt className="text-muted-foreground">{key}</dt>
                        <dd className="break-words font-medium text-foreground">{String(value)}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-semibold">{children}</th>;
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-3 ${className ?? ""}`}>{children}</td>;
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  if (!isPresentDisplayValue(value)) return null;

  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-semibold text-foreground">{value}</div>
    </div>
  );
}

function getStatusClass(status: DecisionImportValidationStatus) {
  if (status === "valid") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "invalid" || status === "missing_student_code") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === "duplicate" || status === "warning" || status === "needs_manual_review") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "";
}
