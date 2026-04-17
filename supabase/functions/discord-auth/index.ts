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
    const CLIENT_ID = Deno.env.get("DISCORD_CLIENT_ID");
    const CLIENT_SECRET = Deno.env.get("DISCORD_CLIENT_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error("Discord credentials not configured");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Step 1: Return Discord OAuth URL
    if (action === "authorize") {
      const body = await req.json();
      const redirectUri = body.redirect_uri;
      
      const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "identify email",
      });

      return new Response(
        JSON.stringify({ url: `https://discord.com/oauth2/authorize?${params}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Exchange code for token and create/sign in user
    if (action === "callback") {
      const body = await req.json();
      const { code, redirect_uri } = body;

      if (!code) {
        return new Response(
          JSON.stringify({ error: "code is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Exchange code for access token
      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri,
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        throw new Error(`Discord token exchange failed: ${JSON.stringify(tokenData)}`);
      }

      // Get Discord user info
      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const discordUser = await userRes.json();
      if (!userRes.ok) {
        throw new Error(`Discord user fetch failed: ${JSON.stringify(discordUser)}`);
      }

      const email = discordUser.email || `${discordUser.id}@discord.user`;
      const avatarUrl = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null;

      // Create Supabase admin client
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Check if user exists by email
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u: any) => u.email === email || u.user_metadata?.discord_id === discordUser.id
      );

      let userId: string;
      let isNewUser = false;

      if (existingUser) {
        userId = existingUser.id;
        // Update metadata
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            discord_id: discordUser.id,
            discord_username: discordUser.username,
            discord_avatar: avatarUrl,
            full_name: discordUser.global_name || discordUser.username,
          },
        });
      } else {
        // Create new user
        const password = crypto.randomUUID() + crypto.randomUUID();
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            discord_id: discordUser.id,
            discord_username: discordUser.username,
            discord_avatar: avatarUrl,
            full_name: discordUser.global_name || discordUser.username,
          },
        });
        if (createError) throw createError;
        userId = newUser.user.id;
        isNewUser = true;

        // Assign citizen role
        await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "citizen" });
      }

      // Generate session token
      const { data: session, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

      if (signInError) throw signInError;

      return new Response(
        JSON.stringify({
          success: true,
          user_id: userId,
          email,
          is_new_user: isNewUser,
          discord_username: discordUser.username,
          discord_avatar: avatarUrl,
          // Return hashed_token for OTP sign in
          token_hash: session.properties?.hashed_token,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use ?action=authorize or ?action=callback" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Discord auth error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
