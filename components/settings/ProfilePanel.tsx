"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchProfile,
  updateProfile,
  type Profile,
  type UpdateProfileInput,
} from "@/lib/profile";
import { fieldLabelClassName, inputClassName } from "@/lib/form-styles";
import { SmartInput } from "@/components/ui/SmartTextarea";
import { SettingsSection } from "./SettingsSection";

const PROFILE_FIELDS = [
  { key: "name", label: "Name", placeholder: "Your name" },
  { key: "occupation", label: "Occupation", placeholder: "What you do" },
  { key: "company", label: "Company", placeholder: "Where you work" },
  { key: "favoriteSong", label: "Favorite song", placeholder: "Track or artist" },
] as const;

type ProfileFieldKey = (typeof PROFILE_FIELDS)[number]["key"];

function getProfileValues(profile: Profile) {
  return {
    name: profile.name,
    occupation: profile.occupation,
    company: profile.company,
    favoriteSong: profile.favoriteSong,
  };
}

export function ProfilePanel() {
  const [values, setValues] = useState<Record<ProfileFieldKey, string>>({
    name: "",
    occupation: "",
    company: "",
    favoriteSong: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchProfile()
      .then((profile) => {
        setValues(getProfileValues(profile));
      })
      .catch(() => {
        setError("Could not load profile.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, []);

  const persistField = useCallback(
    async (field: ProfileFieldKey, value: string) => {
      setSaving(true);
      setError(null);

      try {
        const update: UpdateProfileInput = { [field]: value };
        const profile = await updateProfile(update);
        setValues(getProfileValues(profile));
      } catch {
        setError("Could not save changes.");
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const handleChange = (field: ProfileFieldKey, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));

    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }

    saveTimeout.current = setTimeout(() => {
      void persistField(field, value);
    }, 500);
  };

  const handleBlur = (field: ProfileFieldKey, value: string) => {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }

    void persistField(field, value);
  };

  return (
    <SettingsSection
      label="Profile"
      index={0}
      status={saving ? "Saving…" : undefined}
    >
      {error ? (
        <p className="mb-4 text-[13px] text-[var(--color-ember)]">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-[13px] text-[var(--color-pumice)]">Loading…</p>
      ) : (
        <div className="flex flex-col gap-5">
          {PROFILE_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label htmlFor={`profile-${key}`} className={fieldLabelClassName}>
                {label}
              </label>
              <SmartInput
                id={`profile-${key}`}
                type="text"
                value={values[key]}
                onChange={(value) => handleChange(key, value)}
                onBlur={(event) => handleBlur(key, event.target.value)}
                placeholder={placeholder}
                className={inputClassName}
              />
            </div>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}
