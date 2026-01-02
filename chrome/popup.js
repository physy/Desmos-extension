// デフォルト設定
const DEFAULT_SETTINGS = {
  uprightSubscript: false,
  uprightSubscriptMinChars: 2,
  normalSizeSubscript: false,
  normalSizeSubscriptMinChars: 2,
  enhancedParentheses: false,
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

  const uprightCheckbox = document.getElementById("uprightSubscript");
  const uprightSelect = document.getElementById("uprightSubscriptMinChars");
  const uprightExpand = document.getElementById("uprightSubscriptExpand");
  const normalSizeCheckbox = document.getElementById("normalSizeSubscript");
  const normalSizeSelect = document.getElementById("normalSizeSubscriptMinChars");
  const normalSizeExpand = document.getElementById("normalSizeSubscriptExpand");

  uprightCheckbox.checked = settings.uprightSubscript;
  uprightSelect.value = settings.uprightSubscriptMinChars;
  uprightExpand.classList.toggle("visible", settings.uprightSubscript);

  normalSizeCheckbox.checked = settings.normalSizeSubscript;
  normalSizeSelect.value = settings.normalSizeSubscriptMinChars;
  normalSizeExpand.classList.toggle("visible", settings.normalSizeSubscript);

  document.getElementById("enhancedParentheses").checked = settings.enhancedParentheses;
}

// 設定変更イベントリスナー
function setupEventListeners() {
  const uprightCheckbox = document.getElementById("uprightSubscript");
  const uprightSelect = document.getElementById("uprightSubscriptMinChars");
  const uprightExpand = document.getElementById("uprightSubscriptExpand");
  const uprightDetails = document.getElementById("uprightSubscriptDetails");
  const normalSizeCheckbox = document.getElementById("normalSizeSubscript");
  const normalSizeSelect = document.getElementById("normalSizeSubscriptMinChars");
  const normalSizeExpand = document.getElementById("normalSizeSubscriptExpand");
  const normalSizeDetails = document.getElementById("normalSizeSubscriptDetails");
  const enhancedParenthesesCheckbox = document.getElementById("enhancedParentheses");
  const resetBtn = document.getElementById("resetBtn");

  uprightCheckbox.addEventListener("change", async () => {
    const settings = await loadSettings();
    settings.uprightSubscript = uprightCheckbox.checked;
    uprightExpand.classList.toggle("visible", uprightCheckbox.checked);
    if (!uprightCheckbox.checked) {
      uprightDetails.style.display = "none";
      uprightExpand.classList.remove("expanded");
    }
    await saveSettings(settings);
  });

  uprightExpand.addEventListener("click", () => {
    const isExpanded = uprightDetails.style.display !== "none";
    uprightDetails.style.display = isExpanded ? "none" : "flex";
    uprightExpand.classList.toggle("expanded", !isExpanded);
  });

  uprightSelect.addEventListener("change", async () => {
    const settings = await loadSettings();
    settings.uprightSubscriptMinChars = parseInt(uprightSelect.value);
    await saveSettings(settings);
  });

  normalSizeCheckbox.addEventListener("change", async () => {
    const settings = await loadSettings();
    settings.normalSizeSubscript = normalSizeCheckbox.checked;
    normalSizeExpand.classList.toggle("visible", normalSizeCheckbox.checked);
    if (!normalSizeCheckbox.checked) {
      normalSizeDetails.style.display = "none";
      normalSizeExpand.classList.remove("expanded");
    }
    await saveSettings(settings);
  });

  normalSizeExpand.addEventListener("click", () => {
    const isExpanded = normalSizeDetails.style.display !== "none";
    normalSizeDetails.style.display = isExpanded ? "none" : "flex";
    normalSizeExpand.classList.toggle("expanded", !isExpanded);
  });

  normalSizeSelect.addEventListener("change", async () => {
    const settings = await loadSettings();
    settings.normalSizeSubscriptMinChars = parseInt(normalSizeSelect.value);
    await saveSettings(settings);
  });

  enhancedParenthesesCheckbox.addEventListener("change", async () => {
    const settings = await loadSettings();
    settings.enhancedParentheses = enhancedParenthesesCheckbox.checked;
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
