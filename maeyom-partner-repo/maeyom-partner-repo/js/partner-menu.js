// ============================================================
// 🍽️ Partner Menu Manager
// แท็บ "เมนูของฉัน" ใน Partner App — เพิ่ม/แก้/ลบ/ปิด-เปิดเมนู
// ============================================================
// วิธีใช้: โหลดไฟล์นี้ใน partner-app.html ต่อจาก partner-app.js
// <script src="js/partner-menu.js"></script>
// ============================================================

const PMENU = {
    items: [],       // เมนูของร้านนี้
    editing: null,   // item ที่กำลังแก้ไข
    pendingImage: null,
};

// ============================================================
// 🚀 Init — เรียกหลัง startApp()
// ============================================================
function initPartnerMenu() {
    renderMenuTab();
    bindMenuEvents();
    loadPartnerMenu();
}

// ============================================================
// 🎨 Render แท็บเมนูใน DOM
// เพิ่ม tab "เมนูของฉัน" เข้าไปใน .tabs และ pane ใหม่
// ============================================================
function renderMenuTab() {
    // Tab มีอยู่แล้วใน index.html — แค่ bind event
    const existingTab = document.querySelector('[data-tab="menu"]');
    if (existingTab) {
        existingTab.addEventListener('click', () => switchTab('menu'));
    } else {
        // ถ้าไม่มี ค่อยสร้างใหม่
        const tabs = document.querySelector('.tabs');
        if (tabs) {
            const btn = document.createElement('div');
            btn.className = 'tab';
            btn.dataset.tab = 'menu';
            btn.innerHTML = '🍽️ เมนูของฉัน';
            btn.addEventListener('click', () => switchTab('menu'));
            tabs.appendChild(btn);
        }
    }

    // Pane มีอยู่แล้วใน index.html — inject เนื้อหาเข้าไป
    let pane = document.getElementById('pane-menu');
    if (!pane) {
        pane = document.createElement('div');
        pane.className = 'orders-pane';
        pane.id = 'pane-menu';
        const app = document.getElementById('screen-app');
        if (app) app.appendChild(pane);
    }

    // ใส่เนื้อหาเข้าไปใน pane เสมอ
    pane.innerHTML = `
        <div style="padding:12px;display:flex;gap:8px;background:#fff;border-bottom:1px solid #EDE5D3;position:sticky;top:104px;z-index:30;">
            <button class="btn-add-menu" id="btn-add-menu-item" onclick="openMenuItemModal(null)">
                + เพิ่มเมนูใหม่
            </button>
        </div>
        <div class="orders-list" id="menu-item-list"></div>
    `;

    // เพิ่ม Modal
    if (!document.getElementById('menu-item-modal')) {
        document.body.insertAdjacentHTML('beforeend', menuItemModalHTML());
    }

    // CSS เพิ่มเติม
    if (!document.getElementById('pmenu-style')) {
        const style = document.createElement('style');
        style.id = 'pmenu-style';
        style.textContent = `
            .btn-add-menu {
                flex:1; padding:11px; background:linear-gradient(135deg,#651713,#4A0E0E);
                color:#E0C892; border:none; border-radius:10px;
                font-family:'Sarabun',sans-serif; font-size:15px; font-weight:700;
                cursor:pointer; letter-spacing:.02em;
            }
            .menu-item-card {
                background:#fff; border-radius:12px;
                box-shadow:0 2px 8px rgba(0,0,0,.06);
                overflow:hidden; display:flex; align-items:stretch;
                border-left:4px solid #C9A861;
            }
            .menu-item-card.unavailable { border-left-color:#D1D5DB; opacity:.65; }
            .mic-img {
                width:80px; min-height:80px; flex-shrink:0;
                background:#F8F4EC center/cover no-repeat;
                display:flex; align-items:center; justify-content:center;
                font-size:32px; color:#ADADAD;
            }
            .mic-body { flex:1; padding:12px 12px 10px; }
            .mic-name { font-weight:700; color:#651713; font-size:15px; margin-bottom:2px; }
            .mic-desc { font-size:12px; color:#6B6B6B; margin-bottom:6px;
                        display:-webkit-box; -webkit-line-clamp:2;
                        -webkit-box-orient:vertical; overflow:hidden; }
            .mic-row { display:flex; align-items:center; justify-content:space-between; gap:8px; }
            .mic-price { font-size:18px; font-weight:700; color:#C9A861;
                         font-family:'Cormorant Garamond',serif; }
            .mic-actions { display:flex; gap:6px; }
            .mic-btn { padding:5px 10px; border-radius:6px; border:none; font-size:12px;
                       font-weight:700; cursor:pointer; font-family:'Sarabun',sans-serif; }
            .mic-btn-edit   { background:#EDE9FE; color:#4C1D95; }
            .mic-btn-toggle { background:#D1FAE5; color:#065F46; }
            .mic-btn-toggle.off { background:#FEE2E2; color:#991B1B; }
            .mic-btn-del    { background:#FEE2E2; color:#991B1B; }
            .mic-badge { display:inline-flex; align-items:center; gap:3px;
                         padding:2px 8px; border-radius:10px; font-size:11px; font-weight:700; }
            .mic-badge-avail { background:#D1FAE5; color:#065F46; }
            .mic-badge-off   { background:#F3F4F6; color:#6B7280; }

            /* Modal */
            .pmenu-modal-bg {
                display:none; position:fixed; inset:0;
                background:rgba(26,26,26,.55); align-items:flex-end;
                justify-content:center; z-index:500;
                backdrop-filter:blur(3px);
            }
            .pmenu-modal-bg.open { display:flex; }
            .pmenu-modal-card {
                background:#fff; border-radius:20px 20px 0 0;
                width:100%; max-width:480px;
                padding:20px 20px 36px;
                max-height:92vh; overflow-y:auto;
                animation:slideUp .25s ease;
            }
            @keyframes slideUp {
                from { transform:translateY(60px); opacity:0; }
                to   { transform:translateY(0);    opacity:1; }
            }
            .pmenu-modal-title {
                font-family:'Cormorant Garamond',serif;
                font-size:22px; font-weight:600; color:#651713;
                margin:0 0 16px;
            }
            .pmenu-form-group { margin-bottom:14px; }
            .pmenu-form-group label {
                display:block; font-size:12px; font-weight:700;
                color:#6B6B6B; margin-bottom:5px; letter-spacing:.04em;
                text-transform:uppercase;
            }
            .pmenu-form-group input,
            .pmenu-form-group textarea,
            .pmenu-form-group select {
                width:100%; padding:11px 13px;
                border:1.5px solid #DDD; border-radius:8px;
                font-family:'Sarabun',sans-serif; font-size:15px;
                color:#1A1A1A; background:#fff; outline:none;
                transition:border-color .2s;
            }
            .pmenu-form-group input:focus,
            .pmenu-form-group textarea:focus { border-color:#651713; }
            .pmenu-img-preview {
                width:100%; height:160px; border-radius:10px;
                background:#F8F4EC center/cover no-repeat;
                border:1.5px dashed #DDD; display:flex;
                align-items:center; justify-content:center;
                color:#ADADAD; font-size:14px; cursor:pointer;
                transition:all .2s; flex-direction:column; gap:6px;
                margin-bottom:6px;
            }
            .pmenu-img-preview:hover { border-color:#C9A861; background:#FFFBF0; }
            .pmenu-form-row-2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
            .pmenu-checks { display:flex; gap:16px; flex-wrap:wrap; }
            .pmenu-check-label {
                display:flex; align-items:center; gap:6px;
                font-size:14px; cursor:pointer;
            }
            .pmenu-modal-btns { display:flex; gap:8px; margin-top:16px; }
            .pmenu-btn-save {
                flex:1; padding:13px; background:linear-gradient(135deg,#651713,#4A0E0E);
                color:#E0C892; border:none; border-radius:10px;
                font-family:'Sarabun',sans-serif; font-size:15px; font-weight:700; cursor:pointer;
            }
            .pmenu-btn-cancel {
                padding:13px 20px; background:#F3F4F6; color:#6B6B6B;
                border:none; border-radius:10px;
                font-family:'Sarabun',sans-serif; font-size:15px; font-weight:700; cursor:pointer;
            }
        `;
        document.head.appendChild(style);
    }
}

