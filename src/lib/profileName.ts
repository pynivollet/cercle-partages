import type { Database } from "@/integrations/supabase/types";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export function getProfileDisplayName(
  profile: Pick<ProfileRow, "first_name" | "last_name"> | null | undefined,
  defaultName: string = "Sans nom"
): string {
  const first = (profile?.first_name ?? "").trim();
  const last = (profile?.last_name ?? "").trim();
  const full = `${first} ${last}`.trim();
  return full || defaultName;
}

export function getProfileInitials(profile: Pick<ProfileRow, "first_name" | "last_name"> | null | undefined): string {
  const first = (profile?.first_name ?? "").trim();
  const last = (profile?.last_name ?? "").trim();
  const fi = first ? first[0] : "";
  const li = last ? last[0] : "";
  const initials = `${fi}${li}`.toUpperCase();
  return initials || "?";
}
