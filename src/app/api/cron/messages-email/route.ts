import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import { processPendingMessageEmailNotifications } from "@/lib/messages/actions";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const result = await processPendingMessageEmailNotifications();
  return NextResponse.json({ ok: true, ...result });
}
