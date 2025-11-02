import { api } from "./client";
import type { ApiResponse, MyDigest } from "./types";

/** Digest « Nouveautés dans votre rayon » (feature 5.2). */
export const digestApi = {
  /** Suggestions à la volée pour l'utilisateur connecté. */
  mine: () => api.get<ApiResponse<MyDigest>>("/api/v1/me/digest").then((r) => r.data),
};
