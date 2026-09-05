// ▼▼▼ 更新履歴データ（ここを編集して履歴を追加します） ▼▼▼
const CHANGELOG = [
   { 
    ver: "v1.0.2",
    date: "2025-12-09", 
    desc: { 
      ja: "<ul><li>不具合の修正。</li></ul>", 
      en: "<ul><li>Bug Fixes.</li></ul>" 
    } 
  },
  
   { 
    ver: "v1.0.1",
    date: "2025-12-06", 
    desc: { 
      ja: "<ul><li>不具合の修正。</li></ul>", 
      en: "<ul><li>Bug Fixes.</li></ul>" 
    } 
  },

  { 
    ver: "v1.0.0",
    date: "2025-12-03", 
    desc: { 
      ja: "<ul><li>リリース！YouTube Liveの強制巻き戻し機能を実装。</li></ul>", 
      en: "<ul><li>Initial release! Force Enabled rewind for YouTube Live.</li></ul>" 
    } 
  }
];

// ▲▲▲ データここまで ▲▲▲

document.addEventListener('DOMContentLoaded', () => {
  // 1. 静的なテキスト（タイトルなど）の翻訳
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const message = chrome.i18n.getMessage(element.getAttribute('data-i18n'));
    if (message) {
      if (element.tagName === 'IMG') element.src = message;
      else element.innerHTML = message;
    }
  });

  // 2. 更新履歴リストの生成（options.jsと同様のロジック）
  const listContainer = document.getElementById("changelog_list");
  
  if (listContainer) {
    // ブラウザの言語判定（日本語で始まれば isJa = true）
    const lang = chrome.i18n.getUILanguage() || "en";
    const isJa = lang.startsWith("ja");

    // 配列データをHTMLに変換して流し込む
    listContainer.innerHTML = CHANGELOG.map(item => {
      // 言語に応じて説明文を選択
      const description = isJa ? item.desc.ja : item.desc.en;
      
      return `
        <div class="version-block">
          <div class="version-header">
            <span class="version-number">${item.ver}</span>
            <span class="version-date">${item.date}</span>
          </div>
          <div class="version-desc">
            ${description}
          </div>
        </div>`;
    }).join("");
  }
});