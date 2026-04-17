import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { property_id } = await req.json();
    if (!property_id || typeof property_id !== "string") {
      return new Response(JSON.stringify({ error: "property_id requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: citizen, error: citErr } = await admin
      .from("citizens").select("id, balance, roblox_nickname")
      .eq("user_id", user.id).single();
    if (citErr || !citizen) {
      return new Response(JSON.stringify({ error: "No tienes cédula" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: prop, error: propErr } = await admin
      .from("properties").select("id, nombre, precio, disponible, tipo")
      .eq("id", property_id).single();
    if (propErr || !prop) {
      return new Response(JSON.stringify({ error: "Propiedad no encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!prop.disponible) {
      return new Response(JSON.stringify({ error: "Propiedad ya vendida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (citizen.balance < prop.precio) {
      return new Response(JSON.stringify({ error: "Saldo insuficiente" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newBalance = citizen.balance - prop.precio;

    // Debit
    const { error: debitErr } = await admin
      .from("citizens").update({ balance: newBalance }).eq("id", citizen.id);
    if (debitErr) throw debitErr;

    // Assign property (rollback debit on failure)
    const { error: assignErr } = await admin.from("properties")
      .update({ owner_citizen_id: citizen.id, disponible: false })
      .eq("id", prop.id).eq("disponible", true);
    if (assignErr) {
      await admin.from("citizens").update({ balance: citizen.balance }).eq("id", citizen.id);
      throw assignErr;
    }

    // Best-effort: transaction + notification
    await admin.from("transactions").insert({
      sender_citizen_id: citizen.id,
      receiver_citizen_id: null,
      monto: prop.precio,
      tipo: "propiedad",
      descripcion: `Compra de propiedad: ${prop.nombre}`,
    });
    await admin.from("notifications").insert({
      citizen_id: citizen.id,
      tipo: "info",
      titulo: "Propiedad adquirida",
      mensaje: `Felicidades, compraste ${prop.nombre} por $${prop.precio}. Nuevo saldo: $${newBalance}`,
    });

    return new Response(
      JSON.stringify({ success: true, new_balance: newBalance }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("buy-property error:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
