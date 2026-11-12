import { api } from "@/lib/api";
import type { Role, User } from "@/lib/types";

export const usersApi = {
  list: (query: { search?: string; role?: Role | "" }, signal?: AbortSignal) => api.get<User[]>("/users", query, signal),
  create: (input: { name: string; email: string; password: string; role: Role; active: boolean }) => api.post<User>("/users", input),
  update: (id: string, input: Partial<{ name: string; email: string; role: Role; active: boolean }>) => api.patch<User>(`/users/${id}`, input),
  resetPassword: (id: string, password: string) => api.post<User>(`/users/${id}/password`, { password }),
  remove: (id: string) => api.delete<{ id: string }>(`/users/${id}`),
};

export const accountApi = {
  updateProfile: (name: string) => api.patch<User>("/auth/me", { name }),
  changePassword: (currentPassword: string, newPassword: string) => api.post<{ changed: boolean }>("/auth/password", { currentPassword, newPassword }),
};
