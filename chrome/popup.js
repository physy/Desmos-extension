// デフォルト設定
const DEFAULT_SETTINGS = {
  uprightSubscript: false,
  normalSizeSubscript: false,
};

// 設定を読み込む
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    return result;
  } catch (error) {
    console.error("Failed to load settings:", error);
    return DEFAULT_SETTINGS;
  }
}

// 設定を保存する
async function saveSettings(settings) {
  try {
    await chrome.storage.sync.set(settings);
    // 全てのDesmosタブに設定変更を通知
    const tabs = await chrome.tabs.query({ url: "*://www.desmos.com/*" });
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "SETTINGS_CHANGED",
          settings: settings,
        });
      } catch (error) {
        // タブがまだ読み込み中や無効な場合のエラーを無視
        console.log("Could not send message to tab:", tab.id);
      }
    }
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}

// UIを初期化
async function initializeUI() {
  const settings = await loadSettings();

  document.getElementById("uprightSubscript").checked = settings.uprightSubscript;
  document.getElementById("normalSizeSubscript").checked = settings.normalSizeSubscript;
}

// 設定変更イベントリスナー
function setupEventListeners() {
  const uprightCheckbox = document.getElementById("uprightSubscript");
  const normalSizeCheckbox = document.getElementById("normalSizeSubscript");
  const resetBtn = document.getElementById("resetBtn");

  uprightCheckbox.addEventListener("change", async () => {
    const settings = await loadSettings();
    settings.uprightSubscript = uprightCheckbox.checked;
    await saveSettings(settings);
  });

  normalSizeCheckbox.addEventListener("change", async () => {
    const settings = await loadSettings();
    settings.normalSizeSubscript = normalSizeCheckbox.checked;
    await saveSettings(settings);
  });

  resetBtn.addEventListener("click", async () => {
    await saveSettings(DEFAULT_SETTINGS);
    await initializeUI();
  });
}

// DOMが読み込まれたら初期化
document.addEventListener("DOMContentLoaded", () => {
  initializeUI();
  setupEventListeners();
});
