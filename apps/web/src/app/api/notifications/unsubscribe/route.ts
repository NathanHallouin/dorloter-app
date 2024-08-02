import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@infra/auth/session";
import { db } from "@infra/db";
import { users } from "@/server/db/schema";

export async function POST() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  await db
    .update(users)
    .set({ pushSubscription: null })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ success: true });
}
