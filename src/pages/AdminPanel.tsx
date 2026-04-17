import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, Search, Plus, Trash2, Edit2, Save, X, Loader2, Users, UserPlus,
  Home, Store, Building2, Package, Eye, EyeOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/hooks/useData";

type OfficerRow = {
  id: string; placa: string; rango: string; departamento: string;
  salario: number; en_servicio: boolean; citizen_id: string;
  citizen_name: string; roblox_nickname: string;
};
type CitizenOption = {
  id: string; nombre: string; apellido_paterno: string;
  roblox_nickname: string; folio_dni: string;
};

const RANGOS = ["Cadete", "Oficial", "Detective", "Sargento", "Teniente", "Capitán", "Comandante", "Jefe"];
const DEPARTAMENTOS = ["RCPD", "RCSD", "FBI", "DEA", "EMS"];
const STORE_CATEGORIES = ["Concesionario", "Objetos", "Armas", "Ilícito", "Licencias"];
const PROPERTY_TYPES = ["vivienda", "negocio"];

const adminTabs = [
  { id: "officers", label: "Oficiales", icon: Shield },
  { id: "store", label: "Tienda", icon: Store },
  { id: "properties", label: "Propiedades", icon: Home },
];

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("officers");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/ad-login"); return; }
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleData) { navigate("/ad-login"); return; }
      sessionStorage.setItem("admin_auth", "true");
      setAuthChecked(true);
    };
    check();
  }, [navigate]);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Shield className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-xl font-bold">Panel de Administración</h1>
              <p className="text-xs text-muted-foreground">Venezuela Roleplay</p>
            </div>
          </div>
          <div className="flex gap-2">
            {adminTabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent/10"
                }`}>
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => { sessionStorage.removeItem("admin_auth"); navigate("/ad-login"); }}>
            Cerrar Sesión
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "officers" && <OfficerManager />}
        {activeTab === "store" && <StoreManager />}
        {activeTab === "properties" && <PropertyManager />}
      </div>
    </div>
  );
}

/* ===================== OFFICER MANAGER ===================== */
function OfficerManager() {
  const [officers, setOfficers] = useState<OfficerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<OfficerRow>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [citizenSearch, setCitizenSearch] = useState("");
  const [citizenResults, setCitizenResults] = useState<CitizenOption[]>([]);
  const [selectedCitizen, setSelectedCitizen] = useState<CitizenOption | null>(null);
  const [newPlaca, setNewPlaca] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newRango, setNewRango] = useState("Cadete");
  const [newDepto, setNewDepto] = useState("RCPD");
  const [newSalario, setNewSalario] = useState("2500");
  const [creating, setCreating] = useState(false);

  const fetchOfficers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("officers")
      .select("id, placa, rango, departamento, salario, en_servicio, citizen_id, citizens!officers_citizen_id_fkey(nombre, apellido_paterno, roblox_nickname)")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setOfficers(data.map((o: any) => ({
        ...o,
        citizen_name: o.citizens ? `${o.citizens.nombre} ${o.citizens.apellido_paterno}` : "Desconocido",
        roblox_nickname: o.citizens?.roblox_nickname || "N/A",
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchOfficers(); }, []);

  const searchCitizens = async (q: string) => {
    setCitizenSearch(q);
    if (q.length < 2) { setCitizenResults([]); return; }
    const { data } = await supabase.from("citizens")
      .select("id, nombre, apellido_paterno, roblox_nickname, folio_dni")
      .or(`roblox_nickname.ilike.%${q}%,nombre.ilike.%${q}%,folio_dni.ilike.%${q}%`)
      .limit(5);
    setCitizenResults(data || []);
  };

  const handleCreate = async () => {
    if (!selectedCitizen || !newPlaca || !newPassword) { toast.error("Completa todos los campos"); return; }
    setCreating(true);
    const { data: existing } = await supabase.from("officers").select("id").eq("citizen_id", selectedCitizen.id).maybeSingle();
    if (existing) { toast.error("Este ciudadano ya es oficial"); setCreating(false); return; }
    const { data: citizenData } = await supabase.from("citizens").select("user_id").eq("id", selectedCitizen.id).single();
    const { error } = await supabase.from("officers").insert({
      citizen_id: selectedCitizen.id, placa: newPlaca.trim().toUpperCase(), contrasena_hash: newPassword.trim(),
      rango: newRango, departamento: newDepto, salario: parseInt(newSalario),
    });
    if (error) { toast.error(error.message); setCreating(false); return; }
    if (citizenData?.user_id) {
      await supabase.from("user_roles").insert({ user_id: citizenData.user_id, role: "officer" as any });
    }
    toast.success(`Oficial creado: ${selectedCitizen.roblox_nickname}`);
    setShowCreate(false); setSelectedCitizen(null); setNewPlaca(""); setNewPassword("");
    setCreating(false); fetchOfficers();
  };

  const saveEdit = async (id: string) => {
    await supabase.from("officers").update({
      rango: editData.rango, departamento: editData.departamento,
      salario: editData.salario, placa: editData.placa?.trim().toUpperCase(),
    }).eq("id", id);
    toast.success("Actualizado"); setEditingId(null); fetchOfficers();
  };

  const deleteOfficer = async (o: OfficerRow) => {
    if (!confirm(`¿Eliminar ${o.citizen_name}?`)) return;
    await supabase.from("officers").delete().eq("id", o.id);
    const { data: c } = await supabase.from("citizens").select("user_id").eq("id", o.citizen_id).single();
    if (c?.user_id) await supabase.from("user_roles").delete().eq("user_id", c.user_id).eq("role", "officer");
    toast.success("Eliminado"); fetchOfficers();
  };

  const filtered = officers.filter(o => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return o.citizen_name.toLowerCase().includes(q) || o.roblox_nickname.toLowerCase().includes(q) || o.placa.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{officers.length}</p><p className="text-xs text-muted-foreground">Total Oficiales</p></div></div></div>
        <div className="bg-card border border-border rounded-xl p-5"><div className="flex items-center gap-3"><Shield className="h-5 w-5 text-accent" /><div><p className="text-2xl font-bold">{officers.filter(o => o.en_servicio).length}</p><p className="text-xs text-muted-foreground">En Servicio</p></div></div></div>
        <div className="bg-card border border-border rounded-xl p-5"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-warning" /><div><p className="text-2xl font-bold">{new Set(officers.map(o => o.departamento)).size}</p><p className="text-xs text-muted-foreground">Departamentos</p></div></div></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="gap-2"><UserPlus className="h-4 w-4" /> Nuevo Oficial</Button>
      </div>

      {showCreate && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-4"><Plus className="h-4 w-4 inline mr-1" /> Nuevo Oficial</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm text-muted-foreground mb-1 block">Buscar Ciudadano (username discord/roblox)</label>
              {selectedCitizen ? (
                <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg px-3 py-2">
                  <span className="font-medium">{selectedCitizen.nombre} {selectedCitizen.apellido_paterno}</span>
                  <span className="text-sm text-muted-foreground">({selectedCitizen.roblox_nickname})</span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCitizen(null)} className="ml-auto"><X className="h-3 w-3" /></Button>
                </div>
              ) : (
                <div className="relative">
                  <Input placeholder="Nombre, Roblox o DNI..." value={citizenSearch} onChange={e => searchCitizens(e.target.value)} />
                  {citizenResults.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg overflow-hidden shadow-lg">
                      {citizenResults.map(c => (
                        <button key={c.id} onClick={() => { setSelectedCitizen(c); setCitizenResults([]); setCitizenSearch(""); }}
                          className="w-full px-4 py-2 text-left hover:bg-muted/50 flex justify-between">
                          <span>{c.nombre} {c.apellido_paterno}</span><span className="text-xs text-muted-foreground">{c.roblox_nickname}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Placa</label><Input placeholder="RC-001" value={newPlaca} onChange={e => setNewPlaca(e.target.value.toUpperCase())} /></div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Contraseña MDT</label>
              <div className="relative">
                <Input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="pr-11" />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Rango</label>
              <Select value={newRango} onValueChange={setNewRango}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RANGOS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Departamento</label>
              <Select value={newDepto} onValueChange={setNewDepto}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DEPARTAMENTOS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Salario Semanal</label><Input type="number" value={newSalario} onChange={e => setNewSalario(e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>{creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Crear</Button>
          </div>
        </motion.div>
      )}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Roblox</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Placa</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Rango</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Depto</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Salario</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Acciones</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Sin oficiales</td></tr>
                ) : filtered.map(o => (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{o.citizen_name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{o.roblox_nickname}</td>
                    <td className="px-4 py-3">
                      {editingId === o.id ? <Input value={editData.placa||""} onChange={e => setEditData({...editData, placa: e.target.value})} className="h-8 w-24" />
                        : <span className="px-2 py-1 rounded bg-primary/10 text-primary text-sm font-mono">{o.placa}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === o.id ? <Select value={editData.rango} onValueChange={v => setEditData({...editData, rango: v})}><SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger><SelectContent>{RANGOS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
                        : <span className="text-sm">{o.rango}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === o.id ? <Select value={editData.departamento} onValueChange={v => setEditData({...editData, departamento: v})}><SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger><SelectContent>{DEPARTAMENTOS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
                        : <span className="text-sm">{o.departamento}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === o.id ? <Input type="number" value={editData.salario||0} onChange={e => setEditData({...editData, salario: parseInt(e.target.value)})} className="h-8 w-24" />
                        : <span className="text-sm font-mono">${o.salario.toLocaleString()}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${o.en_servicio ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${o.en_servicio ? "bg-accent" : "bg-muted-foreground"}`} /> {o.en_servicio ? "En Servicio" : "Fuera"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingId === o.id ? (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => saveEdit(o.id)}><Save className="h-4 w-4 text-accent" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setEditingId(o.id); setEditData({ rango: o.rango, departamento: o.departamento, salario: o.salario, placa: o.placa }); }}><Edit2 className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteOfficer(o)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== STORE MANAGER ===================== */
