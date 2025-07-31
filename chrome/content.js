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
    }, 300);
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

    // ポップアップが表示されている場合、フォーカスを維持
    if (currentPopup) {
      // 少し遅延してからポップアップにフォーカスを戻す
      setTimeout(() => {
        if (currentPopup && currentPopup.parentNode) {
          currentPopup.focus();
        }
      }, 10);
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

    // ポップアップが表示されている場合、フォーカスを維持
    if (currentPopup) {
      // 少し遅延してからポップアップにフォーカスを戻す
      setTimeout(() => {
        if (currentPopup && currentPopup.parentNode) {
          currentPopup.focus();
        }
      }, 10);
    }
  },
  { passive: true }
);

// ポップアップを表示する関数
async function showCopyPastePopup(x, y, rootBlock) {
  // 既存のポップアップを削除
  removeExistingPopup();

  // バーチャルキーボードを閉じるためにフォーカスを外す
  if (document.activeElement && document.activeElement.blur) {
    document.activeElement.blur();
  }

  // バーチャルキーボードが閉じるまで少し待機
  await new Promise((resolve) => setTimeout(resolve, 100));

  // クリップボードの内容をチェック
  let hasClipboardContent = false;
  try {
    const clipboardText = await navigator.clipboard.readText();
    hasClipboardContent = clipboardText && clipboardText.trim().length > 0;
  } catch (error) {
    console.log("クリップボードアクセスできません:", error);
    hasClipboardContent = true;
  }

  // ポップアップ要素を作成
  const popup = document.createElement("div");
  popup.className = "math-popup";
  popup.innerHTML = `
    <button class="math-popup-btn copy-btn">copy</button>
    <button class="math-popup-btn paste-btn" ${
      !hasClipboardContent ? "disabled" : ""
    }>paste</button>
  `;

  // 画面端での位置調整
  const popupWidth = 140; // ポップアップの推定幅
  const popupHeight = 60; // ポップアップの推定高さ
  const margin = 10; // 画面端からのマージン

  // X座標の調整
  let adjustedX = x;
  if (x + popupWidth + margin > window.innerWidth) {
    adjustedX = window.innerWidth - popupWidth - margin;
  }
  if (adjustedX < margin) {
    adjustedX = margin;
  }

  // Y座標の調整
  let adjustedY = y - 60;
  if (adjustedY < margin) {
    adjustedY = y + 20; // カーソルの下に表示
  }
  if (adjustedY + popupHeight + margin > window.innerHeight) {
    adjustedY = window.innerHeight - popupHeight - margin;
  }

  // スタイルを設定
  popup.style.position = "fixed";
  popup.style.left = adjustedX + "px";
  popup.style.top = adjustedY + "px";
  popup.style.zIndex = "10000";
  popup.style.backgroundColor = "white";
  popup.style.border = "1px solid #ccc";
  popup.style.borderRadius = "4px";
  popup.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
  popup.style.padding = "4px";
  popup.style.display = "flex";
  popup.style.gap = "4px";
  popup.style.outline = "none"; // フォーカス時のアウトラインを除去

  // ポップアップをtabindexで修正できるようにする
  popup.setAttribute("tabindex", "-1");

  document.body.appendChild(popup);
  currentPopup = popup;

  // ポップアップにフォーカスを設定
  popup.focus();

  // 確実にフォーカスされるように少し遅延してもう一度試行
  setTimeout(() => {
    if (popup && popup.parentNode) {
      popup.focus();
    }
  }, 50);

  // フォーカスが外れることを防ぐためのイベントリスナー
  const maintainFocus = (event) => {
    // ポップアップ外の要素にフォーカスが移った場合、ポップアップに戻す
    if (currentPopup && !currentPopup.contains(event.target)) {
      event.preventDefault();
      setTimeout(() => {
        if (currentPopup && currentPopup.parentNode) {
          currentPopup.focus();
        }
      }, 0);
    }
  };

  // フォーカス変更を監視
  document.addEventListener("focusin", maintainFocus);

  // ポップアップが削除される時にイベントリスナーも削除
  const originalRemove = popup.remove;
  popup.remove = function () {
    document.removeEventListener("focusin", maintainFocus);
    originalRemove.call(this);
  };

  // ボタンのイベントリスナー
  const copyBtn = popup.querySelector(".copy-btn");
  const pasteBtn = popup.querySelector(".paste-btn");

  copyBtn.addEventListener("click", () => {
    // 即座に視覚的フィードバック
    copyBtn.style.backgroundColor = "#dee2e6";
    copyBtn.style.transform = "scale(0.95)";

    // バーチャルキーボードが閉じる処理を待つため少し遅延
    setTimeout(() => {
      copyMathExpression(rootBlock);
      removeExistingPopup();
    }, 150);
  });

  pasteBtn.addEventListener("click", () => {
    if (!pasteBtn.disabled) {
      // 即座に視覚的フィードバック
      pasteBtn.style.backgroundColor = "#dee2e6";
      pasteBtn.style.transform = "scale(0.95)";

      // バーチャルキーボードが閉じる処理を待つため少し遅延
      setTimeout(() => {
        pasteMathExpression(rootBlock);
        removeExistingPopup();
      }, 150);
    }
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
    try {
      const text = await navigator.clipboard.readText();
      const expId = rootBlock.getAttribute("expr-id") || "";

      if (!expId) {
        console.error("数式IDが見つかりません");
        showToast("数式IDが見つかりません");
        return;
      }

      // ページのコンテキストでCalcにアクセスしてLatexを設定（非同期）
      const success = await setExpressionLatex(expId, text);

      if (success) {
        console.log("数式をペーストしました:", text);
        showToast("ペーストしました");
      } else {
        console.error("数式の設定に失敗しました");
        showToast("ペーストに失敗しました");
      }
    } catch (clipboardError) {
      console.error("クリップボードアクセス失敗:", clipboardError);
      showToast("クリップボードにアクセスできません。手動でペーストしてください。");
    }
  } catch (error) {
    console.error("ペースト処理でエラーが発生しました:", error);
    showToast("ペーストに失敗しました");
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
