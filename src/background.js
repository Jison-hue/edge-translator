// ============================================
// 选中即译 — 后台翻译服务（安全增强版）
// ============================================

const MYMEMORY_API = 'https://api.mymemory.translated.net/get'
const EXT_ID = chrome.runtime.id

// 安全存储：敏感 Key 只存 local（不同步到微软云）
const secureStore = chrome.storage.local
const prefStore = chrome.storage.local  // 统一用 local，不同步

// ---------- 消息来源校验 ----------
function isTrusted(sender) {
  // 只接受来自本插件自身的消息
  return sender.id === EXT_ID
}

// ---------- 消息路由（严格校验来源）----------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!isTrusted(sender)) {
    console.warn('[选中即译] 拒绝来自外部的消息:', sender.id)
    return false
  }

  if (request.action === 'translate') {
    // 限制单次翻译长度，防滥用
    const text = (request.text || '').slice(0, 8000)
    if (!text.trim()) {
      sendResponse({ error: '请选中要翻译的文字' })
      return true
    }
    translate(text)
      .then((result) => sendResponse({ translated: result }))
      .catch((err) => sendResponse({ error: err.message }))
    return true
  }

  if (request.action === 'detectLang') {
    detectLanguage((request.text || '').slice(0, 500))
      .then((lang) => sendResponse({ lang }))
      .catch(() => sendResponse({ lang: 'en' }))
    return true
  }
})

// 带超时的 fetch（10 秒超时，防止请求卡死）
function fetchWithTimeout(url, opts, timeoutMs) {
  timeoutMs = timeoutMs || 10000
  return Promise.race([
    fetch(url, opts),
    new Promise(function(_, reject) {
      setTimeout(function() { reject(new Error('请求超时')) }, timeoutMs)
    })
  ])
}

// ---------- 翻译核心 ----------
async function translate(text) {
  const config = await secureStore.get([
    'provider', 'baiduAppId', 'baiduKey',
    'llmEndpoint', 'llmApiKey', 'llmModel',
    'targetLang'
  ])
  const target = config.targetLang || 'zh-CN'
  const provider = config.provider || 'mymemory'

  // 有 Baidu 配置 → 优先用 Baidu（国内用户 MyMemory 可能连不上）
  if (config.baiduAppId && config.baiduKey) {
    return await translateBaidu(text, target, config.baiduAppId, config.baiduKey)
  }
  if (provider === 'llm' && config.llmEndpoint && config.llmApiKey && config.llmModel) {
    return await translateWithLLM(text, target, config.llmEndpoint, config.llmApiKey, config.llmModel)
  }
  return await translateMyMemory(text, target)
}

// --- MyMemory（默认源语言 en，不支持 auto）---
async function translateMyMemory(text, target) {
  const langMap = {
    'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW',
    'en': 'en', 'ja': 'ja', 'ko': 'ko',
    'fr': 'fr', 'de': 'de', 'es': 'es',
    'ru': 'ru', 'pt': 'pt', 'it': 'it',
    'th': 'th', 'vi': 'vi'
  }
  const to = langMap[target] || 'zh-CN'
  const url = `${MYMEMORY_API}?q=${encodeURIComponent(text)}&langpair=en|${to}`
  const res = await fetchWithTimeout(url)
  if (!res.ok) throw new Error(`MyMemory 返回 ${res.status}`)
  const data = await res.json()
  if (data.responseStatus !== 200) {
    throw new Error('MyMemory 请求失败，请点击⚙切换到百度翻译')
  }
  return data.responseData.translatedText
}

// --- 百度翻译 ---
async function translateBaidu(text, target, appId, key) {
  const langMap = {
    'zh-CN': 'zh', 'zh-TW': 'cht',
    'en': 'en', 'ja': 'jp', 'ko': 'kor',
    'fr': 'fra', 'de': 'de', 'es': 'spa',
    'ru': 'ru', 'pt': 'pt', 'it': 'it',
    'th': 'th', 'vi': 'vie'
  }
  const to = langMap[target] || 'zh'
  const salt = Date.now()
  const sign = md5(appId + text + salt + key)

  const url = `https://fanyi-api.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(text)}&from=auto&to=${to}&appid=${appId}&salt=${salt}&sign=${sign}`
  const res = await fetchWithTimeout(url)
  if (!res.ok) throw new Error(`百度翻译返回 ${res.status}`)
  const data = await res.json()
  if (data.error_code && data.error_code !== '0') {
    throw new Error('百度翻译请求失败，请检查配置')
  }
  return data.trans_result.map(t => t.dst).join('\n')
}

