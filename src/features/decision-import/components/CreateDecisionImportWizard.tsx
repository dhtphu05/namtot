import { useMemo, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Criterion, Level } from "@/lib/api/types";
import type { DecisionImport } from "@/types/decision-import";
import {
  useCreateDecisionImport,
  useStartDecisionImport,
  useUploadDecisionImportFile,
} from "@/features/decision-import/hooks/useDecisionImports";
import { criterionOptions, levelOptions } from "./decision-import-utils";

type CreateDecisionImportWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStarted: (importId: string) => void;
  onCreated: (importId: string) => void;
};

type FormState = {
  title: string;
  criterion: Criterion | "";
  eventName: string;
  organizer: string;
  organizerLevel: Level | "";
  startDate: string;
  endDate: string;
  convertedValue: string;
  convertedUnit: string;
  eligibleLevels: Level[];
};

const initialForm: FormState = {
  title: "",
  criterion: "",
  eventName: "",
  organizer: "",
  organizerLevel: "",
  startDate: "",
  endDate: "",
  convertedValue: "",
  convertedUnit: "",
  eligibleLevels: [],
};

const noneValue = "__none__";

export function CreateDecisionImportWizard({
  open,
  onOpenChange,
  onStarted,
  onCreated,
}: CreateDecisionImportWizardProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdImport, setCreatedImport] = useState<DecisionImport | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const createImport = useCreateDecisionImport();
  const uploadFile = useUploadDecisionImportFile(createdImport?.id);
  const startImport = useStartDecisionImport(createdImport?.id);

  const isBusy = createImport.isPending || uploadFile.isPending || startImport.isPending;
  const canUpload = Boolean(createdImport?.id);
  const canStart = Boolean(
    createdImport?.id && (file || createdImport.sourceFileId || createdImport.fileStatus),
  );

  const selectedFileLabel = useMemo(() => {
    if (!file) return "Chọn PDF hoặc ảnh quyết định/danh sách";
    return `${file.name} (${Math.round(file.size / 1024)} KB)`;
  }, [file]);

  const reset = () => {
    setStep(1);
    setForm(initialForm);
    setErrors({});
    setCreatedImport(null);
    setFile(null);
  };

  const close = (nextOpen: boolean) => {
    if (!nextOpen && !isBusy) reset();
    onOpenChange(nextOpen);
  };

  const create = async () => {
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const created = await createImport.mutateAsync({
      title: form.title.trim(),
      criterion: form.criterion || undefined,
      eventName: form.eventName.trim() || undefined,
      organizer: form.organizer.trim() || undefined,
      organizerLevel: form.organizerLevel || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      convertedValue: form.convertedValue ? Number(form.convertedValue) : undefined,
      convertedUnit: form.convertedUnit.trim() || undefined,
      eligibleLevels: form.eligibleLevels,
    });
    setCreatedImport(created);
    onCreated(created.id);
    setStep(2);
  };

  const upload = async () => {
    if (!file) {
      setErrors({ file: "Vui lòng chọn file quyết định hoặc danh sách." });
      return;
    }
    const uploaded = await uploadFile.mutateAsync(file);
    setCreatedImport(uploaded);
    setStep(3);
  };

  const start = async () => {
    const started = await startImport.mutateAsync();
    close(false);
    onStarted(started.id);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo phiên đọc quyết định</DialogTitle>
          <DialogDescription>
            Nhập thông tin nghiệp vụ để hệ thống đọc danh sách sinh viên và lưu minh chứng đúng tiêu
            chí SV5T.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 sm:grid-cols-3">
          {["Thông tin quyết định", "Tải quyết định/danh sách", "Đọc danh sách sinh viên"].map(
            (label, index) => (
              <div
                key={label}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  step === index + 1 ? "border-primary bg-primary/5 text-primary" : "bg-muted/30"
                }`}
              >
                {index + 1}. {label}
              </div>
            ),
          )}
        </div>

        {step === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tiêu đề *" error={errors.title}>
              <Input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="VD: Quyết định khen thưởng Sinh viên 5 tốt cấp Trường"
              />
            </Field>
            <Field label="Tiêu chí">
              <Select
                value={form.criterion || noneValue}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    criterion: value === noneValue ? "" : (value as Criterion),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tiêu chí" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={noneValue}>Chưa chọn</SelectItem>
                  {criterionOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tên hoạt động">
              <Input
                value={form.eventName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, eventName: event.target.value }))
                }
              />
            </Field>
            <Field label="Đơn vị tổ chức">
              <Input
                value={form.organizer}
                onChange={(event) =>
                  setForm((current) => ({ ...current, organizer: event.target.value }))
                }
              />
            </Field>
            <Field label="Cấp tổ chức">
              <Select
                value={form.organizerLevel || noneValue}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    organizerLevel: value === noneValue ? "" : (value as Level),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn cấp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={noneValue}>Chưa chọn</SelectItem>
                  {levelOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Giá trị quy đổi" error={errors.convertedValue}>
              <Input
                value={form.convertedValue}
                inputMode="decimal"
                onChange={(event) =>
                  setForm((current) => ({ ...current, convertedValue: event.target.value }))
                }
                placeholder="VD: 3"
              />
            </Field>
            <Field label="Đơn vị quy đổi">
              <Input
                value={form.convertedUnit}
                onChange={(event) =>
                  setForm((current) => ({ ...current, convertedUnit: event.target.value }))
                }
                placeholder="ngày / điểm / giải"
              />
            </Field>
            <Field label="Ngày bắt đầu" error={errors.dateRange}>
              <Input
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, startDate: event.target.value }))
                }
              />
            </Field>
            <Field label="Ngày kết thúc">
              <Input
                type="date"
                value={form.endDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, endDate: event.target.value }))
                }
              />
            </Field>
            <div className="space-y-2 sm:col-span-2">
              <div className="text-sm font-medium text-foreground">Cấp xét phù hợp</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {levelOptions.map((level) => (
                  <label
                    key={level.value}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={form.eligibleLevels.includes(level.value)}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          eligibleLevels: event.target.checked
                            ? [...current.eligibleLevels, level.value]
                            : current.eligibleLevels.filter((value) => value !== level.value),
                        }))
                      }
                    />
                    {level.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
              Dùng bản PDF hoặc ảnh rõ nét của quyết định, công văn hoặc danh sách chính thức có
              MSSV và họ tên sinh viên.
            </div>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
              <UploadCloud className="h-8 w-8 text-primary" />
              <div className="mt-3 font-semibold text-foreground">Tải quyết định/danh sách</div>
              <div className="mt-1 text-sm text-muted-foreground">{selectedFileLabel}</div>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(event) => {
                  setErrors({});
                  setFile(event.target.files?.[0] ?? null);
                }}
              />
            </label>
            {errors.file ? <p className="text-sm text-rose-700">{errors.file}</p> : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              Đã nhận tài liệu.
            </div>
            <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
              Hệ thống sẽ đọc thông tin văn bản và danh sách sinh viên. Cán bộ kiểm tra preview
              trước khi xác nhận vào kho minh chứng SV5T.
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isBusy} onClick={() => close(false)}>
            Hủy
          </Button>
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={() => setStep((value) => value - 1)}
            >
              Quay lại
            </Button>
          ) : null}
          {step === 1 ? (
            <Button type="button" disabled={isBusy} onClick={() => void create()}>
              {createImport.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Tạo phiên đọc quyết định
            </Button>
          ) : null}
          {step === 2 ? (
            <Button type="button" disabled={!canUpload || isBusy} onClick={() => void upload()}>
              {uploadFile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Tải tài liệu lên
            </Button>
          ) : null}
          {step === 3 ? (
            <Button type="button" disabled={!canStart || isBusy} onClick={() => void start()}>
              {startImport.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Đọc danh sách sinh viên
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      {children}
      {error ? <span className="text-xs font-normal text-rose-700">{error}</span> : null}
    </label>
  );
}

function validateForm(form: FormState) {
  const errors: Record<string, string> = {};
  if (!form.title.trim()) errors.title = "Tiêu đề là bắt buộc.";
  if (form.convertedValue && Number.isNaN(Number(form.convertedValue))) {
    errors.convertedValue = "Giá trị quy đổi phải là số.";
  }
  if (form.startDate && form.endDate && new Date(form.startDate) > new Date(form.endDate)) {
    errors.dateRange = "Ngày bắt đầu không được sau ngày kết thúc.";
  }
  return errors;
}
