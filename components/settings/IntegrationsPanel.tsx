"use client";

import { useState } from "react";
import Image from "next/image";
import { SettingsSection } from "./SettingsSection";
import { Toggle } from "./Toggle";

const INTEGRATIONS = [
  { id: "google", name: "Google", logo: "/integrations/google.svg" },
  { id: "slack", name: "Slack", logo: "/integrations/slack.svg" },
  { id: "claude", name: "Claude", logo: "/integrations/claude.svg" },
  { id: "zoom", name: "Zoom", logo: "/integrations/zoom.svg" },
  { id: "cursor", name: "Cursor", logo: "/integrations/cursor.svg" },
  { id: "github", name: "GitHub", logo: "/integrations/github.svg" },
] as const;

export function IntegrationsPanel() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    google: true,
    github: true,
  });

  return (
    <SettingsSection label="Integrations" index={3}>
      <div className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
        {INTEGRATIONS.map(({ id, name, logo }) => (
          <div
            key={id}
            className="flex items-center justify-between gap-6 py-5 first:pt-0 last:pb-0"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                <Image
                  src={logo}
                  alt=""
                  width={24}
                  height={24}
                  className="max-h-6 max-w-6 object-contain"
                />
              </div>
              <span className="text-[15px] font-medium tracking-[-0.01em] text-[var(--color-bone)]">
                {name}
              </span>
            </div>
            <Toggle
              label={`Connect ${name}`}
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
