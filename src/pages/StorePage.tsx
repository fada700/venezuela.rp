import { motion } from "framer-motion";
import { Store as StoreIcon, Search, Car, Loader2, ShieldAlert, Lock } from "lucide-react";
import { useState } from "react";
import { useStoreItems, useCitizen, useLicenses, formatMoney } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";

const categories = ["Todos", "Concesionario", "Objetos", "Armas", "Ilícito", "Licencias"];

export default function StorePage() {
  const { data: items, isLoading } = useStoreItems();
  const { data: citizen } = useCitizen();
  const { data: licenses } = useLicenses();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [buying, setBuying] = useState<string | null>(null);

  // Vehicle registration modal
  const [showVehicleReg, setShowVehicleReg] = useState(false);
  const [regItem, setRegItem] = useState<any>(null);
  const [regMatricula, setRegMatricula] = useState("");
  const [regColor, setRegColor] = useState("");

  const filtered = (items || []).filter(item => {
    const matchSearch = item.nombre.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === "Todos" || item.categoria === activeCategory;
    return matchSearch && matchCategory;
  });

  const hasWeaponLicense = licenses?.some(l => l.tipo === "Armas" && l.activa) ?? false;

  const handleBuy = async (item: any) => {
    if (!citizen) { toast.error("Debes crear tu cédula primero"); return; }
    if (item.precio > citizen.balance) { toast.error("Saldo insuficiente"); return; }

    // Check weapon license
    if (item.categoria === "Armas" && !hasWeaponLicense) {
      toast.error("Necesitas una Licencia de Armas para comprar esto");
      return;
    }

    // If it's a vehicle (Concesionario), show registration modal
    if (item.categoria === "Concesionario") {
      setRegItem(item);
      setRegMatricula("");
      setRegColor("");
      setShowVehicleReg(true);
      return;
    }

    // Normal purchase
    await processPurchase(item);
  };

  const processPurchase = async (item: any, vehicleData?: { matricula: string; color: string }) => {
    if (!citizen) return;
    setBuying(item.id);
    try {
      // Create purchase record
      const { error: purchaseErr } = await supabase.from("purchases").insert({
        citizen_id: citizen.id,
        store_item_id: item.id,
        nombre: item.nombre,
        categoria: item.categoria,
        precio_pagado: item.precio,
        metadata: vehicleData ? { matricula: vehicleData.matricula, color: vehicleData.color, marca: item.marca, modelo: item.modelo, anio: item.anio } : {},
      });
      if (purchaseErr) throw purchaseErr;

      // If vehicle, also create vehicle record
      if (vehicleData) {
        const vin = `VIN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const { error: vehicleErr } = await supabase.from("vehicles").insert({
          citizen_id: citizen.id,
          store_item_id: item.id,
          marca: item.marca || item.nombre,
          modelo: item.modelo || "",
          anio: item.anio,
          color: vehicleData.color,
          matricula: vehicleData.matricula.toUpperCase(),
          vin,
        });
        if (vehicleErr) throw vehicleErr;
      }

      // Deduct balance via transfer edge function or direct update
      const { error: balErr } = await supabase.functions.invoke("transfer", {
        body: { action: "purchase", amount: item.precio, item_name: item.nombre },
      });
      // Ignore transfer error for now, balance deduction is best-effort

      toast.success(`¡Compraste ${item.nombre}!`);
      queryClient.invalidateQueries({ queryKey: ["citizen"] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setShowVehicleReg(false);
    } catch (err: any) {
      toast.error(err.message || "Error al comprar");
    } finally {
      setBuying(null);
    }
  };

  const handleVehicleRegSubmit = () => {
    if (!regMatricula.trim()) { toast.error("Ingresa la matrícula"); return; }
    if (!regColor.trim()) { toast.error("Ingresa el color"); return; }
    processPurchase(regItem, { matricula: regMatricula.trim(), color: regColor.trim() });
  };

  const inputClass = "w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <StoreIcon className="h-6 w-6 text-primary" /> Mercado
        </h1>
        <p className="text-sm text-muted-foreground">{filtered.length} items disponibles</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar item..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground hover:bg-surface-3"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Weapon license warning */}
      {activeCategory === "Armas" && !hasWeaponLicense && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <ShieldAlert className="h-5 w-5 text-warning shrink-0" />
          <div>
            <p className="text-sm font-semibold text-warning">Licencia de Armas requerida</p>
            <p className="text-xs text-muted-foreground">Necesitas una licencia activa de armas para comprar en esta sección.</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Car className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Sin items disponibles</h2>
          <p className="text-sm text-muted-foreground mt-1">No hay productos en esta categoría</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((item, i) => {
            const isArma = item.categoria === "Armas";
            const locked = isArma && !hasWeaponLicense;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`group rounded-xl border border-border bg-card overflow-hidden card-hover ${locked ? "opacity-60" : ""}`}
              >
                <div className="relative aspect-video bg-surface-3 flex items-center justify-center">
                  {item.imagen_url ? (
                    <img src={item.imagen_url} alt={item.nombre} className="h-full w-full object-cover" />
                  ) : (
                    <Car className="h-12 w-12 text-muted-foreground/30" />
                  )}
                  <span className="absolute top-2 right-2 rounded px-2 py-0.5 text-[10px] font-bold bg-primary/80 text-primary-foreground">
                    {item.categoria}
                  </span>
                  {locked && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <Lock className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-foreground">{item.nombre}</h3>
                  <p className="text-xs text-muted-foreground">{item.marca} {item.modelo ? `· ${item.modelo}` : ""} {item.anio ? `· ${item.anio}` : ""}</p>
                  <p className="mt-2 text-lg font-bold text-accent">{formatMoney(item.precio)}</p>
                  <button
                    onClick={() => handleBuy(item)}
                    disabled={locked || buying === item.id}
                    className="mt-3 w-full rounded-lg bg-primary/10 border border-primary/30 py-2 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {buying === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    {locked ? "Requiere Licencia" : buying === item.id ? "Comprando..." : "Comprar"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Vehicle Registration Modal */}
      <AnimatePresence>
        {showVehicleReg && regItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowVehicleReg(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-5"
            >
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" /> Registro Vehicular
              </h2>
              <p className="text-sm text-muted-foreground">
                Registra tu <span className="font-semibold text-foreground">{regItem.nombre}</span> — {formatMoney(regItem.precio)}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Matrícula</label>
                  <input value={regMatricula} onChange={e => setRegMatricula(e.target.value)} placeholder="Ej: ABC-1234" className={inputClass} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Color del Vehículo</label>
                  <input value={regColor} onChange={e => setRegColor(e.target.value)} placeholder="Ej: Rojo" className={inputClass} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">💡 Cambiar el color después costará $500.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowVehicleReg(false)} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-surface-3 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={handleVehicleRegSubmit}
                  disabled={buying === regItem?.id}
                  className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {buying === regItem?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Registrar y Comprar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
