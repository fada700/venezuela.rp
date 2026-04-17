import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const hqSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "hq-dashboard-session",
    },
  },
);

export default function HQLogin() {
  const navigate = useNavigate();
  const [placa, setPlaca] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(true);

  const normalizedPlaca = placa.trim().toUpperCase();
  const normalizedPassword = password.trim();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!normalizedPlaca || !normalizedPassword) {
      setError("Ingresa tu placa y contraseña");
      return;
    }

    setLoading(true);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("hq-login", {
        body: { placa: normalizedPlaca, password: normalizedPassword },
      });

      if (fnErr) throw fnErr;
      if (data?.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      // Establish a real Supabase auth session for the hqSupabase client
      if (data?.auth?.token_hash && data?.auth?.email) {
        const { error: otpErr } = await hqSupabase.auth.verifyOtp({
          token_hash: data.auth.token_hash,
          type: "magiclink",
        });
        if (otpErr) {
          console.error("OTP verify error:", otpErr);
          // Non-fatal: panels may have limited functionality
        }
      }

      sessionStorage.setItem("hq_officer", JSON.stringify(data.officer));
      navigate("/hq-dashboard");
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">MDT Policial</h1>
          <p className="mt-1 text-sm text-muted-foreground">RC District United — Acceso HQ</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-xl">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Número de Placa</label>
            <Input
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
              placeholder="Ej: MX-01"
              className="border-border bg-background/60 uppercase"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Contraseña</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="border-border bg-background/60 pr-11"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Acceder al HQ"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
