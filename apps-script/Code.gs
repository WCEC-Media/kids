/**
 * WCEC 兒童事工：Awana 報名、家長專區、簽到 後端（Google Apps Script）
 *
 * 放在「兒童事工」那一份獨立的試算表裡（不要放在 App 公告用的試算表）。
 * 第一次使用：重新整理試算表 → 上方選單「兒童事工」→「初始設定」。
 * 部署：部署 → 新增部署作業 → 網頁應用程式
 *       執行身分：我（教會帳號）   存取權：所有人
 *
 * 前端呼叫方式：POST，Content-Type: text/plain，內容是 JSON：{ action, ... }
 */

// ───────────────────────── 工作表名稱與欄位 ─────────────────────────
var SHEET = {
  SETTINGS: '設定',
  CLASSES: '班別',
  FAMILIES: '家庭',
  KIDS: '孩子',
  LOG: '簽到紀錄',
  SESSIONS: '登入裝置',
};

var HEADERS = {
  '設定': ['項目', '值', '說明'],
  '班別': ['年級', '班別'],
  '家庭': ['家庭編號', '建立時間', '家長姓名', '手機', '手機末四碼', 'Email', '其他家長Email',
           '緊急聯絡人', '緊急聯絡人電話', '授權接送人', 'QR代碼', '備註'],
  '孩子': ['孩子編號', '家庭編號', '學年', '姓名', '英文名', '年級', '班別',
           '過敏/特殊需求', '報名時間', '狀態', '家長手機（手動輸入用）'],
  '簽到紀錄': ['日期', '孩子編號', '孩子姓名', '班別', '家庭編號', '簽到時間',
             '簽到方式', '接送碼', '簽退時間', '簽退同工'],
  '登入裝置': ['建立時間', '家庭編號', 'Email', '權杖雜湊', '最後使用', '裝置', '狀態'],
};

var DEFAULT_SETTINGS = [
  ['學年', '2026-27', '報名和簽到都只看這個學年的孩子'],
  ['開放報名', 'TRUE', 'FALSE = 報名表顯示「目前沒有開放報名」'],
  ['簽到站密碼', '', '前台 iPad 解鎖用，請改成只有同工知道的密碼（至少 6 碼）'],
  ['顯示接送碼', 'TRUE', '簽到完成後是否顯示接送碼'],
  ['寄確認信', 'TRUE', '報名成功後寄確認信給家長'],
  ['網站網址', 'https://wcec-media.github.io/kids/', '報名表、家長專區所在的網址，登入信的按鈕會連到這裡'],
  ['登入保持天數', '365', '家長多久沒打開家長專區，就要重新用 Email 確認'],
  ['時區', 'America/New_York', ''],
];

var DEFAULT_CLASSES = [
  ['2歲', 'Puggles'], ['3歲', 'Cubbies'], ['4歲 (PreK)', 'Cubbies'],
  ['K', 'Sparks'], ['1', 'Sparks'], ['2', 'Sparks'],
  ['3', 'T&T'], ['4', 'T&T'], ['5', 'T&T'], ['6', 'T&T'],
  ['7', 'Trek'], ['8', 'Trek'],
];

// ───────────────────────── 選單與初始設定 ─────────────────────────
function onOpen() {
  SpreadsheetApp.getUi().createMenu('兒童事工')
    .addItem('初始設定（只需執行一次）', 'setup')
    .addItem('補齊手動輸入的家庭資料', 'fillMissing')
    .addToUi();
}

function setup() {
  var ss = SpreadsheetApp.getActive();
  Object.keys(HEADERS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(HEADERS[name]);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, HEADERS[name].length).setFontWeight('bold');
    }
  });
  var st = ss.getSheetByName(SHEET.SETTINGS);
  if (st.getLastRow() === 1) st.getRange(2, 1, DEFAULT_SETTINGS.length, 3).setValues(DEFAULT_SETTINGS);
  var cl = ss.getSheetByName(SHEET.CLASSES);
  if (cl.getLastRow() === 1) cl.getRange(2, 1, DEFAULT_CLASSES.length, 2).setValues(DEFAULT_CLASSES);
  // 電話、末四碼、年級存成文字，避免開頭的 0 被吃掉
  ss.getSheetByName(SHEET.FAMILIES).getRange('D:E').setNumberFormat('@');
  ss.getSheetByName(SHEET.FAMILIES).getRange('I:I').setNumberFormat('@');
  ss.getSheetByName(SHEET.KIDS).getRange('F:F').setNumberFormat('@');
  ss.getSheetByName(SHEET.KIDS).getRange('K:K').setNumberFormat('@');
  SpreadsheetApp.getUi().alert('設定完成。請到「設定」工作表填入簽到站密碼和網站網址。');
}

