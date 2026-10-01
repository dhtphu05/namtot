import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronsUpDown,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  UserPlus,
} from "lucide-react";
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
import hsvvnEmblemUrl from "@/assets/hsvvn-emblem.webp";

const entryFieldClassName =
  "min-h-11 w-full rounded-md border border-[#B7C5D4] bg-white px-3 py-2 text-sm text-[#162033] outline-none placeholder:text-[#718096] focus-visible:ring-2 focus-visible:ring-[#0057C2] disabled:bg-[#F2F4F7] disabled:opacity-70";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Tạo tài khoản sinh viên | 5TOT Đà Nẵng" }] }),
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setAuthData = useAuth((state) => state.setAuthData);
  const setRole = useApp((state) => state.setRole);
  const resetSessionState = useApp((state) => state.resetSessionState);
  const id = useId();
  const [isClientReady, setIsClientReady] = useState(false);
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  const {
    data: workspaces = [],
    isLoading: isWorkspaceLoading,
    isFetching: isWorkspaceFetching,
    isError: isWorkspaceError,
    refetch: refetchWorkspaces,
  } = useQuery({
    queryKey: ["workspaces", "registration"],
    queryFn: async () => {
      const response = await authApi.getRegistrationWorkspaces();
      return response.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const selectedWorkspace = workspaces.find((workspace) => workspace.id === workspaceId) ?? null;
  const workspaceUnavailable =
    isWorkspaceLoading || isWorkspaceError || workspaces.length === 0 || !workspaceId;
  const passwordMismatch = confirmPassword.length > 0 && confirmPassword !== password;

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setFormError("");

    if (password.length < 8 || password.length > 128) {
      setFormError("Mật khẩu cần có từ 8 đến 128 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Mật khẩu xác nhận chưa khớp.");
      return;
    }
    if (!selectedWorkspace) {
      setFormError("Vui lòng chọn trường đang mở đăng ký.");
      return;
    }
    if (isWorkspaceError || isWorkspaceLoading) {
      setFormError("Không thể xác nhận danh sách trường. Vui lòng thử tải lại.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authApi.register({
        fullName: fullName.trim(),
        studentCode: studentCode.trim(),
        email: email.trim(),
        password,
        workspaceId: selectedWorkspace.id,
        className: className.trim() || undefined,
        faculty: faculty.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      const registrationData = response.data;
      if (!registrationData) {
        setFormError("Không thể tạo tài khoản lúc này. Vui lòng thử lại.");
        return;
      }

      queryClient.clear();
      resetSessionState();
      setAuthData(
        registrationData.user,
        registrationData.accessToken,
        registrationData.refreshToken,
      );
      queryClient.setQueryData(authKeys.me, registrationData.user);
      setRole(toUiRole(registrationData.user.role));
      await navigate({ to: getDefaultAppPathForRole(registrationData.user.role), replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (
          error.code === "WORKSPACE_REGISTRATION_CLOSED" ||
          error.code === "WORKSPACE_INACTIVE" ||
          error.code === "WORKSPACE_NOT_FOUND" ||
          error.code === "WORKSPACE_TYPE_INVALID"
        ) {
          setWorkspaceId("");
          void refetchWorkspaces();
          setFormError(
            error.code === "WORKSPACE_TYPE_INVALID"
              ? error.message
              : "Trường này không còn nhận đăng ký. Vui lòng chọn lại trường.",
          );
        } else if (error.code === "CONFLICT") {
          setFormError(
            "Email hoặc mã số sinh viên đã được đăng ký. Vui lòng kiểm tra lại hoặc đăng nhập.",
          );
        } else if (error.code === "VALIDATION_ERROR") {
          setFormError("Thông tin chưa hợp lệ. Vui lòng kiểm tra lại các trường đã nhập.");
        } else if (error.code === "RATE_LIMITED") {
          setFormError("Bạn đã gửi yêu cầu nhiều lần. Vui lòng chờ rồi thử lại.");
        } else {
          setFormError("Không thể tạo tài khoản lúc này. Vui lòng thử lại.");
        }
      } else {
        setFormError("Không thể kết nối tới hệ thống. Vui lòng thử lại.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-5 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          to="/"
          className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-md text-sm font-medium text-[#425168] hover:text-[#0057C2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Trang 5TOT Đà Nẵng
        </Link>

        <section className="overflow-hidden rounded-lg border border-[#DCE3EB] bg-white">
          <header className="flex items-start gap-4 border-b border-[#DCE3EB] bg-[#F2F7FC] px-5 py-5 sm:px-8">
            <img
              src={hsvvnEmblemUrl}
              alt="Biểu trưng Hội Sinh viên Việt Nam"
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 object-contain"
            />
            <div>
              <p className="text-sm font-semibold text-[#0057C2]">
                Hội Sinh viên Việt Nam thành phố Đà Nẵng
              </p>
              <h1 className="mt-1 text-2xl font-bold text-[#123B6D]">Tạo tài khoản sinh viên</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#526174]">
                Dùng tài khoản này để chuẩn bị và theo dõi hồ sơ Sinh viên 5 tốt cấp Thành phố Đà
                Nẵng.
              </p>
            </div>
          </header>

          <form
            onSubmit={handleSignup}
            aria-busy={isSubmitting}
            className="grid gap-x-5 gap-y-4 px-5 py-6 sm:grid-cols-2 sm:px-8"
          >
            <fieldset
              disabled={!isClientReady || isSubmitting}
              aria-label="Thông tin sinh viên"
              className="contents"
            >
              {formError && (
                <div
                  role="alert"
                  className="rounded-md border border-[#E7B9B9] bg-[#FFF6F6] px-3 py-2.5 text-sm text-[#922B2B] sm:col-span-2"
                >
                  {formError}
                </div>
              )}

              <Field id={`${id}-full-name`} label="Họ và tên" required className="sm:col-span-2">
                <input
                  id={`${id}-full-name`}
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  disabled={isSubmitting}
                  className={entryFieldClassName}
                />
              </Field>

              <Field
                id={`${id}-student-code`}
                label="Mã số sinh viên"
                hint="Nhập đúng mã số do trường cấp."
                required
              >
                <input
                  id={`${id}-student-code`}
                  name="studentCode"
                  type="text"
                  autoComplete="off"
                  required
                  value={studentCode}
                  aria-describedby={`${id}-student-code-hint`}
                  onChange={(event) => setStudentCode(event.target.value)}
                  disabled={isSubmitting}
                  className={entryFieldClassName}
                />
              </Field>

              <Field id={`${id}-email`} label="Email" required>
                <input
                  id={`${id}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSubmitting}
                  className={entryFieldClassName}
                />
              </Field>

              <Field
                id={`${id}-workspace`}
                label="Trường / cơ sở đào tạo"
                required
                className="sm:col-span-2"
              >
                <WorkspaceSelector
                  id={`${id}-workspace`}
                  open={workspaceOpen}
                  onOpenChange={setWorkspaceOpen}
                  workspaces={workspaces}
                  selectedWorkspace={selectedWorkspace}
                  isLoading={isWorkspaceLoading}
                  isFetching={isWorkspaceFetching}
                  isError={isWorkspaceError}
                  disabled={isSubmitting}
                  onSelect={setWorkspaceId}
                  onRetry={() => void refetchWorkspaces()}
                />
              </Field>

              <Field id={`${id}-class`} label="Lớp" optional>
                <input
                  id={`${id}-class`}
                  name="className"
                  type="text"
                  autoComplete="off"
                  value={className}
                  onChange={(event) => setClassName(event.target.value)}
                  disabled={isSubmitting}
                  className={entryFieldClassName}
                />
              </Field>

              <Field id={`${id}-faculty`} label="Khoa" optional>
                <input
                  id={`${id}-faculty`}
                  name="faculty"
                  type="text"
                  autoComplete="organization-title"
                  value={faculty}
                  onChange={(event) => setFaculty(event.target.value)}
                  disabled={isSubmitting}
                  className={entryFieldClassName}
                />
              </Field>

              <Field id={`${id}-phone`} label="Số điện thoại" optional className="sm:col-span-2">
                <input
                  id={`${id}-phone`}
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  disabled={isSubmitting}
                  className={entryFieldClassName}
                />
              </Field>

              <Field id={`${id}-password`} label="Mật khẩu" hint="Từ 8 đến 128 ký tự." required>
                <PasswordInput
                  id={`${id}-password`}
                  name="password"
                  value={password}
                  visible={showPassword}
                  onChange={setPassword}
                  onToggle={() => setShowPassword((shown) => !shown)}
                  disabled={isSubmitting}
                  describedBy={`${id}-password-hint`}
                />
              </Field>

              <Field
                id={`${id}-confirm-password`}
                label="Xác nhận mật khẩu"
                required
                error={passwordMismatch ? "Mật khẩu xác nhận chưa khớp." : undefined}
              >
                <PasswordInput
                  id={`${id}-confirm-password`}
                  name="confirmPassword"
                  value={confirmPassword}
                  visible={showConfirmPassword}
                  onChange={setConfirmPassword}
                  onToggle={() => setShowConfirmPassword((shown) => !shown)}
                  disabled={isSubmitting}
                  describedBy={passwordMismatch ? `${id}-confirm-password-error` : undefined}
                />
              </Field>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={!isClientReady || isSubmitting || workspaceUnavailable}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0057C2] px-4 text-sm font-semibold text-white hover:bg-[#004BA8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin motion-reduce:animate-none"
                      />
                      <span role="status">Đang tạo tài khoản…</span>
                    </>
                  ) : !isClientReady ? (
                    <>
                      <Loader2
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin motion-reduce:animate-none"
                      />
                      <span role="status">Đang tải biểu mẫu…</span>
                    </>
                  ) : (
                    <>
                      <UserPlus aria-hidden="true" className="h-4 w-4" />
                      Tạo tài khoản
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              <p className="text-sm text-[#526174] sm:col-span-2">
                Đã có tài khoản?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-[#0057C2] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2]"
                >
                  Đăng nhập
                </Link>
              </p>
            </fieldset>
          </form>
        </section>
      </div>
    </main>
  );
}

function PasswordInput({
  id,
  name,
  value,
  visible,
  onChange,
  onToggle,
  disabled,
  describedBy,
}: {
  id: string;
  name: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
  disabled: boolean;
  describedBy?: string;
}) {
  const confirm = name === "confirmPassword";
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        aria-describedby={describedBy}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={`${entryFieldClassName} pr-12`}
      />
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label={
          visible
            ? confirm
              ? "Ẩn mật khẩu xác nhận"
              : "Ẩn mật khẩu"
            : confirm
              ? "Hiện mật khẩu xác nhận"
              : "Hiện mật khẩu"
        }
        aria-pressed={visible}
        aria-controls={id}
        className="absolute inset-y-0 right-0 inline-flex min-h-11 min-w-11 items-center justify-center rounded-r-md text-[#425168] hover:bg-[#F2F7FC] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0057C2] disabled:opacity-50"
      >
        {visible ? (
          <EyeOff aria-hidden="true" className="h-4 w-4" />
        ) : (
          <Eye aria-hidden="true" className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

function WorkspaceSelector({
  id,
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
  id: string;
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
  const describedBy = `${id}-status`;

  return (
    <div className="space-y-2">
      <Popover open={open && !unavailable} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-labelledby={`${id}-label`}
            aria-describedby={describedBy}
            aria-expanded={open}
            aria-controls={`${id}-options`}
            aria-invalid={!selectedWorkspace && !isLoading && !isError}
            disabled={unavailable}
            className="h-auto min-h-11 w-full justify-between rounded-md border border-[#B7C5D4] bg-white px-3 text-left text-sm font-medium text-[#162033] hover:bg-[#F8FAFC]"
          >
            <span className="min-w-0 flex-1 whitespace-normal break-words text-left leading-5">
              {isLoading
                ? "Đang tải danh sách trường…"
                : selectedWorkspace
                  ? selectedWorkspace.name
                  : "Chọn trường / cơ sở đào tạo"}
            </span>
            {isFetching ? (
              <Loader2
                aria-hidden="true"
                className="ml-2 h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none"
              />
            ) : (
              <ChevronsUpDown aria-hidden="true" className="ml-2 h-4 w-4 shrink-0" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(36rem,calc(100vw-2.5rem))] p-0">
          <Command>
            <CommandInput
              placeholder="Tìm trường/cơ sở đào tạo..."
              aria-label="Tìm trường/cơ sở đào tạo"
            />
            <CommandList id={`${id}-options`}>
              <CommandEmpty>Không tìm thấy trường phù hợp.</CommandEmpty>
              <CommandGroup>
                {workspaces.map((workspace) => (
                  <CommandItem
                    key={workspace.id}
                    value={`${workspace.name} ${workspace.shortName ?? ""} ${workspace.code}`}
                    className="items-start"
                    onSelect={() => {
                      onSelect(workspace.id);
                      onOpenChange(false);
                    }}
                  >
                    <Check
                      aria-hidden="true"
                      className={`mt-0.5 h-4 w-4 shrink-0 ${selectedWorkspace?.id === workspace.id ? "opacity-100" : "opacity-0"}`}
                    />
                    <span className="min-w-0 flex-1 whitespace-normal break-words text-left leading-5">
                      {workspace.name}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <p id={describedBy} className="text-xs leading-5 text-[#526174]">
        {isLoading
          ? "Đang tải các trường đang mở đăng ký."
          : isError
            ? "Không thể tải danh sách trường."
            : empty
              ? "Hiện chưa có trường nào mở đăng ký."
              : "Chọn trường trong danh sách đang mở đăng ký."}
      </p>
      {isError && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-10 items-center gap-2 rounded-md font-semibold text-[#0057C2] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2]"
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Tải lại danh sách trường
        </button>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  required,
  optional,
  hint,
  error,
  className = "",
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label
        id={`${id}-label`}
        htmlFor={id}
        className="flex min-h-6 items-center gap-2 text-sm font-semibold text-[#25354A]"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="text-xs font-medium text-[#526174]">
            *
          </span>
        )}
        {optional && <span className="text-xs font-medium text-[#526174]">Tùy chọn</span>}
      </label>
      <div className="mt-1">{children}</div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-[#526174]">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-[#922B2B]">
          {error}
        </p>
      )}
    </div>
  );
}
