document.addEventListener('DOMContentLoaded', () => {
  // ---------------------------------------------
  // 1. 国際化（i18n）処理
  // ---------------------------------------------
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const message = chrome.i18n.getMessage(element.getAttribute('data-i18n'));
    if (message) {
      element.textContent = message;
    }
  });

  // ---------------------------------------------
  // 2. メインロジック
  // ---------------------------------------------
  const toggleButton = document.getElementById('toggleButton');
  const statusSpan = document.getElementById('statusValue');
  const reloadMessage = document.getElementById('reloadMessage');
  const reloadButton = document.getElementById('reloadButton');

  // 変数: 保存されている設定(saved)と、画面上の一時的な設定(temp)を分ける
  let savedState = false;
  let tempState = false;

  function updateUI(isOn) {
    if (isOn) {
      toggleButton.classList.add('is-active');
      statusSpan.textContent = chrome.i18n.getMessage('statusOn');
      statusSpan.style.color = '#43b581';
    } else {
      toggleButton.classList.remove('is-active');
      statusSpan.textContent = chrome.i18n.getMessage('statusOff');
      statusSpan.style.color = '#72767d';
    }
  }

  // 初期化: ストレージから読み込み
  chrome.storage.local.get({ isEnabled: false }, (result) => {
    savedState = result.isEnabled;
    tempState = savedState; // 最初は一致させる
    updateUI(savedState);
  });

  // ボタンクリック時の処理（ここでは保存しない！）
  toggleButton.addEventListener('click', () => {
    // 一時的な状態だけ反転させる
    tempState = !tempState;
    updateUI(tempState);

    // 保存された状態と違う場合のみ「更新ボタン」を表示
    if (tempState !== savedState) {
      reloadMessage.style.display = 'block';
    } else {
      reloadMessage.style.display = 'none';
    }
  });

  // 更新ボタンクリック時の処理（ここで初めて保存！）
  reloadButton.addEventListener('click', () => {
    // ストレージに保存
    chrome.storage.local.set({ isEnabled: tempState }, () => {
      // バックグラウンドに通知
      chrome.runtime.sendMessage({ 
        type: 'TOGGLE_STATE', 
        isEnabled: tempState 
      });

      // ページをリロードしてポップアップを閉じる
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.reload(tabs[0].id);
          window.close();
        }
      });
    });
  });
});