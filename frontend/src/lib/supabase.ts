import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder_anon_key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin';
  access_status: 'pendiente' | 'activo' | 'revocado';
  created_at: string;
  access_granted_at: string | null;
  access_granted_by: string | null;
  subscription_status?: string | null;
}
