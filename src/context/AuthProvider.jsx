import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext.js";
import * as authService from "../services/authService.js";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const data = await authService.session();

        if (active) {
          setUser(data.user);
          setSessionError(null);
        }
      } catch {
        if (active) {
          setUser(null);
          setSessionError("Não foi possível consultar a sessão.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  async function login(email, password, remember) {
    const data = await authService.login(
      email,
      password,
      remember
    );

    setUser(data);
  }

  async function logout() {
    await authService.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sessionError,
        login,
        logout,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
