import { SavedItemListEntry, UserProfile } from "@/lib/types";

export const mockProfile: UserProfile = {
  id: "user_01",
  telegramUserId: "12345678",
  displayName: "Kotaro",
  role: "Founder / operator",
  interestAreas: ["AI products", "knowledge workflows", "networking", "content systems"],
  languages: ["ja", "en"],
  notificationPreference: "weekly",
  onboardingStep: "completed",
  onboardingCompleted: true
};

export const mockSavedItems: SavedItemListEntry[] = [
  {
    id: "item_01",
    title: "Small teams win with fast knowledge loops",
    summary:
      "A practical essay on how tiny teams create leverage by turning loose links into reusable internal knowledge.",
    mainPoint: "Tiny teams create leverage when saved links become reusable knowledge instead of forgotten clutter.",
    sourceDomain: "example.com",
    canonicalUrl: "https://example.com/knowledge-loops",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    platform: "article",
    createdAt: "2026-03-27T08:30:00.000Z",
    language: "en",
    status: "processed",
    rereadScore: 88,
    suggestedPurpose: "idea_bank",
    tags: ["knowledge", "ops", "team design"],
    captureNote: "Could be useful for how we explain Informare later.",
    userMemo: "Turn this into a founder note."
  },
  {
    id: "item_02",
    title: "リール動画の保存から再活用までの導線設計",
    summary:
      "SNSで見つけた短尺情報を、再読・共有・会話ネタに変換する導線設計の考え方を整理した記事。",
    mainPoint: "短尺SNSの一瞬の気づきを、あとで使える会話資産に変える設計が重要。",
    sourceDomain: "note.com",
    canonicalUrl: "https://note.com/example/reel-knowledge-flow",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80",
    platform: "instagram",
    createdAt: "2026-03-26T14:15:00.000Z",
    language: "ja",
    status: "processed",
    rereadScore: 76,
    suggestedPurpose: "sns_seed",
    tags: ["sns", "workflow", "content"],
    captureNote: "Telegram botの導線に近い。",
    userMemo: null
  },
  {
    id: "item_03",
    title: "A field guide to personal content curation",
    summary:
      "A long-form guide that frames curation as future collaboration with your past self instead of passive bookmarking.",
    mainPoint: "Curation works best when it feels like leaving useful signals for your future self.",
    sourceDomain: "substack.com",
    canonicalUrl: "https://example.substack.com/p/content-curation",
    thumbnailUrl: null,
    platform: "substack",
    createdAt: "2026-03-25T05:00:00.000Z",
    language: "en",
    status: "new",
    rereadScore: 93,
    suggestedPurpose: "reread",
    tags: ["curation", "personal knowledge"],
    captureNote: null,
    userMemo: null
  }
];
