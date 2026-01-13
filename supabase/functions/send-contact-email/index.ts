import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  reason: string;
  message: string;
  senderEmail: string;
  senderName: string;
}

const reasonLabels: Record<string, string> = {
  connexion_issue: "Problème de connexion",
  intervention_request: "Demande d'intervention",
  general_remark: "Remarque diverse",
  membership_request: "Demande d'adhésion",
  other: "Autre",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reason, message, senderEmail, senderName }: ContactEmailRequest = await req.json();

    if (!reason || !message) {
      return new Response(
        JSON.stringify({ error: "Reason and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const reasonLabel = reasonLabels[reason] || reason;
    const currentDate = new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { border-bottom: 2px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; color: #1a1a1a; }
          .meta { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .meta p { margin: 5px 0; }
          .meta strong { color: #1a1a1a; }
          .message { background: #fff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; }
          .message p { margin: 0; white-space: pre-wrap; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nouveau message - Cercle Partages</h1>
          </div>
          
          <div class="meta">
            <p><strong>Date :</strong> ${currentDate}</p>
            <p><strong>De :</strong> ${senderName} (${senderEmail})</p>
            <p><strong>Motif :</strong> ${reasonLabel}</p>
          </div>
          
          <div class="message">
            <p>${message.replace(/\n/g, "<br>")}</p>
          </div>
          
          <div class="footer">
            <p>Ce message a été envoyé via le formulaire de contact du site Cercle Partages.</p>
            ${senderEmail !== "Anonyme" ? `<p>Vous pouvez répondre directement à cet email pour contacter ${senderName}.</p>` : ""}
          </div>
        </div>
      </body>
      </html>
    `;

    const emailPayload: Record<string, unknown> = {
      from: "Cercle Partages <contact@cerclepartages.org>",
      to: ["bnivollet@gmail.com"],
      subject: `[Cercle Partages] ${reasonLabel} - Message de ${senderName}`,
      html: emailHtml,
    };

    if (senderEmail !== "Anonyme") {
      emailPayload.reply_to = senderEmail;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Resend API error: ${res.status}`);
    }

    const data = await res.json();
    console.log("Contact email sent successfully:", data);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-contact-email function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
