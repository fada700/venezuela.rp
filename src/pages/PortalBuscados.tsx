import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/hooks/useData";

type WantedEntry = {
  id: string;
  razon: string;
  prioridad: string;
  recompensa: number;
  created_at: string;
  citizen_name: string;
  roblox_nickname: string;
};

const priorityColors: Record<string, string> = {
  alta: "border-destructive/50 bg-destructive/5",
  media: "border-warning/50 bg-warning/5",
  baja: "border-primary/50 bg-primary/5",
};

const priorityBadge: Record<string, string> = {
  alta: "bg-destructive/20 text-destructive",
  media: "bg-warning/20 text-warning",
  baja: "bg-primary/20 text-primary",
};

export default function PortalBuscados() {
  const [wanted, setWanted] = useState<WantedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWanted = async () => {
      const { data, error } = await supabase
        .from("wanted_list")
        .select("*, citizens(nombre, apellido_paterno, roblox_nickname)")
        .eq("activo", true)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setWanted(data.map((w: any) => ({
          id: w.id,
          razon: w.razon,
          prioridad: w.prioridad,
          recompensa: w.recompensa || 0,
          created_at: w.created_at,
          citizen_name: w.citizens ? `${w.citizens.nombre} ${w.citizens.apellido_paterno}` : "Desconocido",
          roblox_nickname: w.citizens?.roblox_nickname || "N/A",
        })));
      }
      setLoading(false);
    };
    fetchWanted();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Portal de Buscados</h1>
            <p className="text-xs text-muted-foreground">Venezuela Roleplay — Personas buscadas por la policía</p>
          </div>
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
            <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            {wanted.length} BUSCADO{wanted.length !== 1 ? "S" : ""}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : wanted.length === 0 ? (
          <div className="text-center py-20">
            <AlertTriangle className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
            <h2 className="text-lg font-semibold text-foreground">Sin personas buscadas</h2>
            <p className="text-sm text-muted-foreground mt-1">No hay alertas activas en este momento</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {wanted.map((w, i) => (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-xl border-2 p-5 ${priorityColors[w.prioridad] || priorityColors.media}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{w.citizen_name}</h3>
                    <p className="text-xs text-muted-foreground">Roblox: {w.roblox_nickname}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${priorityBadge[w.prioridad] || priorityBadge.media}`}>
                    {w.prioridad}
                  </span>
                </div>
                <p className="text-sm text-foreground mb-3">{w.razon}</p>
                <div className="flex items-center justify-between">
                  {w.recompensa > 0 && (
                    <div className="flex items-center gap-1 text-accent font-bold text-sm">
                      <DollarSign className="h-4 w-4" /> Recompensa: {formatMoney(w.recompensa)}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(w.created_at).toLocaleDateString("es-VE")}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
