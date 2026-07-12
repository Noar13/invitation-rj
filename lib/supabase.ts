import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

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