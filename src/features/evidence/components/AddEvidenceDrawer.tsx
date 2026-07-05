import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileUp, ListChecks, Loader2, Search, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Criterion, EvidenceResponse } from "@/lib/api/types";
import {
  useCreateEvidence,
  useDeleteEvidence,
  useStartEvidenceIndexing,
  useUploadEvidenceFile,
} from "@/features/evidence/hooks/useEvidence";
import { useAuth } from "@/features/auth/store/auth-store";
import { useCheckParticipant, useEvents, useImportToApplication } from "@/features/event/hooks/useEvent";
import type { EventRegistryItem } from "@/features/event/api/event";

type AddEvidenceDrawerProps = {
  applicationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCriterion?: Criterion;
  existingEvidence?: EvidenceResponse | null;
  onCreated: (evidence: EvidenceResponse) => void;
};

type AddMode = "event" | "manual";
type FormValues = Record<string, string>;

type FieldConfig = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "number" | "date" | "textarea" | "select";
  options?: string[];
};

type CriterionDrawerConfig = {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  defaultName: string;
  fields: FieldConfig[];
};

const maxFileSize = 10 * 1024 * 1024;
const acceptedExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
const acceptedMimeTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

const criterionConfigs: Record<Criterion, CriterionDrawerConfig> = {
  ethics: {
    title: "Thêm minh chứng Đạo đức tốt",
    subtitle: "Nộp điểm rèn luyện, giấy xác nhận tham gia hoạt động Đoàn - Hội hoặc giấy khen liên quan.",
    searchPlaceholder: "Tìm hoạt động Đoàn - Hội, giấy xác nhận...",
    defaultName: "Minh chứng Đạo đức tốt",
    fields: [
      { key: "evidenceName", label: "Tên minh chứng", placeholder: "Ví dụ: Giấy xác nhận tham gia hoạt động Đoàn - Hội" },
      { key: "conductScore", label: "Điểm rèn luyện nếu liên quan", type: "number", placeholder: "Ví dụ: 85" },
      { key: "issuer", label: "Đơn vị xác nhận", placeholder: "Ví dụ: Đoàn khoa Công nghệ thông tin" },
      { key: "note", label: "Ghi chú", type: "textarea", placeholder: "Thông tin bổ sung để cán bộ dễ kiểm tra" },
    ],
  },
  academic: {
    title: "Thêm minh chứng Học tập tốt",
    subtitle: "Nộp bảng điểm, giấy khen, minh chứng nghiên cứu khoa học hoặc cuộc thi học thuật.",
    searchPlaceholder: "Tìm cuộc thi học thuật, nghiên cứu khoa học...",
    defaultName: "Minh chứng Học tập tốt",
    fields: [
      {
        key: "evidenceType",
        label: "Loại minh chứng",
        type: "select",
        options: ["Bảng điểm", "NCKH", "Cuộc thi học thuật", "Giấy khen", "Khác"],
      },
      { key: "score", label: "GPA hoặc điểm liên quan nếu có", type: "number", placeholder: "Ví dụ: 3.25 hoặc 8.2" },
      { key: "evidenceName", label: "Tên minh chứng", placeholder: "Ví dụ: Bảng điểm học kỳ 1" },
      { key: "issuer", label: "Đơn vị cấp/xác nhận", placeholder: "Ví dụ: Phòng Đào tạo" },
    ],
  },
  physical: {
    title: "Thêm minh chứng Thể lực tốt",
    subtitle: "Nộp điểm thể dục, giấy chứng nhận sinh viên khỏe, giải thể thao hoặc hoạt động thể thao.",
    searchPlaceholder: "Tìm giải thể thao, sinh viên khỏe...",
    defaultName: "Minh chứng Thể lực tốt",
    fields: [
      {
        key: "evidenceType",
        label: "Loại minh chứng",
        type: "select",
        options: ["Điểm thể dục", "Sinh viên khỏe", "Giải thể thao", "Hoạt động thể thao", "Khác"],
      },
      { key: "evidenceName", label: "Tên hoạt động/giải/chứng nhận", placeholder: "Ví dụ: Giấy chứng nhận Sinh viên khỏe" },
      { key: "organizerLevel", label: "Cấp tổ chức nếu có", placeholder: "Ví dụ: Cấp trường, cấp thành phố" },
      { key: "result", label: "Kết quả nếu có", placeholder: "Ví dụ: Đạt, giải Nhì, hoàn thành" },
    ],
  },
  volunteer: {
    title: "Thêm minh chứng Tình nguyện tốt",
    subtitle: "Nộp giấy xác nhận hoạt động, chiến dịch, hiến máu hoặc số ngày/buổi tình nguyện.",
    searchPlaceholder: "Tìm chiến dịch, hoạt động, hiến máu...",
    defaultName: "Minh chứng Tình nguyện tốt",
    fields: [
      { key: "evidenceName", label: "Tên hoạt động/chiến dịch", placeholder: "Ví dụ: Chiến dịch Mùa hè xanh" },
      { key: "organizer", label: "Đơn vị tổ chức", placeholder: "Ví dụ: Hội Sinh viên trường" },
      { key: "timeRange", label: "Thời gian tham gia", placeholder: "Ví dụ: 05/2026 - 06/2026" },
      { key: "volunteerDays", label: "Số ngày/buổi tình nguyện", type: "number", placeholder: "Ví dụ: 3" },
      { key: "role", label: "Vai trò nếu có", placeholder: "Ví dụ: Tình nguyện viên, đội trưởng" },
    ],
  },
  integration: {
    title: "Thêm minh chứng Hội nhập tốt",
    subtitle: "Nộp chứng chỉ ngoại ngữ, hoạt động hội nhập, tập huấn kỹ năng hoặc cuộc thi ngoại ngữ.",
    searchPlaceholder: "Tìm hội thảo, tập huấn, giao lưu quốc tế...",
    defaultName: "Minh chứng Hội nhập tốt",
    fields: [
      {
        key: "evidenceType",
        label: "Loại minh chứng",
        type: "select",
        options: ["Chứng chỉ ngoại ngữ", "Hoạt động hội nhập", "Tập huấn kỹ năng", "Cuộc thi ngoại ngữ", "Khác"],
      },
      { key: "evidenceName", label: "Tên chứng chỉ/hoạt động", placeholder: "Ví dụ: TOEIC 650 hoặc Hội thảo giao lưu quốc tế" },
      { key: "levelOrScore", label: "Điểm/trình độ nếu có", placeholder: "Ví dụ: B1, IELTS 6.0, TOEIC 650" },
      { key: "issuer", label: "Đơn vị cấp/tổ chức", placeholder: "Ví dụ: IIG Việt Nam" },
      { key: "issuedAt", label: "Ngày cấp hoặc thời gian tham gia", placeholder: "Ví dụ: 12/05/2026" },
    ],
  },
  priority: {
    title: "Thêm minh chứng thành tích ưu tiên",
    subtitle: "Nộp giấy khen hoặc thành tích bổ sung nếu hồ sơ có yêu cầu riêng.",
    searchPlaceholder: "Tìm giấy khen, cuộc thi, hoạt động...",
    defaultName: "Minh chứng thành tích ưu tiên",
    fields: [
      { key: "evidenceName", label: "Tên minh chứng", placeholder: "Ví dụ: Giấy khen cấp trường" },
      { key: "issuer", label: "Đơn vị cấp/xác nhận", placeholder: "Ví dụ: Trường Đại học" },
      { key: "note", label: "Ghi chú", type: "textarea" },
    ],
  },
  collective: {
    title: "Thêm minh chứng tập thể",
    subtitle: "Nộp giấy xác nhận hoặc quyết định liên quan đến minh chứng tập thể.",
    searchPlaceholder: "Tìm minh chứng tập thể...",
    defaultName: "Minh chứng tập thể",
    fields: [
      { key: "evidenceName", label: "Tên minh chứng", placeholder: "Ví dụ: Quyết định công nhận tập thể" },
      { key: "issuer", label: "Đơn vị cấp/xác nhận" },
      { key: "note", label: "Ghi chú", type: "textarea" },
    ],
  },
};

