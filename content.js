// ============================================
// 选中即译 — 浮窗翻译工具
// ============================================

let tooltip = null
let lastText = ''
let lastProvider = ''
let hideTimer = null
let selTimer = null

const PROVIDER_NAMES = {
  mymemory: 'MyMemory',
  baidu: '百度翻译',
  llm: 'DeepSeek'
}

// ---------- 创建浮窗 ----------
function createTooltip() {
  if (tooltip) return
  tooltip = document.createElement('div')
  tooltip.id = 'zTranslateTooltip'
  tooltip.innerHTML = `
    <div class="zt-header">
      <span class="zt-label">🌐 翻译</span>
      <div class="zt-switcher">
        <select class="zt-provider-select"></select>
      </div>
      <div class="zt-header-actions">
        <button class="zt-settings-btn" title="配置 API">⚙</button>
        <button class="zt-close">✕</button>
      </div>
    </div>
    <div class="zt-body">
      <div class="zt-spinner"></div>
      <div class="zt-result" style="display:none"></div>
      <div class="zt-error" style="display:none">翻译失败，请重试</div>
    </div>
  `
  document.body.appendChild(tooltip)

  // 切换翻译源
  const select = tooltip.querySelector('.zt-provider-select')
  select.addEventListener('change', (e) => {
    const provider = e.target.value
    if (provider && provider !== lastProvider) {
      saveProvider(provider)
      if (lastText) {
        doTranslate(lastText, provider)
      }
    }
  })

  // 关闭
  tooltip.querySelector('.zt-close').addEventListener('click', hideTooltip)

  // 打开设置
  tooltip.querySelector('.zt-settings-btn').addEventListener('click', () => {
    window.open(chrome.runtime.getURL('popup.html'), '_blank')
  })

  // 拖拽
  let dragging = false, startX, startY, startLeft, startTop
  tooltip.querySelector('.zt-header').addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') return
    dragging = true
    startX = e.clientX
    startY = e.clientY
    startLeft = tooltip.offsetLeft
    startTop = tooltip.offsetTop
    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', stopDrag)
  })
  function onDrag(e) {
    if (!dragging) return
    tooltip.style.left = startLeft + e.clientX - startX + 'px'
    tooltip.style.top = startTop + e.clientY - startY + 'px'
  }
  function stopDrag() {
    dragging = false
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
  }
}

// ---------- 填充切换选项 ----------
function populateProviderSelect(currentProvider) {
  const select = tooltip.querySelector('.zt-provider-select')
  const allProviders = ['mymemory', 'baidu', 'llm']
  select.innerHTML = allProviders.map(p =>
    `<option value="${p}" ${p === currentProvider ? 'selected' : ''}>${PROVIDER_NAMES[p]}</option>`
  ).join('')
}

// ---------- 保存当前翻译源 ----------
function saveProvider(provider) {
  lastProvider = provider
  chrome.storage.local.set({ provider })
}

// ---------- 获取当前翻译源 ----------
function getProviderFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['provider'], (cfg) => {
      resolve(cfg.provider || 'mymemory')
    })
  })
}

// ---------- 显示浮窗 ----------
async function showTooltip(x, y, text) {
  lastText = text

  // 确保浮窗已创建
  createTooltip()
  clearTimeout(hideTimer)

  // 读取当前翻译源，更新下拉框
  const currentProvider = await getProviderFromStorage()
  lastProvider = currentProvider
  populateProviderSelect(currentProvider)

  const spinner = tooltip.querySelector('.zt-spinner')
  const resultEl = tooltip.querySelector('.zt-result')
  const errorEl = tooltip.querySelector('.zt-error')

  spinner.style.display = 'block'
  resultEl.style.display = 'none'
  errorEl.style.display = 'none'
  resultEl.textContent = ''

  // 定位
  let left = x + 10
  let top = y + 10
  const tw = 340
  const th = 160
  if (left + tw > window.innerWidth) left = window.innerWidth - tw - 10
  if (top + th > window.innerHeight) top = y - th - 10
  if (top < 5) top = 5
  if (left < 5) left = 5

  tooltip.style.left = left + 'px'
  tooltip.style.top = top + 'px'
  tooltip.style.display = 'block'

  doTranslate(text, currentProvider)
}

// ---------- 执行翻译 ----------
function doTranslate(text, provider) {
  const spinner = tooltip.querySelector('.zt-spinner')
  const resultEl = tooltip.querySelector('.zt-result')
  const errorEl = tooltip.querySelector('.zt-error')

  spinner.style.display = 'block'
  resultEl.style.display = 'none'
  errorEl.style.display = 'none'

  // 显示当前来源标识
  const label = tooltip.querySelector('.zt-label')
  label.textContent = `🌐 ${PROVIDER_NAMES[provider] || '翻译'}`

  chrome.runtime.sendMessage(
    { action: 'translate', text },
    (response) => {
      spinner.style.display = 'none'
      if (chrome.runtime.lastError || !response || response.error) {
        errorEl.textContent = response?.error || '网络请求失败'
        if (provider === 'llm') {
          errorEl.textContent += '\n💡 点 ⚙ 配置大模型 API'
        } else if (provider === 'baidu') {
          errorEl.textContent += '\n💡 点 ⚙ 配置百度翻译'
        }
        errorEl.style.display = 'block'
        return
      }
      resultEl.textContent = response.translated
      resultEl.style.display = 'block'
    }
  )
}

// ---------- 隐藏浮窗 ----------
function hideTooltip() {
  if (tooltip) {
    tooltip.style.display = 'none'
    lastText = ''
    tooltip.querySelector('.zt-result').style.display = 'none'
    tooltip.querySelector('.zt-error').style.display = 'none'
  }
}

// ---------- 选中即译 ----------
document.addEventListener('mouseup', (e) => {
  if (tooltip && tooltip.contains(e.target)) return
  const text = window.getSelection().toString().trim()
  if (text.length > 0 && text.length < 2000) {
    showTooltip(e.clientX + 10, e.clientY + 10, text)
  } else {
    hideTooltip()
  }
})

// 点击空白处隐藏
document.addEventListener('mousedown', (e) => {
  if (tooltip && !tooltip.contains(e.target)) {
    hideTooltip()
  }
})

// 按 Esc 隐藏
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideTooltip()
})