function menuItemModalHTML() {
    return `
    <div class="pmenu-modal-bg" id="menu-item-modal">
      <div class="pmenu-modal-card">
        <div class="pmenu-modal-title" id="pmenu-modal-title">เพิ่มเมนูใหม่</div>

        <div class="pmenu-form-group">
          <label>รูปภาพเมนู</label>
          <div class="pmenu-img-preview" id="pmenu-img-preview" onclick="document.getElementById('pmenu-img-input').click()">
            <span style="font-size:32px;">📷</span>
            <span>แตะเพื่อเลือกรูป</span>
          </div>
          <input type="file" id="pmenu-img-input" accept="image/*" style="display:none">
        </div>

        <div class="pmenu-form-group">
          <label>ชื่อเมนู *</label>
          <input type="text" id="pmenu-inp-name" placeholder="เช่น ส้มตำไทย">
        </div>

        <div class="pmenu-form-group">
          <label>คำอธิบาย</label>
          <textarea id="pmenu-inp-desc" rows="2" placeholder="เช่น สูตรต้นตำรับ รสจัด"></textarea>
        </div>

        <div class="pmenu-form-row-2">
          <div class="pmenu-form-group">
            <label>ราคา (บาท) *</label>
            <input type="number" id="pmenu-inp-price" min="0" step="1" placeholder="0">
          </div>
          <div class="pmenu-form-group">
            <label>หมวดหมู่</label>
            <select id="pmenu-inp-cat">
              <option value="partner">🏪 ร้านพาร์ทเนอร์</option>
              <option value="food">🍽️ อาหาร</option>
              <option value="drink">🥤 เครื่องดื่ม</option>
              <option value="dessert">🍮 ของหวาน</option>
            </select>
          </div>
        </div>

        <div class="pmenu-form-group">
          <label>ตัวเลือก</label>
          <div class="pmenu-checks">
            <label class="pmenu-check-label">
              <input type="checkbox" id="pmenu-inp-rec"> ⭐ แนะนำ
            </label>
            <label class="pmenu-check-label">
              <input type="checkbox" id="pmenu-inp-spicy"> 🌶️ เผ็ด
            </label>
            <label class="pmenu-check-label">
              <input type="checkbox" id="pmenu-inp-avail" checked> ✅ พร้อมขาย
            </label>
          </div>
        </div>

        <div class="pmenu-modal-btns">
          <button class="pmenu-btn-cancel" onclick="closeMenuItemModal()">ยกเลิก</button>
          <button class="pmenu-btn-save" id="pmenu-btn-save" onclick="saveMenuItem()">💾 บันทึก</button>
        </div>
      </div>
    </div>`;
}

