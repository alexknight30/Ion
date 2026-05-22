import { cn } from "@/lib/cn";

interface LabelProps {
  children: React.ReactNode;
  className?: string;
}

export function Label({ children, className }: LabelProps) {
  return (
    <span
      className={cn(
        "text-[12px] font-medium tracking-[-0.01em] text-[var(--color-pumice)]",
        className
      )}
    >
      {children}
    </span>
  );
}
