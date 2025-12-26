import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Presentation = Database["public"]["Tables"]["presentations"]["Row"];

export interface PresentationWithPresenter extends Presentation {
  presenter?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    bio: string | null;
    professional_background: string | null;
    avatar_url: string | null;
  } | null;
}

export const getPresentations = async (): Promise<{ data: PresentationWithPresenter[] | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from("presentations")
    .select(`
      *,
      presenter:profiles!presentations_presenter_id_fkey(
        id,
        first_name,
        last_name,
        bio,
        professional_background,
        avatar_url
      )
    `)
    .order("presentation_date", { ascending: false });

  return { data, error };
};

export const getPresentationById = async (id: string): Promise<{ data: PresentationWithPresenter | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from("presentations")
    .select(`
      *,
      presenter:profiles!presentations_presenter_id_fkey(
        id,
        first_name,
        last_name,
        bio,
        professional_background,
        avatar_url
      )
    `)
    .eq("id", id)
    .single();

  return { data, error };
};

export const getPresentationsByPresenter = async (presenterId: string): Promise<{ data: Presentation[] | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from("presentations")
    .select("*")
    .eq("presenter_id", presenterId)
    .order("presentation_date", { ascending: false });

  return { data, error };
};
