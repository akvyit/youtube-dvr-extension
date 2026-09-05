const SCRIPT_ID = 'dvr-unlock-script';

// スクリプトの登録・解除を行う関数
async function updateScriptState(isEnabled) {
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] }).catch(() => {});

    if (isEnabled) {
      await chrome.scripting.registerContentScripts([{
        id: SCRIPT_ID,
        js: ['dvr_patch.js'],
        matches: ['*://www.youtube.com/*', '*://m.youtube.com/*'],
        runAt: 'document_start',
        world: 'MAIN'
      }]);
      console.log('Script registered (ON)');
    } else {
      console.log('Script unregistered (OFF)');
    }
  } catch (err) {
    console.error('Failed to update script state:', err);
  }
}

// 【修正】インストール/起動時の初期化
chrome.runtime.onInstalled.addListener(async (details) => {
  // 初期設定の読み込み
  const { isEnabled } = await chrome.storage.local.get({ isEnabled: false });
  updateScriptState(isEnabled);

  // 【追加】新規インストール時のみウェルカムページを開く
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'welcome.html' });
  }
});

// ポップアップからのメッセージを受け取る
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TOGGLE_STATE') {
    updateScriptState(message.isEnabled);
  }
});