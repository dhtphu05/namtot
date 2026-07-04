import { useMemo, useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
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
  useStartEvidenceIndexing,
  useUploadEvidenceFile,
} from "@/features/evidence/hooks/useEvidence";
import { studentEvidenceCriteria } from "./evidence-card-utils";

type AddEvidenceDrawerProps = {
  applicationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCriterion?: Criterion;
  onCreated: (evidence: EvidenceResponse) => void;
};

const maxFileSize = 10 * 1024 * 1024;
const acceptedTypes = [".pdf", ".jpg", ".jpeg", ".png"];

export function AddEvidenceDrawer({
  applicationId,
  open,
  onOpenChange,
  initialCriterion = "academic",
  onCreated,
}: AddEvidenceDrawerProps) {
  const [evidenceName, setEvidenceName] = useState("");
  const [criterion, setCriterion] = useState<Criterion>(initialCriterion);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [nameError, setNameError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createEvidence = useCreateEvidence(applicationId);
  const uploadFile = useUploadEvidenceFile(applicationId);
  const startIndexing = useStartEvidenceIndexing(applicationId);
  const isSubmitting = createEvidence.isPending || uploadFile.isPending || startIndexing.isPending;

  const fileLabel = useMemo(() => {
    if (!file) return "Chọn file PDF/JPG/PNG";
    return `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`;
  }, [file]);

  const resetForm = () => {
    setEvidenceName("");
    setDescription("");
    setFile(null);
    setNameError("");
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
  };

  const submit = async () => {
    const trimmedName = evidenceName.trim();
    if (!trimmedName) {
      setNameError("Tên minh chứng là bắt buộc.");
      return;
    }

    setNameError("");

    try {
      const created = await createEvidence.mutateAsync({
        applicationId,
        data: {
          evidenceName: trimmedName,
          criterion,
          sourceType: "manual_upload",
          description: description.trim() || undefined,
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

      toast.success("Đã nhận minh chứng. Hệ thống đang chuẩn bị số hoá.");
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
            Tải lên minh chứng để hệ thống hỗ trợ số hoá và tạo Evidence Card.
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
            <Select
              value={criterion}
              onValueChange={(value) => setCriterion(value as Criterion)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn tiêu chí" />
              </SelectTrigger>
              <SelectContent>
                {studentEvidenceCriteria.map((item) => (
                  <SelectItem key={item.key} value={item.key}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="evidence-description">Mô tả</Label>
            <Textarea
              id="evidence-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Thông tin ngắn gọn để cán bộ dễ kiểm tra"
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
          </div>
        </div>

        <DrawerFooter>
          <Button type="button" onClick={() => void submit()} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Đang tải lên..." : "Tải lên minh chứng"}
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
