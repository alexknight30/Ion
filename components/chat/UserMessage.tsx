"use client";

interface UserMessageProps {
  content: string;
  className?: string;
}

export function UserMessage({ content, className }: UserMessageProps) {
  return (
    <div className={className ?? "flex justify-end"}>
      <div className="max-w-[85%] rounded-[18px] bg-[var(--color-ash)] px-4 py-3 text-[15px] leading-[1.6] tracking-[-0.01em] text-[var(--color-bone)]">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
