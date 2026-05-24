"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Briefcase,
  ChevronDown,
  Clock,
  Download,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  PanelLeft,
  Plus,
  Search,
  Share2,
  SquarePen,
  X,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { getMockChatResponse } from "@/lib/chat-mock";
import { getRandomChatGreeting } from "@/lib/chat-greetings";
import { fetchProfile, getFirstName } from "@/lib/profile";
import { fetchProjects, type Project } from "@/lib/projects";

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

function SidebarButton({
  label,
  children,
  active = false,
}: {
  label: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-[8px] text-[var(--color-steam)] transition-colors duration-200 hover:bg-[var(--color-ash)] hover:text-[var(--color-bone)]",
        active && "bg-[var(--color-ash)] text-[var(--color-bone)]"
      )}
    >
      {children}
    </button>
  );
}

function ChatSidebar({ profileInitial }: { profileInitial: string }) {
  return (
    <aside className="flex w-14 shrink-0 flex-col items-center border-r border-[var(--color-border-subtle)] bg-[var(--color-obsidian)] py-3">
      <div className="flex flex-col items-center gap-1">
        <SidebarButton label="Toggle sidebar">
          <PanelLeft size={18} strokeWidth={1.5} />
        </SidebarButton>
        <SidebarButton label="New chat" active>
          <SquarePen size={18} strokeWidth={1.5} />
        </SidebarButton>
        <SidebarButton label="Search chats">
          <Search size={18} strokeWidth={1.5} />
        </SidebarButton>
        <SidebarButton label="Chat history">
          <Clock size={18} strokeWidth={1.5} />
        </SidebarButton>
        <SidebarButton label="Projects">
          <LayoutGrid size={18} strokeWidth={1.5} />
        </SidebarButton>
        <SidebarButton label="Workstation">
          <Briefcase size={18} strokeWidth={1.5} />
        </SidebarButton>
      </div>

      <div className="mt-auto flex flex-col items-center gap-1">
        <SidebarButton label="Export">
          <Download size={18} strokeWidth={1.5} />
        </SidebarButton>
        <div
          aria-hidden
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-ash)] text-[12px] font-medium text-[var(--color-bone)]"
        >
          {profileInitial}
        </div>
      </div>
    </aside>
  );
}

function ChatHeader({ title }: { title: string }) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-border-subtle)] px-4 py-3 md:px-6">
      <button
        type="button"
        className="flex min-w-0 items-center gap-1.5 text-[14px] font-medium tracking-[-0.01em] text-[var(--color-bone)] transition-colors duration-200 hover:text-[var(--color-glacier)]"
      >
        <span className="truncate">{title}</span>
        <ChevronDown size={14} strokeWidth={1.5} className="shrink-0 text-[var(--color-pumice)]" />
      </button>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Share chat"
          className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-steam)] transition-colors duration-200 hover:bg-[var(--color-ash)] hover:text-[var(--color-bone)]"
        >
          <Share2 size={16} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
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

function AssistantMessage({ content }: { content: string }) {
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

function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 py-1 text-[14px] text-[var(--color-pumice)]">
        <span className="animate-pulse">Thinking</span>
        <span className="inline-flex w-4 animate-pulse">…</span>
      </div>
    </div>
  );
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
  selectedProjectIds,
  onAddFiles,
  onAddImage,
  onToggleProject,
}: {
  open: boolean;
  projects: Project[];
  selectedProjectIds: string[];
  onAddFiles: () => void;
  onAddImage: () => void;
  onToggleProject: (projectId: string) => void;
}) {
  if (!open) return null;

  return (
    <ul
      role="menu"
      aria-label="Add to chat"
      className="absolute bottom-[calc(100%+8px)] left-0 z-20 w-56 overflow-hidden rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-obsidian)] py-1 shadow-[0_4px_24px_var(--color-shadow-soft)]"
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
        projects.map((project) => {
          const selected = selectedProjectIds.includes(project.id);
          return (
            <li key={project.id} role="none">
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={selected}
                onClick={() => onToggleProject(project.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors duration-200 hover:bg-[var(--color-ash)]",
                  selected && "bg-[var(--color-ash)]"
                )}
              >
                <span className="min-w-0 truncate text-[13px] tracking-[-0.01em] text-[var(--color-bone)]">
                  {project.name}
                </span>
                <ProjectColorDot color={project.color} />
              </button>
            </li>
          );
        })
      )}
    </ul>
  );
}

