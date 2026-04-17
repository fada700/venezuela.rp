import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Home, Building2, Loader2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/hooks/useData";

type Property = {
  id: string;
  nombre: string;
  direccion: string;
  precio: number;
  impuesto_mensual: number;
  disponible: boolean;
  imagen_url: string | null;
  tipo: string;
  owner_name: string | null;
  owner_roblox: string | null;
};

const tabs = ["Todos", "Viviendas", "Negocios", "Disponibles", "Vendidos"];

export default function PortalCasas() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Todos");

  useEffect(() => {
    const fetchProperties = async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*, citizens:owner_citizen_id(nombre, apellido_paterno, roblox_nickname)")
        .order("disponible", { ascending: false })
        .order("precio", { ascending: true });

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
          owner_name: p.citizens ? `${p.citizens.nombre} ${p.citizens.apellido_paterno}` : null,
          owner_roblox: p.citizens?.roblox_nickname || null,
        })));
      }
      setLoading(false);
    };
    fetchProperties();
  }, []);

  const filtered = properties.filter(p => {
    if (activeTab === "Viviendas") return p.tipo === "vivienda";
    if (activeTab === "Negocios") return p.tipo === "negocio";
    if (activeTab === "Disponibles") return p.disponible;
    if (activeTab === "Vendidos") return !p.disponible;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Home className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Portal Inmobiliario</h1>
            <p className="text-xs text-muted-foreground">Venezuela Roleplay — Viviendas y Negocios</p>
          </div>
          <div className="ml-auto flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" /> {properties.filter(p => p.disponible).length} disponibles</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> {properties.filter(p => !p.disponible).length} vendidos</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:bg-accent/10 hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Home className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
            <h2 className="text-lg font-semibold text-foreground">Sin propiedades</h2>
            <p className="text-sm text-muted-foreground mt-1">No hay propiedades en esta categoría</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((prop, i) => (
              <motion.div
                key={prop.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-xl border bg-card overflow-hidden ${prop.disponible ? "border-border" : "border-destructive/30"}`}
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
                    prop.disponible ? "bg-accent/80 text-accent-foreground" : "bg-destructive/80 text-destructive-foreground"
                  }`}>
                    {prop.disponible ? "Disponible" : "Vendido"}
                  </span>
                  <span className="absolute top-2 right-2 rounded px-2 py-0.5 text-[10px] font-bold bg-primary/80 text-primary-foreground capitalize">
                    {prop.tipo}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-foreground">{prop.nombre}</h3>
                  <p className="text-xs text-muted-foreground">{prop.direccion}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-lg font-bold text-accent">{formatMoney(prop.precio)}</p>
                    {prop.impuesto_mensual > 0 && (
                      <p className="text-[10px] text-muted-foreground">Impuesto: {formatMoney(prop.impuesto_mensual)}/mes</p>
                    )}
                  </div>
                  {!prop.disponible && prop.owner_name && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2">
                      <User className="h-3 w-3 text-destructive" />
                      <p className="text-xs text-destructive font-medium">
                        Propietario: {prop.owner_roblox || prop.owner_name}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
