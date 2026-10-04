/**
 * WCEC 兒童事工：Awana 報名、家長專區、簽到 後端（Google Apps Script）
 *
 * 放在「兒童事工」那一份獨立的試算表裡（不要放在 App 公告用的試算表）。
 * 第一次使用：重新整理試算表 → 上方選單「兒童事工」→「初始設定」。
 * 部署：部署 → 新增部署作業 → 網頁應用程式
 *       執行身分：我（教會帳號）   存取權：所有人
 *
 * 資料的設計：
 *   家庭  ：一個家庭一列（家長、聯絡方式、家庭簽到卡）
 *   孩子  ：一個孩子一列，跨學年都用同一列（姓名、過敏）
 *   報名  ：一個孩子「每個學年」一列（年級、班別、狀態）
 *           → 續報只要新增今年的報名，不用重填資料；某個孩子今年不上，就不幫他報
 *
 * 前端呼叫方式：POST，Content-Type: text/plain，內容是 JSON：{ action, ... }
 */

// ───────────────────────── 工作表名稱與欄位 ─────────────────────────
var SHEET = {
  SETTINGS: '設定',
  CLASSES: '班別',
  FAMILIES: '家庭',
  KIDS: '孩子',
  ENROLL: '報名',
  LOG: '簽到紀錄',
  SESSIONS: '登入裝置',
};

var HEADERS = {
  '設定': ['項目', '值', '說明'],
  '班別': ['年級', '班別'],
  '家庭': ['家庭編號', '建立時間', '家長 First Name', '家長 Last Name', '手機', '手機末四碼', 'Email', '其他家長Email',
           '緊急聯絡人', '緊急聯絡人電話', '授權接送人', 'QR代碼', '備註'],
  '孩子': ['孩子編號', '家庭編號', 'First Name', 'Last Name', '過敏/特殊需求', '建立時間', '狀態',
           '家長手機（手動輸入用）', '年級（手動輸入用）'],
  '報名': ['學年', '孩子編號', '家庭編號', '孩子姓名', '年級', '班別', '報名時間', '狀態', '備註'],
  '簽到紀錄': ['日期', '孩子編號', '孩子姓名', '班別', '家庭編號', '簽到時間',
             '簽到方式', '接送碼', '簽退時間', '簽退同工'],
  '登入裝置': ['建立時間', '家庭編號', 'Email', '權杖雜湊', '最後使用', '裝置', '狀態'],
};

var DEFAULT_SETTINGS = [
  ['學年', '2026-27', '報名和簽到都看這個學年。新學年開始時改這裡（例如 2027-28），再把「開放報名」設成 TRUE'],
  ['開放報名', 'TRUE', 'FALSE = 報名表和家長專區都不能報名'],
  ['簽到站密碼', '', '前台 iPad 解鎖用，請改成只有同工知道的密碼（至少 6 碼）'],
  ['顯示接送碼', 'TRUE', '簽到完成後是否顯示接送碼'],
  ['寄確認信', 'TRUE', '報名成功後寄確認信給家長'],
  ['網站網址', 'https://wcec-media.github.io/kids/', '報名表、家長專區所在的網址，Email 裡的按鈕會連到這裡'],
  ['登入保持天數', '365', '家長多久沒打開家長專區，就要重新用 Email 確認'],
  ['時區', 'America/New_York', ''],
];

// 由小到大排列：續報時「建議年級」就是下一列；最後一列（6 年級）之後就算從 Awana 畢業
var DEFAULT_CLASSES = [
  ['2歲', 'Puggles'], ['3歲', 'Cubbies'], ['4歲 (PreK)', 'Cubbies'],
  ['K', 'Sparks'], ['1', 'Sparks'], ['2', 'Sparks'],
  ['3', 'T&T'], ['4', 'T&T'], ['5', 'T&T'], ['6', 'T&T'],
];

