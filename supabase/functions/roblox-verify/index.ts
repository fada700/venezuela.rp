import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, username, user_id, code } = await req.json();

    if (action === "search") {
      // Search for Roblox user by username
      if (!username || typeof username !== "string") {
        return new Response(
          JSON.stringify({ error: "Username requerido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = await fetch(
        `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username.trim())}&limit=10`
      );
      const data = await res.json();

      if (!data.data || data.data.length === 0) {
        return new Response(
          JSON.stringify({ found: false, error: "Usuario de Roblox no encontrado" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find exact match (case-insensitive)
      const exact = data.data.find(
        (u: any) => u.name.toLowerCase() === username.trim().toLowerCase()
      );

      if (!exact) {
        return new Response(
          JSON.stringify({ found: false, error: "Usuario de Roblox no encontrado" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ found: true, roblox_id: exact.id, roblox_name: exact.name }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      // Check if user's bio contains the verification code
      if (!user_id || !code) {
        return new Response(
          JSON.stringify({ error: "user_id y code requeridos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = await fetch(`https://users.roblox.com/v1/users/${user_id}`);
      const data = await res.json();

      if (!data || data.errors) {
        return new Response(
          JSON.stringify({ verified: false, error: "No se pudo obtener el perfil de Roblox" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const bio = (data.description || "").toUpperCase();
      const codeUpper = code.toUpperCase();

      if (bio.includes(codeUpper)) {
        return new Response(
          JSON.stringify({ verified: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ verified: false, error: "Código no encontrado en tu bio. Intenta de nuevo." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Acción no válida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Roblox verify error:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
