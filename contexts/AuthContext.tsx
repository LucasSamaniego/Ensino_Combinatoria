import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { auth, googleProvider } from '../services/firebase';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  isDemo: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Se auth for undefined, estamos em modo Demo
  const isDemo = !auth;

  useEffect(() => {
    // Se não houver auth (chaves faltando), apenas libera o loading.
    // O login será tratado via mock no signInWithGoogle.
    if (!auth) {
      console.warn("Firebase Auth não inicializado. Ativando Modo Demo.");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userProfile: UserProfile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'Estudante',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || undefined
        };
        setUser(userProfile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    
    // Fallback: Login de Demonstração se o Firebase não estiver configurado
    if (!auth || !googleProvider) {
      setTimeout(() => {
        setUser({
          uid: 'demo-user-123',
          name: 'Usuário Convidado',
          email: 'convidado@plataforma.com',
          photoURL: undefined
        });
        setLoading(false);
      }, 1000);
      return;
    }

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Erro no login:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError("Domínio não autorizado. Adicione este domínio no console do Firebase.");
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError("Login cancelado pelo usuário.");
      } else {
        setError("Falha ao conectar com o Google. Tente novamente.");
      }
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    // Logout do modo Demo
    if (!auth) {
      setUser(null);
      setLoading(false);
      return;
    }
    
    // Logout real
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error("Erro ao sair:", err);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut, error, isDemo }}>
      {children}
    </AuthContext.Provider>
  );
};