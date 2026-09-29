import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api/client";
import { useCreateWorkspace } from "@/features/admin-workspace/hooks/useCreateWorkspace";
import { useAdminWorkspaces } from "@/features/admin-workspace/hooks/useAdminWorkspaces";
import type { CreateWorkspacePayload, WorkspaceType } from "@/features/admin-workspace/types";

type WorkspaceCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FormState = {
  name: string;
  shortName: string;
  code: string;
  isActive: boolean;
  registrationEnabled: boolean;
  type: WorkspaceType;
  parentWorkspaceId: string;
};

const initialForm: FormState = {
  name: "",
  shortName: "",
  code: "",
  isActive: true,
  registrationEnabled: false,
  type: "SCHOOL",
  parentWorkspaceId: "none",
};

const codePattern = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

export function WorkspaceCreateDialog({ open, onOpenChange }: WorkspaceCreateDialogProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [localError, setLocalError] = useState<string | null>(null);
  const createWorkspace = useCreateWorkspace();
  const parentWorkspaces = useAdminWorkspaces({ type: "UNIVERSITY_SYSTEM", page: 1, limit: 100 });

  useEffect(() => {
    if (!open) setLocalError(null);
  }, [open]);

  const codeValid = useMemo(() => {
    const code = form.code.trim();
    return code.length === 0 || codePattern.test(code);
  }, [form.code]);

  const canSubmit =
    form.name.trim().length > 0 &&
    form.code.trim().length > 0 &&
    codeValid &&
    (!form.registrationEnabled || form.isActive) &&
    !createWorkspace.isPending;

  const updateField = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setLocalError(null);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    const payload: CreateWorkspacePayload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      shortName: form.shortName.trim() || null,
      isActive: form.isActive,
      registrationEnabled: form.registrationEnabled,
      type: form.type,
      parentWorkspaceId:
        form.type === "SCHOOL" && form.parentWorkspaceId !== "none" ? form.parentWorkspaceId : null,
    };

    createWorkspace.mutate(payload, {
      onSuccess: () => {
        setForm(initialForm);
        setLocalError(null);
        onOpenChange(false);
      },
      onError: (error) => {
        setLocalError(getCreateErrorMessage(error));
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[calc(100dvh-32px)] max-w-xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0">
        <DialogHeader className="px-5 pb-3 pt-5">
          <DialogTitle>Thêm đơn vị</DialogTitle>
          <DialogDescription>
            Chọn loại đơn vị và cấu hình quan hệ trực thuộc nếu đây là trường thành viên UDN.
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-workspace-form"
          onSubmit={handleSubmit}
          className="min-h-0 overflow-y-auto px-5"
        >
          <div className="space-y-4 pb-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#0F172A]" htmlFor="workspace-type">
                Loại đơn vị
              </label>
              <select
                id="workspace-type"
                value={form.type}
                onChange={(event) => {
                  const type = event.target.value as WorkspaceType;
                  setForm((current) => ({
                    ...current,
                    type,
                    parentWorkspaceId: "none",
                    registrationEnabled: type === "SCHOOL" ? current.registrationEnabled : false,
                  }));
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="SCHOOL">Trường</option>
                <option value="UNIVERSITY_SYSTEM">Đại học / hệ thống</option>
                <option value="CITY">Thành phố</option>
              </select>
            </div>

            {form.type === "SCHOOL" ? (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#0F172A]" htmlFor="workspace-parent">
                  Đơn vị đại học trực thuộc
                </label>
                <select
                  id="workspace-parent"
                  value={form.parentWorkspaceId}
                  onChange={(event) => updateField("parentWorkspaceId", event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="none">Không có — trực tiếp cấp Thành phố</option>
                  {(parentWorkspaces.data?.items ?? []).map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.name} ({parent.code})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#0F172A]" htmlFor="workspace-name">
                Tên đơn vị
              </label>
              <Input
                id="workspace-name"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Tên đơn vị..."
                autoComplete="organization"
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-sm font-semibold text-[#0F172A]"
                htmlFor="workspace-short-name"
              >
                Tên viết tắt
              </label>
              <Input
                id="workspace-short-name"
                value={form.shortName}
                onChange={(event) => updateField("shortName", event.target.value)}
                placeholder="DHBK"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#0F172A]" htmlFor="workspace-code">
                Mã đơn vị
              </label>
              <Input
                id="workspace-code"
                value={form.code}
                onChange={(event) => updateField("code", event.target.value.toUpperCase())}
                placeholder="DHBK-DHDN"
                aria-invalid={!codeValid}
              />
              <p className="text-xs text-[#64748B]">Chỉ gồm chữ in hoa, số và dấu gạch ngang.</p>
              {!codeValid ? (
                <p className="text-xs font-semibold text-rose-600">
                  Mã đơn vị chưa đúng định dạng.
                </p>
              ) : null}
            </div>

            <div className="space-y-3 rounded-md border border-[#E3ECF6] bg-[#F8FBFE] p-3">
              <SwitchRow
                label="Trạng thái hoạt động"
                description="Cho phép đơn vị sử dụng hệ thống."
                checked={form.isActive}
                onCheckedChange={(checked) => {
                  setForm((current) => ({
                    ...current,
                    isActive: checked,
                    registrationEnabled: checked ? current.registrationEnabled : false,
                  }));
                  setLocalError(null);
                }}
              />
              <SwitchRow
                label="Cho phép đăng ký"
                description="Không bật mặc định. Backend vẫn kiểm tra bộ tiêu chí active."
                checked={form.registrationEnabled}
                disabled={!form.isActive || form.type !== "SCHOOL"}
                onCheckedChange={(checked) => updateField("registrationEnabled", checked)}
              />
            </div>

            {form.type !== "SCHOOL" ? (
              <p className="text-xs text-[#64748B]">
                Chỉ trường mới có thể bật đăng ký tài khoản sinh viên.
              </p>
            ) : null}

            {form.registrationEnabled ? (
              <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Trường cần có bộ tiêu chí active trước khi mở đăng ký.</span>
              </div>
            ) : null}

            {localError ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                {localError}
              </div>
            ) : null}
          </div>
        </form>

        <DialogFooter className="border-t border-[#E3ECF6] bg-white px-5 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createWorkspace.isPending}
          >
            Hủy
          </Button>
          <Button type="submit" form="create-workspace-form" disabled={!canSubmit}>
            {createWorkspace.isPending ? "Đang tạo..." : "Tạo đơn vị"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SwitchRow({
  checked,
  description,
  disabled,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-semibold text-[#0F172A]">{label}</div>
        <div className="mt-0.5 text-xs leading-5 text-[#64748B]">{description}</div>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-label={label}
      />
    </div>
  );
}

function getCreateErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === "WORKSPACE_CODE_ALREADY_EXISTS") {
      return "Mã đơn vị đã tồn tại. Vui lòng chọn mã khác.";
    }
    if (error.code === "WORKSPACE_CODE_INVALID") {
      return "Mã đơn vị chỉ được gồm chữ in hoa, số và dấu gạch ngang.";
    }
    if (error.code === "WORKSPACE_STATUS_INVALID") {
      return "Không thể mở đăng ký khi trường đang bị vô hiệu hóa.";
    }
    if (error.code === "WORKSPACE_NOT_READY_FOR_REGISTRATION") {
      return "Trường chưa có bộ tiêu chí active nên chưa thể mở đăng ký.";
    }
    return error.message;
  }

  return "Không thể tạo trường triển khai. Vui lòng thử lại.";
}
