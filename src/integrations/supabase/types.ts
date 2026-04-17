export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      arrests: {
        Row: {
          cargos: string
          citizen_id: string
          created_at: string
          duracion_minutos: number
          evidencia_url: string | null
          expira_en: string
          id: string
          officer_id: string
        }
        Insert: {
          cargos: string
          citizen_id: string
          created_at?: string
          duracion_minutos?: number
          evidencia_url?: string | null
          expira_en?: string
          id?: string
          officer_id: string
        }
        Update: {
          cargos?: string
          citizen_id?: string
          created_at?: string
          duracion_minutos?: number
          evidencia_url?: string | null
          expira_en?: string
          id?: string
          officer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arrests_citizen_id_fkey"
            columns: ["citizen_id"]
            isOneToOne: false
            referencedRelation: "citizens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrests_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      citizens: {
        Row: {
          apellido_materno: string
          apellido_paterno: string
          avatar_url: string | null
          balance: number
          created_at: string
          fecha_nacimiento: string
          folio_dni: string
          genero: string
          id: string
          nacionalidad: string
          nombre: string
          roblox_id: string | null
          roblox_nickname: string
          rut: string
          updated_at: string
          user_id: string
          verificado: boolean
        }
        Insert: {
          apellido_materno: string
          apellido_paterno: string
          avatar_url?: string | null
          balance?: number
          created_at?: string
          fecha_nacimiento: string
          folio_dni: string
          genero: string
          id?: string
          nacionalidad?: string
          nombre: string
          roblox_id?: string | null
          roblox_nickname: string
          rut: string
          updated_at?: string
          user_id: string
          verificado?: boolean
        }
        Update: {
          apellido_materno?: string
          apellido_paterno?: string
          avatar_url?: string | null
          balance?: number
          created_at?: string
          fecha_nacimiento?: string
          folio_dni?: string
          genero?: string
          id?: string
          nacionalidad?: string
          nombre?: string
          roblox_id?: string | null
          roblox_nickname?: string
          rut?: string
          updated_at?: string
          user_id?: string
          verificado?: boolean
        }
        Relationships: []
      }
      emergency_reports: {
        Row: {
          calle_sector: string | null
          citizen_id: string
          coord_x: number | null
          coord_y: number | null
          created_at: string
          descripcion: string
          estado: string
          id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          calle_sector?: string | null
          citizen_id: string
          coord_x?: number | null
          coord_y?: number | null
          created_at?: string
          descripcion: string
          estado?: string
          id?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          calle_sector?: string | null
          citizen_id?: string
          coord_x?: number | null
          coord_y?: number | null
          created_at?: string
          descripcion?: string
          estado?: string
          id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_reports_citizen_id_fkey"
            columns: ["citizen_id"]
            isOneToOne: false
            referencedRelation: "citizens"
            referencedColumns: ["id"]
          },
        ]
      }
      fines: {
        Row: {
          citizen_id: string
          created_at: string
          evidencia_url: string | null
          id: string
          monto: number
          officer_id: string | null
          pagada: boolean
          razon: string
          updated_at: string
        }
        Insert: {
          citizen_id: string
          created_at?: string
          evidencia_url?: string | null
          id?: string
          monto: number
          officer_id?: string | null
          pagada?: boolean
          razon: string
          updated_at?: string
        }
        Update: {
          citizen_id?: string
          created_at?: string
          evidencia_url?: string | null
          id?: string
          monto?: number
          officer_id?: string | null
          pagada?: boolean
          razon?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fines_citizen_id_fkey"
            columns: ["citizen_id"]
            isOneToOne: false
            referencedRelation: "citizens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fines_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "citizens"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          activa: boolean
          citizen_id: string
          created_at: string
          fecha_emision: string
          fecha_expiracion: string
          id: string
          tipo: string
        }
        Insert: {
          activa?: boolean
          citizen_id: string
          created_at?: string
          fecha_emision?: string
          fecha_expiracion?: string
          id?: string
          tipo: string
        }
        Update: {
          activa?: boolean
          citizen_id?: string
          created_at?: string
          fecha_emision?: string
          fecha_expiracion?: string
          id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "licenses_citizen_id_fkey"
            columns: ["citizen_id"]
            isOneToOne: false
            referencedRelation: "citizens"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          citizen_id: string
          created_at: string
          id: string
          leida: boolean
          mensaje: string
          tipo: string
          titulo: string
        }
        Insert: {
          citizen_id: string
          created_at?: string
          id?: string
          leida?: boolean
          mensaje: string
          tipo?: string
          titulo: string
        }
        Update: {
          citizen_id?: string
          created_at?: string
          id?: string
          leida?: boolean
          mensaje?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_citizen_id_fkey"
            columns: ["citizen_id"]
            isOneToOne: false
            referencedRelation: "citizens"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_shifts: {
        Row: {
          created_at: string
          estado: string
          fin: string | null
          id: string
          inicio: string
          officer_id: string
        }
        Insert: {
          created_at?: string
          estado?: string
          fin?: string | null
          id?: string
          inicio?: string
          officer_id: string
        }
        Update: {
          created_at?: string
          estado?: string
          fin?: string | null
          id?: string
          inicio?: string
          officer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "officer_shifts_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      officers: {
        Row: {
          citizen_id: string
          contrasena_hash: string
          created_at: string
          departamento: string
          en_servicio: boolean
          id: string
          placa: string
          rango: string
          salario: number
          updated_at: string
        }
        Insert: {
          citizen_id: string
          contrasena_hash: string
          created_at?: string
          departamento?: string
          en_servicio?: boolean
          id?: string
          placa: string
          rango?: string
          salario?: number
          updated_at?: string
        }
        Update: {
          citizen_id?: string
          contrasena_hash?: string
          created_at?: string
          departamento?: string
          en_servicio?: boolean
          id?: string
          placa?: string
          rango?: string
          salario?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "officers_citizen_id_fkey"
            columns: ["citizen_id"]
            isOneToOne: true
            referencedRelation: "citizens"
            referencedColumns: ["id"]
          },
        ]
      }
      police_chat: {
        Row: {
          created_at: string
          id: string
          message: string
          officer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          officer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          officer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "police_chat_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          created_at: string
          direccion: string
          disponible: boolean
          id: string
          imagen_url: string | null
          impuesto_mensual: number
          nombre: string
          owner_citizen_id: string | null
          precio: number
          tipo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          direccion: string
          disponible?: boolean
          id?: string
          imagen_url?: string | null
          impuesto_mensual?: number
          nombre: string
          owner_citizen_id?: string | null
          precio: number
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          direccion?: string
          disponible?: boolean
          id?: string
          imagen_url?: string | null
          impuesto_mensual?: number
          nombre?: string
          owner_citizen_id?: string | null
          precio?: number
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_citizen_id_fkey"
            columns: ["owner_citizen_id"]
            isOneToOne: false
            referencedRelation: "citizens"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          categoria: string
          citizen_id: string
          created_at: string
          id: string
          metadata: Json | null
          nombre: string
          precio_pagado: number
          store_item_id: string | null
        }
        Insert: {
          categoria?: string
          citizen_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          nombre: string
          precio_pagado?: number
          store_item_id?: string | null
        }
        Update: {
          categoria?: string
          citizen_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          nombre?: string
          precio_pagado?: number
          store_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_citizen_id_fkey"
            columns: ["citizen_id"]
            isOneToOne: false
            referencedRelation: "citizens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_store_item_id_fkey"
            columns: ["store_item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
        ]
      }
      store_items: {
        Row: {
          activo: boolean
          anio: number | null
          categoria: string
          created_at: string
          id: string
          imagen_url: string | null
          marca: string | null
          modelo: string | null
          nombre: string
          precio: number
          stock: number
          subcategoria: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          anio?: number | null
          categoria?: string
          created_at?: string
          id?: string
          imagen_url?: string | null
          marca?: string | null
          modelo?: string | null
          nombre: string
          precio: number
          stock?: number
          subcategoria?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          anio?: number | null
          categoria?: string
          created_at?: string
          id?: string
          imagen_url?: string | null
          marca?: string | null
          modelo?: string | null
          nombre?: string
          precio?: number
          stock?: number
          subcategoria?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          monto: number
          receiver_citizen_id: string | null
          sender_citizen_id: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          monto: number
          receiver_citizen_id?: string | null
          sender_citizen_id?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          monto?: number
          receiver_citizen_id?: string | null
          sender_citizen_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_receiver_citizen_id_fkey"
            columns: ["receiver_citizen_id"]
            isOneToOne: false
            referencedRelation: "citizens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_sender_citizen_id_fkey"
            columns: ["sender_citizen_id"]
            isOneToOne: false
            referencedRelation: "citizens"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          anio: number | null
          citizen_id: string
          color: string
          created_at: string
          estado: string
          id: string
          marca: string
          matricula: string
          modelo: string
          store_item_id: string | null
          updated_at: string
          vin: string
        }
        Insert: {
          anio?: number | null
          citizen_id: string
          color: string
          created_at?: string
          estado?: string
          id?: string
          marca: string
          matricula: string
          modelo: string
          store_item_id?: string | null
          updated_at?: string
          vin: string
        }
        Update: {
          anio?: number | null
          citizen_id?: string
          color?: string
          created_at?: string
          estado?: string
          id?: string
          marca?: string
          matricula?: string
          modelo?: string
          store_item_id?: string | null
          updated_at?: string
          vin?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_citizen_id_fkey"
            columns: ["citizen_id"]
            isOneToOne: false
            referencedRelation: "citizens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_store_item_id_fkey"
            columns: ["store_item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
        ]
      }
      wanted_list: {
        Row: {
          activo: boolean
          citizen_id: string
          created_at: string
          id: string
          prioridad: string
          razon: string
          recompensa: number | null
        }
        Insert: {
          activo?: boolean
          citizen_id: string
          created_at?: string
          id?: string
          prioridad?: string
          razon: string
          recompensa?: number | null
        }
        Update: {
          activo?: boolean
          citizen_id?: string
          created_at?: string
          id?: string
          prioridad?: string
          razon?: string
          recompensa?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wanted_list_citizen_id_fkey"
            columns: ["citizen_id"]
            isOneToOne: false
            referencedRelation: "citizens"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "officer" | "citizen"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "officer", "citizen"],
    },
  },
} as const
