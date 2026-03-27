import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { processCaptureJob } from "@/server/jobs";

const schema = z.object({
  jobId: z.string()
});

export async function POST(request: NextRequest) {
  const { jobId } = schema.parse(await request.json());
  const result = await processCaptureJob(jobId);

  return NextResponse.json({
    ok: true,
    result
  });
}
