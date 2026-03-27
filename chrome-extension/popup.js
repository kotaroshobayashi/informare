const appUrlInput = document.getElementById("appUrl");
const apiKeyInput = document.getElementById("apiKey");
const saveBtn = document.getElementById("save");
const status = document.getElementById("status");

// Load saved settings
chrome.storage.local.get(["appUrl", "apiKey"], ({ appUrl, apiKey }) => {
  if (appUrl) appUrlInput.value = appUrl;
  if (apiKey) apiKeyInput.value = apiKey;
});

saveBtn.addEventListener("click", async () => {
  const appUrl = appUrlInput.value.trim().replace(/\/$/, "");
  const apiKey = apiKeyInput.value.trim();

  if (!appUrl || !apiKey) {
    showStatus("Both fields are required.", false);
    return;
  }

  // Test the connection
  try {
    const res = await fetch(appUrl + "/api/intake/web", {
      method: "OPTIONS"
    });

    if (res.status === 204 || res.ok) {
      await chrome.storage.local.set({ appUrl, apiKey });
      showStatus("Settings saved.", true);
    } else {
      showStatus("Could not reach your app — check the URL.", false);
    }
  } catch {
    // Save anyway even if OPTIONS fails (CORS may block it)
    await chrome.storage.local.set({ appUrl, apiKey });
    showStatus("Settings saved.", true);
  }
});

function showStatus(msg, ok) {
  status.textContent = msg;
  status.className = "status " + (ok ? "ok" : "err");
}
