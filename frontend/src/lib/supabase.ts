import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder_anon_key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin';
  access_status: 'pendiente' | 'activa' | 'vencida' | 'cancelada' | 'revocada';
  created_at: string;
  access_granted_at: string | null;
  access_granted_by: string | null;
  subscription_status?: string | null;
  subscription_expires_at?: string | null;
  last_payment_confirmed_at?: string | null;
}

export type GoalTargetType = 'capital_total' | 'ganancia_periodo' | 'winrate' | 'personalizada';
export type GoalStatus = 'en_progreso' | 'completada' | 'vencida';

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_type: GoalTargetType;
  target_value: number;
  trading_account_id: string | null;
  deadline: string | null;
  status: GoalStatus;
  completed_at: string | null;
  created_at: string;
}

export type BibleVerse = {
  id: string;
  topic: string;
  reference: string;
  text_es: string;
  created_at: string;
}

