import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCitizen } from "@/hooks/useData";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Bell,
  CreditCard,
  IdCard,
  Store,
  Package,
  AlertTriangle,
  FileText,
} from "lucide-react";

const navItems = [
  { label: "PRINCIPAL", items: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Bell, label: "Notificaciones", path: "/notificaciones" },
  ]},
  { label: "IDENTIDAD", items: [
    { icon: IdCard, label: "Mi Cédula", path: "/cedula" },
    { icon: FileText, label: "Mi Expediente", path: "/expediente" },
  ]},
  { label: "ECONOMÍA", items: [
    { icon: CreditCard, label: "Banco Venezuela", path: "/banorte" },
  ]},
  { label: "CIUDAD", items: [
    { icon: Store, label: "Mercado", path: "/store" },
    { icon: Package, label: "Inventario", path: "/inventario" },
    { icon: AlertTriangle, label: "Emergencias 911", path: "/emergencias" },
  ]},
];

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: citizen } = useCitizen();
  const { user } = useAuth();

  const displayName = citizen?.roblox_nickname || user?.user_metadata?.discord_username || "Usuario";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-border bg-sidebar">
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            {citizen?.avatar_url ? (
              <img src={citizen.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-surface-3 flex items-center justify-center text-sm font-bold text-foreground">
                {initials}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar bg-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{displayName}</p>
            <p className="text-xs text-accent">● En línea</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {navItems.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-surface-3 hover:text-foreground"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-lg bg-primary/10 border border-primary/20"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                    <item.icon className="relative z-10 h-5 w-5" />
                    <span className="relative z-10">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
