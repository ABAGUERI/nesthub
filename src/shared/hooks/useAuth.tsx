import { useState, useEffect, createContext, useContext } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/shared/utils/supabase';
import { User } from '@/shared/types';

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: Partial<User>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier la session initiale
    checkUser();

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        await loadUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setUser({
        id: data.id,
        email: supabaseUser?.email || '',
        firstName: data.first_name,
        lastName: data.last_name,
        city: data.city,
        postalCode: data.postal_code,
        hasChildren: data.has_children,
        trialEndsAt: data.trial_ends_at,
        subscriptionStatus: data.subscription_status,
        onboardingCompleted: data.onboarding_completed,
        createdAt: data.created_at,
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const signUp = async (email: string, password: string, userData: Partial<User>) => {
    // Passer les données dans user_metadata
    // Le trigger Supabase créera automatiquement le profil
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: userData.firstName || '',
          last_name: userData.lastName || '',
          city: userData.city || '',
          postal_code: userData.postalCode || '',
          has_children: userData.hasChildren || false,
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user returned from signup');

    // Le profil est créé automatiquement par le trigger handle_new_user()
    // Pas besoin de l'insérer manuellement
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setSupabaseUser(null);
  };

  const refreshUser = async () => {
    if (supabaseUser) {
      await loadUserProfile(supabaseUser.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        loading,
        signUp,
        signIn,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