// ───────────────────────── 選單與初始設定 ─────────────────────────
function onOpen() {
  SpreadsheetApp.getUi().createMenu('兒童事工')
    .addItem('初始設定（只需執行一次）', 'setup')
    .addItem('補齊手動輸入的家庭資料', 'fillMissing')
    .addItem('寄續報通知給去年的家庭', 'sendRenewalNotices')
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
  // 電話、末四碼、年級存成文字，避免開頭的 0 被吃掉、K 被當成別的東西
  ss.getSheetByName(SHEET.FAMILIES).getRange('E:F').setNumberFormat('@');
  ss.getSheetByName(SHEET.FAMILIES).getRange('J:J').setNumberFormat('@');
  ss.getSheetByName(SHEET.KIDS).getRange('H:I').setNumberFormat('@');
  ss.getSheetByName(SHEET.ENROLL).getRange('A:A').setNumberFormat('@');
  ss.getSheetByName(SHEET.ENROLL).getRange('E:E').setNumberFormat('@');
  SpreadsheetApp.getUi().alert('設定完成。請到「設定」工作表填入簽到站密碼，並確認網站網址。');
}

/**
 * 同工手動輸入現有家庭後執行：
 *  家庭：填 家長 First / Last Name、手機、Email（其他可留空）
 *  孩子：填 First / Last Name、「家長手機（手動輸入用）」，要報今年的再填「年級（手動輸入用）」
 *  → 自動補編號、末四碼、QR 代碼，把孩子對到家庭，並幫填了年級的孩子報名今年
 */
function fillMissing() {
  var s = settings_();
  var now = new Date();
  var ss = SpreadsheetApp.getActive();
  var famSheet = ss.getSheetByName(SHEET.FAMILIES);
  var fams = rows_(SHEET.FAMILIES);
  var filledF = 0, filledK = 0, enrolled = 0, problems = [];
  fams.forEach(function (f) {
    var changed = false;
    if (!f['家庭編號']) { f['家庭編號'] = newFamilyId_(s); changed = true; }
    if (!f['建立時間']) { f['建立時間'] = now; changed = true; }
    var ph = digits_(f['手機']);
    if (ph && String(f['手機末四碼']) !== ph.slice(-4)) { f['手機末四碼'] = ph.slice(-4); changed = true; }
    if (!f['QR代碼']) { f['QR代碼'] = newQr_(); changed = true; }
    if (!f['Email']) problems.push('家庭「' + parentName_(f) + '」沒有 Email，家長將無法登入家長專區');
    if (changed) { writeRow_(famSheet, SHEET.FAMILIES, f); filledF++; }
  });
  var byPhone = {};
  fams.forEach(function (f) { byPhone[digits_(f['手機'])] = f['家庭編號']; });
  var gm = gradeMap_();
  var kidSheet = ss.getSheetByName(SHEET.KIDS);
  var enrolledNow = enrollMap_(s['學年']);
  rows_(SHEET.KIDS).forEach(function (k) {
    var changed = false;
    if (!k['家庭編號']) {
      var fid = byPhone[digits_(k['家長手機（手動輸入用）'])];
      if (fid) { k['家庭編號'] = fid; changed = true; }
      else problems.push('孩子「' + kidName_(k) + '」找不到家庭，請確認「家長手機（手動輸入用）」');
    }
    if (!k['孩子編號']) { k['孩子編號'] = newKidId_(); changed = true; }
    if (!k['建立時間']) { k['建立時間'] = now; changed = true; }
    if (!k['狀態']) { k['狀態'] = '有效'; changed = true; }
    if (changed) { writeRow_(kidSheet, SHEET.KIDS, k); filledK++; }
    var g = String(k['年級（手動輸入用）'] || '');
    if (g && k['家庭編號'] && !enrolledNow[k['孩子編號']]) {
      if (gm[g]) { addEnrollment_(k, g, s['學年'], now, '同工輸入'); enrolled++; }
      else problems.push('孩子「' + kidName_(k) + '」的年級「' + g + '」不在「班別」工作表裡');
    }
  });
  SpreadsheetApp.getUi().alert('補齊了 ' + filledF + ' 個家庭、' + filledK + ' 個孩子，幫 ' + enrolled + ' 個孩子報名 ' + s['學年'] + '。' +
    (problems.length ? '\n\n需要注意：\n' + problems.join('\n') : ''));
}

/**
 * 新學年開放報名後執行：寄信給「以前報過、今年還沒報」的家庭，請他們到家長專區續報
 * 已經從 Awana 畢業（去年 6 年級）的孩子不算
 */
