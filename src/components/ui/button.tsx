import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 min-h-12 px-5",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90",
        secondary:
          "bg-secondary text-secondary-foreground hover:opacity-90",
        outline: "border-2 border-border bg-white hover:bg-muted",
        ghost: "hover:bg-muted",
        soft: "bg-accent text-accent-foreground hover:opacity-90",
        caution:
          "bg-caution text-caution-foreground border border-caution-border hover:opacity-90",
        warning:
          "bg-caution text-caution-foreground border border-caution-border hover:opacity-90",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90",
      },
      size: {
        default: "min-h-12 px-5",
        sm: "min-h-10 rounded-lg px-4 text-sm",
        lg: "min-h-14 rounded-xl px-6 text-lg",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
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
