import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide tabular-nums transition-colors",
  {
    variants: {
      variant: {
        default: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
        success: "bg-green-500/12 text-green-400 border border-green-500/25",
        warning: "bg-amber-500/12 text-amber-400 border border-amber-500/25",
        destructive: "bg-red-500/12 text-red-400 border border-red-500/25",
        outline: "border border-[var(--color-border-strong)] text-[var(--color-text-muted)]",
        secondary: "bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border border-[var(--color-border)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
