import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'employee';
  avatar_url?: string;
  is_active: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Chave para armazenar sessão no localStorage
const SESSION_KEY = 'obdr_user_session';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar sessão do localStorage ao iniciar
  useEffect(() => {
    const loadSession = () => {
      try {
        const savedSession = localStorage.getItem(SESSION_KEY);
        if (savedSession) {
          const userData = JSON.parse(savedSession) as UserProfile;
          // Verificar se o usuário ainda está ativo no banco
          verifyUser(userData.id).then((isValid) => {
            if (isValid) {
              setUser(userData);
            } else {
              localStorage.removeItem(SESSION_KEY);
            }
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading session:', error);
        localStorage.removeItem(SESSION_KEY);
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  // Verificar se usuário ainda está ativo
  const verifyUser = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, is_active')
        .eq('id', userId)
        .eq('is_active', true)
        .maybeSingle();

      return !error && !!data;
    } catch {
      return false;
    }
  };

  const signIn = async (email: string, password: string) => {
    // Chamar função do banco para verificar senha
    const { data, error } = await supabase.rpc('verify_user_password', {
      p_email: email.toLowerCase().trim(),
      p_password: password,
    });

    if (error) {
      console.error('Login error:', error);
      throw new Error('Erro ao fazer login. Tente novamente.');
    }

    if (!data || data.length === 0) {
      throw new Error('Email ou senha incorretos');
    }

    const userData = data[0] as UserProfile;

    if (!userData.is_active) {
      throw new Error('Usuário desativado. Entre em contato com o administrador.');
    }

    // Salvar sessão
    setUser(userData);
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        profile: user, // Manter compatibilidade com código existente
        loading, 
        signIn, 
        signOut, 
        isAdmin 
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
