import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type Session } from "./auth";

export async function getCurrentSession(): Promise<Session | null> {
  return await auth.api.getSession({ headers: await headers() });
}

export async function requireAuth(): Promise<Session> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireShelter(): Promise<
  Session & { user: { shelterId: string } }
> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (session.user.role !== "shelter_admin" || !session.user.shelterId) {
    redirect("/dashboard");
  }
  return session as Session & { user: { shelterId: string } };
}

export async function requirePension(): Promise<
  Session & { user: { pensionId: string } }
> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (session.user.role !== "pension_admin" || !session.user.pensionId) {
    redirect("/dashboard");
  }
  return session as Session & { user: { pensionId: string } };
}

export async function requireVeterinarian(): Promise<
  Session & { user: { vetId: string } }
> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (session.user.role !== "veterinarian_admin" || !session.user.vetId) {
    redirect("/dashboard");
  }
  return session as Session & { user: { vetId: string } };
}

export async function requirePlatformAdmin(): Promise<Session> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (session.user.role !== "platform_admin") redirect("/dashboard");
  return session;
}
