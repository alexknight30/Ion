"use client";

import { useState } from "react";
import { Navbar, type Tab } from "@/components/Navbar";
import { AgentButton } from "@/components/AgentButton";
import { Surface } from "@/components/ui/Surface";
import { Label } from "@/components/ui/Label";
import { ProjectsPanel } from "@/components/workstation/ProjectsPanel";
import { ArtifactsPanel } from "@/components/workstation/ArtifactsPanel";
import { ThoughtsPanel } from "@/components/workstation/ThoughtsPanel";
import { Whiteboard } from "@/components/workstation/Whiteboard";
import { ProfilePanel } from "@/components/settings/ProfilePanel";
import { IntegrationsPanel } from "@/components/settings/IntegrationsPanel";
import { PreferencesPanel } from "@/components/settings/PreferencesPanel";
import { cn } from "@/lib/cn";

type WorkstationSection = "Projects" | "Thoughts" | "Artifacts";

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

function WorkstationView() {
  const [openSection, setOpenSection] = useState<WorkstationSection | null>(
    null
  );
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [whiteboardRefreshKey, setWhiteboardRefreshKey] = useState(0);
  const [projectsRefreshKey, setProjectsRefreshKey] = useState(0);

  const handleToggle = (section: WorkstationSection) => {
    setOpenSection((current) => (current === section ? null : section));
  };

  const handleOpenArtifact = (artifactId: string) => {
    setActiveArtifactId(artifactId);
    setWhiteboardRefreshKey((current) => current + 1);
  };

  return (
    <div className="grid h-full min-h-0 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
      <div className="flex h-full min-h-0 flex-col gap-3">
        <ProjectsPanel
          index={0}
          isOpen={openSection === "Projects"}
          onToggle={() => handleToggle("Projects")}
          onProjectsChange={() =>
            setProjectsRefreshKey((current) => current + 1)
          }
          onOpenArtifact={handleOpenArtifact}
          artifactsRefreshKey={whiteboardRefreshKey}
          projectsRefreshKey={projectsRefreshKey}
        />
        <ArtifactsPanel
          index={1}
          isOpen={openSection === "Artifacts"}
          onToggle={() => handleToggle("Artifacts")}
          onOpenArtifact={handleOpenArtifact}
          refreshKey={whiteboardRefreshKey}
          projectsRefreshKey={projectsRefreshKey}
        />
        <ThoughtsPanel
          index={2}
          isOpen={openSection === "Thoughts"}
          onToggle={() => handleToggle("Thoughts")}
          onThoughtSaved={handleOpenArtifact}
          projectsRefreshKey={projectsRefreshKey}
          artifactsRefreshKey={whiteboardRefreshKey}
        />
      </div>
      <Whiteboard
        artifactId={activeArtifactId}
        refreshKey={whiteboardRefreshKey}
        onClose={() => setActiveArtifactId(null)}
        index={3}
      />
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
