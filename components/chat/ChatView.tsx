"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Plus,
  X,
} from "lucide-react";
import Image from "next/image";
import { SmartTextarea } from "@/components/ui/SmartTextarea";
import { cn } from "@/lib/cn";
import { getRandomChatGreeting } from "@/lib/chat-greetings";
import { streamAgentMessage } from "@/lib/agent";
import { getTodayDate, toDateKey } from "@/lib/calendar";
import {
  fetchConversation,
  fetchConversations,
  type ConversationSummary,
} from "@/lib/conversations";
import { fetchProfile, getFirstName } from "@/lib/profile";
import { fetchProjects, type Project } from "@/lib/projects";
import { fetchArtifacts, type Artifact } from "@/lib/artifacts";
import { getProjectListArtifacts } from "@/lib/artifact-select-options";
import {
  getArtifactDisplayTitle,
  getArtifactTypeLabel,
} from "@/lib/artifact-constants";
import { ConversationSidebar } from "./ConversationSidebar";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function createMessage(role: Message["role"], content: string): Message {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
  };
}

function EmptyState({ greeting }: { greeting: string }) {
  return (
    <div className="flex flex-col items-center gap-4 pt-20 text-center md:pt-28">
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-obsidian)] shadow-[0_1px_3px_var(--color-shadow-soft)]">
        <Image
          src="/ion.svg"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 scale-[1.35]"
        />
      </div>
      <h2 className="max-w-md text-[22px] font-medium tracking-[-0.02em] text-[var(--color-glacier)]">
        {greeting}
      </h2>
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-[18px] bg-[var(--color-ash)] px-4 py-3 text-[15px] leading-[1.6] tracking-[-0.01em] text-[var(--color-bone)]">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

function AssistantMessage({
  content,
  streaming = false,
}: {
  content: string;
  streaming?: boolean;
}) {
  if (streaming) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[95%] whitespace-pre-wrap text-[15px] leading-[1.6] tracking-[-0.01em] text-[var(--color-bone)]">
          {content}
          <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-[var(--color-pumice)]" />
        </div>
      </div>
    );
  }

  const paragraphs = content.split(/\n+/).filter(Boolean);

  return (
    <div className="flex justify-start">
      <div className="max-w-[95%] space-y-3 text-[15px] leading-[1.6] tracking-[-0.01em] text-[var(--color-bone)]">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}

function mapDbMessages(
  messages: Array<{ id: string; role: string; content: string }>
): Message[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role as Message["role"],
    content: message.content,
  }));
}

