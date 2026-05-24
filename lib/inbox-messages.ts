import { toDateKey, type CalendarDate } from "@/lib/calendar";

export type InboxSource = "gmail" | "slack" | "discord";

export interface GmailMessage {
  id: string;
  dateKey: string;
  from: string;
  subject: string;
  preview: string;
  body: string;
  time: string;
  unread?: boolean;
}

export interface ChatMessage {
  id: string;
  dateKey: string;
  channel: string;
  author: string;
  avatarColor: string;
  preview: string;
  body: string;
  time: string;
  mention?: boolean;
}

export const MOCK_INBOX_DATE_KEY = "2026-05-23";

export const GMAIL_MESSAGES: GmailMessage[] = [
  {
    id: "gmail-1",
    dateKey: MOCK_INBOX_DATE_KEY,
    from: "Sarah Chen",
    subject: "Q2 roadmap review",
    preview:
      "Hi Alex — wanted to follow up on the design review notes. Can you share the updated timeline before Friday?",
    body: "Hi Alex — wanted to follow up on the design review notes. Can you share the updated timeline before Friday?\n\nWe are trying to lock the Q2 scope by end of week and your input on the inbox + calendar flow would help a lot.\n\nThanks,\nSarah",
    time: "10:42 AM",
    unread: true,
  },
  {
    id: "gmail-2",
    dateKey: MOCK_INBOX_DATE_KEY,
    from: "Linear",
    subject: "ION-142 assigned to you",
    preview:
      "Jamie assigned you a new issue: Inbox integration wiring for Gmail OAuth.",
    body: "Jamie assigned you a new issue: Inbox integration wiring for Gmail OAuth.\n\nPriority: Medium\nProject: Ion\n\nView issue in Linear to see full details and acceptance criteria.",
    time: "9:15 AM",
    unread: true,
  },
  {
    id: "gmail-3",
    dateKey: MOCK_INBOX_DATE_KEY,
    from: "Notion Team",
    subject: "Your weekly digest",
    preview:
      "3 pages updated in Ion Workspace, including Product Specs and Meeting Notes.",
    body: "Here's what changed in Ion Workspace this week:\n\n• Product Specs — updated inbox requirements\n• Meeting Notes — May 22 sync\n• Design System — color token tweaks\n\nOpen Notion to catch up on everything else.",
    time: "8:02 AM",
  },
];

export const SLACK_MESSAGES: ChatMessage[] = [
  {
    id: "slack-1",
    dateKey: MOCK_INBOX_DATE_KEY,
    channel: "product",
    author: "Jamie",
    avatarColor: "#0071e3",
    preview:
      "Shipped the calendar view. Take a look when you get a chance — left a few comments on spacing.",
    body: "Shipped the calendar view. Take a look when you get a chance — left a few comments on spacing.",
    time: "11:03 AM",
  },
  {
    id: "slack-2",
    dateKey: MOCK_INBOX_DATE_KEY,
    channel: "ion",
    author: "Dev Bot",
    avatarColor: "#34c759",
    preview: "Build passed on main · 3 checks succeeded",
    body: "Build passed on main · 3 checks succeeded",
    time: "10:18 AM",
  },
  {
    id: "slack-3",
    dateKey: MOCK_INBOX_DATE_KEY,
    channel: "design",
    author: "Morgan",
    avatarColor: "#5856d6",
    preview: "Updated the inbox mocks in Figma. Thread has the latest comps.",
    body: "Updated the inbox mocks in Figma. Thread has the latest comps.",
    time: "9:47 AM",
  },
];

export const DISCORD_MESSAGES: ChatMessage[] = [
  {
    id: "discord-1",
    dateKey: MOCK_INBOX_DATE_KEY,
    channel: "general",
    author: "alex",
    avatarColor: "#5865f2",
    preview: "Anyone free for a quick sync at 3? Need eyes on the inbox layout.",
    body: "Anyone free for a quick sync at 3? Need eyes on the inbox layout.",
    time: "12:24 PM",
    mention: true,
  },
  {
    id: "discord-2",
    dateKey: MOCK_INBOX_DATE_KEY,
    channel: "dev",
    author: "Morgan",
    avatarColor: "#eb459e",
    preview: "Pushed the integration selector UI to staging. LMK if the logos feel too small.",
    body: "Pushed the integration selector UI to staging. LMK if the logos feel too small.",
    time: "11:51 AM",
  },
  {
    id: "discord-3",
    dateKey: MOCK_INBOX_DATE_KEY,
    channel: "feedback",
    author: "Sarah",
    avatarColor: "#faa61a",
    preview: "Love the unified inbox direction. Gmail thread view would be huge next.",
    body: "Love the unified inbox direction. Gmail thread view would be huge next.",
    time: "11:12 AM",
  },
];

export function getMessagesForDate<T extends { dateKey: string }>(
  messages: T[],
  date: CalendarDate
) {
  const dateKey = toDateKey(date);
  return messages.filter((message) => message.dateKey === dateKey);
}
