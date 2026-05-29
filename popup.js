// ============================================
// 选中即译 — 设置页面
// chrome.storage.local：Key 不离开本机
// ============================================

const store = chrome.storage.local

const provider = document.getElementById('provider')
const baiduSettings = document.getElementById('baiduSettings')
const baiduAppId = document.getElementById('baiduAppId')
const baiduKey = document.getElementById('baiduKey')
const llmSettings = document.getElementById('llmSettings')
const llmEndpoint = document.getElementById('llmEndpoint')
const llmApiKey = document.getElementById('llmApiKey')
const llmModel = document.getElementById('llmModel')
const targetLang = document.getElementById('targetLang')
const saveBtn = document.getElementById('saveBtn')
const statusEl = document.getElementById('status')

// ---------- 加载 ----------
store.get([
  'provider', 'baiduAppId', 'baiduKey',
  'llmEndpoint', 'llmApiKey', 'llmModel',
  'targetLang'
], (cfg) => {
  if (chrome.runtime.lastError) return

  provider.value = cfg.provider || 'mymemory'
  baiduAppId.value = cfg.baiduAppId || ''
  baiduKey.value = cfg.baiduKey || ''
  llmEndpoint.value = cfg.llmEndpoint || ''
  llmApiKey.value = cfg.llmApiKey || ''
  llmModel.value = cfg.llmModel || ''
  targetLang.value = cfg.targetLang || 'zh-CN'

  toggleSettings()
})

// ---------- 切换 ----------
provider.addEventListener('change', toggleSettings)

function toggleSettings() {
  const v = provider.value
  baiduSettings.style.display = v === 'baidu' ? 'block' : 'none'
  llmSettings.style.display = v === 'llm' ? 'block' : 'none'
}

// ---------- 保存 ----------
saveBtn.addEventListener('click', () => {
  const data = {
    provider: provider.value,
    baiduAppId: baiduAppId.value.trim(),
    baiduKey: baiduKey.value.trim(),
    llmEndpoint: llmEndpoint.value.trim(),
    llmApiKey: llmApiKey.value.trim(),
    llmModel: llmModel.value.trim(),
    targetLang: targetLang.value
  }

  if (data.provider === 'baidu' && (!data.baiduAppId || !data.baiduKey)) {
    return showStatus('请输入百度翻译的 App ID 和密钥', 'error')
  }
  if (data.provider === 'llm') {
    if (!data.llmEndpoint) return showStatus('请输入 API 地址', 'error')
    if (!data.llmEndpoint.startsWith('https://')) return showStatus('API 地址必须使用 HTTPS', 'error')
    if (!data.llmApiKey) return showStatus('请输入 API Key', 'error')
    if (!data.llmModel) return showStatus('请输入模型名称', 'error')
  }

  store.set(data, () => {
    if (chrome.runtime.lastError) {
      showStatus('保存失败：' + chrome.runtime.lastError.message, 'error')
    } else {
      showStatus('✅ 设置已保存（本机存储，不同步云端）', 'success')
    }
  })
})

function showStatus(msg, type) {
  statusEl.textContent = msg
  statusEl.className = 'status ' + type
  statusEl.style.display = 'block'
  setTimeout(() => { statusEl.style.display = 'none' }, 4000)
}
