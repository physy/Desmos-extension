// デフォルト設定を生成
const DEFAULT_SETTINGS = generateDefaultSettings();

// 設定を読み込む
async function loadSettings() {
  try {
    // まず新しいJSON形式を試みる
    const result = await chrome.storage.sync.get("settings");
    if (result.settings) {
      return { ...DEFAULT_SETTINGS, ...result.settings };
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
      const finalSettings = { ...DEFAULT_SETTINGS, ...migratedSettings };
      await chrome.storage.sync.set({ settings: finalSettings });

      // 旧形式のキーを削除
      const keysToRemove = Object.keys(DEFAULT_SETTINGS);
      await chrome.storage.sync.remove(keysToRemove);

      console.log("Settings migrated from old format to new JSON format");
      return finalSettings;
    }

    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error("Failed to load settings:", error);
    return DEFAULT_SETTINGS;
  }
}

// 設定を保存する
async function saveSettings(settings) {
  try {
    // JSON形式で保存
    await chrome.storage.sync.set({ settings: settings });
    // 全てのDesmosタブに設定変更を通知
    const tabs = await chrome.tabs.query({ url: "*://www.desmos.com/*" });
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "SETTINGS_CHANGED",
          settings: settings,
        });
      } catch (error) {
        console.log("Could not send message to tab:", tab.id);
      }
    }
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}

// UIを動的生成
function generateUI() {
  const container = document.getElementById("settings-container");
  container.innerHTML = "";

  SETTINGS_CONFIG.categories.forEach((category) => {
    // カテゴリヘッダー
    const categoryDiv = document.createElement("div");
    categoryDiv.className = "category";

    const categoryHeader = document.createElement("div");
    categoryHeader.className = "category-header";
    categoryHeader.innerHTML = `
      <button class="category-expand-btn">▶</button>
      <span class="category-title">${category.title}</span>
    `;
    categoryDiv.appendChild(categoryHeader);

    const categoryContent = document.createElement("div");
    categoryContent.className = "category-content";
    categoryContent.style.display = "none";

    // 各設定項目
    category.settings.forEach((setting) => {
      const settingGroup = document.createElement("div");
      settingGroup.className = "setting-group";

      const settingItem = document.createElement("div");
      settingItem.className = "setting-item clickable";

      const hasDetails = setting.details && setting.details.length > 0;
      const expandBtn = document.createElement("button");
      expandBtn.className = "expand-btn visible";
      expandBtn.id = `${setting.id}Expand`;
      expandBtn.textContent = "▶";
      settingItem.appendChild(expandBtn);

      const settingInfo = document.createElement("div");
      settingInfo.className = "setting-info";
      settingInfo.title = setting.description;
      settingInfo.innerHTML = `<div class="setting-title">${setting.title}</div>`;
      settingItem.appendChild(settingInfo);

      const switchLabel = document.createElement("label");
      switchLabel.className = "switch";
      switchLabel.innerHTML = `
        <input type="checkbox" id="${setting.id}" />
        <span class="slider"></span>
      `;
      switchLabel.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      settingItem.appendChild(switchLabel);

      settingGroup.appendChild(settingItem);

      // 詳細設定
      const detailsDiv = document.createElement("div");
      detailsDiv.className = "setting-details";
      detailsDiv.id = `${setting.id}Details`;
      detailsDiv.style.display = "none";

      // 説明文を追加
      if (setting.description) {
        const descDiv = document.createElement("div");
        descDiv.className = "setting-description";
        descDiv.textContent = setting.description;
        detailsDiv.appendChild(descDiv);
      }

      if (hasDetails) {
        setting.details.forEach((detail) => {
          if (detail.type === "select") {
            const detailRow = document.createElement("div");
            detailRow.className = "detail-row";

            const label = document.createElement("label");
            label.className = "detail-label";
            label.textContent = detail.label + ":";
            detailRow.appendChild(label);

            const select = document.createElement("select");
            select.id = detail.id;
            select.className = "setting-select";
            detail.options.forEach((option) => {
              const optionEl = document.createElement("option");
              optionEl.value = option.value;
              optionEl.textContent = option.label;
              if (option.value === detail.defaultValue) {
                optionEl.selected = true;
              }
              select.appendChild(optionEl);
            });
            detailRow.appendChild(select);

            detailsDiv.appendChild(detailRow);
          } else if (detail.type === "checkbox") {
            const warningBox = document.createElement("div");
            warningBox.className = "warning-box";

            const detailRow = document.createElement("div");
            detailRow.className = "detail-row";

            const label = document.createElement("label");
            label.className = "detail-label";
            label.textContent = detail.label + ":";
            detailRow.appendChild(label);

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = detail.id;
            detailRow.appendChild(checkbox);

            warningBox.appendChild(detailRow);

            if (detail.warning) {
              const warningText = document.createElement("div");
              warningText.className = "warning-text";
              warningText.textContent = detail.warning;
              warningBox.appendChild(warningText);
            }

            detailsDiv.appendChild(warningBox);
          }
        });
      }

      settingGroup.appendChild(detailsDiv);

      // 設定項目全体をクリック可能に
      settingItem.addEventListener("click", () => {
        const isExpanded = detailsDiv.style.display !== "none";
        detailsDiv.style.display = isExpanded ? "none" : "flex";
        expandBtn.classList.toggle("expanded", !isExpanded);
      });

      categoryContent.appendChild(settingGroup);
    });

    categoryDiv.appendChild(categoryContent);
    container.appendChild(categoryDiv);
  });
}

