import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    if (!WEBHOOK_URL) throw new Error("DISCORD_WEBHOOK_URL not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Get today's date range (UTC)
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);

    // Fetch all shifts that started today
    const { data: shifts, error: shiftErr } = await supabase
      .from("officer_shifts")
      .select("*, officers(placa, rango, departamento, citizens(nombre, apellido_paterno, roblox_nickname))")
      .gte("inicio", startOfDay.toISOString())
      .order("inicio", { ascending: true });

    if (shiftErr) throw new Error(`Shift query failed: ${shiftErr.message}`);

    // Also get currently active shifts that started before today
    const { data: activeShifts, error: activeErr } = await supabase
      .from("officer_shifts")
      .select("*, officers(placa, rango, departamento, citizens(nombre, apellido_paterno, roblox_nickname))")
      .lt("inicio", startOfDay.toISOString())
      .in("estado", ["en_servicio", "break"]);

    if (activeErr) throw new Error(`Active shift query failed: ${activeErr.message}`);

    const allShifts = [...(shifts || []), ...(activeShifts || [])];

    // Build officer summary
    const officerMap = new Map<string, { placa: string; roblox: string; rango: string; depto: string; totalMs: number }>();

    for (const s of allShifts) {
      const officerId = s.officer_id;
      const placa = s.officers?.placa || "???";
      const roblox = s.officers?.citizens?.roblox_nickname || s.officers?.citizens?.nombre || "Desconocido";
      const rango = s.officers?.rango || "N/A";
      const depto = s.officers?.departamento || "N/A";

      const start = new Date(s.inicio);
      const end = s.fin ? new Date(s.fin) : now;
      const durationMs = end.getTime() - start.getTime();

      if (officerMap.has(officerId)) {
        const existing = officerMap.get(officerId)!;
        existing.totalMs += durationMs;
      } else {
        officerMap.set(officerId, { placa, roblox, rango, depto, totalMs: durationMs });
      }
    }

    const formatDuration = (ms: number) => {
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      return `${h}h ${m}m`;
    };

    const dateStr = now.toLocaleDateString("es-CL", { year: "numeric", month: "long", day: "numeric" });

    // Build embed fields
    const officers = Array.from(officerMap.values());
    officers.sort((a, b) => b.totalMs - a.totalMs);

    let description = "";
    if (officers.length === 0) {
      description = "No hubo actividad policial registrada hoy.";
    } else {
      description = officers.map((o, i) => {
        return `**${i + 1}.** 🛡️ \`${o.placa}\` — **${o.roblox}**\n` +
          `   ${o.rango} • ${o.depto}\n` +
          `   ⏱️ Tiempo en servicio: **${formatDuration(o.totalMs)}**`;
      }).join("\n\n");
    }

    const totalHours = officers.reduce((sum, o) => sum + o.totalMs, 0);

    const embed = {
      title: "📋 Reporte Diario de Actividad Policial",
      description,
      color: 0x3b82f6,
      footer: {
        text: `Venezuela RP MDT • ${dateStr} • ${officers.length} oficial(es) • Total: ${formatDuration(totalHours)}`,
      },
      timestamp: now.toISOString(),
    };

    // Send to Discord
    const discordRes = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Venezuela RP MDT Bot",
        avatar_url: "https://cdn-icons-png.flaticon.com/512/2111/2111370.png",
        embeds: [embed],
      }),
    });

    if (!discordRes.ok) {
      const errText = await discordRes.text();
      throw new Error(`Discord webhook failed [${discordRes.status}]: ${errText}`);
    }
    await discordRes.text();

    console.log(`Daily report sent: ${officers.length} officers, total ${formatDuration(totalHours)}`);

    return new Response(
      JSON.stringify({ success: true, officers_count: officers.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Daily report error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
