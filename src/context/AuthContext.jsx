import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('sia_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  function signIn(userData, token) {
    localStorage.setItem('sia_token', token);
    localStorage.setItem('sia_user', JSON.stringify(userData));
    setUser(userData);
  }

  function signOut() {
    localStorage.removeItem('sia_token');
    localStorage.removeItem('sia_user');
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
