import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface ResendEmailResponse {
  id: string;
}

const sendEmail = async (to: string[], subject: string, html: string): Promise<ResendEmailResponse> => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Cercle Partages <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send email: ${errorText}`);
  }

  return response.json();
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  invitationLink: string;
  role: string;
}

const getRoleName = (role: string): string => {
  switch (role) {
    case "admin":
      return "Administrateur";
    case "presenter":
      return "Intervenant";
    case "participant":
      return "Participant";
    default:
      return "Membre";
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-invitation-email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, invitationLink, role }: InvitationEmailRequest = await req.json();

    console.log(`Sending invitation email to: ${email}, role: ${role}`);

    if (!email || !invitationLink) {
      console.error("Missing required fields: email or invitationLink");
      return new Response(
        JSON.stringify({ error: "Email and invitation link are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const roleName = getRoleName(role);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #f0e68c; margin: 0; font-size: 28px;">Cercle Partages</h1>
        </div>
        
        <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #1a1a2e; margin-top: 0;">Vous êtes invité(e) !</h2>
          
          <p>Bonjour,</p>
          
          <p>Vous avez été invité(e) à rejoindre <strong>Cercle Partages</strong> en tant que <strong>${roleName}</strong>.</p>
          
          <p>Cercle Partages est un espace de réflexion et d'échange où se rencontrent des perspectives diverses autour de sujets variés.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationLink}" style="display: inline-block; background: linear-gradient(135deg, #f0e68c 0%, #daa520 100%); color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Accepter l'invitation
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
          <p style="color: #666; font-size: 12px; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">${invitationLink}</p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">Cette invitation expire dans 7 jours.</p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Cercle Partages. Tous droits réservés.</p>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await sendEmail(
      [email],
      `Invitation à rejoindre Cercle Partages en tant que ${roleName}`,
      html
    );

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invitation-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
