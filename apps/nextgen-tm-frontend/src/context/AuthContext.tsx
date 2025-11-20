import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  email: string;
  name?: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  handleGoogleLogin: (credentialResponse: any) => Promise<void>;
  logout: () => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

// 从 AppHeader 移过来的工具函数
function base64UrlToJson(b64url: string): any | null {
  try {
    let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad) b64 += "=".repeat(4 - pad);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const jsonStr = typeof TextDecoder !== "undefined" 
      ? new TextDecoder("utf-8").decode(bytes) 
      : decodeURIComponent(escape(binary));
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  const STORAGE_KEY_USER = "tf_google_user";
  const STORAGE_KEY_JWT = "tm_token";

  // 启动时从 localStorage 恢复状态
  useEffect(() => {
    try {
      const rawUser = localStorage.getItem(STORAGE_KEY_USER);
      if (rawUser) {
        const saved = JSON.parse(rawUser);
        if (saved && (saved.name || saved.email)) {
          setUser(saved);
        }
      }
      const savedToken = localStorage.getItem(STORAGE_KEY_JWT);
      if (savedToken) setToken(savedToken);
    } catch {}
  }, []);

  const handleGoogleLogin = async (response: any) => {
    console.log("==================== Google 登录开始 ====================");
    try {
      const idToken = response?.credential;
      if (!idToken) {
        console.warn("⚠️ 未收到 Google ID Token");
        return;
      }
      
      console.log("✅ 收到 Google ID Token:", idToken.substring(0, 50) + "...");

      // 1. 解析 ID Token（前端本地，用于显示用户信息）
      const parts = idToken.split(".");
      const payload = parts && parts[1] ? base64UrlToJson(parts[1]) : null;
      
      const userInfo: User = {
        name: payload?.name ?? "",
        email: payload?.email ?? "",
        picture: payload?.picture ?? ""
      };

      console.log("📋 用户信息:", { email: userInfo.email, name: userInfo.name });

      // 2. 更新本地状态和存储
      setUser(userInfo);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify({ ...userInfo, token: idToken }));
      console.log("✅ 前端状态已更新");

      // 3. 与后端交换 JWT
      console.log("🔄 开始向后端交换 JWT...");
      console.log("   请求 URL: /api/auth/google/login");
      
      try {
        const res = await fetch('/api/auth/google/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: idToken })
        });
        
        console.log(`   响应状态: ${res.status} ${res.statusText}`);
        
        if (res.ok) {
          const data = await res.json();
          console.log("✅ 后端返回 JWT:", data.access_token.substring(0, 50) + "...");
          setToken(data.access_token);
          localStorage.setItem(STORAGE_KEY_JWT, data.access_token);
          console.log("✅ JWT 已保存到 localStorage");
        } else {
          const errorText = await res.text();
          console.error("❌ 后端 JWT 交换失败:");
          console.error("   状态码:", res.status);
          console.error("   响应:", errorText);
        }
      } catch (err) {
        console.error("❌ 后端同步失败（网络错误）:", err);
      }
      
      console.log("==================== Google 登录完成 ====================");
    } catch (e) {
      console.error("❌ Google 登录处理错误:", e);
    }
  };

  const logout = () => {
    // 1. 尝试撤销 Google Token
    try {
      const g: any = (window as any).google;
      if (g?.accounts?.id && user?.email) {
        g.accounts.id.revoke(user.email, () => console.log("Google token revoked"));
        g.accounts.id.disableAutoSelect?.();
      }
    } catch {}

    // 2. 清空状态和存储
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_JWT);
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const res = await fetch(url, { ...options, headers });
    
    // 如果返回 401，自动登出
    if (res.status === 401) {
      logout();
    }
    
    return res;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      isAuthenticated: !!user, 
      handleGoogleLogin, 
      logout, 
      fetchWithAuth 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

