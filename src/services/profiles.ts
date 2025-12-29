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

export const getPresenters = async (): Promise<{ data: Profile[] | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_presenter", true)
    .order("full_name", { ascending: true });

  return { data, error };
};

export const getAllProfiles = async (): Promise<{ data: Profile[] | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

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

export const uploadPresenterAvatar = async (file: File, presenterId: string): Promise<{ url: string | null; error: Error | null }> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${presenterId}.${fileExt}`;
  const filePath = `presenters/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    return { url: null, error: uploadError };
  }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return { url: publicUrl, error: null };
};

export const deletePresenter = async (presenterId: string): Promise<{ error: Error | null }> => {
  // Remove is_presenter flag (soft delete - keeps profile data)
  const { error } = await supabase
    .from("profiles")
    .update({ is_presenter: false })
    .eq("id", presenterId);

  return { error };
};