// UIを初期化
async function initializeUI() {
  generateUI();
  const settings = await loadSettings();

  // カテゴリの展開/折りたたみ
  document.querySelectorAll(".category-header").forEach((header) => {
    header.addEventListener("click", () => {
      const categoryDiv = header.parentElement;
      const content = header.nextElementSibling;
      const expandBtn = header.querySelector(".category-expand-btn");
      const isExpanded = content.style.display !== "none";
      content.style.display = isExpanded ? "none" : "block";
      expandBtn.classList.toggle("expanded", !isExpanded);
      categoryDiv.classList.toggle("expanded", !isExpanded);
    });
  });

  // 設定値を読み込み
  SETTINGS_CONFIG.categories.forEach((category) => {
    category.settings.forEach((setting) => {
      const checkbox = document.getElementById(setting.id);
      if (checkbox) {
        checkbox.checked = settings[setting.id];
        const expandBtn = document.getElementById(`${setting.id}Expand`);
        if (expandBtn) {
          expandBtn.classList.toggle("visible", settings[setting.id]);
        }
      }

      if (setting.details) {
        setting.details.forEach((detail) => {
          const element = document.getElementById(detail.id);
          if (element) {
            if (detail.type === "select") {
              element.value = settings[detail.id];
            } else if (detail.type === "checkbox") {
              element.checked = settings[detail.id];
            }
          }
        });
      }
    });
  });

  setupEventListeners();
}

// イベントリスナーを設定
function setupEventListeners() {
  SETTINGS_CONFIG.categories.forEach((category) => {
    category.settings.forEach((setting) => {
      const checkbox = document.getElementById(setting.id);

      if (checkbox) {
        checkbox.addEventListener("change", async () => {
          const settings = await loadSettings();
          settings[setting.id] = checkbox.checked;
          await saveSettings(settings);
        });
      }

      if (setting.details) {
        setting.details.forEach((detail) => {
          const element = document.getElementById(detail.id);
          if (element) {
            element.addEventListener("change", async () => {
              const settings = await loadSettings();
              if (detail.type === "select") {
                const value = element.value;
                settings[detail.id] = isNaN(value) ? value : parseFloat(value);
              } else if (detail.type === "checkbox") {
                settings[detail.id] = element.checked;
              }
              await saveSettings(settings);
            });
          }
        });
      }
    });
  });

  // エクスポート
  document.getElementById("exportBtn").addEventListener("click", async () => {
    const settings = await loadSettings();
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "desmos-extension-settings.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  // インポート
  document.getElementById("importBtn").addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const importedSettings = JSON.parse(event.target.result);
            await saveSettings(importedSettings);
            await initializeUI();
          } catch (error) {
            console.error("Failed to import settings:", error);
            alert("Failed to import settings. Please check the file format.");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  });

  // リセット
  document.getElementById("resetBtn").addEventListener("click", async () => {
    await saveSettings(DEFAULT_SETTINGS);
    await initializeUI();
  });
}

// DOMが読み込まれたら初期化
document.addEventListener("DOMContentLoaded", () => {
  initializeUI();
});
