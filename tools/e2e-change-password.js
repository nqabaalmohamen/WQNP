import fs from 'fs';
import http from 'http';
import { JSDOM } from 'jsdom';

const phone = '09990000';
const oldPass = '1';
const newPass = '11';

(async () => {
  const html = fs.readFileSync('./docs/index.html', 'utf8');
  // Remove all <script>...</script> blocks so we can create the DOM,
  // seed localStorage reliably, then re-insert and execute the scripts.
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const scripts = [];
  const htmlWithoutScripts = html.replace(scriptRegex, (m, attrs, content) => {
    scripts.push({ attrs: attrs || '', content: content || '' });
    return `<!-- script-removed -->`;
  });
  const errors = [];
  const logs = [];

  const dom = new JSDOM(htmlWithoutScripts, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
  // set the JSDOM base URL to the test server so relative URLs resolve to the correct port
  url: 'http://localhost:3333/',
    beforeParse(window) {
      // Provide a simple localStorage polyfill so page scripts can read/write during tests
      window.localStorage = new (class {
        constructor() { this._store = {}; }
        getItem(k) { return Object.prototype.hasOwnProperty.call(this._store, k) ? this._store[k] : null; }
        setItem(k, v) { this._store[k] = String(v); }
        removeItem(k) { delete this._store[k]; }
        clear() { this._store = {}; }
      })();
      try { window.navigator.onLine = true; } catch (e) {}
    }
  });

  // Start a tiny in-process HTTP server to handle /api requests locally.
  // This keeps network calls in-process and allows handlers to read/write the page's localStorage.
  const SERVER_PORT = 3333;
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const bodyRaw = Buffer.concat(chunks).toString() || '';
      let body = {};
      try { if (bodyRaw) body = JSON.parse(bodyRaw); } catch (e) { body = {}; }

      const send = (status, obj) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(obj));
      };

      try {
        // read db from the page localStorage
        const local = dom.window.localStorage.getItem('lawyer_app_db');
        let currentDb = local ? JSON.parse(local) : { version: 6, users: [] };

        if (req.url === '/api/auth/login') {
          const trimmedPhone = String(body.phone || '').trim();
          const trimmedPassword = String(body.password || '').trim();
          const user = (currentDb.users || []).find((u) => String(u.phone || '').trim() === trimmedPhone);
          if (user && String(user.password || '').trim() === trimmedPassword) {
            if (user.status === 'pending') return send(403, { error: 'حسابك قيد المراجعة حالياً' });
            if (user.status === 'suspended') return send(403, { error: 'هذا الحساب محظور' });
            return send(200, { user });
          }
          return send(401, { error: 'رقم الهاتف أو كلمة المرور غير صحيحة' });
        }

        if (req.url === '/api/auth/change-password') {
          const trimmedPhone = String(body.phone || '').trim();
          const trimmedOldPassword = String(body.oldPassword || '');
          const trimmedNewPassword = String(body.newPassword || '');
          const user = (currentDb.users || []).find((u) => String(u.phone || '').trim() === trimmedPhone);
          if (!user) return send(404, { error: 'المستخدم غير موجود' });
          if (String(user.password || '').trim() !== trimmedOldPassword) return send(400, { error: 'كلمة المرور القديمة غير صحيحة' });
          user.password = trimmedNewPassword;
          currentDb.updated_at = new Date().toISOString();
          dom.window.localStorage.setItem('lawyer_app_db', JSON.stringify(currentDb));
          return send(200, { message: 'تم تغيير كلمة المرور بنجاح ومزامنتها محلياً' });
        }

        // fallback
        send(404, { error: 'Not Found' });
      } catch (err) {
        send(500, { error: String(err) });
      }
    });
  });
  server.listen(SERVER_PORT);

  // helper to ensure a working localStorage API on the provided window
  function ensureLocalStorage(win) {
    const makePoly = () => ({
      _store: {},
      getItem(k) { return Object.prototype.hasOwnProperty.call(this._store, k) ? this._store[k] : null; },
      setItem(k, v) { this._store[k] = String(v); },
      removeItem(k) { delete this._store[k]; },
      clear() { this._store = {}; }
    });

    try {
      if (!win.localStorage || typeof win.localStorage.getItem !== 'function' || typeof win.localStorage.setItem !== 'function') {
        const poly = makePoly();
        try { Object.defineProperty(win, 'localStorage', { value: poly, configurable: true, writable: true }); }
        catch (e) { win.localStorage = poly; }
        return poly;
      }
      return win.localStorage;
    } catch (e) {
      // last resort
      const poly = makePoly();
      try { win.localStorage = poly; } catch (_) {}
      return poly;
    }
  }

  // Seed the DB now that we control the execution order
  try {
    const seed = { version: 6, users: [{ phone, password: oldPass, name: 'E2E Tester', status: 'approved', role: 'user', notifications: [] }], updated_at: new Date(Date.now() - 60000).toISOString() };
    const storage = ensureLocalStorage(dom.window);
    if (!storage || typeof storage.setItem !== 'function') console.log('Installed localStorage polyfill at seed time');
    // safe-set: try the API, fallback to raw _store
    try {
      if (typeof storage.setItem === 'function') storage.setItem('lawyer_app_db', JSON.stringify(seed));
      else if (storage && typeof storage === 'object') storage._store = storage._store || {}, storage._store['lawyer_app_db'] = JSON.stringify(seed);
      else dom.window.localStorage = ensureLocalStorage(dom.window), dom.window.localStorage.setItem('lawyer_app_db', JSON.stringify(seed));
      console.log('Seeded localStorage via harness');
    } catch (e) {
      // if a concurrent script replaced localStorage between our check and set, try to recover by re-installing
      const storage2 = ensureLocalStorage(dom.window);
      if (typeof storage2.setItem === 'function') storage2.setItem('lawyer_app_db', JSON.stringify(seed));
      else storage2._store = storage2._store || {}, storage2._store['lawyer_app_db'] = JSON.stringify(seed);
      console.log('Seeded localStorage via harness after recovery');
    }
  } catch (e) {
    console.error('Failed to seed localStorage after DOM creation', e);
    process.exit(2);
  }

  // Re-insert and execute the removed scripts so the app initializes with seeded data
  try {
    const doc = dom.window.document;
    scripts.forEach((s) => {
      const el = doc.createElement('script');
      // preserve attributes if necessary (basic handling)
      if (/src=/.test(s.attrs)) {
        // extract src value
        const m = s.attrs.match(/src=["']?([^"'\s>]+)/i);
        if (m && m[1]) {
          el.src = m[1];
        }
      }
      el.type = 'text/javascript';
      if (!el.src) el.textContent = s.content;
      doc.head.appendChild(el);
    });
  } catch (e) {
    console.error('Failed to re-insert scripts', e);
  }

  // ensure fetch is available on the page window (jsdom doesn't proxy Node's global fetch)
  try {
    const nodeFetch = (typeof globalThis.fetch === 'function') ? globalThis.fetch.bind(globalThis) : null;
    if (typeof dom.window.fetch !== 'function' && nodeFetch) {
      // wrap fetch so relative URLs are resolved against the JSDOM window location
      dom.window.fetch = async (input, init) => {
        let resolved = input;
        try {
          if (typeof input === 'string') {
            if (input.startsWith('/')) resolved = new URL(input, dom.window.location.href).href;
          } else if (input && typeof input === 'object' && typeof input.url === 'string') {
            // Request-like object (convert to absolute URL if needed)
            if (input.url.startsWith('/')) {
              const absolute = new URL(input.url, dom.window.location.href).href;
              // create a Node Request and delegate
              const reqInit = {
                method: input.method,
                headers: input.headers,
                body: input.body,
                redirect: input.redirect,
                signal: input.signal
              };
              return nodeFetch(absolute, reqInit);
            }
          }
          return nodeFetch(resolved, init);
        } catch (err) {
          throw err;
        }
      };
      if (globalThis.Headers) dom.window.Headers = globalThis.Headers;
      if (globalThis.Request) dom.window.Request = globalThis.Request;
      if (globalThis.Response) dom.window.Response = globalThis.Response;
    }
  } catch (e) {
    // ignore - we'll fail later with a clear error
  }

  dom.window.console.error = (...args) => {
    errors.push(args.map(String).join(' '));
    console.error('[page error]', ...args);
  };
  dom.window.console.warn = (...args) => { logs.push('[warn] ' + args.map(String).join(' ')); console.warn('[page warn]', ...args); };
  dom.window.console.log = (...args) => { logs.push('[log] ' + args.map(String).join(' ')); console.log('[page log]', ...args); };

  // wait for scripts to initialize
  await new Promise((r) => setTimeout(r, 2500));

  // ensure we have a writable DB and add test user
  try {
    const local = dom.window.localStorage.getItem('lawyer_app_db');
    let db = null;
    if (local) db = JSON.parse(local);
    if (!db) db = { version: 6, users: [] };

    // remove any existing test user
    db.users = (db.users || []).filter((u) => String(u.phone).trim() !== phone);
    // add test user with old password
    db.users.push({ phone, password: oldPass, name: 'E2E Tester', status: 'approved', role: 'user', notifications: [] });
    db.updated_at = new Date(Date.now() - 60000).toISOString(); // make it slightly older
    dom.window.localStorage.setItem('lawyer_app_db', JSON.stringify(db));
    console.log('Seeded localStorage test user');
  } catch (e) {
    console.error('Failed to seed localStorage', e);
    process.exit(2);
  }

  // helper to call the embedded mock endpoints
  async function callApi(path, body) {
    const res = await dom.window.fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    let parsed = null;
    try { parsed = await res.json(); } catch (e) { parsed = null; }
    return { status: res.status, ok: res.ok, body: parsed, success: res.status >= 200 && res.status < 300 };
  }

  // 1) confirm login with old password works
  const beforeLogin = await callApi('/api/auth/login', { phone, password: oldPass });
  console.log('Before change - login with old password response:', beforeLogin && beforeLogin.success ? 'success' : JSON.stringify(beforeLogin));

  // 2) change password
  const change = await callApi('/api/auth/change-password', { phone, oldPassword: oldPass, newPassword: newPass });
  console.log('Change password response:', change);

  // give scripts time to save
  await new Promise((r) => setTimeout(r, 500));

  // 3) attempt login with old password
  const oldTry = await callApi('/api/auth/login', { phone, password: oldPass });
  console.log('After change - login with OLD password response:', oldTry && oldTry.success ? 'success (FAIL)' : JSON.stringify(oldTry));

  // 4) attempt login with new password
  const newTry = await callApi('/api/auth/login', { phone, password: newPass });
  console.log('After change - login with NEW password response:', newTry && newTry.success ? 'success' : JSON.stringify(newTry));

  // final checks and exit
  const success = beforeLogin && beforeLogin.success && !(oldTry && oldTry.success) && (newTry && newTry.success);
  console.log('\n=== E2E Change-Password Summary ===');
  console.log('Initial login with old password worked:', !!(beforeLogin && beforeLogin.success));
  console.log('Old password rejected after change:', !(oldTry && oldTry.success));
  console.log('New password accepted after change:', !!(newTry && newTry.success));

  if (errors.length) {
    console.error('Page errors seen:', errors.slice(0,10));
  }

  process.exit(success ? 0 : 3);
})();