/**
 * 同工手動輸入現有家庭後執行：
 *  家庭：只要填 家長姓名、手機、Email（其他可留空）→ 自動補 家庭編號、末四碼、QR代碼、建立時間
 *  孩子：填 姓名、年級，以及「家長手機（手動輸入用）」→ 自動對到家庭、補 孩子編號、學年、班別、狀態
 */
function fillMissing() {
  var s = settings_();
  var now = new Date();
  var famSheet = SpreadsheetApp.getActive().getSheetByName(SHEET.FAMILIES);
  var fams = rows_(SHEET.FAMILIES);
  var filledF = 0, filledK = 0, problems = [];
  fams.forEach(function (f) {
    var changed = false;
    if (!f['家庭編號']) { f['家庭編號'] = newFamilyId_(s); changed = true; }
    if (!f['建立時間']) { f['建立時間'] = now; changed = true; }
    var ph = digits_(f['手機']);
    if (ph && String(f['手機末四碼']) !== ph.slice(-4)) { f['手機末四碼'] = ph.slice(-4); changed = true; }
    if (!f['QR代碼']) { f['QR代碼'] = newQr_(); changed = true; }
    if (!f['Email']) problems.push('家庭「' + f['家長姓名'] + '」沒有 Email，家長將無法登入家長專區');
    if (changed) { writeRow_(famSheet, SHEET.FAMILIES, f); filledF++; }
  });
  var byPhone = {};
  fams.forEach(function (f) { byPhone[digits_(f['手機'])] = f['家庭編號']; });
  var gradeMap = gradeMap_();
  var kidSheet = SpreadsheetApp.getActive().getSheetByName(SHEET.KIDS);
  rows_(SHEET.KIDS).forEach(function (k) {
    var changed = false;
    if (!k['家庭編號']) {
      var fid = byPhone[digits_(k['家長手機（手動輸入用）'])];
      if (fid) { k['家庭編號'] = fid; changed = true; }
      else problems.push('孩子「' + k['姓名'] + '」找不到家庭，請確認「家長手機（手動輸入用）」');
    }
    if (!k['孩子編號']) { k['孩子編號'] = 'C' + rand_(8, '0123456789'); changed = true; }
    if (!k['學年']) { k['學年'] = s['學年']; changed = true; }
    if (!k['班別'] && gradeMap[String(k['年級'])]) { k['班別'] = gradeMap[String(k['年級'])]; changed = true; }
    if (!k['報名時間']) { k['報名時間'] = now; changed = true; }
    if (!k['狀態']) { k['狀態'] = '有效'; changed = true; }
    if (changed) { writeRow_(kidSheet, SHEET.KIDS, k); filledK++; }
  });
  SpreadsheetApp.getUi().alert('補齊了 ' + filledF + ' 個家庭、' + filledK + ' 個孩子。' +
    (problems.length ? '\n\n需要注意：\n' + problems.join('\n') : ''));
}

// ───────────────────────── 入口 ─────────────────────────
function doGet() {
  return json_(handle_({ action: 'config' }));
}

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); }
  catch (err) { return json_({ ok: false, error: 'bad_request' }); }
  return json_(handle_(req));
}

