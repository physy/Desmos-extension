let longPressTimer = null;
let isScrolling = false;
let currentPopup = null;
let touchStartX = 0;
let touchStartY = 0;
let touchMoved = false;

// ページのコンテキストでCalcにアクセスするためのスクリプトを注入
function injectPageScript() {
  function injectScript(url) {
    const s = document.createElement("script");
    s.src = url;
    s.onload = function () {
      s.remove();
    };
    const head = document.head || document.documentElement;
    if (head !== null) {
      head.appendChild(s);
    }
  }

  const scriptUrl = chrome.runtime.getURL("injected.js");
  injectScript(scriptUrl);
} // ページロード後にスクリプトを注入
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectPageScript);
} else {
  injectPageScript();
}

// postMessageのレスポンスを管理するためのマップ
const pendingRequests = new Map();
let requestIdCounter = 0;

// ページからのメッセージを受信
window.addEventListener("message", function (event) {
  if (event.source !== window) return;

  const { type, requestId, latex, success } = event.data;

  if (type === "DESMOS_GET_EXPRESSION_RESPONSE" && pendingRequests.has(requestId)) {
    const { resolve } = pendingRequests.get(requestId);
    pendingRequests.delete(requestId);
    resolve(latex);
  }

  if (type === "DESMOS_SET_EXPRESSION_RESPONSE" && pendingRequests.has(requestId)) {
    const { resolve } = pendingRequests.get(requestId);
    pendingRequests.delete(requestId);
    resolve(success);
  }
});

// Promiseベースの関数でDesmosとやり取り
function getExpressionLatex(exprId) {
  return new Promise((resolve) => {
    const requestId = ++requestIdCounter;
    pendingRequests.set(requestId, { resolve });

    window.postMessage(
      {
        type: "DESMOS_GET_EXPRESSION",
        requestId: requestId,
        exprId: exprId,
      },
      "*"
    );

    // タイムアウト設定（3秒）
    setTimeout(() => {
      if (pendingRequests.has(requestId)) {
        pendingRequests.delete(requestId);
        resolve(null);
      }
    }, 3000);
  });
}

function setExpressionLatex(exprId, latex) {
  return new Promise((resolve) => {
    const requestId = ++requestIdCounter;
    pendingRequests.set(requestId, { resolve });

    window.postMessage(
      {
        type: "DESMOS_SET_EXPRESSION",
        requestId: requestId,
        exprId: exprId,
        latex: latex,
      },
      "*"
    );

    // タイムアウト設定（3秒）
    setTimeout(() => {
      if (pendingRequests.has(requestId)) {
        pendingRequests.delete(requestId);
        resolve(false);
      }
    }, 3000);
  });
}

// スクロール検知
let scrollTimeout;
window.addEventListener(
  "scroll",
  () => {
    isScrolling = true;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      isScrolling = false;
    }, 150);
  },
  { passive: true }
);

// タッチスタート（長押し開始）
document.addEventListener(
  "touchstart",
  (event) => {
    // .dcg-mq-root-blockの長押しのみ対象
    if (!event.target.closest(".dcg-mq-root-block")) {
      return;
    }

    const rootBlock = event.target.closest(".dcg-expressionitem");
    const touch = event.touches[0];

    // タッチ開始位置を記録
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchMoved = false;

    // 既存のタイマーをクリア
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }

    // 1秒のタイマーを設定
    longPressTimer = setTimeout(() => {
      // スクロール中または指が動いた場合は無視
      if (isScrolling || touchMoved) {
        return;
      }

      // 振動フィードバック（対応デバイスのみ）
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      showCopyPastePopup(touchStartX, touchStartY, rootBlock);
    }, 1000);
  },
  { passive: true }
);

// タッチ移動（ドラッグ検知）
document.addEventListener(
  "touchmove",
  (event) => {
    if (longPressTimer) {
      const touch = event.touches[0];
      const moveX = Math.abs(touch.clientX - touchStartX);
      const moveY = Math.abs(touch.clientY - touchStartY);

      // 10px以上動いた場合はタッチ移動とみなす
      if (moveX > 10 || moveY > 10) {
        touchMoved = true;
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }
  },
  { passive: true }
);

// タッチエンド
document.addEventListener(
  "touchend",
  () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  },
  { passive: true }
);

// タッチキャンセル
document.addEventListener(
  "touchcancel",
  () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  },
  { passive: true }
);

