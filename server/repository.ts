import { mockProfile, mockSavedItems } from "@/lib/mock-data";
import { DashboardData, OnboardingStep, SavedItemListEntry, SavedPurpose, UserProfile } from "@/lib/types";
import { getServiceSupabaseClient } from "@/lib/supabase";

interface UserRow {
  id: string;
  telegram_user_id: string;
  display_name: string | null;
}

interface UserProfileRow {
  role: string;
  interest_areas: string[];
  preferred_languages: string[];
  notification_preference: UserProfile["notificationPreference"];
  onboarding_step: OnboardingStep;
  onboarding_completed_at: string | null;
}

interface SavedItemRow {
  id: string;
  status: SavedItemListEntry["status"];
  reread_score: number;
  suggested_purpose: SavedItemListEntry["suggestedPurpose"];
  user_memo: string | null;
  created_at: string;
  raw_links: { capture_note: string | null } | null;
  documents: {
    summary: string | null;
    language: string | null;
    metadata: {
      main_point?: string | null;
      thumbnail_url?: string | null;
      platform?: string | null;
    } | null;
    sources: {
      title: string | null;
      canonical_url: string;
      domain: string;
      platform: string | null;
      og_image_url: string | null;
    };
  } | null;
  saved_item_tags: Array<{ tags: { name: string } | null }>;
}

function buildMockDashboardData(): DashboardData {
  return {
    profile: mockProfile,
    items: mockSavedItems,
    source: "mock"
  };
}

function mapProfile(user: UserRow, profile: UserProfileRow): UserProfile {
  return {
    id: user.id,
    telegramUserId: user.telegram_user_id,
    displayName: user.display_name || "Telegram user",
    role: profile.role,
    interestAreas: profile.interest_areas ?? [],
    languages: profile.preferred_languages ?? ["ja", "en"],
    notificationPreference: profile.notification_preference,
    onboardingStep: profile.onboarding_step,
    onboardingCompleted: Boolean(profile.onboarding_completed_at)
  };
}

function mapSavedItem(row: SavedItemRow): SavedItemListEntry {
  return {
    id: row.id,
    title: row.documents?.sources.title || row.documents?.sources.domain || "Untitled capture",
    summary: row.documents?.summary || "Summary will appear after processing.",
    mainPoint: row.documents?.metadata?.main_point || row.documents?.summary || null,
    sourceDomain: row.documents?.sources.domain || "unknown",
    canonicalUrl: row.documents?.sources.canonical_url || "#",
    thumbnailUrl: row.documents?.metadata?.thumbnail_url || row.documents?.sources.og_image_url || null,
    platform: row.documents?.metadata?.platform || row.documents?.sources.platform || null,
    createdAt: row.created_at,
    language: row.documents?.language || "unknown",
    status: row.status,
    rereadScore: row.reread_score,
    suggestedPurpose: row.suggested_purpose,
    tags: row.saved_item_tags.map((entry) => entry.tags?.name).filter(Boolean) as string[],
    captureNote: row.raw_links?.capture_note ?? null,
    userMemo: row.user_memo
  };
}