function sendRenewalNotices() {
  var s = settings_();
  if (!isTrue_(s['開放報名'])) { SpreadsheetApp.getUi().alert('「設定」裡的「開放報名」還是 FALSE，請先打開。'); return; }
  var year = String(s['學年']);
  var sent = 0;
  rows_(SHEET.FAMILIES).forEach(function (f) {
    var kids = kidsOfFamily_(f['家庭編號']).map(function (k) { return kidStatus_(k, year); });
    var need = kids.filter(function (k) { return !k.enrolled && k.eligible && k.lastYear; });
    var any = kids.some(function (k) { return k.enrolled; });
    if (!need.length || any) return;
    familyEmails_(f).forEach(function (email) {
      sendRenewalMail_(email, year, need.map(function (k) { return k.name; }));
      sent++;
    });
  });
  SpreadsheetApp.getUi().alert('寄出 ' + sent + ' 封續報通知信。');
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
      case 'enroll':       return enroll_(req);
      case 'withdraw':     return withdraw_(req);
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
 * 回傳的 Email 和姓名一律遮住（ch***@gmail.com、Daniel C.），不會洩漏完整資料
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
  var email = lc_(p.email), phone = digits_(p.phone), pname = normName_(fullName_(p.first, p.last));
  var kidNames = kids.map(function (k) { return normName_(fullName_(k.first, k.last)); }).filter(String);
  var kidsByFam = {};
  rows_(SHEET.KIDS).forEach(function (k) {
    (kidsByFam[k['家庭編號']] = kidsByFam[k['家庭編號']] || []).push(normName_(kidName_(k)));
  });
  var strong = null, weak = [];
  rows_(SHEET.FAMILIES).forEach(function (f) {
    if (email && familyEmails_(f).indexOf(email) >= 0) { if (!strong) strong = { f: f, reason: 'email' }; return; }
    if (phone.length >= 10 && digits_(f['手機']) === phone) { if (!strong) strong = { f: f, reason: 'phone' }; return; }
    var why = [];
    if (pname && normName_(parentName_(f)) === pname) why.push('parent');
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
  return { ref: ref, masked: maskEmail_(f['Email']), parent: maskName_(parentName_(f)), reason: reason };
}

// ───────────────────────── 公開：新家庭報名 ─────────────────────────
function register_(req) {
  var s = settings_();
  if (!isTrue_(s['開放報名'])) return { ok: false, error: 'closed' };
  if (req.website) return { ok: true, dup: false, kids: [] };      // 機器人陷阱欄位，假裝成功

  var p = req.parent || {};
  var phone = digits_(p.phone);
  var gm = gradeMap_();
  var kids = (req.kids || []).filter(function (k) { return k && clean_(k.first) && clean_(k.last); });
  if (!clean_(p.first) || !clean_(p.last) || phone.length < 10 || !/^\S+@\S+\.\S+$/.test(p.email || '') ||
      !clean_(p.emergencyName) || digits_(p.emergencyPhone).length < 10 ||
      kids.length === 0 || kids.length > 8 || !req.consent ||
      kids.some(function (k) { return !gm[String(k.grade)]; })) {
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
        notes.push('可能與 ' + w.f['家庭編號'] + '（' + parentName_(w.f) + '）重複：' +
          (w.reason.indexOf('parent') >= 0 ? '家長同名' : '') + (w.reason === 'parent+kid' ? '、' : '') +
          (w.reason.indexOf('kid') >= 0 ? '孩子同名' : ''));
      });
      if (req.oldEmail) notes.push('家長表示是舊家庭、但已不用舊 Email，請同工確認後合併');
      ss.getSheetByName(SHEET.FAMILIES).appendRow([
        fid, now, clean_(p.first), clean_(p.last), phone, phone.slice(-4), lc_(p.email), '',
        clean_(p.emergencyName), digits_(p.emergencyPhone), clean_(p.pickup), newQr_(), notes.join('；'),
      ]);
    } else {
      // 已登記的家庭：不覆蓋家長資料（避免別人改掉聯絡方式），只加孩子，並留備註
      fid = fam['家庭編號'];
      var note = Utilities.formatDate(now, tz_(s), 'M/d') + ' 用報名表再次報名（' + fullName_(p.first, p.last) + ', ' + clean_(p.email) + '）';
      setCell_(SHEET.FAMILIES, fam._row, '備註', [fam['備註'], note].filter(String).join('；'));
    }

    var added = addKidsAndEnroll_(fid, kids, year, now);
    if (isTrue_(s['寄確認信'])) sendConfirm_(isNew ? lc_(p.email) : fam['Email'], added, year);

    var out = { ok: true, dup: !isNew, kids: added, last4: phone.slice(-4) };
    if (isNew) {
      out.token = issueSession_(fid, lc_(p.email), req.device);    // 全新家庭：報名完直接登入家長專區
    } else {
      out.ref = cand_(fam, m.strong.reason, cache).ref;           // 已經登記過：請家長用原本的 Email 確認
      out.masked = maskEmail_(fam['Email']);
    }
    return out;
  } finally {
    lock.releaseLock();
  }
}

