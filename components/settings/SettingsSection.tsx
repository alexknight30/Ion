import { Surface } from "@/components/ui/Surface";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/cn";

interface SettingsSectionProps {
  label: string;
  index?: number;
  status?: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingsSection({
  label,
  index = 0,
  status,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <Surface index={index} className={cn("flex flex-col", className)}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <Label>{label}</Label>
        {status ? (
          <span className="text-[12px] text-[var(--color-pumice)]">{status}</span>
        ) : null}
      </div>
      <div className="flex flex-col">{children}</div>
    </Surface>
  );
}
