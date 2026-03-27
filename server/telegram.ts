import { z } from "zod";
import {
  OnboardingStep,
  SavedPurpose,
  TelegramCommandPayload,
  TelegramIncomingLinksPayload,
  TelegramPurposeSelectionPayload,
  TelegramTextMessagePayload,
  TelegramWebhookEvent
} from "@/lib/types";

const messageSchema = z.object({
  message_id: z.number(),
  text: z.string(),
  chat: z.object({
    id: z.union([z.string(), z.number()])
  }),
  from: z
    .object({
      id: z.union([z.string(), z.number()])
    })
    .optional()
});

const callbackQuerySchema = z.object({
  id: z.string(),
  data: z.string(),
  from: z.object({
    id: z.union([z.string(), z.number()])
  }),
  message: z.object({
    chat: z.object({
      id: z.union([z.string(), z.number()])
    })
  })
});

const updateSchema = z.object({
  message: messageSchema.optional(),
  callback_query: callbackQuerySchema.optional()
});

const supportedPurposes = new Set<SavedPurpose>([
  "read_later",
  "reread",
  "share",
  "sns_seed",
  "networking",
  "idea_bank",
  "learning",
  "other"
]);

function parseCommand(text: string, telegramUserId: string, telegramChatId: string): TelegramCommandPayload | null {
  const normalized = text.trim().toLowerCase();

  if (normalized.startsWith("/start")) {
    return {
      telegramUserId,
      telegramChatId,
      command: "start"
    };
  }

  if (normalized.startsWith("/help")) {
    return {
      telegramUserId,
      telegramChatId,
      command: "help"
    };
  }

  return null;
}

function parsePlainTextMessage(
  text: string,
  telegramUserId: string,
  telegramChatId: string
): TelegramTextMessagePayload | null {
  const normalized = text.trim();

  if (!normalized) {
    return null;
  }

  return {
    telegramUserId,
    telegramChatId,
    text: normalized
  };
}

function parsePurposeSelection(
  data: string,
  callbackQueryId: string,
  telegramUserId: string,
  telegramChatId: string
): TelegramPurposeSelectionPayload | null {
  const [kind, savedItemId, purpose] = data.split(":");

  if (kind !== "purpose" || !savedItemId || !purpose || !supportedPurposes.has(purpose as SavedPurpose)) {
    return null;
  }

  return {
    telegramUserId,
    telegramChatId,
    callbackQueryId,
    savedItemId,
    purpose: purpose as SavedPurpose
  };
}

export function parseTelegramUpdate(input: unknown): TelegramWebhookEvent | null {
  const parsed = updateSchema.safeParse(input);

  if (!parsed.success) {
    return null;
  }

  if (parsed.data.callback_query) {
    const callback = parsed.data.callback_query;
    const purposeSelection = parsePurposeSelection(
      callback.data,
      callback.id,
      String(callback.from.id),
      String(callback.message.chat.id)
    );

    if (purposeSelection) {
      return {
        type: "purpose_selection",
        payload: purposeSelection
      };
    }

    return null;
  }

  if (!parsed.data.message?.from) {
    return null;
  }

  const telegramUserId = String(parsed.data.message.from.id);
  const telegramChatId = String(parsed.data.message.chat.id);
  const text = parsed.data.message.text.trim();
  const command = parseCommand(text, telegramUserId, telegramChatId);

  if (command) {
    return {
      type: "command",
      payload: command
    };
  }

  const urlMatches = [...text.matchAll(/https?:\/\/\S+/gi)].map((match) => match[0]);

  if (urlMatches.length === 0) {
    const textMessage = parsePlainTextMessage(text, telegramUserId, telegramChatId);

    if (!textMessage) {
      return null;
    }

    return {
      type: "text_message",
      payload: textMessage
    };
  }

  const note = text.replace(/https?:\/\/\S+/gi, " ").replace(/\s+/g, " ").trim();

  return {
    type: "links",
    payload: {
      telegramUserId,
      telegramChatId,
      messageId: String(parsed.data.message.message_id),
      links: urlMatches.map((rawUrl) => ({
        rawUrl,
        note: note.length > 0 ? note : undefined
      }))
    }
  };
}
