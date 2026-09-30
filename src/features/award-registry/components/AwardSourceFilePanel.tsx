import { FileCheck2, FileUp, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AwardDecisionFile } from "@/types/award-registry";

export function AwardSourceFilePanel({
  decisionFile,
  rosterFile,
  layout = "stacked",
  disabled,
  uploadPending,
  error,
  onSelect,
}: {
  decisionFile: AwardDecisionFile | null;
  rosterFile: AwardDecisionFile | null;
  layout?: "stacked" | "split";
  disabled: boolean;
  uploadPending: boolean;
  error: string | null;
  onSelect: (kind: "decision" | "roster", input: HTMLInputElement) => void;
}) {
  return (
    <Card className="space-y-4 border-slate-200 bg-white p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Tài liệu nguồn</p>
        <h2 className="mt-1 text-base font-semibold text-slate-950">
          Hai tài liệu cần cho một quyết định
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          Văn bản quyết định là căn cứ chính thức. Danh sách sinh viên là dữ liệu để hệ thống đọc và
          đối chiếu.
        </p>
      </div>
      <div className={layout === "split" ? "grid gap-3 lg:grid-cols-2" : "space-y-4"}>
        <UploadField
          label="Văn bản quyết định"
          hint="Căn cứ chính thức của đơn vị"
          kind="decision"
          fileName={decisionFile?.originalName}
          disabled={disabled}
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onSelect={onSelect}
        />
        <UploadField
          label="Danh sách sinh viên được công nhận"
          hint="Danh sách để hệ thống đọc và kiểm tra"
          kind="roster"
          fileName={rosterFile?.originalName}
          disabled={disabled}
          accept=".csv,.xlsx,.pdf"
          onSelect={onSelect}
        />
      </div>
      {uploadPending && (
        <p role="status" className="text-sm text-slate-600">
          Đang tải tài liệu lên...
        </p>
      )}
      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}

function UploadField({
  label,
  hint,
  kind,
  fileName,
  disabled,
  accept,
  onSelect,
}: {
  label: string;
  hint: string;
  kind: "decision" | "roster";
  fileName?: string;
  disabled: boolean;
  accept: string;
  onSelect: (kind: "decision" | "roster", input: HTMLInputElement) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-slate-100 p-2 text-slate-600">
          {kind === "decision" ? (
            <FileUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <FileCheck2 className="h-4 w-4" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900">{label}</p>
          <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
          <p className="mt-2 truncate text-xs text-slate-700">{fileName || "Chưa tải tài liệu"}</p>
        </div>
      </div>
      {disabled ? (
        <p className="mt-3 text-xs text-slate-500">
          Chỉ có thể thay tài liệu khi quyết định ở trạng thái bản nháp.
        </p>
      ) : (
        <Button asChild type="button" variant="outline" size="sm" className="mt-3">
          <label className="cursor-pointer">
            <Upload aria-hidden="true" /> Chọn tệp
            <input
              aria-label={kind === "roster" ? "Tệp danh sách" : "Tệp văn bản quyết định"}
              type="file"
              accept={accept}
              className="sr-only"
              onChange={(event) => onSelect(kind, event.currentTarget)}
            />
          </label>
        </Button>
      )}
      {!disabled && (
        <p className="mt-2 text-[11px] text-slate-500">Định dạng: {accept.replaceAll(",", " ")}</p>
      )}
    </div>
  );
}
