// lib/supabaseClient.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// .env.local 과 Vercel 환경변수에서 가져오기
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 안전 가드: 둘 다 없으면 null
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null;
