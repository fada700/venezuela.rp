import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const normalizePlate = (value: string) => value.trim().toUpperCase();
const normalizePassword = (value: string) => value.trim();
const compactPlate = (value: string) => normalizePlate(value).replace(/[^A-Z0-9]/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { placa, password } = await req.json();
    const normalizedPlaca = typeof placa === "string" ? normalizePlate(placa) : "";
    const normalizedPassword = typeof password === "string" ? normalizePassword(password) : "";

    if (!normalizedPlaca || !normalizedPassword) {
      return new Response(JSON.stringify({ error: "Placa y contraseña requeridos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const targetPlate = compactPlate(normalizedPlaca);

    const { data: officers, error: fetchErr } = await supabase
      .from("officers")
      .select("*, citizens(*)")
      .limit(200);

    if (fetchErr) throw fetchErr;

    const officer = officers?.find((row: any) => compactPlate(row.placa ?? "") === targetPlate);

    if (!officer) {
      return new Response(JSON.stringify({ error: "Placa no encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (normalizePassword(officer.contrasena_hash ?? "") !== normalizedPassword) {
      return new Response(JSON.stringify({ error: "Credenciales incorrectas" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get the auth user to generate a session
    const userId = officer.citizens?.user_id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Oficial sin cuenta de usuario vinculada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(userId);
    if (authErr || !authUser?.user?.email) {
      return new Response(JSON.stringify({ error: "No se pudo obtener cuenta de usuario" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate a magic link to create a valid session
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: authUser.user.email,
    });

    if (linkErr || !linkData) {
      console.error("generateLink error:", linkErr);
      return new Response(JSON.stringify({ error: "Error generando sesión" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const officerSession = {
      id: officer.id,
      placa: officer.placa,
      rango: officer.rango,
      departamento: officer.departamento,
      citizen_id: officer.citizen_id,
      nombre: [officer.citizens?.nombre, officer.citizens?.apellido_paterno].filter(Boolean).join(" "),
      roblox_nickname: officer.citizens?.roblox_nickname,
    };

    return new Response(JSON.stringify({
      officer: officerSession,
      auth: {
        token_hash: linkData.properties?.hashed_token,
        email: authUser.user.email,
      },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("hq-login error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
