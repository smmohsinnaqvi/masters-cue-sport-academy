import { NextResponse } from "next/server";

import { getAcademySession } from "@/lib/supabase-auth-server";

export async function GET() {
  const session = await getAcademySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ session }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
