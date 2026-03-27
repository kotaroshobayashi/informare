const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!appUrl || !botToken || !secret) {
  console.error("Missing NEXT_PUBLIC_APP_URL, TELEGRAM_BOT_TOKEN, or TELEGRAM_WEBHOOK_SECRET.");
  process.exit(1);
}

if (appUrl.includes("localhost")) {
  console.error("NEXT_PUBLIC_APP_URL must be a public HTTPS URL to register a Telegram webhook.");
  process.exit(1);
}

const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`;
const apiUrl = `https://api.telegram.org/bot${botToken}/setWebhook`;

const response = await fetch(apiUrl, {
  method: "POST",
  headers: {
    "content-type": "application/json"
  },
  body: JSON.stringify({
    url: webhookUrl,
    secret_token: secret
  })
});

const result = await response.json();

if (!response.ok || !result.ok) {
  console.error("Failed to register webhook:", result);
  process.exit(1);
}

console.log("Webhook registered:", webhookUrl);
