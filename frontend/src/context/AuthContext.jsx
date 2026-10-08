import { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifySession() {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        try {
          const freshUser = await authService.getMe();
          const userObj = { ...freshUser };
          const cachedAvatar = localStorage.getItem("profile_avatar_" + userObj.email?.toLowerCase());

          if (!userObj.profile_image && cachedAvatar) {
            userObj.profile_image = cachedAvatar;
            authService.uploadAvatar({ profile_image: cachedAvatar }).catch(() => {});
          } else if (userObj.profile_image) {
            localStorage.setItem("profile_avatar_" + userObj.email?.toLowerCase(), userObj.profile_image);
          }

          setUser(userObj);
          localStorage.setItem("user", JSON.stringify(userObj));
        } catch {
          // Token invalid
          setUser(null);
          setToken(null);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    }
    verifySession();
  }, []);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    const userObj = { ...data.user };
    const cachedAvatar = localStorage.getItem("profile_avatar_" + userObj.email?.toLowerCase());

    if (!userObj.profile_image && cachedAvatar) {
      userObj.profile_image = cachedAvatar;
      authService.uploadAvatar({ profile_image: cachedAvatar }).catch(() => {});
    } else if (userObj.profile_image) {
      localStorage.setItem("profile_avatar_" + userObj.email?.toLowerCase(), userObj.profile_image);
    }

    setToken(data.token);
    setUser(userObj);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(userObj));
    return userObj;
  };

  const loginWithGoogle = async (credential) => {
    const data = await authService.loginWithGoogle(credential);
    const userObj = { ...data.user };
    const cachedAvatar = localStorage.getItem("profile_avatar_" + userObj.email?.toLowerCase());

    if (!userObj.profile_image && cachedAvatar) {
      userObj.profile_image = cachedAvatar;
      authService.uploadAvatar({ profile_image: cachedAvatar }).catch(() => {});
    } else if (userObj.profile_image) {
      localStorage.setItem("profile_avatar_" + userObj.email?.toLowerCase(), userObj.profile_image);
    }

    setToken(data.token);
    setUser(userObj);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(userObj));
    return userObj;
  };

  // ปุ่ม Quick Demo Login สำหรับสลับทดสอบแต่ละ Role ใน 1 คลิก
  const quickLogin = async (role) => {
    const demoAccounts = {
      admin: { email: "admin@ksu.ac.th", password: "admin1234" },
      head: { email: "head.cpe@ksu.ac.th", password: "head1234" },
      staff: { email: "staff@ksu.ac.th", password: "staff1234" },
      lecturer: { email: "somchai.cpe@ksu.ac.th", password: "user1234" },
    };

    const creds = demoAccounts[role] || demoAccounts.admin;
    return await login(creds.email, creds.password);
  };

  const updateUserProfile = (updatedUser) => {
    if (updatedUser?.profile_image && updatedUser?.email) {
      localStorage.setItem("profile_avatar_" + updatedUser.email.toLowerCase(), updatedUser.profile_image);
    }
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const logout = async () => {
    await authService.logout();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        loginWithGoogle,
        quickLogin,
        updateUserProfile,
        logout,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
