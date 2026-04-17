import { motion } from "framer-motion";
import { Shield, Loader2, Plus } from "lucide-react";
import { useCitizen } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";

export default function MiCedula() {
  const { data: citizen, isLoading } = useCitizen();
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Empty state — no DNI created yet
  if (!citizen) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Mi Cédula de Identidad
          </h1>
          <p className="text-sm text-muted-foreground">Identidad oficial registrada</p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto max-w-md text-center py-16"
        >
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-2">
            <Shield className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">No tienes cédula registrada</h2>
          <p className="mt-2 text-sm text-muted-foreground">Crea tu cédula de identidad para acceder a todos los servicios de RCDU</p>
          <button
            onClick={() => navigate("/onboarding")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Crear mi Cédula
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Mi Cédula de Identidad
        </h1>
        <p className="text-sm text-muted-foreground">Identidad oficial registrada</p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-lg"
      >
        <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-surface-2 to-surface-3 p-6 glow-blue">
          <div className="text-center mb-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">República Bolivariana de Venezuela</p>
            <p className="text-sm font-bold text-primary uppercase tracking-wider">Cédula de Identidad</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <div className="aspect-[3/4] rounded-lg bg-surface-4 border border-border flex items-center justify-center overflow-hidden">
                {citizen.avatar_url ? (
                  <img src={citizen.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-surface-3 flex items-center justify-center text-xl font-bold text-foreground">
                    {citizen.nombre.charAt(0)}{citizen.apellido_paterno.charAt(0)}
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-2 space-y-2">
              {[
                { label: "APELLIDOS", value: `${citizen.apellido_paterno} ${citizen.apellido_materno}` },
                { label: "NOMBRES", value: citizen.nombre },
                { label: "NACIONALIDAD", value: citizen.nacionalidad },
                { label: "FECHA NAC.", value: new Date(citizen.fecha_nacimiento).toLocaleDateString("es-VE") },
              ].map((field) => (
                <div key={field.label}>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{field.label}</p>
                  <p className="text-xs font-semibold text-foreground uppercase">{field.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2 text-center">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Cédula N°</p>
            <p className="text-lg font-mono font-bold text-primary text-glow-blue">{citizen.folio_dni}</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Emisión</p>
              <p className="text-xs font-mono text-foreground">{new Date(citizen.created_at).toLocaleDateString("es-CL")}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Roblox</p>
              <p className="text-xs font-mono text-foreground">{citizen.roblox_nickname}</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-center text-[9px] text-muted-foreground">
              Venezuela Roleplay · Cédula de Identidad Venezolana · Uso exclusivo plataforma
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