// 纯 JS MD5
// MD5（已验证：UTF-8 输入 + 小端序 hex 输出，适用于百度签名）
function md5(str) {
  function safeAdd(x, y) {
    var lsw = (x & 0xFFFF) + (y & 0xFFFF)
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16)
    return (msw << 16) | (lsw & 0xFFFF)
  }
  function bitRotateLeft(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)) }
  function md5cmn(q,a,b,x,s,t) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a,q),safeAdd(x,t)),s),b) }
  function ff(a,b,c,d,x,s,t) { return md5cmn((b&c)|(~b&d),a,b,x,s,t) }
  function gg(a,b,c,d,x,s,t) { return md5cmn((b&d)|(c&~d),a,b,x,s,t) }
  function hh(a,b,c,d,x,s,t) { return md5cmn(b^c^d,a,b,x,s,t) }
  function ii(a,b,c,d,x,s,t) { return md5cmn(c^(b|~d),a,b,x,s,t) }

  // UTF-8 编码为字节
  var bytes = []
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i)
    if (c < 0x80) bytes.push(c)
    else if (c < 0x800) { bytes.push(0xC0|(c>>6)); bytes.push(0x80|(c&0x3F)) }
    else { bytes.push(0xE0|(c>>12)); bytes.push(0x80|((c>>6)&0x3F)); bytes.push(0x80|(c&0x3F)) }
  }
  var bitLen = bytes.length * 8

  // 字节 → 32 位小端字
  var w = []
  for (var i = 0; i < bytes.length; i++) {
    w[i>>2] = (w[i>>2]||0) | (bytes[i] << ((i&3)*8))
  }

  // MD5 填充
  w[bitLen>>5] |= 0x80 << (bitLen%32)
  w[((bitLen+64)>>>9<<4)+14] = bitLen

  // 处理 16 字块
  var a = 1732584193, b = -271733879, c = -1732584194, d = 271733878
  for (var ch = 0; ch < w.length; ch += 16) {
    var oa = a, ob = b, oc = c, od = d
    a = ff(a,b,c,d,w[ch],7,-680876936); d = ff(d,a,b,c,w[ch+1],12,-389564586); c = ff(c,d,a,b,w[ch+2],17,606105819); b = ff(b,c,d,a,w[ch+3],22,-1044525330)
    a = ff(a,b,c,d,w[ch+4],7,-176418897); d = ff(d,a,b,c,w[ch+5],12,1200080426); c = ff(c,d,a,b,w[ch+6],17,-1473231341); b = ff(b,c,d,a,w[ch+7],22,-45705983)
    a = ff(a,b,c,d,w[ch+8],7,1770035416); d = ff(d,a,b,c,w[ch+9],12,-1958414417); c = ff(c,d,a,b,w[ch+10],17,-42063); b = ff(b,c,d,a,w[ch+11],22,-1990404162)
    a = ff(a,b,c,d,w[ch+12],7,1804603682); d = ff(d,a,b,c,w[ch+13],12,-40341101); c = ff(c,d,a,b,w[ch+14],17,-1502002290); b = ff(b,c,d,a,w[ch+15],22,1236535329)
    a = gg(a,b,c,d,w[ch+1],5,-165796510); d = gg(d,a,b,c,w[ch+6],9,-1069501632); c = gg(c,d,a,b,w[ch+11],14,643717713); b = gg(b,c,d,a,w[ch],20,-373897302)
    a = gg(a,b,c,d,w[ch+5],5,-701558691); d = gg(d,a,b,c,w[ch+10],9,38016083); c = gg(c,d,a,b,w[ch+15],14,-660478335); b = gg(b,c,d,a,w[ch+4],20,-405537848)
    a = gg(a,b,c,d,w[ch+9],5,568446438); d = gg(d,a,b,c,w[ch+14],9,-1019803690); c = gg(c,d,a,b,w[ch+3],14,-187363961); b = gg(b,c,d,a,w[ch+8],20,1163531501)
    a = gg(a,b,c,d,w[ch+13],5,-1444681467); d = gg(d,a,b,c,w[ch+2],9,-51403784); c = gg(c,d,a,b,w[ch+7],14,1735328473); b = gg(b,c,d,a,w[ch+12],20,-1926607734)
    a = hh(a,b,c,d,w[ch+5],4,-378558); d = hh(d,a,b,c,w[ch+8],11,-2022574463); c = hh(c,d,a,b,w[ch+11],16,1839030562); b = hh(b,c,d,a,w[ch+14],23,-35309556)
    a = hh(a,b,c,d,w[ch+1],4,-1530992060); d = hh(d,a,b,c,w[ch+4],11,1272893353); c = hh(c,d,a,b,w[ch+7],16,-155497632); b = hh(b,c,d,a,w[ch+10],23,-1094730640)
    a = hh(a,b,c,d,w[ch+13],4,681279174); d = hh(d,a,b,c,w[ch],11,-358537222); c = hh(c,d,a,b,w[ch+3],16,-722521979); b = hh(b,c,d,a,w[ch+6],23,76029189)
    a = hh(a,b,c,d,w[ch+9],4,-640364487); d = hh(d,a,b,c,w[ch+12],11,-421815835); c = hh(c,d,a,b,w[ch+15],16,530742520); b = hh(b,c,d,a,w[ch+2],23,-995338651)
    a = ii(a,b,c,d,w[ch],6,-198630844); d = ii(d,a,b,c,w[ch+7],10,1126891415); c = ii(c,d,a,b,w[ch+14],15,-1416354905); b = ii(b,c,d,a,w[ch+5],21,-57434055)
    a = ii(a,b,c,d,w[ch+12],6,1700485571); d = ii(d,a,b,c,w[ch+3],10,-1894986606); c = ii(c,d,a,b,w[ch+10],15,-1051523); b = ii(b,c,d,a,w[ch+1],21,-2054922799)
    a = ii(a,b,c,d,w[ch+8],6,1873313359); d = ii(d,a,b,c,w[ch+15],10,-30611744); c = ii(c,d,a,b,w[ch+6],15,-1560198380); b = ii(b,c,d,a,w[ch+13],21,1309151649)
    a = ii(a,b,c,d,w[ch+4],6,-145523070); d = ii(d,a,b,c,w[ch+11],10,-1120210379); c = ii(c,d,a,b,w[ch+2],15,718787259); b = ii(b,c,d,a,w[ch+9],21,-343485551)
    a = safeAdd(a,oa); b = safeAdd(b,ob); c = safeAdd(c,oc); d = safeAdd(d,od)
  }

  // 小端字节序 hex 输出
  var hex = ''
  var vals = [a,b,c,d]
  for (var n = 0; n < 4; n++) {
    for (var i = 0; i < 4; i++) {
      var bv = (vals[n] >>> (i*8)) & 0xFF
      hex += ('0' + bv.toString(16)).slice(-2)
    }
  }
  return hex
}

