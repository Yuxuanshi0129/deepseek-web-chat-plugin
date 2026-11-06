window.__ModuleLoader__.load({
  id: '@local/deepseek-web-chat',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const CHAT_URL = 'https://chat.deepseek.com';
    // The sidebar entry and its main panel must share this id: the shell's
    // sidebar row owns the click and calls layout.selectPanel(id). Registering
    // only the row (without a matching `main` entry) makes a click do nothing.
    const PANEL_ID = 'deepseek-web-chat';

    // In-code dictionaries keep the panel usable even when the host locale
    // service is absent; the service only supplies the live language.
    const EN = {
      launch: 'DeepSeek web chat',
      panelTitle: 'DeepSeek web chat',
      openInHarness: 'Show chat.deepseek.com inside Harness',
      openInHarnessHint: "Opens the official web chat in Harness's built-in browser tab. On the desktop app that tab is a native Electron webview, i.e. a top-level page, so DeepSeek's frame-ancestors 'none' does not block it. Sign in there and chat normally; your account and conversations stay on chat.deepseek.com.",
      externalTab: 'Open in a system browser tab',
      externalHint: 'Fallback for the plain Web GUI (no desktop webview) or when no session is open.',
      ok: 'Opened the built-in browser tab. If the right sidebar did not appear, expand it.',
      failMissing: 'Built-in browser unavailable (no active session, or you are on the plain Web GUI). Use the button below to open a system browser tab.',
      failGeneric: 'Could not open the built-in browser: {error}. Use the button below instead.',
      note: 'The chat itself runs on chat.deepseek.com; this plugin only opens it.',
    };
    const ZH = {
      launch: 'DeepSeek 网页版聊天',
      panelTitle: 'DeepSeek 网页版聊天',
      openInHarness: '在 Harness 内置浏览器里显示 chat.deepseek.com',
      openInHarnessHint: "会在 Harness 自带的内置浏览器标签中打开官方网页版。桌面版里该标签是 Electron 原生 webview（属于顶层页面，不是 iframe），因此不受 DeepSeek 的 frame-ancestors 'none' 限制。在里面登录即可正常对话，账号与对话记录仍保存在 chat.deepseek.com。",
      externalTab: '在系统浏览器新标签页打开',
      externalHint: '用于纯 Web 版 GUI（没有桌面 webview）或当前没有打开会话时的兜底。',
      ok: '已打开内置浏览器标签；若右侧栏没出现，请手动展开右侧栏。',
      failMissing: '内置浏览器不可用（当前没有活动会话，或你用的是纯 Web 版 GUI）。请点下方按钮在系统浏览器打开。',
      failGeneric: '打开内置浏览器失败：{error}。请改用下方按钮。',
      note: '对话实际运行在 chat.deepseek.com，本插件只负责把它显示出来。',
    };

    function activeLanguage(locale) {
      try {
        const snap = locale && typeof locale.getLocale === 'function' ? locale.getLocale() : null;
        const id = snap && (snap.id || snap.locale || snap.current);
        if (typeof id === 'string' && id) return id;
      } catch (e) { /* fall through */ }
      if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
      if (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang) {
        return document.documentElement.lang;
      }
      return 'en';
    }

    function useLocaleTick(locale, ctx) {
      const [, setTick] = React.useState(0);
      React.useEffect(() => {
        let dispose;
        try {
          if (locale && typeof locale.subscribe === 'function') {
            dispose = locale.subscribe(() => setTick((n) => n + 1));
          } else if (ctx && typeof ctx.on === 'function') {
            dispose = ctx.on('locale/change', () => setTick((n) => n + 1));
          }
        } catch (e) { /* keep the static dictionaries */ }
        return () => { if (typeof dispose === 'function') dispose(); };
      }, [locale, ctx]);
    }

    function makeTranslator(locale) {
      return (key) => {
        try {
          if (locale && typeof locale.bind === 'function') {
            const value = locale.bind('deepseekWebChat')(key);
            if (typeof value === 'string' && value && value !== key) return value;
          }
        } catch (e) { /* fall back to the in-code dictionaries */ }
        const zh = String(activeLanguage(locale)).toLowerCase().indexOf('zh') === 0;
        return (zh ? ZH : EN)[key] || EN[key] || key;
      };
    }

    // Open the real chat.deepseek.com *inside* Harness by reusing the shipped
    // sidebar browser. Official API (see ui-sidebar-browser README):
    //   ctx.sidebarRight.openTab('browser', { params: { url } })
    // On the Electron desktop app this mounts a native <webview> (a top-level
    // document), so frame-ancestors 'none' cannot block it. On the plain Web
    // GUI that tab falls back to an iframe and will be blank; we then fail over.
    //
    // Caveat (learned from the shipped source): SidebarRightController.require()
    // throws "sidebarRight: no session surface is mounted" unless a Conversation
    // session surface is on screen. While a custom global `main` panel is
    // selected, the rightbar is hidden and that surface is unmounted. Therefore
    // we first return to the Conversation, then defer the open by one macrotask
    // so React has committed the mounted surface before openTab() runs.
    // `sidebarRight` is fetched lazily (never a hard inject dependency) so a
    // missing/early service can never abort apply() or leave a dead button.
    function openInHarness(ctx) {
      let sr;
      try {
        sr = (typeof ctx.get === 'function' ? ctx.get('sidebarRight') : undefined) || ctx.sidebarRight;
      } catch (e) { sr = ctx.sidebarRight; }
      if (!sr || typeof sr.openTab !== 'function') return { ok: false, missing: true };
      try {
        const layout = (typeof ctx.get === 'function' ? ctx.get('layout') : undefined) || ctx.layout;
        if (layout && typeof layout.selectPanel === 'function') layout.selectPanel(null);
      } catch (e) { /* non-fatal: still attempt the open below */ }
      setTimeout(() => {
        try {
          sr.openTab('browser', { params: { url: CHAT_URL } });
        } catch (e) {
          try { console.warn('deepseek-web-chat: openTab failed', e); } catch (e2) { /* ignore */ }
        }
      }, 60);
      return { ok: true };
    }

    function openExternal() {
      try {
        // A real anchor click is used by the link below; this is only the
        // programmatic fallback for the footer button.
        const a = document.createElement('a');
        a.href = CHAT_URL;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (e) {
        try { window.open(CHAT_URL, '_blank', 'noopener,noreferrer'); } catch (e2) { /* give up quietly */ }
      }
    }

    function ChatGlyph({ size }) {
      const s = typeof size === 'number' ? size : 18;
      return h('svg', {
        viewBox: '0 0 24 24', width: s, height: s, 'aria-hidden': true,
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
        strokeLinecap: 'round', strokeLinejoin: 'round',
        style: { display: 'block' },
      },
        h('path', { d: 'M20 11.5a7.5 7.5 0 0 1-7.5 7.5H9l-4 3v-3.6A7.5 7.5 0 0 1 12 4h.5A7.5 7.5 0 0 1 20 11.5z' }),
        h('circle', { cx: 9, cy: 11.5, r: 0.9, fill: 'currentColor', stroke: 'none' }),
        h('circle', { cx: 12.5, cy: 11.5, r: 0.9, fill: 'currentColor', stroke: 'none' }),
        h('circle', { cx: 16, cy: 11.5, r: 0.9, fill: 'currentColor', stroke: 'none' }),
      );
    }

    // Primary call-to-action: a full-width button that opens the built-in tab.
    function PrimaryButton({ label, onClick }) {
      return h('button', {
        type: 'button', onClick,
        style: {
          display: 'block', width: '100%', boxSizing: 'border-box',
          padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
          font: 'inherit', fontSize: 13, fontWeight: 600, textAlign: 'center',
          color: 'var(--dsw-alias-label-primary)',
          background: 'var(--dsw-alias-brand-primary)',
          border: '1px solid var(--dsw-alias-brand-primary)',
        },
      }, label);
    }

    function OpenTabLink({ tr }) {
      return h('a', {
        href: CHAT_URL, target: '_blank', rel: 'noopener noreferrer',
        style: {
          display: 'block', width: '100%', boxSizing: 'border-box',
          padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
          font: 'inherit', fontSize: 12, textAlign: 'center',
          textDecoration: 'none',
          color: 'var(--dsw-alias-label-primary)',
          background: 'var(--dsw-alias-bg-layer-2)',
          border: '1px solid var(--dsw-alias-border-l1)',
        },
      }, tr('externalTab'));
    }

    const hintStyle = { fontSize: 12, lineHeight: 1.6, color: 'var(--dsw-alias-label-secondary)' };
    const dividerStyle = { borderTop: '1px solid var(--dsw-alias-border-l1)', margin: '2px 0' };

    function ChatBody({ ctx, tr }) {
      const [message, setMessage] = React.useState(null);
      const onOpen = () => {
        const r = openInHarness(ctx);
        if (r.ok) {
          setMessage({ tone: 'ok', text: tr('ok') });
        } else if (r.missing) {
          setMessage({ tone: 'warn', text: tr('failMissing') });
        } else {
          setMessage({ tone: 'warn', text: tr('failGeneric').replace('{error}', r.error || 'unknown') });
        }
      };
      return h('div', {
        style: { display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 },
      },
        h(PrimaryButton, { label: tr('openInHarness'), onClick: onOpen }),
        h('div', { style: hintStyle }, tr('openInHarnessHint')),
        message
          ? h('div', {
              style: {
                fontSize: 12, lineHeight: 1.6, padding: '8px 10px', borderRadius: 8,
                color: message.tone === 'ok'
                  ? 'var(--dsw-alias-state-success, var(--dsw-alias-label-primary))'
                  : 'var(--dsw-alias-state-warning, var(--dsw-alias-label-primary))',
                background: 'var(--dsw-alias-bg-layer-2)',
                border: '1px solid var(--dsw-alias-border-l1)',
              },
            }, message.text)
          : null,
        h('div', { style: dividerStyle }),
        h(OpenTabLink, { tr }),
        h('div', { style: hintStyle }, tr('externalHint')),
      );
    }

    function MainPanel({ locale, ctx, tr }) {
      useLocaleTick(locale, ctx);
      return h('div', {
        style: {
          width: '100%', height: '100%', boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column',
          padding: '20px 24px', gap: 14,
          background: 'var(--dsw-alias-bg-base)',
          font: '13px/1.5 system-ui, -apple-system, Segoe UI, sans-serif',
          color: 'var(--dsw-alias-label-primary)',
          overflow: 'auto',
        },
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' } },
          h(ChatGlyph, { size: 20 }),
          h('span', { style: { fontWeight: 600, fontSize: 15, flex: 1 } }, tr('panelTitle')),
        ),
        h('div', {
          style: {
            display: 'flex', flexDirection: 'column', gap: 12, flex: '0 1 auto',
            padding: 16, boxSizing: 'border-box',
            background: 'var(--dsw-alias-bg-layer-1)',
            border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 12,
            maxWidth: 720, width: '100%',
          },
        }, h(ChatBody, { ctx, tr })),
        h('div', { style: Object.assign({}, hintStyle, { flex: '0 0 auto' }) }, tr('note')),
      );
    }

    // Secondary one-click entry. This slot is rendered by the shell via
    // renderSlot("sidebar.footer.action", { wide }); the component owns its
    // click. It opens the built-in tab directly and falls back to a system
    // browser tab if that ever fails, so a click can never be a no-op.
    function FooterLauncher({ ctx, tr, wide }) {
      return h('button', {
        type: 'button', title: tr('launch'), 'aria-label': tr('launch'),
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!openInHarness(ctx).ok) openExternal();
        },
        style: {
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          minWidth: 30, height: 30, padding: wide ? '0 8px' : 0, borderRadius: 8, cursor: 'pointer',
          font: 'inherit', fontSize: 12,
          color: 'var(--dsw-alias-label-secondary)',
          background: 'transparent', border: '1px solid transparent',
        },
      },
        h(ChatGlyph, { size: 18 }),
        wide ? h('span', { style: { whiteSpace: 'nowrap' } }, 'DeepSeek') : null,
      );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        // A throwing ctx.get must never abort the whole apply: without these
        // registrations neither the icon nor the panel appear at all.
        let locale;
        try {
          locale = (typeof ctx.get === 'function' ? ctx.get('locale') : undefined) || ctx.locale;
        } catch (e) {
          locale = ctx.locale;
        }
        const tr = makeTranslator(locale);

        // The panel-list row is icon-only: the shell owns its click and selects
        // the `main` entry whose key equals this row's id.
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist', id: PANEL_ID, order: 50,
          label: 'DeepSeek web chat',
        }, () => h(ChatGlyph, { size: 18 })));

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main', key: PANEL_ID,
        }, () => h(MainPanel, { locale, ctx, tr })));

        ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
          name: 'sidebar.footer.action', id: 'deepseek-web-chat-overlay-launcher', order: 90,
          label: 'DeepSeek web chat',
        }, (owner) => h(FooterLauncher, {
          ctx, tr,
          wide: Boolean(owner && (owner.wide === true || owner.wide === 'true')),
        })));
      },
    };
  },
});
