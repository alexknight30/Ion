"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Navbar, type Tab } from "@/components/Navbar";
import { AgentButton } from "@/components/AgentButton";
import { Surface } from "@/components/ui/Surface";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/cn";

type WorkstationSection = "Projects" | "Thoughts" | "Artifacts";

const workstationSections: WorkstationSection[] = [
  "Projects",
  "Thoughts",
  "Artifacts",
];

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
    <div className="grid h-full min-h-0 gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex min-h-0 flex-col gap-6">
        <Panel label="Calendar" index={0} className="min-h-0 flex-1" />
        <Panel label="Schedule" index={2} className="min-h-0 flex-[0.65]" />
      </div>
      <Panel label="To-Do List" index={1} className="min-h-0 h-full" />
    </div>
  );
}

interface AccordionPanelProps {
  label: WorkstationSection;
  index?: number;
  isOpen: boolean;
  onToggle: () => void;
}

function AccordionPanel({
  label,
  index = 0,
  isOpen,
  onToggle,
}: AccordionPanelProps) {
  return (
    <Surface
      index={index}
      className={cn(
        "flex flex-col overflow-hidden !p-0 transition-shadow duration-200",
        isOpen ? "min-h-0 flex-1" : "shrink-0",
        !isOpen && "hover:shadow-[0_4px_24px_var(--color-shadow-hover)]"
      )}
    >
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="flex w-full items-center px-4 py-4 text-left"
        >
          <Label>{label}</Label>
        </button>
        {isOpen && (
          <button
            type="button"
            aria-label={`Add to ${label}`}
            className="absolute right-4 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[6px] text-[var(--color-pumice)] transition-colors duration-200 hover:bg-[var(--color-ash)] hover:text-[var(--color-steam)]"
          >
            <Plus size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>
      <div
        className={cn(
          "grid min-h-0 px-4 pb-4 transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
          isOpen ? "flex-1 grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden" />
      </div>
    </Surface>
  );
}

function WorkstationView() {
  const [openSection, setOpenSection] = useState<WorkstationSection | null>(
    null
  );

  const handleToggle = (section: WorkstationSection) => {
    setOpenSection((current) => (current === section ? null : section));
  };

  return (
    <div className="grid h-full min-h-0 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
      <div className="flex h-full min-h-0 flex-col gap-3">
        {workstationSections.map((label, index) => (
          <AccordionPanel
            key={label}
            label={label}
            index={index}
            isOpen={openSection === label}
            onToggle={() => handleToggle(label)}
          />
        ))}
      </div>
      <Panel label="Whiteboard" index={3} className="min-h-0 h-full" />
    </div>
  );
}

function SettingsView() {
  return (
    <div className="grid h-full min-h-0 gap-6 md:grid-cols-2">
      <Panel label="Integrations" index={0} className="min-h-0" />
      <Panel label="Preferences" index={1} className="min-h-0" />
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
    <div className="flex h-dvh flex-col overflow-hidden">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main
        className={cn(
          "min-h-0 flex-1 overflow-hidden pt-[60px] pb-6",
          activeTab === "Time" || activeTab === "Workstation"
            ? "pl-6 pr-8 md:pl-8"
            : "mx-auto w-full max-w-6xl px-8"
        )}
      >
        <ActiveView />
      </main>
      <AgentButton />
    </div>
  );
}
