import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { authApi } from "@/features/auth/api/auth";
import { authKeys } from "@/features/auth/hooks/useMe";
import { getDefaultAppPathForRole, toUiRole } from "@/features/auth/role-map";
import { useAuth, waitForAuthHydration } from "@/features/auth/store/auth-store";
import { ApiError } from "@/lib/api/client";
import { useApp } from "@/lib/store";
import type { WorkspaceSummary } from "@/lib/api/types";

const onboardingSteps = [
  "Tạo tài khoản sinh viên",
  "Vào workspace hồ sơ 2025-2026",
  "Hoàn thiện 5 tiêu chí",
  "Kiểm tra và nộp chính thức",
];

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Đăng ký - 5TOT Platform" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;

    await waitForAuthHydration();

    const { accessToken, user } = useAuth.getState();
    if (accessToken && user) {
      throw redirect({ to: getDefaultAppPathForRole(user.role) });
    }
    if (accessToken) {
      throw redirect({ to: "/app" });
    }
  },
  component: Signup,
});

function Signup() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const setAuthData = useAuth((s) => s.setAuthData);
  const setRole = useApp((s) => s.setRole);
  const resetSessionState = useApp((s) => s.resetSessionState);
  const [fullName, setFullName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [email, setEmail] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [className, setClassName] = useState("");
  const [faculty, setFaculty] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const {
    data: workspaces = [],
    isLoading: isWorkspaceLoading,
    isFetching: isWorkspaceFetching,
    isError: isWorkspaceError,
    refetch: refetchWorkspaces,
  } = useQuery({
    queryKey: ["workspaces", "registration"],
    queryFn: async () => {
      const res = await authApi.getRegistrationWorkspaces();
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const selectedWorkspace = workspaces.find((workspace) => workspace.id === workspaceId) ?? null;
  const workspaceSubmitBlocked =
    isWorkspaceLoading || isWorkspaceError || workspaces.length === 0 || !workspaceId;

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Mật khẩu cần tối thiểu 8 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (workspaceSubmitBlocked) {
      if (isWorkspaceLoading) {
        toast.error("Vui lòng chờ tải danh sách trường đại học.");
      } else if (isWorkspaceError) {
        toast.error("Không thể tải danh sách trường. Vui lòng thử lại.");
      } else if (workspaces.length === 0) {
        toast.error("Hiện chưa có trường nào mở đăng ký.");
      } else {
        toast.error("Vui lòng chọn trường đại học.");
      }
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.register({
        fullName: fullName.trim(),
        studentCode: studentCode.trim(),
        email: email.trim(),
        password,
        workspaceId,
        className: className.trim() || undefined,
        faculty: faculty.trim() || undefined,
        phone: phone.trim() || undefined,
      });

      queryClient.clear();
      resetSessionState();
      setAuthData(res.data.user, res.data.accessToken, res.data.refreshToken);
      queryClient.setQueryData(authKeys.me, res.data.user);
      setRole(toUiRole(res.data.user.role));
      toast.success("Đăng ký thành công.");
      nav({ to: getDefaultAppPathForRole(res.data.user.role) });
    } catch (err) {
      if (err instanceof ApiError) {
        if (
          err.code === "WORKSPACE_REGISTRATION_CLOSED" ||
          err.code === "WORKSPACE_INACTIVE" ||
          err.code === "WORKSPACE_NOT_FOUND"
        ) {
          void refetchWorkspaces();
        }
        toast.error(`Đăng ký thất bại: ${err.message}`);
      } else {
        toast.error("Đăng ký thất bại. Vui lòng thử lại.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB] px-6 py-10">
      <div className="mx-auto grid w-full max-w-6xl items-start gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <motion.div initial={false} animate={{ opacity: 1, y: 0 }} className="lg:sticky lg:top-10">
          <div className="rounded-xl bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="gradient-brand mb-5 flex h-16 w-16 items-center justify-center rounded-3xl text-xl font-bold text-white">
              5T
            </div>
            <div className="text-xs font-bold uppercase tracking-wide text-[#0057C2]">
              Bắt đầu hồ sơ
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0F172A] md:text-4xl">
              Tạo tài khoản để nộp hồ sơ Sinh viên 5 tốt
            </h1>
            <p className="mt-3 text-sm leading-7 text-[#64748B]">
              Sau khi đăng ký, bạn sẽ được đưa thẳng vào workspace hồ sơ để tạo hồ sơ năm học hiện
              tại.
            </p>

            <div className="mt-6 grid gap-3">
              {onboardingSteps.map((step, index) => (
                <div
                  key={step}
                  className="flex items-center gap-3 rounded-2xl bg-[#F8FAFC] px-3 py-3"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EAF3FF] text-xs font-black text-[#0057C2]">
                    {index + 1}
                  </div>
                  <div className="text-sm font-semibold text-[#334155]">{step}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <form
            onSubmit={handleSignup}
            autoComplete="off"
            className="rounded-xl bg-white p-7 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.55)]"
          >
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-[#0057C2]">
                  Thông tin sinh viên
                </div>
                <h2 className="mt-1 text-2xl font-extrabold text-[#0F172A]">Tạo tài khoản</h2>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF3] px-3 py-1 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Vai trò sinh viên
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Họ và tên" required className="md:col-span-2">
                <input
                  type="text"
                  required
                  className="field"
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                />
              </Field>

              <Field label="Mã sinh viên" required>
                <input
                  type="text"
                  required
                  className="field uppercase placeholder:normal-case"
                  placeholder="21IT001"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  disabled={isLoading}
                />
              </Field>

              <Field label="Email" required>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="field"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </Field>

              <Field label="Trường đại học" required className="md:col-span-2">
                <WorkspaceSelector
                  open={workspaceOpen}
                  onOpenChange={setWorkspaceOpen}
                  workspaces={workspaces}
                  selectedWorkspace={selectedWorkspace}
                  isLoading={isWorkspaceLoading}
                  isFetching={isWorkspaceFetching}
                  isError={isWorkspaceError}
                  disabled={isLoading}
                  onSelect={setWorkspaceId}
                  onRetry={() => void refetchWorkspaces()}
                />
              </Field>

              <Field label="Lớp" optional>
                <input
                  type="text"
                  className="field"
                  placeholder="21TCLC_DT1"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  disabled={isLoading}
                />
              </Field>

              <Field label="Khoa" optional>
                <input
                  type="text"
                  className="field"
                  placeholder="Công nghệ thông tin"
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  disabled={isLoading}
                />
              </Field>

              <Field label="Số điện thoại" optional className="md:col-span-2">
                <input
                  type="tel"
                  className="field"
                  placeholder="0901234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                />
              </Field>

              <Field label="Mật khẩu" required>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="field pr-11"
                    placeholder="Tối thiểu 8 ký tự"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-2 inline-flex w-8 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#EAF3FF] hover:text-[#0057C2]"
                    onClick={() => setShowPassword((current) => !current)}
                    disabled={isLoading}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <Field label="Xác nhận mật khẩu" required>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="field pr-11"
                    placeholder="Nhập lại mật khẩu"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-2 inline-flex w-8 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#EAF3FF] hover:text-[#0057C2]"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    disabled={isLoading}
                    aria-label={
                      showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Field>
            </div>

            <button
              type="submit"
              disabled={isLoading || workspaceSubmitBlocked}
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#0057C2] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#004ba8] disabled:pointer-events-none disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Đăng ký <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>

            <div className="mt-6 text-center text-sm text-[#64748B]">
              Đã có tài khoản?{" "}
              <Link to="/login" className="font-bold text-[#0057C2] hover:underline">
                Đăng nhập
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

function WorkspaceSelector({
  open,
  onOpenChange,
  workspaces,
  selectedWorkspace,
  isLoading,
  isFetching,
  isError,
  disabled,
  onSelect,
  onRetry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces: WorkspaceSummary[];
  selectedWorkspace: WorkspaceSummary | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  disabled: boolean;
  onSelect: (workspaceId: string) => void;
  onRetry: () => void;
}) {
  const empty = !isLoading && !isError && workspaces.length === 0;
  const unavailable = disabled || isLoading || isError || empty;

  return (
    <div className="space-y-2">
      <Popover open={open && !unavailable} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Chọn trường đại học"
            disabled={unavailable}
            className="h-11 w-full justify-between rounded-xl border-0 bg-[#F8FAFC] px-3 text-left text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
          >
            <span className="min-w-0 truncate">
              {isLoading
                ? "Đang tải danh sách trường..."
                : selectedWorkspace
                  ? workspaceDisplayName(selectedWorkspace)
                  : "Chọn trường đại học"}
            </span>
            {isFetching ? (
              <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin text-[#64748B]" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-[#64748B]" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(36rem,calc(100vw-3rem))] p-0">
          <Command>
            <CommandInput placeholder="Tìm trường đại học..." />
            <CommandList>
              <CommandEmpty>Không tìm thấy trường phù hợp.</CommandEmpty>
              <CommandGroup>
                {workspaces.map((workspace) => (
                  <CommandItem
                    key={workspace.id}
                    value={`${workspace.name} ${workspace.shortName ?? ""} ${workspace.code}`}
                    onSelect={() => {
                      onSelect(workspace.id);
                      onOpenChange(false);
                    }}
                  >
                    <Check
                      className={`h-4 w-4 ${
                        selectedWorkspace?.id === workspace.id ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {workspaceDisplayName(workspace)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {isError ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-rose-700">
          <span>Không thể tải danh sách trường.</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 font-bold text-[#0057C2] hover:underline"
            onClick={onRetry}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Tải lại
          </button>
        </div>
      ) : null}
      {empty ? <p className="text-sm text-[#64748B]">Hiện chưa có trường nào mở đăng ký.</p> : null}
    </div>
  );
}

function workspaceDisplayName(workspace: WorkspaceSummary) {
  return workspace.shortName ? `${workspace.name} (${workspace.shortName})` : workspace.name;
}

function Field({
  label,
  required,
  optional,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
        {label}
        {required ? <span className="text-xs font-bold text-rose-600">Bắt buộc</span> : null}
        {optional ? <span className="text-xs font-medium text-[#94A3B8]">Tùy chọn</span> : null}
      </span>
      <div className="mt-1">{children}</div>
      <style>{`
        .field {
          width: 100%;
          height: 2.75rem;
          border-radius: 0.75rem;
          background: #F8FAFC;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .field:focus {
          box-shadow: 0 0 0 2px rgba(0, 87, 194, 0.18);
        }
        .field::placeholder {
          color: #94A3B8;
        }
        .field:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }
      `}</style>
    </label>
  );
}
