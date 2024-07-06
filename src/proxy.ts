import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";

// Routes nécessitant une authentification
const protectedRoutes = [
  "/dashboard",
  "/signaler",
  "/candidatures",
  "/mes-signalements",
  "/notifications",
  "/profil",
];

// Routes nécessitant le rôle shelter_admin
const shelterRoutes = ["/shelter-chats", "/shelter-candidatures", "/shelter-stats"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isShelter = shelterRoutes.some((route) => pathname.startsWith(route));

  if (!isProtected && !isShelter) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isShelter && session.user.role !== "shelter_admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/signaler/:path*",
    "/candidatures/:path*",
    "/mes-signalements/:path*",
    "/notifications/:path*",
    "/profil/:path*",
    "/shelter-chats/:path*",
    "/shelter-candidatures/:path*",
    "/shelter-stats/:path*",
  ],
};
