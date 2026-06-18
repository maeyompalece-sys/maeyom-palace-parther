// ============================================================
// 🍽️ Partner Menu Manager
// แท็บ "เมนูของฉัน" ใน Partner App — เพิ่ม/แก้/ลบ/ปิด-เปิดเมนู + จัดการหมวด
// ============================================================

const PMENU = {
    items:       [],
    categories:  [],   // ✅ หมวดของร้านนี้
    editing:     null,
    pendingImage: null,
};

// ============================================================
// 🚀 Init
// ============================================================
function initPartnerMenu() {
    renderMenuTab();
    bindMenuEvents();
    loadPartnerCategories().then(() => loadPartnerMenu());
}

// ============================================================
// 🎨 Render แท็บเมนู
// ============================================================
function renderMenuTab() {
    const existingTab = document.querySelector('[data-tab="menu"]');
    if (existingTab) {
        existingTab.addEventListener('click', () => switchTab('menu'));
    }

    let pane = document.getElementById('pane-menu');
    if (!pane) {
        pane = document.createElement('div');
        pane.className = 'orders-pane';
        pane.id = 'pane-menu';
        const app = document.getElementById('screen-app');
        if (app) app.appendChild(pane);
    }

    pane.innerHTML = `
        <div style="padding:10px;background:#fff;border-bottom:1px solid #EDE5D3;position:sticky;top:0;z-index:30;display:flex;gap:8px;">
            <button onclick="openMenuItemModal(null)" style="flex:1;padding:12px;background:linear-gradient(135deg,#651713,#4A0E0E);color:#E0C892;border:none;border-radius:10px;font-family:'Sarabun',sans-serif;font-size:14px;font-weight:700;cursor:pointer;">
                + เพิ่มเมนูใหม่
            </button>
            <button onclick="openCatModal()" style="padding:12px 14px;background:#FEF3C7;color:#92400E;border:none;border-radius:10px;font-family:'Sarabun',sans-serif;font-size:14px;font-weight:700;cursor:pointer;" title="จัดการหมวดหมู่">
                🏷️
            </button>
        </div>
        <div id="menu-item-list" style="padding:10px;display:flex;flex-direction:column;gap:9px;"></div>
    `;

    // Modal เพิ่ม/แก้ไขเมนู
    if (!document.getElementById('menu-item-modal')) {
        document.body.insertAdjacentHTML('beforeend', menuItemModalHTML());
    }
    // Modal จัดการหมวด
    if (!document.getElementById('cat-modal')) {
        document.body.insertAdjacentHTML('beforeend', catModalHTML());
    }

    injectMenuStyles();
}

