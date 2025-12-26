import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];

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

export const getAllProfiles = async (): Promise<{ data: Profile[] | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
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

export const createPresenterProfile = async (profile: {
  first_name: string;
  last_name: string;
  bio?: string;
  professional_background?: string;
  avatar_url?: string;
  email: string;
  user_id?: string;
}): Promise<{ data: Profile | null; error: Error | null }> => {
  // Generate a placeholder user_id if not provided (for standalone presenter profiles)
  const userId = profile.user_id || crypto.randomUUID();
  
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      first_name: profile.first_name,
      last_name: profile.last_name,
      bio: profile.bio || null,
      professional_background: profile.professional_background || null,
      avatar_url: profile.avatar_url || null,
      email: profile.email,
      user_id: userId,
      is_presenter: true,
    })
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
