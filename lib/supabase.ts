import { createClient } from "@supabase/supabase-js";

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

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env variables missing");
  return createClient(url, key);
}

let _supabase: ReturnType<typeof createClient> | null = null;

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    if (!_supabase) _supabase = getSupabase();
    return (_supabase as Record<string | symbol, unknown>)[prop];
  },
});