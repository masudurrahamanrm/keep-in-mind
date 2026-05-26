import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// ── Types ──────────────────────────────────────────────────

interface User {
  _id: string;
  name: string;
  email: string;
  avatar: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;           // Our Backend JWT
  googleAccessToken: string | null; // Google OAuth Token for Drive
  loading: boolean;
  login: (userData: User, token: string, googleToken: string) => void;
  updateGoogleToken: (googleToken: string, userData?: User) => void;
  updateUser: (userData: Partial<User>) => void;
  clearGoogleToken: () => void;
  signOut: () => void;
}

// ── Context ────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  googleAccessToken: null,
  loading: true,
  login: () => {},
  updateGoogleToken: () => {},
  updateUser: () => {},
  clearGoogleToken: () => {},
  signOut: () => {},
});

// ── Provider ───────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load persisted auth state on mount
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedGToken = localStorage.getItem('googleToken');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // Handle the case where googleToken might be exactly the string "undefined" or null
        const validGToken = (savedGToken && savedGToken !== 'undefined') ? savedGToken : null;
        setGoogleAccessToken(validGToken);
      } catch (err) {
        console.error('Failed to parse saved user data:', err);
        signOut(); // Clear corrupted data
      }
    }
    setLoading(false);
  }, []);

  const updateGoogleToken = (googleToken: string, userData?: User) => {
    const validGToken = googleToken || null;
    setGoogleAccessToken(validGToken);
    if (validGToken) {
      localStorage.setItem('googleToken', validGToken);
    } else {
      localStorage.removeItem('googleToken');
    }
    if (userData) {
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    }
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...userData };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const clearGoogleToken = () => {
    setGoogleAccessToken(null);
    localStorage.removeItem('googleToken');
  };

  const login = (userData: User, authToken: string, googleToken?: string) => {
    if (!userData || !authToken) {
      console.error('Login called with missing user data or token');
      return;
    }
    const validGToken = (googleToken && googleToken !== 'undefined') ? googleToken : null;
    setUser(userData);
    setToken(authToken);
    setGoogleAccessToken(validGToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    if (validGToken) {
      localStorage.setItem('googleToken', validGToken);
    } else {
      localStorage.removeItem('googleToken');
    }
  };

  const signOut = () => {
    setUser(null);
    setToken(null);
    setGoogleAccessToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('googleToken');
  };

  return (
    <AuthContext.Provider value={{ user, token, googleAccessToken, loading, login, updateGoogleToken, updateUser, clearGoogleToken, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
