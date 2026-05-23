"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Navbar, type Tab } from "@/components/Navbar";
import { AgentButton } from "@/components/AgentButton";
import { Surface } from "@/components/ui/Surface";
import { Label } from "@/components/ui/Label";
import { AccordionPanel } from "@/components/workstation/AccordionPanel";
import { ProjectsPanel } from "@/components/workstation/ProjectsPanel";
import { ThoughtsPanel } from "@/components/workstation/ThoughtsPanel";
import { ProfilePanel } from "@/components/settings/ProfilePanel";
import { IntegrationsPanel } from "@/components/settings/IntegrationsPanel";
import { PreferencesPanel } from "@/components/settings/PreferencesPanel";
import { cn } from "@/lib/cn";

type WorkstationSection = "Projects" | "Thoughts" | "Artifacts";

const secondarySections: WorkstationSection[] = ["Artifacts"];

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

interface SimpleAccordionPanelProps {
  label: WorkstationSection;
  index?: number;
  isOpen: boolean;
  onToggle: () => void;
  expandSize?: "fill" | "limited";
  className?: string;
}

function SimpleAccordionPanel({
  label,
  index = 0,
  isOpen,
  onToggle,
  expandSize = "fill",
  className,
}: SimpleAccordionPanelProps) {
  const headerAction = (
    <button
      type="button"
      aria-label={`Add to ${label}`}
      className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[var(--color-pumice)] transition-colors duration-200 hover:bg-[var(--color-ash)] hover:text-[var(--color-steam)]"
    >
      <Plus size={16} strokeWidth={1.5} />
    </button>
  );

  return (
    <AccordionPanel
      label={label}
      index={index}
      isOpen={isOpen}
      onToggle={onToggle}
      headerAction={isOpen ? headerAction : undefined}
      expandSize={expandSize}
      className={className}
    />
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
        <ProjectsPanel
          index={0}
          isOpen={openSection === "Projects"}
          onToggle={() => handleToggle("Projects")}
        />
        {secondarySections.map((label, index) => (
          <SimpleAccordionPanel
            key={label}
            label={label}
            index={index + 1}
            isOpen={openSection === label}
            onToggle={() => handleToggle(label)}
          />
        ))}
        <ThoughtsPanel
          index={2}
          isOpen={openSection === "Thoughts"}
          onToggle={() => handleToggle("Thoughts")}
        />
      </div>
      <Panel label="Whiteboard" index={3} className="min-h-0 h-full" />
    </div>
  );
}

function SettingsView() {
  return (
    <div className="flex flex-col gap-6">
      <ProfilePanel />
      <IntegrationsPanel />
      <PreferencesPanel />
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
          "min-h-0 flex-1 pt-[60px] pb-6",
          activeTab === "Settings" ? "overflow-y-auto" : "overflow-hidden",
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