// ============================================================
// 🔗 Bind Events
// ============================================================
function bindMenuEvents() {
    document.addEventListener('change', e => {
        if (e.target.id === 'pmenu-img-input') handleMenuImage(e.target);
    });
}

// ============================================================
// 📥 Load เมนู
// ============================================================
async function loadPartnerMenu() {
    try {
        const data = await API.call('getPartnerMenu', {
            partnerId: PARTNER.id,
            token: PARTNER.token,
        });
        PMENU.items = data.items || [];
        renderMenuList();
    } catch (err) {
        showToast('โหลดเมนูล้มเหลว: ' + err.message, 'error');
    }
}

// ============================================================
// 🎨 Render รายการเมนู
// ============================================================
function renderMenuList() {
    const el = document.getElementById('menu-item-list');
    if (!el) return;

    if (PMENU.items.length === 0) {
        el.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 24px;gap:12px;">
            <div style="font-size:52px;">🍽️</div>
            <div style="font-size:17px;font-weight:600;color:#6B6B6B;">ยังไม่มีเมนูในร้าน</div>
            <div style="font-size:14px;text-align:center;line-height:1.6;color:#ADADAD;">กด "+ เพิ่มเมนูใหม่"<br>เมนูจะแสดงบนเว็บโรงแรมทันที</div>
        </div>`;
        return;
    }


    el.innerHTML = PMENU.items.map(item => {
        const avail = !!item.is_available;
        const imgStyle = item.image_url
            ? `background-image:url('${item.image_url}');background-size:cover;background-position:center;`
            : '';
        return `<div style="background:#fff;border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,.07);overflow:hidden;display:flex;align-items:stretch;width:100%;box-sizing:border-box;border-left:4px solid ${avail?'#C9A861':'#D1D5DB'};opacity:${avail?1:.65};" data-item-id="${item.id}">
            <div style="width:88px;min-width:88px;height:88px;flex-shrink:0;background:#F8F4EC;${imgStyle}display:flex;align-items:center;justify-content:center;font-size:34px;color:#ADADAD;">${item.image_url?'':'🍽️'}</div>
            <div style="flex:1;padding:10px;min-width:0;display:flex;flex-direction:column;gap:4px;overflow:hidden;">
                <div style="font-weight:700;color:#651713;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(item.name)}</div>
                ${item.description?`<div style="font-size:11px;color:#6B6B6B;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(item.description)}</div>`:''}
                <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;margin-top:auto;">
                    <span style="font-size:16px;font-weight:700;color:#C9A861;white-space:nowrap;">฿${fmt(item.price)}</span>
                    <div style="display:flex;gap:4px;flex-shrink:0;">
                        <button style="padding:4px 8px;border-radius:6px;border:none;font-size:11px;font-weight:700;cursor:pointer;background:${avail?'#D1FAE5':'#FEE2E2'};color:${avail?'#065F46':'#991B1B'};" onclick="toggleMenuItem('${item.id}',${!avail})">${avail?'🟢':'🔴'}</button>
                        <button style="padding:4px 8px;border-radius:6px;border:none;font-size:11px;font-weight:700;cursor:pointer;background:#EDE9FE;color:#4C1D95;" onclick="openMenuItemModal('${item.id}')">✏️</button>
                        <button style="padding:4px 8px;border-radius:6px;border:none;font-size:11px;font-weight:700;cursor:pointer;background:#FEE2E2;color:#991B1B;" onclick="deleteMenuItem('${item.id}','${esc(item.name)}')">🗑️</button>
                    </div>
                </div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;">
                    ${item.is_recommended?'<span style="padding:2px 6px;border-radius:8px;font-size:10px;font-weight:700;background:#FEF3C7;color:#92400E;">⭐ แนะนำ</span>':''}
                    ${item.is_spicy?'<span style="padding:2px 6px;border-radius:8px;font-size:10px;font-weight:700;background:#FEE2E2;color:#991B1B;">🌶️ เผ็ด</span>':''}
                    <span style="padding:2px 6px;border-radius:8px;font-size:10px;font-weight:700;background:${avail?'#D1FAE5':'#F3F4F6'};color:${avail?'#065F46':'#6B7280'};">${avail?'✅ เปิด':'⏸️ ปิด'}</span>
                </div>
            </div>
        </div>`;
    }).join('');
}
// ============================================================
// 📝 Modal เพิ่ม/แก้ไข
// ============================================================
function openMenuItemModal(itemId) {
    const modal = document.getElementById('menu-item-modal');
    PMENU.editing = itemId ? PMENU.items.find(i => i.id === itemId) : null;
    PMENU.pendingImage = null;

    const title = document.getElementById('pmenu-modal-title');
    title.textContent = PMENU.editing ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่';

    // reset form
    document.getElementById('pmenu-inp-name').value  = PMENU.editing?.name        || '';
    document.getElementById('pmenu-inp-desc').value  = PMENU.editing?.description || '';
    document.getElementById('pmenu-inp-price').value = PMENU.editing?.price       || '';
    document.getElementById('pmenu-inp-cat').value   = PMENU.editing?.category_id || 'partner';
    document.getElementById('pmenu-inp-rec').checked   = PMENU.editing?.is_recommended || false;
    document.getElementById('pmenu-inp-spicy').checked = PMENU.editing?.is_spicy        || false;
    document.getElementById('pmenu-inp-avail').checked = PMENU.editing ? !!PMENU.editing.is_available : true;

    const preview = document.getElementById('pmenu-img-preview');
    if (PMENU.editing?.image_url) {
        preview.style.backgroundImage = `url('${PMENU.editing.image_url}')`;
        preview.innerHTML = '';
    } else {
        preview.style.backgroundImage = '';
        preview.innerHTML = '<span style="font-size:32px;">📷</span><span>แตะเพื่อเลือกรูป</span>';
    }

    modal.classList.add('open');
}

function closeMenuItemModal() {
    document.getElementById('menu-item-modal').classList.remove('open');
    PMENU.editing = null;
    PMENU.pendingImage = null;
}

async function handleMenuImage(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const preview = document.getElementById('pmenu-img-preview');
        preview.style.backgroundImage = `url('${e.target.result}')`;
        preview.innerHTML = '';
    };
    reader.readAsDataURL(file);
    PMENU.pendingImage = file;
}

// ============================================================
// 💾 Save เมนู (เพิ่ม/แก้ไข)
// ============================================================
async function saveMenuItem() {
    const name  = document.getElementById('pmenu-inp-name').value.trim();
    const price = parseFloat(document.getElementById('pmenu-inp-price').value);

    if (!name)       { showToast('กรุณาใส่ชื่อเมนู', 'error'); return; }
    if (!price || price <= 0) { showToast('กรุณาใส่ราคา', 'error'); return; }

    const btn = document.getElementById('pmenu-btn-save');
    btn.disabled = true;
    btn.textContent = 'กำลังบันทึก...';

    try {
        // อัปโหลดรูปก่อน (ถ้ามี)
        let image_url = PMENU.editing?.image_url || '';
        if (PMENU.pendingImage) {
            try {
                const res = await API.uploadImage(PMENU.pendingImage);
                image_url = res.url || res.image_url || '';
            } catch (e) {
                showToast('อัปโหลดรูปล้มเหลว (บันทึกโดยไม่มีรูป)', 'info');
            }
        }

        const payload = {
            partnerId:      PARTNER.id,
            token:          PARTNER.token,
            name,
            description:    document.getElementById('pmenu-inp-desc').value.trim(),
            price,
            category_id:    document.getElementById('pmenu-inp-cat').value,
            image_url,
            is_recommended: document.getElementById('pmenu-inp-rec').checked,
            is_spicy:       document.getElementById('pmenu-inp-spicy').checked,
            is_available:   document.getElementById('pmenu-inp-avail').checked,
        };

        if (PMENU.editing) {
            payload.itemId = PMENU.editing.id;
            await API.call('updatePartnerMenuItem', payload);
            // อัปเดต local
            const idx = PMENU.items.findIndex(i => i.id === PMENU.editing.id);
            if (idx >= 0) Object.assign(PMENU.items[idx], payload);
            showToast('✅ แก้ไขเมนูแล้ว', 'success');
        } else {
            const res = await API.call('addPartnerMenuItem', payload);
            PMENU.items.unshift({ ...payload, id: res.id, is_partner: true });
            showToast('✅ เพิ่มเมนูแล้ว — แสดงบนเว็บโรงแรมแล้ว!', 'success');
        }

        renderMenuList();
        closeMenuItemModal();
    } catch (err) {
        showToast('บันทึกล้มเหลว: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 บันทึก';
    }
}

// ============================================================
// 🔄 Toggle เปิด/ปิด
// ============================================================
async function toggleMenuItem(itemId, newState) {
    try {
        await API.call('togglePartnerMenuItem', {
            partnerId: PARTNER.id,
            token: PARTNER.token,
            itemId,
            is_available: newState,
        });
        const item = PMENU.items.find(i => i.id === itemId);
        if (item) item.is_available = newState;
        renderMenuList();
        showToast(newState ? '🟢 เปิดขายแล้ว' : '🔴 ปิดชั่วคราวแล้ว', 'success');
    } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
}

// ============================================================
// 🗑️ ลบเมนู
// ============================================================
async function deleteMenuItem(itemId, name) {
    if (!confirm(`ลบ "${name}" ออกจากเมนู?\n(ลูกค้าจะไม่เห็นเมนูนี้อีก)`)) return;
    try {
        await API.call('deletePartnerMenuItem', {
            partnerId: PARTNER.id,
            token: PARTNER.token,
            itemId,
        });
        PMENU.items = PMENU.items.filter(i => i.id !== itemId);
        renderMenuList();
        showToast('🗑️ ลบเมนูแล้ว', 'info');
    } catch (err) {
        showToast('ลบล้มเหลว: ' + err.message, 'error');
    }
}

// ============================================================
// 🔗 Hook เข้า startApp() เดิม
// ============================================================
const _origStartApp = typeof startApp === 'function' ? startApp : null;
if (_origStartApp) {
    window.startApp = function() {
        _origStartApp();
        initPartnerMenu();
    };
}

// expose globals
window.openMenuItemModal  = openMenuItemModal;
window.closeMenuItemModal = closeMenuItemModal;
window.saveMenuItem       = saveMenuItem;
window.toggleMenuItem     = toggleMenuItem;
window.deleteMenuItem     = deleteMenuItem;
