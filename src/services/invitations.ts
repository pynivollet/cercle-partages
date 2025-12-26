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
  // Use the secure RPC function instead of direct table access
  const { data, error } = await supabase
    .rpc("validate_invitation_token", { invitation_token: token });

  if (error || !data || data.length === 0) {
    return { valid: false, error: "Invalid invitation code" };
  }

  const invitation = data[0];
  
  // The RPC function already filters for pending and non-expired invitations
  // So if we get a result, it's valid
  return { 
    valid: true, 
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expires_at: invitation.expires_at,
      // These fields are not returned by the RPC for security, set defaults
      token: token,
      created_by: null,
      used_by: null,
      used_at: null,
      created_at: invitation.expires_at, // Not available, use expires_at as placeholder
    } as Invitation
  };
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
  // Use VITE_APP_URL if set, otherwise fallback to window.location.origin
  // This ensures links work correctly when generated from the Lovable editor
  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  return `${baseUrl}/connexion?invitation=${token}`;
};
