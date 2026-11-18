import { useEffect, useState } from "react";
import type { User } from "./types";

export const getCurrentUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem("user");
  return v ? JSON.parse(v) : null;
};
export const setSession = (user: User, token: string) => {
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("token", token);
};
export const clearSession = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
};
export function useCurrentUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => setUser(getCurrentUser()), []);
  return user;
}
