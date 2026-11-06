# DeepSeek Web Chat for DeepSeek Harness

A [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness) **client UI plugin** that brings the full, official [`chat.deepseek.com`](https://chat.deepseek.com) web chat into Harness.

It adds a sidebar icon + global panel with two actions:

- **Show chat.deepseek.com inside Harness** — opens the real web chat in Harness's built-in browser tab (a native Electron `<webview>` on the desktop app).
- **Open in a system browser tab** — a reliable fallback for the plain Web GUI or when no session is open.

> The chat itself runs on `chat.deepseek.com`. This plugin only opens/displays it; it does not proxy, wrap, or store any conversation, and it is **not** a model provider.

---

## Why not an `<iframe>`?

`chat.deepseek.com` sends `content-security-policy: frame-ancestors 'none'`, so any iframe/embedded frame is blocked by the browser and renders blank. A plugin cannot bypass that.

Harness's shipped **sidebar browser** (`@deepseek-ai/dsh-client-ui-sidebar-browser`) solves this on the desktop app: it mounts a native Electron `<webview>`, which is an independent guest / top-level document — not a nested frame — so `frame-ancestors` does not apply and the complete page renders normally.

This plugin calls the documented API:

```js
ctx.sidebarRight.openTab('browser', { params: { url: 'https://chat.deepseek.com' } })
```

---

## Requirements & limitations

| Environment | Built-in browser tab | Result |
| --- | --- | --- |
| **Electron desktop app** (recommended) | native `<webview>` (top-level page) | ✅ Full web chat displays inside Harness |
| **Plain Web GUI** (`http://127.0.0.1:…`) | falls back to an `<iframe>` | ⚠️ Blank due to CSP → use the system-browser fallback |

- The built-in browser uses its **own isolated session / partition**. It does **not** share cookies with your system browser, so you must sign in to DeepSeek once inside the Harness tab.
- The plugin registers a global `main` panel. Because `sidebarRight.openTab()` requires a mounted Conversation session surface (which is hidden while a custom global panel is selected), the plugin first returns to the Conversation via `layout.selectPanel(null)` and then opens the tab on the next tick.

---

## Install

This is a **Cordis bundle**. Install it from a local clone (the supported path):

```bash
git clone https://github.com/Yuxuanshi0129/deepseek-web-chat-plugin.git
```

Then, in DeepSeek Harness, install the bundle from the cloned directory, e.g. via the plugin manager:

```
plugin_manager install_bundle <path-to>/deepseek-web-chat-plugin
```

Or from a Harness session with the plugin tooling exposed, point `install_bundle` at the directory. After installing, **reload/refresh the Harness window** so the client module is picked up.

Verify: the plugin appears as `@local/deepseek-web-chat`, enabled and `active`.

### Use

1. Click the chat-bubble icon in the sidebar → opens the **DeepSeek web chat** panel.
2. Click **「在 Harness 内置浏览器里显示 chat.deepseek.com」** / *Show chat.deepseek.com inside Harness*. The right sidebar opens a built-in browser tab with the full page. Sign in and chat normally.
   - With the sidebar expanded, the footer **「DeepSeek」** button does the same in one click.
3. If the right sidebar doesn't appear, expand it manually; on the plain Web GUI use **「在系统浏览器新标签页打开」** / *Open in a system browser tab*.

---

## Uninstall

```
plugin_manager remove_bundle @local/deepseek-web-chat
```

---

## How it is wired

- `cordis.patch.yml` — inserts the bundle entry (`id: deepseek-web-chat`, `name: @local/deepseek-web-chat`).
- `index.js` — empty Host half; rendering lives entirely in the Client module.
- `client.js` — `window.__ModuleLoader__.load(...)` module. React comes from `require('react')`; the UI registers into three slots:
  - `sidebar.panellist` (`id = deepseek-web-chat`) — icon-only row; the shell owns its click and selects the matching `main` entry.
  - `main` (`key = deepseek-web-chat`) — the panel paired with that row.
  - `sidebar.footer.action` — one-click footer launcher (component-owned click, never a no-op).
  - The style uses only `--dsw-alias-*` theme tokens; no Harness Client packages are imported.
- `package.json` — `dsh.bundle.patch`, `dsh.client` (`platform: web`, `immediately: true`, `inject: ["@deepseek-ai/dsh-client-ui-conversation"]`), `exports` and `files`.
- `locale/en.json`, `locale/zh.json` — display metadata (title/description).
- `icon.svg` — original chat-bubble glyph.

`inject` is kept to the single verified module ID so a missing/unverified dependency cannot abort `apply()` (which would leave no icon/panel at all). `locale` and `sidebarRight` are looked up lazily with `try/catch` at runtime.

---

## History / design notes

- v1 initially attempted an optional iframe view; that was removed because of the `frame-ancestors 'none'` CSP.
- A "click does nothing" bug was fixed by pairing the `sidebar.panellist` row with a `main` panel of the **same id** (the shell's row click calls `layout.selectPanel(id)` and throws if no matching `main` entry exists).
- The `sidebarRight.openTab()` "no session surface is mounted" error is avoided by returning to the Conversation before opening the tab.

---

## License

[MIT](LICENSE)
