import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createCaptureJob } from "@/server/jobs";

const schema = z.object({
  telegramUserId: z.string(),
  telegramChatId: z.string(),
  messageId: z.string(),
  rawUrl: z.string().url(),
  note: z.string().max(500).optional()
});

export async function POST(request: NextRequest) {
  const payload = schema.parse(await request.json());
  const job = await createCaptureJob(payload);

  return NextResponse.json({
    ok: true,
    jobId: job.id
  });
}
