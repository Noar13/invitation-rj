import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface Guest {
  id: string;
  name: string;
  address: string;
  phone: string;
  from_bride: string;
  member: number;
  category: string;
  status: "pending" | "checked-in";
  checkin_time: string | null;
}

export interface Wish {
  id: string;
  name: string;
  phone: string;
  message: string;
  created_at: string;
}

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  _client = createClient(url, key);
  return _client;
}

// Untuk backward compatibility — pakai getSupabaseClient() di semua file
export const supabase = {
  from: (...args: Parameters<SupabaseClient["from"]>) => getSupabaseClient().from(...args),
  channel: (...args: Parameters<SupabaseClient["channel"]>) => getSupabaseClient().channel(...args),
  removeChannel: (...args: Parameters<SupabaseClient["removeChannel"]>) => getSupabaseClient().removeChannel(...args),
};