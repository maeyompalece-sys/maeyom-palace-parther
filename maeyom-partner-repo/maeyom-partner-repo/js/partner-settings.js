// ============================================================
// ⚙️ Partner Settings JS
// หน้าตั้งค่าร้าน: ชื่อ, icon, เบอร์, ที่ตั้ง, รหัสผ่าน
// ============================================================

// ── CSS สำหรับหน้าตั้งค่า (inject ครั้งเดียว) ───────────────
(function injectSettingsCSS() {
  if (document.getElementById('settings-css')) return;
  const style = document.createElement('style');
  style.id = 'settings-css';
  style.textContent = `
    .settings-wrap {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .shop-preview-card {
      background: linear-gradient(135deg, var(--em-dk), var(--em));
      border-radius: 16px;
      padding: 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      color: #fff;
    }
    .shop-preview-logo {
      width: 64px; height: 64px;
      border-radius: 14px;
      background: rgba(255,255,255,.2);
      display: flex; align-items: center; justify-content: center;
      font-size: 32px;
      flex-shrink: 0;
      overflow: hidden;
      border: 2px solid rgba(255,255,255,.3);
      cursor: pointer;
      position: relative;
    }
    .shop-preview-logo img { width: 100%; height: 100%; object-fit: cover; }
    .shop-preview-logo .logo-edit-hint {
      position: absolute; inset: 0;
      background: rgba(0,0,0,.4);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity .2s;
      font-size: 20px; border-radius: 12px;
    }
    .shop-preview-logo:hover .logo-edit-hint { opacity: 1; }
    .shop-preview-info { flex: 1; min-width: 0; }
    .shop-preview-name {
      font-size: 18px; font-weight: 700;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .shop-preview-id { font-size: 12px; opacity: .75; margin-top: 2px; }
    .shop-preview-loc { font-size: 12px; opacity: .85; margin-top: 4px; }

    .settings-card {
      background: #fff;
      border-radius: 14px;
      border: 1px solid var(--cream-dk, #e8e0d4);
      overflow: hidden;
    }
    .settings-card-head {
      padding: 12px 14px;
      border-bottom: 1px solid var(--cream-dk, #e8e0d4);
      font-size: 12px;
      font-weight: 700;
      color: var(--stone, #8B7355);
      text-transform: uppercase;
      letter-spacing: .05em;
    }
    .settings-row {
      display: flex;
      align-items: center;
      padding: 12px 14px;
      gap: 10px;
      border-bottom: 1px solid var(--cream-dk, #e8e0d4);
    }
    .settings-row:last-child { border-bottom: none; }
    .settings-row-icon { font-size: 18px; flex-shrink: 0; width: 24px; text-align: center; }
    .settings-row-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--stone, #8B7355);
      flex-shrink: 0;
      width: 80px;
    }
    .settings-input {
      flex: 1;
      border: none;
      background: transparent;
      font-family: 'Sarabun', sans-serif;
      font-size: 14px;
      color: var(--charcoal, #2C1810);
      outline: none;
      min-width: 0;
    }
    .settings-input::placeholder { color: #bbb; }
    .settings-row.editing {
      background: rgba(101,23,19,.04);
    }
    .settings-row.editing .settings-input {
      border-bottom: 1.5px solid var(--em, #651713);
    }
    .logo-upload-section { padding: 14px; }
    .logo-upload-area {
      border: 2px dashed var(--cream-dk, #e8e0d4);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      transition: border-color .2s;
    }
    .logo-upload-area:hover { border-color: var(--em, #651713); }
    .logo-upload-preview {
      width: 56px; height: 56px;
      border-radius: 12px;
      background: var(--cream-lt, #fdf8f3);
      display: flex; align-items: center; justify-content: center;
      font-size: 28px;
      flex-shrink: 0;
      overflow: hidden;
    }
    .logo-upload-preview img { width: 100%; height: 100%; object-fit: cover; border-radius: 10px; }
    .logo-upload-text { flex: 1; }
    .logo-upload-title { font-size: 13px; font-weight: 600; color: var(--charcoal, #2C1810); }
    .logo-upload-sub { font-size: 11px; color: var(--stone, #8B7355); margin-top: 2px; }

    .btn-settings-save {
      width: 100%;
      padding: 14px;
      background: var(--em, #651713);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-family: 'Sarabun', sans-serif;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: filter .2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .btn-settings-save:hover { filter: brightness(1.1); }
    .btn-settings-save:disabled { opacity: .6; cursor: not-allowed; }

    .pass-section-note {
      font-size: 12px;
      color: var(--stone, #8B7355);
      padding: 0 14px 10px;
      margin: 0;
    }
    .pass-toggle {
      background: none; border: none; cursor: pointer;
      font-size: 16px; padding: 0 4px; color: var(--stone, #8B7355);
    }
    .danger-section {
      background: #FFF5F5;
      border-radius: 14px;
      border: 1px solid #FED7D7;
      overflow: hidden;
    }
    .danger-section-head {
      padding: 12px 14px;
      border-bottom: 1px solid #FED7D7;
      font-size: 12px;
      font-weight: 700;
      color: #C53030;
      text-transform: uppercase;
      letter-spacing: .05em;
    }
    .btn-danger {
      width: calc(100% - 28px);
      margin: 12px 14px;
      padding: 12px;
      background: #FFF5F5;
      color: #C53030;
      border: 1.5px solid #FEB2B2;
      border-radius: 10px;
      font-family: 'Sarabun', sans-serif;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all .2s;
    }
    .btn-danger:hover { background: #FED7D7; }
  `;
  document.head.appendChild(style);
})();

