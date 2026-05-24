/**
 * Stockage des jetons JWT.
 *
 * Choix assumé (app grand public, simplicité) : access + refresh en
 * localStorage pour survivre au rechargement. Caveat XSS connu · pour un
 * durcissement, passer le refresh token en cookie httpOnly côté API.
 */

const ACCESS_KEY = "dorloter.accessToken";
const REFRESH_KEY = "dorloter.refreshToken";

export const tokenStore = {
  getAccess(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string): void {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
