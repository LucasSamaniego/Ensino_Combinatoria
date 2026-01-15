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
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Se o auth não foi inicializado (chaves faltando), define erro e para o loading
    if (!auth) {
      console.warn("Auth service not initialized");
      setError("Configuração do Firebase não encontrada. Verifique o arquivo .env.");
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
    
    if (!auth || !googleProvider) {
      setError("Serviço de autenticação não configurado.");
      setLoading(false);
      return;
    }

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Erro no login:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError("Domínio não autorizado. Adicione este domínio no console do Firebase.");
      } else {
        setError("Falha ao conectar com o Google. Tente novamente.");
      }
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!auth) return;
    setLoading(true);
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error("Erro ao sair:", err);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut, error }}>
      {children}
    </AuthContext.Provider>
  );
};