function ChatComposer({
  input,
  canSend,
  projects,
  files,
  images,
  selectedProjects,
  onInputChange,
  onSend,
  onKeyDown,
  onAddFiles,
  onAddImages,
  onToggleProject,
  onRemoveFile,
  onRemoveImage,
  onRemoveProject,
  textareaRef,
}: {
  input: string;
  canSend: boolean;
  projects: Project[];
  files: File[];
  images: File[];
  selectedProjects: Project[];
  onInputChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onAddFiles: (files: FileList | null) => void;
  onAddImages: (files: FileList | null) => void;
  onToggleProject: (projectId: string) => void;
  onRemoveFile: (index: number) => void;
  onRemoveImage: (index: number) => void;
  onRemoveProject: (projectId: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const hasAttachments =
    files.length > 0 || images.length > 0 || selectedProjects.length > 0;

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
                selectedProjectIds={selectedProjects.map((project) => project.id)}
                onAddFiles={handleAddFilesClick}
                onAddImage={handleAddImageClick}
                onToggleProject={onToggleProject}
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

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => onInputChange(event.target.value)}
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
  const [isThinking, setIsThinking] = useState(false);
  const [greeting, setGreeting] = useState("Ask Ion");
  const [profileInitial, setProfileInitial] = useState("A");
  const [projects, setProjects] = useState<Project[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingReply = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedProjects = projects.filter((project) =>
    selectedProjectIds.includes(project.id)
  );

  const canSend = input.trim().length > 0 && !isThinking;
  const chatTitle =
    messages.find((message) => message.role === "user")?.content ?? "New chat";

  useEffect(() => {
    let cancelled = false;

    fetchProfile()
      .then((profile) => {
        if (cancelled) return;
        const firstName = getFirstName(profile.name);
        setGreeting(getRandomChatGreeting(firstName));
        setProfileInitial(firstName.slice(0, 1).toUpperCase() || "A");
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
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, isThinking]);

  useEffect(() => {
    return () => {
      if (pendingReply.current) {
        clearTimeout(pendingReply.current);
      }
    };
  }, []);

  function adjustInputHeight() {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "32px";
    element.style.height = `${Math.min(Math.max(element.scrollHeight, 32), 160)}px`;
  }

  useEffect(() => {
    adjustInputHeight();
  }, [input]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isThinking) return;

    const userMessage = createMessage("user", trimmed);
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsThinking(true);

    const mockReply = getMockChatResponse(trimmed);

    pendingReply.current = setTimeout(() => {
      if (mockReply) {
        setMessages((current) => [
          ...current,
          createMessage("assistant", mockReply),
        ]);
      }
      setIsThinking(false);
    }, mockReply ? 700 : 0);
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

  return (
    <div className="flex h-full min-h-0 bg-[var(--color-void)]">
      <ChatSidebar profileInitial={profileInitial} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ChatHeader title={chatTitle} />

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 md:px-6"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 py-6">
            {messages.length === 0 && !isThinking ? (
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
                    />
                  )
                )}
                {isThinking ? <ThinkingIndicator /> : null}
              </>
            )}
          </div>
        </div>

        <ChatComposer
          input={input}
          canSend={canSend}
          projects={projects}
          files={attachedFiles}
          images={attachedImages}
          selectedProjects={selectedProjects}
          onInputChange={setInput}
          onSend={handleSend}
          onKeyDown={handleKeyDown}
          onAddFiles={handleAddFiles}
          onAddImages={handleAddImages}
          onToggleProject={handleToggleProject}
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
          textareaRef={textareaRef}
        />
      </div>
    </div>
  );
}
