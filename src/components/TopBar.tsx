import { Search, Bell, Power } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCitizen } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";

export default function TopBar() {
  const { user, signOut } = useAuth();
  const { data: citizen } = useCitizen();
  const navigate = useNavigate();

  const displayName = citizen?.roblox_nickname || user?.user_metadata?.discord_username || "Usuario";
  const folio = citizen?.folio_dni || "—";
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-6">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-accent animate-pulse-glow" />
        <span className="text-sm font-bold text-foreground">RCDU</span>
        <span className="text-xs text-muted-foreground">| Portal de USUARIO</span>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 w-80">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/notificaciones")}
          className="relative rounded-lg p-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground transition-colors"
        >
          <Bell className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          {citizen?.avatar_url ? (
            <img src={citizen.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-surface-3 flex items-center justify-center text-xs font-bold text-foreground">
              {initials}
            </div>
          )}
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-foreground">{displayName}</p>
            <p className="text-[10px] font-mono text-muted-foreground">{folio}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <Power className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
