import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary hover:bg-primary-active disabled:bg-primary-disabled",
        secondary: "bg-surface-strong text-ink hover:bg-hairline disabled:opacity-50",
        "secondary-dark": "bg-surface-dark-elevated text-on-dark hover:bg-neutral-800 disabled:opacity-50",
        outline: "border border-hairline bg-transparent hover:bg-surface-soft text-ink",
        "outline-on-dark": "border border-on-dark bg-transparent text-on-dark hover:bg-surface-dark-elevated",
        tertiary: "bg-transparent text-primary hover:underline p-0 h-auto font-semibold",
        ghost: "hover:bg-surface-soft hover:text-ink text-muted p-2",
      },
      size: {
        default: "h-[44px] px-5 py-3 rounded-pill text-[16px]",
        cta: "h-[56px] px-8 py-4 rounded-pill text-[16px]",
        sm: "h-9 px-3 rounded-pill text-sm",
        lg: "h-11 px-8 rounded-pill",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
