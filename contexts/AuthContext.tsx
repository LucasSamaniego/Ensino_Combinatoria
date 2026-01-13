
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for existing session on mount
    const storedUser = localStorage.getItem('plataforma_user_session');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    // Simulating Google Auth Delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock User Data (In a real app, this comes from Firebase/Google)
    const mockUser: UserProfile = {
      uid: 'user_12345_google',
      name: 'Estudante Exemplo',
      email: 'estudante@gmail.com',
      photoURL: 'https://lh3.googleusercontent.com/a/default-user=s96-c' 
    };

    localStorage.setItem('plataforma_user_session', JSON.stringify(mockUser));
    setUser(mockUser);
    setLoading(false);
  };

  const signOut = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    localStorage.removeItem('plataforma_user_session');
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
