#!/bin/bash

# 拡張機能のZIPパッケージを生成するスクリプト
# 使用方法: ./create_packages.sh

set -e

# プロジェクトのルートディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHROME_DIR="${SCRIPT_DIR}/chrome"
FIREFOX_DIR="${SCRIPT_DIR}/firefox"

echo "📦 拡張機能のZIPパッケージを生成中..."

# 既存のZIPファイルを削除
echo "既存のZIPファイルをクリーンアップ中..."
rm -f "${SCRIPT_DIR}/desmos-math-font-enhancer-chrome.zip"
rm -f "${SCRIPT_DIR}/desmos-math-font-enhancer-firefox.zip"

# Chrome版のZIPファイルを生成
if [ -d "$CHROME_DIR" ]; then
    echo "🟢 Chrome版ZIPファイルを生成中..."
    cd "$CHROME_DIR"
    zip -r "../desmos-math-font-enhancer-chrome.zip" . -x "*.DS_Store" "*.git*" "*/.git/*"
    cd "$SCRIPT_DIR"
    echo "  ✅ desmos-math-font-enhancer-chrome.zip を生成しました"
else
    echo "  ❌ Chrome版ディレクトリが見つかりません: $CHROME_DIR"
fi

# Firefox版のZIPファイルを生成
if [ -d "$FIREFOX_DIR" ]; then
    echo "🦊 Firefox版ZIPファイルを生成中..."
    cd "$FIREFOX_DIR"
    zip -r "../desmos-math-font-enhancer-firefox.zip" . -x "*.DS_Store" "*.git*" "*/.git/*"
    cd "$SCRIPT_DIR"
    echo "  ✅ desmos-math-font-enhancer-firefox.zip を生成しました"
else
    echo "  ❌ Firefox版ディレクトリが見つかりません: $FIREFOX_DIR"
    echo "  💡 先に ./convert_to_firefox.sh を実行してFirefox版を生成してください"
fi

echo ""
echo "📦 生成されたZIPファイル:"

if [ -f "${SCRIPT_DIR}/desmos-math-font-enhancer-chrome.zip" ]; then
    CHROME_SIZE=$(du -h "${SCRIPT_DIR}/desmos-math-font-enhancer-chrome.zip" | cut -f1)
    echo "  🟢 desmos-math-font-enhancer-chrome.zip (${CHROME_SIZE}) - Chrome Web Store用"
fi

if [ -f "${SCRIPT_DIR}/desmos-math-font-enhancer-firefox.zip" ]; then
    FIREFOX_SIZE=$(du -h "${SCRIPT_DIR}/desmos-math-font-enhancer-firefox.zip" | cut -f1)
    echo "  🦊 desmos-math-font-enhancer-firefox.zip (${FIREFOX_SIZE}) - Firefox Add-ons用"
fi

echo ""
echo "🚀 公開手順:"
echo "【Chrome Web Store】"
echo "1. https://chrome.google.com/webstore/devconsole/ にアクセス"
echo "2. 新しいアイテムをクリック"
echo "3. desmos-math-font-enhancer-chrome.zip をアップロード"
echo ""
echo "【Firefox Add-ons】"
echo "1. https://addons.mozilla.org/developers/ にアクセス"
echo "2. Submit a New Add-on をクリック"
echo "3. desmos-math-font-enhancer-firefox.zip をアップロード"