// --- 大模型翻译 ---
async function translateWithLLM(text, target, endpoint, apiKey, model) {
  const langNames = {
    'zh-CN': '简体中文', 'zh-TW': '繁体中文',
    'en': '英语', 'ja': '日语', 'ko': '韩语',
    'fr': '法语', 'de': '德语', 'es': '西班牙语',
    'ru': '俄语', 'pt': '葡萄牙语', 'it': '意大利语',
    'th': '泰语', 'vi': '越南语'
  }
  const targetLang = langNames[target] || '简体中文'

  const body = {
    model,
    messages: [
      {
        role: 'system',
        content: `你是一个专业的翻译助手。请将用户发送的文本翻译成${targetLang}。只返回翻译结果，不要加解释、不要加引号、不要加任何额外内容。保持原文的格式和换行。`
      },
      { role: 'user', content: text }
    ],
    temperature: 0.3,
    max_tokens: Math.min(text.length * 3, 4096)
  }

  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    throw new Error('大模型接口请求失败，请检查 API 地址和 Key')
  }

  const data = await res.json()
  return (data.choices?.[0]?.message?.content || '').trim()
}

// ---------- 语言检测 ----------
async function detectLanguage(text) {
  const url = `${MYMEMORY_API}?q=${encodeURIComponent(text.slice(0, 200))}&langpair=en|en`
  const res = await fetchWithTimeout(url)
  const data = await res.json()
  return data.responseData?.detectedLanguage || 'en'
}
