# Informare Chrome Extension

Right-click anywhere on the web to save to your personal informare library.

## Install (development)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select this `chrome-extension/` folder

## Setup

1. Click the Informare icon in the Chrome toolbar
2. Enter your **App URL** (e.g. `https://your-app.vercel.app`)
3. Enter your **API Key** (the value of `EXTENSION_API_KEY` in Vercel env vars)
4. Click **Save settings**

## Usage

| Action | Result |
|--------|--------|
| Right-click a link → "Add to informare" | Saves that URL |
| Right-click selected text → "Add to informare" | Saves page URL + selected text as note |
| Right-click page → "Add to informare" | Saves current page URL |

## Vercel env var

Add `EXTENSION_API_KEY=your-secret-key` in your Vercel project settings.
