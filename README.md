# 🌐 选中即译 — Edge/Chrome 翻译插件

> 选中网页文字 → 自动弹出翻译浮窗。支持大模型 / 百度翻译 / MyMemory，API Key 仅存本机。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![Version](https://img.shields.io/badge/Version-1.2.0-orange.svg)]()

---

## ✨ 功能特性

- **选中即译** — 选中网页文字，浮窗自动弹出翻译结果
- **多翻译源** — 内置三种翻译引擎，随时切换：
  - 🟢 **MyMemory** — 免配置，开箱即用
  - 🔵 **百度翻译** — 国内直连，标准版免费
  - 🟣 **大模型翻译** — 支持 DeepSeek / 通义千问 / GPT 等 OpenAI 兼容接口，翻译质量最好
- **8 种目标语言** — 简体中文、繁体中文、英语、日语、韩语、法语、德语、西班牙语
- **隐私优先** — 所有 API Key 仅存 `chrome.storage.local`，不同步云端
- **浮窗可拖拽** — 标题栏拖动定位，ESC 关闭
- **轻量无依赖** — 纯原生 JS，无打包工具，无第三方库

## 📸 使用流程

```
选中文字 → 浮窗弹出 → 自动翻译 → 可切换翻译源
```

浮窗右上角 `⚙` 可快速跳转设置页面。

## 🚀 安装

### Edge

1. 下载本仓库，解压到本地
2. 地址栏输入 `edge://extensions/`
3. 打开右上角「开发者模式」
4. 点「加载解压缩的扩展」→ 选择 `src` 文件夹

### Chrome

1. 地址栏输入 `chrome://extensions/`
2. 同上操作

## ⚙️ 配置

点击工具栏的 🌐 图标打开设置面板：

### MyMemory（默认）

无需配置，直接可用。适合快速体验。

### 百度翻译

1. 注册 [百度翻译开放平台](https://api.fanyi.baidu.com/)
2. 开通「通用翻译」→ 标准版（免费）
3. 获取 App ID 和密钥，填入设置

### 大模型翻译

支持所有 OpenAI 兼容接口，推荐：

| 服务商 | 接口地址 | 模型 |
|--------|----------|------|
| DeepSeek | `https://api.deepseek.com/v1/chat/completions` | `deepseek-chat` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` | `qwen-plus` |

填写 API 地址、API Key、模型名称即可。

## 📁 项目结构

```
src/
├── manifest.json      # 插件配置（Manifest V3）
├── background.js      # Service Worker，翻译请求处理
├── content.js         # 内容脚本，浮窗创建与交互
├── popup.html         # 设置面板
├── popup.js           # 设置逻辑
├── styles.css         # 浮窗样式
└── icons/             # 插件图标
```

## 🔒 安全说明

- API Key 存储在 `chrome.storage.local`，**不会**同步到浏览器云端账号
- `background.js` 会校验消息来源，拒绝外部插件的注入请求
- 翻译请求限制单次最大 8000 字符

## 🛠️ 技术栈

- **Manifest V3** — Chrome/Edge 扩展最新规范
- **原生 JavaScript** — 零依赖，无需构建
- **Chrome Extension APIs** — `chrome.storage.local`、`chrome.runtime`

## 📝 更新日志

### v1.2.0
- 新增大模型翻译源（OpenAI 兼容接口）
- 浮窗内可直接切换翻译源
- 增强消息来源安全校验

### v1.1.0
- 新增百度翻译支持
- 浮窗可拖拽
- 支持 8 种目标语言

### v1.0.0
- 初始版本，选中即译 + MyMemory

## 📄 License

[MIT](LICENSE)
