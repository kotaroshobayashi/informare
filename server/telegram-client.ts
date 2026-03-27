import { serverEnv } from "@/lib/env";
import { ProcessingResult, SavedPurpose } from "@/lib/types";

const purposeLabels: Record<SavedPurpose, string> = {
  read_later: "あとで読む",
  reread: "再読候補",
  share: "共有したい",
  sns_seed: "SNSネタ",
  networking: "ネットワーキング",
  idea_bank: "アイデア保管",
  learning: "学習メモ",
  other: "その他"
};

function getTelegramApiUrl(method: string) {
  if (!serverEnv.TELEGRAM_BOT_TOKEN) {
    return null;
  }

  return `https://api.telegram.org/bot${serverEnv.TELEGRAM_BOT_TOKEN}/${method}`;
}

async function callTelegram(method: string, payload: Record<string, unknown>) {
  const url = getTelegramApiUrl(method);

  if (!url) {
    return;
  }

  await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

function trimSummary(summary: string, limit = 220) {
  if (summary.length <= limit) {
    return summary;
  }

  return `${summary.slice(0, limit - 1)}…`;
}

export async function sendTelegramText(chatId: string, text: string) {
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: false
  });
}

export async function sendTelegramProcessingResult(chatId: string, result: ProcessingResult) {
  const intro = [
    `保存しました: ${result.title}`,
    "",
    trimSummary(result.summary),
    "",
    `タグ: ${result.tags.join(" / ") || "none"}`,
    `活用案: ${result.suggestedPurposes.map((purpose) => purposeLabels[purpose]).join(" / ")}`,
    result.rereadScore ? `再読スコア: ${result.rereadScore}` : null,
    result.rationale ? `理由: ${trimSummary(result.rationale, 160)}` : null
  ]
    .filter(Boolean)
    .join("\n");

  const keyboard = result.savedItemId
    ? {
        inline_keyboard: [
          result.suggestedPurposes.slice(0, 4).map((purpose) => ({
            text: purposeLabels[purpose],
            callback_data: `purpose:${result.savedItemId}:${purpose}`
          })),
          [{ text: "その他", callback_data: `purpose:${result.savedItemId}:other` }]
        ]
      }
    : undefined;

  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: intro,
    disable_web_page_preview: false,
    reply_markup: keyboard
  });
}

export async function answerTelegramCallback(callbackQueryId: string, text: string) {
  await callTelegram("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text
  });
}
