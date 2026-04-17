import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Home, Building2, Loader2, User, MapPin, DollarSign, ShoppingCart, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, useCitizen } from "@/hooks/useData";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Property = {
  id: string;
  nombre: string;
  direccion: string;
  precio: number;
  impuesto_mensual: number;
  disponible: boolean;
  imagen_url: string | null;
  tipo: string;
  owner_citizen_id: string | null;
  owner_name: string | null;
  owner_roblox: string | null;
};

const tabs = [
  { id: "Todos", label: "Todos" },
  { id: "Casas", label: "Casas" },
  { id: "Negocios", label: "Negocios" },
  { id: "Disponibles", label: "Disponibles" },
  { id: "Vendidos", label: "Vendidos" },
  { id: "Mias", label: "Mías" },
];

const sortOptions = [
  { id: "precio_asc", label: "Precio ↑" },
  { id: "precio_desc", label: "Precio ↓" },
  { id: "nuevos", label: "Más recientes" },
];

export default function Propiedades() {
  const { data: citizen } = useCitizen();
  const queryClient = useQueryClient();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Todos");
  const [sortBy, setSortBy] = useState("precio_asc");
  const [buying, setBuying] = useState<string | null>(null);

  const fetchProperties = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("properties")
      .select("*, citizens:owner_citizen_id(nombre, apellido_paterno, roblox_nickname)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProperties(data.map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        direccion: p.direccion,
        precio: p.precio,
        impuesto_mensual: p.impuesto_mensual,
        disponible: p.disponible,
        imagen_url: p.imagen_url,
        tipo: p.tipo || "vivienda",
        owner_citizen_id: p.owner_citizen_id,
        owner_name: p.citizens ? `${p.citizens.nombre} ${p.citizens.apellido_paterno}` : null,
        owner_roblox: p.citizens?.roblox_nickname || null,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchProperties(); }, []);

  const buyProperty = async (prop: Property) => {
    if (!citizen) { toast.error("Necesitas una cédula"); return; }
    if (citizen.balance < prop.precio) { toast.error("Saldo insuficiente"); return; }
    if (!confirm(`¿Comprar ${prop.nombre} por ${formatMoney(prop.precio)}?`)) return;
    setBuying(prop.id);
    try {
      const { data, error } = await supabase.functions.invoke("buy-property", {
        body: { property_id: prop.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`¡Felicidades! Compraste ${prop.nombre}`);
      await fetchProperties();
      queryClient.invalidateQueries({ queryKey: ["citizen"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (err: any) {
      toast.error(err.message || "Error al comprar");
    } finally {
      setBuying(null);
    }
  };

  let filtered = properties.filter(p => {
    if (activeTab === "Casas") return p.tipo === "vivienda";
    if (activeTab === "Negocios") return p.tipo === "negocio";
    if (activeTab === "Disponibles") return p.disponible;
    if (activeTab === "Vendidos") return !p.disponible;
    if (activeTab === "Mias") return citizen && p.owner_citizen_id === citizen.id;
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "precio_asc") return a.precio - b.precio;
    if (sortBy === "precio_desc") return b.precio - a.precio;
    return 0;
  });

  const stats = {
    total: properties.length,
    disponibles: properties.filter(p => p.disponible).length,
    vendidos: properties.filter(p => !p.disponible).length,
    mias: citizen ? properties.filter(p => p.owner_citizen_id === citizen.id).length : 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Home className="h-6 w-6 text-primary" /> Propiedades
          </h1>
          <p className="text-sm text-muted-foreground">Casas, negocios y bienes raíces de Venezuela RP</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-primary", icon: Home },
          { label: "Disponibles", value: stats.disponibles, color: "text-accent", icon: CheckCircle2 },
          { label: "Vendidas", value: stats.vendidos, color: "text-destructive", icon: User },
          { label: "Tuyas", value: stats.mias, color: "text-warning", icon: Building2 },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <s.icon className={`h-5 w-5 ${s.color}`} />
            <div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:bg-surface-3 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {sortOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${
                sortBy === opt.id
                  ? "bg-accent/20 text-accent border border-accent/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Home className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Sin propiedades</h2>
          <p className="text-sm text-muted-foreground mt-1">No hay propiedades en esta categoría</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((prop, i) => {
            const isMine = citizen && prop.owner_citizen_id === citizen.id;
            return (
              <motion.div
                key={prop.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-xl border bg-card overflow-hidden flex flex-col ${
                  isMine ? "border-warning/40" : prop.disponible ? "border-border" : "border-destructive/30"
                }`}
              >
                <div className="relative aspect-video bg-surface-3 flex items-center justify-center">
                  {prop.imagen_url ? (
                    <img src={prop.imagen_url} alt={prop.nombre} className="h-full w-full object-cover" />
                  ) : (
                    prop.tipo === "negocio"
                      ? <Building2 className="h-12 w-12 text-muted-foreground/30" />
                      : <Home className="h-12 w-12 text-muted-foreground/30" />
                  )}
                  <span className={`absolute top-2 left-2 rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                    isMine ? "bg-warning/80 text-warning-foreground"
                      : prop.disponible ? "bg-accent/80 text-accent-foreground"
                      : "bg-destructive/80 text-destructive-foreground"
                  }`}>
                    {isMine ? "Tuya" : prop.disponible ? "Disponible" : "Vendido"}
                  </span>
                  <span className="absolute top-2 right-2 rounded px-2 py-0.5 text-[10px] font-bold bg-primary/80 text-primary-foreground capitalize">
                    {prop.tipo === "negocio" ? "Negocio" : "Casa"}
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-sm font-semibold text-foreground">{prop.nombre}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> {prop.direccion}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-lg font-bold text-accent">{formatMoney(prop.precio)}</p>
                    {prop.impuesto_mensual > 0 && (
                      <p className="text-[10px] text-muted-foreground">Impuesto: {formatMoney(prop.impuesto_mensual)}/mes</p>
                    )}
                  </div>
                  {!prop.disponible && !isMine && prop.owner_roblox && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2">
                      <User className="h-3 w-3 text-destructive" />
                      <p className="text-xs text-destructive font-medium">{prop.owner_roblox}</p>
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-border/50">
                    {isMine ? (
                      <div className="text-center text-xs text-warning font-semibold">✓ Propiedad tuya</div>
                    ) : prop.disponible ? (
                      <Button
                        size="sm"
                        className="w-full gap-1"
                        disabled={buying === prop.id || !citizen || citizen.balance < prop.precio}
                        onClick={() => buyProperty(prop)}
                      >
                        {buying === prop.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShoppingCart className="h-3 w-3" />}
                        {citizen && citizen.balance < prop.precio ? "Saldo insuficiente" : "Comprar"}
                      </Button>
                    ) : (
                      <div className="text-center text-xs text-muted-foreground">No disponible</div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
