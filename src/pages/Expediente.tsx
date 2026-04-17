import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useCitizen, useFines, formatMoney } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  FileText, Gavel, FileWarning, IdCard, Loader2, Clock,
  CheckCircle, AlertTriangle, XCircle, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Expediente() {
  const { user } = useAuth();
  const { data: citizen, isLoading: citizenLoading } = useCitizen();
  const { data: fines } = useFines();
  const [requested, setRequested] = useState(false);

  const { data: arrests } = useQuery({
    queryKey: ["my-arrests", citizen?.id],
    queryFn: async () => {
      if (!citizen) return [];
      const { data, error } = await supabase
        .from("arrests")
        .select("*")
        .eq("citizen_id", citizen.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!citizen && requested,
  });

  if (citizenLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!citizen) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <IdCard className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Necesitas crear tu cédula primero</p>
      </div>
    );
  }

  if (!requested) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="rounded-full bg-primary/10 p-6 mb-4 mx-auto w-fit">
            <FileText className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Solicitar Expediente</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Consulta tu historial completo: arrestos, multas, datos de identidad y más.
            Esta información es confidencial.
          </p>
        </motion.div>
        <Button onClick={() => setRequested(true)} className="gap-2" size="lg">
          <Shield className="h-4 w-4" /> Solicitar Mi Expediente
        </Button>
      </div>
    );
  }

  const now = Date.now();
  const activeArrests = arrests?.filter(a => new Date(a.expira_en).getTime() > now) || [];
  const expiredArrests = arrests?.filter(a => new Date(a.expira_en).getTime() <= now) || [];
  const pendingFines = fines?.filter(f => !f.pagada) || [];
  const paidFines = fines?.filter(f => f.pagada) || [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground mb-1">Mi Expediente</h1>
        <p className="text-sm text-muted-foreground">Información confidencial del ciudadano</p>
      </motion.div>

      {/* DNI / Identity */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <IdCard className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Datos de Identidad</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Nombre:</span> <span className="text-foreground font-medium">{citizen.nombre} {citizen.apellido_paterno} {citizen.apellido_materno}</span></div>
          <div><span className="text-muted-foreground">DNI Folio:</span> <span className="text-foreground font-medium">{citizen.folio_dni}</span></div>
          <div><span className="text-muted-foreground">RUT:</span> <span className="text-foreground font-medium">{citizen.rut}</span></div>
          <div><span className="text-muted-foreground">Roblox:</span> <span className="text-foreground font-medium">{citizen.roblox_nickname}</span></div>
          <div><span className="text-muted-foreground">Género:</span> <span className="text-foreground font-medium">{citizen.genero}</span></div>
          <div><span className="text-muted-foreground">Nacimiento:</span> <span className="text-foreground font-medium">{citizen.fecha_nacimiento}</span></div>
          <div><span className="text-muted-foreground">Nacionalidad:</span> <span className="text-foreground font-medium">{citizen.nacionalidad}</span></div>
          <div><span className="text-muted-foreground">Verificado:</span> <span className={`font-medium ${citizen.verificado ? "text-accent" : "text-warning"}`}>{citizen.verificado ? "Sí" : "No"}</span></div>
        </div>
      </motion.div>

      {/* Active Arrests */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Arrestos Vigentes ({activeArrests.length})</h2>
        </div>
        {activeArrests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No tienes arrestos vigentes ✓</p>
        ) : (
          <div className="space-y-2">
            {activeArrests.map(a => {
              const ingreso = new Date(a.created_at);
              const expira = new Date(a.expira_en);
              const diffMs = expira.getTime() - now;
              const h = Math.floor(diffMs / 3600000);
              const m = Math.floor((diffMs % 3600000) / 60000);
              return (
                <div key={a.id} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm font-medium text-foreground">{a.cargos}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                    <span>Ingreso: {ingreso.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span>Expiración: {expira.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="text-warning font-medium">{h > 0 ? `${h}h ${m}m` : `${m}m`} restantes</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Expired Arrests */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Gavel className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Arrestos Expirados ({expiredArrests.length})</h2>
        </div>
        {expiredArrests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin historial de arrestos</p>
        ) : (
          <div className="space-y-2">
            {expiredArrests.map(a => (
              <div key={a.id} className="rounded-lg bg-surface-2 p-3">
                <p className="text-sm font-medium text-foreground">{a.cargos}</p>
                <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                  <span>{new Date(a.created_at).toLocaleDateString("es-CL")}</span>
                  <span>{a.duracion_minutos >= 60 ? `${Math.floor(a.duracion_minutos / 60)}h${a.duracion_minutos % 60 > 0 ? ` ${a.duracion_minutos % 60}m` : ""}` : `${a.duracion_minutos}m`}</span>
                  <span className="text-accent">Cumplido ✓</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Pending Fines */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileWarning className="h-5 w-5 text-warning" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Multas Pendientes ({pendingFines.length})</h2>
        </div>
        {pendingFines.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No tienes multas pendientes ✓</p>
        ) : (
          <div className="space-y-2">
            {pendingFines.map(f => (
              <div key={f.id} className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/5 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{f.razon}</p>
                  <p className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString("es-CL")}</p>
                </div>
                <span className="text-sm font-semibold text-warning">{formatMoney(f.monto)}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Paid Fines */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="h-5 w-5 text-accent" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Multas Pagadas ({paidFines.length})</h2>
        </div>
        {paidFines.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin multas pagadas</p>
        ) : (
          <div className="space-y-2">
            {paidFines.map(f => (
              <div key={f.id} className="flex items-center justify-between rounded-lg bg-surface-2 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{f.razon}</p>
                  <p className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString("es-CL")}</p>
                </div>
                <span className="text-sm font-semibold text-accent">{formatMoney(f.monto)} ✓</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
