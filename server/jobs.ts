import { ProcessingResult, TelegramIncomingLinkPayload } from "@/lib/types";
import { extractSourcePreview, extractSourcePreviewForProfile } from "@/server/extractor";
import { attachTags, ensureUserContext, getUserProfileByUserId } from "@/server/repository";
import { getServiceSupabaseClient } from "@/lib/supabase";

const inMemoryJobs = new Map<
  string,
  {
    id: string;
    payload: TelegramIncomingLinkPayload;
    status: "queued" | "processed";
    duplicate?: boolean;
    result?: ProcessingResult;
  }
>();

export async function createCaptureJob(payload: TelegramIncomingLinkPayload) {
  const supabase = getServiceSupabaseClient();

  if (supabase) {
    const { userId } = await ensureUserContext(payload.telegramUserId, payload.telegramChatId);

    const { data: existingRawLink } = await supabase
      .from("raw_links")
      .select("id")
      .eq("user_id", userId)
      .eq("telegram_message_id", payload.messageId)
      .eq("telegram_chat_id", payload.telegramChatId)
      .eq("raw_url", payload.rawUrl)
      .maybeSingle<{ id: string }>();

    if (existingRawLink) {
      return {
        id: `existing:${existingRawLink.id}`,
        payload,
        status: "queued" as const,
        duplicate: true as const
      };
    }

    const { data: rawLinkData, error: rawLinkError } = await supabase
      .from("raw_links")
      .insert({
        user_id: userId,
        telegram_message_id: payload.messageId,
        telegram_chat_id: payload.telegramChatId,
        raw_url: payload.rawUrl,
        capture_note: payload.note ?? null
      })
      .select("id")
      .single<{ id: string }>();

    if (rawLinkError || !rawLinkData) {
      throw new Error(rawLinkError?.message || "Failed to store raw link");
    }

    const { data: jobData, error: jobError } = await supabase
      .from("jobs")
      .insert({
        user_id: userId,
        kind: "capture",
        status: "queued",
        payload: {
          ...payload,
          rawLinkId: rawLinkData.id
        }
      })
      .select("id")
      .single<{ id: string }>();

    if (jobError || !jobData) {
      throw new Error(jobError?.message || "Failed to create job");
    }

    return {
      id: jobData.id,
      payload,
      status: "queued" as const,
      duplicate: false as const
    };
  }

  const duplicateKey = `${payload.telegramChatId}:${payload.messageId}:${payload.rawUrl}`;
  const existing = [...inMemoryJobs.values()].find(
    (job) =>
      `${job.payload.telegramChatId}:${job.payload.messageId}:${job.payload.rawUrl}` === duplicateKey
  );

  if (existing) {
    return {
      id: existing.id,
      payload,
      status: existing.status,
      duplicate: true as const
    };
  }

  const id = `job_${crypto.randomUUID()}`;
  const job = {
    id,
    payload,
    status: "queued" as const,
    duplicate: false as const
  };

  inMemoryJobs.set(id, job);
  return job;
}

export async function processCaptureJob(jobId: string) {
  const supabase = getServiceSupabaseClient();

  if (supabase) {
    const { data: jobData, error: jobError } = await supabase
      .from("jobs")
      .select("id, user_id, payload")
      .eq("id", jobId)
      .single<{ id: string; user_id: string; payload: TelegramIncomingLinkPayload & { rawLinkId?: string } }>();

    if (jobError || !jobData) {
      throw new Error(jobError?.message || `Job ${jobId} not found`);
    }

    await supabase.from("jobs").update({ status: "running" }).eq("id", jobId);

    try {
      const profile = await getUserProfileByUserId(jobData.user_id);
      const extracted =
        profile.onboardingCompleted && profile.role
          ? await extractSourcePreviewForProfile(jobData.payload.rawUrl, profile)
          : await extractSourcePreview(jobData.payload.rawUrl);

      const { data: sourceData, error: sourceError } = await supabase
        .from("sources")
        .upsert(
          {
            canonical_url: extracted.canonicalUrl,
            domain: extracted.domain,
            title: extracted.title,
            platform: extracted.platform,
            og_image_url: extracted.thumbnailUrl ?? null
          },
          { onConflict: "canonical_url" }
        )
        .select("id")
        .single<{ id: string }>();

      if (sourceError || !sourceData) {
        throw new Error(sourceError?.message || "Failed to store source");
      }

      const { data: documentData, error: documentError } = await supabase
        .from("documents")
        .insert({
          source_id: sourceData.id,
          language: extracted.language,
          summary: extracted.summary,
          rationale: extracted.rationale,
          suggested_purposes: extracted.suggestedPurposes,
          reread_score: extracted.rereadScore,
          metadata: {
            title: extracted.title,
            main_point: extracted.mainPoint,
            thumbnail_url: extracted.thumbnailUrl ?? null,
            platform: extracted.platform
          }
        })
        .select("id")
        .single<{ id: string }>();

      if (documentError || !documentData) {
        throw new Error(documentError?.message || "Failed to store document");
      }

      const { data: savedItemData, error: savedItemError } = await supabase
        .from("saved_items")
        .upsert(
          {
            user_id: jobData.user_id,
            raw_link_id: jobData.payload.rawLinkId ?? null,
            document_id: documentData.id,
            status: "processed",
            suggested_purpose: extracted.suggestedPurposes[0] ?? "read_later",
            reread_score: extracted.rereadScore
          },
          { onConflict: "user_id,document_id" }
        )
        .select("id")
        .single<{ id: string }>();

      if (savedItemError || !savedItemData) {
        throw new Error(savedItemError?.message || "Failed to store saved item");
      }

      await attachTags(savedItemData.id, extracted.tags);

      const result: ProcessingResult = {
        savedItemId: savedItemData.id,
        title: extracted.title,
        summary: extracted.summary,
        language: extracted.language,
        tags: extracted.tags,
        rationale: extracted.rationale,
        suggestedPurposes: extracted.suggestedPurposes,
        rereadScore: extracted.rereadScore
      };

      await supabase
        .from("jobs")
        .update({
          status: "completed",
          result
        })
        .eq("id", jobId);

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown processing error";
      await supabase
        .from("jobs")
        .update({
          status: "failed",
          last_error: message
        })
        .eq("id", jobId);
      throw error;
    }
  }

  const job = inMemoryJobs.get(jobId);

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  const extracted = await extractSourcePreview(job.payload.rawUrl);
  const result: ProcessingResult = {
    savedItemId: jobId,
    title: extracted.title,
    summary: extracted.summary,
    language: extracted.language,
    tags: extracted.tags,
    rationale: extracted.rationale,
    suggestedPurposes: extracted.suggestedPurposes,
    rereadScore: extracted.rereadScore
  };

  inMemoryJobs.set(jobId, {
    ...job,
    status: "processed",
    result
  });

  return result;
}
