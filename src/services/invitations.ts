import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Invitation = Database["public"]["Tables"]["invitations"]["Row"];
type InvitationInsert = Database["public"]["Tables"]["invitations"]["Insert"];

export interface ValidateInvitationResult {
  valid: boolean;
  invitation?: Invitation;
  error?: string;
}

export const validateInvitationToken = async (token: string): Promise<ValidateInvitationResult> => {
  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !data) {
    return { valid: false, error: "Invalid invitation code" };
  }

  if (data.status === "used") {
    return { valid: false, error: "This invitation has already been used" };
  }

  if (data.status === "expired" || new Date(data.expires_at) < new Date()) {
    return { valid: false, error: "This invitation has expired" };
  }

  return { valid: true, invitation: data };
};

export const createInvitation = async (
  email: string | null,
  role: Database["public"]["Enums"]["app_role"],
  createdBy: string
): Promise<{ data: Invitation | null; error: Error | null }> => {
  const insertData: InvitationInsert = {
    email,
    role,
    created_by: createdBy,
  };

  const { data, error } = await supabase
    .from("invitations")
    .insert(insertData)
    .select()
    .single();

  return { data, error };
};

export const getInvitations = async () => {
  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .order("created_at", { ascending: false });

  return { data, error };
};

export const generateInvitationLink = (token: string): string => {
  return `${window.location.origin}/connexion?invitation=${token}`;
};
