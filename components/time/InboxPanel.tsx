"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Surface } from "@/components/ui/Surface";
import { Label } from "@/components/ui/Label";
import { SmartTextarea } from "@/components/ui/SmartTextarea";
import { cn } from "@/lib/cn";
import {
  CALENDAR_PANEL_HEIGHT_CLASS,
  formatInboxDayNav,
  shiftDay,
  toDateKey,
  type CalendarDate,
} from "@/lib/calendar";
import {
  DISCORD_MESSAGES,
  GMAIL_MESSAGES,
  SLACK_MESSAGES,
  type ChatMessage,
  type GmailMessage,
  type InboxSource,
} from "@/lib/inbox-messages";

interface InboxSourceOption {
  id: InboxSource;
  name: string;
  logo: string;
}

const INBOX_SOURCES: InboxSourceOption[] = [
  { id: "gmail", name: "Gmail", logo: "/integrations/gmail.svg" },
  { id: "slack", name: "Slack", logo: "/integrations/slack.svg" },
  { id: "discord", name: "Discord", logo: "/integrations/discord.svg" },
];

const ease = [0.16, 1, 0.3, 1] as const;

interface InboxPanelProps {
  index?: number;
  className?: string;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  selectedDate?: CalendarDate;
  onSelectDate?: (date: CalendarDate) => void;
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

function GmailMessageRow({
  message,
  onSelect,
}: {
  message: GmailMessage;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full gap-3 py-3.5 text-left transition-colors duration-200 hover:bg-[var(--color-ash)]/40"
    >
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
    </button>
  );
}

function SlackMessageRow({
  message,
  onSelect,
}: {
  message: ChatMessage;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full py-3.5 text-left transition-colors duration-200 hover:bg-[var(--color-ash)]/40"
    >
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
          <p className="mt-1 line-clamp-2 text-[13px] leading-[1.45] tracking-[-0.01em] text-[var(--color-steam)]">
            {message.preview}
          </p>
        </div>
      </div>
    </button>
  );
}

function DiscordMessageRow({
  message,
  onSelect,
}: {
  message: ChatMessage;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full py-3.5 text-left transition-colors duration-200 hover:bg-[var(--color-ash)]/40"
    >
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
          <p className="mt-1 line-clamp-2 text-[13px] leading-[1.45] tracking-[-0.01em] text-[var(--color-steam)]">
            {message.preview}
          </p>
        </div>
      </div>
    </button>
  );
}

function EmptyInboxState() {
  return (
    <div className="flex flex-1 items-center justify-center py-8">
      <span className="text-[13px] text-[var(--color-pumice)]">
        No messages for this day
      </span>
    </div>
  );
}

function GmailThreadView({
  message,
  reply,
  onReplyChange,
  onBack,
}: {
  message: GmailMessage;
  reply: string;
  onReplyChange: (value: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 flex shrink-0 items-center gap-1.5 text-[13px] tracking-[-0.01em] text-[var(--color-steam)] transition-colors duration-200 hover:text-[var(--color-bone)]"
      >
        <ArrowLeft size={14} strokeWidth={1.5} />
        Back
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <h3 className="text-[15px] font-medium tracking-[-0.02em] text-[var(--color-bone)]">
          {message.subject}
        </h3>
        <div className="mt-3 flex items-baseline justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-3">
          <span className="truncate text-[14px] tracking-[-0.01em] text-[var(--color-bone)]">
            {message.from}
          </span>
          <span className="shrink-0 font-mono text-[11px] text-[var(--color-pumice)]">
            {message.time}
          </span>
        </div>
        <p className="whitespace-pre-wrap py-4 text-[14px] leading-[1.6] tracking-[-0.01em] text-[var(--color-steam)]">
          {message.body}
        </p>
      </div>

      <div className="mt-3 shrink-0 rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-obsidian)] p-3">
        <span className="mb-2 block text-[12px] font-medium tracking-[-0.01em] text-[var(--color-pumice)]">
          Reply to {message.from}
        </span>
        <SmartTextarea
          value={reply}
          onChange={onReplyChange}
          placeholder="Write a reply…"
          rows={4}
          className="w-full resize-none bg-transparent text-[14px] leading-[1.6] tracking-[-0.01em] text-[var(--color-bone)] outline-none placeholder:text-[var(--color-pumice)]"
        />
      </div>
    </div>
  );
}

function ChatThreadView({
  message,
  reply,
  onReplyChange,
  onBack,
  sourceLabel,
}: {
  message: ChatMessage;
  reply: string;
  onReplyChange: (value: string) => void;
  onBack: () => void;
  sourceLabel: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 flex shrink-0 items-center gap-1.5 text-[13px] tracking-[-0.01em] text-[var(--color-steam)] transition-colors duration-200 hover:text-[var(--color-bone)]"
      >
        <ArrowLeft size={14} strokeWidth={1.5} />
        Back
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="mb-3 text-[12px] tracking-[-0.01em] text-[var(--color-pumice)]">
          {sourceLabel} · #{message.channel}
        </div>
        <div className="flex gap-3 border-b border-[var(--color-border-subtle)] pb-4">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[12px] font-medium text-white"
            style={{ backgroundColor: message.avatarColor }}
          >
            {message.author.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[14px] font-medium tracking-[-0.01em] text-[var(--color-bone)]">
                {message.author}
              </span>
              <span className="shrink-0 font-mono text-[11px] text-[var(--color-pumice)]">
                {message.time}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-[14px] leading-[1.6] tracking-[-0.01em] text-[var(--color-steam)]">
              {message.body}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 shrink-0 rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-obsidian)] p-3">
        <SmartTextarea
          value={reply}
          onChange={onReplyChange}
          placeholder="Write a reply…"
          rows={3}
          className="w-full resize-none bg-transparent text-[14px] leading-[1.6] tracking-[-0.01em] text-[var(--color-bone)] outline-none placeholder:text-[var(--color-pumice)]"
        />
      </div>
    </div>
  );
}

function InboxMessageList({
  source,
  dateKey,
  onSelectGmail,
  onSelectChat,
}: {
  source: InboxSource;
  dateKey: string;
  onSelectGmail: (message: GmailMessage) => void;
  onSelectChat: (message: ChatMessage) => void;
}) {
  if (source === "gmail") {
    const messages = GMAIL_MESSAGES.filter((message) => message.dateKey === dateKey);
    if (messages.length === 0) return <EmptyInboxState />;

    return (
      <div className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
        {messages.map((message) => (
          <GmailMessageRow
            key={message.id}
            message={message}
            onSelect={() => onSelectGmail(message)}
          />
        ))}
      </div>
    );
  }

  if (source === "slack") {
    const messages = SLACK_MESSAGES.filter((message) => message.dateKey === dateKey);
    if (messages.length === 0) return <EmptyInboxState />;

    return (
      <div className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
        {messages.map((message) => (
          <SlackMessageRow
            key={message.id}
            message={message}
            onSelect={() => onSelectChat(message)}
          />
        ))}
      </div>
    );
  }

  const messages = DISCORD_MESSAGES.filter((message) => message.dateKey === dateKey);
  if (messages.length === 0) return <EmptyInboxState />;

  return (
    <div className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
      {messages.map((message) => (
        <DiscordMessageRow
          key={message.id}
          message={message}
          onSelect={() => onSelectChat(message)}
        />
      ))}
    </div>
  );
}

export function InboxPanel({
  index = 2,
  className,
  expanded = false,
  onToggleExpanded,
  selectedDate,
  onSelectDate,
}: InboxPanelProps) {
  const [source, setSource] = useState<InboxSource>("gmail");
  const [selectedGmailId, setSelectedGmailId] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const showDayNav = expanded && selectedDate && onSelectDate;
  const dateKey = selectedDate ? toDateKey(selectedDate) : "";

  const selectedGmail = selectedGmailId
    ? GMAIL_MESSAGES.find((message) => message.id === selectedGmailId) ?? null
    : null;
  const selectedChat = selectedChatId
    ? [...SLACK_MESSAGES, ...DISCORD_MESSAGES].find(
        (message) => message.id === selectedChatId
      ) ?? null
    : null;

  useEffect(() => {
    setSelectedGmailId(null);
    setSelectedChatId(null);
    setReplyDraft("");
  }, [source, dateKey]);

  function handleBack() {
    setSelectedGmailId(null);
    setSelectedChatId(null);
    setReplyDraft("");
  }

  return (
    <Surface
      index={index}
      className={cn(
        "flex min-h-0 flex-col",
        expanded ? cn("shrink-0", CALENDAR_PANEL_HEIGHT_CLASS) : "flex-1",
        className
      )}
    >
      <div className="mb-4 flex items-center gap-3">
        <Label className="shrink-0">Inbox</Label>

        {showDayNav ? (
          <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => onSelectDate(shiftDay(selectedDate, -1))}
              aria-label="Previous day"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-[var(--color-pumice)] transition-colors duration-200 hover:bg-[var(--color-ash)] hover:text-[var(--color-bone)]"
            >
              <ChevronLeft size={14} strokeWidth={1.5} />
            </button>
            <span className="min-w-0 truncate text-[13px] font-medium tracking-[-0.01em] text-[var(--color-bone)]">
              {formatInboxDayNav(selectedDate)}
            </span>
            <button
              type="button"
              onClick={() => onSelectDate(shiftDay(selectedDate, 1))}
              aria-label="Next day"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-[var(--color-pumice)] transition-colors duration-200 hover:bg-[var(--color-ash)] hover:text-[var(--color-bone)]"
            >
              <ChevronRight size={14} strokeWidth={1.5} />
            </button>
          </div>
        ) : (
          <div className="min-w-0 flex-1" />
        )}

        <div className="flex shrink-0 items-center gap-1">
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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {selectedGmail && source === "gmail" ? (
          <GmailThreadView
            message={selectedGmail}
            reply={replyDraft}
            onReplyChange={setReplyDraft}
            onBack={handleBack}
          />
        ) : selectedChat && source !== "gmail" ? (
          <ChatThreadView
            message={selectedChat}
            reply={replyDraft}
            onReplyChange={setReplyDraft}
            onBack={handleBack}
            sourceLabel={source === "slack" ? "Slack" : "Discord"}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto pr-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${source}-${dateKey}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease }}
              >
                <InboxMessageList
                  source={source}
                  dateKey={dateKey}
                  onSelectGmail={(message) => setSelectedGmailId(message.id)}
                  onSelectChat={(message) => setSelectedChatId(message.id)}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </Surface>
  );
}
