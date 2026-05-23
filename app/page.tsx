"use client";

import { useState, type ReactNode } from "react";
import { Navbar, type Tab } from "@/components/Navbar";
import { AgentButton } from "@/components/AgentButton";
import { Surface } from "@/components/ui/Surface";
import { Label } from "@/components/ui/Label";
import { ProjectsPanel } from "@/components/workstation/ProjectsPanel";
import { ArtifactsPanel } from "@/components/workstation/ArtifactsPanel";
import { ThoughtsPanel } from "@/components/workstation/ThoughtsPanel";
import { Whiteboard } from "@/components/workstation/Whiteboard";
import { ProfilePanel } from "@/components/settings/ProfilePanel";
import { AgentPanel } from "@/components/settings/AgentPanel";
import { IntegrationsPanel } from "@/components/settings/IntegrationsPanel";
import { PreferencesPanel } from "@/components/settings/PreferencesPanel";
import { CalendarPanel } from "@/components/time/CalendarPanel";
import { InboxPanel } from "@/components/time/InboxPanel";
import { TodoListPanel } from "@/components/time/TodoListPanel";
import { ChatView } from "@/components/chat/ChatView";
import { getTodayDate } from "@/lib/calendar";

type WorkSection = "Projects" | "Thoughts" | "Artifacts";

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

function OrganizeView() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [inboxExpanded, setInboxExpanded] = useState(false);

  return (
    <div className="grid h-full min-h-0 gap-6 md:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
      <div className="flex min-h-0 flex-col gap-6">
        {!inboxExpanded && (
          <CalendarPanel
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            index={0}
            className="shrink-0"
          />
        )}
        <InboxPanel
          index={2}
          className="min-h-0 flex-1"
          expanded={inboxExpanded}
          onToggleExpanded={() => setInboxExpanded((current) => !current)}
        />
      </div>
      <TodoListPanel
        selectedDate={selectedDate}
        index={1}
        className="min-h-0 h-full"
      />
    </div>
  );
}

function WorkView() {
  const [openSection, setOpenSection] = useState<WorkSection | null>(
    null
  );
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [whiteboardRefreshKey, setWhiteboardRefreshKey] = useState(0);
  const [projectsRefreshKey, setProjectsRefreshKey] = useState(0);

  const handleToggle = (section: WorkSection) => {
    setOpenSection((current) => (current === section ? null : section));
  };

  const handleOpenArtifact = (artifactId: string, noteId?: string) => {
    if (artifactId !== activeArtifactId) {
      setWhiteboardRefreshKey((current) => current + 1);
    }
    setActiveArtifactId(artifactId);
    setActiveNoteId(noteId ?? null);
  };

  const handleCloseArtifact = () => {
    setActiveArtifactId(null);
    setActiveNoteId(null);
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
          activeNoteId={activeNoteId}
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
        focusedNoteId={activeNoteId}
        refreshKey={whiteboardRefreshKey}
        onClose={handleCloseArtifact}
        index={3}
      />
    </div>
  );
}

function SettingsView() {
  return (
    <div className="flex flex-col gap-6">
      <ProfilePanel />
      <AgentPanel />
      <IntegrationsPanel />
      <PreferencesPanel />
    </div>
  );
}

const views: Record<Tab, ReactNode> = {
  Organize: <OrganizeView />,
  Work: <WorkView />,
  Chat: <ChatView />,
  Settings: <SettingsView />,
};

const tabLayout: Record<Tab, string> = {
  Organize: "h-full min-h-0 pl-6 pr-8 md:pl-8",
  Work: "h-full min-h-0 pl-6 pr-8 md:pl-8",
  Chat: "h-full min-h-0 pl-6 pr-8 md:pl-8",
  Settings:
    "mx-auto h-full min-h-0 w-full max-w-6xl overflow-y-auto px-8",
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("Organize");

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="min-h-0 flex-1 overflow-hidden pt-[60px] pb-6">
        {(Object.keys(views) as Tab[]).map((tab) => (
          <div
            key={tab}
            hidden={activeTab !== tab}
            className={tabLayout[tab]}
          >
            {views[tab]}
          </div>
        ))}
      </main>
      {activeTab !== "Chat" ? <AgentButton /> : null}
    </div>
  );
}
