// 設定の構造定義
const SETTINGS_CONFIG = {
  categories: [
    {
      id: "expression",
      title: "Expression",
      settings: [
        {
          id: "uprightSubscript",
          title: "Upright subscripts",
          description: "Display subscripts in upright style",
          type: "toggle",
          defaultValue: false,
          details: [
            {
              id: "uprightSubscriptMinChars",
              label: "Min chars",
              type: "select",
              options: [
                { value: 1, label: "1+ chars" },
                { value: 2, label: "2+ chars" },
              ],
              defaultValue: 2,
            },
          ],
        },
        {
          id: "normalSizeSubscript",
          title: "Normal size subscripts",
          description: "Display subscripts at normal font size",
          type: "toggle",
          defaultValue: false,
          details: [
            {
              id: "normalSizeSubscriptMinChars",
              label: "Min chars",
              type: "select",
              options: [
                { value: 1, label: "1+ chars" },
                { value: 2, label: "2+ chars" },
              ],
              defaultValue: 2,
            },
            {
              id: "normalSizeSubscriptApplyWhileEditing",
              label: "Apply while editing",
              type: "checkbox",
              defaultValue: false,
              warning: "⚠️ Enabling this may interfere with input",
            },
          ],
        },
        {
          id: "colonWithSpace",
          title: "Colon with space",
          description: "Add spacing after colons",
          type: "toggle",
          defaultValue: false,
          details: [
            {
              id: "colonWithSpaceWidth",
              label: "Width",
              type: "select",
              options: [
                { value: 400, label: "400" },
                { value: 500, label: "500" },
                { value: 600, label: "600" },
              ],
              defaultValue: 500,
            },
          ],
        },
        {
          id: "commaWithSpace",
          title: "Comma with space",
          description: "Add spacing after commas",
          type: "toggle",
          defaultValue: false,
          details: [
            {
              id: "commaWithSpaceMargin",
              label: "Margin",
              type: "select",
              options: [
                { value: 0.05, label: "0.05em" },
                { value: 0.1, label: "0.1em" },
                { value: 0.15, label: "0.15em" },
                { value: 0.2, label: "0.2em" },
                { value: 0.25, label: "0.25em" },
                { value: 0.3, label: "0.3em" },
                { value: 0.35, label: "0.35em" },
                { value: 0.4, label: "0.4em" },
              ],
              defaultValue: 0.2,
            },
          ],
        },
        {
          id: "displayStyleIntegrals",
          title: "Display style integrals",
          description: "Integrals in display style",
          type: "toggle",
          defaultValue: true,
        },
        {
          id: "enhancedParentheses",
          title: "Enhanced parentheses",
          description: "Improve the appearance of parentheses",
          type: "toggle",
          defaultValue: false,
          details: [
            {
              id: "enhancedParenthesesThickness",
              label: "Thickness",
              type: "select",
              options: [
                { value: "normal", label: "Normal" },
                { value: "thin", label: "Thin" },
              ],
              defaultValue: "normal",
            },
          ],
        },
      ],
    },
    {
      id: "ui",
      title: "UI",
      settings: [
        {
          id: "transparentIcons",
          title: "Transparent icons",
          description: "Make UI icons and buttons transparent with blur effect",
          type: "toggle",
          defaultValue: false,
        },
        {
          id: "compactHeader",
          title: "Compact header",
          description: "Make header and UI elements more compact",
          type: "toggle",
          defaultValue: false,
        },
        {
          id: "customBackground",
          title: "Custom background",
          description: "Change background color of UI elements",
          type: "toggle",
          defaultValue: false,
          details: [
            {
              id: "customBackgroundColor",
              label: "Color",
              type: "color",
              defaultValue: "#f6f9fd",
            },
          ],
        },
        {
          id: "fullscreenButton",
          title: "Fullscreen button",
          description: "Add a fullscreen button to the header",
          type: "toggle",
          defaultValue: false,
        },
      ],
    },
  ],
};

// デフォルト設定を生成
function generateDefaultSettings() {
  const defaults = {};
  SETTINGS_CONFIG.categories.forEach((category) => {
    category.settings.forEach((setting) => {
      defaults[setting.id] = setting.defaultValue;
      if (setting.details) {
        setting.details.forEach((detail) => {
          defaults[detail.id] = detail.defaultValue;
        });
      }
    });
  });
  return defaults;
}
