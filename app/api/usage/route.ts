import { getUsageStats } from "@/lib/usage-server";
import { json, serverError } from "@/lib/api";

export async function GET() {
  try {
    const stats = await getUsageStats();
    return json(stats);
  } catch (error) {
    console.error("[usage GET]", error);
    return serverError();
  }
}
