import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DateChangeRequest {
  eventId: string;
  oldDate: string;
  newDate: string;
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
      console.error("No authorization header provided");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error("Invalid token:", userError);
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
      console.error("Unauthorized - Admin access required for user:", user.id);
      return new Response(JSON.stringify({ error: "Unauthorized - Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { eventId, oldDate, newDate }: DateChangeRequest = await req.json();

    if (!eventId || !oldDate || !newDate) {
      console.error("Missing required fields:", { eventId, oldDate, newDate });
      return new Response(JSON.stringify({ error: "Event ID, old date, and new date are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing date change notification for event ${eventId}`);
    console.log(`Old date: ${oldDate}, New date: ${newDate}`);

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

    // Cancel all existing registrations for this event
    const { error: cancelError } = await supabaseAdmin
      .from("event_registrations")
      .update({ status: "cancelled" })
      .eq("event_id", eventId)
      .neq("status", "cancelled");

    if (cancelError) {
      console.error("Error cancelling registrations:", cancelError);
    } else {
      console.log("All existing registrations cancelled");
    }

    // Get all users to send notifications to
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

    const usersToNotify = authUsers.users.map(u => ({
      id: u.id,
      email: u.email!,
      first_name: profileMap.get(u.id) || null,
    }));

    if (usersToNotify.length === 0) {
      console.log("No users to notify");
      return new Response(JSON.stringify({ error: "No users to notify" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Sending notifications to ${usersToNotify.length} users`);

    // Format dates
    const formatDateFr = (dateStr: string) => {
      const date = new Date(dateStr);
      return {
        date: date.toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        time: date.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    };

    const oldFormatted = formatDateFr(oldDate);
    const newFormatted = formatDateFr(newDate);

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
          
          <p style="margin-bottom: 20px;">
            <strong>Important :</strong> La date de la rencontre suivante a été modifiée :
          </p>
          
          <div style="background-color: #f8f7f4; padding: 25px; margin-bottom: 30px;">
            <h2 style="font-size: 20px; font-weight: normal; margin: 0 0 15px 0; color: #1a1a1a;">${event.title}</h2>
            
            <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e5e5e5;">
              <p style="margin: 5px 0; color: #888; text-decoration: line-through;">
                ❌ Ancienne date : ${oldFormatted.date} à ${oldFormatted.time}
              </p>
            </div>
            
            <p style="margin: 5px 0; color: #1a1a1a; font-weight: bold;">
              ✅ Nouvelle date : ${newFormatted.date} à ${newFormatted.time}
            </p>
            ${event.location ? `<p style="margin: 5px 0; color: #666;">📍 ${event.location}</p>` : ''}
          </div>
          
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 30px;">
            <p style="margin: 0; color: #856404;">
              <strong>⚠️ Votre inscription a été annulée.</strong><br>
              Suite à ce changement de date, nous vous demandons de vous réinscrire si vous souhaitez confirmer votre présence à la nouvelle date.
            </p>
          </div>
          
          <p style="margin-bottom: 20px;">
            <a href="https://cerclepartages.org/rencontre/${event.id}" 
               style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 14px;">
              Se réinscrire à la rencontre
            </a>
          </p>
          
          <p style="margin-bottom: 20px;">Nous nous excusons pour la gêne occasionnée et espérons vous voir à cette nouvelle date.</p>
          
          <p style="margin-bottom: 10px;">À très bientôt,</p>
          <p style="margin: 0;">L'équipe du Cercle Partages</p>
          
          <div style="border-top: 1px solid #e5e5e5; margin-top: 40px; padding-top: 20px; font-size: 12px; color: #888;">
            <p style="margin: 0;">Cet email vous a été envoyé car vous êtes membre du Cercle Partages.</p>
          </div>
        </body>
        </html>
      `;

      try {
        await sendEmail(recipient.email, `Changement de date : ${event.title}`, html);
        console.log(`Email sent successfully to ${recipient.email}`);
        return { email: recipient.email, success: true };
      } catch (err) {
        console.error(`Error sending email to ${recipient.email}:`, err);
        return { email: recipient.email, success: false, error: String(err) };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Date change notification complete: ${successCount} emails sent successfully, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount,
        registrationsCancelled: true,
        results 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-date-change-notification function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
