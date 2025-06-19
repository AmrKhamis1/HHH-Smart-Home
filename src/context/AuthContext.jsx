import { createContext, useContext, useState, useEffect } from "react";
import { validateToken, removeToken, getStoredToken } from "../utils/auth";

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = getStoredToken();
        if (token) {
          const isValid = await validateToken(token);
          if (isValid) {
            setIsAuthenticated(true);
            // You can also set user data here if your API returns it
          } else {
            removeToken();
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        removeToken();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem("accessToken", JSON.stringify({ success: token }));
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    removeToken();
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