// ============================================================
// 📥 Load หมวดหมู่
// ============================================================
async function loadPartnerCategories() {
    try {
        const data = await API.call('getPartnerCategories', {
            partnerId: PARTNER.id,
            token: PARTNER.token,
        });
        PMENU.categories = data.categories || [];
        refreshCategorySelects();
    } catch (err) {
        PMENU.categories = [];
    }
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
// 🏷️ Category Modal HTML
// ============================================================
function catModalHTML() {
    return `
    <div class="pmenu-modal-bg" id="cat-modal">
      <div class="pmenu-modal-card">
        <div class="pmenu-modal-title">🏷️ จัดการหมวดหมู่</div>

        <!-- รายการหมวดที่มีอยู่ -->
        <div id="cat-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;"></div>

        <!-- ฟอร์มเพิ่มหมวดใหม่ -->
        <div style="background:#FEF9EC;border-radius:10px;padding:12px;border:1px solid #EDE5D3;">
          <div style="font-size:12px;font-weight:700;color:#92400E;margin-bottom:10px;text-transform:uppercase;letter-spacing:.04em;">+ เพิ่มหมวดใหม่</div>
          <div style="display:grid;grid-template-columns:60px 1fr;gap:8px;">
            <div class="pmenu-form-group" style="margin:0;">
              <input type="text" id="cat-inp-icon" placeholder="🍽️" maxlength="2"
                style="text-align:center;font-size:22px;padding:8px;">
            </div>
            <div class="pmenu-form-group" style="margin:0;">
              <input type="text" id="cat-inp-name" placeholder="ชื่อหมวด เช่น อาหาร, เครื่องดื่ม">
            </div>
          </div>
          <button onclick="addCategory()" style="width:100%;margin-top:8px;padding:11px;background:linear-gradient(135deg,#651713,#4A0E0E);color:#E0C892;border:none;border-radius:8px;font-family:'Sarabun',sans-serif;font-size:14px;font-weight:700;cursor:pointer;">
            + เพิ่มหมวด
          </button>
        </div>

        <div class="pmenu-modal-btns" style="margin-top:12px;">
          <button class="pmenu-btn-cancel" onclick="closeCatModal()">ปิด</button>
        </div>
      </div>
    </div>`;
}

function openCatModal() {
    renderCatList();
    document.getElementById('cat-modal').classList.add('open');
}

function closeCatModal() {
    document.getElementById('cat-modal').classList.remove('open');
    refreshCategorySelects();
}

function renderCatList() {
    const el = document.getElementById('cat-list');
    if (!el) return;

    if (PMENU.categories.length === 0) {
        el.innerHTML = '<div style="text-align:center;color:#ADADAD;padding:20px;font-size:13px;">ยังไม่มีหมวดหมู่ — เพิ่มด้านล่างได้เลย</div>';
        return;
    }

    el.innerHTML = PMENU.categories.map(cat => `
        <div style="display:flex;align-items:center;gap:10px;background:#fff;border-radius:10px;padding:10px 12px;border:1px solid #EDE5D3;">
            <span style="font-size:22px;min-width:28px;text-align:center;">${cat.icon || '🍽️'}</span>
            <span style="flex:1;font-size:14px;font-weight:600;color:#651713;">${esc2(cat.name)}</span>
            <span style="font-size:11px;color:#ADADAD;">${PMENU.items.filter(i => i.category_id === cat.id).length} เมนู</span>
            <button onclick="deleteCategory('${cat.id}','${esc2(cat.name)}')"
                style="padding:4px 10px;background:#FEE2E2;color:#991B1B;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">
                ลบ
            </button>
        </div>
    `).join('');
}

async function addCategory() {
    const name = document.getElementById('cat-inp-name').value.trim();
    const icon = document.getElementById('cat-inp-icon').value.trim() || '🍽️';
    if (!name) { showToast('กรุณาใส่ชื่อหมวด', 'error'); return; }

    try {
        const res = await API.call('addPartnerCategory', {
            partnerId: PARTNER.id,
            token: PARTNER.token,
            name, icon,
        });
        PMENU.categories.push(res);
        document.getElementById('cat-inp-name').value = '';
        document.getElementById('cat-inp-icon').value = '';
        renderCatList();
        showToast('✅ เพิ่มหมวด "' + name + '" แล้ว', 'success');
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}

async function deleteCategory(catId, name) {
    if (!confirm('ลบหมวด "' + name + '" ?\n(ต้องไม่มีเมนูอยู่ในหมวดนี้)')) return;
    try {
        await API.call('deletePartnerCategory', {
            partnerId: PARTNER.id,
            token: PARTNER.token,
            catId,
        });
        PMENU.categories = PMENU.categories.filter(c => c.id !== catId);
        renderCatList();
        showToast('🗑️ ลบหมวดแล้ว', 'info');
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}

// อัปเดต <select> หมวดใน modal เมนู
function refreshCategorySelects() {
    const sel = document.getElementById('pmenu-inp-cat');
    if (!sel) return;
    const currentVal = sel.value;

    if (PMENU.categories.length === 0) {
        sel.innerHTML = '<option value="partner">🏪 ทั่วไป</option>';
    } else {
        sel.innerHTML = PMENU.categories.map(c =>
            `<option value="${c.id}">${c.icon || '🍽️'} ${esc2(c.name)}</option>`
        ).join('');
    }

    // restore value ถ้ายังมีอยู่
    if (currentVal && sel.querySelector(`option[value="${currentVal}"]`)) {
        sel.value = currentVal;
    }
}

// ============================================================
// 🎨 Render รายการเมนู (แบ่งตามหมวด)
// ============================================================
function renderMenuList() {
    const el = document.getElementById('menu-item-list');
    if (!el) return;

    if (PMENU.items.length === 0) {
        el.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;padding:60px 24px;gap:12px;">
            <div style="font-size:52px;">🍽️</div>
            <div style="font-size:17px;font-weight:600;color:#6B6B6B;">ยังไม่มีเมนูในร้าน</div>
            <div style="font-size:14px;text-align:center;line-height:1.6;color:#ADADAD;">กด "+ เพิ่มเมนูใหม่"<br>เมนูจะแสดงบนเว็บโรงแรมทันที</div>
        </div>`;
        return;
    }

    // จัดกลุ่มตามหมวด
    const groups = {};
    PMENU.items.forEach(item => {
        const catId = item.category_id || 'partner';
        if (!groups[catId]) groups[catId] = [];
        groups[catId].push(item);
    });

    // สร้าง map id→cat
    const catMap = {};
    PMENU.categories.forEach(c => { catMap[c.id] = c; });

    let html = '';
    Object.entries(groups).forEach(([catId, items]) => {
        const cat = catMap[catId];
        const catLabel = cat ? (cat.icon + ' ' + cat.name) : '🏪 ทั่วไป';

        html += `<div style="font-size:12px;font-weight:700;color:#8B7355;text-transform:uppercase;letter-spacing:.05em;padding:8px 4px 4px;">${catLabel}</div>`;
        html += items.map(item => itemCardHTML(item)).join('');
    });

    el.innerHTML = html;
}

function itemCardHTML(item) {
    const avail = !!item.is_available;
    const imgStyle = item.image_url
        ? `background-image:url('${item.image_url}');background-size:cover;background-position:center;`
        : '';
    return `<div style="background:#fff;border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,.07);overflow:hidden;display:flex;align-items:stretch;width:100%;box-sizing:border-box;border-left:4px solid ${avail ? '#C9A861' : '#D1D5DB'};opacity:${avail ? 1 : .65};margin-bottom:2px;" data-item-id="${item.id}">
        <div style="width:88px;min-width:88px;height:88px;flex-shrink:0;background:#F8F4EC;${imgStyle}display:flex;align-items:center;justify-content:center;font-size:34px;color:#ADADAD;">${item.image_url ? '' : '🍽️'}</div>
        <div style="flex:1;padding:10px;min-width:0;display:flex;flex-direction:column;gap:4px;overflow:hidden;">
            <div style="font-weight:700;color:#651713;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc2(item.name)}</div>
            ${item.description ? `<div style="font-size:11px;color:#6B6B6B;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc2(item.description)}</div>` : ''}
            <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;margin-top:auto;">
                <span style="font-size:16px;font-weight:700;color:#C9A861;white-space:nowrap;">฿${fmt(item.price)}</span>
                <div style="display:flex;gap:4px;flex-shrink:0;">
                    <button style="padding:4px 8px;border-radius:6px;border:none;font-size:11px;font-weight:700;cursor:pointer;background:${avail ? '#D1FAE5' : '#FEE2E2'};color:${avail ? '#065F46' : '#991B1B'};" onclick="toggleMenuItem('${item.id}',${!avail})">${avail ? '🟢' : '🔴'}</button>
                    <button style="padding:4px 8px;border-radius:6px;border:none;font-size:11px;font-weight:700;cursor:pointer;background:#EDE9FE;color:#4C1D95;" onclick="openMenuItemModal('${item.id}')">✏️</button>
                    <button style="padding:4px 8px;border-radius:6px;border:none;font-size:11px;font-weight:700;cursor:pointer;background:#FEE2E2;color:#991B1B;" onclick="deleteMenuItem('${item.id}','${esc2(item.name)}')">🗑️</button>
                </div>
            </div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;">
                ${item.is_recommended ? '<span style="padding:2px 6px;border-radius:8px;font-size:10px;font-weight:700;background:#FEF3C7;color:#92400E;">⭐ แนะนำ</span>' : ''}
                ${item.is_spicy ? '<span style="padding:2px 6px;border-radius:8px;font-size:10px;font-weight:700;background:#FEE2E2;color:#991B1B;">🌶️ เผ็ด</span>' : ''}
                <span style="padding:2px 6px;border-radius:8px;font-size:10px;font-weight:700;background:${avail ? '#D1FAE5' : '#F3F4F6'};color:${avail ? '#065F46' : '#6B7280'};">${avail ? '✅ เปิด' : '⏸️ ปิด'}</span>
            </div>
        </div>
    </div>`;
}

// ============================================================
// 📝 Modal เพิ่ม/แก้ไขเมนู
// ============================================================
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
              <option value="partner">🏪 ทั่วไป</option>
            </select>
          </div>
        </div>

        <div class="pmenu-form-group">
          <label>ตัวเลือก</label>
          <div class="pmenu-checks">
            <label class="pmenu-check-label"><input type="checkbox" id="pmenu-inp-rec"> ⭐ แนะนำ</label>
            <label class="pmenu-check-label"><input type="checkbox" id="pmenu-inp-spicy"> 🌶️ เผ็ด</label>
            <label class="pmenu-check-label"><input type="checkbox" id="pmenu-inp-avail" checked> ✅ พร้อมขาย</label>
          </div>
        </div>

        <div class="pmenu-modal-btns">
          <button class="pmenu-btn-cancel" onclick="closeMenuItemModal()">ยกเลิก</button>
          <button class="pmenu-btn-save" id="pmenu-btn-save" onclick="saveMenuItem()">💾 บันทึก</button>
        </div>
      </div>
    </div>`;
}

function openMenuItemModal(itemId) {
    PMENU.editing = itemId ? PMENU.items.find(i => i.id === itemId) : null;
    PMENU.pendingImage = null;

    document.getElementById('pmenu-modal-title').textContent = PMENU.editing ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่';
    document.getElementById('pmenu-inp-name').value  = PMENU.editing?.name        || '';
    document.getElementById('pmenu-inp-desc').value  = PMENU.editing?.description || '';
    document.getElementById('pmenu-inp-price').value = PMENU.editing?.price       || '';
    document.getElementById('pmenu-inp-rec').checked   = PMENU.editing?.is_recommended || false;
    document.getElementById('pmenu-inp-spicy').checked = PMENU.editing?.is_spicy        || false;
    document.getElementById('pmenu-inp-avail').checked = PMENU.editing ? !!PMENU.editing.is_available : true;

    // โหลดหมวดล่าสุด แล้วเลือกค่า
    refreshCategorySelects();
    if (PMENU.editing?.category_id) {
        const sel = document.getElementById('pmenu-inp-cat');
        if (sel) sel.value = PMENU.editing.category_id;
    }

    const preview = document.getElementById('pmenu-img-preview');
    if (PMENU.editing?.image_url) {
        preview.style.backgroundImage = `url('${PMENU.editing.image_url}')`;
        preview.innerHTML = '';
    } else {
        preview.style.backgroundImage = '';
        preview.innerHTML = '<span style="font-size:32px;">📷</span><span>แตะเพื่อเลือกรูป</span>';
    }

    document.getElementById('menu-item-modal').classList.add('open');
}

function closeMenuItemModal() {
    document.getElementById('menu-item-modal').classList.remove('open');
    PMENU.editing = null;
    PMENU.pendingImage = null;
}

// ============================================================
// 🔗 Bind Events
// ============================================================
function bindMenuEvents() {
    document.addEventListener('change', e => {
        if (e.target.id === 'pmenu-img-input') handleMenuImage(e.target);
    });
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
// 💾 Save เมนู
// ============================================================
async function saveMenuItem() {
    const name  = document.getElementById('pmenu-inp-name').value.trim();
    const price = parseFloat(document.getElementById('pmenu-inp-price').value);
    if (!name)              { showToast('กรุณาใส่ชื่อเมนู', 'error'); return; }
    if (!price || price <= 0) { showToast('กรุณาใส่ราคา', 'error'); return; }

    const btn = document.getElementById('pmenu-btn-save');
    btn.disabled = true; btn.textContent = 'กำลังบันทึก...';

    try {
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
            const idx = PMENU.items.findIndex(i => i.id === PMENU.editing.id);
            if (idx >= 0) Object.assign(PMENU.items[idx], payload);
            showToast('✅ แก้ไขเมนูแล้ว', 'success');
        } else {
            const res = await API.call('addPartnerMenuItem', payload);
            PMENU.items.unshift({ ...payload, id: res.id, is_partner: true });
            showToast('✅ เพิ่มเมนูแล้ว!', 'success');
        }

        renderMenuList();
        closeMenuItemModal();
    } catch (err) {
        showToast('บันทึกล้มเหลว: ' + err.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = '💾 บันทึก';
    }
}

// ============================================================
// 🔄 Toggle / Delete
// ============================================================
async function toggleMenuItem(itemId, newState) {
    try {
        await API.call('togglePartnerMenuItem', { partnerId: PARTNER.id, token: PARTNER.token, itemId, is_available: newState });
        const item = PMENU.items.find(i => i.id === itemId);
        if (item) item.is_available = newState;
        renderMenuList();
        showToast(newState ? '🟢 เปิดขายแล้ว' : '🔴 ปิดชั่วคราวแล้ว', 'success');
    } catch (err) { showToast('เกิดข้อผิดพลาด: ' + err.message, 'error'); }
}

async function deleteMenuItem(itemId, name) {
    if (!confirm(`ลบ "${name}" ออกจากเมนู?`)) return;
    try {
        await API.call('deletePartnerMenuItem', { partnerId: PARTNER.id, token: PARTNER.token, itemId });
        PMENU.items = PMENU.items.filter(i => i.id !== itemId);
        renderMenuList();
        showToast('🗑️ ลบเมนูแล้ว', 'info');
    } catch (err) { showToast('ลบล้มเหลว: ' + err.message, 'error'); }
}

// ============================================================
// 🎨 CSS
// ============================================================
function injectMenuStyles() {
    if (document.getElementById('pmenu-style')) return;
    const style = document.createElement('style');
    style.id = 'pmenu-style';
    style.textContent = `
        .pmenu-modal-bg { display:none;position:fixed;inset:0;background:rgba(26,26,26,.55);align-items:flex-end;justify-content:center;z-index:500;backdrop-filter:blur(3px); }
        .pmenu-modal-bg.open { display:flex; }
        .pmenu-modal-card { background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:480px;padding:20px 20px 36px;max-height:92vh;overflow-y:auto;animation:slideUp .25s ease; }
        @keyframes slideUp { from{transform:translateY(60px);opacity:0} to{transform:translateY(0);opacity:1} }
        .pmenu-modal-title { font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#651713;margin:0 0 16px; }
        .pmenu-form-group { margin-bottom:14px; }
        .pmenu-form-group label { display:block;font-size:12px;font-weight:700;color:#6B6B6B;margin-bottom:5px;letter-spacing:.04em;text-transform:uppercase; }
        .pmenu-form-group input,
        .pmenu-form-group textarea,
        .pmenu-form-group select { width:100%;padding:11px 13px;border:1.5px solid #DDD;border-radius:8px;font-family:'Sarabun',sans-serif;font-size:15px;color:#1A1A1A;background:#fff;outline:none;transition:border-color .2s;box-sizing:border-box; }
        .pmenu-form-group input:focus,
        .pmenu-form-group textarea:focus { border-color:#651713; }
        .pmenu-img-preview { width:100%;height:160px;border-radius:10px;background:#F8F4EC center/cover no-repeat;border:1.5px dashed #DDD;display:flex;align-items:center;justify-content:center;color:#ADADAD;font-size:14px;cursor:pointer;transition:all .2s;flex-direction:column;gap:6px;margin-bottom:6px; }
        .pmenu-img-preview:hover { border-color:#C9A861;background:#FFFBF0; }
        .pmenu-form-row-2 { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
        .pmenu-checks { display:flex;gap:16px;flex-wrap:wrap; }
        .pmenu-check-label { display:flex;align-items:center;gap:6px;font-size:14px;cursor:pointer; }
        .pmenu-modal-btns { display:flex;gap:8px;margin-top:16px; }
        .pmenu-btn-save { flex:1;padding:13px;background:linear-gradient(135deg,#651713,#4A0E0E);color:#E0C892;border:none;border-radius:10px;font-family:'Sarabun',sans-serif;font-size:15px;font-weight:700;cursor:pointer; }
        .pmenu-btn-cancel { padding:13px 20px;background:#F3F4F6;color:#6B6B6B;border:none;border-radius:10px;font-family:'Sarabun',sans-serif;font-size:15px;font-weight:700;cursor:pointer; }
    `;
    document.head.appendChild(style);
}

// ============================================================
// 🔧 Helpers
// ============================================================
function esc2(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c =>
        ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])
    );
}

// expose globals
window.openMenuItemModal  = openMenuItemModal;
window.closeMenuItemModal = closeMenuItemModal;
window.saveMenuItem       = saveMenuItem;
window.toggleMenuItem     = toggleMenuItem;
window.deleteMenuItem     = deleteMenuItem;
window.openCatModal       = openCatModal;
window.closeCatModal      = closeCatModal;
window.addCategory        = addCategory;
window.deleteCategory     = deleteCategory;
