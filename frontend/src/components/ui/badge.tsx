import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-pill px-3 py-1 text-[12px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-surface-strong text-ink border border-transparent",
        primary: "bg-primary/10 text-primary border border-transparent",
        success: "text-semantic-up bg-semantic-up/10 border border-transparent",
        destructive: "text-semantic-down bg-semantic-down/10 border border-transparent",
        warning: "text-accent-yellow bg-accent-yellow/10 border border-transparent",
        outline: "text-ink border border-hairline bg-transparent",
        "outline-on-dark": "text-on-dark border border-on-dark bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
