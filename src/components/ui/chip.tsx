import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const chipVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer",
  {
    variants: {
      variant: {
        default: "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
        selected: "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "text-foreground hover:bg-accent hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ChipProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof chipVariants> {
  selected?: boolean;
}

function Chip({ className, variant, selected, ...props }: ChipProps) {
  return (
    <div
      className={cn(
        chipVariants({ variant: selected ? "selected" : variant }),
        className
      )}
      {...props}
    />
  );
}

export { Chip, chipVariants };