function StoreManager() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newItem, setNewItem] = useState({ nombre: "", categoria: "Concesionario", marca: "", modelo: "", anio: "", precio: "", imagen_url: "" });

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase.from("store_items").select("*").order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { fetchItems(); }, []);

  const handleCreate = async () => {
    if (!newItem.nombre || !newItem.precio) { toast.error("Nombre y precio requeridos"); return; }
    setCreating(true);
    const { error } = await supabase.from("store_items").insert({
      nombre: newItem.nombre, categoria: newItem.categoria,
      marca: newItem.marca || null, modelo: newItem.modelo || null,
      anio: newItem.anio ? parseInt(newItem.anio) : null,
      precio: parseInt(newItem.precio), imagen_url: newItem.imagen_url || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Item creado"); setShowCreate(false); setNewItem({ nombre: "", categoria: "Concesionario", marca: "", modelo: "", anio: "", precio: "", imagen_url: "" }); fetchItems(); }
    setCreating(false);
  };

  const deleteItem = async (id: string) => {
    if (!confirm("¿Eliminar item?")) return;
    await supabase.from("store_items").delete().eq("id", id);
    toast.success("Eliminado"); fetchItems();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold flex items-center gap-2"><Store className="h-5 w-5 text-primary" /> Gestión de Tienda ({items.length} items)</h2>
        <Button onClick={() => setShowCreate(!showCreate)} className="gap-2"><Plus className="h-4 w-4" /> Nuevo Item</Button>
      </div>

      {showCreate && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="text-sm text-muted-foreground mb-1 block">Nombre</label><Input value={newItem.nombre} onChange={e => setNewItem({...newItem, nombre: e.target.value})} /></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Categoría</label>
              <Select value={newItem.categoria} onValueChange={v => setNewItem({...newItem, categoria: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STORE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Precio ($)</label><Input type="number" value={newItem.precio} onChange={e => setNewItem({...newItem, precio: e.target.value})} /></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Marca</label><Input value={newItem.marca} onChange={e => setNewItem({...newItem, marca: e.target.value})} /></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Modelo</label><Input value={newItem.modelo} onChange={e => setNewItem({...newItem, modelo: e.target.value})} /></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Año</label><Input type="number" value={newItem.anio} onChange={e => setNewItem({...newItem, anio: e.target.value})} /></div>
            <div className="md:col-span-3"><label className="text-sm text-muted-foreground mb-1 block">URL Imagen</label><Input value={newItem.imagen_url} onChange={e => setNewItem({...newItem, imagen_url: e.target.value})} placeholder="https://..." /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>{creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Crear Item</Button>
          </div>
        </motion.div>
      )}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-card border border-border rounded-xl p-4 relative group">
              <button onClick={() => deleteItem(item.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-destructive/10 hover:bg-destructive/20">
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
              <div className="aspect-video bg-surface-3 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                {item.imagen_url ? <img src={item.imagen_url} alt="" className="h-full w-full object-cover" /> : <Package className="h-8 w-8 text-muted-foreground/30" />}
              </div>
              <h3 className="text-sm font-semibold">{item.nombre}</h3>
              <p className="text-xs text-muted-foreground">{item.categoria} · {item.marca} {item.modelo}</p>
              <p className="text-sm font-bold text-accent mt-1">{formatMoney(item.precio)}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.activo ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"}`}>
                {item.activo ? "Activo" : "Inactivo"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===================== PROPERTY MANAGER ===================== */
function PropertyManager() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"nuevos" | "precio_asc" | "precio_desc">("nuevos");
  const [newProp, setNewProp] = useState({ nombre: "", direccion: "", precio: "", impuesto_mensual: "0", tipo: "vivienda", imagen_url: "" });

  const fetchProperties = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("properties")
      .select("*, citizens:owner_citizen_id(roblox_nickname, nombre, apellido_paterno)")
      .order("created_at", { ascending: false });
    setProperties(data || []);
    setLoading(false);
  };
  useEffect(() => { fetchProperties(); }, []);

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagen máx 5MB"); return; }
    setUploadingImg(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `properties/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("evidence").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("evidence").getPublicUrl(path);
      setNewProp({ ...newProp, imagen_url: pub.publicUrl });
      toast.success("Imagen subida");
    } catch (err: any) {
      toast.error(err.message || "Error al subir imagen");
    } finally {
      setUploadingImg(false);
    }
  };

  const handleCreate = async () => {
    if (!newProp.nombre || !newProp.direccion || !newProp.precio) { toast.error("Completa nombre, dirección y precio"); return; }
    setCreating(true);
    const { error } = await supabase.from("properties").insert({
      nombre: newProp.nombre, direccion: newProp.direccion,
      precio: parseInt(newProp.precio), impuesto_mensual: parseInt(newProp.impuesto_mensual) || 0,
      tipo: newProp.tipo, imagen_url: newProp.imagen_url || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Propiedad creada");
      setShowCreate(false);
      setNewProp({ nombre: "", direccion: "", precio: "", impuesto_mensual: "0", tipo: "vivienda", imagen_url: "" });
      fetchProperties();
    }
    setCreating(false);
  };

  const deleteProperty = async (id: string) => {
    if (!confirm("¿Eliminar propiedad?")) return;
    await supabase.from("properties").delete().eq("id", id);
    toast.success("Eliminada"); fetchProperties();
  };

  const releaseProperty = async (id: string) => {
    if (!confirm("¿Liberar esta propiedad? El propietario actual la perderá.")) return;
    const { error } = await supabase.from("properties")
      .update({ owner_citizen_id: null, disponible: true })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Propiedad liberada"); fetchProperties();
  };

  let filtered = properties.filter(p => {
    if (filterTipo !== "todos" && p.tipo !== filterTipo) return false;
    if (filterEstado === "disponibles" && !p.disponible) return false;
    if (filterEstado === "vendidas" && p.disponible) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.nombre.toLowerCase().includes(q) && !p.direccion.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "precio_asc") return a.precio - b.precio;
    if (sortBy === "precio_desc") return b.precio - a.precio;
    return 0;
  });

  const stats = {
    total: properties.length,
    casas: properties.filter(p => p.tipo === "vivienda").length,
    negocios: properties.filter(p => p.tipo === "negocio").length,
    disponibles: properties.filter(p => p.disponible).length,
    vendidas: properties.filter(p => !p.disponible).length,
    valor_total: properties.reduce((s, p) => s + (p.precio || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-card border border-border rounded-xl p-4"><p className="text-xl font-bold text-primary">{stats.total}</p><p className="text-[10px] text-muted-foreground uppercase">Total</p></div>
        <div className="bg-card border border-border rounded-xl p-4"><p className="text-xl font-bold">{stats.casas}</p><p className="text-[10px] text-muted-foreground uppercase">Casas</p></div>
        <div className="bg-card border border-border rounded-xl p-4"><p className="text-xl font-bold">{stats.negocios}</p><p className="text-[10px] text-muted-foreground uppercase">Negocios</p></div>
        <div className="bg-card border border-border rounded-xl p-4"><p className="text-xl font-bold text-accent">{stats.disponibles}</p><p className="text-[10px] text-muted-foreground uppercase">Disponibles</p></div>
        <div className="bg-card border border-border rounded-xl p-4"><p className="text-xl font-bold text-destructive">{stats.vendidas}</p><p className="text-[10px] text-muted-foreground uppercase">Vendidas</p></div>
        <div className="bg-card border border-border rounded-xl p-4"><p className="text-sm font-bold text-warning">{formatMoney(stats.valor_total)}</p><p className="text-[10px] text-muted-foreground uppercase">Valor total</p></div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-lg font-bold flex items-center gap-2"><Home className="h-5 w-5 text-primary" /> Gestión de Propiedades</h2>
        <Button onClick={() => setShowCreate(!showCreate)} className="gap-2"><Plus className="h-4 w-4" /> Nueva Propiedad</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o dirección..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="vivienda">Casas</SelectItem>
            <SelectItem value="negocio">Negocios</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="disponibles">Disponibles</SelectItem>
            <SelectItem value="vendidas">Vendidas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="nuevos">Más recientes</SelectItem>
            <SelectItem value="precio_asc">Precio ↑</SelectItem>
            <SelectItem value="precio_desc">Precio ↓</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showCreate && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Nueva Propiedad</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="text-sm text-muted-foreground mb-1 block">Nombre</label><Input value={newProp.nombre} onChange={e => setNewProp({...newProp, nombre: e.target.value})} placeholder="Casa Vista al Mar" /></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Dirección</label><Input value={newProp.direccion} onChange={e => setNewProp({...newProp, direccion: e.target.value})} placeholder="Av. Principal 123" /></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Tipo</label>
              <Select value={newProp.tipo} onValueChange={v => setNewProp({...newProp, tipo: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vivienda">Casa / Vivienda</SelectItem>
                  <SelectItem value="negocio">Negocio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Precio ($)</label><Input type="number" value={newProp.precio} onChange={e => setNewProp({...newProp, precio: e.target.value})} /></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Impuesto Mensual ($)</label><Input type="number" value={newProp.impuesto_mensual} onChange={e => setNewProp({...newProp, impuesto_mensual: e.target.value})} /></div>
            <div className="md:col-span-3">
              <label className="text-sm text-muted-foreground mb-1 block">Imagen</label>
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="flex-1 w-full">
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={uploadingImg}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">O pega una URL abajo. Máx 5MB.</p>
                  <Input className="mt-2" value={newProp.imagen_url} onChange={e => setNewProp({...newProp, imagen_url: e.target.value})} placeholder="https://..." />
                </div>
                {newProp.imagen_url && (
                  <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-border">
                    <img src={newProp.imagen_url} alt="" className="h-full w-full object-cover" />
                    <button onClick={() => setNewProp({...newProp, imagen_url: ""})} className="absolute top-1 right-1 bg-destructive/80 text-destructive-foreground rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {uploadingImg && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || uploadingImg}>{creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Crear</Button>
          </div>
        </motion.div>
      )}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><Home className="mx-auto h-10 w-10 mb-2 opacity-30" />Sin propiedades</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className={`bg-card border rounded-xl overflow-hidden relative group flex flex-col ${p.disponible ? "border-border" : "border-destructive/30"}`}>
              <div className="aspect-video bg-surface-3 flex items-center justify-center overflow-hidden relative">
                {p.imagen_url ? <img src={p.imagen_url} alt="" className="h-full w-full object-cover" /> :
                  p.tipo === "negocio" ? <Building2 className="h-10 w-10 text-muted-foreground/30" /> : <Home className="h-10 w-10 text-muted-foreground/30" />}
                <span className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${p.disponible ? "bg-accent/80 text-accent-foreground" : "bg-destructive/80 text-destructive-foreground"}`}>
                  {p.disponible ? "Disponible" : "Vendido"}
                </span>
                <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary/80 text-primary-foreground capitalize">
                  {p.tipo === "negocio" ? "Negocio" : "Casa"}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-sm font-semibold">{p.nombre}</h3>
                <p className="text-xs text-muted-foreground">{p.direccion}</p>
                <p className="text-sm font-bold text-accent mt-2">{formatMoney(p.precio)}</p>
                {p.impuesto_mensual > 0 && (
                  <p className="text-[10px] text-muted-foreground">Impuesto: {formatMoney(p.impuesto_mensual)}/mes</p>
                )}
                {!p.disponible && p.citizens?.roblox_nickname && (
                  <p className="text-xs text-destructive mt-1">Propietario: {p.citizens.roblox_nickname}</p>
                )}
                <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                  {!p.disponible && (
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => releaseProperty(p.id)}>
                      Liberar
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => deleteProperty(p.id)}>
                    <Trash2 className="h-3 w-3 mr-1 text-destructive" /> Eliminar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
