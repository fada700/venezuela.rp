import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useCitizen() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["citizen", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("citizens")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useTransactions() {
  const { data: citizen } = useCitizen();
  return useQuery({
    queryKey: ["transactions", citizen?.id],
    queryFn: async () => {
      if (!citizen) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .or(`sender_citizen_id.eq.${citizen.id},receiver_citizen_id.eq.${citizen.id}`)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!citizen,
  });
}

export function useNotifications() {
  const { data: citizen } = useCitizen();
  return useQuery({
    queryKey: ["notifications", citizen?.id],
    queryFn: async () => {
      if (!citizen) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("citizen_id", citizen.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!citizen,
  });
}

export function useStoreItems() {
  return useQuery({
    queryKey: ["store_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_items")
        .select("*")
        .eq("activo", true)
        .order("precio", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useVehicles() {
  const { data: citizen } = useCitizen();
  return useQuery({
    queryKey: ["vehicles", citizen?.id],
    queryFn: async () => {
      if (!citizen) return [];
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("citizen_id", citizen.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!citizen,
  });
}

export function useLicenses() {
  const { data: citizen } = useCitizen();
  return useQuery({
    queryKey: ["licenses", citizen?.id],
    queryFn: async () => {
      if (!citizen) return [];
      const { data, error } = await supabase
        .from("licenses")
        .select("*")
        .eq("citizen_id", citizen.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!citizen,
  });
}

export function useFines() {
  const { data: citizen } = useCitizen();
  return useQuery({
    queryKey: ["fines", citizen?.id],
    queryFn: async () => {
      if (!citizen) return [];
      const { data, error } = await supabase
        .from("fines")
        .select("*")
        .eq("citizen_id", citizen.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!citizen,
  });
}

export function usePurchases() {
  const { data: citizen } = useCitizen();
  return useQuery({
    queryKey: ["purchases", citizen?.id],
    queryFn: async () => {
      if (!citizen) return [];
      const { data, error } = await supabase
        .from("purchases")
        .select("*")
        .eq("citizen_id", citizen.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!citizen,
  });
}

export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}
