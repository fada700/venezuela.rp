import { motion } from "framer-motion";
import { Bell, Check, Loader2, DollarSign, AlertTriangle, Gavel } from "lucide-react";
import { useState } from "react";
import { useNotifications, useFines, formatMoney } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const tabs = ["Todas", "No leídas", "Leídas"];

const iconMap: Record<string, any> = {
  multa: DollarSign,
  arresto: Gavel,
  emergencia: AlertTriangle,
};

export default function Notificaciones() {
  const { data: notifications, isLoading } = useNotifications();
  const { data: fines } = useFines();
  const [activeTab, setActiveTab] = useState("Todas");
  const queryClient = useQueryClient();
  const [payingFine, setPayingFine] = useState<string | null>(null);

  const filtered = (notifications || []).filter(n => {
    if (activeTab === "No leídas") return !n.leida;
    if (activeTab === "Leídas") return n.leida;
    return true;
  });

  const unread = notifications?.filter(n => !n.leida).length ?? 0;
  const unpaidFines = fines?.filter(f => !f.pagada) || [];

  const markAllRead = async () => {
    if (!notifications) return;
    const unreadIds = notifications.filter(n => !n.leida).map(n => n.id);
    if (unreadIds.length === 0) return;
    for (const id of unreadIds) {
      await supabase.from("notifications").update({ leida: true }).eq("id", id);
    }
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const payFine = async (fine: any) => {
    setPayingFine(fine.id);
    try {
      const { error } = await supabase.from("fines").update({ pagada: true }).eq("id", fine.id);
      if (error) throw error;
      toast.success(`Multa de ${formatMoney(fine.monto)} pagada`);
      queryClient.invalidateQueries({ queryKey: ["fines"] });
      queryClient.invalidateQueries({ queryKey: ["citizen"] });
    } catch (err: any) {
      toast.error(err.message || "Error al pagar multa");
    } finally {
      setPayingFine(null);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" /> Notificaciones
          </h1>
          <p className="text-sm text-muted-foreground">{unread} sin leer · {notifications?.length ?? 0} total</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
            <Check className="h-3 w-3" /> Marcar todas leídas
          </button>
        )}
      </div>

      {/* Unpaid fines */}
      {unpaidFines.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-3">
          <h3 className="text-sm font-bold text-warning flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Multas Pendientes ({unpaidFines.length})
          </h3>
          {unpaidFines.map(fine => (
            <div key={fine.id} className="flex items-center justify-between rounded-lg bg-card border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{fine.razon}</p>
                <p className="text-xs text-muted-foreground">{new Date(fine.created_at).toLocaleDateString("es-VE")}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-bold text-warning">{formatMoney(fine.monto)}</p>
                <button
                  onClick={() => payFine(fine)}
                  disabled={payingFine === fine.id}
                  className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {payingFine === fine.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <DollarSign className="h-3 w-3" />}
                  Pagar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: notifications?.length ?? 0, color: "text-primary" },
          { label: "Sin leer", value: unread, color: "text-destructive" },
          { label: "Leídas", value: (notifications?.length ?? 0) - unread, color: "text-accent" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:bg-surface-3 hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Sin notificaciones</h2>
          <p className="text-sm text-muted-foreground mt-1">No tienes notificaciones por ahora</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((notif, i) => {
            const Icon = iconMap[notif.tipo] || Bell;
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-start gap-4 rounded-xl border bg-card p-4 ${
                  notif.leida ? "border-border" : "border-primary/30 bg-primary/5"
                }`}
              >
                <div className="rounded-lg bg-surface-3 p-2 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{notif.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{notif.mensaje}</p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {new Date(notif.created_at).toLocaleDateString("es-VE")}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
