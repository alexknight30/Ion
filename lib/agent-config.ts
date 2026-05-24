export interface AgentConfig {
  id: string;
  apiKey: string | null;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export type UpdateAgentConfigInput = Partial<
  Pick<AgentConfig, "apiKey" | "model">
>;

export async function fetchAgentConfig(): Promise<AgentConfig> {
  const response = await fetch("/api/agent-config");
  if (!response.ok) {
    throw new Error("Failed to load agent config");
  }
  return response.json();
}

export async function updateAgentConfig(
  input: UpdateAgentConfigInput
): Promise<AgentConfig> {
  const response = await fetch("/api/agent-config", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to update agent config");
  }

  return response.json();
}
