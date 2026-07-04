import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { DecisionImportColumnMapping } from "@/types/decision-import";

type ColumnMappingDrawerProps = {
  open: boolean;
  columns: string[];
  mapping?: DecisionImportColumnMapping | null;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (mapping: DecisionImportColumnMapping) => void;
};

const fields: Array<{ key: keyof DecisionImportColumnMapping; label: string }> = [
  { key: "studentCode", label: "MSSV" },
  { key: "studentName", label: "Họ và tên" },
  { key: "className", label: "Lớp" },
  { key: "faculty", label: "Khoa" },
  { key: "convertedValue", label: "Giá trị quy đổi" },
  { key: "participationStatus", label: "Trạng thái tham gia" },
];

const noneValue = "__none__";

export function ColumnMappingDrawer({
  open,
  columns,
  mapping,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: ColumnMappingDrawerProps) {
  const [localMapping, setLocalMapping] = useState<DecisionImportColumnMapping>({});

  useEffect(() => {
    if (open) {
      setLocalMapping(mapping ?? {});
    }
  }, [mapping, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Chỉnh cột danh sách</SheetTitle>
          <SheetDescription>
            Chọn cột trong bảng nhận diện tương ứng với các trường SV5T. Sau khi lưu, hệ thống sẽ
            tạo lại preview từ cấu hình cột mới.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {fields.map((field) => (
            <div key={field.key} className="grid gap-2">
              <label className="text-sm font-medium text-foreground">{field.label}</label>
              <Select
                value={localMapping[field.key] || noneValue}
                onValueChange={(value) =>
                  setLocalMapping((current) => ({
                    ...current,
                    [field.key]: value === noneValue ? undefined : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn cột" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={noneValue}>Chưa chọn</SelectItem>
                  {columns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          {!columns.length ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Chưa có danh sách cột nhận diện. Bạn có thể quay lại sau khi hệ thống đọc xong tài
              liệu.
            </div>
          ) : null}
        </div>

        <SheetFooter className="mt-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={() => onSubmit(localMapping)}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Lưu cấu hình cột
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
