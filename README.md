# VNZRP · Venezuela Roleplay Portal

Portal ciudadano + MDT policial + panel administrativo para el servidor de Roblox **Venezuela RP**.
Stack: **React 18 + Vite 5 + TypeScript + Tailwind + shadcn/ui + Lovable Cloud (Supabase)**.

---

## 🚀 Deploy a Vercel (paso a paso)

> El backend (DB, auth, edge functions, storage) **sigue corriendo en Lovable Cloud**.
> Vercel solo va a servir el frontend.

### 1. Conectar el proyecto a GitHub (desde Lovable)

1. En el editor de Lovable, abre **Connectors → GitHub → Connect project**.
2. Autoriza la GitHub App de Lovable.
3. Elige la cuenta/organización donde quieres crear el repo.
4. Click en **Create Repository**. Lovable empuja todo el código y mantiene sync bidireccional.

### 2. Importar el repo en Vercel

1. Entra a [vercel.com/new](https://vercel.com/new).
2. **Import Git Repository** → elige el repo recién creado.
3. Vercel detecta automáticamente Vite (gracias a `vercel.json`). No cambies nada.

### 3. Configurar variables de entorno en Vercel

En la pantalla de **Configure Project**, expande **Environment Variables** y agrega:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://lxwtzqlpcsatbwmfocgr.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | (copia desde `.env.example`) |
| `VITE_SUPABASE_PROJECT_ID` | `lxwtzqlpcsatbwmfocgr` |

Aplícalas a los 3 entornos: **Production, Preview, Development**.

### 4. Deploy

Click en **Deploy**. En ~1 min tendrás `tu-proyecto.vercel.app` funcionando.

### 5. Dominio custom (opcional)

Vercel → Project → **Settings → Domains** → agrega tu dominio y sigue las instrucciones DNS.

---

## 🔁 Flujo de trabajo después del deploy

- **Editas en Lovable** → push automático a GitHub → Vercel re-deploya solo.
- **Editas en GitHub local** → push → sync a Lovable + deploy en Vercel.
- **Cambios de backend** (edge functions, tablas) → se aplican al instante en Lovable Cloud, sin redeploy de Vercel.

---

## 🛠 Desarrollo local

```bash
npm install
cp .env.example .env
npm run dev
```

App en `http://localhost:8080`.

---

## 📂 Estructura

```
src/
  pages/          # Rutas (Dashboard, MiCedula, Propiedades, AdminPanel, HQDashboard, etc.)
  components/     # AppSidebar, TopBar, MainLayout, ui/ (shadcn)
  contexts/       # AuthContext (sesión Supabase)
  hooks/          # useData (fetchers tipados)
  integrations/
    supabase/     # client + types (auto-generados, NO editar)
  lib/            # utils, avatar (Roblox headshot)
supabase/
  functions/      # Edge functions: discord-auth, pay-fine, buy-property, hq-login, etc.
  migrations/     # SQL versionado (NO editar manualmente)
```

---

## 🔐 Roles

`admin` · `officer` · `citizen` (tabla `user_roles`, función `has_role(user_id, role)`).
Login admin: `/admin-login` · Login MDT policial: `/hq-login` · Ciudadanos: `/login` (Discord OAuth).
