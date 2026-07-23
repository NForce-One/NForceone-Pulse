import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));

        getMe()
          .then((result) => {
            const freshUser = result?.data ?? result;
            if (freshUser && freshUser.name) {
              setUser(freshUser);
              localStorage.setItem('user', JSON.stringify(freshUser));
            }
          })
          .catch(() => {});
      } catch (error) {
        console.error("Error parsing stored user:", error);
        localStorage.removeItem('user');
      }
    }

    setLoading(false);
  }, []);

  const login = (authToken, userData) => {
    // Save to localStorage
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));

    // Update state
    setToken(authToken);
    setUser(userData);
  };

  const logout = () => {
    // Clear storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Clear state
    setToken(null);
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser((prev) => {
      const updated = { ...prev, ...userData };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        updateUser,
      }}
    >
      {/* 🔥 IMPORTANT FIX */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};