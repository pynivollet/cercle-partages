import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user client to verify caller
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: "Unauthorized - Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all users from auth.users
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return new Response(JSON.stringify({ error: "Failed to fetch users" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all user roles
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
    }

    // Get all profiles (for is_presenter flag)
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, is_presenter");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
    }

    // Build user list with roles and status
    const userList = users.map((u) => {
      const userRoles = roles?.filter(r => r.user_id === u.id).map(r => r.role) || [];
      const profile = profiles?.find(p => p.id === u.id);
      
      return {
        id: u.id,
        email: u.email,
        first_name: profile?.first_name || u.user_metadata?.first_name || null,
        last_name: profile?.last_name || u.user_metadata?.last_name || null,
        roles: userRoles,
        is_presenter: profile?.is_presenter || false,
        invitation_accepted: !!u.email_confirmed_at,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      };
    });

    return new Response(JSON.stringify({ users: userList }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in get-users function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
