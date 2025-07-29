#!/bin/bash

# Chrome拡張機能をFirefox版に変換するスクリプト
# 使用方法: ./convert_to_firefox.sh

set -e

# プロジェクトのルートディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHROME_DIR="${SCRIPT_DIR}/chrome"
FIREFOX_DIR="${SCRIPT_DIR}/firefox"

echo "🦊 Chrome拡張機能をFirefox版に変換中..."

# Firefoxディレクトリをクリーンアップ
if [ -d "$FIREFOX_DIR" ]; then
    echo "既存のFirefoxディレクトリをクリーンアップ中..."
    rm -rf "$FIREFOX_DIR"
fi

# Firefoxディレクトリを作成
mkdir -p "$FIREFOX_DIR"

# Chromeディレクトリの内容をすべてコピー
echo "📁 ファイルをコピー中..."
cp -r "$CHROME_DIR"/* "$FIREFOX_DIR/"

# manifest.jsonを変換
echo "📝 manifest.jsonをFirefox用に変換中..."
MANIFEST_FILE="${FIREFOX_DIR}/manifest.json"

# jqを使ってmanifest.jsonを変換（jqがない場合は手動で処理）
if command -v jq >/dev/null 2>&1; then
    # jqを使用した高精度な変換
    jq '
        .manifest_version = 2 |
        .web_accessible_resources = [.web_accessible_resources[0].resources[]] |
        del(.author) |
        .permissions = ["https://www.desmos.com/*"]
    ' "$MANIFEST_FILE" > "${MANIFEST_FILE}.tmp" && mv "${MANIFEST_FILE}.tmp" "$MANIFEST_FILE"
else
    # jqがない場合の手動変換
    sed -i '' 's/"manifest_version": 3/"manifest_version": 2/' "$MANIFEST_FILE"

    # web_accessible_resourcesを変換
    sed -i '' '/"web_accessible_resources": \[/,/\]/c\
  "web_accessible_resources": [\
    "resource/*.woff2"\
  ],' "$MANIFEST_FILE"

    # authorフィールドを削除（Firefox Manifest V2では不要）
    sed -i '' '/"author":/d' "$MANIFEST_FILE"

    # permissionsを追加
    sed -i '' '/"web_accessible_resources": \[/i\
  "permissions": ["https://www.desmos.com/*"],' "$MANIFEST_FILE"
fi

# CSSファイルでchrome-extension://のURLをFirefox形式に変更
echo "🎨 CSSファイルのURLをFirefox用に変換中..."
CSS_FILE="${FIREFOX_DIR}/content.css"

# Firefox用の相対パスに変更（Firefoxでは相対パスを使用）
sed -i '' 's|url(chrome-extension://__MSG_@@extension_id__/|url(|g' "$CSS_FILE"

# ZIPファイルを生成
echo "📦 ストア公開用ZIPファイルを生成中..."

# Chrome版のZIPファイルを生成
echo "Chrome版ZIPファイルを生成中..."
cd "$CHROME_DIR"
zip -r "../desmos-math-font-enhancer-chrome.zip" . -x "*.DS_Store"
cd "$SCRIPT_DIR"

# Firefox版のZIPファイルを生成
echo "Firefox版ZIPファイルを生成中..."
cd "$FIREFOX_DIR"
zip -r "../desmos-math-font-enhancer-firefox.zip" . -x "*.DS_Store"
cd "$SCRIPT_DIR"

echo "✅ Firefox版への変換が完了しました！"
echo ""
echo "📂 出力先: $FIREFOX_DIR"
echo "📦 生成されたZIPファイル:"
echo "  - desmos-math-font-enhancer-chrome.zip (Chrome Web Store用)"
echo "  - desmos-math-font-enhancer-firefox.zip (Firefox Add-ons用)"
echo ""
echo "🔧 次のステップ:"
echo "1. Firefoxを開く"
echo "2. about:debugging に移動"
echo "3. 「この Firefox」をクリック"
echo "4. 「一時的なアドオンを読み込む」をクリック"
echo "5. firefox/manifest.json を選択"
echo ""
echo "💡 注意事項:"
echo "- Firefox版は一時的なアドオンとして読み込まれます"
echo "- 本格的な配布にはFirefox Add-onsでの署名が必要です"
echo "- manifest.json の permissions や content_scripts は必要に応じて調整してください"
