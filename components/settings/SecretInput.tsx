"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { fieldLabelClassName, inputClassName } from "@/lib/form-styles";

interface SecretInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  optional?: boolean;
}

function preventClipboard(event: React.ClipboardEvent<HTMLInputElement>) {
  event.preventDefault();
}

export function SecretInput({
  id,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  optional = false,
}: SecretInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className={fieldLabelClassName}>
        {label}
        {optional ? (
          <span className="font-normal text-[var(--color-pumice)]"> (optional)</span>
        ) : null}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          onCopy={preventClipboard}
          onCut={preventClipboard}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          data-1p-ignore
          data-lpignore="true"
          className={cn(
            inputClassName,
            "pr-10 select-none",
            visible && "font-mono text-[13px]"
          )}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide secret" : "Show secret"}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[6px] text-[var(--color-pumice)] transition-colors duration-200 hover:bg-[var(--color-ash)] hover:text-[var(--color-steam)]"
        >
          {visible ? (
            <EyeOff size={16} strokeWidth={1.5} />
          ) : (
            <Eye size={16} strokeWidth={1.5} />
          )}
        </button>
      </div>
    </div>
  );
}
