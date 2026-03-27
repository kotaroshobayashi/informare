export type SavedPurpose =
  | "read_later"
  | "reread"
  | "share"
  | "sns_seed"
  | "networking"
  | "idea_bank"
  | "learning"
  | "other";

export type SavedStatus = "new" | "processed" | "archived";

export type NotificationPreference = "save_only" | "after_24h" | "weekly" | "monthly";
export type OnboardingStep = "role" | "interests" | "completed";

export interface UserProfile {
  id: string;
  telegramUserId: string;
  displayName: string;
  role: string;
  interestAreas: string[];
  languages: string[];
  notificationPreference: NotificationPreference;
  onboardingStep: OnboardingStep;
  onboardingCompleted: boolean;
}

export interface SavedItemListEntry {
  id: string;
  title: string;
  summary: string;
  sourceDomain: string;
  canonicalUrl: string;
  createdAt: string;
  language: string;
  status: SavedStatus;
  rereadScore: number;
  suggestedPurpose: SavedPurpose;
  tags: string[];
  captureNote?: string | null;
  userMemo?: string | null;
}

export interface DashboardData {
  profile: UserProfile;
  items: SavedItemListEntry[];
  source: "mock" | "supabase";
}

export interface ProcessingResult {
  savedItemId?: string;
  title: string;
  summary: string;
  language: string;
  tags: string[];
  rationale: string;
  suggestedPurposes: SavedPurpose[];
  rereadScore?: number;
}

export interface TelegramIncomingLinkPayload {
  telegramUserId: string;
  telegramChatId: string;
  messageId: string;
  rawUrl: string;
  note?: string;
}

export interface TelegramCommandPayload {
  telegramUserId: string;
  telegramChatId: string;
  command: "start" | "help";
}

export interface TelegramTextMessagePayload {
  telegramUserId: string;
  telegramChatId: string;
  text: string;
}

export interface TelegramPurposeSelectionPayload {
  telegramUserId: string;
  telegramChatId: string;
  callbackQueryId: string;
  savedItemId: string;
  purpose: SavedPurpose;
}

export type TelegramWebhookEvent =
  | { type: "link"; payload: TelegramIncomingLinkPayload }
  | { type: "command"; payload: TelegramCommandPayload }
  | { type: "text_message"; payload: TelegramTextMessagePayload }
  | { type: "purpose_selection"; payload: TelegramPurposeSelectionPayload };