// ポップアップを表示する関数
function showCopyPastePopup(x, y, rootBlock) {
  // 既存のポップアップを削除
  removeExistingPopup();

  // ポップアップ要素を作成
  const popup = document.createElement("div");
  popup.className = "math-popup";
  popup.innerHTML = `
    <button class="math-popup-btn copy-btn">copy</button>
    <button class="math-popup-btn paste-btn">paste</button>
  `;

  // スタイルを設定
  popup.style.position = "fixed";
  popup.style.left = x + "px";
  popup.style.top = y - 60 + "px";
  popup.style.zIndex = "10000";
  popup.style.backgroundColor = "white";
  popup.style.border = "1px solid #ccc";
  popup.style.borderRadius = "4px";
  popup.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
  popup.style.padding = "4px";
  popup.style.display = "flex";
  popup.style.gap = "4px";

  document.body.appendChild(popup);
  currentPopup = popup;

  // ボタンのイベントリスナー
  const copyBtn = popup.querySelector(".copy-btn");
  const pasteBtn = popup.querySelector(".paste-btn");

  copyBtn.addEventListener("click", () => {
    copyMathExpression(rootBlock);
    removeExistingPopup();
  });

  pasteBtn.addEventListener("click", () => {
    pasteMathExpression(rootBlock);
    removeExistingPopup();
  });

  // 外部タッチでポップアップを閉じる
  setTimeout(() => {
    document.addEventListener("touchstart", closePopupOnOutsideTouch, { passive: true });
    document.addEventListener("click", closePopupOnOutsideClick, { passive: true });
  }, 0);
}

// 既存のポップアップを削除
function removeExistingPopup() {
  if (currentPopup) {
    currentPopup.remove();
    currentPopup = null;
    document.removeEventListener("touchstart", closePopupOnOutsideTouch);
    document.removeEventListener("click", closePopupOnOutsideClick);
  }
}

// 外部タッチでポップアップを閉じる
function closePopupOnOutsideTouch(event) {
  if (currentPopup && !currentPopup.contains(event.target)) {
    removeExistingPopup();
  }
}

// 外部クリックでポップアップを閉じる（デスクトップ対応）
function closePopupOnOutsideClick(event) {
  if (currentPopup && !currentPopup.contains(event.target)) {
    removeExistingPopup();
  }
}

// 数式をコピーする関数
async function copyMathExpression(rootBlock) {
  try {
    // 数式IDの取得
    const expId = rootBlock.getAttribute("expr-id") || "";

    if (!expId) {
      console.error("数式IDが見つかりません");
      return;
    }

    // ページのコンテキストでCalcにアクセス（非同期）
    const mathText = await getExpressionLatex(expId);

    if (!mathText) {
      console.error("数式の取得に失敗しました");
      // フォールバック: テキストコンテンツを使用
      const fallbackText = rootBlock.textContent || rootBlock.innerText || "";
      if (fallbackText) {
        copyToClipboard(fallbackText);
      }
      return;
    }

    copyToClipboard(mathText);
  } catch (error) {
    console.error("コピー処理でエラーが発生しました:", error);
  }
}

// クリップボードにコピーする共通関数
function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      console.log("数式をコピーしました:", text);
      showToast("コピーしました");
    })
    .catch((err) => {
      console.error("コピーに失敗しました:", err);
      // fallback: テキスト選択方式
      fallbackCopy(text);
    });
}

// フォールバック用のコピー関数
function fallbackCopy(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}

// 数式をペーストする関数
async function pasteMathExpression(rootBlock) {
  try {
    const text = await navigator.clipboard.readText();
    const expId = rootBlock.getAttribute("expr-id") || "";

    if (!expId) {
      console.error("数式IDが見つかりません");
      return;
    }

    // ページのコンテキストでCalcにアクセスしてLatexを設定（非同期）
    const success = await setExpressionLatex(expId, text);

    if (success) {
      console.log("数式をペーストしました:", text);
      showToast("ペーストしました");
    } else {
      console.error("数式の設定に失敗しました");
      // フォールバック: 従来の方法を試行
      fallbackPaste(rootBlock, text);
    }
  } catch (err) {
    console.error("ペーストに失敗しました:", err);
    // モバイルではクリップボードアクセスが制限される場合があるため、
    // ユーザーに手動での貼り付けを促す
    showToast("クリップボードの読み取りに失敗しました");
  }
}

// トースト通知を表示する関数
function showToast(message) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 10001;
    pointer-events: none;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2000);
}

// フォールバック用のペースト関数
function fallbackPaste(rootBlock, text) {
  try {
    // フォーカスを設定
    rootBlock.focus();

    // タッチデバイスでは insertText が動作しない場合があるため、
    // 代替手段を使用
    if (document.execCommand("insertText", false, text)) {
      console.log("数式をペーストしました（フォールバック1）:", text);
      showToast("ペーストしました");
      return;
    }

    // 既存の内容を選択してテキストを置換
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(rootBlock);
    selection.removeAllRanges();
    selection.addRange(range);

    if (document.execCommand("insertText", false, text)) {
      console.log("数式をペーストしました（フォールバック2）:", text);
      showToast("ペーストしました");
    } else {
      // 最終的なフォールバック
      rootBlock.textContent = text;
      console.log("数式をペーストしました（直接設定）:", text);
      showToast("ペーストしました");
    }
  } catch (error) {
    console.error("フォールバックペーストでエラー:", error);
    showToast("ペーストに失敗しました");
  }
}
