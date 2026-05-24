"use client";

import { useEffect, useRef, useState } from "react";
import { Navbar, type Tab } from "@/components/Navbar";
import {
  AgentButton,
  type AgentButtonState,
} from "@/components/AgentButton";
import { Surface } from "@/components/ui/Surface";
import { Label } from "@/components/ui/Label";
import { ProjectsPanel } from "@/components/workstation/ProjectsPanel";
import { ArtifactsPanel } from "@/components/workstation/ArtifactsPanel";
import { ThoughtsPanel } from "@/components/workstation/ThoughtsPanel";
import { Whiteboard } from "@/components/workstation/Whiteboard";
import { ProfilePanel } from "@/components/settings/ProfilePanel";
import { AgentPanel } from "@/components/settings/AgentPanel";
import { UsagePanel } from "@/components/settings/UsagePanel";
import { IntegrationsPanel } from "@/components/settings/IntegrationsPanel";
import { PreferencesPanel } from "@/components/settings/PreferencesPanel";
import { CalendarPanel } from "@/components/time/CalendarPanel";
import { InboxPanel } from "@/components/time/InboxPanel";
import { TodoListPanel } from "@/components/time/TodoListPanel";
import { ChatView } from "@/components/chat/ChatView";
import { getTodayDate } from "@/lib/calendar";
import { cn } from "@/lib/cn";
import { touchArtifactRecent } from "@/lib/artifact-recents";

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

function OrganizeView({
  inboxExpanded,
  onInboxExpandedChange,
}: {
  inboxExpanded: boolean;
  onInboxExpandedChange: (expanded: boolean) => void;
}) {
  const [selectedDate, setSelectedDate] = useState(getTodayDate);

  return (
    <div className="grid h-full min-h-0 gap-6 md:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
      <div
        className={cn(
          "flex min-h-0 flex-col gap-6",
          inboxExpanded && "overflow-visible"
        )}
      >
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
          className={inboxExpanded ? undefined : "min-h-0 flex-1"}
          expanded={inboxExpanded}
          onToggleExpanded={() => onInboxExpandedChange(!inboxExpanded)}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
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

function WorkView({
  activeArtifactId,
  activeNoteId,
  onActiveArtifactChange,
}: {
  activeArtifactId: string | null;
  activeNoteId: string | null;
  onActiveArtifactChange: (
    artifactId: string | null,
    noteId?: string | null
  ) => void;
}) {
  const [openSection, setOpenSection] = useState<WorkSection | null>(
    null
  );
  const [whiteboardRefreshKey, setWhiteboardRefreshKey] = useState(0);
  const [projectsRefreshKey, setProjectsRefreshKey] = useState(0);
  const [artifactRecentsKey, setArtifactRecentsKey] = useState(0);

  const handleToggle = (section: WorkSection) => {
    setOpenSection((current) => (current === section ? null : section));
  };

  const handleOpenArtifact = (artifactId: string, noteId?: string) => {
    touchArtifactRecent(artifactId);
    setArtifactRecentsKey((current) => current + 1);
    if (artifactId !== activeArtifactId) {
      setWhiteboardRefreshKey((current) => current + 1);
    }
    onActiveArtifactChange(artifactId, noteId ?? null);
  };

  const handleCloseArtifact = () => {
    onActiveArtifactChange(null, null);
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
          activeArtifactId={activeArtifactId}
          refreshKey={whiteboardRefreshKey}
          projectsRefreshKey={projectsRefreshKey}
          recentSortKey={artifactRecentsKey}
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

function SettingsView({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <ProfilePanel />
      <AgentPanel />
      <UsagePanel isActive={isActive} />
      <IntegrationsPanel />
      <PreferencesPanel />
    </div>
  );
}

const tabLayout: Record<Tab, string> = {
  Organize: "h-full min-h-0 pl-6 pr-8 md:pl-8",
  Work: "h-full min-h-0 pl-6 pr-8 md:pl-8",
  Chat: "h-full min-h-0",
  Settings:
    "mx-auto h-full min-h-0 w-full max-w-6xl overflow-y-auto px-8",
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("Organize");
  const [inboxExpanded, setInboxExpanded] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentDocked, setAgentDocked] = useState(false);
  const [agentQuery, setAgentQuery] = useState("");
  const [pendingChatConversationId, setPendingChatConversationId] = useState<
    string | null
  >(null);
  const [chatActiveConversationId, setChatActiveConversationId] = useState<
    string | null
  >(null);
  const [agentResyncConversationId, setAgentResyncConversationId] = useState<
    string | null
  >(null);
  const [workActiveArtifactId, setWorkActiveArtifactId] = useState<string | null>(
    null
  );
  const [workActiveNoteId, setWorkActiveNoteId] = useState<string | null>(null);
  const previousTabRef = useRef<Tab>("Organize");
  const wasEmailModeRef = useRef(false);

  const emailModeOnOrganize = activeTab === "Organize" && inboxExpanded;

  const agentState: AgentButtonState = {
    open: agentOpen,
    docked: agentDocked,
    query: agentQuery,
    onOpenChange: setAgentOpen,
    onDockedChange: setAgentDocked,
    onQueryChange: setAgentQuery,
  };

  useEffect(() => {
    if (emailModeOnOrganize && !wasEmailModeRef.current && !agentDocked) {
      setAgentOpen(true);
    }
    wasEmailModeRef.current = emailModeOnOrganize;
  }, [emailModeOnOrganize, agentDocked]);

  useEffect(() => {
    const previousTab = previousTabRef.current;

    if (
      previousTab === "Chat" &&
      activeTab !== "Chat" &&
      chatActiveConversationId
    ) {
      setAgentResyncConversationId(chatActiveConversationId);
    }

    previousTabRef.current = activeTab;
  }, [activeTab, chatActiveConversationId]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="min-h-0 flex-1 overflow-hidden pt-[60px] pb-6">
        <div
          hidden={activeTab !== "Organize"}
          className={tabLayout.Organize}
        >
          <OrganizeView
            inboxExpanded={inboxExpanded}
            onInboxExpandedChange={setInboxExpanded}
          />
        </div>
        <div hidden={activeTab !== "Work"} className={tabLayout.Work}>
          <WorkView
            activeArtifactId={workActiveArtifactId}
            activeNoteId={workActiveNoteId}
            onActiveArtifactChange={(artifactId, noteId) => {
              setWorkActiveArtifactId(artifactId);
              setWorkActiveNoteId(noteId ?? null);
            }}
          />
        </div>
        <div hidden={activeTab !== "Chat"} className={tabLayout.Chat}>
          <ChatView
            openConversationId={pendingChatConversationId}
            onOpenConversationHandled={() => setPendingChatConversationId(null)}
            onActiveConversationChange={setChatActiveConversationId}
          />
        </div>
        <div hidden={activeTab !== "Settings"} className={tabLayout.Settings}>
          <SettingsView isActive={activeTab === "Settings"} />
        </div>
      </main>
      <AgentButton
        {...agentState}
        currentTab={activeTab.toLowerCase()}
        activeArtifactId={
          activeTab === "Work" ? workActiveArtifactId : null
        }
        placeholder={
          emailModeOnOrganize ? "Need help drafting?" : "Ask Ion"
        }
        className={activeTab === "Chat" ? "pointer-events-none invisible" : undefined}
        onOpenInChat={(conversationId) => {
          setPendingChatConversationId(conversationId);
          setActiveTab("Chat");
        }}
        resyncConversationId={agentResyncConversationId}
        onResyncHandled={() => setAgentResyncConversationId(null)}
      />
    </div>
  );
}
