import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('sia_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  function signIn(userData, token) {
    sessionStorage.setItem('sia_token', token);
    sessionStorage.setItem('sia_user', JSON.stringify(userData));
    setUser(userData);
  }

  function signOut() {
    sessionStorage.removeItem('sia_token');
    sessionStorage.removeItem('sia_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
