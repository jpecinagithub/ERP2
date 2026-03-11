import { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const [registerMessage, setRegisterMessage] = useState('');

  useEffect(() => {
    // Check for register success message in location state
    if (location.state?.message) {
      setRegisterMessage(location.state.message);
      // Clear the message after 5 seconds
      setTimeout(() => setRegisterMessage(''), 5000);
    }
  }, [location]);

  useEffect(() => {
    const token = localStorage.getItem('erp_token');
    const savedUser = localStorage.getItem('erp_user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('erp_token');
        localStorage.removeItem('erp_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const res = await client.post('/auth/login', { username, password });
    const { token } = res.data;
    // Decode JWT payload
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userData = { id: payload.id, username: payload.username, role: payload.role };
    localStorage.setItem('erp_token', token);
    localStorage.setItem('erp_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, registerMessage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
