import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import {
  Shield, Search, Car, FileWarning, Phone, MessageSquare,
  Clock, AlertTriangle, LogOut, Send, Loader2, Upload, UserCheck,
  ChevronRight, X, Coffee, Play, Square, Users, Gavel, Trash2
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatMoney } from "@/hooks/useData";

type Officer = {
  id: string;
  placa: string;
  rango: string;
  departamento: string;
  citizen_id: string;
  nombre: string;
  roblox_nickname: string;
};

const tabs = [
  { id: "search", label: "Ciudadanos", icon: Search },
  { id: "vehicles", label: "Vehículos", icon: Car },
  { id: "fines", label: "Multas", icon: FileWarning },
  { id: "arrests", label: "Arrestos", icon: Gavel },
  { id: "911", label: "911", icon: Phone },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "shifts", label: "Turnos", icon: Clock },
  { id: "wanted", label: "Buscados", icon: AlertTriangle },
];

const hqSupabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "hq-dashboard-session",
    },
  },
);

function getStoredOfficer(): Officer | null {
  try {
    const stored = sessionStorage.getItem("hq_officer");
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (!parsed?.id || !parsed?.placa || !parsed?.citizen_id) return null;

    return parsed as Officer;
  } catch {
    return null;
  }
}

export default function HQDashboard() {
  const navigate = useNavigate();
  const [officer, setOfficer] = useState<Officer | null>(null);
  const [activeTab, setActiveTab] = useState("search");

  useEffect(() => {
    const init = async () => {
      const storedOfficer = getStoredOfficer();
      if (!storedOfficer) {
        sessionStorage.removeItem("hq_officer");
        navigate("/hq-login");
        return;
      }

      // Verify we have a valid auth session
      const { data: { session } } = await hqSupabase.auth.getSession();
      if (!session) {
        console.warn("No auth session found for MDT, redirecting to login");
        sessionStorage.removeItem("hq_officer");
        navigate("/hq-login");
        return;
      }

      setOfficer(storedOfficer);
    };
    init();
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem("hq_officer");
    navigate("/hq-login");
  };

  if (!officer) return null;

  return (
    <div className="flex min-h-screen bg-[#0a0e1a]">
      {/* Sidebar */}
      <div className="w-64 border-r border-white/10 bg-white/5 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-sm font-bold text-white">MDT — {officer.departamento}</p>
              <p className="text-xs text-slate-400">{officer.rango} • {officer.placa}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                activeTab === t.id
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <Button variant="ghost" onClick={handleLogout} className="w-full text-slate-400 hover:text-red-400">
            <LogOut className="h-4 w-4 mr-2" /> Cerrar Sesión
          </Button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 p-6 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
            {activeTab === "search" && <CitizenSearch />}
            {activeTab === "vehicles" && <VehicleSearch />}
            {activeTab === "fines" && <FinePanel officer={officer} />}
            {activeTab === "arrests" && <ArrestPanel officer={officer} />}
            {activeTab === "911" && <Panel911 officer={officer} />}
            {activeTab === "chat" && <PoliceChat officer={officer} />}
            {activeTab === "shifts" && <ShiftPanel officer={officer} />}
            {activeTab === "wanted" && <WantedPanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ===================== CITIZEN SEARCH ===================== */
function CitizenSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [fines, setFines] = useState<any[]>([]);
  const [arrests, setArrests] = useState<any[]>([]);
  const [wanted, setWanted] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showDanger, setShowDanger] = useState(false);
  const [dangerReason, setDangerReason] = useState("");
  const [dangerPriority, setDangerPriority] = useState("media");
  const [submittingDanger, setSubmittingDanger] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSelected(null);
    const q = query.trim();
    const { data, error } = await hqSupabase
      .from("citizens")
      .select("*")
      .or(`folio_dni.ilike.%${q}%,roblox_nickname.ilike.%${q}%,nombre.ilike.%${q}%,apellido_paterno.ilike.%${q}%`);
    if (error) { toast.error("Error al buscar: " + error.message); }
    setResults(data || []);
    if (data?.length === 0) toast.info("Ciudadano no encontrado");
    setLoading(false);
  };

  const selectCitizen = async (c: any) => {
    setSelected(c);
    const [licRes, fineRes, arrRes, wantRes] = await Promise.all([
      hqSupabase.from("licenses").select("*").eq("citizen_id", c.id),
      hqSupabase.from("fines").select("*").eq("citizen_id", c.id).order("created_at", { ascending: false }),
      hqSupabase.from("arrests").select("*").eq("citizen_id", c.id).order("created_at", { ascending: false }),
      hqSupabase.from("wanted_list").select("*").eq("citizen_id", c.id).eq("activo", true).maybeSingle(),
    ]);
    setLicenses(licRes.data || []);
    setFines(fineRes.data || []);
    setArrests(arrRes.data || []);
    setWanted(wantRes.data);
  };

  const markDangerous = async () => {
    if (!selected || !dangerReason) { toast.error("Escribe un motivo"); return; }
    setSubmittingDanger(true);
    const { error } = await hqSupabase.from("wanted_list").insert({
      citizen_id: selected.id,
      razon: dangerReason,
      prioridad: dangerPriority,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Ciudadano marcado como buscado");
      setShowDanger(false);
      setDangerReason("");
      const { data: w } = await hqSupabase.from("wanted_list").select("*").eq("citizen_id", selected.id).eq("activo", true).maybeSingle();
      setWanted(w);
    }
    setSubmittingDanger(false);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Búsqueda de Ciudadanos</h2>
      <div className="flex gap-2 mb-4">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="DNI Folio / Roblox / Nombre" className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
        <Button onClick={search} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {results.length > 0 && !selected && (
        <div className="space-y-2">
          {results.map((c) => (
            <button key={c.id} onClick={() => selectCitizen(c)}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-colors">
              <div>
                <p className="text-white font-medium">{c.nombre} {c.apellido_paterno} {c.apellido_materno}</p>
                <p className="text-xs text-slate-400">DNI: {c.folio_dni} • Roblox: {c.roblox_nickname}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="space-y-4">
          <button onClick={() => setSelected(null)} className="text-sm text-blue-400 hover:underline">← Volver</button>

          {wanted && (
            <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4">
              <div className="flex items-center gap-2 text-red-400 font-bold">
                <AlertTriangle className="h-5 w-5" /> CIUDADANO BUSCADO — {wanted.prioridad.toUpperCase()}
              </div>
              <p className="text-sm text-red-300 mt-1">{wanted.razon}</p>
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-lg font-bold text-white">{selected.nombre} {selected.apellido_paterno} {selected.apellido_materno}</h3>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <p className="text-slate-400">DNI Folio: <span className="text-white">{selected.folio_dni}</span></p>
              <p className="text-slate-400">RUT: <span className="text-white">{selected.rut}</span></p>
              <p className="text-slate-400">Roblox: <span className="text-white">{selected.roblox_nickname}</span></p>
              <p className="text-slate-400">Género: <span className="text-white">{selected.genero}</span></p>
              <p className="text-slate-400">Nacimiento: <span className="text-white">{selected.fecha_nacimiento}</span></p>
              <p className="text-slate-400">Balance: <span className="text-emerald-400">{formatMoney(selected.balance)}</span></p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h4 className="font-semibold text-white mb-2">Licencias ({licenses.length})</h4>
            {licenses.length === 0 ? <p className="text-sm text-slate-500">Sin licencias</p> :
              licenses.map((l) => (
                <div key={l.id} className="flex items-center justify-between text-sm py-1">
                  <span className="text-white">{l.tipo}</span>
                  <span className={l.activa ? "text-emerald-400" : "text-red-400"}>{l.activa ? "Activa" : "Suspendida"}</span>
                </div>
              ))
            }
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h4 className="font-semibold text-white mb-2">Multas ({fines.length})</h4>
            {fines.length === 0 ? <p className="text-sm text-slate-500">Sin multas</p> :
              fines.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-sm py-1 border-b border-white/5 last:border-0">
                  <span className="text-white">{f.razon}</span>
                  <span className={f.pagada ? "text-emerald-400" : "text-amber-400"}>{formatMoney(f.monto)} {f.pagada ? "✓" : "Pendiente"}</span>
                </div>
              ))
            }
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h4 className="font-semibold text-white mb-2">Arrestos ({arrests.length})</h4>
            {arrests.length === 0 ? <p className="text-sm text-slate-500">Sin arrestos</p> :
              arrests.map((a) => (
                <div key={a.id} className="text-sm py-1 border-b border-white/5 last:border-0">
                  <p className="text-white">{a.cargos}</p>
                  <p className="text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString("es-CL")}</p>
                </div>
              ))
            }
          </div>

          {/* Marcar como Peligroso */}
          {!wanted && (
            <div>
              {!showDanger ? (
                <Button onClick={() => setShowDanger(true)} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                  <AlertTriangle className="h-4 w-4 mr-1" /> Marcar como Peligroso
                </Button>
              ) : (
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-3">
                  <Textarea value={dangerReason} onChange={(e) => setDangerReason(e.target.value)} placeholder="Motivo de búsqueda"
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
                  <div className="flex gap-2">
                    {["baja", "media", "alta"].map((p) => (
                      <button key={p} onClick={() => setDangerPriority(p)}
                        className={`rounded-lg border px-3 py-1.5 text-sm capitalize ${dangerPriority === p ? (p === "alta" ? "bg-red-500/20 text-red-400 border-red-500/30" : p === "media" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30") : "border-white/10 text-slate-400"}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={markDangerous} disabled={submittingDanger} className="bg-red-600 hover:bg-red-700">
                      {submittingDanger ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowDanger(false)} className="text-slate-400">Cancelar</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ===================== VEHICLE SEARCH ===================== */
function VehicleSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    const q = query.trim().toUpperCase();

    let { data: vehicles } = await hqSupabase
      .from("vehicles")
      .select("*, citizens(nombre, apellido_paterno, folio_dni, roblox_nickname)")
      .or(`vin.ilike.%${q}%,matricula.ilike.%${q}%`);

    if (!vehicles?.length) {
      const { data: citizen } = await hqSupabase
        .from("citizens")
        .select("id")
        .eq("folio_dni", q)
        .maybeSingle();
      if (citizen) {
        const { data } = await hqSupabase
          .from("vehicles")
          .select("*, citizens(nombre, apellido_paterno, folio_dni, roblox_nickname)")
          .eq("citizen_id", citizen.id);
        vehicles = data;
      }
    }

    setResults(vehicles || []);
    if (!vehicles?.length) toast.info("Vehículo no encontrado");
    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Búsqueda de Vehículos</h2>
      <div className="flex gap-2 mb-4">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="VIN / Matrícula / DNI Folio" className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 uppercase" />
        <Button onClick={search} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((v) => (
            <div key={v.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">{v.marca} {v.modelo} {v.anio || ""}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${v.estado === "activo" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                  {v.estado}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
                <p className="text-slate-400">Matrícula: <span className="text-white">{v.matricula}</span></p>
                <p className="text-slate-400">VIN: <span className="text-white font-mono text-xs">{v.vin}</span></p>
                <p className="text-slate-400">Color: <span className="text-white">{v.color}</span></p>
                <p className="text-slate-400">Dueño: <span className="text-white">{v.citizens?.nombre} {v.citizens?.apellido_paterno}</span></p>
                <p className="text-slate-400">DNI: <span className="text-white">{v.citizens?.folio_dni}</span></p>
              </div>
            </div>
          ))}
        </div>
      )}
      {results.length === 0 && searched && !loading && (
        <p className="text-sm text-slate-500">Sin resultados</p>
      )}
    </div>
  );
}

/* ===================== FINE PANEL ===================== */
function FinePanel({ officer }: { officer: Officer }) {
  const [citizenQuery, setCitizenQuery] = useState("");
  const [citizenResults, setCitizenResults] = useState<any[]>([]);
  const [selectedCitizen, setSelectedCitizen] = useState<any>(null);
  const [razon, setRazon] = useState("");
  const [monto, setMonto] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const searchCitizen = async () => {
    if (!citizenQuery.trim()) return;
    const q = citizenQuery.trim();
    const { data } = await hqSupabase.from("citizens").select("id, nombre, apellido_paterno, folio_dni, roblox_nickname")
      .or(`folio_dni.ilike.%${q}%,roblox_nickname.ilike.%${q}%,nombre.ilike.%${q}%`);
    setCitizenResults(data || []);
    if (!data?.length) toast.info("Ciudadano no encontrado");
  };

  const submit = async () => {
    if (!selectedCitizen || !razon || !monto) { toast.error("Completa todos los campos"); return; }
    setSubmitting(true);

    let evidencia_url: string | null = null;
    if (evidenceFile) {
      const path = `fines/${Date.now()}_${evidenceFile.name}`;
      const { error: upErr } = await hqSupabase.storage.from("evidence").upload(path, evidenceFile);
      if (!upErr) {
        const { data: urlData } = hqSupabase.storage.from("evidence").getPublicUrl(path);
        evidencia_url = urlData.publicUrl;
      }
    }

    const folio = "MUL" + Math.random().toString(36).substring(2, 8).toUpperCase();

    const { error } = await hqSupabase.from("fines").insert({
      citizen_id: selectedCitizen.id,
      officer_id: officer.citizen_id,
      razon: `[${folio}] ${razon}`,
      monto: parseInt(monto),
      evidencia_url,
    });

    if (error) { toast.error(error.message); }
    else {
      toast.success(`Multa emitida con folio ${folio}`);
      setSelectedCitizen(null);
      setRazon("");
      setMonto("");
      setEvidenceFile(null);
      setCitizenQuery("");
      setCitizenResults([]);
    }
    setSubmitting(false);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Emitir Multa</h2>

      {!selectedCitizen ? (
        <>
          <div className="flex gap-2 mb-4">
            <Input value={citizenQuery} onChange={(e) => setCitizenQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchCitizen()}
              placeholder="Buscar ciudadano por DNI / Roblox / Nombre" className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
            <Button onClick={searchCitizen} className="bg-blue-600 hover:bg-blue-700"><Search className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-2">
            {citizenResults.map((c) => (
              <button key={c.id} onClick={() => setSelectedCitizen(c)}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10">
                <span className="text-white">{c.nombre} {c.apellido_paterno}</span>
                <span className="text-xs text-slate-400">{c.folio_dni}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-4 max-w-lg">
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 flex items-center justify-between">
            <div>
              <p className="text-white font-medium">{selectedCitizen.nombre} {selectedCitizen.apellido_paterno}</p>
              <p className="text-xs text-slate-400">DNI: {selectedCitizen.folio_dni}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedCitizen(null)}><X className="h-4 w-4 text-slate-400" /></Button>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Motivo</label>
            <Textarea value={razon} onChange={(e) => setRazon(e.target.value)} placeholder="Descripción de la infracción"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Monto ($)</label>
            <Input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Evidencia (opcional)</label>
            <Input type="file" accept="image/*" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
              className="bg-white/5 border-white/10 text-white" />
          </div>

          <Button onClick={submit} disabled={submitting} className="w-full bg-amber-600 hover:bg-amber-700">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Emitir Multa"}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ===================== ARREST PANEL ===================== */
const DURATION_OPTIONS = [
  { label: "20 minutos", value: 20 },
  { label: "40 minutos", value: 40 },
  { label: "1 hora", value: 60 },
  { label: "2 horas", value: 120 },
  { label: "3 horas", value: 180 },
  { label: "4 horas", value: 240 },
  { label: "6 horas", value: 360 },
  { label: "8 horas", value: 480 },
  { label: "12 horas", value: 720 },
  { label: "1 día", value: 1440 },
];

function formatTimeLeft(expira: string): string {
  const diff = new Date(expira).getTime() - Date.now();
  if (diff <= 0) return "Expirado";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m restantes`;
  return `${m}m restantes`;
}

function ArrestPanel({ officer }: { officer: Officer }) {
  const [citizenQuery, setCitizenQuery] = useState("");
  const [citizenResults, setCitizenResults] = useState<any[]>([]);
  const [selectedCitizen, setSelectedCitizen] = useState<any>(null);
  const [cargos, setCargos] = useState("");
  const [duracion, setDuracion] = useState(60);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeArrests, setActiveArrests] = useState<any[]>([]);
  const [loadingArrests, setLoadingArrests] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchActiveArrests = async () => {
    const { data } = await hqSupabase
      .from("arrests")
      .select("*, citizens(nombre, apellido_paterno, folio_dni, roblox_nickname)")
      .gte("expira_en", new Date().toISOString())
      .order("expira_en", { ascending: true });
    setActiveArrests(data || []);
    setLoadingArrests(false);
  };

  useEffect(() => {
    fetchActiveArrests();
    const interval = setInterval(fetchActiveArrests, 30000);
    return () => clearInterval(interval);
  }, []);

  const searchCitizen = async () => {
    if (!citizenQuery.trim()) return;
    const q = citizenQuery.trim();
    const { data } = await hqSupabase.from("citizens").select("id, nombre, apellido_paterno, folio_dni, roblox_nickname")
      .or(`folio_dni.ilike.%${q}%,roblox_nickname.ilike.%${q}%,nombre.ilike.%${q}%`);
    setCitizenResults(data || []);
    if (!data?.length) toast.info("Ciudadano no encontrado");
  };

  const submit = async () => {
    if (!selectedCitizen || !cargos) { toast.error("Completa todos los campos"); return; }
    setSubmitting(true);

    let evidencia_url: string | null = null;
    if (evidenceFile) {
      const path = `arrests/${Date.now()}_${evidenceFile.name}`;
      const { error: upErr } = await hqSupabase.storage.from("evidence").upload(path, evidenceFile);
      if (!upErr) {
        const { data: urlData } = hqSupabase.storage.from("evidence").getPublicUrl(path);
        evidencia_url = urlData.publicUrl;
      }
    }

    const now = new Date();
    const expira = new Date(now.getTime() + duracion * 60000);

    const { error } = await hqSupabase.from("arrests").insert({
      citizen_id: selectedCitizen.id,
      officer_id: officer.id,
      cargos,
      evidencia_url,
      duracion_minutos: duracion,
      expira_en: expira.toISOString(),
    });

    if (error) { toast.error(error.message); }
    else {
      const durLabel = DURATION_OPTIONS.find(d => d.value === duracion)?.label || `${duracion} min`;
      const now2 = new Date();
      const expira2 = new Date(now2.getTime() + duracion * 60000);
      // Notify citizen
      await hqSupabase.from("notifications").insert({
        citizen_id: selectedCitizen.id,
        titulo: "Has sido arrestado",
        mensaje: `Cargos: ${cargos}. Duración: ${durLabel}. Ingreso: ${now2.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} — Expiración: ${expira2.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`,
        tipo: "arresto",
      });
      toast.success(`Arresto registrado — ${durLabel}`);
      setSelectedCitizen(null);
      setCargos("");
      setDuracion(60);
      setEvidenceFile(null);
      setCitizenQuery("");
      setCitizenResults([]);
      fetchActiveArrests();
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await hqSupabase.from("arrests").delete().eq("id", deleteId);
    if (error) toast.error(error.message);
    else {
      toast.success("Arresto eliminado");
      fetchActiveArrests();
    }
    setDeleteId(null);
    setDeleting(false);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Registro de Arresto</h2>

      {!selectedCitizen ? (
        <>
          <div className="flex gap-2 mb-4">
            <Input value={citizenQuery} onChange={(e) => setCitizenQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchCitizen()}
              placeholder="Buscar ciudadano" className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
            <Button onClick={searchCitizen} className="bg-blue-600 hover:bg-blue-700"><Search className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-2">
            {citizenResults.map((c) => (
              <button key={c.id} onClick={() => setSelectedCitizen(c)}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10">
                <span className="text-white">{c.nombre} {c.apellido_paterno}</span>
                <span className="text-xs text-slate-400">{c.folio_dni}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-4 max-w-lg">
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 flex items-center justify-between">
            <div>
              <p className="text-white font-medium">{selectedCitizen.nombre} {selectedCitizen.apellido_paterno}</p>
              <p className="text-xs text-slate-400">DNI: {selectedCitizen.folio_dni}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedCitizen(null)}><X className="h-4 w-4 text-slate-400" /></Button>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Cargos</label>
            <Textarea value={cargos} onChange={(e) => setCargos(e.target.value)} placeholder="Detalle de los cargos"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Tiempo de arresto</label>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button key={d.value} onClick={() => setDuracion(d.value)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    duracion === d.value
                      ? "bg-red-500/20 text-red-400 border-red-500/40"
                      : "border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                  }`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Evidencia (opcional)</label>
            <Input type="file" accept="image/*" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
              className="bg-white/5 border-white/10 text-white" />
          </div>

          <Button onClick={submit} disabled={submitting} className="w-full bg-red-600 hover:bg-red-700">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar Arresto"}
          </Button>
        </div>
      )}

      {/* Active Arrests */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Gavel className="h-5 w-5 text-red-400" /> Arrestos Activos
        </h3>
        {loadingArrests ? <Loader2 className="h-5 w-5 animate-spin text-blue-400" /> :
          activeArrests.length === 0 ? <p className="text-sm text-slate-500">No hay arrestos activos</p> : (
          <div className="space-y-2">
            {activeArrests.map((a) => {
              const ingreso = new Date(a.created_at);
              const expira = new Date(a.expira_en);
              const isExpired = expira.getTime() <= Date.now();
              return (
                <div key={a.id} className={`rounded-xl border p-4 ${isExpired ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-medium">{a.citizens?.nombre} {a.citizens?.apellido_paterno}</p>
                      <p className="text-xs text-slate-400">Roblox: {a.citizens?.roblox_nickname} • DNI: {a.citizens?.folio_dni}</p>
                      <p className="text-sm text-slate-300 mt-1">{a.cargos}</p>
                      <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                        <p>Ingreso: {ingreso.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</p>
                        <p>Expiración: {expira.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</p>
                        <p className={isExpired ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                          {isExpired ? "✓ Cumplido" : formatTimeLeft(a.expira_en)}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(a.id)}
                      className="text-red-400 hover:bg-red-500/10 hover:text-red-300">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="rounded-xl border border-red-500/30 bg-[#0a0e1a] p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-bold text-lg">Eliminar Arresto</h3>
            </div>
            <p className="text-sm text-slate-300">¿Estás seguro de que quieres eliminar este arresto? Esta acción no se puede deshacer.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setDeleteId(null)} className="text-slate-400">Cancelar</Button>
              <Button onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Eliminar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== 911 PANEL ===================== */
function Panel911({ officer }: { officer: Officer }) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    const { data } = await hqSupabase
      .from("emergency_reports")
      .select("*, citizens(nombre, apellido_paterno, roblox_nickname)")
      .neq("estado", "resuelto")
      .order("created_at", { ascending: false })
      .limit(50);
    setReports(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();

    const channel = hqSupabase.channel("911-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "emergency_reports" }, () => {
        fetchReports();
      })
      .subscribe();

    return () => { hqSupabase.removeChannel(channel); };
  }, []);

  const updateStatus = async (id: string, estado: string) => {
    const { error } = await hqSupabase.from("emergency_reports").update({ estado }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(`Estado actualizado a "${estado}"`);
  };

  const statusColor: Record<string, string> = {
    pendiente: "bg-amber-500/20 text-amber-400",
    en_camino: "bg-blue-500/20 text-blue-400",
    resuelto: "bg-emerald-500/20 text-emerald-400",
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Panel 911</h2>
      {loading ? <Loader2 className="h-6 w-6 animate-spin text-blue-400" /> : reports.length === 0 ? (
        <p className="text-slate-500">No hay reportes de emergencia</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-medium">{r.tipo}</p>
                  <p className="text-sm text-slate-300 mt-1">{r.descripcion}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    📍 {r.calle_sector || "Sin ubicación"} • Por: {r.citizens?.roblox_nickname || r.citizens?.nombre || "Desconocido"}
                  </p>
                  <p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString("es-CL")}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[r.estado] || ""}`}>{r.estado}</span>
              </div>
              {r.estado !== "resuelto" && (
                <div className="mt-3 flex gap-2">
                  {r.estado === "pendiente" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "en_camino")}
                      className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">En Camino</Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "resuelto")}
                    className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">Resuelto</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===================== POLICE CHAT ===================== */
function PoliceChat({ officer }: { officer: Officer }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await hqSupabase
        .from("police_chat")
        .select("*, officers(placa, rango, citizens(roblox_nickname))")
        .order("created_at", { ascending: true })
        .limit(100);
      setMessages(data || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };
    fetchMessages();

    const channel = hqSupabase.channel("police-chat-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "police_chat" }, async (payload) => {
        const { data } = await hqSupabase
          .from("police_chat")
          .select("*, officers(placa, rango, citizens(roblox_nickname))")
          .eq("id", payload.new.id)
          .single();
        if (data) {
          setMessages((prev) => [...prev, data]);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
      })
      .subscribe();

    return () => { hqSupabase.removeChannel(channel); };
  }, []);

  const sendMessage = async () => {
    if (!newMsg.trim() || sending) return;
    setSending(true);
    const { error } = await hqSupabase.from("police_chat").insert({ officer_id: officer.id, message: newMsg.trim() });
    if (error) toast.error(error.message);
    setNewMsg("");
    setSending(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <h2 className="text-xl font-bold text-white mb-4">Chat Interno Policial</h2>
      <div className="flex-1 overflow-auto space-y-2 rounded-xl border border-white/10 bg-white/5 p-4 mb-4">
        {messages.map((m) => {
          const isMe = m.officer_id === officer.id;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] rounded-xl px-3 py-2 ${isMe ? "bg-blue-600/30 text-blue-100" : "bg-white/10 text-white"}`}>
                {!isMe && (
                  <p className="text-xs text-blue-400 font-medium mb-0.5">
                    {m.officers?.citizens?.roblox_nickname || m.officers?.placa}
                  </p>
                )}
                <p className="text-sm">{m.message}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 text-right">
                  {new Date(m.created_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2">
        <Input value={newMsg} onChange={(e) => setNewMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Escribe un mensaje..." className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
        <Button onClick={sendMessage} disabled={sending} className="bg-blue-600 hover:bg-blue-700">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}


function ShiftPanel({ officer }: { officer: Officer }) {
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [activeOfficers, setActiveOfficers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"start" | "break" | "resume" | "end" | null>(null);

  const getOpenShift = async () => {
    const { data, error } = await hqSupabase
      .from("officer_shifts")
      .select("*")
      .eq("officer_id", officer.id)
      .is("fin", null)
      .order("inicio", { ascending: false })
      .limit(1);

    if (error) {
      toast.error(error.message);
      return null;
    }

    return data?.[0] ?? null;
  };

  const syncOfficerStatus = async (enServicio: boolean) => {
    const { error } = await hqSupabase.from("officers").update({ en_servicio: enServicio }).eq("id", officer.id);
    if (error) toast.error(error.message);
  };

  const fetchData = async () => {
    setLoading(true);

    const [{ data: ownShiftRows, error: ownShiftError }, { data: shifts, error: shiftsError }] = await Promise.all([
      hqSupabase
        .from("officer_shifts")
        .select("*")
        .eq("officer_id", officer.id)
        .is("fin", null)
        .order("inicio", { ascending: false })
        .limit(1),
      hqSupabase
        .from("officer_shifts")
        .select("*, officers(placa, rango, departamento, citizens(roblox_nickname, nombre, apellido_paterno))")
        .is("fin", null)
        .in("estado", ["en_servicio", "break"])
        .order("inicio", { ascending: true }),
    ]);

    if (ownShiftError) toast.error(ownShiftError.message);
    if (shiftsError) toast.error(shiftsError.message);

    const nextActiveOfficers = shifts || [];
    const ownShift = ownShiftRows?.[0] ?? nextActiveOfficers.find((shift) => shift.officer_id === officer.id) ?? null;

    setCurrentShift(ownShift);
    setActiveOfficers(nextActiveOfficers);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [officer.id]);

  const startShift = async () => {
    setActionLoading("start");

    const existingShift = currentShift ?? await getOpenShift();
    if (existingShift) {
      if (existingShift.estado !== "en_servicio") {
        const { error } = await hqSupabase
          .from("officer_shifts")
          .update({ estado: "en_servicio" })
          .eq("id", existingShift.id);

        if (error) {
          toast.error(error.message);
          setActionLoading(null);
          return;
        }
      }

      await syncOfficerStatus(true);
      await fetchData();
      toast.success("Turno listo");
      setActionLoading(null);
      return;
    }

    const { error } = await hqSupabase.from("officer_shifts").insert({ officer_id: officer.id, estado: "en_servicio" });
    if (error) {
      toast.error(error.message);
      setActionLoading(null);
      return;
    }

    await syncOfficerStatus(true);
    await fetchData();
    toast.success("Turno iniciado");
    setActionLoading(null);
  };

  const takeBreak = async () => {
    setActionLoading("break");
    const shift = currentShift ?? await getOpenShift();

    if (!shift) {
      toast.info("No tienes un turno activo");
      setActionLoading(null);
      return;
    }

    const { error } = await hqSupabase.from("officer_shifts").update({ estado: "break" }).eq("id", shift.id);
    if (error) {
      toast.error(error.message);
      setActionLoading(null);
      return;
    }

    await syncOfficerStatus(true);
    await fetchData();
    toast.info("En break");
    setActionLoading(null);
  };

  const resumeShift = async () => {
    setActionLoading("resume");
    const shift = currentShift ?? await getOpenShift();

    if (!shift) {
      toast.info("No tienes un turno activo");
      setActionLoading(null);
      return;
    }

    const { error } = await hqSupabase.from("officer_shifts").update({ estado: "en_servicio" }).eq("id", shift.id);
    if (error) {
      toast.error(error.message);
      setActionLoading(null);
      return;
    }

    await syncOfficerStatus(true);
    await fetchData();
    toast.success("Turno reanudado");
    setActionLoading(null);
  };

  const endShift = async () => {
    setActionLoading("end");
    const shift = currentShift ?? await getOpenShift();

    if (!shift) {
      toast.info("No tienes un turno activo");
      setActionLoading(null);
      return;
    }

    const { error } = await hqSupabase
      .from("officer_shifts")
      .update({ estado: "finalizado", fin: new Date().toISOString() })
      .eq("id", shift.id);

    if (error) {
      toast.error(error.message);
      setActionLoading(null);
      return;
    }

    await syncOfficerStatus(false);
    await fetchData();
    toast.success("Turno finalizado");
    setActionLoading(null);
  };

  const formatDuration = (start: string) => {
    const diff = Date.now() - new Date(start).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Sistema de Turnos</h2>

      <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="font-semibold text-white mb-3">Mi Turno</h3>
        {currentShift ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">
              {currentShift.estado === "break" ? "En break desde" : "En servicio desde"}: {new Date(currentShift.inicio).toLocaleTimeString("es-CL")}
              <span className="ml-2 text-emerald-400">({formatDuration(currentShift.inicio)})</span>
            </p>
            <div className="flex gap-2">
              {currentShift.estado === "break" ? (
                <Button variant="outline" onClick={resumeShift} disabled={!!actionLoading} className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                  {actionLoading === "resume" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />} Volver al servicio
                </Button>
              ) : (
                <Button variant="outline" onClick={takeBreak} disabled={!!actionLoading} className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                  {actionLoading === "break" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Coffee className="h-4 w-4 mr-1" />} Break
                </Button>
              )}
              <Button variant="outline" onClick={endShift} disabled={!!actionLoading} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                {actionLoading === "end" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Square className="h-4 w-4 mr-1" />} Terminar
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={startShift} disabled={!!actionLoading} className="bg-emerald-600 hover:bg-emerald-700">
            {actionLoading === "start" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />} Iniciar Turno
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" /> Oficiales Activos ({activeOfficers.length})
        </h3>
        {loading ? <Loader2 className="h-5 w-5 animate-spin text-blue-400" /> : activeOfficers.length === 0 ? (
          <p className="text-sm text-slate-500">No hay oficiales en servicio</p>
        ) : (
          <div className="space-y-2">
            {activeOfficers.map((s) => (
              <div key={s.id} className={`rounded-lg p-3 ${s.officer_id === officer.id ? "bg-blue-500/10 border border-blue-500/20" : "bg-white/5"}`}>
                <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">
                    {s.officers?.citizens?.roblox_nickname || s.officers?.citizens?.nombre}
                    {s.officer_id === officer.id && <span className="ml-2 text-xs text-blue-400">Tú</span>}
                  </p>
                  <p className="text-xs text-slate-400">
                    {s.officers?.rango} • {s.officers?.placa} • {s.officers?.departamento}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.estado === "en_servicio" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                    {s.estado === "en_servicio" ? "Activo" : "Break"}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">{formatDuration(s.inicio)}</p>
                </div>
              </div>
                {s.officer_id === officer.id && (
                  <div className="mt-3 flex gap-2">
                    {s.estado === "break" ? (
                      <Button size="sm" variant="outline" onClick={resumeShift} disabled={!!actionLoading} className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                        Volver
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={takeBreak} disabled={!!actionLoading} className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                        Break
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={endShift} disabled={!!actionLoading} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                      Terminar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== WANTED PANEL ===================== */
function WantedPanel() {
  const [wantedList, setWantedList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [citizenQuery, setCitizenQuery] = useState("");
  const [citizenResults, setCitizenResults] = useState<any[]>([]);
  const [selectedCitizen, setSelectedCitizen] = useState<any>(null);
  const [razon, setRazon] = useState("");
  const [prioridad, setPrioridad] = useState("media");
  const [submitting, setSubmitting] = useState(false);

  const fetchWanted = async () => {
    const { data } = await hqSupabase
      .from("wanted_list")
      .select("*, citizens(nombre, apellido_paterno, folio_dni, roblox_nickname)")
      .eq("activo", true)
      .order("created_at", { ascending: false });
    setWantedList(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchWanted(); }, []);

  const searchCitizen = async () => {
    if (!citizenQuery.trim()) return;
    const q = citizenQuery.trim();
    const { data } = await hqSupabase.from("citizens").select("id, nombre, apellido_paterno, folio_dni, roblox_nickname")
      .or(`folio_dni.ilike.%${q}%,roblox_nickname.ilike.%${q}%,nombre.ilike.%${q}%`);
    setCitizenResults(data || []);
  };

  const submit = async () => {
    if (!selectedCitizen || !razon) { toast.error("Completa todos los campos"); return; }
    setSubmitting(true);
    const { error } = await hqSupabase.from("wanted_list").insert({
      citizen_id: selectedCitizen.id,
      razon,
      prioridad,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Alerta de búsqueda agregada");
      setShowAdd(false);
      setSelectedCitizen(null);
      setRazon("");
      setCitizenQuery("");
      setCitizenResults([]);
      fetchWanted();
    }
    setSubmitting(false);
  };

  const removeWanted = async (id: string) => {
    const { error } = await hqSupabase.from("wanted_list").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { fetchWanted(); toast.success("Alerta eliminada"); }
  };

  const prioridadColor: Record<string, string> = {
    baja: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    media: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    alta: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Ciudadanos Buscados</h2>
        <Button onClick={() => setShowAdd(!showAdd)} className="bg-red-600 hover:bg-red-700">
          <AlertTriangle className="h-4 w-4 mr-1" /> Agregar Alerta
        </Button>
      </div>

      {showAdd && (
        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
          {!selectedCitizen ? (
            <>
              <div className="flex gap-2">
                <Input value={citizenQuery} onChange={(e) => setCitizenQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchCitizen()}
                  placeholder="Buscar ciudadano" className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
                <Button onClick={searchCitizen} className="bg-blue-600"><Search className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-1">
                {citizenResults.map((c) => (
                  <button key={c.id} onClick={() => setSelectedCitizen(c)}
                    className="flex w-full items-center justify-between rounded-lg bg-white/5 p-2 text-left hover:bg-white/10">
                    <span className="text-white text-sm">{c.nombre} {c.apellido_paterno}</span>
                    <span className="text-xs text-slate-400">{c.folio_dni}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-2 flex items-center justify-between">
                <span className="text-white text-sm">{selectedCitizen.nombre} {selectedCitizen.apellido_paterno} — {selectedCitizen.folio_dni}</span>
                <Button variant="ghost" size="icon" onClick={() => setSelectedCitizen(null)}><X className="h-4 w-4 text-slate-400" /></Button>
              </div>
              <Textarea value={razon} onChange={(e) => setRazon(e.target.value)} placeholder="Motivo de búsqueda"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
              <div className="flex gap-2">
                {["baja", "media", "alta"].map((p) => (
                  <button key={p} onClick={() => setPrioridad(p)}
                    className={`rounded-lg border px-3 py-1.5 text-sm capitalize ${prioridad === p ? prioridadColor[p] : "border-white/10 text-slate-400"}`}>
                    {p}
                  </button>
                ))}
              </div>
              <Button onClick={submit} disabled={submitting} className="w-full bg-red-600 hover:bg-red-700">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Agregar a Lista de Buscados"}
              </Button>
            </>
          )}
        </div>
      )}

      {loading ? <Loader2 className="h-6 w-6 animate-spin text-blue-400" /> : wantedList.length === 0 ? (
        <p className="text-slate-500">No hay alertas activas</p>
      ) : (
        <div className="space-y-2">
          {wantedList.map((w) => (
            <div key={w.id} className={`rounded-xl border p-4 ${prioridadColor[w.prioridad] || "border-white/10"} bg-opacity-10`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-medium">{w.citizens?.nombre} {w.citizens?.apellido_paterno}</p>
                  <p className="text-xs text-slate-400">DNI: {w.citizens?.folio_dni} • Roblox: {w.citizens?.roblox_nickname}</p>
                  <p className="text-sm mt-1">{w.razon}</p>
                  <p className="text-xs text-slate-500 mt-1">{new Date(w.created_at).toLocaleDateString("es-CL")}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full uppercase font-bold ${prioridadColor[w.prioridad]}`}>{w.prioridad}</span>
                  <Button size="sm" variant="ghost" onClick={() => removeWanted(w.id)} className="text-slate-500 hover:text-red-400 text-xs">
                    <Trash2 className="h-3 w-3 mr-1" /> Eliminar
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
