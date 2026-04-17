import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Loader2 } from "lucide-react";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user, setIsNewUser } = useAuth();

  // If already logged in, redirect
  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  // Handle Discord callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      // Clean URL immediately to avoid re-processing
      window.history.replaceState({}, "", "/login");
      handleDiscordCallback(code);
    }
  }, []);

  const handleDiscordLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const redirectUri = `${window.location.origin}/login`;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/discord-auth?action=authorize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ redirect_uri: redirectUri }),
        }
      );

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No redirect URL received");
      }
    } catch (err: any) {
      setError(err.message || "Error al conectar con Discord");
      setLoading(false);
    }
  };

  const handleDiscordCallback = async (code: string) => {
    setLoading(true);
    setError("");
    try {
      const redirectUri = `${window.location.origin}/login`;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/discord-auth?action=callback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ code, redirect_uri: redirectUri }),
        }
      );

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Sign in with the token hash (OTP)
      if (data.token_hash) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: "magiclink",
        });
        if (otpError) throw otpError;
      }

      if (data.is_new_user) {
        setIsNewUser(true);
        navigate("/onboarding");
      } else {
        navigate("/");
      }
    } catch (err: any) {
      setError(err.message || "Error en el callback de Discord");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Venezuela RP</h1>
          <p className="mt-1 text-sm text-muted-foreground">Venezuela Roleplay · Portal Ciudadano</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">Iniciar Sesión</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Conecta tu cuenta de Discord para acceder
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
              {error}
            </div>
          )}

          <button
            onClick={handleDiscordLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#5865F2] py-3.5 text-sm font-semibold text-white hover:bg-[#4752C4] transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5. 44.3433C53.8381 44.6363 54.2103 44.9293 54.5853 45.2082C54.714 45.304 54.7056 45.5041 54.5765 45.5858C52.7842 46.6197 50.9455 47.4931 49.0145 48.2228C48.8886 48.2707 48.8326 48.4172 48.8942 48.5383C49.9609 50.6034 51.1783 52.57 52.5765 54.435C52.6325 54.5139 52.7332 54.5477 52.8256 54.5195C58.6261 52.7249 64.5089 50.0174 70.5818 45.5576C70.6349 45.5182 70.6685 45.459 70.6741 45.3942C72.1727 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.768 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="currentColor"/>
              </svg>
            )}
            {loading ? "Conectando..." : "Continuar con Discord"}
          </button>

          <p className="text-center text-[10px] text-muted-foreground">
            Al iniciar sesión, aceptas las normas del servidor RCDU
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Venezuela RP · Venezuela Roleplay © 2026
        </p>
      </motion.div>
    </div>
  );
}
