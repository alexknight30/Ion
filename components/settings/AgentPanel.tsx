"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { fieldLabelClassName, inputClassName } from "@/lib/form-styles";
import {
  fetchAgentConfig,
  updateAgentConfig,
  type AgentConfig,
} from "@/lib/agent-config";
import { SettingsSection } from "./SettingsSection";
import { SecretInput } from "./SecretInput";

const ANTHROPIC_MODELS = [
  { id: "claude-opus-4-6", label: "Claude Opus 4.6" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { id: "claude-sonnet-4", label: "Claude Sonnet 4 (alias)" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
] as const;

function getAgentValues(config: AgentConfig) {
  return {
    model: config.model,
    apiKey: config.apiKey ?? "",
  };
}

export function AgentPanel() {
  const [model, setModel] = useState<string>(ANTHROPIC_MODELS[1].id);
  const [apiKey, setApiKey] = useState("");
  const [adminApiKey, setAdminApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchAgentConfig()
      .then((config) => {
        if (cancelled) return;
        const values = getAgentValues(config);
        setModel(values.model);
        setApiKey(values.apiKey);
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setError(
          "Could not load agent settings. Restart the dev server if you recently updated the database."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const persistConfig = useCallback(
    async (next: { model?: string; apiKey?: string }) => {
      setSaving(true);
      setError(null);

      try {
        const config = await updateAgentConfig({
          ...(next.model !== undefined ? { model: next.model } : {}),
          ...(next.apiKey !== undefined ? { apiKey: next.apiKey || null } : {}),
        });
        const values = getAgentValues(config);
        setModel(values.model);
        setApiKey(values.apiKey);
      } catch {
        setError("Could not save changes.");
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const scheduleSave = useCallback(
    (next: { model?: string; apiKey?: string }) => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }

      saveTimeout.current = setTimeout(() => {
        void persistConfig(next);
      }, 500);
    },
    [persistConfig]
  );

  const handleModelChange = (value: string) => {
    setModel(value);
    scheduleSave({ model: value });
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    scheduleSave({ apiKey: value });
  };

  const handleApiKeyBlur = (value: string) => {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }

    void persistConfig({ apiKey: value });
  };

  return (
    <SettingsSection
      label="Agent"
      index={1}
      status={saving ? "Saving…" : undefined}
    >
      {error ? (
        <p className="mb-4 text-[13px] text-[var(--color-ember)]">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-[13px] text-[var(--color-pumice)]">Loading…</p>
      ) : (
        <div className="flex flex-col gap-5">
          <div>
            <label htmlFor="agent-model" className={fieldLabelClassName}>
              Model
            </label>
            <div className="relative">
              <select
                id="agent-model"
                value={model}
                onChange={(event) => handleModelChange(event.target.value)}
                className={cn(inputClassName, "appearance-none pr-10")}
              >
                {ANTHROPIC_MODELS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
                {!ANTHROPIC_MODELS.some((option) => option.id === model) ? (
                  <option value={model}>{model}</option>
                ) : null}
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
            onChange={handleApiKeyChange}
            onBlur={(event) => handleApiKeyBlur(event.target.value)}
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
      )}
    </SettingsSection>
  );
}
