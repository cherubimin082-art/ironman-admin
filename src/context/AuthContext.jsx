import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

const tokenKey = (role) => `sia_token_${role}`;
const userKey  = (role) => `sia_user_${role}`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const role = sessionStorage.getItem('sia_active_role');
      if (!role) return null;
      const stored = localStorage.getItem(userKey(role));
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  function signIn(userData, token) {
    const role = userData.role;
    localStorage.setItem(tokenKey(role), token);
    localStorage.setItem(userKey(role), JSON.stringify(userData));
    sessionStorage.setItem('sia_active_role', role);
    setUser(userData);
  }

  function signOut() {
    const role = sessionStorage.getItem('sia_active_role');
    if (role) {
      localStorage.removeItem(tokenKey(role));
      localStorage.removeItem(userKey(role));
    }
    sessionStorage.removeItem('sia_active_role');
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
