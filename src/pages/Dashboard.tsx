import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCitizen, useTransactions, useNotifications, useVehicles, formatMoney } from "@/hooks/useData";
import {
  Wallet,
  Package,
  Bell,
  IdCard,
  CreditCard,
  Store,
  ArrowRight,
  AlertTriangle,
  DollarSign,
  Loader2,
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: citizen, isLoading } = useCitizen();
  const { data: transactions } = useTransactions();
  const { data: notifications } = useNotifications();
  const { data: vehicles } = useVehicles();

  const displayName = citizen?.roblox_nickname || user?.user_metadata?.discord_username || "Usuario";
  const balance = citizen?.balance ?? 0;
  const unreadNotifs = notifications?.filter(n => !n.leida).length ?? 0;
  const hasDNI = !!citizen?.verificado;
  const vehicleCount = vehicles?.length ?? 0;

  const today = new Date();
  const dateStr = today.toLocaleDateString("es-VE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statsCards = [
    { icon: Wallet, label: "BALANCE", value: formatMoney(balance), sub: "Saldo disponible", color: "text-accent", borderColor: "border-t-accent", badgeText: "BALANCE", badgeColor: "bg-accent/10 text-accent" },
    { icon: Package, label: "VEHÍCULOS", value: String(vehicleCount), sub: "En tu garaje", color: "text-primary", borderColor: "border-t-primary", badgeText: "ITEMS", badgeColor: "bg-primary/10 text-primary" },
    { icon: Bell, label: "NOTIFICACIONES", value: String(unreadNotifs), sub: "Sin leer", color: "text-warning", borderColor: "border-t-warning", badgeText: unreadNotifs > 0 ? `${unreadNotifs} NUEVA${unreadNotifs > 1 ? "S" : ""}` : "AL DÍA", badgeColor: unreadNotifs > 0 ? "bg-warning/10 text-warning" : "bg-accent/10 text-accent" },
    { icon: IdCard, label: "CÉDULA", value: hasDNI ? "Verificado" : "Pendiente", sub: hasDNI ? "Cédula de identidad" : "Crea tu cédula", color: hasDNI ? "text-primary" : "text-warning", borderColor: hasDNI ? "border-t-primary" : "border-t-warning", badgeText: hasDNI ? "ACTIVA" : "PENDIENTE", badgeColor: hasDNI ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning" },
  ];

  const quickActions = [
    { icon: CreditCard, label: "Banco Venezuela", path: "/banorte", color: "text-accent" },
    { icon: Store, label: "Mercado", path: "/store", color: "text-primary" },
    { icon: Package, label: "Inventario", path: "/inventario", color: "text-destructive" },
    { icon: DollarSign, label: "Sueldos", path: "/", color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      {/* Emergency banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => navigate("/emergencias")}
        className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4 cursor-pointer hover:bg-destructive/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-destructive animate-pulse-glow" />
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <div>
            <p className="text-sm font-semibold text-destructive">Reportar Emergencia</p>
            <p className="text-xs text-muted-foreground">Envía un llamado al MDT policial en tiempo real</p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
      </motion.div>

      {/* Welcome card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Bienvenido, <span className="text-accent">{displayName}</span> 👋
            </h1>
            <p className="mt-1 text-sm text-muted-foreground capitalize">{dateStr}</p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              En línea · RCDU
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Balance Actual</p>
            <p className="text-3xl font-bold text-accent text-glow-emerald">{formatMoney(balance)}</p>
            <p className="text-xs text-muted-foreground">Dólares USD</p>
          </div>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            className={`rounded-xl border border-border ${card.borderColor} border-t-2 bg-card p-4 card-hover cursor-pointer`}
          >
            <div className="flex items-center justify-between mb-3">
              <card.icon className={`h-5 w-5 ${card.color}`} />
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${card.badgeColor}`}>
                {card.badgeText}
              </span>
            </div>
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {quickActions.map((action, i) => (
          <motion.button
            key={action.label}
            onClick={() => navigate(action.path)}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5 card-hover"
          >
            <div className="rounded-xl bg-surface-3 p-3">
              <action.icon className={`h-6 w-6 ${action.color}`} />
            </div>
            <span className="text-xs font-medium text-foreground">{action.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Transactions + Notifications */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Transacciones Recientes</h2>
            <button onClick={() => navigate("/banorte")} className="text-xs font-medium text-primary hover:underline">Ver todas →</button>
          </div>
          {transactions && transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.slice(0, 3).map((tx) => {
                const isIncoming = tx.receiver_citizen_id === citizen?.id;
                return (
                  <div key={tx.id} className="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{tx.descripcion || tx.tipo}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString("es-CL")}</p>
                    </div>
                    <p className={`text-sm font-mono font-semibold ${isIncoming ? "text-accent" : "text-destructive"}`}>
                      {isIncoming ? "+" : "-"}{formatMoney(tx.monto)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Sin transacciones aún</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Notificaciones</h2>
            {unreadNotifs > 0 && (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">{unreadNotifs} sin leer</span>
            )}
          </div>
          {notifications && notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.slice(0, 3).map((notif) => (
                <div key={notif.id} className={`flex items-start gap-3 rounded-lg px-4 py-3 ${notif.leida ? "bg-surface-2" : "bg-primary/5 border border-primary/20"}`}>
                  <Bell className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{notif.titulo}</p>
                    <p className="text-xs text-muted-foreground">{notif.mensaje}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Sin notificaciones</p>
          )}
        </div>
      </div>
    </div>
  );
}
