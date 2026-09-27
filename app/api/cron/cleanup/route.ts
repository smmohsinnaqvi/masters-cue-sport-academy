import { NextResponse } from "next/server";
import { reconcileSessionLifecycle } from "@/lib/session-reconciliation";

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await reconcileSessionLifecycle();
  return NextResponse.json(result);
}

export const GET = run;
export const POST = run;