function handle_(req) {
  try {
    switch (req.action) {
      // 公開
      case 'config':       return config_();
      case 'precheck':     return precheck_(req);
      case 'register':     return register_(req);
      // 家長登入
      case 'loginStart':   return loginStart_(req);
      case 'loginPeek':    return loginPeek_(req);
      case 'loginApprove': return loginApprove_(req);
      case 'loginPoll':    return loginPoll_(req);
      case 'loginCode':    return loginCode_(req);
      // 家長專區（需要登入）
      case 'me':           return me_(req);
      case 'saveFamily':   return saveFamily_(req);
      case 'saveKid':      return saveKid_(req);
      case 'invite':       return invite_(req);
      case 'removeParent': return removeParent_(req);
      case 'logout':       return logout_(req);
      // 前台簽到站（需要簽到站密碼）
      case 'unlock':       return unlock_(req);
      case 'lookup':       return lookup_(req);
      case 'checkin':      return checkin_(req);
      default:             return { ok: false, error: 'unknown_action' };
    }
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'server_error' };
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ───────────────────────── 公開：表單設定 ─────────────────────────
function config_() {
  var s = settings_();
  return { ok: true, year: s['學年'], open: isTrue_(s['開放報名']), grades: grades_() };
}

// ───────────────────────── 公開：送出前檢查是不是已經登記過 ─────────────────────────
/**
 * strong   ：Email 或手機跟現有家庭相同 → 一定是同一家，不建立新家庭
 * possible ：家長姓名或孩子姓名相同 → 請家長確認是不是自己
 * 回傳的 Email 一律遮住（ch***@gmail.com），不會洩漏完整資料
 */
function precheck_(req) {
  var cache = CacheService.getScriptCache();
  if (!bump_(cache, 'pre:all', 300, 3600)) return { ok: false, error: 'too_many' };
  var m = findMatches_(req.parent || {}, req.kids || []);
  if (m.strong) return { ok: true, match: 'strong', reason: m.strong.reason, candidates: [cand_(m.strong.f, m.strong.reason, cache)] };
  return {
    ok: true,
    match: m.weak.length ? 'possible' : 'none',
    candidates: m.weak.slice(0, 3).map(function (w) { return cand_(w.f, w.reason, cache); }),
  };
}

function findMatches_(p, kids) {
  var email = lc_(p.email), phone = digits_(p.phone), pname = normName_(p.name);
  var kidNames = kids.map(function (k) { return normName_(typeof k === 'string' ? k : k.name); }).filter(String);
  var kidsByFam = {};
  rows_(SHEET.KIDS).forEach(function (k) {
    (kidsByFam[k['家庭編號']] = kidsByFam[k['家庭編號']] || []).push(normName_(k['姓名']));
  });
  var strong = null, weak = [];
  rows_(SHEET.FAMILIES).forEach(function (f) {
    if (email && familyEmails_(f).indexOf(email) >= 0) { if (!strong) strong = { f: f, reason: 'email' }; return; }
    if (phone.length >= 10 && digits_(f['手機']) === phone) { if (!strong) strong = { f: f, reason: 'phone' }; return; }
    var why = [];
    if (pname && normName_(f['家長姓名']) === pname) why.push('parent');
    var kn = kidsByFam[f['家庭編號']] || [];
    if (kidNames.some(function (n) { return kn.indexOf(n) >= 0; })) why.push('kid');
    if (why.length) weak.push({ f: f, reason: why.join('+') });
  });
  weak.sort(function (a, b) { return b.reason.length - a.reason.length; });   // 家長＋孩子都同名的排前面
  return { strong: strong, weak: weak };
}

// 給前端一個短期有效的代號，代表「這個家庭」，前端拿不到家庭編號和完整 Email
function cand_(f, reason, cache) {
  var ref = uuid_();
  cache.put('ref:' + ref, f['家庭編號'], 1800);
  return { ref: ref, masked: maskEmail_(f['Email']), parent: maskName_(f['家長姓名']), reason: reason };
}

// ───────────────────────── 公開：家長報名 ─────────────────────────
function register_(req) {
  var s = settings_();
  if (!isTrue_(s['開放報名'])) return { ok: false, error: 'closed' };
  if (req.website) return { ok: true, dup: false, kids: [] };      // 機器人陷阱欄位，假裝成功

  var p = req.parent || {};
  var phone = digits_(p.phone);
  var kids = (req.kids || []).filter(function (k) { return k && clean_(k.name); });
  if (!clean_(p.name) || phone.length < 10 || !/^\S+@\S+\.\S+$/.test(p.email || '') ||
      !clean_(p.emergencyName) || digits_(p.emergencyPhone).length < 10 ||
      kids.length === 0 || kids.length > 8 || !req.consent) {
    return { ok: false, error: 'invalid' };
  }

  var cache = CacheService.getScriptCache();
  if (!bump_(cache, 'reg:' + phone, 3, 600) || !bump_(cache, 'reg:all', 60, 3600)) {
    return { ok: false, error: 'too_many' };
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.getActive();
    var now = new Date();
    var year = s['學年'];
    var m = findMatches_(p, kids);
    var fam = m.strong && m.strong.f;
    var isNew = !fam;
    var fid;

    if (isNew) {
      fid = newFamilyId_(s);
      var notes = [];
      // 姓名相同但家長說「不是我」或「舊 Email 不用了」→ 還是建立新家庭，但留紀錄給同工檢查
      m.weak.forEach(function (w) {
        notes.push('可能與 ' + w.f['家庭編號'] + '（' + w.f['家長姓名'] + '）重複：' +
          (w.reason.indexOf('parent') >= 0 ? '家長同名' : '') + (w.reason === 'parent+kid' ? '、' : '') +
          (w.reason.indexOf('kid') >= 0 ? '孩子同名' : ''));
      });
      if (req.oldEmail) notes.push('家長表示是舊家庭、但已不用舊 Email，請同工確認後合併');
      ss.getSheetByName(SHEET.FAMILIES).appendRow([
        fid, now, clean_(p.name), phone, phone.slice(-4), lc_(p.email), '',
        clean_(p.emergencyName), digits_(p.emergencyPhone), clean_(p.pickup), newQr_(), notes.join('；'),
      ]);
    } else {
      // 已登記的家庭：不覆蓋家長資料（避免別人改掉聯絡方式），只加新孩子，並留備註
      fid = fam['家庭編號'];
      var note = Utilities.formatDate(now, tz_(s), 'M/d') + ' 再次報名（' + clean_(p.name) + ', ' + clean_(p.email) + '）';
      setCell_(SHEET.FAMILIES, fam._row, '備註', [fam['備註'], note].filter(String).join('；'));
    }

    var added = addKids_(fid, kids, year, now);
    if (isTrue_(s['寄確認信'])) sendConfirm_(isNew ? lc_(p.email) : fam['Email'], added, year);

    var out = { ok: true, dup: !isNew, kids: added, last4: phone.slice(-4) };
    if (isNew) {
      // 全新家庭：報名完直接登入家長專區
      out.token = issueSession_(fid, lc_(p.email), req.device);
    } else {
      // 已經登記過：不給登入，請家長用原本的 Email 確認
      out.ref = cand_(fam, m.strong.reason, cache).ref;
      out.masked = maskEmail_(fam['Email']);
    }
    return out;
  } finally {
    lock.releaseLock();
  }
}

function addKids_(fid, kids, year, now) {
  var gradeMap = gradeMap_();
  var existing = rows_(SHEET.KIDS).filter(function (k) {
    return k['家庭編號'] === fid && String(k['學年']) === String(year);
  }).map(function (k) { return normName_(k['姓名']); });
  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET.KIDS);
  var added = [];
  kids.forEach(function (k) {
    if (existing.indexOf(normName_(k.name)) >= 0) return;      // 同一學年同名就不重複加
    var grade = String(k.grade || '');
    var cls = gradeMap[grade] || '';
    sheet.appendRow([
      'C' + rand_(8, '0123456789'), fid, year, clean_(k.name), clean_(k.enName),
      grade, cls, clean_(k.notes), now, '有效', '',
    ]);
    added.push({ name: clean_(k.name), cls: cls });
  });
  return added;
}

