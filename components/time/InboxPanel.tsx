"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Surface } from "@/components/ui/Surface";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/cn";

type InboxSource = "gmail" | "slack" | "discord";

interface InboxSourceOption {
  id: InboxSource;
  name: string;
  logo: string;
}

interface GmailMessage {
  id: string;
  from: string;
  subject: string;
  preview: string;
  time: string;
  unread?: boolean;
}

interface ChatMessage {
  id: string;
  channel: string;
  author: string;
  avatarColor: string;
  preview: string;
  time: string;
  mention?: boolean;
}

const INBOX_SOURCES: InboxSourceOption[] = [
  { id: "gmail", name: "Gmail", logo: "/integrations/gmail.svg" },
  { id: "slack", name: "Slack", logo: "/integrations/slack.svg" },
  { id: "discord", name: "Discord", logo: "/integrations/discord.svg" },
];

const GMAIL_MESSAGES: GmailMessage[] = [
  {
    id: "gmail-1",
    from: "Sarah Chen",
    subject: "Q2 roadmap review",
    preview:
      "Hi Alex — wanted to follow up on the design review notes. Can you share the updated timeline before Friday?",
    time: "10:42 AM",
    unread: true,
  },
  {
    id: "gmail-2",
    from: "Linear",
    subject: "ION-142 assigned to you",
    preview:
      "Jamie assigned you a new issue: Inbox integration wiring for Gmail OAuth.",
    time: "9:15 AM",
    unread: true,
  },
  {
    id: "gmail-3",
    from: "Notion Team",
    subject: "Your weekly digest",
    preview:
      "3 pages updated in Ion Workspace, including Product Specs and Meeting Notes.",
    time: "Yesterday",
  },
];

const SLACK_MESSAGES: ChatMessage[] = [
  {
    id: "slack-1",
    channel: "product",
    author: "Jamie",
    avatarColor: "#0071e3",
    preview:
      "Shipped the calendar view. Take a look when you get a chance — left a few comments on spacing.",
    time: "11:03 AM",
  },
  {
    id: "slack-2",
    channel: "ion",
    author: "Dev Bot",
    avatarColor: "#34c759",
    preview: "Build passed on main · 3 checks succeeded",
    time: "10:18 AM",
  },
  {
    id: "slack-3",
    channel: "design",
    author: "Morgan",
    avatarColor: "#5856d6",
    preview: "Updated the inbox mocks in Figma. Thread has the latest comps.",
    time: "Yesterday",
  },
];

const DISCORD_MESSAGES: ChatMessage[] = [
  {
    id: "discord-1",
    channel: "general",
    author: "alex",
    avatarColor: "#5865f2",
    preview: "Anyone free for a quick sync at 3? Need eyes on the inbox layout.",
    time: "12:24 PM",
    mention: true,
  },
  {
    id: "discord-2",
    channel: "dev",
    author: "Morgan",
    avatarColor: "#eb459e",
    preview: "Pushed the integration selector UI to staging. LMK if the logos feel too small.",
    time: "11:51 AM",
  },
  {
    id: "discord-3",
    channel: "feedback",
    author: "Sarah",
    avatarColor: "#faa61a",
    preview: "Love the unified inbox direction. Gmail thread view would be huge next.",
    time: "Yesterday",
  },
];

const ease = [0.16, 1, 0.3, 1] as const;

interface InboxPanelProps {
  index?: number;
  className?: string;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}

