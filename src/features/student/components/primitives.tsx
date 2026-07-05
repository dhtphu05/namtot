import { Slot } from "@radix-ui/react-slot";
import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { StudentTone } from "@/features/student/selectors/student-ui";

type ActionNode = ReactNode;

export function StudentPageShell({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto min-h-0 min-w-0 max-w-[1200px] px-4 md:px-6", className)}>
      {title ? <PageHeader title={title} description={description} /> : null}
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  rightAction,
  className,
}: {
  title: string;
  description?: string;
  rightAction?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-5 flex min-w-0 flex-wrap items-start justify-between gap-3 pt-5",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-bold leading-tight text-[var(--text-primary)] md:text-[28px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 line-clamp-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            {description}
          </p>
        ) : null}
      </div>
      {rightAction ? <div className="shrink-0">{rightAction}</div> : null}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  children,
  footer,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.035)]",
        className,
      )}
    >
      {title || description ? (
        <div className="mb-4 min-w-0">
          {title ? (
            <h2 className="truncate text-base font-bold text-[var(--text-primary)]">{title}</h2>
          ) : null}
          {description ? (
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--text-secondary)]">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="min-w-0">{children}</div>
      {footer ? <div className="mt-4 shrink-0 border-t border-slate-100 pt-4">{footer}</div> : null}
    </section>
  );
}

export function StatusBadge({ tone, label }: { tone: StudentTone; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[11px] font-bold leading-none",
        toneClass[tone],
      )}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

export function EmptyState({
  title,
  description,
  primaryAction,
  secondaryAction,
  variant = "default",
}: {
  title: string;
  description: string;
  primaryAction?: ActionNode;
  secondaryAction?: ActionNode;
  variant?: "default" | "error" | "noData";
}) {
  const Icon = variant === "error" ? AlertCircle : variant === "noData" ? Info : CheckCircle2;
  return (
    <div className="flex min-w-0 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-2xl",
          emptyIconClass[variant],
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 max-w-full truncate text-base font-bold text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="mt-1 line-clamp-3 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
        {description}
      </p>
      {primaryAction || secondaryAction ? (
        <div className="mt-5 flex max-w-full flex-wrap justify-center gap-2">
          {primaryAction}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}

export function InlineAlert({
  type,
  title,
  description,
  action,
}: {
  type: "info" | "warning" | "error" | "success";
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const Icon = alertIcon[type];
  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-2xl border px-4 py-3",
        alertClass[type],
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">{title}</div>
        {description ? (
          <p className="mt-0.5 line-clamp-3 text-sm leading-5 opacity-85">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function AppButton({
  asChild = false,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex max-w-full items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2]/25 disabled:pointer-events-none disabled:opacity-60",
        buttonVariantClass[variant],
        buttonSizeClass[size],
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}

export function ScrollSafeModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  widthClassName = "max-w-3xl",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  widthClassName?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "grid max-h-[calc(100dvh-48px)] w-[calc(100vw-32px)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0",
          widthClassName,
        )}
      >
        <DialogHeader className="shrink-0 border-b border-slate-100 px-5 py-4">
          <DialogTitle className="truncate pr-8">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="line-clamp-2">{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-slate-100 px-5 py-4">{footer}</div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

const toneClass: Record<StudentTone, string> = {
  good: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-800",
  danger: "bg-rose-50 text-rose-700",
  neutral: "bg-slate-100 text-slate-700",
  info: "bg-blue-50 text-blue-700",
};

const emptyIconClass = {
  default: "bg-blue-50 text-blue-700",
  error: "bg-rose-50 text-rose-700",
  noData: "bg-slate-100 text-slate-600",
};

const alertIcon = {
  info: Info,
  warning: TriangleAlert,
  error: AlertCircle,
  success: CheckCircle2,
};

const alertClass = {
  info: "border-blue-100 bg-blue-50 text-blue-900",
  warning: "border-amber-100 bg-amber-50 text-amber-900",
  error: "border-rose-100 bg-rose-50 text-rose-900",
  success: "border-emerald-100 bg-emerald-50 text-emerald-900",
};

const buttonVariantClass = {
  primary: "bg-[#0057C2] text-white hover:bg-[#004BA8]",
  secondary: "bg-[#EAF3FF] text-[#0057C2] hover:bg-[#DCEBFF]",
  ghost: "text-[#0057C2] hover:bg-[#EAF3FF]",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
};

const buttonSizeClass = {
  sm: "min-h-8 px-3 py-1.5 text-xs",
  md: "min-h-10 px-4 py-2 text-sm",
  lg: "min-h-11 px-5 py-2.5 text-sm",
};