// ───────────────────────── 家長登入：Email 確認按鈕＋驗證碼 ─────────────────────────
/**
 * 1. App 送出 Email（或 precheck 給的 ref）→ 寄信，信裡有「確認是我」按鈕和 6 位數驗證碼
 * 2. App 畫面顯示一個兩位數（例如 47），信裡的確認頁也會顯示，讓家長核對
 * 3. 家長在任何裝置按下確認 → App 每幾秒問一次（loginPoll）→ 拿到登入權杖
 *    或家長回 App 輸入驗證碼（loginCode）
 */
function loginStart_(req) {
  var cache = CacheService.getScriptCache();
  var fams = rows_(SHEET.FAMILIES), fam = null, email = '';
  if (req.ref) {
    var fid = cache.get('ref:' + req.ref);
    fam = fid && fams.filter(function (f) { return f['家庭編號'] === fid; })[0];
    if (!fam) return { ok: false, error: 'expired' };
    email = lc_(fam['Email']);
    if (!email) return { ok: false, error: 'no_email' };
  } else {
    email = lc_(req.email);
    if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: 'invalid' };
    fam = fams.filter(function (f) { return familyEmails_(f).indexOf(email) >= 0; })[0];
    if (!fam) return { ok: false, error: 'no_account' };
  }
  if (!bump_(cache, 'ls:' + email, 5, 900) || !bump_(cache, 'ls:all', 200, 3600)) {
    return { ok: false, error: 'too_many' };
  }
  var rid = uuid_(), secret = uuid_();
  var num = String(10 + Math.floor(Math.random() * 90));
  var code = rand_(6, '0123456789');
  putLogin_(cache, rid, { fid: fam['家庭編號'], email: email, secret: secret, num: num, code: code,
                          approved: false, tries: 0, device: clean_(req.device) });
  var link = baseUrl_() + 'confirm.html?r=' + rid + '&k=' + secret;
  sendLoginMail_(email, link, num, code);
  return { ok: true, rid: rid, num: num, masked: maskEmail_(email) };
}

function getLogin_(cache, rid) {
  var raw = rid && cache.get('login:' + rid);
  return raw ? JSON.parse(raw) : null;
}
function putLogin_(cache, rid, d) { cache.put('login:' + rid, JSON.stringify(d), 900); }   // 15 分鐘有效

// 確認頁打開時：只顯示數字，不算確認（避免 Email 安全掃描自動打開連結就登入）
function loginPeek_(req) {
  var d = getLogin_(CacheService.getScriptCache(), req.r);
  if (!d || d.secret !== req.k) return { ok: false, error: 'expired' };
  return { ok: true, num: d.num, approved: d.approved };
}

// 家長按下「確認是我」
function loginApprove_(req) {
  var cache = CacheService.getScriptCache();
  var d = getLogin_(cache, req.r);
  if (!d || d.secret !== req.k) return { ok: false, error: 'expired' };
  d.approved = true;
  putLogin_(cache, req.r, d);
  return { ok: true };
}

function loginPoll_(req) {
  var cache = CacheService.getScriptCache();
  var d = getLogin_(cache, req.rid);
  if (!d) return { ok: false, error: 'expired' };
  if (!d.approved) return { ok: true, pending: true };
  cache.remove('login:' + req.rid);
  return { ok: true, token: issueSession_(d.fid, d.email, d.device) };
}

