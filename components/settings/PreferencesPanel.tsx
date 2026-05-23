"use client";

import { useState } from "react";
import { SettingsSection } from "./SettingsSection";
import { Toggle } from "./Toggle";

const PREFERENCES = [
  {
    id: "notifications",
    label: "Email notifications",
    description: "Receive updates about your projects and tasks.",
  },
  {
    id: "desktop-alerts",
    label: "Desktop alerts",
    description: "Show system notifications for reminders and mentions.",
  },
  {
    id: "auto-save",
    label: "Auto-save changes",
    description: "Save edits automatically as you work.",
  },
  {
    id: "compact-mode",
    label: "Compact layout",
    description: "Use tighter spacing across panels and lists.",
  },
  {
    id: "agent-suggestions",
    label: "Agent suggestions",
    description: "Surface proactive prompts from Ion in the sidebar.",
  },
] as const;

export function PreferencesPanel() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    notifications: true,
    "auto-save": true,
    "agent-suggestions": true,
  });

  return (
    <SettingsSection label="Preferences" index={2}>
      <div className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
        {PREFERENCES.map(({ id, label, description }) => (
          <div
            key={id}
            className="flex items-start justify-between gap-6 py-5 first:pt-0 last:pb-0"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[15px] font-medium tracking-[-0.01em] text-[var(--color-bone)]">
                {label}
              </span>
              <span className="text-[13px] leading-[1.5] text-[var(--color-pumice)]">
                {description}
              </span>
            </div>
            <Toggle
              label={label}
              checked={Boolean(enabled[id])}
              onChange={(checked) =>
                setEnabled((current) => ({ ...current, [id]: checked }))
              }
            />
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}
