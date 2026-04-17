import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fine_id } = await req.json();
    if (!fine_id || typeof fine_id !== "string") {
      return new Response(JSON.stringify({ error: "fine_id requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get citizen
    const { data: citizen, error: citErr } = await admin
      .from("citizens")
      .select("id, balance, roblox_nickname")
      .eq("user_id", user.id)
      .single();
    if (citErr || !citizen) {
      return new Response(JSON.stringify({ error: "No tienes cédula" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get fine and verify ownership + not paid
    const { data: fine, error: fineErr } = await admin
      .from("fines")
      .select("id, citizen_id, monto, pagada, razon")
      .eq("id", fine_id)
      .single();
    if (fineErr || !fine) {
      return new Response(JSON.stringify({ error: "Multa no encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (fine.citizen_id !== citizen.id) {
      return new Response(JSON.stringify({ error: "Esta multa no es tuya" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (fine.pagada) {
      return new Response(JSON.stringify({ error: "Multa ya pagada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (citizen.balance < fine.monto) {
      return new Response(JSON.stringify({ error: "Saldo insuficiente" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Debit citizen
    const newBalance = citizen.balance - fine.monto;
    const { error: debitErr } = await admin
      .from("citizens")
      .update({ balance: newBalance })
      .eq("id", citizen.id);
    if (debitErr) throw debitErr;

    // Mark fine paid (rollback debit on failure)
    const { error: payErr } = await admin
      .from("fines")
      .update({ pagada: true })
      .eq("id", fine.id);
    if (payErr) {
      await admin.from("citizens").update({ balance: citizen.balance }).eq("id", citizen.id);
      throw payErr;
    }

    // Record transaction (best-effort)
    await admin.from("transactions").insert({
      sender_citizen_id: citizen.id,
      receiver_citizen_id: null,
      monto: fine.monto,
      tipo: "multa",
      descripcion: `Pago de multa: ${fine.razon}`,
    });

    // Notify citizen (best-effort)
    await admin.from("notifications").insert({
      citizen_id: citizen.id,
      tipo: "multa",
      titulo: "Multa pagada",
      mensaje: `Pagaste $${fine.monto} por: ${fine.razon}. Nuevo saldo: $${newBalance}`,
    });

    return new Response(
      JSON.stringify({ success: true, new_balance: newBalance }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("pay-fine error:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
