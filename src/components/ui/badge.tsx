import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex max-w-full items-center rounded-md px-2 py-0.5 text-[11px] font-semibold leading-5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/25",
  {
    variants: {
      variant: {
        default: "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] hover:bg-[#DCEBFF]",
        secondary:
          "bg-[var(--surface-muted)] text-slate-700 hover:bg-slate-100",
        destructive:
          "bg-[var(--surface-danger)] text-rose-700 hover:bg-rose-100",
        outline: "bg-[var(--surface-warning)] text-amber-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
