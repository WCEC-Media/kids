/* WCEC 兒童事工網頁共用：語言、呼叫後端、登入權杖、App 嵌入模式、對話框 */
(function () {
  // ─────────────── 文字 ───────────────
  var STR = {
    zh: {
      lang_btn: 'English', cancel: '取消', close: '關閉', back: '返回', required: '必填',
      demo: '示範模式：使用測試資料，不會存進真正的試算表', demo_tools: '開啟模擬信箱與試算表',
      // 報名表
      reg_title: 'Awana 報名', reg_sub: '威明頓主恩堂 兒童事工',
      closed: '目前沒有開放報名，請留意教會公告。',
      parent: '家長資料', parent_name: '家長姓名', first: 'First Name（名）', last: 'Last Name（姓）', name_hint: '請填英文名字', phone: '手機號碼', email: 'Email',
      phone_hint: '簽到時會用手機末四碼找到您的孩子', email_hint: '之後用這個 Email 登入家長專區，不用密碼',
      emergency: '緊急聯絡人', emergency_name: '姓名（家長以外的人）', emergency_phone: '電話',
      pickup: '其他可以接孩子的人（選填）', pickup_hint: '例如：Grandma Mary Wang 302-555-0000',
      kids: '孩子資料', kid_n: '第 {n} 位孩子', kid_name: '孩子姓名',
      grade: '今年的年級', grade_pick: '請選擇', cls: '班別',
      notes: '過敏或特殊照顧需求（選填）', notes_hint: '只有兒童事工同工看得到，簽到畫面不會顯示',
      add_kid: '＋ 再加一位孩子', remove: '移除',
      consent: '我同意教會將以上資料用於 Awana 報名、簽到與緊急聯絡。資料存放在教會的 Google 帳號，不會提供給其他單位。',
      submit: '送出報名', sending: '送出中…', checking: '檢查中…',
      err_required: '這一欄必填', err_phone: '請輸入 10 碼電話號碼',
      err_email: 'Email 格式不正確', err_consent: '請勾選同意', err_fix: '有欄位還沒填好，請看紅字',
      have_account: '之前登記過？', go_parent: '直接進入家長專區',
      // 重複檢查
      dup_strong_title: '您已經登記過了',
      dup_strong_email: '這個 Email 已經登記過了。', dup_strong_phone: '這支手機號碼已經登記過了。',
      dup_strong_body: '不用重新報名。用原本的 Email 確認後，就能進入家長專區，在那裡幫孩子報名或修改資料。',
      dup_send: '寄確認信到 {email}',
      dup_maybe_title: '這是您的家庭嗎？',
      dup_maybe_body: '我們找到名字相同的家庭資料。如果是您的，請用原本的 Email 確認，就不會重複登記。',
      dup_reason_parent: '家長同名', dup_reason_kid: '孩子同名', dup_parent: '家長', dup_email: 'Email',
      dup_its_me: '是我，寄確認信到這個 Email',
      dup_old_email: '是我，但這個 Email 我已經不用了',
      dup_not_me: '都不是我，繼續報名新家庭',
      dup_old_title: '我們先幫您建立新的登記',
      dup_old_body: '送出後，兒童事工同工會幫您把舊資料合併過來。之後就用這次填的 Email 登入。',
      dup_old_go: '好，送出報名',

      // 續報
      reg_logged_in: '您已經登入家長專區了。以前報過的孩子續報、或幫新的孩子報名，都在家長專區完成，不用再填這份表。',
      reg_new_anyway: '我要幫另一個家庭填新的報名表',
      en_title: 'Awana {year} 開放報名了', en_body: '不用重新填表，勾選今年要參加的孩子就好。',
      en_btn: '幫孩子報名 {year}', en_dialog: '報名 Awana {year}',
      en_pick: '請勾選今年要參加的孩子，並確認今年的年級：', en_last: '去年：{grade}',
      en_grad: '已從 Awana 畢業（去年 6 年級）',
      en_contact_q: '聯絡資料還正確嗎？', en_contact_edit: '修改聯絡資料',
      en_submit: '送出報名', en_none: '請至少勾選一個孩子', en_done: '已報名：{names}',
      en_new_kid: '要報名的孩子不在上面？按「＋ 新增孩子」。',
      st_enrolled: '{year} 已報名', st_not: '{year} 沒有報名', st_grad: '已從 Awana 畢業',
      wd_link: '這學年不參加了', wd_q: '{name} 這學年不參加 Awana 了嗎？孩子的資料會留著，之後還可以再報名。',
      wd_yes: '確定，這學年不參加', wd_done: '已取消 {name} 這學年的報名',
      closed_short: '{year} 目前沒有開放報名。', grade_this: '今年的年級',
      // 報名完成
      ok_title: '報名成功！', ok_enter: '進入家長專區',
      ok_enter_hint: '在家長專區可以看到孩子的資料、家庭簽到卡，之後也可以在那裡修改資料。',
      ok_or: '簽到時，在前台 iPad 輸入手機末四碼 {last4} 就可以。',
      ok_dup: '這支電話或 Email 之前已經登記過，新孩子已經加進原本的家庭。請用原本的 Email 確認後進入家長專區。',
      ok_none: '這些孩子之前已經報名過了，不用再報一次。',
      ok_mail: '確認信已寄到您的 Email。', again: '再填一份報名表',
      // 家長專區：登入
      pz_title: '家長專區', pz_sub: '威明頓主恩堂 兒童事工',
      pz_login_title: '登入家長專區',
      pz_login_hint: '輸入報名時填的 Email，我們會寄一封確認信給您。不用密碼。',
      pz_send: '寄確認信', pz_sending: '寄送中…',
      pz_no_account: '這個 Email 還沒有登記。如果家裡另一位家長登記過，請他在家長專區把您加進來；第一次參加請先報名。',
      pz_first_time: '第一次參加？', pz_register: '新家庭報名',
      pz_wait_title: '請到信箱確認', pz_wait_body: '我們寄了一封信到 {email}。請打開信，按「確認是我」。',
      pz_wait_num: '信裡的確認頁會顯示這個數字，請核對：',
      pz_wait_auto: '確認後，這個畫面會自動進入家長專區。',
      pz_code_label: '不方便按信裡的按鈕？輸入信裡的 6 位數驗證碼', pz_code_btn: '用驗證碼登入',
      pz_resend: '重新寄信', pz_other_email: '換一個 Email',
      pz_spam: '沒收到信？請看一下垃圾郵件匣，或等一分鐘再按「重新寄信」。',
      // 家長專區：首頁
      pz_hello: '我的家庭', pz_kids: '孩子', pz_edit: '修改', pz_add_kid: '＋ 新增孩子',
      pz_no_kids: '還沒有孩子的資料。', pz_not_current: '還沒報名 {year}', pz_enroll: '報名 {year}',
      pz_notes: '過敏／特殊需求',
      pz_card: '家庭簽到卡', pz_card_hint: '簽到時讓前台 iPad 掃這張卡，或輸入手機末四碼 {last4}。',
      pz_contact: '聯絡資料', pz_parents: '可以登入的家長', pz_you: '您', pz_main: '主要',
      pz_invite: '＋ 邀請另一位家長',
      pz_invite_hint: '輸入另一位家長的 Email。對方打開 WCEC App 的家長專區，用這個 Email 就能登入，看到同樣的孩子資料。',
      pz_invite_send: '加入並寄通知信', pz_invited: '已加入，並寄了通知信給 {email}',
      pz_remove_q: '移除 {email}？對方就不能再登入這個家庭。', pz_remove: '移除',
      pz_main_note: '主要 Email 要更改，請聯絡兒童事工同工。',
      pz_logout: '登出這支手機', pz_logout_q: '登出後，下次要再用 Email 確認一次。', pz_logout_yes: '登出',
      pz_save: '儲存', pz_saving: '儲存中…', pz_saved: '已儲存',
      pz_kid_edit: '修改孩子資料', pz_kid_new: '新增孩子', pz_family_edit: '修改聯絡資料',
      pz_staff_note: '有問題請聯絡兒童事工同工。',
      // 確認頁
      cf_title: '確認登入', cf_num: 'App 上顯示的數字是', cf_hint: '如果數字一樣，請按下面的按鈕。如果您沒有要登入，請直接關掉這一頁。',
      cf_btn: '確認是我', cf_done_title: '確認完成！',
      cf_done_body: '請回到 WCEC App 或剛才的網頁，家長專區會自動打開。這一頁可以關掉了。',
      cf_expired: '這個連結已經過期或用過了。請回到 App 重新寄信。',
      // 錯誤
      e_closed: '目前沒有開放報名。', e_too_many: '操作太多次，請 10 分鐘後再試。',
      e_invalid: '資料不完整，請檢查後再送出。', e_network: '連線失敗，請檢查網路後再試一次。',
      e_server_error: '系統暫時有問題，請稍後再試。', e_auth: '登入已過期，請重新用 Email 確認。',
      e_expired: '這次的確認已經過期，請重新寄信。', e_bad_code: '驗證碼不對，請再看一次信裡的數字。',
      e_no_email: '這個家庭沒有登記 Email，請聯絡兒童事工同工。',
      e_phone_taken: '這支手機號碼已經被另一個家庭使用，請聯絡同工。',
      e_email_taken: '這個 Email 已經屬於另一個家庭，請聯絡同工。',
      // 簽到站
      ci_title: 'Awana 簽到', ci_enter: '請輸入家長手機末四碼', ci_scan: '掃描家庭簽到卡',
      ci_clear: '清除', ci_back: '返回', ci_search: '找孩子',
      ci_pick_family: '請選擇您的家庭', ci_pick_kids: '請點選今天要簽到的孩子',
      ci_already: '已簽到', ci_go: '簽到', ci_none: '找不到資料。請確認號碼，或請同工協助。', ci_failed: '簽到沒有成功送出（可能是網路不穩），請再按一次「簽到」。',
      ci_done: '簽到完成！', ci_code: '接送碼', ci_code_hint: '接孩子時請出示這組號碼',
      ci_finish: '完成', ci_auto: '{s} 秒後回到首頁',
      ci_lock_title: '簽到站設定', ci_lock_hint: '請同工輸入簽到站密碼', ci_unlock: '解鎖', ci_checking: '確認中…', ci_searching: '查詢中，請稍等…', ci_nf_title: '找不到手機末四碼 {n}', ci_nf_body: '請再確認號碼；也可以試試另一位家長的手機末四碼，或掃描家庭簽到卡。還是找不到，請找同工協助。', ci_ne_title: '{n} 今年還沒報名 Awana', ci_ne_body: '有找到這個家庭，但今年還沒報名 Awana。請找同工協助，或在家長專區幫孩子報名。', ci_roster_ok: '名單已準備好（{n} 個家庭）', ci_roster_wait: '名單準備中…',
      ci_bad_key: '密碼錯誤', ci_locked_out: '錯誤太多次，請 10 分鐘後再試',
      ci_not_configured: '試算表還沒設定簽到站密碼', ci_staff: '同工',
      ci_relock: '鎖定這台簽到站', ci_scan_hint: '把卡片上的 QR code 對準鏡頭', ci_cam_err: '無法開啟相機',
    },
    en: {
      lang_btn: '中文', cancel: 'Cancel', close: 'Close', back: 'Back', required: 'required',
      demo: 'Demo mode: test data only, nothing goes to the real spreadsheet', demo_tools: 'Open demo inbox & spreadsheet',
      reg_title: 'Awana Registration', reg_sub: 'WCEC Children\'s Ministry',
      closed: 'Registration is not open right now. Please watch for church announcements.',
      parent: 'Parent', parent_name: 'Parent name', first: 'First name', last: 'Last name', name_hint: '', phone: 'Mobile phone', email: 'Email',
      phone_hint: 'At check-in, the last 4 digits find your children', email_hint: 'You\'ll sign in to the Parent Area with this email. No password.',
      emergency: 'Emergency contact', emergency_name: 'Name (someone other than parent)', emergency_phone: 'Phone',
      pickup: 'Others allowed to pick up (optional)', pickup_hint: 'e.g. Grandma Mary Wang 302-555-0000',
      kids: 'Children', kid_n: 'Child {n}', kid_name: 'Child\'s name',
      grade: 'Grade this school year', grade_pick: 'Choose', cls: 'Club',
      notes: 'Allergies or special needs (optional)', notes_hint: 'Seen only by children\'s ministry staff, never on the check-in screen',
      add_kid: '+ Add another child', remove: 'Remove',
      consent: 'I agree that the church may use this information for Awana registration, check-in, and emergency contact. It is stored in the church\'s Google account and not shared with others.',
      submit: 'Submit', sending: 'Sending…', checking: 'Checking…',
      err_required: 'Required', err_phone: 'Enter a 10-digit phone number',
      err_email: 'Check the email address', err_consent: 'Please check to agree', err_fix: 'Some fields need attention (see red text)',
      have_account: 'Registered before?', go_parent: 'Go to the Parent Area',
      dup_strong_title: 'You\'re already registered',
      dup_strong_email: 'This email is already registered.', dup_strong_phone: 'This phone number is already registered.',
      dup_strong_body: 'No need to register again. Confirm with your original email to open the Parent Area, where you can register children or update information.',
      dup_send: 'Send confirmation to {email}',
      dup_maybe_title: 'Is this your family?',
      dup_maybe_body: 'We found a family with the same name. If it\'s yours, confirm with the original email so we don\'t create a duplicate.',
      dup_reason_parent: 'same parent name', dup_reason_kid: 'same child name', dup_parent: 'Parent', dup_email: 'Email',
      dup_its_me: 'That\'s me, send confirmation to this email',
      dup_old_email: 'That\'s me, but I no longer use that email',
      dup_not_me: 'None of these are me, continue as a new family',
      dup_old_title: 'We\'ll create a new registration for now',
      dup_old_body: 'After you submit, our staff will merge your old records. From now on, sign in with the email you entered today.',
      dup_old_go: 'OK, submit',

      reg_logged_in: 'You\'re already signed in to the Parent Area. Re-register returning children or add new ones there. No need to fill out this form.',
      reg_new_anyway: 'Fill out a new form for a different family',
      en_title: 'Awana {year} registration is open', en_body: 'No need to fill out the form again. Just check the children attending this year.',
      en_btn: 'Register for {year}', en_dialog: 'Register for Awana {year}',
      en_pick: 'Check the children attending this year and confirm their grade:', en_last: 'Last year: {grade}',
      en_grad: 'Graduated from Awana (6th grade last year)',
      en_contact_q: 'Is your contact information still correct?', en_contact_edit: 'Edit contact information',
      en_submit: 'Submit', en_none: 'Please check at least one child', en_done: 'Registered: {names}',
      en_new_kid: 'Child not listed? Tap "+ Add a child".',
      st_enrolled: 'Registered for {year}', st_not: 'Not registered for {year}', st_grad: 'Graduated from Awana',
      wd_link: 'Not attending this year', wd_q: 'Is {name} not attending Awana this year? We\'ll keep their information so you can register again later.',
      wd_yes: 'Yes, not attending this year', wd_done: '{name} has been removed from this year',
      closed_short: 'Registration for {year} is not open right now.', grade_this: 'Grade this school year',
      ok_title: 'You\'re registered!', ok_enter: 'Open the Parent Area',
      ok_enter_hint: 'See your children, your family check-in card, and update information anytime.',
      ok_or: 'At check-in, just enter {last4} (last 4 of your phone) on the front-desk iPad.',
      ok_dup: 'This phone or email was already registered, so the new children were added to your existing family. Confirm with your original email to open the Parent Area.',
      ok_none: 'These children were already registered. No need to register again.',
      ok_mail: 'A confirmation email is on its way.', again: 'Fill out another form',
      pz_title: 'Parent Area', pz_sub: 'WCEC Children\'s Ministry',
      pz_login_title: 'Sign in to the Parent Area',
      pz_login_hint: 'Enter the email you registered with. We\'ll send you a confirmation email. No password.',
      pz_send: 'Send confirmation', pz_sending: 'Sending…',
      pz_no_account: 'This email isn\'t registered yet. If another parent in your family registered, ask them to add you in the Parent Area. New families, please register first.',
      pz_first_time: 'New to Awana?', pz_register: 'Register a new family',
      pz_wait_title: 'Check your email', pz_wait_body: 'We sent an email to {email}. Open it and tap "It\'s me".',
      pz_wait_num: 'The confirmation page will show this number. Make sure it matches:',
      pz_wait_auto: 'Once you confirm, this screen opens the Parent Area automatically.',
      pz_code_label: 'Can\'t use the button? Enter the 6-digit code from the email', pz_code_btn: 'Sign in with code',
      pz_resend: 'Send again', pz_other_email: 'Use a different email',
      pz_spam: 'No email? Check your spam folder, or wait a minute and tap "Send again".',
      pz_hello: 'My Family', pz_kids: 'Children', pz_edit: 'Edit', pz_add_kid: '+ Add a child',
      pz_no_kids: 'No children yet.', pz_not_current: 'Not registered for {year}', pz_enroll: 'Register for {year}',
      pz_notes: 'Allergies / special needs',
      pz_card: 'Family check-in card', pz_card_hint: 'Let the front-desk iPad scan this card, or enter {last4} (last 4 of your phone).',
      pz_contact: 'Contact information', pz_parents: 'Parents who can sign in', pz_you: 'you', pz_main: 'main',
      pz_invite: '+ Invite another parent',
      pz_invite_hint: 'Enter the other parent\'s email. They can sign in to the Parent Area in the WCEC app with it and see the same children.',
      pz_invite_send: 'Add and send notice', pz_invited: 'Added. We sent a notice to {email}',
      pz_remove_q: 'Remove {email}? They will no longer be able to sign in to this family.', pz_remove: 'Remove',
      pz_main_note: 'To change the main email, please contact the children\'s ministry staff.',
      pz_logout: 'Sign out on this phone', pz_logout_q: 'Next time you\'ll need to confirm by email again.', pz_logout_yes: 'Sign out',
      pz_save: 'Save', pz_saving: 'Saving…', pz_saved: 'Saved',
      pz_kid_edit: 'Edit child', pz_kid_new: 'Add a child', pz_family_edit: 'Edit contact information',
      pz_staff_note: 'Questions? Contact the children\'s ministry staff.',
      cf_title: 'Confirm sign-in', cf_num: 'The number shown in the app is', cf_hint: 'If the number matches, tap the button below. If you weren\'t trying to sign in, just close this page.',
      cf_btn: 'It\'s me', cf_done_title: 'Confirmed!',
      cf_done_body: 'Go back to the WCEC app or the page you were on. The Parent Area will open automatically. You can close this page.',
      cf_expired: 'This link has expired or was already used. Go back to the app and send a new one.',
      e_closed: 'Registration is closed.', e_too_many: 'Too many tries. Please wait 10 minutes.',
      e_invalid: 'Some information is missing. Please check and try again.', e_network: 'Connection failed. Check your internet and try again.',
      e_server_error: 'Something went wrong. Please try again later.', e_auth: 'Your sign-in expired. Please confirm by email again.',
      e_expired: 'This confirmation expired. Please send a new one.', e_bad_code: 'That code doesn\'t match. Check the email again.',
      e_no_email: 'This family has no email on file. Please contact the staff.',
      e_phone_taken: 'This phone number belongs to another family. Please contact the staff.',
      e_email_taken: 'This email belongs to another family. Please contact the staff.',
      ci_title: 'Awana Check-in', ci_enter: 'Enter the last 4 digits of the parent\'s phone', ci_scan: 'Scan family card',
      ci_clear: 'Clear', ci_back: 'Back', ci_search: 'Find',
      ci_pick_family: 'Choose your family', ci_pick_kids: 'Tap the children checking in today',
      ci_already: 'Checked in', ci_go: 'Check in', ci_none: 'Not found. Check the number or ask a staff member.', ci_failed: 'Check-in didn\'t go through (the connection may be unstable). Please tap Check in again.',
      ci_done: 'All checked in!', ci_code: 'Pickup code', ci_code_hint: 'Show this code when picking up',
      ci_finish: 'Done', ci_auto: 'Returning in {s}s',
      ci_lock_title: 'Station setup', ci_lock_hint: 'Staff: enter the station password', ci_unlock: 'Unlock', ci_checking: 'Checking…', ci_searching: 'Looking up, one moment…', ci_nf_title: 'No family found for {n}', ci_nf_body: 'Please check the number, try the other parent\'s phone, or scan the family card. Still not found? Please ask a staff member.', ci_ne_title: '{n} isn\'t registered for Awana this year', ci_ne_body: 'We found this family, but no child is registered for Awana this year. Please ask a staff member, or register in the Parent Area.', ci_roster_ok: 'List ready ({n} families)', ci_roster_wait: 'Preparing list…',
      ci_bad_key: 'Wrong password', ci_locked_out: 'Too many tries. Wait 10 minutes.',
      ci_not_configured: 'Station password is not set in the spreadsheet', ci_staff: 'Staff',
      ci_relock: 'Lock this station', ci_scan_hint: 'Hold the QR code up to the camera', ci_cam_err: 'Could not open the camera',
    },
  };

  // ─────────────── 第二版：報名表 4 步驟、家長專區 iPhone 風格 ───────────────
  Object.assign(STR.zh, {
    r_title: 'Awana／主日學報名', r_step: '第 {n} 步，共 4 步：{name}',
    r_s1: '孩子', r_s2: '家長', r_s3: '接送與緊急聯絡', r_s4: '服事與同意書',
    r_kids_h: '孩子資料', r_kids_lead: '請填英文名字。每個孩子可以分別選要參加的項目。',
    birthday: '生日', grade_year: '{year} 學年的年級', programs: '要參加的項目', at_least_one: '至少選一個',
    awana: 'Awana', awana_d: '週五晚上', ss: '主日學', ss_d: '主日上午',
    r_parent_h: '家長／監護人', r_parent_lead: '您的 Email 之後用來登入家長專區，不用密碼。',
    relation: '與孩子的關係', relation_short: '關係', optional: '選填',
    address: '住址', street: 'Street address', city: 'City', state: 'State', zip: 'ZIP',
    second_h: '第二位家長／監護人', second_hint: '填了 Email，他也能用自己的 Email 登入家長專區。',
    pick_h: '授權接送人', pick_lead: '除了家長以外，可以來接孩子的人。第一位同時是<b>緊急聯絡人</b>（聯絡不到家長時打給他）。',
    pick_n: '接送人 {n}', pick_1: '接送人 1 · 緊急聯絡人', add_pickup: '＋ 再加一位',
    vol_h: '願意一起服事嗎？', vol_lead: '不勾也沒關係。', vol_awana: '我願意在 Awana 服事', vol_ss: '我願意在主日學服事',
    release_h: 'Release of Liability', release_lead: '家長同意書，內容跟紙本報名表相同。',
    sign_h: 'Parent Signature', sign_hint: '請用手指在下面的框裡簽名。', sign_clear: '清除重簽', sign_need: '請在框裡簽名',
    sum_h: '確認資料', edit_kids: '修改孩子資料', edit_parent: '修改家長資料',
    next: '下一步', prev: '上一步', submit_reg: '送出報名', choose: '請選擇',
    err_bday: '請選擇生日（月、日、年都要選）', err_bday_bad: '這個日期不存在，請再確認', dob_m: '月', dob_d: '日', dob_y: '年', err_prog: '至少選一個項目', e_signature: '簽名沒有成功送出，請再簽一次。',
    e_need_pickup: '請至少填一位接送人（緊急聯絡人）',
    p_family_of: '{name} 的家庭', p_add_kid: '新增孩子', p_last: '去年 {grade}',
    p_parent: '家長', p_phone: '手機', p_emergency: '緊急聯絡人', p_pickups: '其他接送人', p_address: '住址', p_second: '第二位家長',
    p_edit: '編輯', p_contact_title: '聯絡資料', p_enroll_title: '報名 {year}', p_submit: '送出', p_save: '儲存', p_cancel: '取消',
    p_this_year: '今年參加', p_grade_this: '今年年級', p_enroll_hint: '勾選今年要參加的孩子和項目，年級已經幫您往上一級。',
    p_sign_title: '{year} 家長同意書', p_signed: '今年的同意書已經簽過了。', p_release_more: '看同意書全文',
    p_withdraw: '這學年不參加了', p_programs_this: '今年參加的項目',
    p_none: '還沒有孩子的資料。', p_closed: '{year} 目前沒有開放報名。',
    p_signout: '登出這支手機', p_invite: '邀請另一位家長', p_main_you: '主要 · 您', p_main: '主要', p_you: '您',
  });
  Object.assign(STR.en, {
    r_title: 'Awana / Sunday School Registration', r_step: 'Step {n} of 4: {name}',
    r_s1: 'Children', r_s2: 'Parent', r_s3: 'Pickup & emergency', r_s4: 'Serving & release',
    r_kids_h: 'Children', r_kids_lead: 'Please use English names. Choose programs for each child.',
    birthday: 'Birthday', grade_year: 'Grade in {year}', programs: 'Programs', at_least_one: 'choose at least one',
    awana: 'Awana', awana_d: 'Friday evening', ss: 'Sunday School', ss_d: 'Sunday morning',
    r_parent_h: 'Parent / guardian', r_parent_lead: 'Your email is how you sign in to the Parent Area. No password.',
    relation: 'Relationship to child', relation_short: 'Relationship', optional: 'optional',
    address: 'Address', street: 'Street address', city: 'City', state: 'State', zip: 'ZIP',
    second_h: 'Second parent / guardian', second_hint: 'With an email, they can sign in to the Parent Area too.',
    pick_h: 'Authorized pickup', pick_lead: 'People other than parents who may pick up your children. The first one is also the <b>emergency contact</b>.',
    pick_n: 'Pickup {n}', pick_1: 'Pickup 1 · Emergency contact', add_pickup: '+ Add another',
    vol_h: 'Would you like to serve?', vol_lead: 'Optional.', vol_awana: 'I\'d like to volunteer at Awana', vol_ss: 'I\'d like to volunteer at Sunday School',
    release_h: 'Release of Liability', release_lead: 'Same as the paper registration form.',
    sign_h: 'Parent Signature', sign_hint: 'Sign with your finger in the box below.', sign_clear: 'Clear', sign_need: 'Please sign in the box',
    sum_h: 'Review', edit_kids: 'Edit children', edit_parent: 'Edit parent',
    next: 'Next', prev: 'Back', submit_reg: 'Submit', choose: 'Choose',
    err_bday: 'Choose month, day and year', err_bday_bad: 'That date doesn\'t exist. Please check it.', dob_m: 'Month', dob_d: 'Day', dob_y: 'Year', err_prog: 'Choose at least one program', e_signature: 'The signature didn\'t go through. Please sign again.',
    e_need_pickup: 'Please add at least one pickup person (emergency contact)',
    p_family_of: '{name}\'s family', p_add_kid: 'Add a child', p_last: 'Last year: {grade}',
    p_parent: 'Parent', p_phone: 'Phone', p_emergency: 'Emergency contact', p_pickups: 'Other pickups', p_address: 'Address', p_second: 'Second parent',
    p_edit: 'Edit', p_contact_title: 'Contact information', p_enroll_title: 'Register for {year}', p_submit: 'Submit', p_save: 'Save', p_cancel: 'Cancel',
    p_this_year: 'Attending this year', p_grade_this: 'Grade this year', p_enroll_hint: 'Check the children and programs for this year. Grades have been moved up one level.',
    p_sign_title: '{year} Release of Liability', p_signed: 'You already signed this year\'s release.', p_release_more: 'Read the full release',
    p_withdraw: 'Not attending this year', p_programs_this: 'Programs this year',
    p_none: 'No children yet.', p_closed: 'Registration for {year} is not open right now.',
    p_signout: 'Sign out on this phone', p_invite: 'Invite another parent', p_main_you: 'Main · You', p_main: 'Main', p_you: 'You',
  });

  // 關係選單：試算表存中文，畫面依語言顯示
  var RELATIONS = [['父親', 'Father'], ['母親', 'Mother'], ['祖父母', 'Grandparent'], ['監護人', 'Guardian'],
                   ['親戚', 'Relative'], ['朋友', 'Friend'], ['保母', 'Babysitter'], ['其他', 'Other']];
  function relationLabel(v) { var r = RELATIONS.filter(function (x) { return x[0] === v; })[0]; return r ? (lang === 'en' ? r[1] : r[0]) : (v || ''); }
  function relationOptions(sel, list) {
    return '<option value="">' + t('choose') + '</option>' + RELATIONS.filter(function (r) { return !list || list.indexOf(r[0]) >= 0; }).map(function (r) {
      return '<option value="' + r[0] + '"' + (r[0] === sel ? ' selected' : '') + '>' + (lang === 'en' ? r[1] : r[0]) + '</option>';
    }).join('');
  }
  function programLabel(p) { return p === 'Awana' ? 'Awana' : t('ss'); }

  // 同意書：跟紙本報名表一字不改
  var RELEASE_HTML =
    '<p>I hereby release WCEC, AWANA volunteers and Sunday School teachers, from any and all liability for damage to or loss of personal property, sickness or injury while participating in the Event activities.</p>' +
    '<p>I hereby state that my child is in sufficient physical condition to accept all Event activities. I understand that participation in this program is strictly voluntary and I freely chose to participate.</p>' +
    '<p>I understand that WCEC doesn’t provide medical coverage for me. I verify that I will be responsible for any medical costs my child may incur as a result of participation.</p>' +
    '<p>I give permission for WCEC to photograph and making video my child(ren) for promotional and internal use.</p>';

  // 手寫簽名板
  function signaturePad(canvas) {
    var ctx = canvas.getContext('2d'), drawing = false, strokes = 0, w = 0, h = 0;
    function size() {
      var r = canvas.getBoundingClientRect(), d = window.devicePixelRatio || 1;
      if (!r.width) return;
      w = r.width; h = r.height;
      canvas.width = w * d; canvas.height = h * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1c2540';
      strokes = 0;
    }
    function pt(e) { var r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    canvas.addEventListener('pointerdown', function (e) {
      if (!w) size();
      canvas.setPointerCapture(e.pointerId); drawing = true; var p = pt(e); ctx.beginPath(); ctx.moveTo(p[0], p[1]);
    });
    canvas.addEventListener('pointermove', function (e) { if (!drawing) return; var p = pt(e); ctx.lineTo(p[0], p[1]); ctx.stroke(); strokes++; });
    canvas.addEventListener('pointerup', function () { drawing = false; });
    canvas.addEventListener('pointercancel', function () { drawing = false; });
    setTimeout(size, 0);
    return {
      resize: size,
      clear: function () { ctx.clearRect(0, 0, w, h); strokes = 0; },
      isEmpty: function () { return strokes < 3; },
      // 縮成 1 倍大小再存，檔案比較小
      toDataURL: function () {
        var c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h);
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
        x.drawImage(canvas, 0, 0, c.width, c.height);
        return c.toDataURL('image/png');
      },
      demo: function () {   // 測試用：畫一個示意簽名
        if (!w) size();
        ctx.beginPath(); ctx.moveTo(30, 110);
        [[60, 50], [80, 120], [105, 60], [125, 115], [150, 70], [175, 112], [210, 80], [250, 100], [300, 85]].forEach(function (q) { ctx.lineTo(q[0], q[1]); });
        ctx.stroke(); strokes = 20;
      },
    };
  }

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }
  function forget(k) { try { localStorage.removeItem(k); } catch (e) {} }

  var qs = new URLSearchParams(location.search);

  // ─────────────── App 嵌入模式 ───────────────
  // WCEC App 打開網頁時帶 ?embed=1&lang=zh&theme=dark：網頁藏起自己的標題和語言鍵，配合 App 的外觀
  var EMBED = qs.get('embed') === '1';
  var root = document.documentElement;
  if (EMBED) root.classList.add('embed');
  if (qs.get('theme') === 'dark' || qs.get('theme') === 'light') root.setAttribute('data-theme', qs.get('theme'));

  // 預設中文；App 會帶 lang；家長切換過會記住
  var lang = (qs.get('lang') || store('wcec_lang') || 'zh').toLowerCase().indexOf('en') === 0 ? 'en' : 'zh';
  function t(key, vars) {
    var s = (STR[lang] && STR[lang][key]) || STR.zh[key] || '';
    Object.keys(vars || {}).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  function setLang(l) { lang = l; store('wcec_lang', l); root.lang = l === 'en' ? 'en' : 'zh-Hant'; }
  setLang(lang);

  // 換頁時保留 embed、lang、theme 參數
  function link(page, extra) {
    var p = new URLSearchParams();
    ['embed', 'theme'].forEach(function (k) { if (qs.get(k)) p.set(k, qs.get(k)); });
    p.set('lang', lang);
    Object.keys(extra || {}).forEach(function (k) { p.set(k, extra[k]); });
    return page + '?' + p.toString();
  }

  // ─────────────── 登入權杖 ───────────────
  // 在 App 裡：App 會在載入前放進 window.__WCEC_APP_TOKEN，存到 iPhone 鑰匙圈（透過 WCECApp 頻道）
  // 在瀏覽器：存在這個網站的 localStorage
  function getToken() { return window.__WCEC_APP_TOKEN || store('wcec_token') || ''; }
  function setToken(tok) {
    window.__WCEC_APP_TOKEN = tok || '';
    if (tok) store('wcec_token', tok); else forget('wcec_token');
    try { if (window.WCECApp && window.WCECApp.postMessage) window.WCECApp.postMessage(JSON.stringify({ type: 'token', token: tok || '' })); } catch (e) {}
  }
  // App 裡：開頁時跟 App 要鑰匙圈裡的權杖（App 用 window.__wcecAppToken(tok) 回覆），最多等 1.5 秒
  function appToken(cb) {
    var ch = window.WCECApp;
    if (!EMBED || window.__WCEC_APP_TOKEN || !(ch && ch.postMessage)) { cb(); return; }
    var done = false;
    function fin() { if (!done) { done = true; cb(); } }
    window.__wcecAppToken = function (tok) {
      if (tok && typeof tok === 'string') { window.__WCEC_APP_TOKEN = tok; store('wcec_token', tok); }
      fin();
    };
    try { ch.postMessage(JSON.stringify({ type: 'hello' })); } catch (e) { fin(); return; }
    setTimeout(fin, 1500);
  }
  function deviceLabel() {
    var ua = navigator.userAgent;
    var d = /iPad/.test(ua) ? 'iPad' : /iPhone/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : '其他';
    return d + (EMBED ? ' · App' : ' · 瀏覽器');
  }

  // ─────────────── 後端 ───────────────
  var API = (window.WCEC_CONFIG || {}).API_URL;
  var DEMO = !API;

  function call(action, data) {
    var body = Object.assign({ action: action }, data || {});
    if (DEMO) {
      return new Promise(function (r) { setTimeout(r, 350); })
        .then(function () { return window.WCEC_DEMO.call(body); })
        .catch(function (e) { console.error(e); return { ok: false, error: 'server_error' }; });
    }
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, error: 'network' }; });
  }
  function errText(code) { return t('e_' + (code || 'network')) || t('e_server_error'); }

  // ─────────────── 小工具 ───────────────
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function loadScript(src) {
    return new Promise(function (ok, fail) {
      var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
    });
  }

  // ─── 生日：月／日／年 三個下拉選單（iPhone 的日期輪盤長輩不好選，空白時還會顯示今天，像是已經填了）───
  var MON_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function dobParts(v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? { y: m[1], m: String(+m[2]), d: String(+m[3]) } : { y: '', m: '', d: '' }; }
  function dateSelects(id, value, attrs) {
    var p = typeof value === 'object' && value ? value : dobParts(value), a = attrs || '', yNow = new Date().getFullYear(), i, h;
    function opt(v, label, sel) { return '<option value="' + v + '"' + (String(sel) === String(v) ? ' selected' : '') + '>' + label + '</option>'; }
    h = '<div class="dob" style="display:grid;grid-template-columns:1.15fr 1fr 1.2fr;gap:8px"><select id="' + id + '_m" data-part="m" aria-label="' + t('dob_m') + '" ' + a + '>' + opt('', t('dob_m'), p.m);
    for (i = 1; i <= 12; i++) h += opt(i, lang === 'en' ? MON_EN[i - 1] : i + ' 月', p.m);
    h += '</select><select id="' + id + '_d" data-part="d" aria-label="' + t('dob_d') + '" ' + a + '>' + opt('', t('dob_d'), p.d);
    for (i = 1; i <= 31; i++) h += opt(i, lang === 'en' ? i : i + ' 日', p.d);
    h += '</select><select id="' + id + '_y" data-part="y" aria-label="' + t('dob_y') + '" ' + a + '>' + opt('', t('dob_y'), p.y);
    for (i = yNow; i >= yNow - 19; i--) h += opt(i, i, p.y);
    return h + '</select></div>';
  }
  // 回傳 'yyyy-mm-dd'；沒選完回傳 ''；日期不存在（例如 2/30）回傳 'bad'
  function dobValue(p) {
    if (!p || !p.y || !p.m || !p.d) return '';
    var y = +p.y, m = +p.m, d = +p.d, dt = new Date(y, m - 1, d);
    if (dt.getMonth() !== m - 1) return 'bad';
    return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
  }
  function readDate(root, id) {
    function v(k) { var el = root.querySelector('#' + id + '_' + k); return el ? el.value : ''; }
    return dobValue({ y: v('y'), m: v('m'), d: v('d') });
  }

  function fmtPhone(p) {
    p = String(p || '').replace(/\D/g, '');
    return p.length === 10 ? p.slice(0, 3) + '-' + p.slice(3, 6) + '-' + p.slice(6) : p;
  }

  // 「1」→「1 年級」/「Grade 1」；「K」、「3歲」等照原樣
  function gradeLabel(g) {
    g = String(g || '');
    if (/^\d+$/.test(g)) return lang === 'en' ? 'Grade ' + g : g + ' 年級';
    if (lang === 'en') return g.replace('2歲', 'Age 2').replace('3歲', 'Age 3').replace('4歲', 'Age 4');
    return g;
  }

  function demoBar() {
    return DEMO ? '<div class="demo">' + t('demo') + ' · <a href="demo/index.html" target="_blank" rel="noopener">' + t('demo_tools') + '</a></div>' : '';
  }

  // 置中的對話框（長輩友善：不用底部抽屜，按鈕大）
  function dialog(opts) {
    var back = document.createElement('div');
    back.className = 'dlg-back';
    back.innerHTML = '<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlg-t"><h2 id="dlg-t">' + esc(opts.title) + '</h2>' +
      '<div class="dlg-body">' + (opts.body || '') + '</div><div class="dlg-actions"></div></div>';
    var box = back.querySelector('.dlg-actions');
    function close() { back.remove(); if (!document.querySelector('.dlg-back')) document.body.classList.remove('dlg-open'); }
    (opts.actions || [{ label: t('close') }]).forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn block' + (a.kind === 'ghost' ? ' ghost' : a.kind === 'link' ? ' linkbtn' : '');
      b.textContent = a.label;
      b.onclick = function () { var keep = a.onClick && a.onClick(close, back); if (!keep) close(); };
      box.appendChild(b);
    });
    document.body.appendChild(back);
    document.body.classList.add('dlg-open');
    var first = back.querySelector('input, select, textarea, button');
    if (first) first.focus();
    return { close: close, el: back };
  }

  function toast(msg) {
    var el = document.createElement('div');
    el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2600);
  }

  window.WCEC = {
    t: t, lang: function () { return lang; }, setLang: setLang, call: call, errText: errText, DEMO: DEMO, EMBED: EMBED,
    store: store, forget: forget, esc: esc, loadScript: loadScript, link: link, fmtPhone: fmtPhone,
    getToken: getToken, setToken: setToken, appToken: appToken, dateSelects: dateSelects, dobParts: dobParts, dobValue: dobValue, readDate: readDate, deviceLabel: deviceLabel, dialog: dialog, demoBar: demoBar, toast: toast, gradeLabel: gradeLabel,
    relationLabel: relationLabel, relationOptions: relationOptions, programLabel: programLabel, RELEASE_HTML: RELEASE_HTML, signaturePad: signaturePad,
  };
})();
