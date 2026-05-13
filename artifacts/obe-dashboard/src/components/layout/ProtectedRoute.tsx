import { useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { useLocation } from "wouter";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!accessToken) {
      setLocation("/login");
    }
  }, [accessToken, setLocation]);

  if (!accessToken) return null;

  return <>{children}</>;
}
