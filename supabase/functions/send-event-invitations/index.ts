import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendInvitationsRequest {
  eventId: string;
  userIds: string[];
  sendToAll: boolean;
}

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Cercle Partages <contact@cerclepartages.org>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the calling user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      return new Response(JSON.stringify({ error: "Unauthorized - Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { eventId, userIds, sendToAll }: SendInvitationsRequest = await req.json();

    if (!eventId) {
      return new Response(JSON.stringify({ error: "Event ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get event details
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      console.error("Error fetching event:", eventError);
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get users to send invitations to
    let usersToNotify: { id: string; email: string; first_name: string | null }[] = [];

    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error("Error fetching users:", authError);
      return new Response(JSON.stringify({ error: "Failed to fetch users" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, first_name");
    const profileMap = new Map(profiles?.map(p => [p.id, p.first_name]) || []);

    if (sendToAll) {
      usersToNotify = authUsers.users.map(u => ({
        id: u.id,
        email: u.email!,
        first_name: profileMap.get(u.id) || null,
      }));
    } else {
      usersToNotify = authUsers.users
        .filter(u => userIds.includes(u.id))
        .map(u => ({
          id: u.id,
          email: u.email!,
          first_name: profileMap.get(u.id) || null,
        }));
    }

    if (usersToNotify.length === 0) {
      return new Response(JSON.stringify({ error: "No users to notify" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format event date
    const eventDate = new Date(event.event_date);
    const formattedDate = eventDate.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const formattedTime = eventDate.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Send emails
    const emailPromises = usersToNotify.map(async (recipient) => {
      const greeting = recipient.first_name ? `Bonjour ${recipient.first_name},` : "Bonjour,";
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Georgia, 'Times New Roman', serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="border-bottom: 1px solid #e5e5e5; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="font-size: 24px; font-weight: normal; margin: 0;">Cercle Partages</h1>
          </div>
          
          <p style="margin-bottom: 20px;">${greeting}</p>
          
          <p style="margin-bottom: 20px;">Nous avons le plaisir de vous inviter à notre prochaine rencontre :</p>
          
          <div style="background-color: #f8f7f4; padding: 25px; margin-bottom: 30px;">
            <h2 style="font-size: 20px; font-weight: normal; margin: 0 0 15px 0; color: #1a1a1a;">${event.title}</h2>
            <p style="margin: 5px 0; color: #666;">📅 ${formattedDate} à ${formattedTime}</p>
            ${event.location ? `<p style="margin: 5px 0; color: #666;">📍 ${event.location}</p>` : ''}
            ${event.description ? `<p style="margin: 15px 0 0 0; font-style: italic; color: #444;">${event.description}</p>` : ''}
          </div>
          
          <p style="margin-bottom: 20px;">
            <a href="https://cerclepartages.org/evenements/${event.id}" 
               style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 14px;">
              S'inscrire à la rencontre
            </a>
          </p>
          
          <p style="margin-bottom: 20px;">Les places étant limitées, nous vous invitons à vous inscrire dès que possible.</p>
          
          <p style="margin-bottom: 10px;">À très bientôt,</p>
          <p style="margin: 0;">L'équipe du Cercle Partages</p>
          
          <div style="border-top: 1px solid #e5e5e5; margin-top: 40px; padding-top: 20px; font-size: 12px; color: #888;">
            <p style="margin: 0;">Cet email vous a été envoyé car vous êtes membre du Cercle Partages.</p>
          </div>
        </body>
        </html>
      `;

      try {
        await sendEmail(recipient.email, `Nouvelle rencontre : ${event.title}`, html);
        return { email: recipient.email, success: true };
      } catch (err) {
        console.error(`Error sending email to ${recipient.email}:`, err);
        return { email: recipient.email, success: false, error: String(err) };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Sent ${successCount} emails successfully, ${failCount} failed`);

    // Update event status to published
    const { error: updateError } = await supabaseAdmin
      .from("events")
      .update({ status: "published" })
      .eq("id", eventId);

    if (updateError) {
      console.error("Error updating event status:", updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount,
        results 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-event-invitations function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
