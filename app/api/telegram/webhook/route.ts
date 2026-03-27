import { NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { parseTelegramUpdate } from "@/server/telegram";
import { createCaptureJob, processCaptureJob } from "@/server/jobs";
import {
  answerTelegramCallback,
  sendTelegramProcessingResult,
  sendTelegramText
} from "@/server/telegram-client";
import { OnboardingStep } from "@/lib/types";
import {
  ensureUserContext,
  getUserProfileByTelegramId,
  updateOnboardingFromTelegramText,
  updateSavedItemPurpose
} from "@/server/repository";

function getOnboardingPrompt(step: OnboardingStep) {
  if (step === "role") {
    return [
      "まず、あなたの立場をひとことで教えてください。",
      "例: founder / designer / researcher / investor"
    ].join("\n");
  }

  if (step === "interests") {
    return [
      "次に、興味領域をカンマ区切りで教えてください。",
      "例: AI, workflow, startups, networking"
    ].join("\n");
  }

  return [
    "初期設定は完了しています。",
    "URLを送ると、あなた向けに整理して返します。"
  ].join("\n");
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");

  if (serverEnv.TELEGRAM_WEBHOOK_SECRET && secret !== serverEnv.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const event = parseTelegramUpdate(body);

  if (!event) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (event.type === "command") {
    const { profile } = await ensureUserContext(event.payload.telegramUserId, event.payload.telegramChatId);
    await sendTelegramText(
      event.payload.telegramChatId,
      [
        "Informareへようこそ。",
        "",
        "URLをそのまま送ると、要約・タグ・再読候補として整理します。",
        "リンクの後ろに一言メモを付けても保存できます。"
      ].join("\n")
    );

    if (!profile.onboardingCompleted) {
      await sendTelegramText(event.payload.telegramChatId, getOnboardingPrompt(profile.onboardingStep));
    }

    return NextResponse.json({ ok: true, handled: "command" });
  }

  if (event.type === "text_message") {
    const profile = await getUserProfileByTelegramId(event.payload.telegramUserId);

    if (!profile || profile.onboardingCompleted) {
      await sendTelegramText(
        event.payload.telegramChatId,
        "URLを送ると保存できます。必要なら `/start` で初期設定をやり直せます。"
      );

      return NextResponse.json({ ok: true, handled: "text_message_idle" });
    }

    const onboarding = await updateOnboardingFromTelegramText(event.payload.telegramUserId, event.payload.text);

    if (onboarding.step === "interests") {
      await sendTelegramText(event.payload.telegramChatId, getOnboardingPrompt("interests"));
      return NextResponse.json({ ok: true, handled: "onboarding_role" });
    }

    await sendTelegramText(
      event.payload.telegramChatId,
      [
        "ありがとうございます。初期設定が完了しました。",
        `立場: ${onboarding.profile?.role ?? ""}`,
        `興味領域: ${onboarding.profile?.interestAreas.join(" / ") ?? ""}`,
        "",
        "これでURLを送ると、あなた向けに整理して返します。"
      ].join("\n")
    );

    return NextResponse.json({ ok: true, handled: "onboarding_completed" });
  }

  if (event.type === "purpose_selection") {
    await updateSavedItemPurpose(event.payload.savedItemId, event.payload.purpose);
    await answerTelegramCallback(event.payload.callbackQueryId, "用途を更新しました。");
    await sendTelegramText(
      event.payload.telegramChatId,
      `この保存の用途を \`${event.payload.purpose}\` に更新しました。`
    );

    return NextResponse.json({ ok: true, handled: "purpose_selection" });
  }

  const profile = await getUserProfileByTelegramId(event.payload.telegramUserId);

  if (profile && !profile.onboardingCompleted) {
    await sendTelegramText(
      event.payload.telegramChatId,
      [
        "先に初期設定を完了させましょう。",
        getOnboardingPrompt(profile.onboardingStep)
      ].join("\n\n")
    );

    return NextResponse.json({ ok: true, handled: "onboarding_required" });
  }

  const job = await createCaptureJob(event.payload);
  await sendTelegramText(event.payload.telegramChatId, "リンクを受け取りました。整理して返します。");
  const result = await processCaptureJob(job.id);
  await sendTelegramProcessingResult(event.payload.telegramChatId, result);

  return NextResponse.json({
    ok: true,
    queued: true,
    jobId: job.id
  });
}
