import { cn } from "@/lib/utils";
import { Button as PrimitiveButton } from "@/components/ui/button";
import { Card as PrimitiveCard } from "@/components/ui/card";
import { Progress as PrimitiveProgress } from "@/components/ui/progress";

export function Card({
  className,
  glow,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { glow?: boolean }) {
  return (
    <PrimitiveCard
      className={cn(
        "min-w-0 max-w-full p-4 md:p-5",
        glow && "shadow-[var(--shadow-lift)]",
        className,
      )}
      {...rest}
    >
      {children}
    </PrimitiveCard>
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
    <PrimitiveCard className="min-w-0 max-w-full p-3.5 md:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">
            {label}
          </div>
          <div className="text-[26px] font-bold text-brand-deep mt-1 leading-none">{value}</div>
          {delta && (
            <div className="text-[11px] text-emerald-600 mt-1.5 font-semibold">{delta}</div>
          )}
        </div>
        {icon && (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-white"
            style={{ background: tint }}
          >
            {icon}
          </div>
        )}
      </div>
    </PrimitiveCard>
  );
}

export function Chip({
  children,
  tone = "brand",
}: {
  children: React.ReactNode;
  tone?: "brand" | "success" | "warning" | "error" | "muted";
}) {
  const map = {
    brand: "bg-[var(--surface-info)] text-[var(--status-info)]",
    success: "bg-[var(--surface-success)] text-[var(--status-success)]",
    warning: "bg-[var(--surface-warning)] text-[var(--status-warning)]",
    error: "bg-[var(--surface-danger)] text-[var(--status-danger)]",
    muted: "bg-[var(--surface-muted)] text-[var(--text-secondary)]",
  };
  return (
    <span
      className={cn(
        "inline-flex h-auto items-center gap-1 rounded-[var(--radius-pill)] px-2.5 py-0.5 text-[11px] font-semibold",
        map[tone],
      )}
    >
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
  const primitiveVariant = {
    primary: "default",
    secondary: "secondary",
    ghost: "ghost",
    outline: "outline",
    danger: "destructive",
    success: "default",
  } as const;
  const primitiveSize = { sm: "sm", md: "default", lg: "lg" } as const;
  return (
    <PrimitiveButton
      asChild={asChild}
      variant={primitiveVariant[variant]}
      size={primitiveSize[size]}
      className={cn(
        "max-w-full font-semibold",
        variant === "success" && "bg-[var(--status-success)] text-white hover:bg-emerald-700",
        className,
      )}
      {...rest}
    >
      {children}
    </PrimitiveButton>
  );
}

export function Progress({ value, tint = "#0057C2" }: { value: number; tint?: string }) {
  return (
    <PrimitiveProgress
      value={Math.min(100, Math.max(0, value))}
      className="bg-[var(--surface-secondary)]"
      indicatorStyle={{ backgroundColor: tint }}
    />
  );
}
