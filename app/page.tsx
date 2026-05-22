"use client";

import { useState } from "react";
import { Navbar, type Tab } from "@/components/Navbar";
import { AgentButton } from "@/components/AgentButton";
import { Surface } from "@/components/ui/Surface";
import { Label } from "@/components/ui/Label";

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <span className="text-[13px] text-[var(--color-pumice)]">
        Nothing here yet
      </span>
    </div>
  );
}

interface PanelProps {
  label: string;
  index?: number;
  className?: string;
}

function Panel({ label, index = 0, className }: PanelProps) {
  return (
    <Surface index={index} className={`flex flex-col ${className ?? ""}`}>
      <Label>{label}</Label>
      <EmptyState />
    </Surface>
  );
}

function TimeView() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel label="Calendar" index={0} className="md:col-span-1" />
      <Panel label="To-Do List" index={1} className="md:col-span-1" />
      <Panel label="Schedule" index={2} className="md:col-span-2" />
    </div>
  );
}

function WorkstationView() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Panel label="Projects" index={0} />
      <Panel label="Thoughts" index={1} />
      <Panel label="Artifacts" index={2} />
    </div>
  );
}

function SettingsView() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel label="Integrations" index={0} />
      <Panel label="Preferences" index={1} />
    </div>
  );
}

const views: Record<Tab, () => React.ReactNode> = {
  Time: TimeView,
  Workstation: WorkstationView,
  Settings: SettingsView,
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("Time");
  const ActiveView = views[activeTab];

  return (
    <>
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="mx-auto max-w-6xl px-8 pt-[72px] pb-24">
        <ActiveView />
      </main>
      <AgentButton />
    </>
  );
}