const mainCriteria: Criterion[] = ["ethics", "academic", "physical", "volunteer", "integration"];

export function AddEvidenceDrawer({
  applicationId,
  open,
  onOpenChange,
  initialCriterion = "academic",
  existingEvidence = null,
  onCreated,
}: AddEvidenceDrawerProps) {
  const [mode, setMode] = useState<AddMode>("manual");
  const [criterion, setCriterion] = useState<Criterion>(initialCriterion);
  const [values, setValues] = useState<FormValues>({});
  const [file, setFile] = useState<File | null>(null);
  const [nameError, setNameError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [participantChecks, setParticipantChecks] = useState<Record<string, { ok: boolean; message?: string; loading?: boolean }>>({});
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const studentCode = useAuth((state) => state.user?.studentCode);

  const createEvidence = useCreateEvidence(applicationId);
  const rollbackEvidence = useDeleteEvidence(applicationId);
  const uploadFile = useUploadEvidenceFile(applicationId);
  const startIndexing = useStartEvidenceIndexing(applicationId);
  const eventsQuery = useEvents({
    search: eventSearch || undefined,
    criterion,
    limit: 6,
  });
  const checkParticipant = useCheckParticipant();
  const importEvent = useImportToApplication();
  const isSubmitting = createEvidence.isPending || uploadFile.isPending || startIndexing.isPending || rollbackEvidence.isPending;
  const isEventBusy = checkParticipant.isPending || importEvent.isPending;
  const config = criterionConfigs[criterion] ?? criterionConfigs.academic;
  const eventResults = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);

  useEffect(() => {
    if (!open) return;
    const nextCriterion = existingEvidence?.criterion ?? initialCriterion;
    const nextConfig = criterionConfigs[nextCriterion] ?? criterionConfigs.academic;
    setCriterion(nextCriterion);
    setMode("manual");
    setValues({
      evidenceName: existingEvidence?.evidenceName ?? nextConfig.defaultName,
      note: typeof existingEvidence?.note === "string" ? existingEvidence.note : "",
    });
    setFile(null);
    setNameError("");
    setFieldError("");
    setEventSearch("");
    setParticipantChecks({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [existingEvidence, initialCriterion, open]);

  const fileLabel = useMemo(() => {
    if (!file) return "Kéo thả file vào đây hoặc bấm để chọn";
    const size = file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    return `${file.name} (${size})`;
  }, [file]);

  const setField = (key: string, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (key === "evidenceName") setNameError("");
    setFieldError("");
  };

  const handleFileChange = (selectedFile?: File | null) => {
    if (!selectedFile) {
      setFile(null);
      return;
    }

    const extension = `.${selectedFile.name.split(".").pop()?.toLowerCase() ?? ""}`;
    const validType = acceptedMimeTypes.includes(selectedFile.type) || acceptedExtensions.includes(extension);
    if (!validType) {
      toast.error("Tệp không đúng định dạng. Vui lòng tải PDF, PNG, JPG, JPEG hoặc WEBP.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (selectedFile.size > maxFileSize) {
      toast.error("Tệp vượt quá dung lượng cho phép.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFile(selectedFile);
  };

  const validate = () => {
    const trimmedName = values.evidenceName?.trim();
    if (!trimmedName) {
      setNameError("Tên minh chứng là bắt buộc.");
      return false;
    }

    const volunteerDays = values.volunteerDays?.trim();
    if (criterion === "volunteer" && volunteerDays && Number(volunteerDays) < 0) {
      setFieldError("Số ngày/buổi tình nguyện phải lớn hơn hoặc bằng 0.");
      return false;
    }

    const score = values.score?.trim();
    if (criterion === "academic" && score) {
      const numericScore = Number(score);
      if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 10) {
        setFieldError("GPA hoặc điểm liên quan cần nằm trong thang điểm hợp lệ.");
        return false;
      }
    }

    return true;
  };

  const buildDescription = () => {
    const rows = config.fields
      .filter((field) => field.key !== "evidenceName")
      .map((field) => {
        const value = values[field.key]?.trim();
        return value ? `${field.label}: ${value}` : "";
      })
      .filter(Boolean);
    return rows.join("\n") || undefined;
  };

  const submit = async () => {
    if (!validate()) return;
    let created: EvidenceResponse | null = null;
    let uploadSucceeded = !file;

    try {
      const createdEvidence = await createEvidence.mutateAsync({
        applicationId,
        data: {
          evidenceName: values.evidenceName.trim(),
          criterion,
          sourceType: "manual_upload",
          description: buildDescription(),
          note: values.note?.trim() || undefined,
          metadata: {
            criterion,
            entryMode: "manual",
            ...values,
          },
        },
      });
      created = createdEvidence as unknown as EvidenceResponse;

      let latest: EvidenceResponse = created;
      if (file) {
        const uploaded = await uploadFile.mutateAsync({
          evidenceId: createdEvidence.id,
          applicationId,
          file,
        });
        const uploadedEvidence = uploaded.res as unknown as EvidenceResponse | undefined;
        latest = mergeEvidenceAfterUpload(latest, uploadedEvidence);
        uploadSucceeded = true;
      }

      if (file && !latest.jobId) {
        try {
          const indexed = await startIndexing.mutateAsync({ evidenceId: createdEvidence.id });
          latest = mergeEvidenceAfterUpload(latest, indexed as unknown as EvidenceResponse | undefined);
        } catch {
          toast.warning("Đã lưu file minh chứng. Hệ thống sẽ kiểm tra lại file sau.");
        }
      }

      toast.success(
        file
          ? "Đã lưu minh chứng. Hệ thống sẽ kiểm tra khả năng đọc file."
          : "Đã lưu thông tin minh chứng. Bạn có thể bổ sung tệp sau.",
      );
      onCreated(latest);
      onOpenChange(false);
    } catch {
      if (file && created?.id && !uploadSucceeded) {
        await rollbackEvidence.mutateAsync({ id: created.id, applicationId, silent: true }).catch(() => undefined);
      }
      toast.error("Không thể lưu minh chứng. Vui lòng kiểm tra lại thông tin và thử lại.");
    }
  };

  const checkEvent = async (event: EventRegistryItem) => {
    setParticipantChecks((current) => ({ ...current, [event.id]: { ok: false, loading: true } }));
    try {
      const result = await checkParticipant.mutateAsync({
        eventId: event.id,
        studentCode: studentCode ?? "",
        applicationId,
      });
      const matched = Boolean(result?.matched);
      setParticipantChecks((current) => ({
        ...current,
        [event.id]: {
          ok: matched,
          loading: false,
          message: matched
            ? "Đã tìm thấy thông tin tham gia của bạn trong sự kiện này."
            : result?.message || "Chưa tìm thấy MSSV của bạn trong danh sách sự kiện này.",
        },
      }));
    } catch {
      setParticipantChecks((current) => ({
        ...current,
        [event.id]: {
          ok: false,
          loading: false,
          message: "Chưa kiểm tra được danh sách tham gia. Bạn có thể thử lại hoặc tự tải minh chứng.",
        },
      }));
    }
  };

  const importEventEvidence = async (event: EventRegistryItem) => {
    try {
      const imported = await importEvent.mutateAsync({ eventId: event.id, applicationId });
      onCreated({
        id: event.id,
        applicationId,
        evidenceName: event.eventName,
        criterion: event.criterion ?? criterion,
        sourceType: "event_import",
        status: "indexed",
        indexingStatus: "indexed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(typeof imported === "object" && imported ? imported : {}),
      } as EvidenceResponse);
      onOpenChange(false);
    } catch {
      toast.error("Không thể import sự kiện vào hồ sơ. Vui lòng thử lại hoặc tự tải minh chứng.");
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[94vh] max-w-4xl overflow-y-auto">
        <DrawerHeader className="border-b border-[#E3ECF6]">
          <DrawerTitle>{config.title}</DrawerTitle>
          <DrawerDescription>{config.subtitle}</DrawerDescription>
        </DrawerHeader>

        <div className="space-y-5 px-4 py-4 md:px-6">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                mode === "event" ? "bg-white text-brand-deep shadow-sm" : "text-muted-foreground"
              }`}
              onClick={() => setMode("event")}
            >
              Tìm trong sự kiện đã xác nhận
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                mode === "manual" ? "bg-white text-brand-deep shadow-sm" : "text-muted-foreground"
              }`}
              onClick={() => setMode("manual")}
            >
              Tự tải minh chứng
            </button>
          </div>

          <div className="space-y-2">
            <Label>Tiêu chí</Label>
            <Select
              value={criterion}
              onValueChange={(value) => {
                const nextCriterion = value as Criterion;
                setCriterion(nextCriterion);
                setValues((current) => ({
                  ...current,
                  evidenceName: current.evidenceName || criterionConfigs[nextCriterion].defaultName,
                }));
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn tiêu chí" />
              </SelectTrigger>
              <SelectContent>
                {mainCriteria.map((key) => (
                  <SelectItem key={key} value={key}>
                    {criterionConfigs[key].title.replace("Thêm minh chứng ", "")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "event" ? (
            <div className="rounded-xl border border-[#E3ECF6] bg-[#F8FBFE] p-4">
              <Label htmlFor="event-search">Tìm trong sự kiện đã xác nhận</Label>
              <div className="mt-2 flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="event-search"
                    value={eventSearch}
                    onChange={(event) => setEventSearch(event.target.value)}
                    placeholder={config.searchPlaceholder}
                    className="pl-9"
                  />
                </div>
                <Button type="button" variant="secondary" disabled={eventsQuery.isFetching}>
                  {eventsQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Tìm
                </Button>
              </div>
              {eventsQuery.isLoading ? (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#E3ECF6] bg-white px-4 py-5 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tìm trong sự kiện đã xác nhận...
                </div>
              ) : eventResults.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {eventResults.map((event) => {
                    const check = participantChecks[event.id];
                    return (
                      <div key={event.id} className="rounded-lg border border-[#E3ECF6] bg-white p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="font-semibold text-brand-deep">{event.eventName}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {event.organizer || "Đơn vị tổ chức chưa cập nhật"}
                              {event.startDate ? ` - ${new Date(event.startDate).toLocaleDateString("vi-VN")}` : ""}
                            </div>
                            {check?.message ? (
                              <div className={`mt-2 flex items-center gap-2 text-xs ${check.ok ? "text-emerald-700" : "text-amber-700"}`}>
                                {check.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                                {check.message}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={isEventBusy || check?.loading}
                              onClick={() => void checkEvent(event)}
                            >
                              {check?.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
                              Kiểm tra tên
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={isEventBusy || !check?.ok}
                              onClick={() => void importEventEvidence(event)}
                            >
                              {importEvent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              Import vào hồ sơ
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-[#B8CEE8] bg-white px-4 py-5 text-sm text-muted-foreground">
                  Chưa tìm thấy trong sự kiện đã xác nhận. Bạn có thể tự tải minh chứng bên dưới.
                </div>
              )}
              <Button type="button" className="mt-4" variant="outline" onClick={() => setMode("manual")}>
                Tự tải minh chứng
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {config.fields.map((field) => (
                  <FieldControl
                    key={`${criterion}-${field.key}`}
                    field={field}
                    value={values[field.key] ?? ""}
                    error={field.key === "evidenceName" ? nameError : ""}
                    disabled={isSubmitting}
                    onChange={(value) => setField(field.key, value)}
                  />
                ))}
              </div>

              {fieldError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {fieldError}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>File minh chứng</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={acceptedExtensions.join(",")}
                  disabled={isSubmitting}
                  onChange={(event) => handleFileChange(event.target.files?.[0])}
                />
                <div
                  role="button"
                  tabIndex={0}
                  className={`rounded-xl border border-dashed px-4 py-6 text-center transition-colors ${
                    dragActive ? "border-[#0057C2] bg-[#F1F7FD]" : "border-[#B8CEE8] bg-[#F8FBFE]"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragActive(false);
                    handleFileChange(event.dataTransfer.files?.[0]);
                  }}
                >
                  <UploadCloud className="mx-auto h-8 w-8 text-[#0057C2]" />
                  <div className="mt-2 text-sm font-semibold text-brand-deep">{fileLabel}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Hỗ trợ PDF, PNG, JPG, JPEG, WEBP. Tối đa 10MB.
                  </div>
                </div>
                {file ? (
                  <div className="flex items-center justify-between rounded-lg bg-[#F1F7FD] px-3 py-2 text-sm text-brand-deep">
                    <span className="min-w-0 truncate">
                      <FileUp className="mr-2 inline h-4 w-4" />
                      {file.name}
                    </span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => handleFileChange(null)} disabled={isSubmitting}>
                      <X className="h-4 w-4" />
                      Bỏ chọn
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Chưa có tệp đính kèm. Bạn vẫn có thể lưu thông tin trước và bổ sung tệp sau.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DrawerFooter className="border-t border-[#E3ECF6]">
          <Button type="button" onClick={() => void submit()} disabled={isSubmitting || mode === "event"}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {file ? "Lưu và tải file" : "Lưu thông tin minh chứng"}
          </Button>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function mergeEvidenceAfterUpload(
  current: EvidenceResponse,
  next?: EvidenceResponse,
): EvidenceResponse {
  if (!next) return current;
  if (next.id) return next;
  const files = Array.isArray(next.files) && next.files.length ? next.files : current.files;
  return {
    ...current,
    fileId: next.fileId ?? current.fileId,
    fileName: next.fileName ?? current.fileName,
    jobId: next.jobId ?? current.jobId,
    indexingStatus: next.indexingStatus ?? current.indexingStatus,
    files,
    updatedAt: next.updatedAt || current.updatedAt,
  };
}

function FieldControl({
  field,
  value,
  error,
  disabled,
  onChange,
}: {
  field: FieldConfig;
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const id = `evidence-field-${field.key}`;

  if (field.type === "select") {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{field.label}</Label>
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger id={id}>
            <SelectValue placeholder="Chọn loại minh chứng" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor={id}>{field.label}</Label>
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{field.label}</Label>
      <Input
        id={id}
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        disabled={disabled}
        min={field.type === "number" ? 0 : undefined}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
