document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    // メッセージ（翻訳テキスト または 画像パス）を取得
    const message = chrome.i18n.getMessage(element.getAttribute('data-i18n'));
    
    if (message) {
      // 画像タグの場合は src 属性を書き換える
      if (element.tagName === 'IMG') {
        element.src = message;
      } 
      // それ以外（テキスト）の場合は中身を書き換える
      else {
        element.innerHTML = message;
      }
    }
  });
});