function SourceButton({
  source,
  selected,
  onSelect,
}: {
  source: InboxSourceOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Show ${source.name} inbox`}
      aria-pressed={selected}
      className={cn(
        "relative flex flex-col items-center gap-1.5 px-2.5 py-1 transition-opacity duration-200",
        selected ? "opacity-100" : "opacity-35 hover:opacity-55"
      )}
    >
      <span className="flex h-6 w-6 items-center justify-center">
        <Image
          src={source.logo}
          alt=""
          width={24}
          height={24}
          className="max-h-5 max-w-5 object-contain"
        />
      </span>
      <span
        className={cn(
          "h-px w-full rounded-full bg-[var(--color-bone)] transition-opacity duration-200",
          selected ? "opacity-100" : "opacity-0"
        )}
      />
    </button>
  );
}

function GmailMessageRow({ message }: { message: GmailMessage }) {
  return (
    <article className="flex gap-3 py-3.5">
      <div className="flex w-2 shrink-0 justify-center pt-2">
        {message.unread ? (
          <span className="h-2 w-2 rounded-full bg-[var(--color-aurora)]" />
        ) : (
          <span className="h-2 w-2" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span
            className={cn(
              "truncate text-[14px] tracking-[-0.01em] text-[var(--color-bone)]",
              message.unread ? "font-medium" : "font-normal"
            )}
          >
            {message.from}
          </span>
          <span className="shrink-0 font-mono text-[11px] text-[var(--color-pumice)]">
            {message.time}
          </span>
        </div>
        <p
          className={cn(
            "mt-0.5 truncate text-[13px] tracking-[-0.01em]",
            message.unread
              ? "font-medium text-[var(--color-bone)]"
              : "text-[var(--color-bone)]"
          )}
        >
          {message.subject}
        </p>
        <p className="mt-1 line-clamp-2 text-[13px] leading-[1.45] tracking-[-0.01em] text-[var(--color-pumice)]">
          {message.preview}
        </p>
      </div>
    </article>
  );
}

function SlackMessageRow({ message }: { message: ChatMessage }) {
  return (
    <article className="py-3.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[12px] font-medium tracking-[-0.01em] text-[var(--color-steam)]">
          #{message.channel}
        </span>
        <span className="shrink-0 font-mono text-[11px] text-[var(--color-pumice)]">
          {message.time}
        </span>
      </div>
      <div className="flex gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[12px] font-medium text-white"
          style={{ backgroundColor: message.avatarColor }}
        >
          {message.author.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-[13px] font-medium tracking-[-0.01em] text-[var(--color-bone)]">
            {message.author}
          </span>
          <p className="mt-1 text-[13px] leading-[1.45] tracking-[-0.01em] text-[var(--color-steam)]">
            {message.preview}
          </p>
        </div>
      </div>
    </article>
  );
}

function DiscordMessageRow({ message }: { message: ChatMessage }) {
  return (
    <article className="py-3.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[12px] tracking-[-0.01em] text-[var(--color-steam)]">
          Ion · #{message.channel}
        </span>
        <span className="shrink-0 font-mono text-[11px] text-[var(--color-pumice)]">
          {message.time}
        </span>
      </div>
      <div className="flex gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-medium text-white"
          style={{ backgroundColor: message.avatarColor }}
        >
          {message.author.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-medium tracking-[-0.01em] text-[var(--color-bone)]">
              {message.author}
            </span>
            {message.mention && (
              <span className="rounded-[4px] bg-[var(--color-ash)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-aurora)]">
                @you
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] leading-[1.45] tracking-[-0.01em] text-[var(--color-steam)]">
            {message.preview}
          </p>
        </div>
      </div>
    </article>
  );
}

function InboxMessageList({ source }: { source: InboxSource }) {
  if (source === "gmail") {
    return (
      <div className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
        {GMAIL_MESSAGES.map((message) => (
          <GmailMessageRow key={message.id} message={message} />
        ))}
      </div>
    );
  }

  if (source === "slack") {
    return (
      <div className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
        {SLACK_MESSAGES.map((message) => (
          <SlackMessageRow key={message.id} message={message} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
      {DISCORD_MESSAGES.map((message) => (
        <DiscordMessageRow key={message.id} message={message} />
      ))}
    </div>
  );
}

export function InboxPanel({
  index = 2,
  className,
  expanded = false,
  onToggleExpanded,
}: InboxPanelProps) {
  const [source, setSource] = useState<InboxSource>("gmail");

  return (
    <Surface
      index={index}
      className={cn("flex min-h-0 flex-1 flex-col", className)}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <Label>Inbox</Label>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5">
            {INBOX_SOURCES.map((option) => (
              <SourceButton
                key={option.id}
                source={option}
                selected={source === option.id}
                onSelect={() => setSource(option.id)}
              />
            ))}
          </div>
          {onToggleExpanded ? (
            <button
              type="button"
              onClick={onToggleExpanded}
              aria-label={expanded ? "Show calendar" : "Expand inbox"}
              aria-pressed={expanded}
              className="-translate-y-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-[var(--color-pumice)] transition-colors duration-200 hover:bg-[var(--color-ash)] hover:text-[var(--color-steam)]"
            >
              {expanded ? (
                <ChevronDown size={16} strokeWidth={1.5} />
              ) : (
                <ChevronUp size={16} strokeWidth={1.5} />
              )}
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={source}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease }}
          >
            <InboxMessageList source={source} />
          </motion.div>
        </AnimatePresence>
      </div>
    </Surface>
  );
}