function loginCode_(req) {
  var cache = CacheService.getScriptCache();
  var d = getLogin_(cache, req.rid);
  if (!d) return { ok: false, error: 'expired' };
  if (digits_(req.code) !== d.code) {
    d.tries++;
    if (d.tries >= 5) { cache.remove('login:' + req.rid); return { ok: false, error: 'too_many' }; }
    putLogin_(cache, req.rid, d);
    return { ok: false, error: 'bad_code' };
  }
  cache.remove('login:' + req.rid);
  return { ok: true, token: issueSession_(d.fid, d.email, d.device) };
}

// 登入權杖：只把雜湊值存在試算表，試算表外流也拿不到可以用的權杖
function issueSession_(fid, email, device) {
  var token = 'S' + uuid_() + uuid_();
  var now = new Date();
  SpreadsheetApp.getActive().getSheetByName(SHEET.SESSIONS)
    .appendRow([now, fid, email, hash_(token), now, clean_(device) || '', '有效']);
  return token;
}

function auth_(req) {
  if (!req.token) return null;
  var h = hash_(String(req.token));
  var sess = rows_(SHEET.SESSIONS).filter(function (r) { return r['權杖雜湊'] === h; })[0];
  if (!sess || sess['狀態'] !== '有效') return null;
  var s = settings_();
  var days = Number(s['登入保持天數'] || 365);
  var last = sess['最後使用'] instanceof Date ? sess['最後使用'] : new Date(sess['最後使用']);
  var age = (Date.now() - last.getTime()) / 86400000;
  if (age > days) { setCell_(SHEET.SESSIONS, sess._row, '狀態', '過期'); return null; }
  if (age > 1) setCell_(SHEET.SESSIONS, sess._row, '最後使用', new Date());   // 一天最多更新一次
  var fam = rows_(SHEET.FAMILIES).filter(function (f) { return f['家庭編號'] === sess['家庭編號']; })[0];
  // 被同工從家庭移除的 Email，舊的登入也跟著失效
  if (!fam || familyEmails_(fam).indexOf(lc_(sess['Email'])) < 0) return null;
  return { sess: sess, fam: fam, email: lc_(sess['Email']), s: s };
}

// ───────────────────────── 家長專區 ─────────────────────────
function me_(req) {
  var a = auth_(req);
  if (!a) return { ok: false, error: 'auth' };
  return { ok: true, data: familyView_(a) };
}

function familyView_(a) {
  var f = a.fam, s = a.s;
  var kids = rows_(SHEET.KIDS).filter(function (k) {
    return k['家庭編號'] === f['家庭編號'] && k['狀態'] !== '停用';
  });
  // 同一個孩子跨學年可能有多筆，只留最新一筆
  var latest = {};
  kids.forEach(function (k) {
    var key = normName_(k['姓名']);
    if (!latest[key] || String(k['學年']) > String(latest[key]['學年'])) latest[key] = k;
  });
  return {
    me: a.email,
    year: s['學年'],
    grades: grades_(),
    family: {
      name: f['家長姓名'], phone: String(f['手機']), last4: String(f['手機末四碼']),
      email: lc_(f['Email']), others: splitEmails_(f['其他家長Email']),
      emergencyName: f['緊急聯絡人'], emergencyPhone: String(f['緊急聯絡人電話']),
      pickup: f['授權接送人'], qr: f['QR代碼'],
    },
    kids: Object.keys(latest).map(function (key) {
      var k = latest[key];
      return { cid: k['孩子編號'], name: k['姓名'], enName: k['英文名'], grade: String(k['年級']),
               cls: k['班別'], notes: k['過敏/特殊需求'], year: String(k['學年']),
               current: String(k['學年']) === String(s['學年']) };
    }),
  };
}

function saveFamily_(req) {
  var a = auth_(req);
  if (!a) return { ok: false, error: 'auth' };
  var v = req.family || {};
  var phone = digits_(v.phone);
  if (!clean_(v.name) || phone.length < 10 || !clean_(v.emergencyName) || digits_(v.emergencyPhone).length < 10) {
    return { ok: false, error: 'invalid' };
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var taken = rows_(SHEET.FAMILIES).some(function (f) {
      return f['家庭編號'] !== a.fam['家庭編號'] && digits_(f['手機']) === phone;
    });
    if (taken) return { ok: false, error: 'phone_taken' };
    var f = a.fam;
    f['家長姓名'] = clean_(v.name); f['手機'] = phone; f['手機末四碼'] = phone.slice(-4);
    f['緊急聯絡人'] = clean_(v.emergencyName); f['緊急聯絡人電話'] = digits_(v.emergencyPhone);
    f['授權接送人'] = clean_(v.pickup);
    writeRow_(SpreadsheetApp.getActive().getSheetByName(SHEET.FAMILIES), SHEET.FAMILIES, f);
    a.fam = f;
    return { ok: true, data: familyView_(a) };
  } finally { lock.releaseLock(); }
}