function ProjectColorDot({ color }: { color: string | null }) {
  if (!color) return <span className="h-3 w-3 shrink-0" aria-hidden />;

  return (
    <span
      className="h-3 w-3 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

function ChatAttachmentMenu({
  open,
  projects,
  artifacts,
  selectedProjectIds,
  selectedArtifactIds,
  onAddFiles,
  onAddImage,
  onToggleProject,
  onToggleArtifact,
}: {
  open: boolean;
  projects: Project[];
  artifacts: Artifact[];
  selectedProjectIds: string[];
  selectedArtifactIds: string[];
  onAddFiles: () => void;
  onAddImage: () => void;
  onToggleProject: (projectId: string) => void;
  onToggleArtifact: (artifactId: string) => void;
}) {
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setExpandedProjectId(null);
    }
  }, [open]);

  if (!open) return null;

  const expandedProject = projects.find(
    (project) => project.id === expandedProjectId
  );
  const expandedProjectArtifacts = expandedProject
    ? getProjectListArtifacts(artifacts, expandedProject.id)
    : [];

  return (
    <div className="absolute bottom-[calc(100%+8px)] left-0 z-20 flex items-start gap-2">
      <ul
        role="menu"
        aria-label="Add to chat"
        className="w-56 shrink-0 rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-obsidian)] py-1 shadow-[0_4px_24px_var(--color-shadow-soft)]"
      >
        <li role="none">
          <button
            type="button"
            role="menuitem"
            onClick={onAddFiles}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] tracking-[-0.01em] text-[var(--color-bone)] transition-colors duration-200 hover:bg-[var(--color-ash)]"
          >
            <FileText size={15} strokeWidth={1.5} className="shrink-0 text-[var(--color-steam)]" />
            Add files
          </button>
        </li>
        <li role="none">
          <button
            type="button"
            role="menuitem"
            onClick={onAddImage}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] tracking-[-0.01em] text-[var(--color-bone)] transition-colors duration-200 hover:bg-[var(--color-ash)]"
          >
            <ImageIcon size={15} strokeWidth={1.5} className="shrink-0 text-[var(--color-steam)]" />
            Add image
          </button>
        </li>

        <li role="separator" aria-hidden className="my-1 h-px bg-[var(--color-border-subtle)]" />

        {projects.length === 0 ? (
          <li className="px-3 py-2 text-[12px] text-[var(--color-pumice)]">
            No projects yet
          </li>
        ) : (
          <li role="none" className="max-h-48 overflow-y-auto">
            <ul role="group" aria-label="Projects">
              {projects.map((project) => {
                const selected = selectedProjectIds.includes(project.id);
                const artifactsExpanded = expandedProjectId === project.id;

                return (
                  <li key={project.id} role="none">
                    <div
                      className={cn(
                        "flex items-center transition-colors duration-200 hover:bg-[var(--color-ash)]",
                        selected && "bg-[var(--color-ash)]",
                        artifactsExpanded && "bg-[var(--color-ash)]"
                      )}
                    >
                      <button
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={selected}
                        onClick={() => onToggleProject(project.id)}
                        className="flex min-w-0 flex-1 items-center px-3 py-2 text-left"
                      >
                        <span className="truncate text-[13px] tracking-[-0.01em] text-[var(--color-bone)]">
                          {project.name}
                        </span>
                      </button>

                      <div className="flex shrink-0 items-center gap-1 pr-1.5">
                        <ProjectColorDot color={project.color} />
                        <button
                          type="button"
                          aria-label={`Browse artifacts in ${project.name}`}
                          aria-haspopup="menu"
                          aria-expanded={artifactsExpanded}
                          onClick={(event) => {
                            event.stopPropagation();
                            setExpandedProjectId((current) =>
                              current === project.id ? null : project.id
                            );
                          }}
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-[4px] text-[var(--color-pumice)] transition-colors duration-200 hover:bg-[var(--color-frost)] hover:text-[var(--color-steam)]",
                            artifactsExpanded &&
                              "bg-[var(--color-frost)] text-[var(--color-steam)]"
                          )}
                        >
                          <ChevronRight
                            size={14}
                            strokeWidth={1.5}
                            className={cn(
                              "transition-transform duration-200",
                              artifactsExpanded && "rotate-90"
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        )}
      </ul>

      {expandedProject ? (
        <div className="w-56 shrink-0 overflow-hidden rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-obsidian)] shadow-[0_4px_24px_var(--color-shadow-soft)]">
          <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] px-3 py-2">
            <ProjectColorDot color={expandedProject.color} />
            <span className="min-w-0 truncate text-[12px] font-medium tracking-[-0.01em] text-[var(--color-steam)]">
              {expandedProject.name}
            </span>
          </div>
          <ul
            role="menu"
            aria-label={`Artifacts in ${expandedProject.name}`}
            className="max-h-48 overflow-y-auto py-1"
          >
            {expandedProjectArtifacts.length === 0 ? (
              <li className="px-3 py-2 text-[12px] text-[var(--color-pumice)]">
                No artifacts yet
              </li>
            ) : (
              expandedProjectArtifacts.map((artifact) => {
                const artifactSelected = selectedArtifactIds.includes(
                  artifact.id
                );
                return (
                  <li key={artifact.id} role="none">
                    <button
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={artifactSelected}
                      onClick={() => onToggleArtifact(artifact.id)}
                      className={cn(
                        "flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors duration-200 hover:bg-[var(--color-ash)]",
                        artifactSelected && "bg-[var(--color-ash)]"
                      )}
                    >
                      <span className="truncate text-[13px] tracking-[-0.01em] text-[var(--color-bone)]">
                        {getArtifactDisplayTitle(artifact)}
                      </span>
                      <span className="text-[11px] text-[var(--color-pumice)]">
                        {getArtifactTypeLabel(artifact.kind)}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ChatComposer({
  input,
  canSend,
  projects,
  artifacts,
  files,
  images,
  selectedProjects,
  selectedArtifacts,
  onInputChange,
  onSend,
  onKeyDown,
  onAddFiles,
  onAddImages,
  onToggleProject,
  onToggleArtifact,
  onRemoveFile,
  onRemoveImage,
  onRemoveProject,
  onRemoveArtifact,
  textareaRef,
}: {
  input: string;
  canSend: boolean;
  projects: Project[];
  artifacts: Artifact[];
  files: File[];
  images: File[];
  selectedProjects: Project[];
  selectedArtifacts: Artifact[];
  onInputChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onAddFiles: (files: FileList | null) => void;
  onAddImages: (files: FileList | null) => void;
  onToggleProject: (projectId: string) => void;
  onToggleArtifact: (artifactId: string) => void;
  onRemoveFile: (index: number) => void;
  onRemoveImage: (index: number) => void;
  onRemoveProject: (projectId: string) => void;
  onRemoveArtifact: (artifactId: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const hasAttachments =
    files.length > 0 ||
    images.length > 0 ||
    selectedProjects.length > 0 ||
    selectedArtifacts.length > 0;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function handleAddFilesClick() {
    fileInputRef.current?.click();
    setMenuOpen(false);
  }

  function handleAddImageClick() {
    imageInputRef.current?.click();
    setMenuOpen(false);
  }

  return (
    <div className="shrink-0 px-4 pb-4 pt-2 md:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-[16px] border border-[var(--color-border-active)] bg-[var(--color-obsidian)] px-3 py-2 shadow-[0_2px_12px_var(--color-shadow-soft),0_0_0_1px_var(--color-border-subtle)]">
          {hasAttachments ? (
            <div className="mb-2 flex flex-wrap gap-2 border-b border-[var(--color-border-subtle)] pb-2">
              {files.map((file, index) => (
                <span
                  key={`file-${file.name}-${index}`}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-[8px] bg-[var(--color-ash)] py-1 pl-2 pr-1 text-[12px] text-[var(--color-bone)]"
                >
                  <FileText size={13} strokeWidth={1.5} className="shrink-0 text-[var(--color-steam)]" />
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => onRemoveFile(index)}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] text-[var(--color-pumice)] transition-colors duration-200 hover:bg-[var(--color-frost)] hover:text-[var(--color-bone)]"
                  >
                    <X size={12} strokeWidth={1.5} />
                  </button>
                </span>
              ))}
              {images.map((file, index) => (
                <span
                  key={`image-${file.name}-${index}`}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-[8px] bg-[var(--color-ash)] py-1 pl-2 pr-1 text-[12px] text-[var(--color-bone)]"
                >
                  <ImageIcon size={13} strokeWidth={1.5} className="shrink-0 text-[var(--color-steam)]" />
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => onRemoveImage(index)}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] text-[var(--color-pumice)] transition-colors duration-200 hover:bg-[var(--color-frost)] hover:text-[var(--color-bone)]"
                  >
                    <X size={12} strokeWidth={1.5} />
                  </button>
                </span>
              ))}
              {selectedProjects.map((project) => (
                <span
                  key={project.id}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-[8px] bg-[var(--color-ash)] py-1 pl-2 pr-1 text-[12px] text-[var(--color-bone)]"
                >
                  <ProjectColorDot color={project.color} />
                  <span className="truncate">{project.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${project.name}`}
                    onClick={() => onRemoveProject(project.id)}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] text-[var(--color-pumice)] transition-colors duration-200 hover:bg-[var(--color-frost)] hover:text-[var(--color-bone)]"
                  >
                    <X size={12} strokeWidth={1.5} />
                  </button>
                </span>
              ))}
              {selectedArtifacts.map((artifact) => {
                const projectColor =
                  projects.find((project) => project.id === artifact.projectId)
                    ?.color ??
                  artifact.project?.color ??
                  null;
                const artifactTitle = getArtifactDisplayTitle(artifact);

                return (
                  <span
                    key={artifact.id}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-[8px] bg-[var(--color-ash)] py-1 pl-2 pr-1 text-[12px] text-[var(--color-bone)]"
                  >
                    <ProjectColorDot color={projectColor} />
                    <span className="truncate">{artifactTitle}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${artifactTitle}`}
                      onClick={() => onRemoveArtifact(artifact.id)}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] text-[var(--color-pumice)] transition-colors duration-200 hover:bg-[var(--color-frost)] hover:text-[var(--color-bone)]"
                    >
                      <X size={12} strokeWidth={1.5} />
                    </button>
                  </span>
                );
              })}
            </div>
          ) : null}

          <div className="flex items-end gap-2">
            <div ref={menuRef} className="relative shrink-0">
              <button
                type="button"
                aria-label="Add attachment"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((current) => !current)}
                className={cn(
                  "mb-0.5 flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-pumice)] transition-colors duration-200 hover:bg-[var(--color-ash)] hover:text-[var(--color-steam)]",
                  menuOpen && "bg-[var(--color-ash)] text-[var(--color-steam)]"
                )}
              >
                <Plus size={18} strokeWidth={1.5} />
              </button>

              <ChatAttachmentMenu
                open={menuOpen}
                projects={projects}
                artifacts={artifacts}
                selectedProjectIds={selectedProjects.map((project) => project.id)}
                selectedArtifactIds={selectedArtifacts.map(
                  (artifact) => artifact.id
                )}
                onAddFiles={handleAddFilesClick}
                onAddImage={handleAddImageClick}
                onToggleProject={onToggleProject}
                onToggleArtifact={onToggleArtifact}
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                onAddFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                onAddImages(event.target.files);
                event.target.value = "";
              }}
            />

            <SmartTextarea
              ref={textareaRef}
              value={input}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              placeholder="Ask Ion"
              rows={1}
              className="mb-0.5 block max-h-40 min-h-8 w-full flex-1 resize-none overflow-hidden border-0 bg-transparent p-0 text-[15px] leading-8 outline-none placeholder:text-[var(--color-pumice)]"
              style={{ height: "32px" }}
            />

            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              aria-label="Send message"
              className={cn(
                "mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-[background-color,color,opacity] duration-200",
                canSend
                  ? "bg-[var(--color-glacier)] text-[var(--color-obsidian)] hover:bg-[var(--color-bone)]"
                  : "bg-[var(--color-frost)] text-[var(--color-pumice)]"
              )}
            >
              <ArrowUp size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        <p className="mt-2 text-center text-[12px] tracking-[-0.01em] text-[var(--color-pumice)]">
          Ion is AI and can make mistakes. Please double-check responses.
        </p>
      </div>
    </div>
  );
}

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [loadingConversationId, setLoadingConversationId] = useState<
    string | null
  >(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Ask Ion");
  const [projects, setProjects] = useState<Project[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedArtifactIds, setSelectedArtifactIds] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamBufferRef = useRef<{ id: string; content: string } | null>(null);
  const streamRafRef = useRef<number | null>(null);

  const selectedProjects = projects.filter((project) =>
    selectedProjectIds.includes(project.id)
  );
  const selectedArtifacts = artifacts.filter((artifact) =>
    selectedArtifactIds.includes(artifact.id)
  );

  const canSend = input.trim().length > 0 && !isStreaming && !loadingConversationId;

  const refreshConversations = async () => {
    try {
      const data = await fetchConversations();
      setConversations(data);
    } catch {
      setConversations([]);
    } finally {
      setConversationsLoading(false);
    }
  };

  const flushStreamBuffer = () => {
    if (streamRafRef.current !== null) {
      cancelAnimationFrame(streamRafRef.current);
      streamRafRef.current = null;
    }

    const snapshot = streamBufferRef.current;
    streamBufferRef.current = null;

    if (!snapshot) return;

    setMessages((current) =>
      current.map((message) =>
        message.id === snapshot.id
          ? { ...message, content: snapshot.content }
          : message
      )
    );
  };

  const appendStreamDelta = (messageId: string, delta: string) => {
    if (!streamBufferRef.current || streamBufferRef.current.id !== messageId) {
      streamBufferRef.current = { id: messageId, content: delta };
    } else {
      streamBufferRef.current.content += delta;
    }

    if (streamRafRef.current !== null) return;

    streamRafRef.current = requestAnimationFrame(() => {
      streamRafRef.current = null;
      const snapshot = streamBufferRef.current;
      if (!snapshot) return;

      setMessages((current) =>
        current.map((message) =>
          message.id === snapshot.id
            ? { ...message, content: snapshot.content }
            : message
        )
      );
    });
  };

  useEffect(() => {
    void refreshConversations();
  }, []);

  useEffect(() => {
    return () => {
      if (streamRafRef.current !== null) {
        cancelAnimationFrame(streamRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchProfile()
      .then((profile) => {
        if (cancelled) return;
        const firstName = getFirstName(profile.name);
        setGreeting(getRandomChatGreeting(firstName));
      })
      .catch(() => {
        if (!cancelled) {
          setGreeting(getRandomChatGreeting(""));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchProjects()
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchArtifacts()
      .then((data) => {
        if (!cancelled) setArtifacts(data);
      })
      .catch(() => {
        if (!cancelled) setArtifacts([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, isStreaming, sendError]);

  function adjustInputHeight() {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "32px";
    element.style.height = `${Math.min(Math.max(element.scrollHeight, 32), 160)}px`;
  }

  useEffect(() => {
    adjustInputHeight();
  }, [input]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || loadingConversationId) return;

    const userMessage = createMessage("user", trimmed);
    const assistantMessage = createMessage("assistant", "");
    setMessages((current) => [...current, userMessage, assistantMessage]);
    setInput("");
    setIsStreaming(true);
    setStreamingMessageId(assistantMessage.id);
    setSendError(null);
    streamBufferRef.current = { id: assistantMessage.id, content: "" };

    try {
      const result = await streamAgentMessage({
        message: trimmed,
        conversationId,
        context: {
          currentTab: "chat",
          currentDate: toDateKey(getTodayDate()),
          activeProjectId: selectedProjectIds[0] ?? null,
          activeArtifactId: selectedArtifactIds[0] ?? null,
        },
        onMeta: ({ conversationId: nextConversationId }) => {
          setConversationId(nextConversationId);
        },
        onDelta: (text) => {
          appendStreamDelta(assistantMessage.id, text);
        },
        onDone: ({ reply }) => {
          flushStreamBuffer();
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessage.id
                ? { ...message, content: reply }
                : message
            )
          );
        },
      });

      setConversationId(result.conversationId);
      await refreshConversations();
    } catch (error) {
      flushStreamBuffer();
      setMessages((current) =>
        current.filter((message) => message.id !== assistantMessage.id)
      );
      setSendError(
        error instanceof Error ? error.message : "Failed to send message"
      );
    } finally {
      setIsStreaming(false);
      setStreamingMessageId(null);
      streamBufferRef.current = null;
    }
  }

  async function handleSelectConversation(nextConversationId: string) {
    if (
      nextConversationId === conversationId ||
      isStreaming ||
      loadingConversationId
    ) {
      return;
    }

    setLoadingConversationId(nextConversationId);
    setSendError(null);

    try {
      const conversation = await fetchConversation(nextConversationId);
      setConversationId(conversation.id);
      setMessages(mapDbMessages(conversation.messages));
    } catch {
      setSendError("Could not load conversation.");
    } finally {
      setLoadingConversationId(null);
    }
  }

  function handleNewChat() {
    if (isStreaming) return;
    setConversationId(null);
    setMessages([]);
    setSendError(null);
    setInput("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  function handleAddFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setAttachedFiles((current) => [...current, ...Array.from(fileList)]);
  }

  function handleAddImages(fileList: FileList | null) {
    if (!fileList?.length) return;
    setAttachedImages((current) => [...current, ...Array.from(fileList)]);
  }

  function handleToggleProject(projectId: string) {
    setSelectedProjectIds((current) =>
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId]
    );
  }

  function handleToggleArtifact(artifactId: string) {
    setSelectedArtifactIds((current) =>
      current.includes(artifactId)
        ? current.filter((id) => id !== artifactId)
        : [...current, artifactId]
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-[var(--color-void)]">
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={conversationId}
        loading={conversationsLoading}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 md:px-6"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 py-6">
            {loadingConversationId ? (
              <p className="text-[13px] text-[var(--color-pumice)]">
                Loading conversation…
              </p>
            ) : null}
            {messages.length === 0 && !isStreaming && !loadingConversationId ? (
              <EmptyState greeting={greeting} />
            ) : (
              <>
                {messages.map((message) =>
                  message.role === "user" ? (
                    <UserMessage key={message.id} content={message.content} />
                  ) : (
                    <AssistantMessage
                      key={message.id}
                      content={message.content}
                      streaming={
                        isStreaming && message.id === streamingMessageId
                      }
                    />
                  )
                )}
                {sendError ? (
                  <p className="text-[13px] text-[var(--color-ember)]">
                    {sendError}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>

        <ChatComposer
        input={input}
        canSend={canSend}
        projects={projects}
        artifacts={artifacts}
        files={attachedFiles}
        images={attachedImages}
        selectedProjects={selectedProjects}
        selectedArtifacts={selectedArtifacts}
        onInputChange={setInput}
        onSend={handleSend}
        onKeyDown={handleKeyDown}
        onAddFiles={handleAddFiles}
        onAddImages={handleAddImages}
        onToggleProject={handleToggleProject}
        onToggleArtifact={handleToggleArtifact}
        onRemoveFile={(index) =>
          setAttachedFiles((current) => current.filter((_, i) => i !== index))
        }
        onRemoveImage={(index) =>
          setAttachedImages((current) => current.filter((_, i) => i !== index))
        }
        onRemoveProject={(projectId) =>
          setSelectedProjectIds((current) =>
            current.filter((id) => id !== projectId)
          )
        }
        onRemoveArtifact={(artifactId) =>
          setSelectedArtifactIds((current) =>
            current.filter((id) => id !== artifactId)
          )
        }
        textareaRef={textareaRef}
      />
      </div>
    </div>
  );
}
