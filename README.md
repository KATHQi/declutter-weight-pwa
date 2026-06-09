# Home Weight Ledger

一个极简的 iPhone 自用 PWA，用于记录：

- 带回家的物品重量
- 离开家的物品重量
- 今日净减少
- 累计净减少

它不需要服务器数据库。网页文件可以放在 GitHub Pages / Netlify / Vercel / Cloudflare Pages，真实数据保存在 iPhone 本机浏览器的 IndexedDB 中。

## 文件结构

```text
declutter-weight-pwa/
├── index.html
├── style.css
├── app.js
├── manifest.json
├── sw.js
├── icon-192.png
└── icon-512.png
```

## 本地测试

在 VS Code 中安装 Live Server 插件，然后：

1. 打开本文件夹
2. 右键 `index.html`
3. 选择 `Open with Live Server`

注意：Service Worker 通常需要 HTTPS 或 localhost。本地电脑浏览器可以正常测试；手机通过局域网 HTTP 访问时，离线缓存可能不会启用。

## 部署建议

推荐部署到以下任一静态托管平台：

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages

部署后，用 iPhone Safari 打开你的 HTTPS 地址：

1. 点击 Safari 的分享按钮
2. 选择“添加到主屏幕”
3. 从主屏幕打开

## 存储说明

数据保存在 IndexedDB 中。

请注意：

- 不要清理 Safari 网站数据
- 不要频繁更换域名
- 不要用无痕模式
- 添加到主屏幕后，尽量从主屏幕打开
- 如果手机存储压力极大，浏览器理论上可能清理非持久化网站数据

应用内的“检查存储”按钮会尝试请求 persistent storage。是否被授予取决于浏览器策略。

## 设计原则

这是一个 mass flow ledger，而不是 inventory management system。

记录的核心不是“我拥有什么”，而是：

```text
净减少 = 离开家的重量 - 带回家的重量
```

长期来看，你只需要看累计净减少是否在变大。