// 同一個家庭裡同名的孩子視為同一個人：只補報名，不重複建立
function addKidsAndEnroll_(fid, kids, year, now) {
  var existing = {};
  kidsOfFamily_(fid).forEach(function (k) { existing[normName_(kidName_(k))] = k; });
  var enrolled = enrollMap_(year);
  var gm = gradeMap_();
  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET.KIDS);
  var added = [];
  kids.forEach(function (v) {
    var name = fullName_(v.first, v.last);
    var k = existing[normName_(name)];
    if (!k) {
      k = { '孩子編號': newKidId_(), '家庭編號': fid, 'First Name': clean_(v.first), 'Last Name': clean_(v.last),
            '過敏/特殊需求': clean_(v.notes), '建立時間': now, '狀態': '有效' };
      sheet.appendRow(HEADERS[SHEET.KIDS].map(function (h) { return k[h] === undefined ? '' : k[h]; }));
      existing[normName_(name)] = k;
    }
    if (enrolled[k['孩子編號']]) return;                         // 今年已經報過
    addEnrollment_(k, String(v.grade), year, now, '');
    enrolled[k['孩子編號']] = true;
    added.push({ name: kidName_(k), cls: gm[String(v.grade)] || '' });
  });
  return added;
}

function addEnrollment_(k, grade, year, now, note) {
  var gm = gradeMap_();
  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET.ENROLL);
  // 今年之前取消過的報名，直接改回有效，不另外新增一列
  var old = rows_(SHEET.ENROLL).filter(function (e) {
    return String(e['學年']) === String(year) && e['孩子編號'] === k['孩子編號'];
  })[0];
  if (old) {
    old['年級'] = grade; old['班別'] = gm[grade] || ''; old['報名時間'] = now; old['狀態'] = '有效';
    old['孩子姓名'] = kidName_(k);
    old['備註'] = [old['備註'], note].filter(String).join('；');
    writeRow_(sheet, SHEET.ENROLL, old);
    return;
  }
  sheet.appendRow([String(year), k['孩子編號'], k['家庭編號'], kidName_(k), grade, gm[grade] || '', now, '有效', note || '']);
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

/**
 * 每個孩子今年的狀態：
 *   enrolled  ：今年已報名（grade、cls 是今年的）
 *   eligible  ：還在 Awana 年齡內，可以報今年（去年 6 年級的就是畢業了）
 *   suggested ：建議今年的年級（去年年級的下一級）
 */
