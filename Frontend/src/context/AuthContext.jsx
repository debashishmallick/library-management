import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // On app start, verify the saved token is still valid
  useEffect(() => {
    const verify = async () => {
      if (!localStorage.getItem("token")) return setLoading(false);
      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
        localStorage.setItem("user", JSON.stringify(data));
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, []);

  const saveSession = (data) => {
    const { token, ...userData } = data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    saveSession(data);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    saveSession(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };


  const updateUser = (data) => {
  const updated = { ...user, ...data };
  localStorage.setItem("user", JSON.stringify(updated));
  setUser(updated);
};

  const isStaff = user && ["admin", "librarian"].includes(user.role);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);