import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export function Card({
  className,
  glow,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { glow?: boolean }) {
  return (
    <div
      className={cn(
        glow ? "card-glow" : "card-soft",
        "min-w-0 max-w-full p-4 md:p-5",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  delta,
  icon,
  tint = "#0057C2",
}: {
  label: string;
  value: string | number;
  delta?: string;
  icon?: React.ReactNode;
  tint?: string;
}) {
  return (
    <div className="card-soft min-w-0 max-w-full p-3.5 md:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">{label}</div>
          <div className="text-[26px] font-bold text-brand-deep mt-1 leading-none">{value}</div>
          {delta && <div className="text-[11px] text-emerald-600 mt-1.5 font-semibold">{delta}</div>}
        </div>
        {icon && (
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ background: tint }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function Chip({ children, tone = "brand" }: { children: React.ReactNode; tone?: "brand" | "success" | "warning" | "error" | "muted" }) {
  const map = {
    brand: "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]",
    success: "bg-[var(--surface-success)] text-emerald-700",
    warning: "bg-[var(--surface-warning)] text-amber-700",
    error: "bg-[var(--surface-danger)] text-rose-700",
    muted: "bg-[var(--surface-muted)] text-slate-700",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold", map[tone])}>
      {children}
    </span>
  );
}

export function Button({
  asChild = false,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger" | "success";
  size?: "sm" | "md" | "lg";
}) {
  const Comp = asChild ? Slot : "button";
  const variants = {
    primary: "bg-[var(--brand-primary)] text-white hover:bg-[#004BA8]",
    secondary: "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] hover:bg-[#DCEBFF]",
    ghost: "text-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)]",
    outline: "bg-white text-[var(--brand-primary)] shadow-[0_0_0_1px_rgba(15,23,42,0.08)] hover:bg-[var(--brand-primary-soft)]",
    danger: "bg-rose-500 text-white hover:bg-rose-600",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-[12px]",
    md: "px-3.5 py-2 text-[13px]",
    lg: "px-5 py-2.5 text-sm",
  };
  return (
    <Comp
      className={cn(
        "inline-flex max-w-full items-center justify-center gap-2 rounded-2xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/25 disabled:opacity-60 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}

export function Progress({ value, tint = "#0057C2" }: { value: number; tint?: string }) {
  return (
    <div className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: tint }}
      />
    </div>
  );
}
