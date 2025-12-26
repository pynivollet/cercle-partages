import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export const getProfileById = async (id: string): Promise<{ data: Profile | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  return { data, error };
};

export const getProfileByUserId = async (userId: string): Promise<{ data: Profile | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  return { data, error };
};

export const getPresenters = async (): Promise<{ data: Profile[] | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_presenter", true)
    .order("last_name", { ascending: true });

  return { data, error };
};

export const updateProfile = async (id: string, updates: ProfileUpdate): Promise<{ data: Profile | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  return { data, error };
};