function saveKid_(req) {
  var a = auth_(req);
  if (!a) return { ok: false, error: 'auth' };
  var v = req.kid || {};
  var gm = gradeMap_();
  if (!clean_(v.name) || !(String(v.grade) in gm)) return { ok: false, error: 'invalid' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET.KIDS);
    if (v.cid) {
      var k = rows_(SHEET.KIDS).filter(function (r) {
        return r['孩子編號'] === v.cid && r['家庭編號'] === a.fam['家庭編號'];   // 只能改自己家的孩子
      })[0];
      if (!k) return { ok: false, error: 'invalid' };
      k['姓名'] = clean_(v.name); k['英文名'] = clean_(v.enName);
      k['年級'] = String(v.grade); k['班別'] = gm[String(v.grade)];
      k['過敏/特殊需求'] = clean_(v.notes);
      if (v.enroll) { k['學年'] = a.s['學年']; k['報名時間'] = new Date(); }     // 舊學年的孩子報名今年
      writeRow_(sheet, SHEET.KIDS, k);
    } else {
      addKids_(a.fam['家庭編號'], [v], a.s['學年'], new Date());
    }
    return { ok: true, data: familyView_(a) };
  } finally { lock.releaseLock(); }
}

function invite_(req) {
  var a = auth_(req);
  if (!a) return { ok: false, error: 'auth' };
  var email = lc_(req.email);
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: 'invalid' };
  var cache = CacheService.getScriptCache();
  if (!bump_(cache, 'inv:' + a.fam['家庭編號'], 5, 3600)) return { ok: false, error: 'too_many' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var fams = rows_(SHEET.FAMILIES);
    var other = fams.filter(function (f) { return familyEmails_(f).indexOf(email) >= 0; })[0];
    if (other && other['家庭編號'] !== a.fam['家庭編號']) return { ok: false, error: 'email_taken' };
    if (!other) {
      var f = a.fam;
      f['其他家長Email'] = splitEmails_(f['其他家長Email']).concat([email]).join(', ');
      writeRow_(SpreadsheetApp.getActive().getSheetByName(SHEET.FAMILIES), SHEET.FAMILIES, f);
      a.fam = f;
      sendInviteMail_(email, a.fam['家長姓名']);
    }
    return { ok: true, data: familyView_(a) };
  } finally { lock.releaseLock(); }
}

function removeParent_(req) {
  var a = auth_(req);
  if (!a) return { ok: false, error: 'auth' };
  var email = lc_(req.email);
  var f = a.fam;
  var others = splitEmails_(f['其他家長Email']);
  if (others.indexOf(email) < 0) return { ok: false, error: 'invalid' };   // 主要 Email 只能由同工更改
  f['其他家長Email'] = others.filter(function (e) { return e !== email; }).join(', ');
  writeRow_(SpreadsheetApp.getActive().getSheetByName(SHEET.FAMILIES), SHEET.FAMILIES, f);
  a.fam = f;
  return { ok: true, data: familyView_(a) };
}

function logout_(req) {
  var a = auth_(req);
  if (a) setCell_(SHEET.SESSIONS, a.sess._row, '狀態', '登出');
  return { ok: true };
}

// ───────────────────────── Email ─────────────────────────
function mailShell_(inner) {
  return '<div style="font-family:-apple-system,\'PingFang TC\',\'Noto Sans TC\',sans-serif;font-size:18px;line-height:1.6;color:#14213d;max-width:520px;margin:0 auto;padding:16px">' +
    inner + '<p style="color:#5a6478;font-size:15px;margin-top:28px">威明頓主恩堂 兒童事工 · WCEC Children\'s Ministry</p></div>';
}

function sendLoginMail_(email, link, num, code) {
  MailApp.sendEmail({
    to: email,
    subject: 'WCEC 家長專區登入確認 / Parent sign-in',
    body: '請按這個連結確認登入：' + link + '\nApp 上的數字應該是 ' + num + '\n或在 App 輸入驗證碼：' + code +
      '\n\nConfirm sign-in: ' + link + '\nThe app should show ' + num + '. Or enter code ' + code +
      '\n\n如果不是您本人操作，請忽略這封信。If this wasn\'t you, ignore this email.',
    htmlBody: mailShell_(
      '<h2 style="margin:0 0 8px">登入 WCEC 家長專區</h2>' +
      '<p>請按下面的按鈕確認是您本人。<br>App 上應該顯示數字 <b style="font-size:24px">' + num + '</b>。</p>' +
      '<p style="margin:24px 0"><a href="' + link + '" style="background:#2C3E6B;color:#fff;text-decoration:none;padding:16px 28px;border-radius:12px;font-weight:700;display:inline-block">確認是我 / It\'s me</a></p>' +
      '<p>或是回到 App 輸入驗證碼：<br><b style="font-size:30px;letter-spacing:6px">' + code + '</b></p>' +
      '<p style="color:#5a6478;font-size:15px">15 分鐘內有效。如果不是您本人操作，請忽略這封信。<br>Valid for 15 minutes. If this wasn\'t you, ignore this email.</p>'),
  });
}

