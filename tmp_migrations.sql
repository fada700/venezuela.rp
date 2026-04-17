
-- ============================================
-- RCDU DATABASE SCHEMA
-- ============================================

-- Función para actualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- 1. CITIZENS (Ciudadanos / DNI)
-- ============================================
CREATE TABLE public.citizens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  apellido_paterno TEXT NOT NULL,
  apellido_materno TEXT NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  nacionalidad TEXT NOT NULL DEFAULT 'Chilena',
  genero TEXT NOT NULL,
  rut TEXT NOT NULL UNIQUE,
  folio_dni TEXT NOT NULL UNIQUE,
  roblox_nickname TEXT NOT NULL,
  roblox_id TEXT,
  avatar_url TEXT,
  verificado BOOLEAN NOT NULL DEFAULT false,
  balance BIGINT NOT NULL DEFAULT 1000000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.citizens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Citizens can view own data" ON public.citizens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Citizens can update own data" ON public.citizens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Citizens can insert own data" ON public.citizens FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_citizens_updated_at BEFORE UPDATE ON public.citizens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. STORE ITEMS (Tienda)
-- ============================================
CREATE TABLE public.store_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Vehículos',
  marca TEXT,
  modelo TEXT,
  anio INTEGER,
  precio BIGINT NOT NULL,
  imagen_url TEXT,
  stock INTEGER NOT NULL DEFAULT -1,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view store items" ON public.store_items FOR SELECT USING (true);

CREATE TRIGGER update_store_items_updated_at BEFORE UPDATE ON public.store_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3. VEHICLES (Vehículos)
-- ============================================
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_id UUID REFERENCES public.citizens(id) ON DELETE CASCADE NOT NULL,
  store_item_id UUID REFERENCES public.store_items(id),
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  anio INTEGER,
  color TEXT NOT NULL,
  matricula TEXT NOT NULL UNIQUE,
  vin TEXT NOT NULL UNIQUE,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'robado', 'buscado', 'destruido')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Citizens can view own vehicles" ON public.vehicles FOR SELECT USING (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));
CREATE POLICY "Citizens can insert own vehicles" ON public.vehicles FOR INSERT WITH CHECK (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 4. TRANSACTIONS (VersePay)
-- ============================================
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_citizen_id UUID REFERENCES public.citizens(id),
  receiver_citizen_id UUID REFERENCES public.citizens(id),
  monto BIGINT NOT NULL CHECK (monto > 0),
  tipo TEXT NOT NULL CHECK (tipo IN ('transferencia', 'compra', 'venta', 'sueldo', 'multa', 'impuesto', 'sistema')),
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Citizens can view own transactions" ON public.transactions FOR SELECT
  USING (
    sender_citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid())
    OR receiver_citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid())
  );
CREATE POLICY "Citizens can create transactions" ON public.transactions FOR INSERT
  WITH CHECK (sender_citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));

-- ============================================
-- 5. FINES (Multas)
-- ============================================
CREATE TABLE public.fines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_id UUID REFERENCES public.citizens(id) ON DELETE CASCADE NOT NULL,
  officer_id UUID REFERENCES public.citizens(id),
  monto BIGINT NOT NULL,
  razon TEXT NOT NULL,
  pagada BOOLEAN NOT NULL DEFAULT false,
  evidencia_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Citizens can view own fines" ON public.fines FOR SELECT USING (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));
CREATE POLICY "Citizens can update own fines" ON public.fines FOR UPDATE USING (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));

CREATE TRIGGER update_fines_updated_at BEFORE UPDATE ON public.fines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 6. LICENSES (Licencias)
-- ============================================
CREATE TABLE public.licenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_id UUID REFERENCES public.citizens(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('conducir', 'armas', 'caza')),
  fecha_emision TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_expiracion TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Citizens can view own licenses" ON public.licenses FOR SELECT USING (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));
CREATE POLICY "Citizens can insert own licenses" ON public.licenses FOR INSERT WITH CHECK (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));

-- ============================================
-- 7. PROPERTIES (Bienes Raíces)
-- ============================================
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  direccion TEXT NOT NULL,
  precio BIGINT NOT NULL,
  impuesto_mensual BIGINT NOT NULL DEFAULT 0,
  owner_citizen_id UUID REFERENCES public.citizens(id),
  disponible BOOLEAN NOT NULL DEFAULT true,
  imagen_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view properties" ON public.properties FOR SELECT USING (true);
