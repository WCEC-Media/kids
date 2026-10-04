/*
 * 示範模式專用：在瀏覽器裡模擬 Google 試算表、Apps Script 和寄信，
 * 直接執行「真正的」後端程式（demo/Code.gs，跟 apps-script/Code.gs 是同一份）。
 * 資料存在這台電腦瀏覽器的 localStorage，正式上線後用不到這個資料夾。
 */
(function () {
  var KEY = 'wcec_demo_gas_v2';
  var here = document.currentScript ? document.currentScript.src : location.href;
  var CODE_URL = new URL('Code.gs', here).href;
  var WEB_BASE = new URL('../', here).href;
  var state = null, api = null, loading = null;

  // ── 存取 ──
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw, function (k, v) { return v && v.__d ? new Date(v.__d) : v; });
    } catch (e) {}
    return null;
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state, function (k, v) {
        var raw = this[k];
        return raw instanceof Date ? { __d: raw.toISOString() } : v;
      }));
    } catch (e) {}
  }

  // ── 模擬 SpreadsheetApp ──
  function Range(rows, r, c, nr, nc) {
    function ensure(i) { while (rows.length < i) rows.push([]); }
    return {
      setValue: function (v) { ensure(r); rows[r - 1][c - 1] = v; return this; },
      setValues: function (vals) {
        for (var i = 0; i < vals.length; i++) { ensure(r + i); for (var j = 0; j < vals[i].length; j++) rows[r - 1 + i][c - 1 + j] = vals[i][j]; }
        return this;
      },
      setFontWeight: function () { return this; },
      setNumberFormat: function () { return this; },
    };
  }
  function Sheet(name) {
    var rows = state.sheets[name];
    return {
      getName: function () { return name; },
      getLastRow: function () { return rows.length; },
      appendRow: function (a) { rows.push(a.slice()); return this; },
      setFrozenRows: function () {},
      getDataRange: function () {
        var w = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
        return { getValues: function () {
          return rows.map(function (r) { var o = r.slice(); while (o.length < w) o.push(''); return o.map(function (v) { return v == null ? '' : v; }); });
        } };
      },
      getRange: function (a, b, c, d) {
        if (typeof a === 'string') return Range(rows, 1, 1, 1, 1);
        return Range(rows, a, b, c || 1, d || 1);
      },
    };
  }
  var ss = {
    getSheetByName: function (n) { return state.sheets[n] ? Sheet(n) : null; },
    insertSheet: function (n) { state.sheets[n] = []; state.order.push(n); return Sheet(n); },
  };
  window.SpreadsheetApp = {
    getActive: function () { return ss; },
    getUi: function () {
      return { alert: function (m) { console.log('[試算表提示]', m); },
               createMenu: function () { return { addItem: function () { return this; }, addToUi: function () {} }; } };
    },
  };

  // ── 模擬 CacheService / LockService / MailApp ──
  window.CacheService = { getScriptCache: function () { return {
    get: function (k) { var e = state.cache[k]; return e && e.exp > Date.now() ? e.v : null; },
    put: function (k, v, s) { state.cache[k] = { v: String(v), exp: Date.now() + (s || 600) * 1000 }; },
    remove: function (k) { delete state.cache[k]; },
  }; } };
  window.LockService = { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } };
  window.MailApp = { sendEmail: function (o) {
    state.outbox.unshift({ to: o.to, subject: o.subject, html: o.htmlBody || '', text: o.body || '', time: new Date() });
  } };

  // ── 模擬 Utilities ──
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function sha256(bytes) {
    var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var l = bytes.length, m = bytes.slice(); m.push(0x80);
    while ((m.length % 64) !== 56) m.push(0);
    var bits = l * 8; for (var i = 7; i >= 0; i--) m.push(i > 3 ? 0 : (bits >>> (i * 8)) & 255);
    var w = new Array(64);
    for (var o = 0; o < m.length; o += 64) {
      for (i = 0; i < 16; i++) w[i] = (m[o + i * 4] << 24) | (m[o + i * 4 + 1] << 16) | (m[o + i * 4 + 2] << 8) | m[o + i * 4 + 3];
      for (i = 16; i < 64; i++) {
        var s0 = ((w[i-15] >>> 7) | (w[i-15] << 25)) ^ ((w[i-15] >>> 18) | (w[i-15] << 14)) ^ (w[i-15] >>> 3);
        var s1 = ((w[i-2] >>> 17) | (w[i-2] << 15)) ^ ((w[i-2] >>> 19) | (w[i-2] << 13)) ^ (w[i-2] >>> 10);
        w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var out = []; H.forEach(function (x) { out.push((x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255); });
    return out;
  }
  window.Utilities = {
    DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' },
    getUuid: function () {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
    },
    computeDigest: function (alg, s) { return sha256(Array.from(new TextEncoder().encode(String(s)))); },
    base64EncodeWebSafe: function (bytes) {
      return btoa(String.fromCharCode.apply(null, bytes.map(function (b) { return b & 255; }))).replace(/\+/g, '-').replace(/\//g, '_');
    },
    formatDate: function (d, tz, fmt) {
      d = d instanceof Date ? d : new Date(d);
      return fmt.replace(/yyyy|yy|MM|M|dd|d|HH|mm/g, function (t) {
        return { yyyy: d.getFullYear(), yy: String(d.getFullYear()).slice(2), MM: pad(d.getMonth() + 1), M: d.getMonth() + 1,
                 dd: pad(d.getDate()), d: d.getDate(), HH: pad(d.getHours()), mm: pad(d.getMinutes()) }[t];
      });
    },
  };

  // ── 示範用的初始資料 ──
  function seed() {
    state = { sheets: {}, order: [], cache: {}, outbox: [] };
    api.setup();
    var set = state.sheets['設定'];
    set.forEach(function (r) {
      if (r[0] === '簽到站密碼') r[1] = '123456';
      if (r[0] === '網站網址') r[1] = WEB_BASE;
    });
    var now = new Date();
    var F = state.sheets['家庭'], K = state.sheets['孩子'];
    F.push(['F1', now, '陳大明', '3025551234', '1234', 'chen.daming@gmail.com', '', '陳奶奶', '3025550001', '', 'WCECF-DEMO1', '']);
    F.push(['F2', now, '林美華', '6105559876', '9876', 'meihua.lin@yahoo.com', '', '林爺爺', '6105550002', '', 'WCECF-DEMO2', '']);
    F.push(['F3', now, 'David Lee', '4845551234', '1234', 'davidlee@outlook.com', '', 'Grace Lee', '4845550003', '', 'WCECF-DEMO3', '']);
    K.push(['C1', 'F1', '2026-27', '陳小安', 'Annie', '1', 'Sparks', '', now, '有效', '']);
    K.push(['C2', 'F1', '2026-27', '陳小樂', 'Leo', '4', 'T&T', '花生過敏', now, '有效', '']);
    K.push(['C3', 'F2', '2026-27', '林以恩', 'Grace', '3歲', 'Cubbies', '', now, '有效', '']);
    K.push(['C4', 'F3', '2025-26', 'Ethan Lee', '', '7', 'Trek', '', now, '有效', '']);
    save();
  }

  function ready() {
    if (api) return Promise.resolve();
    if (!loading) {
      loading = fetch(CODE_URL).then(function (r) { return r.text(); }).then(function (src) {
        api = new Function(src + '\n;return { handle_: handle_, setup: setup, HEADERS: HEADERS };')();
      });
    }
    return loading;
  }

  window.WCEC_DEMO = {
    call: function (req) {
      return ready().then(function () {
        state = load();
        if (!state) seed();
        var res = api.handle_(JSON.parse(JSON.stringify(req)));
        save();
        return JSON.parse(JSON.stringify(res));   // 跟真的網路回應一樣，日期會變成文字
      });
    },
    snapshot: function () { return ready().then(function () { state = load(); if (!state) seed(); return state; }); },
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} state = null; return this.snapshot(); },
  };
})();
