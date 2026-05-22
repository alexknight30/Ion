import { NextResponse } from "next/server";

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function badRequest(message: string) {
  return json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found") {
  return json({ error: message }, { status: 404 });
}

export function serverError(message = "Internal server error") {
  return json({ error: message }, { status: 500 });
}

export async function parseJsonBody<T extends Record<string, unknown>>(
  request: Request
): Promise<T | NextResponse> {
  try {
    return (await request.json()) as T;
  } catch {
    return badRequest("Invalid JSON body");
  }
}

export function requireString(
  value: unknown,
  field: string
): string | NextResponse {
  if (typeof value !== "string" || !value.trim()) {
    return badRequest(`"${field}" is required`);
  }
  return value.trim();
}

export function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
