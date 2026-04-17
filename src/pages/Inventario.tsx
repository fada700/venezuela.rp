import { Package, Car, Loader2, Skull, ShieldCheck, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import { useVehicles, usePurchases, formatMoney } from "@/hooks/useData";
import { useState } from "react";

const tabs = ["Todos", "Vehículos", "Armas", "Objetos", "Ilícito"];

const categoryIcons: Record<string, any> = {
  Concesionario: Car,
  Armas: ShieldCheck,
  Ilícito: Skull,
  Objetos: Wrench,
};

export default function Inventario() {
  const { data: vehicles, isLoading: loadingV } = useVehicles();
  const { data: purchases, isLoading: loadingP } = usePurchases();
  const [activeTab, setActiveTab] = useState("Todos");

  const isLoading = loadingV || loadingP;

  // Combine vehicles + other purchases
  const allItems = [
    ...(vehicles || []).map(v => ({
      id: v.id,
      nombre: `${v.marca} ${v.modelo}`,
      categoria: "Vehículos",
      detalle: `Color: ${v.color} · ${v.anio || ""}`,
      extra: `Matrícula: ${v.matricula} · VIN: ${v.vin}`,
      estado: v.estado,
      created_at: v.created_at,
    })),
    ...(purchases || []).filter(p => p.categoria !== "Concesionario").map(p => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      detalle: `Pagado: ${formatMoney(p.precio_pagado)}`,
      extra: "",
      estado: "activo",
      created_at: p.created_at,
    })),
  ];

  const filtered = allItems.filter(item => {
    if (activeTab === "Todos") return true;
    if (activeTab === "Vehículos") return item.categoria === "Vehículos";
    return item.categoria === activeTab;
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" /> Inventario
        </h1>
        <p className="text-sm text-muted-foreground">{allItems.length} items en tu inventario</p>
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

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Inventario vacío</h2>
          <p className="text-sm text-muted-foreground mt-1">Compra items en el mercado para verlos aquí</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((item, i) => {
            const Icon = categoryIcons[item.categoria] || Package;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-4 card-hover"
              >
                <div className="aspect-square rounded-lg bg-surface-3 flex items-center justify-center mb-3">
                  <Icon className="h-10 w-10 text-muted-foreground/30" />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-foreground">{item.nombre}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    item.estado === "activo" ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
                  }`}>
                    {item.estado}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{item.detalle}</p>
                {item.extra && <p className="text-xs font-mono text-primary mt-1">{item.extra}</p>}
                <p className="text-[10px] text-muted-foreground mt-2">
                  {new Date(item.created_at).toLocaleDateString("es-VE")}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
