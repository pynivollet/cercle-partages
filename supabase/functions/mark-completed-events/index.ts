import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting mark-completed-events cron job...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date at midnight (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    console.log(`Looking for published events before ${todayIso}`);

    // Find all published events where event_date is before today
    const { data: eventsToComplete, error: fetchError } = await supabase
      .from("events")
      .select("id, title, event_date")
      .eq("status", "published")
      .lt("event_date", todayIso);

    if (fetchError) {
      console.error("Error fetching events:", fetchError);
      throw fetchError;
    }

    if (!eventsToComplete || eventsToComplete.length === 0) {
      console.log("No events to mark as completed");
      return new Response(
        JSON.stringify({ message: "No events to complete", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${eventsToComplete.length} events to mark as completed:`, 
      eventsToComplete.map(e => `${e.title} (${e.event_date})`));

    // Update all found events to completed status
    const eventIds = eventsToComplete.map(e => e.id);
    const { error: updateError } = await supabase
      .from("events")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .in("id", eventIds);

    if (updateError) {
      console.error("Error updating events:", updateError);
      throw updateError;
    }

    console.log(`Successfully marked ${eventsToComplete.length} events as completed`);

    return new Response(
      JSON.stringify({ 
        message: `Marked ${eventsToComplete.length} events as completed`,
        count: eventsToComplete.length,
        events: eventsToComplete.map(e => e.title)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in mark-completed-events:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
