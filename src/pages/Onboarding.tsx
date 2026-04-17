import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Shield, CheckCircle, Loader2, User, AlertCircle } from "lucide-react";

type Step = "roblox" | "verify" | "dni";

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("roblox");
  const [robloxNickname, setRobloxNickname] = useState("");
  const [robloxId, setRobloxId] = useState<number | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // DNI form
  const [nombre, setNombre] = useState("");
  const [apellidoPaterno, setApellidoPaterno] = useState("");
  const [apellidoMaterno, setApellidoMaterno] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [nacionalidad, setNacionalidad] = useState("Venezolana");
  const [genero, setGenero] = useState("");

  const generateCode = () => {
    const digits = "0123456789";
    let code = "RC";
    for (let i = 0; i < 4; i++) code += digits[Math.floor(Math.random() * digits.length)];
    return code + "DU";
  };

  const generateFolio = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let folio = "DNI";
    for (let i = 0; i < 10; i++) folio += chars[Math.floor(Math.random() * chars.length)];
    return folio + "-DU" + Math.floor(Math.random() * 10);
  };

  const generateCedulaVE = () => {
    const prefix = Math.random() > 0.5 ? "V" : "E";
    const num = Math.floor(10000000 + Math.random() * 90000000);
    return `${prefix}-${num}`;
  };

  const handleSearchRoblox = async () => {
    if (!robloxNickname.trim()) {
      setError("Ingresa tu nickname de Roblox");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("roblox-verify", {
        body: { action: "search", username: robloxNickname.trim() },
      });
      if (fnErr) throw fnErr;
      if (!data.found) {
        setError(data.error || "Usuario de Roblox no encontrado");
        return;
      }
      setRobloxId(data.roblox_id);
      setRobloxNickname(data.roblox_name);
      const code = generateCode();
      setVerificationCode(code);
      setStep("verify");
    } catch (err: any) {
      setError(err.message || "Error al buscar usuario");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmVerification = async () => {
    if (!robloxId || !verificationCode) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("roblox-verify", {
        body: { action: "verify", user_id: robloxId, code: verificationCode },
      });
      if (fnErr) throw fnErr;
      if (!data.verified) {
        setError(data.error || "Código no encontrado en tu bio. Intenta de nuevo.");
        return;
      }
      setStep("dni");
    } catch (err: any) {
      setError(err.message || "Error al verificar");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDNI = async () => {
    if (!nombre || !apellidoPaterno || !apellidoMaterno || !fechaNacimiento || !genero) {
      setError("Completa todos los campos");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const rut = generateCedulaVE();
      const folio = generateFolio();
      const discordAvatar = user?.user_metadata?.discord_avatar;

      const { error: insertError } = await supabase.from("citizens").insert({
        user_id: user!.id,
        nombre,
        apellido_paterno: apellidoPaterno,
        apellido_materno: apellidoMaterno,
        fecha_nacimiento: fechaNacimiento,
        nacionalidad,
        genero,
        rut,
        folio_dni: folio,
        roblox_nickname: robloxNickname,
        roblox_id: robloxId?.toString() || null,
        avatar_url: discordAvatar,
        verificado: true,
        balance: 2000,
      });

      if (insertError) throw insertError;
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Error al crear DNI");
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full max-w-md space-y-6"
      >
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            {step === "dni" ? <User className="h-7 w-7 text-primary" /> : <Shield className="h-7 w-7 text-primary" />}
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {step === "roblox" && "Verificación de Roblox"}
            {step === "verify" && "Verificar Código"}
            {step === "dni" && "Crear Cédula de Identidad"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "roblox" && "Ingresa tu nickname de Roblox para vincular tu cuenta"}
            {step === "verify" && "Coloca el código en tu Bio de Roblox"}
            {step === "dni" && "Completa tus datos para generar tu DNI"}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          {step === "roblox" && (
            <>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Nickname de Roblox</label>
                <input
                  value={robloxNickname}
                  onChange={e => { setRobloxNickname(e.target.value); setError(""); }}
                  placeholder="Ej: elcapitan1212"
                  className={inputClass}
                />
              </div>
              <button
                onClick={handleSearchRoblox}
                disabled={loading}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? "Buscando..." : "Continuar"}
              </button>
            </>
          )}

          {step === "verify" && (
            <>
              <div className="rounded-lg bg-surface-3 border border-border p-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">Tu código de verificación:</p>
                <p className="text-2xl font-mono font-bold text-primary text-glow-blue">{verificationCode}</p>
              </div>
              <div className="rounded-lg bg-warning/5 border border-warning/20 p-3">
                <p className="text-xs text-warning">
                  1. Ve a tu perfil de Roblox<br />
                  2. Edita tu "Información Personal" (Bio)<br />
                  3. Pega el código <span className="font-mono font-bold">{verificationCode}</span> y guarda
                </p>
              </div>
              <button
                onClick={handleConfirmVerification}
                disabled={loading}
                className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {loading ? "Verificando..." : "Listo, verificar"}
              </button>
            </>
          )}

          {step === "dni" && (
            <>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Nombre</label>
                  <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Luis" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Apellido Paterno</label>
                    <input value={apellidoPaterno} onChange={e => setApellidoPaterno(e.target.value)} placeholder="Chavez" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Apellido Materno</label>
                    <input value={apellidoMaterno} onChange={e => setApellidoMaterno(e.target.value)} placeholder="Garcia" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Fecha de Nacimiento</label>
                  <input type="date" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Nacionalidad</label>
                  <input value={nacionalidad} onChange={e => setNacionalidad(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Género</label>
                  <select value={genero} onChange={e => setGenero(e.target.value)} className={inputClass}>
                    <option value="">Seleccionar...</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="No binario">No binario</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleCreateDNI}
                disabled={loading}
                className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                {loading ? "Creando DNI..." : "Generar Cédula de Identidad"}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
