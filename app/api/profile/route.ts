import { db } from "@/lib/db";
import {
  badRequest,
  json,
  parseJsonBody,
  serverError,
} from "@/lib/api";

const PROFILE_ID = "default";

const PROFILE_FIELDS = [
  "name",
  "occupation",
  "company",
  "favoriteSong",
] as const;

type ProfileField = (typeof PROFILE_FIELDS)[number];

async function getOrCreateProfile() {
  return db.profile.upsert({
    where: { id: PROFILE_ID },
    create: { id: PROFILE_ID },
    update: {},
  });
}

export async function GET() {
  try {
    const profile = await getOrCreateProfile();
    return json(profile);
  } catch {
    return serverError();
  }
}

export async function PATCH(request: Request) {
  const body = await parseJsonBody<Partial<Record<ProfileField, unknown>>>(
    request
  );

  if (body instanceof Response) return body;

  const data: Partial<Record<ProfileField, string>> = {};

  for (const field of PROFILE_FIELDS) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== "string") {
        return badRequest(`"${field}" must be a string`);
      }
      data[field] = body[field];
    }
  }

  if (Object.keys(data).length === 0) {
    return badRequest("No valid fields to update");
  }

  try {
    const profile = await db.profile.upsert({
      where: { id: PROFILE_ID },
      create: { id: PROFILE_ID, ...data },
      update: data,
    });

    return json(profile);
  } catch {
    return serverError();
  }
}
