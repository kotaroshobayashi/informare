import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { createCaptureJob } from "@/server/jobs";

const schema = z.object({
  url: z.string().url(),
  note: z.string().max(1000).optional(),
  apiKey: z.string()
});

export async function POST(request: NextRequest) {
  const body = schema.safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const { url, note, apiKey } = body.data;

  if (!serverEnv.EXTENSION_API_KEY || apiKey !== serverEnv.EXTENSION_API_KEY) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Find the first user in the system (single-user personal app)
  const supabase = getServiceSupabaseClient();
  let telegramUserId = "ext:default";
  let telegramChatId = "ext:default";

  if (supabase) {
    const { data } = await supabase
      .from("users")
      .select("telegram_user_id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<{ telegram_user_id: string }>();

    if (data?.telegram_user_id) {
      telegramUserId = data.telegram_user_id;
      const { data: accountData } = await supabase
        .from("telegram_accounts")
        .select("telegram_chat_id")
        .eq("user_id", (await supabase.from("users").select("id").eq("telegram_user_id", telegramUserId).single()).data?.id ?? "")
        .maybeSingle<{ telegram_chat_id: string }>();
      telegramChatId = accountData?.telegram_chat_id ?? telegramUserId;
    }
  }

  const job = await createCaptureJob({
    telegramUserId,
    telegramChatId,
    messageId: `web_${Date.now()}`,
    rawUrl: url,
    note: note ?? undefined
  });

  // Fire-and-forget processing
  fetch(`${serverEnv.NEXT_PUBLIC_APP_URL}/api/jobs/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId: job.id })
  }).catch(() => {});

  return NextResponse.json({ ok: true, jobId: job.id });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
