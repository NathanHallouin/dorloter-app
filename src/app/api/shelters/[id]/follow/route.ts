import { NextResponse } from "next/server";
import { getCurrentSession } from "@infra/auth/session";
import { isFollowingShelter } from "@shelters/public";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ following: false, authed: false });
  }
  const following = await isFollowingShelter(session.user.id, id);
  return NextResponse.json({ following, authed: true });
}