// ── State ─────────────────────────────────────────────────
let _settingsInitialized = false;
let _logoFile = null;

// ── Init ──────────────────────────────────────────────────
function initPartnerSettings() {
  if (_settingsInitialized) return;
  _settingsInitialized = true;
  document.querySelectorAll('.tab').forEach(tab => {
    if (tab.dataset.tab === 'settings') {
      tab.addEventListener('click', renderSettingsPane);
    }
  });
}

// ── Render ────────────────────────────────────────────────
function renderSettingsPane() {
  const container = document.getElementById('settings-content');
  if (!container) return;

  const logoHtml = PARTNER.logoUrl
    ? `<img src="${PARTNER.logoUrl}" id="preview-logo-img">`
    : `<span id="preview-logo-emoji">🏪</span>`;

  container.innerHTML = `
    <div class="settings-wrap">

      <div class="shop-preview-card">
        <div class="shop-preview-logo" onclick="document.getElementById('logo-file-input').click()">
          ${logoHtml}
          <div class="logo-edit-hint">📷</div>
        </div>
        <div class="shop-preview-info">
          <div class="shop-preview-name" id="preview-shop-name">${esc2(PARTNER.name || PARTNER.id)}</div>
          <div class="shop-preview-id">ID: ${esc2(PARTNER.id)}</div>
          <div class="shop-preview-loc" id="preview-shop-loc">${esc2(PARTNER.location || '')}</div>
        </div>
      </div>

      <div class="settings-card">
        <div class="settings-card-head">ข้อมูลร้าน</div>
        <div class="settings-row">
          <span class="settings-row-icon">🏪</span>
          <span class="settings-row-label">ชื่อร้าน</span>
          <input class="settings-input" id="set-name" value="${esc2(PARTNER.name || '')}"
            placeholder="ชื่อร้านของคุณ"
            oninput="document.getElementById('preview-shop-name').textContent = this.value || '${esc2(PARTNER.id)}'"
            onfocus="this.closest('.settings-row').classList.add('editing')"
            onblur="this.closest('.settings-row').classList.remove('editing')">
        </div>
        <div class="settings-row">
          <span class="settings-row-icon">📞</span>
          <span class="settings-row-label">เบอร์โทร</span>
          <input class="settings-input" id="set-phone" value="${esc2(PARTNER.phone || '')}"
            placeholder="0812345678" type="tel"
            onfocus="this.closest('.settings-row').classList.add('editing')"
            onblur="this.closest('.settings-row').classList.remove('editing')">
        </div>
        <div class="settings-row">
          <span class="settings-row-icon">📍</span>
          <span class="settings-row-label">ที่ตั้ง</span>
          <input class="settings-input" id="set-location" value="${esc2(PARTNER.location || '')}"
            placeholder="อาคาร / ชั้น / ห้อง"
            oninput="document.getElementById('preview-shop-loc').textContent = this.value"
            onfocus="this.closest('.settings-row').classList.add('editing')"
            onblur="this.closest('.settings-row').classList.remove('editing')">
        </div>
        <div class="settings-row">
          <span class="settings-row-icon">📝</span>
          <span class="settings-row-label">คำอธิบาย</span>
          <input class="settings-input" id="set-description" value="${esc2(PARTNER.description || '')}"
            placeholder="คำอธิบายร้านโดยย่อ"
            onfocus="this.closest('.settings-row').classList.add('editing')"
            onblur="this.closest('.settings-row').classList.remove('editing')">
        </div>
      </div>

      <div class="settings-card">
        <div class="settings-card-head">รูปโลโก้ร้าน</div>
        <div class="logo-upload-section">
          <div class="logo-upload-area" onclick="document.getElementById('logo-file-input').click()">
            <div class="logo-upload-preview" id="logo-upload-preview-box">
              ${PARTNER.logoUrl ? `<img src="${PARTNER.logoUrl}">` : '🏪'}
            </div>
            <div class="logo-upload-text">
              <div class="logo-upload-title">แตะเพื่อเลือกรูปภาพ</div>
              <div class="logo-upload-sub">JPG, PNG · แนะนำ 200×200px ขึ้นไป</div>
            </div>
            <span style="font-size:20px;color:var(--stone)">📷</span>
          </div>
          <input type="file" id="logo-file-input" accept="image/*" style="display:none" onchange="onLogoFileSelected(this)">
          <div id="logo-upload-status" style="font-size:12px;color:var(--stone);margin-top:8px;text-align:center;min-height:16px;"></div>
        </div>
      </div>

      <div class="settings-card">
        <div class="settings-card-head">เปลี่ยนรหัสผ่าน</div>
        <p class="pass-section-note">เว้นว่างถ้าไม่ต้องการเปลี่ยนรหัสผ่าน</p>
        <div class="settings-row">
          <span class="settings-row-icon">🔑</span>
          <span class="settings-row-label">รหัสใหม่</span>
          <input class="settings-input" id="set-new-pass" type="password"
            placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)"
            onfocus="this.closest('.settings-row').classList.add('editing')"
            onblur="this.closest('.settings-row').classList.remove('editing')">
          <button class="pass-toggle" onclick="togglePassVis('set-new-pass', this)" title="แสดง/ซ่อน">👁️</button>
        </div>
        <div class="settings-row">
          <span class="settings-row-icon">✅</span>
          <span class="settings-row-label">ยืนยัน</span>
          <input class="settings-input" id="set-confirm-pass" type="password"
            placeholder="ยืนยันรหัสผ่านอีกครั้ง"
            onfocus="this.closest('.settings-row').classList.add('editing')"
            onblur="this.closest('.settings-row').classList.remove('editing')">
          <button class="pass-toggle" onclick="togglePassVis('set-confirm-pass', this)" title="แสดง/ซ่อน">👁️</button>
        </div>
      </div>

      <button class="btn-settings-save" id="btn-settings-save" onclick="savePartnerSettings()">
        <span>💾</span><span>บันทึกการเปลี่ยนแปลง</span>
      </button>

      <div class="danger-section">
        <div class="danger-section-head">⚠️ Danger Zone</div>
        <button class="btn-danger" onclick="requestAccountDelete()">
          🗑️ ขอลบบัญชีร้านค้า
        </button>
      </div>

      <div style="height:20px"></div>
    </div>
  `;
}

