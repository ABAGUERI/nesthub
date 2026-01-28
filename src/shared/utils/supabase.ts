import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const ensureSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return null;
  }

  if (data.session) {
    return data.session;
  }

  const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    return null;
  }

  return refreshedData.session ?? null;
};

// Helper pour obtenir l'utilisateur actuel
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

// Helper pour obtenir la session actuelle
export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

// Helper pour se déconnecter
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
