// 簽到站、收款共用程式：<body data-mode="checkin"> 或 "pay"
(function () {
  var W = WCEC, t = W.t, esc = W.esc;
  var app = document.getElementById('app');
  var key = W.store('wcec_station_key') || '';
  var view = key ? 'home' : 'locked';
  var digits = '', families = [], fam = null, picked = {}, done = null, err = '', busy = false, via = 'phone';
  var PAGE = document.body.getAttribute('data-mode') === 'pay' ? 'pay' : 'checkin';   // checkin.html／pay.html
  var mode = PAGE, pay = null, payForm = { item: '奉獻', kid: '', amount: '', method: '', check: '', note: '' };
  var idleTimer = null, countdown = 0, cdTimer = null, scanner = null;
  // 名單快取：解鎖後先下載今年的家庭和孩子，輸入末四碼時直接在這台裝置上找，不用等網路
  // 名單：存在這台簽到裝置上（只有孩子姓名、班別、末四碼），打開就能查；背景再跟後端更新
  var roster = null, rosterAt = 0, showCode = false, others = [], notFound = null, rosterReq = null, reqId = 0;
  function useRoster(r, at) {
    roster = r.families || []; others = r.others || []; showCode = !!r.showCode; rosterAt = at || Date.now();
  }
  function saveRoster(r) {
    // 保險：已經有名單時，後端回傳空名單就不要覆蓋（避免名單突然變成 0 個家庭）
    if (roster && roster.length && !(r.families && r.families.length)) return;
    useRoster(r);
    W.store('wcec_roster', JSON.stringify({ at: rosterAt, families: roster, others: others, showCode: showCode }));
    if (view === 'home') render();
  }
  function forgetRoster() { roster = null; others = []; rosterAt = 0; W.forget('wcec_roster'); }
  if (key) { try { var saved = JSON.parse(W.store('wcec_roster') || 'null'); if (saved && saved.families) useRoster(saved, saved.at); } catch (e) {} }
  function loadRoster() {
    if (!key) return Promise.resolve(null);
    if (rosterReq) return rosterReq;
    rosterReq = W.call('roster', { key: key }).then(function (r) {
      rosterReq = null;
      if (r.ok) saveRoster(r);
      else if (r.error === 'bad_key' || r.error === 'not_configured') handleErr(r);
      return r;
    });
    return rosterReq;
  }
  loadRoster();
  setInterval(loadRoster, 2 * 60 * 1000);   // 每 2 分鐘更新一次（新報名的孩子、別台簽到的紀錄）
  document.addEventListener('visibilitychange', function () { if (!document.hidden && Date.now() - rosterAt > 60000) loadRoster(); });

  function go(v) { view = v; err = ''; render(); }
  function reset() { mode = PAGE; pay = null; notFound = null; digits = ''; families = []; fam = null; picked = {}; done = null; stopScan(); go(key ? 'home' : 'locked'); }

  // 沒人操作 60 秒就回首頁，避免下一位看到上一家的孩子
  function touch() {
    clearTimeout(idleTimer);
    if (view === 'families' || view === 'kids' || view === 'scan') idleTimer = setTimeout(reset, 60000);
    if (view === 'pay' || (view === 'home' && mode === 'pay')) idleTimer = setTimeout(reset, 3 * 60000);   // 收款畫面 3 分鐘沒動作也回到簽到
  }
  document.addEventListener('pointerdown', touch);

  function today() {
    return new Date().toLocaleDateString(W.lang() === 'en' ? 'en-US' : 'zh-TW', { month: 'long', day: 'numeric', weekday: 'long' });
  }

  function render() {
    document.getElementById('lang').textContent = t('lang_btn');
    document.getElementById('staff').textContent = view === 'locked' ? '' : t('ci_staff');
    var title = t(PAGE === 'pay' ? 'pay_title' : 'ci_title');
    document.title = title + ' | WCEC';
    try { if (window.WCECApp && window.WCECApp.postMessage) window.WCECApp.postMessage(JSON.stringify({ type: 'title', title: title })); } catch (e) {}
    var h = '<header class="top center" style="justify-content:center"><div><h1>' + title + '</h1><p class="today">' + esc(today()) + '</p></div></header>';
    if (W.DEMO) h += '<div class="demo">' + t('demo') + (view === 'locked' ? '（密碼 123456）' : '') + '</div>';
    if (err) h += '<div class="banner err" role="alert">' + esc(err) + '</div>';
    h += views[view]();
    padState = null;
    app.innerHTML = h;
    (binds[view] || function () {})();
    touch();
  }

  function pinBoxes(n, masked) {
    var s = '<div class="pin" aria-label="' + esc(digits) + '">';
    for (var i = 0; i < n; i++) s += '<span class="' + (i < digits.length ? 'on' : '') + '">' + (i < digits.length ? (masked ? '•' : esc(digits[i])) : '') + '</span>';
    return s + '</div>';
  }
  function pad() {
    var k = ['1','2','3','4','5','6','7','8','9','clr','0','del'];
    return '<div class="pad">' + k.map(function (x) {
      if (x === 'clr') return '<button type="button" class="fn" data-k="clr">' + t('ci_clear') + '</button>';
      if (x === 'del') return '<button type="button" class="fn" data-k="del" aria-label="delete">⌫</button>';
      return '<button type="button" data-k="' + x + '">' + x + '</button>';
    }).join('') + '</div>';
  }
  // 數字鍵：手指一碰到就算（pointerdown），不用等放開；而且只更新上面的四個格子，
  // 不整頁重畫——整頁重畫會把按鈕換成新的，快速連按時下一下就會漏掉。
  var padState = null;   // { max, onFull }，目前畫面有數字鍵時才有
  function bindPad(max, onFull) { padState = { max: max, onFull: onFull }; }
  function updatePins() {
    var pin = app.querySelector('.pin');
    if (!pin) return;
    var n = pin.children.length;
    pin.setAttribute('aria-label', digits);
    for (var i = 0; i < n; i++) {
      var c = pin.children[i];
      c.className = i < digits.length ? 'on' : '';
      c.textContent = i < digits.length ? digits[i] : '';
    }
  }
  app.addEventListener('pointerdown', function (e) {
    var b = e.target.closest && e.target.closest('[data-k]');
    if (!b || !padState || busy) return;
    e.preventDefault();   // 不要觸發點兩下放大、也不要再送一次 click
    b.classList.add('press'); setTimeout(function () { b.classList.remove('press'); }, 120);
    var k = b.getAttribute('data-k'), max = padState.max;
    if (k === 'clr') digits = ''; else if (k === 'del') digits = digits.slice(0, -1);
    else if (digits.length < max) digits += k;
    if (err || notFound) { err = ''; notFound = null; render(); } else updatePins();
    if (digits.length === max && padState.onFull) padState.onFull();
  });

  var views = {
    locked: function () {
      return '<section class="card center"><h2>' + t('ci_lock_title') + '</h2><p>' + t('ci_lock_hint') + '</p>' +
        '<input type="password" id="pw" autocomplete="off" style="max-width:360px;text-align:center;font-size:28px">' +
        '<div class="actions"><button class="btn" id="unlock"' + (busy ? ' disabled' : '') + '>' + (busy ? t('ci_checking') : t('ci_unlock')) + '</button></div></section>';
    },
    home: function () {
      var nf = notFound ? '<div class="nf" role="alert"><b>' + esc(t(notFound.enrolled ? 'ci_nf_title' : 'ci_ne_title', { n: notFound.n || 'QR' })) + '</b>' +
        '<p>' + esc(t(notFound.enrolled ? 'ci_nf_body' : 'ci_ne_body')) + '</p></div>' : '';
      var st = '<p class="rstat">' + (roster ? '✓ ' + esc(t('ci_roster_ok', { n: roster.length })) : '<span class="spinner sm"></span> ' + esc(t('ci_roster_wait'))) + '</p>';
      return '<section class="center">' + nf + '<h2>' + t('ci_enter') + '</h2>' + pinBoxes(4) +
        (busy ? '<div class="searching"><span class="spinner"></span> ' + esc(t('ci_searching')) + ' <button type="button" class="btn ghost small" id="cancelq">' + t('ci_cancel') + '</button></div>' : '') +
        '<div class="' + (busy ? 'dim' : '') + '">' + pad() + '</div>' +
        '<div class="actions"><button class="btn ghost" id="scan"' + (busy ? ' disabled' : '') + '>📷 ' + t('ci_scan') + '</button></div>' + st + '</section>';
    },
    scan: function () {
      return '<section class="center"><h2>' + t('ci_scan') + '</h2><p>' + t('ci_scan_hint') + '</p><div id="reader"></div>' +
        '<div class="actions"><button class="btn ghost" id="back">' + t('ci_back') + '</button></div></section>';
    },
    families: function () {
      return '<section><h2 class="center">' + t('ci_pick_family') + '</h2>' + families.map(function (f, i) {
        return '<button class="choice" data-f="' + i + '"><b>' + f.kids.map(function (k) { return esc(k.name); }).join('、') + '</b>' +
          '<div class="who">' + esc(f.label) + '</div></button>';
      }).join('') + '<div class="actions"><button class="btn ghost" id="back">' + t('ci_back') + '</button></div></section>';
    },
    pay: function () {
      if (!pay) return '<section class="center"><p><span class="spinner"></span> ' + t('pay_loading') + '</p></section>';
      var ld = pay.loading, wait = '<span class="spinner sm"></span>';
      var d = 0, u = 0;
      pay.records.forEach(function (r) { if (r.item === '制服') u += r.amount; else d += r.amount; });
      var fm = payForm, uniKids = pay.kids.filter(function (k) { return k.uniform; });
      var h = '<section class="paybox"><h2>' + esc(pay.family) + '</h2>' +
        '<p class="meta">' + pay.kids.map(function (k) { return esc(k.name) + ' · ' + esc(k.cls) + (k.uniform ? '（' + t('pay_uniform') + ' $' + k.uniform + '）' : ''); }).join('<br>') + '</p>' +
        '<div class="stats"><div><span>' + t('pay_sug') + '</span><b>' + (ld ? wait : '$' + pay.suggested) + '</b></div><div><span>' + t('pay_got_d') + '</span><b>' + (ld ? wait : '$' + d) + '</b></div><div><span>' + t('pay_got_u') + '</span><b>' + (ld ? wait : '$' + u) + '</b></div></div>' +
        '<h3>' + t('pay_new_h') + '</h3>' +
        '<label class="f">' + t('pay_item') + '</label><div class="seg sm"><button type="button" data-item="奉獻" class="' + (fm.item === '奉獻' ? 'on' : '') + '">' + t('pay_donation') + '</button>' +
        '<button type="button" data-item="制服" class="' + (fm.item === '制服' ? 'on' : '') + '"' + (uniKids.length ? '' : ' disabled') + '>' + t('pay_uniform') + '</button></div>' +
        (fm.item === '制服' ? '<label class="f" for="pkid">' + t('pay_kid') + '</label><select id="pkid">' + uniKids.map(function (k) {
          return '<option value="' + esc(k.name) + '"' + (fm.kid === k.name ? ' selected' : '') + '>' + esc(k.name) + ' · ' + esc(k.cls) + ' $' + k.uniform + '</option>'; }).join('') + '</select>' : '') +
        '<label class="f" for="pamt">' + t('pay_amount') + '</label><input type="text" inputmode="decimal" id="pamt" value="' + esc(fm.amount) + '">' +
        '<label class="f">' + t('pay_method') + '</label><div class="seg sm"><button type="button" data-method="支票" class="' + (fm.method === '支票' ? 'on' : '') + '">' + t('pay_check') + '</button>' +
        '<button type="button" data-method="現金" class="' + (fm.method === '現金' ? 'on' : '') + '">' + t('pay_cash') + '</button></div>' +
        (fm.method === '支票' ? '<label class="f" for="pchk">' + t('pay_checkno') + '</label><input type="text" inputmode="numeric" id="pchk" value="' + esc(fm.check) + '">' : '') +
        '<label class="f" for="pstaff">' + t('pay_staff') + '</label><input type="text" id="pstaff" value="' + esc(W.store('wcec_staff_name') || '') + '">' +
        '<label class="f" for="pnote">' + t('pay_note') + '</label><input type="text" id="pnote" value="' + esc(fm.note) + '">' +
        '<div class="actions"><button class="btn ghost" id="back">' + t('ci_back') + '</button><button class="btn" id="psave"' + (busy ? ' disabled' : '') + '>' + (busy ? t('sending') : t('pay_save')) + '</button></div>' +
        '<h3>' + t('pay_rec_h') + '</h3>' + (ld ? '<p class="meta">' + wait + ' ' + t('pay_loading') + '</p>' : pay.records.length ? '<ul class="recs">' + pay.records.map(function (r) {
          return '<li><b>$' + r.amount + '</b> ' + esc(r.item === '制服' ? t('pay_uniform') + (r.kid ? '（' + r.kid + '）' : '') : t('pay_donation')) +
            ' · ' + esc(r.method === '支票' ? t('pay_check') + (r.check ? ' #' + r.check : '') : r.method === '現金' ? t('pay_cash') : r.method) +
            '<span class="meta"> · ' + esc(r.staff || '') + ' · ' + esc(r.at || '') + '</span></li>'; }).join('') + '</ul>' : '<p class="meta">' + t('pay_none') + '</p>') +
        '</section>';
      return h;
    },
    kids: function () {
      var n = Object.keys(picked).filter(function (k) { return picked[k]; }).length;
      return '<section><h2 class="center">' + t('ci_pick_kids') + '</h2>' + fam.kids.map(function (k) {
        var on = !!picked[k.cid];
        return '<button class="kidbtn' + (on ? ' on' : '') + '" data-c="' + esc(k.cid) + '"' + (k.checkedIn ? ' disabled' : '') + ' aria-pressed="' + on + '">' +
          '<span class="box">' + (on || k.checkedIn ? '✓' : '') + '</span><span><div class="nm">' + esc(k.name) +
          (k.enName ? ' <span class="meta">' + esc(k.enName) + '</span>' : '') + '</div>' +
          '<div class="meta">' + esc(k.cls || '') + (k.checkedIn ? ' · ' + t('ci_already') : '') + '</div></span></button>';
      }).join('') + '<div class="actions"><button class="btn ghost" id="back">' + t('ci_back') + '</button>' +
        '<button class="btn" id="go"' + (n && !busy ? '' : ' disabled') + '>' + t('ci_go') + (n ? '（' + n + '）' : '') + '</button></div></section>';
    },
    done: function () {
      return '<section class="card center"><div style="font-size:64px" aria-hidden="true">✅</div><h2>' + t('ci_done') + '</h2>' +
        '<ul class="kids-done">' + done.kids.map(function (k) { return '<li><b>' + esc(k.name) + '</b>' + (k.cls ? ' · ' + esc(k.cls) : '') + '</li>'; }).join('') + '</ul>' +
        (done.code ? '<p style="margin:18px 0 0">' + t('ci_code') + '</p><div class="code">' + esc(done.code) + '</div><p class="hint">' + t('ci_code_hint') + '</p>'
          : done.pending && showCode ? '<p style="margin:18px 0 0">' + t('ci_code') + '</p><div class="code"><span class="spinner"></span></div>' : '') +
        '<div class="actions"><button class="btn" id="fin">' + t('ci_finish') + '</button></div><p class="hint">' + t('ci_auto', { s: countdown }) + '</p></section>';
    },
  };

  var binds = {
    locked: function () {
      var pw = document.getElementById('pw');
      var tryUnlock = function () {
        if (!pw.value) return;
        busy = true; var v = pw.value; render();
        W.call('unlock', { key: v }).then(function (r) {
          busy = false;
          if (r.ok) { key = v; W.store('wcec_station_key', v); if (r.families) saveRoster(r); else loadRoster(); go('home'); }
          else { err = t('ci_' + r.error) || t('e_network'); render(); }
        });
      };
      document.getElementById('unlock').onclick = tryUnlock;
      pw.onkeydown = function (e) { if (e.key === 'Enter') tryUnlock(); };
      pw.focus();
    },
    home: function () {
      bindPad(4, function () { via = 'phone'; lookup({ last4: digits }); });
      document.getElementById('scan').onclick = function () { go('scan'); startScan(); };
      var cq = document.getElementById('cancelq');
      if (cq) cq.onclick = function () { reqId++; busy = false; digits = ''; render(); };
    },
    scan: function () { document.getElementById('back').onclick = reset; },
    families: function () {
      app.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { pickFamily(families[+b.getAttribute('data-f')]); }; });
      document.getElementById('back').onclick = reset;
    },
    pay: function () {
      if (!pay) return;
      var keep = keepPayInputs;   // 重畫前把輸入框的內容存起來
      app.querySelectorAll('[data-item]').forEach(function (b) {
        b.onclick = function () {
          keep(); payForm.item = b.getAttribute('data-item');
          if (payForm.item === '制服') { var uk = pay.kids.filter(function (k) { return k.uniform; })[0]; if (uk) { payForm.kid = payForm.kid || uk.name; payForm.amount = String(uk.uniform); } }
          else payForm.amount = String(pay.suggested || '');
          render();
        };
      });
      app.querySelectorAll('[data-method]').forEach(function (b) { b.onclick = function () { keep(); payForm.method = b.getAttribute('data-method'); render(); }; });
      var ks = document.getElementById('pkid');
      if (ks) ks.onchange = function () { var k = pay.kids.filter(function (x) { return x.name === ks.value; })[0]; keep(); if (k) payForm.amount = String(k.uniform); render(); };
      document.getElementById('back').onclick = function () { pay = null; go('home'); };
      document.getElementById('psave').onclick = function () {
        keep();
        var staff = W.store('wcec_staff_name') || '', amt = Number(payForm.amount);
        if (!(amt > 0) || !payForm.method || !staff) { err = t('pay_err'); render(); return; }
        busy = true; render();
        W.call('payAdd', { key: key, fid: pay.fid, item: payForm.item, kid: payForm.item === '制服' ? payForm.kid : '', amount: amt,
          method: payForm.method, check: payForm.check, staff: staff, note: payForm.note }).then(function (r) {
          busy = false;
          if (!r.ok) { if (r.error === 'bad_key' || r.error === 'not_configured') return handleErr(r); err = W.errText(r.error); render(); return; }
          pay = r; payCache[r.fid] = { at: Date.now(), data: r }; W.toast(t('pay_saved', { a: amt }));
          payForm = { item: '奉獻', kid: '', amount: '', method: '', check: '', note: '' };
          render();
        });
      };
    },
    kids: function () {
      app.querySelectorAll('[data-c]').forEach(function (b) {
        b.onclick = function () { var c = b.getAttribute('data-c'); picked[c] = !picked[c]; render(); };
      });
      document.getElementById('back').onclick = function () { families.length > 1 ? go('families') : reset(); };
      document.getElementById('go').onclick = checkin;
    },
    done: function () { document.getElementById('fin').onclick = finish; },
  };

  function handleErr(r) {
    if (r.error === 'bad_key' || r.error === 'not_configured') { key = ''; W.forget('wcec_station_key'); forgetRoster(); view = 'locked'; }
    err = t('ci_' + r.error) || t('e_network');
    render();
  }

  function localFind(q) {
    return roster.filter(function (f) { return q.qr ? f.qr && f.qr === String(q.qr).trim() : f.last4 === q.last4; })
      .map(function (f) { return { fid: f.fid, label: f.label, kids: f.kids.map(function (k) { return Object.assign({}, k); }) }; });
  }
  function showFamilies(q) {
    if (!families.length) { if (q.qr) err = t('ci_none'); else notFound = { n: q.last4, enrolled: others.indexOf(q.last4) < 0 }; view = 'home'; render(); return; }
    if (families.length === 1) pickFamily(families[0]); else go('families');
  }
  function lookup(q) {
    digits = '';
    // 1. 這台裝置上有名單：直接找，立刻出結果（找不到就直接說找不到，背景更新名單，剛報名的家庭再輸入一次就有）
    if (roster && roster.length) {
      families = localFind(q);
      if (!families.length && Date.now() - rosterAt > 60000) loadRoster();
      return showFamilies(q);
    }
    // 2. 名單正在下載：等它下載完再找，不另外查詢
    if (rosterReq) {
      var my = ++reqId;
      busy = true; render();
      rosterReq.then(function () {
        if (my !== reqId) return;   // 已經按了取消
        busy = false;
        if (roster && roster.length) { families = localFind(q); showFamilies(q); } else serverLookup(q);
      });
      return;
    }
    serverLookup(q);
  }
  function serverLookup(q) {
    var my = ++reqId;
    busy = true; render();
    W.call('lookup', Object.assign({ key: key }, q)).then(function (r) {
      if (my !== reqId) return;   // 已經按了取消
      busy = false; digits = '';
      if (!r.ok && r.error === 'not_enrolled') { notFound = { n: q.last4 || 'QR', enrolled: false }; view = 'home'; render(); return; }
      if (!r.ok) return handleErr(r);
      families = r.families;
      if (!families.length) { if (q.qr) err = t('ci_none'); else notFound = { n: q.last4, enrolled: true }; view = 'home'; render(); return; }
      if (families.length === 1) pickFamily(families[0]); else go('families');
    });
  }

  // 收款：先用這台裝置上的名單立刻顯示家庭和孩子，同工可以馬上開始填；
  // 建議奉獻、制服金額和收款紀錄在背景讀取，讀到就補上（讀過的家庭暫存 5 分鐘，再開是立刻顯示）
  var payCache = {};
  function openPay(f) {
    payForm = { item: '奉獻', kid: '', amount: '', method: '', check: '', note: '' };
    var hit = payCache[f.fid];
    if (hit) { pay = hit.data; payForm.amount = String(pay.suggested || ''); }
    else pay = { fid: f.fid, family: f.label, kids: f.kids.map(function (k) { return { name: k.name, cls: k.cls, uniform: 0 }; }), records: [], suggested: '', loading: true };
    go('pay');
    if (hit && Date.now() - hit.at < 5 * 60000) return;
    W.call('payInfo', { key: key, fid: f.fid }).then(function (r) {
      if (!r.ok) {
        if (view !== 'pay' || !pay || pay.fid !== f.fid) return;
        if (r.error === 'bad_key' || r.error === 'not_configured') return handleErr(r);
        err = W.errText(r.error); render(); return;
      }
      payCache[f.fid] = { at: Date.now(), data: r };
      if (view !== 'pay' || !pay || pay.fid !== f.fid) return;
      keepPayInputs();
      if (!payForm.amount) payForm.amount = String(r.suggested || '');   // 同工還沒自己填金額，才帶入建議奉獻
      pay = r; render();
    });
  }
  // 背景資料回來重畫前，先把同工已經打的字存起來
  function keepPayInputs() {
    var a = document.getElementById('pamt'), c = document.getElementById('pchk'), n = document.getElementById('pnote'), k = document.getElementById('pkid'), st = document.getElementById('pstaff');
    if (a) payForm.amount = a.value; if (c) payForm.check = c.value; if (n) payForm.note = n.value; if (k) payForm.kid = k.value;
    if (st && st.value.trim()) W.store('wcec_staff_name', st.value.trim());
  }

  function pickFamily(f) {
    if (mode === 'pay') return openPay(f);
    fam = f; picked = {};
    f.kids.forEach(function (k) { if (!k.checkedIn) picked[k.cid] = true; });   // 預設全選還沒簽到的孩子
    go('kids');
  }

  function checkin() {
    var cids = Object.keys(picked).filter(function (k) { return picked[k]; });
    // 先顯示「簽到完成」，同時在背景寫進試算表；萬一失敗再回到選孩子的畫面請同工重按
    var f = fam, chosen = f.kids.filter(function (k) { return picked[k.cid]; });
    done = { kids: chosen.map(function (k) { return { name: k.name, cls: k.cls }; }), code: null, pending: true };
    countdown = 20; go('done');
    clearInterval(cdTimer);
    cdTimer = setInterval(function () { countdown--; if (countdown <= 0) finish(); else if (view === 'done') render(); }, 1000);
    W.call('checkin', { key: key, fid: f.fid, cids: cids, via: via }).then(function (r) {
      if (!r.ok) {
        clearInterval(cdTimer);
        if (r.error === 'bad_key' || r.error === 'not_configured') return handleErr(r);
        fam = f; done = null; view = 'kids'; err = t('ci_failed'); render(); return;
      }
      // 名單快取裡標成已簽到
      (roster || []).forEach(function (rf) { if (rf.fid === f.fid) rf.kids.forEach(function (k) { if (cids.indexOf(k.cid) >= 0) k.checkedIn = true; }); });
      if (done && done.pending) { done.pending = false; done.code = r.code; if (view === 'done') render(); }
    });
  }
  function finish() { clearInterval(cdTimer); reset(); }

  // ─── 掃描家庭 QR 卡 ───
  function startScan() {
    W.loadScript('https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js').then(function () {
      if (view !== 'scan') return;
      scanner = new Html5Qrcode('reader');
      return scanner.start({ facingMode: W.EMBED ? 'environment' : 'user' }, { fps: 10, qrbox: 260 }, function (text) {
        stopScan(); via = 'qr'; lookup({ qr: text });
      });
    }).catch(function () { err = t('ci_cam_err'); if (view === 'scan') render(); });
  }
  function stopScan() { if (scanner) { try { scanner.stop(); } catch (e) {} scanner = null; } }

  document.getElementById('lang').onclick = function () { W.setLang(W.lang() === 'en' ? 'zh' : 'en'); render(); };
  document.getElementById('staff').onclick = function () {
    if (view === 'locked') return;
    // App 裡不能用 prompt()/confirm()，改用網頁自己的對話框
    W.dialog({
      title: t('ci_relock'),
      body: '<p>' + t('ci_relock_body') + '</p><input type="password" id="relockpw" autocomplete="off" style="text-align:center;font-size:24px"><p class="msg" id="relockerr" style="display:none"></p>',
      actions: [
        { label: t('ci_relock'), onClick: function (close, el) {
          var v = el.querySelector('#relockpw').value;
          if (v !== key) { var m = el.querySelector('#relockerr'); m.textContent = t('ci_wrong_pw'); m.style.display = 'block'; return true; }
          close(); key = ''; W.forget('wcec_station_key'); forgetRoster(); reset();
        } },
        { label: t('ci_cancel'), kind: 'ghost' },
      ],
    });
  };

  render();
})();