CREATE POLICY "Owners can update own properties" ON public.properties FOR UPDATE USING (owner_citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 8. EMERGENCY REPORTS (911)
-- ============================================
CREATE TABLE public.emergency_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_id UUID REFERENCES public.citizens(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  calle_sector TEXT,
  coord_x INTEGER,
  coord_y INTEGER,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'resuelto', 'cancelado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Citizens can view own reports" ON public.emergency_reports FOR SELECT USING (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));
CREATE POLICY "Citizens can create reports" ON public.emergency_reports FOR INSERT WITH CHECK (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));

CREATE TRIGGER update_emergency_reports_updated_at BEFORE UPDATE ON public.emergency_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 9. NOTIFICATIONS
-- ============================================
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_id UUID REFERENCES public.citizens(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info' CHECK (tipo IN ('info', 'success', 'warning', 'error')),
  leida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Citizens can view own notifications" ON public.notifications FOR SELECT USING (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));
CREATE POLICY "Citizens can update own notifications" ON public.notifications FOR UPDATE USING (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));

-- ============================================
-- 10. OFFICERS (Oficiales MDT)
-- ============================================
CREATE TABLE public.officers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_id UUID REFERENCES public.citizens(id) ON DELETE CASCADE NOT NULL UNIQUE,
  placa TEXT NOT NULL UNIQUE,
  rango TEXT NOT NULL DEFAULT 'Cadete',
  departamento TEXT NOT NULL DEFAULT 'RCPD',
  salario BIGINT NOT NULL DEFAULT 50000,
  en_servicio BOOLEAN NOT NULL DEFAULT false,
  contrasena_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.officers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Officers can view own data" ON public.officers FOR SELECT USING (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));

CREATE TRIGGER update_officers_updated_at BEFORE UPDATE ON public.officers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 11. ARRESTS (Arrestos)
-- ============================================
CREATE TABLE public.arrests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_id UUID REFERENCES public.citizens(id) ON DELETE CASCADE NOT NULL,
  officer_id UUID REFERENCES public.officers(id) NOT NULL,
  cargos TEXT NOT NULL,
  evidencia_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.arrests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Citizens can view own arrests" ON public.arrests FOR SELECT USING (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));

-- ============================================
-- 12. WANTED LIST (Buscados)
-- ============================================
CREATE TABLE public.wanted_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_id UUID REFERENCES public.citizens(id) ON DELETE CASCADE NOT NULL,
  prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),
  razon TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wanted_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access to wanted list" ON public.wanted_list FOR SELECT USING (false);

-- ============================================
-- 13. OFFICER SHIFTS (Turnos)
-- ============================================
CREATE TABLE public.officer_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  officer_id UUID REFERENCES public.officers(id) ON DELETE CASCADE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'en_servicio' CHECK (estado IN ('en_servicio', 'descanso', 'finalizado')),
  inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fin TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.officer_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Officers can view own shifts" ON public.officer_shifts FOR SELECT USING (officer_id IN (SELECT o.id FROM public.officers o JOIN public.citizens c ON o.citizen_id = c.id WHERE c.user_id = auth.uid()));
CREATE POLICY "Officers can insert own shifts" ON public.officer_shifts FOR INSERT WITH CHECK (officer_id IN (SELECT o.id FROM public.officers o JOIN public.citizens c ON o.citizen_id = c.id WHERE c.user_id = auth.uid()));
CREATE POLICY "Officers can update own shifts" ON public.officer_shifts FOR UPDATE USING (officer_id IN (SELECT o.id FROM public.officers o JOIN public.citizens c ON o.citizen_id = c.id WHERE c.user_id = auth.uid()));

-- ============================================
-- 14. USER ROLES (Roles de usuario)
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'officer', 'citizen');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Police chat table
CREATE TABLE public.police_chat (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  officer_id uuid NOT NULL REFERENCES public.officers(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.police_chat ENABLE ROW LEVEL SECURITY;

-- Officers can view all chat messages
CREATE POLICY "Officers can view chat" ON public.police_chat
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));

-- Officers can send chat messages
CREATE POLICY "Officers can send chat" ON public.police_chat
  FOR INSERT TO authenticated
  WITH CHECK (
    officer_id IN (
      SELECT o.id FROM officers o JOIN citizens c ON o.citizen_id = c.id WHERE c.user_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.police_chat;

-- Evidence storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', true);

CREATE POLICY "Anyone can view evidence" ON storage.objects
  FOR SELECT USING (bucket_id = 'evidence');

CREATE POLICY "Authenticated users can upload evidence" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence');

-- Officers can view ALL citizens
CREATE POLICY "Officers can view all citizens" ON public.citizens
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));

