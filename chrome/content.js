// デフォルト設定
const DEFAULT_SETTINGS = {
  uprightSubscript: false,
  uprightSubscriptMinChars: 2,
  normalSizeSubscript: false,
  normalSizeSubscriptMinChars: 2,
  enhancedParentheses: false,
  displayStyleIntegrals: true,
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
    const minChars = currentSettings.uprightSubscriptMinChars || 2;
    const hasCondition = minChars === 1 ? ":has(var)" : `:has(var:nth-of-type(n + 2))`;

    css += `
.dcg-mq-math-mode
  :not(.dcg-mq-int)
  > .dcg-mq-supsub:not(.dcg-mq-after-operator-name)
  > .dcg-mq-sub${hasCondition}:not(:has(.dcg-mq-font))
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
    const minChars = currentSettings.normalSizeSubscriptMinChars || 2;
    const nthType = `n + ${minChars}`;

    css += `
:is(.dcg-exppanel-container, #intellisense-container) .dcg-mq-math-mode:not(.dcg-mq-focused) .dcg-mq-supsub:has(var:nth-of-type(${nthType})) {
  margin-bottom: 0 !important;
  vertical-align: baseline !important;
  display: inline-block !important;
  direction: rtl !important;
}
:is(.dcg-exppanel-container, #intellisense-container) .dcg-mq-math-mode:not(.dcg-mq-focused)
  .dcg-mq-supsub:has(var:nth-of-type(${nthType})):has(+ var) {
  margin-right: 0.2em !important;
}
:is(.dcg-exppanel-container, #intellisense-container) .dcg-mq-math-mode:not(.dcg-mq-focused) .dcg-mq-supsub:has(var:nth-of-type(${nthType})) .dcg-mq-sub {
  font-size: 111.111% !important;
}
:is(.dcg-exppanel-container, #intellisense-container) .dcg-mq-math-mode:not(.dcg-mq-focused) .dcg-mq-supsub:has(var:nth-of-type(${nthType})) .dcg-mq-sub  var {
  font-family: "CustomRomanRegular", "CustomMath", "CustomRomanItalic" !important;
  font-style: normal !important;
  padding-right: 0 !important;
  padding-left: 0 !important;
  margin-right: 0 !important;
  margin-left: 0 !important;
}
:is(.dcg-exppanel-container, #intellisense-container) .dcg-mq-math-mode:not(.dcg-mq-focused) .dcg-mq-supsub:has(var:nth-of-type(${nthType})) .dcg-mq-sup {
  margin-bottom: 0.5em;
  direction: ltr;
  display: inline-block !important;
  vertical-align: text-bottom !important;
}
:is(.dcg-exppanel-container, #intellisense-container) .dcg-mq-math-mode:not(.dcg-mq-focused) .dcg-mq-supsub:has(var:nth-of-type(${nthType})) .dcg-mq-sub {
  direction: ltr;
  display: inline-block !important;
  float: none !important;
}
:is(.dcg-exppanel-container, #intellisense-container) .dcg-mq-math-mode:not(.dcg-mq-focused) var:has(+ .dcg-mq-supsub var:nth-of-type(${nthType})) {
  font-family: "CustomRomanRegular", "CustomMath", "CustomRomanItalic" !important;
  font-style: initial !important;
  padding-right: 0 !important;
  padding-left: 0 !important;
  margin-right: 0 !important;
  margin-left: 0 !important;
}
    `;
  }

  // Enhanced parentheses
  if (currentSettings.enhancedParentheses) {
    css += `
.dcg-mq-bracket-l.dcg-mq-paren svg[viewBox="3 0 106 186"] path {
  d: path('M78 6 A68 101 0 0 0 81 180 c 2.2 1.2, 1 6, -3 3 A78 101 0 0 1 75 3 c 4 -3, 5.2 1.8, 3 3') !important;
}
.dcg-mq-bracket-r.dcg-mq-paren svg[viewBox="3 0 106 186"] path {
  d: path('M28 6 A68 101 0 0 1 25 180 c -2.2 1.2, -1 6, 3 3 A78 101 0 0 0 31 3 c -4 -3, -5.2 1.8, -3 3') !important;
}
    `;
  }

  // Display style integrals
  if (currentSettings.displayStyleIntegrals) {
    css += String.raw`
.dcg-exppanel-container .dcg-mq-int {
  position: relative;
  display: inline-block;
}
.dcg-exppanel-container .dcg-mq-int::before {
  content: "⌠\A⌡";
  font-family: "CustomMath";
  font-size: 0.85em;
  position: absolute;
  top: 50%;
  transform: translateY(-32%);
  line-height: 1.3;
  white-space: pre;
  display: inline-block;
  text-align: center;
}
.dcg-exppanel-container .dcg-mq-int .dcg-mq-non-leaf {
  position: relative;
}
.dcg-exppanel-container .dcg-mq-int > big {
  color: transparent;
}
.dcg-exppanel-container .dcg-mq-int > .dcg-mq-supsub > .dcg-mq-sup {
  margin-left: 0.25em !important;
}
.dcg-exppanel-container .dcg-mq-int > .dcg-mq-supsub{
  margin-left: -.5em !important;
}
.dcg-exppanel-container .dcg-mq-int > .dcg-mq-supsub > .dcg-mq-sup {
  margin-left: 0.25em !important;
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
