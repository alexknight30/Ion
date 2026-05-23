"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { fieldLabelClassName, inputClassName } from "@/lib/form-styles";
import { SettingsSection } from "./SettingsSection";
import { SecretInput } from "./SecretInput";

const ANTHROPIC_MODELS = [
  { id: "claude-opus-4-6", label: "Claude Opus 4.6" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "claude-sonnet-4", label: "Claude Sonnet 4" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
] as const;

type AnthropicModelId = (typeof ANTHROPIC_MODELS)[number]["id"];

export function AgentPanel() {
  const [model, setModel] = useState<AnthropicModelId>(ANTHROPIC_MODELS[1].id);
  const [apiKey, setApiKey] = useState("");
  const [adminApiKey, setAdminApiKey] = useState("");

  return (
    <SettingsSection label="Agent" index={1}>
      <div className="flex flex-col gap-5">
        <div>
          <label htmlFor="agent-model" className={fieldLabelClassName}>
            Model
          </label>
          <div className="relative">
            <select
              id="agent-model"
              value={model}
              onChange={(event) =>
                setModel(event.target.value as AnthropicModelId)
              }
              className={cn(
                inputClassName,
                "appearance-none pr-10"
              )}
            >
              {ANTHROPIC_MODELS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              strokeWidth={1.5}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-pumice)]"
              aria-hidden
            />
          </div>
        </div>

        <SecretInput
          id="agent-api-key"
          label="API key"
          value={apiKey}
          onChange={setApiKey}
          placeholder="sk-ant-..."
        />

        <SecretInput
          id="agent-admin-api-key"
          label="Admin API key"
          value={adminApiKey}
          onChange={setAdminApiKey}
          placeholder="sk-ant-admin-..."
          optional
        />
      </div>
    </SettingsSection>
  );
}