-- Officers can view ALL vehicles
CREATE POLICY "Officers can view all vehicles" ON public.vehicles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));

-- Officers can view ALL licenses
CREATE POLICY "Officers can view all licenses" ON public.licenses
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));

-- Officers can view ALL fines
CREATE POLICY "Officers can view all fines" ON public.fines
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));

-- Officers can INSERT fines
CREATE POLICY "Officers can create fines" ON public.fines
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));

-- Officers can view ALL arrests
CREATE POLICY "Officers can view all arrests" ON public.arrests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));

-- Officers can INSERT arrests
CREATE POLICY "Officers can create arrests" ON public.arrests
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));

-- Officers can view ALL emergency reports
CREATE POLICY "Officers can view all reports" ON public.emergency_reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));

-- Officers can update emergency reports (mark as en camino / resuelto)
CREATE POLICY "Officers can update reports" ON public.emergency_reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));

-- Officers can view wanted list
CREATE POLICY "Officers can view wanted list" ON public.wanted_list
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));

-- Officers can manage wanted list
CREATE POLICY "Officers can insert wanted" ON public.wanted_list
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Officers can update wanted" ON public.wanted_list
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));

-- Officers can view all officers (for active list)
CREATE POLICY "Officers can view all officers" ON public.officers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));

-- Officers can update own officer record (for shift status)
CREATE POLICY "Officers can update own record" ON public.officers
  FOR UPDATE TO authenticated
  USING (citizen_id IN (SELECT id FROM citizens WHERE user_id = auth.uid()));

-- Officers can view all shifts
CREATE POLICY "Officers can view all shifts" ON public.officer_shifts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));
-- Allow admins to insert officers
CREATE POLICY "Admins can insert officers"
ON public.officers FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete officers
CREATE POLICY "Admins can delete officers"
ON public.officers FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update any officer
CREATE POLICY "Admins can update all officers"
ON public.officers FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert user_roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete user_roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for emergency_reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_reports;

-- Allow officers/admins to delete from wanted_list
CREATE POLICY "Officers can delete wanted"
ON public.wanted_list
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'officer'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Función para actualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1. CITIZENS
CREATE TABLE public.citizens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  apellido_paterno TEXT NOT NULL,
  apellido_materno TEXT NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  nacionalidad TEXT NOT NULL DEFAULT 'Chilena',
  genero TEXT NOT NULL,
  rut TEXT NOT NULL UNIQUE,
  folio_dni TEXT NOT NULL UNIQUE,
  roblox_nickname TEXT NOT NULL,
  roblox_id TEXT,
  avatar_url TEXT,
  verificado BOOLEAN NOT NULL DEFAULT false,
  balance BIGINT NOT NULL DEFAULT 1000000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.citizens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Citizens can view own data" ON public.citizens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Citizens can update own data" ON public.citizens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Citizens can insert own data" ON public.citizens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_citizens_updated_at BEFORE UPDATE ON public.citizens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. STORE ITEMS
CREATE TABLE public.store_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Vehículos',
  marca TEXT,
  modelo TEXT,
  anio INTEGER,
  precio BIGINT NOT NULL,
  imagen_url TEXT,
  stock INTEGER NOT NULL DEFAULT -1,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view store items" ON public.store_items FOR SELECT USING (true);
CREATE TRIGGER update_store_items_updated_at BEFORE UPDATE ON public.store_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. VEHICLES
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_id UUID REFERENCES public.citizens(id) ON DELETE CASCADE NOT NULL,
  store_item_id UUID REFERENCES public.store_items(id),
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  anio INTEGER,
  color TEXT NOT NULL,
  matricula TEXT NOT NULL UNIQUE,
  vin TEXT NOT NULL UNIQUE,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'robado', 'buscado', 'destruido')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Citizens can view own vehicles" ON public.vehicles FOR SELECT USING (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));
CREATE POLICY "Citizens can insert own vehicles" ON public.vehicles FOR INSERT WITH CHECK (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. TRANSACTIONS
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_citizen_id UUID REFERENCES public.citizens(id),
  receiver_citizen_id UUID REFERENCES public.citizens(id),
  monto BIGINT NOT NULL CHECK (monto > 0),
  tipo TEXT NOT NULL CHECK (tipo IN ('transferencia', 'compra', 'venta', 'sueldo', 'multa', 'impuesto', 'sistema')),
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Citizens can view own transactions" ON public.transactions FOR SELECT USING (sender_citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()) OR receiver_citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));
CREATE POLICY "Citizens can create transactions" ON public.transactions FOR INSERT WITH CHECK (sender_citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));