export async function ensureUserContext(telegramUserId: string, telegramChatId: string) {
  const supabase = getServiceSupabaseClient();

  if (!supabase) {
    return {
      userId: mockProfile.id,
      profile: mockProfile,
      source: "mock" as const
    };
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .upsert(
      {
        telegram_user_id: telegramUserId,
        display_name: `telegram:${telegramUserId}`
      },
      { onConflict: "telegram_user_id" }
    )
    .select("*")
    .single<UserRow>();

  if (userError || !userData) {
    throw new Error(userError?.message || "Failed to upsert user");
  }

  await supabase.from("telegram_accounts").upsert(
    {
      user_id: userData.id,
      telegram_chat_id: telegramChatId,
      is_primary: true
    },
    { onConflict: "user_id,telegram_chat_id" }
  );

  const { data: existingProfile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userData.id)
    .maybeSingle<UserProfileRow>();

  if (!existingProfile) {
    await supabase.from("user_profiles").insert({
      user_id: userData.id,
      role: "",
      interest_areas: [],
      preferred_languages: ["ja", "en"],
      notification_preference: "weekly",
      onboarding_step: "role",
      onboarding_completed_at: null
    });
  }

  const { data: profileData, error: profileError } = await supabase
    .from("user_profiles")
    .select("role, interest_areas, preferred_languages, notification_preference, onboarding_step, onboarding_completed_at")
    .eq("user_id", userData.id)
    .single<UserProfileRow>();

  if (profileError || !profileData) {
    throw new Error(profileError?.message || "Failed to fetch user profile");
  }

  return {
    userId: userData.id,
    profile: mapProfile(userData, profileData),
    source: "supabase" as const
  };
}

export async function loadDashboardData(): Promise<DashboardData> {
  const supabase = getServiceSupabaseClient();

  if (!supabase) {
    return buildMockDashboardData();
  }

  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select("id, telegram_user_id, display_name")
    .order("created_at", { ascending: true })
    .limit(1);

  if (usersError || !usersData || usersData.length === 0) {
    return buildMockDashboardData();
  }

  const user = usersData[0] as UserRow;
  const { data: profileData } = await supabase
    .from("user_profiles")
    .select("role, interest_areas, preferred_languages, notification_preference, onboarding_step, onboarding_completed_at")
    .eq("user_id", user.id)
    .maybeSingle<UserProfileRow>();

  if (!profileData) {
    return buildMockDashboardData();
  }

  const { data: savedItemsData, error: savedItemsError } = await supabase
    .from("saved_items")
    .select(
      `
        id,
        status,
        reread_score,
        suggested_purpose,
        user_memo,
        created_at,
        raw_links (
          capture_note
        ),
        documents (
          summary,
          language,
          metadata,
          sources (
            title,
            canonical_url,
            domain,
            platform,
            og_image_url
          )
        ),
        saved_item_tags (
          tags (
            name
          )
        )
      `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (savedItemsError || !savedItemsData) {
    return {
      profile: mapProfile(user, profileData),
      items: [],
      source: "supabase"
    };
  }

  return {
    profile: mapProfile(user, profileData),
    items: (savedItemsData as unknown as SavedItemRow[]).map(mapSavedItem),
    source: "supabase"
  };
}

export async function attachTags(savedItemId: string, tags: string[]) {
  const supabase = getServiceSupabaseClient();

  if (!supabase || tags.length === 0) {
    return;
  }

  for (const tagName of tags) {
    const { data: tagData, error: tagError } = await supabase
      .from("tags")
      .upsert({ name: tagName }, { onConflict: "name" })
      .select("id")
      .single<{ id: string }>();

    if (tagError || !tagData) {
      throw new Error(tagError?.message || `Failed to upsert tag ${tagName}`);
    }

    await supabase.from("saved_item_tags").upsert(
      {
        saved_item_id: savedItemId,
        tag_id: tagData.id
      },
      { onConflict: "saved_item_id,tag_id" }
    );
  }
}

export async function updateSavedItemPurpose(savedItemId: string, purpose: SavedPurpose) {
  const supabase = getServiceSupabaseClient();

  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from("saved_items")
    .update({
      suggested_purpose: purpose,
      updated_at: new Date().toISOString()
    })
    .eq("id", savedItemId);

  if (error) {
    throw new Error(error.message || "Failed to update saved item purpose");
  }
}

export async function getUserProfileByTelegramId(telegramUserId: string) {
  const supabase = getServiceSupabaseClient();

  if (!supabase) {
    return mockProfile;
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, telegram_user_id, display_name")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle<UserRow>();

  if (userError || !userData) {
    return null;
  }

  const { data: profileData, error: profileError } = await supabase
    .from("user_profiles")
    .select("role, interest_areas, preferred_languages, notification_preference, onboarding_step, onboarding_completed_at")
    .eq("user_id", userData.id)
    .maybeSingle<UserProfileRow>();

  if (profileError || !profileData) {
    return null;
  }

  return mapProfile(userData, profileData);
}

export async function updateOnboardingFromTelegramText(telegramUserId: string, text: string) {
  const supabase = getServiceSupabaseClient();

  if (!supabase) {
    return {
      step: "completed" as const,
      profile: mockProfile
    };
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, telegram_user_id, display_name")
    .eq("telegram_user_id", telegramUserId)
    .single<UserRow>();

  if (userError || !userData) {
    throw new Error(userError?.message || "Failed to find user for onboarding");
  }

  const { data: profileData, error: profileError } = await supabase
    .from("user_profiles")
    .select("role, interest_areas, preferred_languages, notification_preference, onboarding_step, onboarding_completed_at")
    .eq("user_id", userData.id)
    .single<UserProfileRow>();

  if (profileError || !profileData) {
    throw new Error(profileError?.message || "Failed to find onboarding profile");
  }

  if (profileData.onboarding_step === "role") {
    const { error } = await supabase
      .from("user_profiles")
      .update({
        role: text.trim(),
        onboarding_step: "interests",
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userData.id);

    if (error) {
      throw new Error(error.message || "Failed to update role");
    }

    const updatedProfile = await getUserProfileByTelegramId(telegramUserId);
    return {
      step: "interests" as const,
      profile: updatedProfile
    };
  }

  if (profileData.onboarding_step === "interests") {
    const interestAreas = text
      .split(/[,/\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);

    const { error } = await supabase
      .from("user_profiles")
      .update({
        interest_areas: interestAreas,
        onboarding_step: "completed",
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userData.id);

    if (error) {
      throw new Error(error.message || "Failed to update interest areas");
    }

    const updatedProfile = await getUserProfileByTelegramId(telegramUserId);
    return {
      step: "completed" as const,
      profile: updatedProfile
    };
  }

  return {
    step: "completed" as const,
    profile: mapProfile(userData, profileData)
  };
}

export async function getUserProfileByUserId(userId: string) {
  const supabase = getServiceSupabaseClient();

  if (!supabase) {
    return mockProfile;
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, telegram_user_id, display_name")
    .eq("id", userId)
    .single<UserRow>();

  if (userError || !userData) {
    throw new Error(userError?.message || "Failed to fetch user");
  }

  const { data: profileData, error: profileError } = await supabase
    .from("user_profiles")
    .select("role, interest_areas, preferred_languages, notification_preference, onboarding_step, onboarding_completed_at")
    .eq("user_id", userId)
    .single<UserProfileRow>();

  if (profileError || !profileData) {
    throw new Error(profileError?.message || "Failed to fetch user profile");
  }

  return mapProfile(userData, profileData);
}