function kidStatus_(k, year) {
  var list = grades_().map(function (g) { return g.grade; });
  var gm = gradeMap_();
  var ens = rows_(SHEET.ENROLL).filter(function (e) { return e['孩子編號'] === k['孩子編號']; });
  var cur = ens.filter(function (e) { return String(e['學年']) === String(year) && e['狀態'] === '有效'; })[0];
  var past = ens.filter(function (e) { return String(e['學年']) < String(year) && e['狀態'] === '有效'; })
    .sort(function (a, b) { return String(b['學年']).localeCompare(String(a['學年'])); })[0];
  var suggested = '', eligible = true;
  if (past) {
    var gap = yearStart_(year) - yearStart_(past['學年']);       // 隔了幾年沒來，就往上跳幾級
    var idx = list.indexOf(String(past['年級']));
    if (idx >= 0) {
      if (idx + gap >= list.length) eligible = false;
      else suggested = list[idx + gap];
    }
  }
  return {
    cid: k['孩子編號'], first: k['First Name'], last: k['Last Name'], name: kidName_(k),
    notes: k['過敏/特殊需求'],
    enrolled: !!cur,
    grade: cur ? String(cur['年級']) : '', cls: cur ? (cur['班別'] || gm[String(cur['年級'])] || '') : '',
    lastYear: past ? String(past['學年']) : '', lastGrade: past ? String(past['年級']) : '',
    suggested: suggested, eligible: !cur && eligible,
    graduated: !cur && !eligible,
  };
}

function familyView_(a) {
  var f = a.fam, s = a.s, year = String(s['學年']);
  return {
    me: a.email,
    year: year,
    open: isTrue_(s['開放報名']),
    grades: grades_(),
    family: {
      first: f['家長 First Name'], last: f['家長 Last Name'], name: parentName_(f),
      phone: String(f['手機']), last4: String(f['手機末四碼']),
      email: lc_(f['Email']), others: splitEmails_(f['其他家長Email']),
      emergencyName: f['緊急聯絡人'], emergencyPhone: String(f['緊急聯絡人電話']),
      pickup: f['授權接送人'], qr: f['QR代碼'],
    },
    kids: kidsOfFamily_(f['家庭編號']).map(function (k) { return kidStatus_(k, year); }),
  };
}

// 續報／報名：勾選要報今年的孩子和年級，不用重填資料
function enroll_(req) {
  var a = auth_(req);
  if (!a) return { ok: false, error: 'auth' };
  if (!isTrue_(a.s['開放報名'])) return { ok: false, error: 'closed' };
  var gm = gradeMap_();
  var picks = (req.kids || []).filter(function (p) { return p && p.cid && gm[String(p.grade)]; });
  if (!picks.length) return { ok: false, error: 'invalid' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var year = String(a.s['學年']);
    var mine = {};
    kidsOfFamily_(a.fam['家庭編號']).forEach(function (k) { mine[k['孩子編號']] = k; });
    var enrolled = enrollMap_(year);
    var now = new Date(), added = [];
    picks.forEach(function (p) {
      var k = mine[p.cid];                                        // 只能報自己家的孩子
      if (!k || enrolled[p.cid]) return;
      addEnrollment_(k, String(p.grade), year, now, '家長專區續報');
      added.push({ name: kidName_(k), cls: gm[String(p.grade)] });
    });
    if (added.length && isTrue_(a.s['寄確認信'])) sendConfirm_(a.email, added, year);
    return { ok: true, data: familyView_(a), added: added };
  } finally { lock.releaseLock(); }
}

// 這學年不參加了：報名改成「取消」，孩子資料留著，明年還可以續報
function withdraw_(req) {
  var a = auth_(req);
  if (!a) return { ok: false, error: 'auth' };
  var year = String(a.s['學年']);
  var e = rows_(SHEET.ENROLL).filter(function (r) {
    return String(r['學年']) === year && r['孩子編號'] === req.cid && r['家庭編號'] === a.fam['家庭編號'] && r['狀態'] === '有效';
  })[0];
  if (!e) return { ok: false, error: 'invalid' };
  e['狀態'] = '取消';
  e['備註'] = [e['備註'], Utilities.formatDate(new Date(), tz_(a.s), 'M/d') + ' 家長在家長專區取消'].filter(String).join('；');
  writeRow_(SpreadsheetApp.getActive().getSheetByName(SHEET.ENROLL), SHEET.ENROLL, e);
  return { ok: true, data: familyView_(a) };
}

