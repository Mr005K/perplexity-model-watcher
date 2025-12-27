// ==UserScript==
// @name         Perplexity Model Watcher (Userscript)
// @namespace    https://github.com/apix7/perplexity-model-watcher
// @version      0.1.1
// @description  Show Perplexity's display_model and user_selected_model in-page overlay.
// @match        https://www.perplexity.ai/*
// @match        https://labs.perplexity.ai/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  if (window.top !== window) return;
  if (window.__perplexityModelWatcherUserscriptLoaded) return;
  window.__perplexityModelWatcherUserscriptLoaded = true;

  const STATE = { lastKey: '', showOverlay: true };
  const WIDGET_ID = '__model_watcher_widget__';
  const STORE_KEY = 'mw_overlay:' + location.origin;

  function deepFindModels(obj) {
    const found = {};
    function walk(v) {
      if (!v || typeof v !== 'object') return;
      if (typeof v.display_model === 'string' && !found.display_model) {
        found.display_model = v.display_model;
      }
      if (typeof v.user_selected_model === 'string' && !found.user_selected_model) {
        found.user_selected_model = v.user_selected_model;
      }
      if (found.display_model && found.user_selected_model) return;
      for (const key in v) {
        if (Object.prototype.hasOwnProperty.call(v, key)) {
          walk(v[key]);
          if (found.display_model && found.user_selected_model) return;
        }
      }
    }
    walk(obj);
    return found;
  }

  function extractModelsFromText(text) {
    if (!text || (!text.includes('display_model') && !text.includes('user_selected_model'))) {
      return null;
    }
    try {
      const json = JSON.parse(text);
      const f = deepFindModels(json);
      if (f.display_model || f.user_selected_model) return f;
    } catch (err) {
      // ignore parse errors, fallback to regex
    }
    const dm = /"display_model"\s*:\s*"([^"]+)"/.exec(text);
    const us = /"user_selected_model"\s*:\s*"([^"]+)"/.exec(text);
    if (dm || us) {
      return {
        display_model: dm && dm[1],
        user_selected_model: us && us[1],
      };
    }
    return null;
  }

  function injectStyles() {
    if (document.getElementById('mw-card-style')) return;
    const st = document.createElement('style');
    st.id = 'mw-card-style';
    st.textContent = `
      .mw-card{position:fixed;top:8px;right:8px;z-index:2147483647;background:#0b1220cc;color:#e5e7eb;font:12px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;border:1px solid #334155;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.35);backdrop-filter:blur(4px)}
      .mw-card *{box-sizing:border-box}
      .mw-header{display:flex;align-items:center;gap:8px;padding:6px 8px;cursor:move;user-select:none}
      .mw-title{font-weight:600;letter-spacing:.2px}
      .mw-chip{font-weight:700;font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid transparent}
      .mw-chip-ok{background:#052e1a;color:#34d399;border-color:#065f46}
      .mw-chip-eq{background:#06223f;color:#60a5fa;border-color:#1d4ed8}
      .mw-chip-bad{background:#3f0610;color:#f87171;border-color:#b91c1c}
      .mw-chip-wait{background:#1f2937;color:#cbd5e1;border-color:#334155}
      .mw-body{padding:6px 10px 10px 10px}
      .mw-row{display:flex;align-items:center;gap:8px;margin:4px 0}
      .mw-key{min-width:72px;color:#93a6bf}
      .mw-val{font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;color:#e5e7eb}
      .mw-btn{all:unset;cursor:pointer;color:#9ca3af;padding:2px 6px;border-radius:6px}
      .mw-btn:hover{background:#111827}
      .mw-min .mw-body{display:none}
    `;
    (document.head || document.documentElement).appendChild(st);
  }

  function readSavedOverlay() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function saveOverlayState(el) {
    const rect = el.getBoundingClientRect();
    const minimized = el.classList.contains('mw-min');
    const pos = {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      minimized,
    };
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(pos));
    } catch (err) {
      // ignore
    }
  }

  function applySavedState(el) {
    const st = readSavedOverlay();
    if (!st) return;
    if (typeof st.top === 'number') {
      el.style.top = Math.max(0, st.top) + 'px';
    }
    if (typeof st.left === 'number') {
      el.style.left = Math.max(0, st.left) + 'px';
      el.style.right = 'auto';
    }
    if (st.minimized) el.classList.add('mw-min');
  }

  function makeDraggable(el, handle) {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let origTop = 0;
    let origLeft = 0;

    handle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const r = el.getBoundingClientRect();
      origTop = r.top + window.scrollY;
      origLeft = r.left + window.scrollX;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      el.style.top = Math.max(0, origTop + dy) + 'px';
      el.style.left = Math.max(0, origLeft + dx) + 'px';
      el.style.right = 'auto';
    });

    window.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        saveOverlayState(el);
      }
    });
  }

  function ensureWidget() {
    if (!STATE.showOverlay) return null;
    let el = document.getElementById(WIDGET_ID);
    if (el) return el;
    injectStyles();
    el = document.createElement('div');
    el.id = WIDGET_ID;
    el.className = 'mw-card';
    el.innerHTML = `
      <div class="mw-header" id="mw-h">
        <span class="mw-title">Model Watcher</span>
        <span class="mw-chip mw-chip-wait" id="mw-status">WAIT</span>
        <span style="flex:1"></span>
        <button class="mw-btn" id="mw-min" title="Minimize">—</button>
      </div>
      <div class="mw-body" id="mw-b">
        <div class="mw-row"><span class="mw-key">Display</span><span class="mw-val" id="mw-display">—</span></div>
        <div class="mw-row"><span class="mw-key">Selected</span><span class="mw-val" id="mw-selected">—</span></div>
      </div>`;
    document.documentElement.appendChild(el);

    const header = el.querySelector('#mw-h');
    const minBtn = el.querySelector('#mw-min');
    if (header) makeDraggable(el, header);
    if (minBtn) {
      minBtn.addEventListener('click', () => {
        el.classList.toggle('mw-min');
        saveOverlayState(el);
      });
    }
    applySavedState(el);
    return el;
  }

  function setWidget(display, selected, matches) {
    const el = ensureWidget();
    if (!el) return;
    const status = el.querySelector('#mw-status');
    const dispEl = el.querySelector('#mw-display');
    const selEl = el.querySelector('#mw-selected');

    let cls = 'mw-chip-bad';
    let label = 'MISMATCH';
    if (matches) {
      cls = 'mw-chip-ok';
      label = 'OK';
    } else if (!display && !selected) {
      cls = 'mw-chip-wait';
      label = 'WAIT';
    }

    if (status) {
      status.className = 'mw-chip ' + cls;
      status.textContent = label;
    }
    if (dispEl) dispEl.textContent = display || '—';
    if (selEl) selEl.textContent = selected || '—';

    saveOverlayState(el);
  }

  function setWaiting() {
    setWidget('', '', false);
  }

  function handleModels(models) {
    if (!models) return;
    const key = `${location.href}|${models.display_model || ''}|${models.user_selected_model || ''}`;
    if (key === STATE.lastKey) return;
    STATE.lastKey = key;
    const { display_model, user_selected_model } = models;
    const matches = !!display_model && !!user_selected_model && display_model === user_selected_model;
    setWidget(display_model, user_selected_model, matches);
  }

  function handleText(text) {
    const models = extractModelsFromText(text);
    if (models) handleModels(models);
  }

  function listenFromPage() {
    window.addEventListener('message', (ev) => {
      if (ev.source !== window) return;
      const d = ev.data;
      if (!d || d.__mw !== true) return;
      if (d.type === 'MODEL_TEXT') {
        handleText(d.text);
      } else if (d.type === 'URL_CHANGE') {
        STATE.lastKey = '';
        setWaiting();
      }
    });
  }

  function pageProbe() {
    if (window.__mwProbeInstalled) return;
    window.__mwProbeInstalled = true;

    function postText(text) {
      try {
        window.postMessage({ __mw: true, type: 'MODEL_TEXT', text }, '*');
      } catch (err) {
        // ignore
      }
    }

    function hookFetch() {
      const orig = window.fetch;
      if (!orig) return;
      window.fetch = function (...args) {
        return orig.apply(this, args).then((res) => {
          try {
            const clone = res.clone();
            clone
              .text()
              .then(postText)
              .catch(() => {});
          } catch (err) {
            // ignore clone errors
          }
          return res;
        });
      };
    }

    function hookXHR() {
      const XHR = window.XMLHttpRequest;
      if (!XHR) return;
      const send = XHR.prototype.send;
      XHR.prototype.send = function () {
        this.addEventListener('load', function () {
          try {
            if (this && typeof this.responseText === 'string') {
              postText(this.responseText);
            }
          } catch (err) {
            // ignore
          }
        });
        return send.apply(this, arguments);
      };
    }

    function notifyURL() {
      try {
        window.postMessage({ __mw: true, type: 'URL_CHANGE', href: location.href }, '*');
      } catch (err) {
        // ignore
      }
    }

    function hookHistory() {
      try {
        const H = window.history;
        const origPush = H.pushState;
        const origReplace = H.replaceState;
        H.pushState = function () {
          const r = origPush.apply(this, arguments);
          setTimeout(notifyURL, 0);
          return r;
        };
        H.replaceState = function () {
          const r = origReplace.apply(this, arguments);
          setTimeout(notifyURL, 0);
          return r;
        };
        window.addEventListener('popstate', notifyURL);
        window.addEventListener('load', notifyURL);
      } catch (err) {
        // ignore
      }
    }

    try {
      hookFetch();
      hookXHR();
      hookHistory();
    } catch (err) {
      // ignore
    }
  }

  function injectProbe() {
    const script = document.createElement('script');
    script.textContent = `(${pageProbe.toString()})();`;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  listenFromPage();
  injectProbe();
  setWaiting();
})();
