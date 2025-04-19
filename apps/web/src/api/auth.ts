import { api } from "./client";
import type { ApiResponse, AuthTokens, UpdateProfileInput, User } from "./types";

export const authApi = {
  register: (email: string, name: string, password: string) =>
    api
      .post<ApiResponse<AuthTokens>>(
        "/api/v1/auth/register",
        { email, name, password },
        false,
      )
      .then((r) => r.data),

  login: (email: string, password: string) =>
    api
      .post<ApiResponse<AuthTokens>>("/api/v1/auth/login", { email, password }, false)
      .then((r) => r.data),

  me: () => api.get<ApiResponse<User>>("/api/v1/me").then((r) => r.data),

  updateProfile: (input: UpdateProfileInput) =>
    api.patch<ApiResponse<User>>("/api/v1/me", input).then((r) => r.data),

  logout: (refreshToken: string) =>
    api.post<void>("/api/v1/auth/logout", { refreshToken }, false),
};
