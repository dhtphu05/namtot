import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import type { Criterion, EvidenceResponse } from "@/lib/api/types";
import {
  useCreateEvidence,
  useStartEvidenceIndexing,
  useUploadEvidenceFile,
} from "@/features/evidence/hooks/useEvidence";
import { studentEvidenceCriteria } from "./evidence-card-utils";

type AddEvidenceDrawerProps = {
  applicationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCriterion?: Criterion;
  initialEvidenceName?: string;
  onCreated: (evidence: EvidenceResponse) => void;
};

const maxFileSize = 10 * 1024 * 1024;
const acceptedTypes = [".pdf", ".jpg", ".jpeg", ".png"];

export function AddEvidenceDrawer({
  applicationId,
  open,
  onOpenChange,
  initialCriterion = "academic",
  initialEvidenceName = "",
  onCreated,
}: AddEvidenceDrawerProps) {
  const [evidenceName, setEvidenceName] = useState("");
  const [criterion, setCriterion] = useState<Criterion>(initialCriterion);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [nameError, setNameError] = useState("");
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createEvidence = useCreateEvidence(applicationId);
  const uploadFile = useUploadEvidenceFile(applicationId);
  const startIndexing = useStartEvidenceIndexing(applicationId);
  const isSubmitting = createEvidence.isPending || uploadFile.isPending || startIndexing.isPending;

  const fileLabel = useMemo(() => {
    if (!file) return "Chọn file PDF/JPG/PNG";
    return `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`;
  }, [file]);

  useEffect(() => {
    if (!open) return;
    setCriterion(initialCriterion);
    setEvidenceName(initialEvidenceName);
  }, [initialCriterion, initialEvidenceName, open]);

  const resetForm = () => {
    setEvidenceName("");
    setNote("");
    setFile(null);
    setNameError("");
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (selectedFile?: File) => {
    if (!selectedFile) {
      setFile(null);
      return;
    }

    const extension = `.${selectedFile.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!acceptedTypes.includes(extension)) {
      toast.error("Định dạng file không được hỗ trợ. Chỉ chấp nhận PDF, JPG, JPEG, PNG.");
      return;
    }

    if (selectedFile.size > maxFileSize) {
      toast.error("Dung lượng file vượt quá giới hạn 10MB.");
      return;
    }

    setFile(selectedFile);
    setFileError("");
  };

  const submit = async () => {
    const trimmedName = evidenceName.trim();
    if (!trimmedName) {
      setNameError("Tên minh chứng là bắt buộc.");
      return;
    }

    if (!file) {
      setFileError("File minh chứng là bắt buộc.");
      return;
    }

    setNameError("");
    setFileError("");

    try {
      const created = await createEvidence.mutateAsync({
        applicationId,
        data: {
          evidenceName: trimmedName,
          criterion,
          sourceType: "manual_upload",
          note: note.trim() || undefined,
        },
      });

      let latest = created;
      if (file) {
        const uploaded = await uploadFile.mutateAsync({
          evidenceId: created.id,
          applicationId,
          file,
        });
        latest = uploaded.res ?? latest;
      }

      if (file && !latest.jobId) {
        const indexed = await startIndexing.mutateAsync({ evidenceId: created.id });
        latest = indexed ?? latest;
      }

      toast.success("Đã ghi nhận minh chứng. Hệ thống đang đọc nhanh file để tạo bản tóm tắt.");
      resetForm();
      onOpenChange(false);
      onCreated(latest);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể thêm minh chứng.");
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[92vh] max-w-2xl overflow-y-auto">
        <DrawerHeader>
          <DrawerTitle>Thêm minh chứng</DrawerTitle>
          <DrawerDescription>
            Upload khi chưa tìm thấy trong danh sách chính thức.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 px-4 pb-2">
          <div className="space-y-2">
            <Label htmlFor="evidence-name">Tên minh chứng</Label>
            <Input
              id="evidence-name"
              value={evidenceName}
              onChange={(event) => setEvidenceName(event.target.value)}
              placeholder="Ví dụ: Giấy chứng nhận Mùa hè xanh"
              disabled={isSubmitting}
            />
            {nameError ? <p className="text-sm text-destructive">{nameError}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Tiêu chí</Label>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground">
              {studentEvidenceCriteria.find((item) => item.key === criterion)?.label}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="evidence-note">Ghi chú cho cán bộ</Label>
            <Textarea
              id="evidence-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Không bắt buộc"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label>File minh chứng</Label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={acceptedTypes.join(",")}
              disabled={isSubmitting}
              onChange={(event) => handleFileChange(event.target.files?.[0])}
            />
            <button
              type="button"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-3 rounded-md border border-dashed bg-muted/30 px-4 py-6 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="h-5 w-5 text-primary" />
              <span>{fileLabel}</span>
            </button>
            <p className="text-xs text-muted-foreground">
              Hỗ trợ PDF, JPG, JPEG, PNG. Tối đa 10MB.
            </p>
            {fileError ? <p className="text-sm text-destructive">{fileError}</p> : null}
          </div>

          {isSubmitting ? <UploadProgress /> : null}
        </div>

        <DrawerFooter>
          <Button type="button" onClick={() => void submit()} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Đang ghi nhận..." : "Upload minh chứng"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function UploadProgress() {
  const steps = ["Đã nhận file", "Đang đọc file", "Đã tạo tóm tắt", "Chờ cán bộ xét duyệt"];

  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="text-sm font-semibold text-foreground">Đã ghi nhận minh chứng</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-2 text-sm text-muted-foreground">
            {index === 1 ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            )}
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}
