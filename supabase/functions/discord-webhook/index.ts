import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL");
    if (!WEBHOOK_URL) {
      throw new Error("DISCORD_WEBHOOK_URL is not configured");
    }

    const body = await req.json();
    const { content, embeds } = body;

    if (!content && !embeds) {
      return new Response(
        JSON.stringify({ error: "content or embeds required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: Record<string, unknown> = {
      username: "Venezuela RP Bot",
      avatar_url: "https://cdn-icons-png.flaticon.com/512/2111/2111370.png",
    };
    if (content) payload.content = content;
    if (embeds) payload.embeds = embeds;

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord webhook failed [${response.status}]: ${errorText}`);
    }

    await response.text();

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
