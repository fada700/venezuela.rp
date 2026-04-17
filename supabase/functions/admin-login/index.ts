import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "venezuela@roleplay.com";
const ADMIN_PASSWORD = "vnzrp@MCK!";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, password } = await req.json();
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "Credenciales incorrectas" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if user exists
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    let userId: string;
    const existing = users?.users?.find((u: any) => u.email === ADMIN_EMAIL);

    if (existing) {
      userId = existing.id;
      // Update password in case it changed
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: ADMIN_PASSWORD });
    } else {
      // Create admin user
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
      });
      if (createErr || !newUser.user) throw createErr || new Error("Failed to create admin user");
      userId = newUser.user.id;
    }

    // Ensure admin role exists
    const { data: roleExists } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleExists) {
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
    }

    // Sign in and return session
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const { data: signIn, error: signInErr } = await anonClient.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    if (signInErr) throw signInErr;

    return new Response(JSON.stringify({ session: signIn.session }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
