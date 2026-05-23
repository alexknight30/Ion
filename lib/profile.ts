export interface Profile {
  id: string;
  name: string;
  occupation: string;
  company: string;
  favoriteSong: string;
  createdAt: string;
  updatedAt: string;
}

export type UpdateProfileInput = Partial<
  Pick<Profile, "name" | "occupation" | "company" | "favoriteSong">
>;

export async function fetchProfile(): Promise<Profile> {
  const response = await fetch("/api/profile");
  if (!response.ok) {
    throw new Error("Failed to load profile");
  }
  return response.json();
}

export async function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  const response = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to update profile");
  }

  return response.json();
}
