import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendReminderRequest {
  eventId: string;
  userIds: string[];
  recipientType: "all" | "registered" | "not_registered" | "specific";
  customMessage: string;
  subject?: string;
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

    const { eventId, userIds, recipientType, customMessage, subject }: SendReminderRequest = await req.json();

    console.log("Received reminder request:", { eventId, recipientType, userIdsCount: userIds?.length });

    if (!eventId) {
      return new Response(JSON.stringify({ error: "Event ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!customMessage || customMessage.trim() === "") {
      return new Response(JSON.stringify({ error: "Custom message is required" }), {
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

    // Get all registered user IDs for this event
    const { data: registrations, error: regError } = await supabaseAdmin
      .from("event_registrations")
      .select("user_id")
      .eq("event_id", eventId)
      .eq("status", "confirmed");

    if (regError) {
      console.error("Error fetching registrations:", regError);
    }

    const registeredUserIds = new Set(registrations?.map(r => r.user_id) || []);
    console.log("Registered users count:", registeredUserIds.size);

    // Get all users
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

    // Filter users based on recipient type
    let usersToNotify: { id: string; email: string; first_name: string | null }[] = [];

    const allUsers = authUsers.users
      .filter(u => u.email_confirmed_at) // Only users who accepted invitation
      .map(u => ({
        id: u.id,
        email: u.email!,
        first_name: profileMap.get(u.id) || null,
      }));

    switch (recipientType) {
      case "all":
        usersToNotify = allUsers;
        break;
      case "registered":
        usersToNotify = allUsers.filter(u => registeredUserIds.has(u.id));
        break;
      case "not_registered":
        usersToNotify = allUsers.filter(u => !registeredUserIds.has(u.id));
        break;
      case "specific":
        usersToNotify = allUsers.filter(u => userIds.includes(u.id));
        break;
      default:
        return new Response(JSON.stringify({ error: "Invalid recipient type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    console.log("Users to notify:", usersToNotify.length);

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

    // Process custom message - convert newlines to <br> for HTML
    const formattedMessage = customMessage.replace(/\n/g, '<br>');

    const emailSubject = subject || `Rappel : ${event.title}`;

    // Send emails
    const emailPromises = usersToNotify.map(async (recipient) => {
      const greeting = recipient.first_name ? `Bonjour ${recipient.first_name},` : "Bonjour,";
      const isRegistered = registeredUserIds.has(recipient.id);
      
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
          
          <div style="margin-bottom: 25px;">
            ${formattedMessage}
          </div>
          
          <div style="background-color: #f8f7f4; padding: 25px; margin-bottom: 30px;">
            <h2 style="font-size: 20px; font-weight: normal; margin: 0 0 15px 0; color: #1a1a1a;">${event.title}</h2>
            <p style="margin: 5px 0; color: #666;">📅 ${formattedDate} à ${formattedTime}</p>
            ${event.location ? `<p style="margin: 5px 0; color: #666;">📍 ${event.location}</p>` : ''}
            ${event.description ? `<p style="margin: 15px 0 0 0; font-style: italic; color: #444;">${event.description}</p>` : ''}
          </div>
          
          ${!isRegistered ? `
          <p style="margin-bottom: 20px;">
            <a href="https://cerclepartages.org/rencontre/${event.id}" 
               style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 14px;">
              S'inscrire à la rencontre
            </a>
          </p>
          ` : `
          <p style="margin-bottom: 20px; padding: 12px 20px; background-color: #e8f5e9; border-left: 4px solid #4caf50; color: #2e7d32;">
            ✓ Vous êtes inscrit(e) à cette rencontre
          </p>
          <p style="margin-bottom: 20px;">
            <a href="https://cerclepartages.org/rencontre/${event.id}" 
               style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 14px;">
              Voir les détails
            </a>
          </p>
          `}
          
          <p style="margin-bottom: 10px;">À très bientôt,</p>
          <p style="margin: 0;">L'équipe du Cercle Partages</p>
          
          <div style="border-top: 1px solid #e5e5e5; margin-top: 40px; padding-top: 20px; font-size: 12px; color: #888;">
            <p style="margin: 0;">Cet email vous a été envoyé car vous êtes membre du Cercle Partages.</p>
          </div>
        </body>
        </html>
      `;

      try {
        await sendEmail(recipient.email, emailSubject, html);
        return { email: recipient.email, success: true };
      } catch (err) {
        console.error(`Error sending email to ${recipient.email}:`, err);
        return { email: recipient.email, success: false, error: String(err) };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Sent ${successCount} reminder emails successfully, ${failCount} failed`);

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
    console.error("Error in send-event-reminder function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