function sendInviteMail_(email, inviter) {
  MailApp.sendEmail({
    to: email,
    subject: '您已加入 WCEC 家長專區 / You\'ve been added to WCEC Parent Area',
    body: inviter + ' 已把您加入家庭。打開 WCEC App →「家長專區」，輸入這個 Email 就能登入。\n' +
      inviter + ' added you to their family. Open the WCEC app → Parent Area and sign in with this email.',
    htmlBody: mailShell_('<h2 style="margin:0 0 8px">您已加入家長專區</h2><p><b>' + clean_(inviter) +
      '</b> 已把您加入家庭。<br>打開 WCEC App →「家長專區」，輸入這個 Email 就能登入，看到孩子的資料。</p>' +
      '<p style="color:#5a6478">' + clean_(inviter) + ' added you to their family. Open the WCEC app → Parent Area and sign in with this email.</p>'),
  });
}

function sendConfirm_(email, kids, year) {
  if (!email || kids.length === 0) return;
  try {
    var list = kids.map(function (k) { return '・' + k.name + (k.cls ? '（' + k.cls + '）' : ''); }).join('\n');
    MailApp.sendEmail({
      to: email,
      subject: 'WCEC Awana ' + year + ' 報名成功 / Registration received',
      body: '謝謝您報名 WCEC Awana！\nThank you for registering for WCEC Awana!\n\n' + list +
        '\n\n簽到時，在前台 iPad 輸入您手機號碼的末四碼即可。\n' +
        'To check in, enter the last 4 digits of your phone number at the front desk iPad.\n\n' +
        '威明頓主恩堂 兒童事工 / WCEC Children\'s Ministry',
    });
  } catch (err) { console.error('mail failed', err); }
}

// ───────────────────────── 簽到站（需要簽到站密碼） ─────────────────────────
function checkStation_(req) {
  var s = settings_();
  var pw = String(s['簽到站密碼'] || '');
  if (pw.length < 6) return 'not_configured';
  var cache = CacheService.getScriptCache();
  if (Number(cache.get('badkey') || 0) >= 10) return 'locked_out';  // 10 分鐘內錯 10 次就暫停
  if (String(req.key || '') !== pw) {
    bump_(cache, 'badkey', 999, 600);
    return 'bad_key';
  }
  return null;
}

function unlock_(req) {
  var err = checkStation_(req);
  return err ? { ok: false, error: err } : { ok: true };
}

function lookup_(req) {
  var err = checkStation_(req);
  if (err) return { ok: false, error: err };
  var s = settings_();
  var fams = rows_(SHEET.FAMILIES);
  if (req.qr) {
    fams = fams.filter(function (f) { return f['QR代碼'] && f['QR代碼'] === String(req.qr).trim(); });
  } else {
    var last4 = digits_(req.last4);
    if (last4.length !== 4) return { ok: false, error: 'invalid' };
    fams = fams.filter(function (f) { return String(f['手機末四碼']) === last4; });
  }
  var today = todayStr_(s);
  var inToday = {};
  rows_(SHEET.LOG).forEach(function (r) {
    if (dateStr_(r['日期'], s) === today) inToday[r['孩子編號']] = r['接送碼'];
  });
  var kids = activeKids_(s);
  var out = fams.map(function (f) {
    return {
      fid: f['家庭編號'],
      label: maskName_(f['家長姓名']),
      kids: kids.filter(function (k) { return k['家庭編號'] === f['家庭編號']; }).map(function (k) {
        // 注意：過敏資料「不」回傳到簽到站
        return { cid: k['孩子編號'], name: k['姓名'], enName: k['英文名'], cls: k['班別'],
                 checkedIn: !!inToday[k['孩子編號']] };
      }),
    };
  }).filter(function (f) { return f.kids.length > 0; });
  return { ok: true, families: out };
}

function checkin_(req) {
  var err = checkStation_(req);
  if (err) return { ok: false, error: err };
  var s = settings_();
  var cids = req.cids || [];
  if (!req.fid || cids.length === 0) return { ok: false, error: 'invalid' };

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var today = todayStr_(s);
    var now = new Date();
    var log = rows_(SHEET.LOG).filter(function (r) { return dateStr_(r['日期'], s) === today; });
    var already = {};
    var code = '';
    log.forEach(function (r) {
      already[r['孩子編號']] = true;
      if (r['家庭編號'] === req.fid && r['接送碼']) code = r['接送碼'];   // 同一家庭同一天共用接送碼
    });
    if (!code) code = pickupCode_(log);

    var kids = activeKids_(s).filter(function (k) {
      return k['家庭編號'] === req.fid && cids.indexOf(k['孩子編號']) >= 0;
    });
    var sh = SpreadsheetApp.getActive().getSheetByName(SHEET.LOG);
    var done = [];
    kids.forEach(function (k) {
      if (!already[k['孩子編號']]) {
        sh.appendRow([today, k['孩子編號'], k['姓名'], k['班別'], req.fid, now,
                      req.via === 'qr' ? 'QR卡' : '末四碼', code, '', '']);
      }
      done.push({ name: k['姓名'], cls: k['班別'] });
    });
    return { ok: true, kids: done, code: isTrue_(s['顯示接送碼']) ? code : null };
  } finally {
    lock.releaseLock();
  }
}