function saveFamily_(req) {
  var a = auth_(req);
  if (!a) return { ok: false, error: 'auth' };
  var v = req.family || {};
  var phone = digits_(v.phone);
  if (!clean_(v.first) || !clean_(v.last) || phone.length < 10 || !clean_(v.emergencyName) || digits_(v.emergencyPhone).length < 10) {
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
    f['家長 First Name'] = clean_(v.first); f['家長 Last Name'] = clean_(v.last);
    f['手機'] = phone; f['手機末四碼'] = phone.slice(-4);
    f['緊急聯絡人'] = clean_(v.emergencyName); f['緊急聯絡人電話'] = digits_(v.emergencyPhone);
    f['授權接送人'] = clean_(v.pickup);
    writeRow_(SpreadsheetApp.getActive().getSheetByName(SHEET.FAMILIES), SHEET.FAMILIES, f);
    a.fam = f;
    return { ok: true, data: familyView_(a) };
  } finally { lock.releaseLock(); }
}

// 修改孩子資料（姓名、過敏；已報名的可以改今年的年級）；沒有 cid 就是新增孩子並報名今年
function saveKid_(req) {
  var a = auth_(req);
  if (!a) return { ok: false, error: 'auth' };
  var v = req.kid || {};
  var gm = gradeMap_();
  if (!clean_(v.first) || !clean_(v.last)) return { ok: false, error: 'invalid' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var year = String(a.s['學年']);
    if (!v.cid) {
      if (!isTrue_(a.s['開放報名'])) return { ok: false, error: 'closed' };
      if (!gm[String(v.grade)]) return { ok: false, error: 'invalid' };
      addKidsAndEnroll_(a.fam['家庭編號'], [v], year, new Date());
      return { ok: true, data: familyView_(a) };
    }
    var k = kidsOfFamily_(a.fam['家庭編號']).filter(function (r) { return r['孩子編號'] === v.cid; })[0];
    if (!k) return { ok: false, error: 'invalid' };
    k['First Name'] = clean_(v.first); k['Last Name'] = clean_(v.last); k['過敏/特殊需求'] = clean_(v.notes);
    writeRow_(SpreadsheetApp.getActive().getSheetByName(SHEET.KIDS), SHEET.KIDS, k);
    var e = rows_(SHEET.ENROLL).filter(function (r) {
      return String(r['學年']) === year && r['孩子編號'] === v.cid && r['狀態'] === '有效';
    })[0];
    if (e) {
      e['孩子姓名'] = kidName_(k);
      if (v.grade && gm[String(v.grade)]) { e['年級'] = String(v.grade); e['班別'] = gm[String(v.grade)]; }
      writeRow_(SpreadsheetApp.getActive().getSheetByName(SHEET.ENROLL), SHEET.ENROLL, e);
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
    var other = rows_(SHEET.FAMILIES).filter(function (f) { return familyEmails_(f).indexOf(email) >= 0; })[0];
    if (other && other['家庭編號'] !== a.fam['家庭編號']) return { ok: false, error: 'email_taken' };
    if (!other) {
      var f = a.fam;
      f['其他家長Email'] = splitEmails_(f['其他家長Email']).concat([email]).join(', ');
      writeRow_(SpreadsheetApp.getActive().getSheetByName(SHEET.FAMILIES), SHEET.FAMILIES, f);
      a.fam = f;
      sendInviteMail_(email, parentName_(a.fam));
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
function mailButton_(href, label) {
  return '<p style="margin:24px 0"><a href="' + href + '" style="background:#2C3E6B;color:#fff;text-decoration:none;padding:16px 28px;border-radius:12px;font-weight:700;display:inline-block">' + label + '</a></p>';
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
      mailButton_(link, '確認是我 / It\'s me') +
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

function sendRenewalMail_(email, year, names) {
  var link = baseUrl_() + 'parent.html';
  MailApp.sendEmail({
    to: email,
    subject: 'WCEC Awana ' + year + ' 開放報名 / Registration is open',
    body: year + ' 學年的 Awana 開放報名了！不用重填表：打開 WCEC App →「家長專區」，勾選要參加的孩子就完成了。\n' + link +
      '\n\nAwana ' + year + ' registration is open. Open the WCEC app → Parent Area and check the children who will attend.',
    htmlBody: mailShell_('<h2 style="margin:0 0 8px">Awana ' + year + ' 開放報名了！</h2>' +
      '<p>' + names.map(clean_).join('、') + '</p>' +
      '<p>不用重新填表。打開 <b>WCEC App →「家長專區」</b>，勾選今年要參加的孩子，按「送出」就完成了。</p>' +
      mailButton_(link, '前往家長專區 / Parent Area') +
      '<p style="color:#5a6478">No need to fill out the form again. Open the WCEC app → Parent Area, check the children who will attend, and submit.</p>'),
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
      label: maskName_(parentName_(f)),
      kids: kids.filter(function (k) { return k.fid === f['家庭編號']; }).map(function (k) {
        // 注意：過敏資料「不」回傳到簽到站
        return { cid: k.cid, name: k.name, cls: k.cls, checkedIn: !!inToday[k.cid] };
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

    var kids = activeKids_(s).filter(function (k) { return k.fid === req.fid && cids.indexOf(k.cid) >= 0; });
    var sh = SpreadsheetApp.getActive().getSheetByName(SHEET.LOG);
    var done = [];
    kids.forEach(function (k) {
      if (!already[k.cid]) {
        sh.appendRow([today, k.cid, k.name, k.cls, req.fid, now, req.via === 'qr' ? 'QR卡' : '末四碼', code, '', '']);
      }
      done.push({ name: k.name, cls: k.cls });
    });
    return { ok: true, kids: done, code: isTrue_(s['顯示接送碼']) ? code : null };
  } finally {
    lock.releaseLock();
  }
}

// 今年有有效報名的孩子
function activeKids_(s) {
  var year = String(s['學年']);
  var gm = gradeMap_();
  var kids = {};
  rows_(SHEET.KIDS).forEach(function (k) { if (k['狀態'] !== '停用') kids[k['孩子編號']] = k; });
  return rows_(SHEET.ENROLL).filter(function (e) {
    return String(e['學年']) === year && e['狀態'] === '有效' && kids[e['孩子編號']];
  }).map(function (e) {
    var k = kids[e['孩子編號']];
    return { cid: k['孩子編號'], fid: k['家庭編號'], name: kidName_(k), cls: e['班別'] || gm[String(e['年級'])] || '' };
  });
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

function kidsOfFamily_(fid) {
  return rows_(SHEET.KIDS).filter(function (k) { return k['家庭編號'] === fid && k['狀態'] !== '停用'; });
}
function enrollMap_(year) {
  var m = {};
  rows_(SHEET.ENROLL).forEach(function (e) {
    if (String(e['學年']) === String(year) && e['狀態'] === '有效') m[e['孩子編號']] = true;
  });
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

function fullName_(first, last) { return (clean_(first) + ' ' + clean_(last)).trim(); }
function parentName_(f) { return fullName_(f['家長 First Name'], f['家長 Last Name']); }
function kidName_(k) { return fullName_(k['First Name'], k['Last Name']); }
function yearStart_(y) { return parseInt(String(y), 10) || 0; }    // 「2026-27」→ 2026

function familyEmails_(f) { return [lc_(f['Email'])].concat(splitEmails_(f['其他家長Email'])).filter(String); }
function splitEmails_(v) { return String(v || '').split(/[,;\s]+/).map(lc_).filter(String); }

function newFamilyId_(s) {
  return 'F' + Utilities.formatDate(new Date(), tz_(s), 'yyMMdd') + rand_(4, '0123456789');
}
function newKidId_() { return 'C' + rand_(8, '0123456789'); }
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
function clean_(v) { return String(v || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 300); }
function normName_(v) { return String(v || '').replace(/\s+/g, '').toLowerCase(); }

// 「chiayin@gmail.com」→「ch***@gmail.com」
function maskEmail_(e) {
  e = lc_(e);
  var at = e.indexOf('@');
  if (at < 1) return '';
  var local = e.slice(0, at);
  return local.slice(0, local.length > 3 ? 2 : 1) + '***' + e.slice(at);
}

// 「Daniel Chen」→「Daniel C.」；中文「陳大明」→「陳*明」
function maskName_(name) {
  name = String(name || '').trim();
  if (/^[一-鿿]+$/.test(name)) {
    return name.length <= 2 ? name.charAt(0) + '*' : name.charAt(0) + '*' + name.charAt(name.length - 1);
  }
  var w = name.split(/\s+/);
  return w.length > 1 ? w[0] + ' ' + w[w.length - 1].charAt(0).toUpperCase() + '.' : w[0];
}
