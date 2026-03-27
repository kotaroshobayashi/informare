# Informare

Telegram-first personal knowledge stock system for URLs you do not want to lose.

## MVP scope

- Capture a URL from a Telegram bot
- Queue background processing
- Extract and summarize source content
- Suggest a likely use based on the user's role and interests
- Store the item for reread, reuse, and later review
- Browse items from a web dashboard

## Product model

The system is designed as a personal bot first, but the backend shape is already multi-user safe:

- `users` and `user_profiles` hold the personal context
- `raw_links` stores the captured Telegram message payload
- `sources` normalizes canonical URLs
- `documents` stores extracted content and AI outputs
- `saved_items` stores the user-specific state and reread logic

## Stack

- Next.js App Router
- TypeScript
- Supabase for data storage
- Telegram bot webhook

## Local setup

1. Copy `.env.example` to `.env.local`
2. Fill in Supabase and Telegram secrets
3. Run `npm install`
4. Run `npm run dev`
5. Apply [`supabase/schema.sql`](/Users/kotaroshobayashi/Local_Shobayashi_Document/informare/supabase/schema.sql) to your Supabase project
6. Optionally add `OPENAI_API_KEY` to enable profile-aware enrichment

## Important routes

- `POST /api/telegram/webhook`
  - Telegram webhook entrypoint
- `POST /api/intake`
  - Manual intake endpoint for testing
- `POST /api/jobs/process`
  - Placeholder processor endpoint for queued jobs

## What is implemented right now

- Initial dashboard pages:
  - `/`
  - `/library`
  - `/settings`
- Telegram update parsing for URL capture
- Supabase-first save flow with mock fallback
- Metadata-based processing for captured URLs
- Optional profile-aware LLM enrichment when `OPENAI_API_KEY` is set
- Core Supabase schema for the MVP

## What should be implemented next

1. Add Telegram reply messages with purpose buttons
2. Upgrade metadata extraction into profile-aware LLM enrichment
3. Add onboarding for role and interest areas
4. Add auth flow tied to Telegram identity
