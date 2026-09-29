import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex max-w-full items-center rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-semibold leading-5 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]/50",
  {
    variants: {
      variant: {
        default: "bg-[var(--surface-info)] text-[var(--status-info)]",
        secondary: "bg-[var(--surface-muted)] text-[var(--text-secondary)]",
        destructive: "bg-[var(--surface-danger)] text-[var(--status-danger)]",
        outline: "bg-[var(--surface-warning)] text-[var(--status-warning)]",
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
