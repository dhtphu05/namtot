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
        "p-5",
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
    <div className="card-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">{label}</div>
          <div className="text-[26px] font-bold text-brand-deep mt-1 leading-none">{value}</div>
          {delta && <div className="text-[11px] text-emerald-600 mt-1.5 font-semibold">{delta}</div>}
        </div>
        {icon && (
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
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
    brand: "bg-[#F1F7FD] text-[#0057C2]",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    error: "bg-rose-50 text-rose-700",
    muted: "bg-slate-100 text-slate-700",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold", map[tone])}>
      {children}
    </span>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger" | "success";
  size?: "sm" | "md" | "lg";
}) {
  const variants = {
    primary: "bg-[#0057C2] text-white hover:bg-[#004ba8]",
    secondary: "bg-[#F1F7FD] text-[#0057C2] hover:bg-[#E5EFFA]",
    ghost: "text-brand-deep hover:bg-[#F1F7FD]",
    outline: "bg-white text-[#0057C2] border border-[#DCE7F2] hover:bg-[#F1F7FD]",
    danger: "bg-rose-500 text-white hover:bg-rose-600",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-[12px]",
    md: "px-3.5 py-2 text-[13px]",
    lg: "px-5 py-2.5 text-sm",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-60 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Progress({ value, tint = "#0057C2" }: { value: number; tint?: string }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-[#EEF2F7] overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: tint }}
      />
    </div>
  );
}