// ───────────────────────── 小工具 ─────────────────────────
function settings_() {
  var out = {};
  rows_(SHEET.SETTINGS).forEach(function (r) { out[r['項目']] = r['值']; });
  return out;
}

function grades_() {
  return rows_(SHEET.CLASSES).map(function (r) { return { grade: String(r['年級']), cls: r['班別'] }; });
}
function gradeMap_() {
  var m = {};
  grades_().forEach(function (g) { m[g.grade] = g.cls; });
  return m;
}

function rows_(name) {
  var sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  var vals = sh.getDataRange().getValues();
  var head = vals.shift();
  return vals.map(function (v, i) {
    var o = { _row: i + 2 };
    head.forEach(function (h, j) { o[h] = v[j]; });
    return o;
  }).filter(function (o) {
    return head.some(function (h) { return o[h] !== '' && o[h] !== null; });   // 略過空白列
  });
}

function writeRow_(sheet, name, obj) {
  var vals = HEADERS[name].map(function (h) { return obj[h] === undefined ? '' : obj[h]; });
  sheet.getRange(obj._row, 1, 1, vals.length).setValues([vals]);
}

function setCell_(name, row, header, value) {
  var sh = SpreadsheetApp.getActive().getSheetByName(name);
  var col = HEADERS[name].indexOf(header) + 1;
  sh.getRange(row, col).setValue(value);
}

function activeKids_(s) {
  return rows_(SHEET.KIDS).filter(function (k) {
    return String(k['學年']) === String(s['學年']) && k['狀態'] !== '停用';
  });
}

function familyEmails_(f) { return [lc_(f['Email'])].concat(splitEmails_(f['其他家長Email'])).filter(String); }
function splitEmails_(v) { return String(v || '').split(/[,;\s]+/).map(lc_).filter(String); }

function newFamilyId_(s) {
  return 'F' + Utilities.formatDate(new Date(), tz_(s), 'yyMMdd') + rand_(4, '0123456789');
}
function newQr_() { return 'WCECF-' + rand_(10, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'); }
function baseUrl_() { return String(settings_()['網站網址'] || '').replace(/\/?$/, '/'); }

function pickupCode_(todayLog) {
  var used = todayLog.map(function (r) { return r['接送碼']; });
  var code;
  do { code = rand_(1, 'ABCDEFGHJKLMNPRSTUVWXYZ') + rand_(3, '23456789'); }
  while (used.indexOf(code) >= 0);
  return code;
}

function bump_(cache, key, max, seconds) {
  var n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), seconds);
  return n <= max;
}

function rand_(n, chars) {
  var s = '';
  for (var i = 0; i < n; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}
function uuid_() { return Utilities.getUuid().replace(/-/g, ''); }
function hash_(s) {
  return Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8));
}

function tz_(s) { return s['時區'] || 'America/New_York'; }
function todayStr_(s) { return Utilities.formatDate(new Date(), tz_(s), 'yyyy-MM-dd'); }
function dateStr_(v, s) {
  return v instanceof Date ? Utilities.formatDate(v, tz_(s), 'yyyy-MM-dd') : String(v);
}
function isTrue_(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }
function digits_(v) { return String(v || '').replace(/\D/g, ''); }
function lc_(v) { return String(v || '').trim().toLowerCase(); }
function clean_(v) { return String(v || '').replace(/[<>]/g, '').trim().slice(0, 300); }
function normName_(v) { return String(v || '').replace(/\s+/g, '').toLowerCase(); }

// 「chiayin@gmail.com」→「ch***@gmail.com」
function maskEmail_(e) {
  e = lc_(e);
  var at = e.indexOf('@');
  if (at < 1) return '';
  var local = e.slice(0, at);
  return local.slice(0, local.length > 3 ? 2 : 1) + '***' + e.slice(at);
}

// 「陳大明」→「陳*明」；「David Chen」→「D. C.」
function maskName_(name) {
  name = String(name || '').trim();
  if (/^[一-鿿]+$/.test(name)) {
    return name.length <= 2 ? name.charAt(0) + '*' : name.charAt(0) + '*' + name.charAt(name.length - 1);
  }
  return name.split(/\s+/).map(function (w) { return w.charAt(0).toUpperCase() + '.'; }).join(' ');
}
