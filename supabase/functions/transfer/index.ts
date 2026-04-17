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

    // Verify the user
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { recipient_query, amount, description } = await req.json();

    if (!recipient_query || typeof recipient_query !== "string") {
      return new Response(
        JSON.stringify({ error: "Destinatario requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!amount || typeof amount !== "number" || amount <= 0 || !Number.isInteger(amount)) {
      return new Response(
        JSON.stringify({ error: "Monto inválido (debe ser entero positivo)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get sender citizen
    const { data: sender, error: senderErr } = await admin
      .from("citizens")
      .select("id, balance, roblox_nickname, avatar_url")
      .eq("user_id", user.id)
      .single();
    if (senderErr || !sender) {
      return new Response(
        JSON.stringify({ error: "No tienes cédula registrada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (sender.balance < amount) {
      return new Response(
        JSON.stringify({ error: "Saldo insuficiente" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find recipient by folio_dni or roblox_nickname
    const query = recipient_query.trim();
    const { data: receiver, error: recvErr } = await admin
      .from("citizens")
      .select("id, balance, roblox_nickname, folio_dni")
      .or(`folio_dni.eq.${query},roblox_nickname.ilike.${query}`)
      .maybeSingle();

    if (recvErr || !receiver) {
      return new Response(
        JSON.stringify({ error: "Destinatario no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (receiver.id === sender.id) {
      return new Response(
        JSON.stringify({ error: "No puedes transferirte a ti mismo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update balances
    const { error: debitErr } = await admin
      .from("citizens")
      .update({ balance: sender.balance - amount })
      .eq("id", sender.id);
    if (debitErr) throw debitErr;

    const { error: creditErr } = await admin
      .from("citizens")
      .update({ balance: receiver.balance + amount })
      .eq("id", receiver.id);
    if (creditErr) throw creditErr;

    // Create transaction record
    const desc =
      description?.trim() ||
      `Transferencia de ${sender.roblox_nickname} a ${receiver.roblox_nickname}`;
    const { error: txErr } = await admin.from("transactions").insert({
      sender_citizen_id: sender.id,
      receiver_citizen_id: receiver.id,
      monto: amount,
      tipo: "transferencia",
      descripcion: desc,
    });
    if (txErr) throw txErr;

    // Notify receiver
    const reasonText = description?.trim() ? ` Razón: ${description.trim()}` : "";
    const { error: notifErr } = await admin.from("notifications").insert({
      citizen_id: receiver.id,
      tipo: "transferencia",
      titulo: "Transferencia recibida de " + sender.roblox_nickname,
      mensaje: "Has recibido $" + amount + " de " + sender.roblox_nickname + "." + reasonText,
    });
    if (notifErr) console.error("Notification insert error:", notifErr);

    return new Response(
      JSON.stringify({
        success: true,
        new_balance: sender.balance - amount,
        recipient_name: receiver.roblox_nickname,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Transfer error:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