-- 5. FINES
CREATE TABLE public.fines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_id UUID REFERENCES public.citizens(id) ON DELETE CASCADE NOT NULL,
  officer_id UUID REFERENCES public.citizens(id),
  monto BIGINT NOT NULL,
  razon TEXT NOT NULL,
  pagada BOOLEAN NOT NULL DEFAULT false,
  evidencia_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Citizens can view own fines" ON public.fines FOR SELECT USING (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));
CREATE POLICY "Citizens can update own fines" ON public.fines FOR UPDATE USING (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));
CREATE TRIGGER update_fines_updated_at BEFORE UPDATE ON public.fines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. LICENSES
CREATE TABLE public.licenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_id UUID REFERENCES public.citizens(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('conducir', 'armas', 'caza')),
  fecha_emision TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_expiracion TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Citizens can view own licenses" ON public.licenses FOR SELECT USING (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));
CREATE POLICY "Citizens can insert own licenses" ON public.licenses FOR INSERT WITH CHECK (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));

-- 7. PROPERTIES
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  direccion TEXT NOT NULL,
  precio BIGINT NOT NULL,
  impuesto_mensual BIGINT NOT NULL DEFAULT 0,
  owner_citizen_id UUID REFERENCES public.citizens(id),
  disponible BOOLEAN NOT NULL DEFAULT true,
  imagen_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view properties" ON public.properties FOR SELECT USING (true);
CREATE POLICY "Owners can update own properties" ON public.properties FOR UPDATE USING (owner_citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. EMERGENCY REPORTS
CREATE TABLE public.emergency_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_id UUID REFERENCES public.citizens(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  calle_sector TEXT,
  coord_x INTEGER,
  coord_y INTEGER,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'resuelto', 'cancelado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.emergency_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Citizens can view own reports" ON public.emergency_reports FOR SELECT USING (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));
CREATE POLICY "Citizens can create reports" ON public.emergency_reports FOR INSERT WITH CHECK (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));
CREATE TRIGGER update_emergency_reports_updated_at BEFORE UPDATE ON public.emergency_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_id UUID REFERENCES public.citizens(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info' CHECK (tipo IN ('info', 'success', 'warning', 'error')),
  leida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Citizens can view own notifications" ON public.notifications FOR SELECT USING (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));
CREATE POLICY "Citizens can update own notifications" ON public.notifications FOR UPDATE USING (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));

-- 10. OFFICERS
CREATE TABLE public.officers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_id UUID REFERENCES public.citizens(id) ON DELETE CASCADE NOT NULL UNIQUE,
  placa TEXT NOT NULL UNIQUE,
  rango TEXT NOT NULL DEFAULT 'Cadete',
  departamento TEXT NOT NULL DEFAULT 'RCPD',
  salario BIGINT NOT NULL DEFAULT 50000,
  en_servicio BOOLEAN NOT NULL DEFAULT false,
  contrasena_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.officers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Officers can view own data" ON public.officers FOR SELECT USING (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));
CREATE TRIGGER update_officers_updated_at BEFORE UPDATE ON public.officers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. ARRESTS
CREATE TABLE public.arrests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_id UUID REFERENCES public.citizens(id) ON DELETE CASCADE NOT NULL,
  officer_id UUID REFERENCES public.officers(id) NOT NULL,
  cargos TEXT NOT NULL,
  evidencia_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.arrests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Citizens can view own arrests" ON public.arrests FOR SELECT USING (citizen_id IN (SELECT id FROM public.citizens WHERE user_id = auth.uid()));

-- 12. WANTED LIST
CREATE TABLE public.wanted_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_id UUID REFERENCES public.citizens(id) ON DELETE CASCADE NOT NULL,
  prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),
  razon TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wanted_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access to wanted list" ON public.wanted_list FOR SELECT USING (false);

-- 13. OFFICER SHIFTS
CREATE TABLE public.officer_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  officer_id UUID REFERENCES public.officers(id) ON DELETE CASCADE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'en_servicio' CHECK (estado IN ('en_servicio', 'descanso', 'finalizado')),
  inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fin TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.officer_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Officers can view own shifts" ON public.officer_shifts FOR SELECT USING (officer_id IN (SELECT o.id FROM public.officers o JOIN public.citizens c ON o.citizen_id = c.id WHERE c.user_id = auth.uid()));
