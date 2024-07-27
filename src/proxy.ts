import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Routes nécessitant une authentification (session valide)
const protectedRoutes = [
  "/admin",
  "/dashboard",
  "/signaler",
  "/candidater",
  "/candidatures",
  "/favoris",
  "/invitation",
  "/mes-signalements",
  "/notifications",
  "/profil",
];

// Routes nécessitant en plus le rôle shelter_admin (vérifié dans le layout)
const shelterRoutes = [
  "/shelter-animaux",
  "/shelter-candidatures",
  "/shelter-stats",
  "/shelter-profil",
];

// Routes nécessitant le rôle pension_admin (vérifié dans le layout)
const pensionRoutes = ["/pension-profil"];

// Création d'une pension : toute session authentifiée y a accès ; la promotion
// en pension_admin se fait dans l'action côté serveur.
const pensionSelfRegRoutes = ["/pensions/nouvelle"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const needsAuth =
    protectedRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    ) ||
    shelterRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    ) ||
    pensionRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    ) ||
    pensionSelfRegRoutes.some((route) => pathname === route);

  if (!needsAuth) return NextResponse.next();

  // Vérification optimiste de la présence du cookie de session (sans hit DB).
  // La validation complète et le contrôle de rôle se font dans les layouts
  // via requireAuth() / requireShelter() / requirePension().
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/signaler/:path*",
    "/candidater/:path*",
    "/candidatures/:path*",
    "/favoris/:path*",
    "/invitation/:path*",
    "/mes-signalements/:path*",
    "/notifications/:path*",
    "/profil/:path*",
    "/shelter-animaux/:path*",
    "/shelter-candidatures/:path*",
    "/shelter-stats/:path*",
    "/shelter-profil/:path*",
    "/pension-profil/:path*",
    "/pensions/nouvelle",
  ],
};
