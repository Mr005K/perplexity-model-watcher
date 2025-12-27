# 🔍 Perplexity Model Watcher

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.1-brightgreen.svg)](https://github.com/apix7/perplexity-model-watcher/releases)

> Brave/Chrome extension that shows Perplexity's `display_model` and `user_selected_model` in‑page and on the toolbar. 🟢 OK when equal, 🔴 on mismatch. Privacy‑friendly, minimal permissions.

---

## ✨ Features

- 🎯 Real‑time: watches fetch/XHR responses and extracts model fields
- 🖼️ Overlay: draggable/minimizable card with colored status chip
- 🟢/🔴 Badge: OK when display == user‑selected; ! on mismatch
- 🔐 Privacy‑first: no data collection, all local
- ⚡ Minimal permissions: `storage`, `tabs`, host = `https://*.perplexity.ai/*`

---

## 🚀 Install (Developer Mode)

1. Clone the repo (or download the zip and extract):
   ```bash
   git clone https://github.com/apix7/perplexity-model-watcher.git
   cd perplexity-model-watcher
   ```
2. Open the extensions page:
   - Brave: `brave://extensions`
   - Chrome: `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select this folder

---

## 💡 Userscript

Prefer a lightweight script manager instead of a browser extension? Import [`userscript.user.js`](userscript.user.js) into Tampermonkey, Violentmonkey, or a compatible userscript manager and enable it for `perplexity.ai`. The userscript injects the same in-page overlay and model matcher logic without needing extension permissions. Toolbar badges are extension-only, so the userscript focuses on the overlay experience.

---

## ⚙️ Options

- Toggle the in‑page overlay from the Options page.

---

## 🛡️ Privacy & Permissions

- No data is sent anywhere. See [PRIVACY.md](PRIVACY.md).
- Permissions:
  - `storage` — save overlay toggle
  - `tabs` — update toolbar badge
  - Host access: `https://*.perplexity.ai/*` only

---

## 🤝 Contributing

PRs welcome! Open an issue for ideas/bugs.

---

## 📄 License

MIT © 2025 Model Watcher contributors. See [LICENSE](LICENSE).
