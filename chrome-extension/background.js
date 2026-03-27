// ── Context menu setup ──────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  // Right-click on a hyperlink
  chrome.contextMenus.create({
    id: "save-link",
    title: "Add to informare",
    contexts: ["link"]
  });

  // Right-click on selected text
  chrome.contextMenus.create({
    id: "save-selection",
    title: "Add to informare",
    contexts: ["selection"]
  });

  // Right-click anywhere else on the page
  chrome.contextMenus.create({
    id: "save-page",
    title: "Add to informare",
    contexts: ["page"]
  });
});

// ── Context menu click handler ───────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { appUrl, apiKey } = await chrome.storage.local.get(["appUrl", "apiKey"]);

  if (!appUrl || !apiKey) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "Informare",
      message: "Please configure your Informare URL and API key in the extension settings."
    });
    chrome.action.openPopup();
    return;
  }

  let url = "";
  let note = undefined;

  if (info.menuItemId === "save-link") {
    url = info.linkUrl ?? "";
  } else if (info.menuItemId === "save-selection") {
    url = tab?.url ?? info.pageUrl ?? "";
    note = info.selectionText;
  } else {
    url = tab?.url ?? info.pageUrl ?? "";
  }

  if (!url) return;

  await saveToInformare({ appUrl, apiKey, url, note });
});

// ── Save function ────────────────────────────────────────────────────────────

async function saveToInformare({ appUrl, apiKey, url, note }) {
  const endpoint = appUrl.replace(/\/$/, "") + "/api/intake/web";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, note, apiKey })
    });

    const data = await res.json();

    if (data.ok) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "Saved to informare",
        message: url.length > 60 ? url.slice(0, 60) + "…" : url
      });
    } else {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "Informare — Error",
        message: data.error ?? "Could not save. Check your settings."
      });
    }
  } catch {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "Informare — Network error",
      message: "Could not reach your informare app."
    });
  }
}