// ── Logo File Selected ────────────────────────────────────
function onLogoFileSelected(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    if (typeof showToast === 'function') showToast('❌ รูปภาพต้องมีขนาดไม่เกิน 2MB', 'error');
    return;
  }
  _logoFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    const previewBox = document.getElementById('logo-upload-preview-box');
    if (previewBox) previewBox.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
    // อัปเดต preview card ด้านบน
    const shopPreviewLogo = document.querySelector('.shop-preview-logo');
    if (shopPreviewLogo) {
      const old = shopPreviewLogo.querySelector('img, span:not(.logo-edit-hint)');
      if (old) old.remove();
      const img = document.createElement('img');
      img.src = e.target.result;
      shopPreviewLogo.insertBefore(img, shopPreviewLogo.firstChild);
    }
    const statusEl = document.getElementById('logo-upload-status');
    if (statusEl) statusEl.textContent = `📎 ${file.name} (${(file.size/1024).toFixed(0)} KB) — กด "บันทึก" เพื่ออัปโหลด`;
  };
  reader.readAsDataURL(file);
}

// ── Save Settings ─────────────────────────────────────────
async function savePartnerSettings() {
  const name        = (document.getElementById('set-name')?.value || '').trim();
  const phone       = (document.getElementById('set-phone')?.value || '').trim();
  const location    = (document.getElementById('set-location')?.value || '').trim();
  const description = (document.getElementById('set-description')?.value || '').trim();
  const newPass     = (document.getElementById('set-new-pass')?.value || '').trim();
  const confirmPass = (document.getElementById('set-confirm-pass')?.value || '').trim();

  if (!name) {
    if (typeof showToast === 'function') showToast('❌ กรุณากรอกชื่อร้าน', 'error');
    return;
  }
  if (newPass || confirmPass) {
    if (newPass.length < 6) {
      if (typeof showToast === 'function') showToast('❌ รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'error');
      return;
    }
    if (newPass !== confirmPass) {
      if (typeof showToast === 'function') showToast('❌ รหัสผ่านไม่ตรงกัน', 'error');
      return;
    }
  }

  const btn = document.getElementById('btn-settings-save');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span>⏳</span><span>กำลังบันทึก...</span>'; }

  try {
    // 1. อัปโหลด logo ถ้ามีไฟล์ใหม่
    let logoUrl = PARTNER.logoUrl || '';
    if (_logoFile) {
      const statusEl = document.getElementById('logo-upload-status');
      if (statusEl) statusEl.textContent = '⏳ กำลังอัปโหลดรูปภาพ...';
      const uploaded = await API.uploadImage(_logoFile);
      logoUrl = uploaded.url || uploaded.imageUrl || '';
      _logoFile = null;
      if (statusEl) statusEl.textContent = '✅ อัปโหลดรูปภาพสำเร็จ';
    }

    // 2. บันทึกข้อมูล
    const payload = {
      partnerId: PARTNER.id,
      token: PARTNER.token,
      partnerName: name,
      phone,
      location,
      description,
      logoUrl,
    };
    if (newPass) payload.newPassword = newPass;
    await API.call('updatePartnerSettings', payload);

    // 3. อัปเดต PARTNER state
    PARTNER.name        = name;
    PARTNER.logoUrl     = logoUrl;
    PARTNER.phone       = phone;
    PARTNER.location    = location;
    PARTNER.description = description;

    // 4. อัปเดต localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('partner_session') || '{}');
      saved.name    = name;
      saved.logoUrl = logoUrl;
      localStorage.setItem('partner_session', JSON.stringify(saved));
    } catch(e) {}

    // 5. อัปเดต header
    const shopNameEl = document.getElementById('hdr-shop-name');
    if (shopNameEl) shopNameEl.textContent = name;
    const logoWrap = document.getElementById('hdr-logo');
    if (logoWrap) {
      logoWrap.innerHTML = logoUrl
        ? `<img src="${logoUrl}" style="width:36px;height:36px;border-radius:8px;object-fit:cover;border:2px solid rgba(255,255,255,.3);">`
        : `<div style="width:36px;height:36px;border-radius:8px;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:20px;">🏪</div>`;
    }

    // 6. ล้าง password fields
    const npEl = document.getElementById('set-new-pass');
    const cpEl = document.getElementById('set-confirm-pass');
    if (npEl) npEl.value = '';
    if (cpEl) cpEl.value = '';

    if (typeof showToast === 'function') showToast('✅ บันทึกข้อมูลร้านเรียบร้อย', 'success');
  } catch (err) {
    if (typeof showToast === 'function') showToast('❌ บันทึกล้มเหลว: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<span>💾</span><span>บันทึกการเปลี่ยนแปลง</span>'; }
  }
}

// ── Helpers ───────────────────────────────────────────────
function togglePassVis(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '👁️' : '🙈';
}

function requestAccountDelete() {
  if (!confirm(`⚠️ ขอลบบัญชีร้านค้า "${PARTNER.name}" ?\n\nระบบจะแจ้งแอดมินเพื่อดำเนินการต่อไป\nคุณยังใช้งานได้จนกว่าแอดมินจะอนุมัติ`)) return;
  API.call('requestPartnerDelete', { partnerId: PARTNER.id, token: PARTNER.token })
    .then(() => { if (typeof showToast === 'function') showToast('📨 ส่งคำขอลบบัญชีแล้ว — รอแอดมินยืนยัน', 'info'); })
    .catch(err => { if (typeof showToast === 'function') showToast('❌ ' + err.message, 'error'); });
}

function esc2(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}
