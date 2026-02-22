// デフォルト設定を生成（settings-config.jsから）
const DEFAULT_SETTINGS = generateDefaultSettings();

// 現在の設定
let currentSettings = { ...DEFAULT_SETTINGS };

// 設定を読み込んで適用
async function loadAndApplySettings() {
  try {
    // まず新しいJSON形式を試みる
    const result = await chrome.storage.sync.get("settings");
    if (result.settings) {
      currentSettings = { ...DEFAULT_SETTINGS, ...result.settings };
      applySettings();
      return;
    }

    // 新しい形式がない場合、旧形式からの移行を試みる
    const oldSettings = await chrome.storage.sync.get(null); // すべてのキーを取得
    const migratedSettings = {};
    let hasMigration = false;

    // DEFAULT_SETTINGSのキーが旧形式で存在するかチェック
    for (const key in DEFAULT_SETTINGS) {
      if (oldSettings.hasOwnProperty(key) && key !== "settings") {
        migratedSettings[key] = oldSettings[key];
        hasMigration = true;
      }
    }

    if (hasMigration) {
      // 旧形式から移行
      currentSettings = { ...DEFAULT_SETTINGS, ...migratedSettings };
      await chrome.storage.sync.set({ settings: currentSettings });

      // 旧形式のキーを削除
      const keysToRemove = Object.keys(DEFAULT_SETTINGS);
      await chrome.storage.sync.remove(keysToRemove);

      console.log("Settings migrated from old format to new JSON format");
    } else {
      currentSettings = { ...DEFAULT_SETTINGS };
    }

    applySettings();
  } catch (error) {
    console.error("Failed to load settings:", error);
    currentSettings = { ...DEFAULT_SETTINGS };
    applySettings();
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
    const focusedCondition = currentSettings.normalSizeSubscriptApplyWhileEditing
      ? ""
      : ":not(.dcg-mq-focused)";

    css += `
:is(.dcg-exppanel-container, #intellisense-container) .dcg-mq-math-mode${focusedCondition} .dcg-mq-supsub:has(var:nth-of-type(${nthType})) {
  margin-bottom: 0 !important;
  vertical-align: baseline !important;
  display: inline-block !important;
  direction: rtl !important;
}
:is(.dcg-exppanel-container, #intellisense-container) .dcg-mq-math-mode${focusedCondition}
  .dcg-mq-supsub:has(var:nth-of-type(${nthType})):has(+ :is(.dcg-mq-cursor, var)) {
  margin-right: 0.2em !important;
}
:is(.dcg-exppanel-container, #intellisense-container) .dcg-mq-math-mode${focusedCondition} .dcg-mq-supsub:has(var:nth-of-type(${nthType})) .dcg-mq-sub {
  font-size: 111.111% !important;
}
:is(.dcg-exppanel-container, #intellisense-container) .dcg-mq-math-mode${focusedCondition} .dcg-mq-supsub:has(var:nth-of-type(${nthType})) .dcg-mq-sub  var {
  font-family: "CustomRomanRegular", "CustomMath", "CustomRomanItalic" !important;
  font-style: normal !important;
  padding-right: 0 !important;
  padding-left: 0 !important;
  margin-right: 0 !important;
  margin-left: 0 !important;
}
:is(.dcg-exppanel-container, #intellisense-container) .dcg-mq-math-mode${focusedCondition} .dcg-mq-supsub:has(var:nth-of-type(${nthType})) .dcg-mq-sup {
  margin-bottom: 0.5em;
  direction: ltr;
  display: inline-block !important;
  vertical-align: text-bottom !important;
}
:is(.dcg-exppanel-container, #intellisense-container) .dcg-mq-math-mode${focusedCondition} .dcg-mq-supsub:has(var:nth-of-type(${nthType})) .dcg-mq-sub {
  direction: ltr;
  display: inline-block !important;
  float: none !important;
}
:is(.dcg-exppanel-container, #intellisense-container) .dcg-mq-math-mode${focusedCondition} var:has(+ .dcg-mq-supsub var:nth-of-type(${nthType})),
:is(.dcg-exppanel-container, #intellisense-container) .dcg-mq-math-mode${focusedCondition} var:has(+ .dcg-mq-cursor + .dcg-mq-supsub var:nth-of-type(${nthType})) {
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
    const thickness = currentSettings.enhancedParenthesesThickness || "normal";
    if (thickness === "normal") {
      css += `
.dcg-mq-bracket-l.dcg-mq-paren svg[viewBox="3 0 106 186"] path {
  d:  path("M78 6 A65 101 0 0 0 78 180 c 2.2 1.2, 1 6, -3 3 A78 101 0 0 1 75 3 c 4 -3, 5.2 1.8, 3 3") !important;
}
.dcg-mq-bracket-r.dcg-mq-paren svg[viewBox="3 0 106 186"] path {
  d: path('M28 6 A65 101 0 0 1 28 180 c -2.2 1.2, -1 6, 3 3 A78 101 0 0 0 31 3 c -4 -3, -5.2 1.8, -3 3') !important;
}
    `;
    } else if (thickness === "thin") {
      css += `
.dcg-mq-bracket-l.dcg-mq-paren svg[viewBox="3 0 106 186"] path {
  d:  path("M78 6 A69 101 0 0 0 78 180 c 2.2 1.2, 1 6, -3 3 A78 101 0 0 1 75 3 c 4 -3, 5.2 1.8, 3 3") !important;
}
.dcg-mq-bracket-r.dcg-mq-paren svg[viewBox="3 0 106 186"] path {
  d: path('M28 6 A69 101 0 0 1 28 180 c -2.2 1.2, -1 6, 3 3 A78 101 0 0 0 31 3 c -4 -3, -5.2 1.8, -3 3') !important;
}
      `;
    }
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

  // Colon with space
  if (currentSettings.colonWithSpace) {
    const width = currentSettings.colonWithSpaceWidth || 500;
    css += `
.dcg-exppanel-container .dcg-mq-math-mode .dcg-mq-root-block {
  font-family: "Colon${width}", "CustomMath" !important;
}
    `;
  }

  // Comma with space
  if (currentSettings.commaWithSpace) {
    const margin = currentSettings.commaWithSpaceMargin || 0.2;
    css += `
.dcg-exppanel-container .dcg-mq-comma {
  margin-right: ${margin}em !important;
}
    `;
  }

  // Transparent icons
  if (currentSettings.transparentIcons) {
    css += `
.dcg-pillbox-container .dcg-pillbox-btn-interior {
  opacity: 0.7;
  background-color: white !important;
}
.dcg-pillbox-container :not(.dcg-btn-flat-gray) > .dcg-tooltip-hit-area-container {
  backdrop-filter: blur(2px) !important;
  z-index: 2 !important;
  border-radius: 5px;
}
.dcg-pillbox-container .dcg-group-horizontal, .dcg-group-vertical {
  backdrop-filter: blur(2px) !important;
  overflow: hidden;
  background: none !important;
  border-color: color-mix(
    in srgb,
    var(--dcg-custom-background-color-shaded, #ededed),
    rgba(0, 0, 0, 0.1)
  ) !important;
}
.dcg-toast-wrapper {
  backdrop-filter: blur(3px) !important;
  display: inline-block;
}
.dcg-toast {
  border: 1px solid rgba(0, 0, 0, 0.2) !important;
  background-color: white !important;
  box-shadow: none !important;
  opacity: 0.8;
}
.dcg-show-keypad-container .dcg-btn-flat-gray {
  background: white !important;
  opacity: .7 !important;
  box-shadow: 0 0px #0000001a !important;
}
.dcg-show-keypad-container {
  backdrop-filter: blur(2px) !important;
}
    `;
  }

  // Compact header
  if (currentSettings.compactHeader) {
    css += `
.dcg-header {
  height: 36px !important;
  line-height: 36px !important;
}
.dcg-header .dcg-header-btn {
  height: 36px !important;
  line-height: 36px !important;
  font-size: 110% !important;
}
.dcg-icon-folder-open {
  font-size: 20px !important;
  top: 2px !important;
}
.align-right-container .dcg-header-btn [class^=dcg-icon-] {
  line-height: 0 !important;
}
.dcg-header-bar__account-menu {
  padding: 2px 2px 3px 4px !important;
}
.dcg-header .dcg-desmos-svg-logo {
  height: 18px !important;
}
.dcg-header .align-center-container .dcg-home-link {
  top: 1.5px !important;
}
#graph-container {
  top: 36px !important;
}
.dcg-container .dcg-expression-top-bar {
  height: 38px !important;
  padding: 0 !important;
  line-height: 38px !important;
}
.dcg-expression-top-bar .dcg-icon-btn {
  font-size: 1rem !important;
  height: 38px !important;
}
.dcg-EDIT-LIST-MODE .dcg-expression-top-bar > button {
  padding: 0 10px !important;
  font-size: 0.9rem !important;
  margin: 5px !important;
  height: 30px !important;
  line-height: 30px !important;
}
.dcg-graph-actions-dropdown-anchor {
  padding: 0 !important;
  line-height: 28px !important;
}
.save-btn-container .dcg-save-button, .dcg-login > button{
  height: 28px !important;
  padding: 0 10px !important;
  line-height: 1 !important;
}
    `;
  }

  // Custom background
  if (currentSettings.customBackground) {
    const color = currentSettings.customBackgroundColor || "white";
    css += `
:root {
  --custom-primary-backgroundcolor: ${color};
}
.dcg-add-shadow {
  box-shadow: none !important;
}
.dcg-header {
  background: var(--custom-primary-backgroundcolor) !important;
  color: #555 !important;
  border-bottom: 1px solid rgba(0, 0, 0, .1) !important;
}
.dcg-header .dcg-header-btn {
  color: #666 !important;
}
.dcg-header-bar__account-menu {
  color: #555 !important;
}
.dcg-header .dcg-desmos-svg-logo {
  filter: none !important;
  fill: #959595 !important;
}
.save-btn-container .dcg-save-button.dcg-disabled {
  color: #bbb !important;
  border: 1px solid #ccc !important;
}
.dcg-container .dcg-expression-top-bar {
  background: var(--dcg-custom-background-color-shaded, var(--custom-primary-backgroundcolor)) !important;
  border-right: 1px solid rgba(0, 0, 0, .1) !important;
  border-bottom: 1px solid rgba(0, 0, 0, .1) !important;
}
.dcg-container .dcg-ticker {
  background: var(--custom-primary-backgroundcolor) !important;
  border-right: 1px solid rgba(0, 0, 0, .1) !important;
  border-bottom: 1px solid rgba(0, 0, 0, .1) !important;
}
.dcg-geometry-toolbar-view {
  background: var(--custom-primary-backgroundcolor) !important;
  border-bottom: 1px solid rgba(0, 0, 0, .1) !important;
  box-shadow: none !important;
}
*:not(.dcg-selected) > .dcg-tab, .cm-gutters {
  background: var(--dcg-custom-background-color-shaded, var(--custom-primary-backgroundcolor, #fcfcfc)) !important;
}
.dcg-btn-light-gray, .dcg-exportable-evaluation--value, [class^=dcg-evaluation-view__]:not(.dcg-evaluation-view__equals-sign):not(.dcg-evaluation-view__list-values) {
  border: .5px solid rgba(206, 206, 206, .8) !important;
  background: none !important;
}
.dcg-ticker .dcg-mini-play-pause {
  background-color: white !important;
}
.dcg-exppanel, .dsm-text-editor-container {
  border-right: 1px solid rgba(0, 0, 0, .1) !important;
}
// .dcg-keypad .dcg-keys-background, .dcg-keypad .dcg-keys-background .dcg-minimize-keypad  {
//   background: #e9eef6 !important;
//   box-shadow: none !important;
// }
// .dcg-keypad .dcg-btn-dark-on-gray {
//   background: var(--custom-primary-backgroundcolor) !important;
//   border: 1px solid #bbbbbba6 !important;
// }
    `;
  }

  // Fullscreen button
  if (currentSettings.fullscreenButton) {
    css += `
.dcg-header .dcg-fullscreen-btn {
  display: inline-flex !important;
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

// フルスクリーンボタンを配置
function addFullscreenButton() {
  const header = document.querySelector(".dcg-header");
  if (!header) {
    return false;
  }

  // align-right-containerが存在するかチェック
  const alignRightContainer = header.querySelector(".align-right-container");
  if (!alignRightContainer) {
    // align-right-containerがない場合は何もしない（smallscreenモード）
    return false;
  }

  // すでにボタンが追加されているかチェック
  if (alignRightContainer.querySelector(".dcg-fullscreen-btn")) {
    return true;
  }

  const button = document.createElement("div");
  button.className =
    "dcg-tooltip-hit-area-container dcg-do-not-blur dcg-cursor-default dcg-fullscreen-btn";
  button.title = "Toggle Fullscreen";
  button.innerHTML = `
    <div class="dcg-popover-with-anchor dcg-share-container dcg-calculator-shell-menu">
      <div role="link" tabindex="0" aria-label="Full Screen" aria-expanded="false" aria-haspopup="true" class="dcg-unstyled-button dcg-header-btn dcg-action-share dcg-tooltip" style="display: inline-flex; justify-content: center; align-items: center;" ontap="">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          style="margin-bottom: 0.1em;"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          width="17"
          height="17"
        >
          <!-- top-left -->
          <path d="M3 9V3h6" />
          <!-- top-right -->
          <path d="M15 3h6v6" />
          <!-- bottom-right -->
          <path d="M21 15v6h-6" />
          <!-- bottom-left -->
          <path d="M9 21H3v-6" />
        </svg>
      </div>
    </div>
  `;
  button.style.display = "none"; // 初期状態では非表示

  button.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  });

  // align-right-containerの最初に追加
  alignRightContainer.insertBefore(button, alignRightContainer.lastChild);
  return true;
}

// ヘッダーの変化を常に監視してフルスクリーンボタンを追加
function setupFullscreenButtonObserver() {
  // 初回試行
  addFullscreenButton();

  // MutationObserverでヘッダーの変更を継続的に監視
  const observer = new MutationObserver(() => {
    addFullscreenButton();
  });

  // ヘッダーが見つかるまで待機
  const waitForHeader = setInterval(() => {
    const header = document.querySelector(".dcg-header");
    if (header) {
      clearInterval(waitForHeader);
      // ヘッダーが見つかったら監視開始
      observer.observe(header, {
        childList: true,
        subtree: true,
      });
      // 監視開始後にもう一度試行
      addFullscreenButton();
    }
  }, 100);

  // 20秒後にタイムアウト
  setTimeout(() => {
    clearInterval(waitForHeader);
  }, 20000);
}

// フルスクリーンボタンを追加
setupFullscreenButtonObserver();
