import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const subscription = await request.json();

  await db
    .update(users)
    .set({ pushSubscription: subscription })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ success: true });
}
