// デフォルト設定
const DEFAULT_SETTINGS = {
  uprightSubscript: false,
  normalSizeSubscript: false,
};

// 現在の設定
let currentSettings = { ...DEFAULT_SETTINGS };

// 設定を読み込んで適用
async function loadAndApplySettings() {
  try {
    const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    currentSettings = result;
    applySettings();
  } catch (error) {
    console.error("Failed to load settings:", error);
    applySettings(); // デフォルト設定を適用
  }
}

// 設定をCSSに適用
function applySettings() {
  // 既存の設定用スタイルを削除
  const existingStyle = document.getElementById("desmos-font-settings");
  if (existingStyle) {
    existingStyle.remove();
  }

  // 新しい設定用スタイルを作成
  const style = document.createElement("style");
  style.id = "desmos-font-settings";

  let css = "";

  // Upright multi-character subscripts
  if (currentSettings.uprightSubscript) {
    css += `
.dcg-mq-math-mode
  :not(.dcg-mq-int)
  > .dcg-mq-supsub:not(.dcg-mq-after-operator-name)
  > .dcg-mq-sub:has(var:nth-of-type(n + 2)):not(:has(.dcg-mq-font))
  var,
.dcg-mq-math-mode
  :not(.dcg-mq-int)
  > .dcg-mq-supsub:not(.dcg-mq-after-operator-name)
  > .dcg-mq-sub:has(> var):has(> span > var):not(:has(.dcg-mq-font))
  var {
  font-family: "CustomRomanRegular", "CustomMath", "CustomRomanItalic" !important;
  font-style: normal !important;
  padding-right: 0 !important;
  padding-left: 0 !important;
  margin-right: 0 !important;
  margin-left: 0 !important;
}
    `;
  }

  // Normal size subscripts
  if (currentSettings.normalSizeSubscript) {
    css += `
.dcg-exppanel-container .dcg-mq-math-mode:not(.dcg-mq-focused) .dcg-mq-supsub:has(var:nth-of-type(n + 2)) {
  margin-bottom: 0 !important;
  vertical-align: baseline !important;
  display: inline-block !important;
  direction: rtl !important;
}
.dcg-exppanel-container .dcg-mq-math-mode:not(.dcg-mq-focused)
  .dcg-mq-supsub:has(var:nth-of-type(n + 2)):has(+ var) {
  margin-right: 0.2em !important;
}
.dcg-exppanel-container .dcg-mq-math-mode:not(.dcg-mq-focused) .dcg-mq-supsub:has(var:nth-of-type(n + 2)) .dcg-mq-sub {
  font-size: 111.111% !important;
}
.dcg-exppanel-container .dcg-mq-math-mode:not(.dcg-mq-focused) .dcg-mq-supsub:has(var:nth-of-type(n + 2)) .dcg-mq-sub  var {
  font-family: "CustomRomanRegular", "CustomMath", "CustomRomanItalic" !important;
  font-style: normal !important;
  padding-right: 0 !important;
  padding-left: 0 !important;
  margin-right: 0 !important;
  margin-left: 0 !important;
}
.dcg-exppanel-container .dcg-mq-math-mode:not(.dcg-mq-focused) .dcg-mq-supsub:has(var:nth-of-type(n + 2)) .dcg-mq-sup {
  margin-bottom: 0.5em;
  direction: ltr;
  display: inline-block !important;
  vertical-align: text-bottom !important;
}
.dcg-exppanel-container .dcg-mq-math-mode:not(.dcg-mq-focused) .dcg-mq-supsub:has(var:nth-of-type(n + 2)) .dcg-mq-sub {
  direction: ltr;
  display: inline-block !important;
  float: none !important;
}
.dcg-exppanel-container .dcg-mq-math-mode:not(.dcg-mq-focused) var:has(+ .dcg-mq-supsub var:nth-of-type(n + 2)) {
  font-family: "CustomRomanRegular", "CustomMath", "CustomRomanItalic" !important;
  font-style: initial !important;
  padding-right: 0 !important;
  padding-left: 0 !important;
  margin-right: 0 !important;
  margin-left: 0 !important;
}
    `;
  }

  style.textContent = css;
  document.head.appendChild(style);
}

// メッセージリスナー（ポップアップからの設定変更通知）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SETTINGS_CHANGED") {
    currentSettings = request.settings;
    applySettings();
  }
});

// 初期化
loadAndApplySettings();