CREATE POLICY "Officers can insert own shifts" ON public.officer_shifts FOR INSERT WITH CHECK (officer_id IN (SELECT o.id FROM public.officers o JOIN public.citizens c ON o.citizen_id = c.id WHERE c.user_id = auth.uid()));
CREATE POLICY "Officers can update own shifts" ON public.officer_shifts FOR UPDATE USING (officer_id IN (SELECT o.id FROM public.officers o JOIN public.citizens c ON o.citizen_id = c.id WHERE c.user_id = auth.uid()));

-- 14. USER ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'officer', 'citizen');
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 15. POLICE CHAT
CREATE TABLE public.police_chat (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  officer_id uuid NOT NULL REFERENCES public.officers(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.police_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Officers can view chat" ON public.police_chat FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Officers can send chat" ON public.police_chat FOR INSERT TO authenticated WITH CHECK (officer_id IN (SELECT o.id FROM officers o JOIN citizens c ON o.citizen_id = c.id WHERE c.user_id = auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.police_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_reports;

-- Evidence storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', true);
CREATE POLICY "Anyone can view evidence" ON storage.objects FOR SELECT USING (bucket_id = 'evidence');
CREATE POLICY "Authenticated users can upload evidence" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'evidence');

-- Officer/Admin policies for cross-table access
CREATE POLICY "Officers can view all citizens" ON public.citizens FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Officers can view all vehicles" ON public.vehicles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Officers can view all licenses" ON public.licenses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Officers can view all fines" ON public.fines FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Officers can create fines" ON public.fines FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Officers can view all arrests" ON public.arrests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Officers can create arrests" ON public.arrests FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Officers can view all reports" ON public.emergency_reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Officers can update reports" ON public.emergency_reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Officers can view wanted list" ON public.wanted_list FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Officers can insert wanted" ON public.wanted_list FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Officers can update wanted" ON public.wanted_list FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Officers can delete wanted" ON public.wanted_list FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Officers can view all officers" ON public.officers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Officers can update own record" ON public.officers FOR UPDATE TO authenticated USING (citizen_id IN (SELECT id FROM citizens WHERE user_id = auth.uid()));
CREATE POLICY "Officers can view all shifts" ON public.officer_shifts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));

-- Admin-only policies
CREATE POLICY "Admins can insert officers" ON public.officers FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete officers" ON public.officers FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all officers" ON public.officers FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Change default balance to 2000
ALTER TABLE public.citizens ALTER COLUMN balance SET DEFAULT 2000;

-- Add subcategoria to store_items
ALTER TABLE public.store_items ADD COLUMN IF NOT EXISTS subcategoria text DEFAULT 'General';

-- Create purchases table for inventory tracking
CREATE TABLE public.purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_id uuid NOT NULL REFERENCES public.citizens(id) ON DELETE CASCADE,
  store_item_id uuid REFERENCES public.store_items(id),
  nombre text NOT NULL,
  categoria text NOT NULL DEFAULT 'Objetos',
  precio_pagado bigint NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Citizens can view own purchases"
  ON public.purchases FOR SELECT
  USING (citizen_id IN (SELECT id FROM citizens WHERE user_id = auth.uid()));

CREATE POLICY "Citizens can create own purchases"
  ON public.purchases FOR INSERT
  WITH CHECK (citizen_id IN (SELECT id FROM citizens WHERE user_id = auth.uid()));

-- Update store_items default categoria
ALTER TABLE public.store_items ALTER COLUMN categoria SET DEFAULT 'Concesionario';

-- Add recompensa to wanted_list
ALTER TABLE public.wanted_list ADD COLUMN IF NOT EXISTS recompensa bigint DEFAULT 0;

-- Add tipo to properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'vivienda';

-- Drop the restrictive "no public access" policy and replace with public read
DROP POLICY IF EXISTS "No public access to wanted list" ON public.wanted_list;
CREATE POLICY "Anyone can view active wanted" ON public.wanted_list FOR SELECT USING (activo = true);

-- Admin can manage store_items
CREATE POLICY "Admins can insert store items" ON public.store_items FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update store items" ON public.store_items FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete store items" ON public.store_items FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can manage properties
CREATE POLICY "Admins can insert properties" ON public.properties FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete properties" ON public.properties FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can insert notifications
CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Officers can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'officer'::app_role));

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

ALTER TABLE public.arrests
ADD COLUMN duracion_minutos integer NOT NULL DEFAULT 60,
ADD COLUMN expira_en timestamp with time zone NOT NULL DEFAULT (now() + interval '1 hour');

CREATE POLICY "Officers can delete arrests"
ON public.arrests
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'officer'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
