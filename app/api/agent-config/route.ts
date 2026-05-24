import { db } from "@/lib/db";
import {
  badRequest,
  json,
  parseJsonBody,
  serverError,
} from "@/lib/api";

const AGENT_CONFIG_ID = "default";

const AGENT_CONFIG_FIELDS = ["apiKey", "model"] as const;

type AgentConfigField = (typeof AGENT_CONFIG_FIELDS)[number];

async function getOrCreateAgentConfig() {
  return db.agentConfig.upsert({
    where: { id: AGENT_CONFIG_ID },
    create: { id: AGENT_CONFIG_ID },
    update: {},
  });
}

export async function GET() {
  try {
    const config = await getOrCreateAgentConfig();
    return json(config);
  } catch (error) {
    console.error("[agent-config GET]", error);
    return serverError();
  }
}

export async function PATCH(request: Request) {
  const body = await parseJsonBody<
    Partial<Record<AgentConfigField, unknown>>
  >(request);

  if (body instanceof Response) return body;

  const data: { apiKey?: string | null; model?: string } = {};

  for (const field of AGENT_CONFIG_FIELDS) {
    if (body[field] === undefined) continue;

    if (field === "apiKey") {
      if (body.apiKey !== null && typeof body.apiKey !== "string") {
        return badRequest('"apiKey" must be a string or null');
      }
      data.apiKey =
        typeof body.apiKey === "string" && body.apiKey.trim().length > 0
          ? body.apiKey.trim()
          : null;
      continue;
    }

    if (typeof body[field] !== "string" || !body[field].trim()) {
      return badRequest(`"${field}" must be a non-empty string`);
    }
    data.model = body[field].trim();
  }

  if (Object.keys(data).length === 0) {
    return badRequest("No valid fields to update");
  }

  try {
    const config = await db.agentConfig.upsert({
      where: { id: AGENT_CONFIG_ID },
      create: { id: AGENT_CONFIG_ID, ...data },
      update: data,
    });

    return json(config);
  } catch (error) {
    console.error("[agent-config PATCH]", error);
    return serverError();
  }
}
