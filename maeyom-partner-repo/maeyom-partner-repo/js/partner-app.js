// ============================================================
// 📱 Partner App JS
// ระบบรับออเดอร์สำหรับร้านพาร์ทเนอร์ (เหมือน GrabFood ฝั่งร้าน)
// ============================================================

const PARTNER = {
    id: null,
    name: null,
    token: null,
    logoUrl: null,
};

const PSTATE = {
    activeTab: 'new',
    orders: [],         // orders ทั้งหมดของร้านนี้
    lastOrderIds: null, // สำหรับตรวจ order ใหม่
    historyFilter: 'today',
    polling: null,
};

const STATUS_META = {
    pending:    { label: 'รอยืนยัน',     icon: '⏳', badgeClass: 'badge-pending' },
    accepted:   { label: 'รับออเดอร์แล้ว', icon: '✅', badgeClass: 'badge-accepted' },
    cooking:    { label: 'กำลังทำ',       icon: '👨‍🍳', badgeClass: 'badge-cooking' },
    ready:      { label: 'พร้อมส่ง',       icon: '🍽️', badgeClass: 'badge-ready' },
    completed:  { label: 'เสร็จสิ้น',      icon: '✨', badgeClass: 'badge-completed' },
    cancelled:  { label: 'ยกเลิก',         icon: '❌', badgeClass: 'badge-cancelled' },
};

// ============================================================
// 🚀 Init
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    tryRestoreSession();

    // ✅ ลงทะเบียน listener ดักการแตะ local notification (Capacitor APK)
    // ต้องเรียกครั้งเดียวตอนเริ่มแอป ไม่ผูกกับ login state
    setupNotificationClickListener();

    document.getElementById('btn-login').addEventListener('click', handleLogin);
    document.getElementById('inp-partner-pass').addEventListener('keydown', e => {
        if (e.key === 'Enter') handleLogin();
    });

    document.getElementById('btn-logout').addEventListener('click', handleLogout);

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            PSTATE.historyFilter = chip.dataset.filter;
            renderHistory();
        });
    });

    document.getElementById('new-order-alert').addEventListener('click', () => {
        document.getElementById('new-order-alert').classList.remove('show');
        switchTab('new');
    });

    // Modal close on backdrop click
    document.getElementById('order-modal-backdrop').addEventListener('click', closeOrderModal);
    document.getElementById('edit-modal-backdrop').addEventListener('click', closeEditModal);
});

// ============================================================
// 🔐 Auth
// ============================================================
async function handleLogin() {
    const partnerId = document.getElementById('inp-partner-id').value.trim().toUpperCase();
    const password  = document.getElementById('inp-partner-pass').value.trim();
    const errEl     = document.getElementById('login-err');
    const btn       = document.getElementById('btn-login');

    errEl.style.display = 'none';

    if (!partnerId || !password) {
        errEl.textContent = 'กรุณากรอกรหัสร้านค้าและรหัสผ่าน';
        errEl.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'กำลังเข้าสู่ระบบ...';
    showLoading(true);

    requestNotificationPermission();

    try {
        const result = await API.call('partnerLogin', { partnerId, password });
        PARTNER.id      = result.partnerId;
        PARTNER.name    = result.partnerName;
        PARTNER.token   = result.token;
        PARTNER.logoUrl = result.logoUrl || '';

        localStorage.setItem('partner_session', JSON.stringify({
            id:      PARTNER.id,
            name:    PARTNER.name,
            token:   PARTNER.token,
            logoUrl: PARTNER.logoUrl,
            savedAt: Date.now(),
        }));

        startApp();
        registerFCMTokenToServer();
    } catch (err) {
        errEl.textContent = err.message || 'รหัสร้านค้าหรือรหัสผ่านไม่ถูกต้อง';
        errEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'เข้าสู่ระบบ';
        showLoading(false);
    }
}

function handleLogout() {
    if (!confirm('ออกจากระบบ?')) return;
    localStorage.removeItem('partner_session');
    PARTNER.id = PARTNER.name = PARTNER.token = null;
    stopPolling();
    showScreen('login');
    document.getElementById('inp-partner-id').value = '';
    document.getElementById('inp-partner-pass').value = '';
}

function tryRestoreSession() {
    try {
        const saved = JSON.parse(localStorage.getItem('partner_session') || 'null');
        if (!saved) return;
        if (Date.now() - saved.savedAt > 86400000) {
            localStorage.removeItem('partner_session');
            return;
        }
        PARTNER.id      = saved.id;
        PARTNER.name    = saved.name;
        PARTNER.token   = saved.token;
        PARTNER.logoUrl = saved.logoUrl || '';
        startApp();
    } catch (e) {}
}

// ============================================================
// 🏠 App Start
// ============================================================
function startApp() {
    showScreen('app');
    document.getElementById('hdr-shop-name').textContent = PARTNER.name || PARTNER.id;
    setOnlineStatus(true);

    setupNotificationChannel();

    // แสดง logo จาก cache ก่อน (กันหน้าจอกระพริบ) แล้วค่อย sync ของจริงทับ
    renderHeaderLogo();

    // ✅ ดึงข้อมูลโปรไฟล์ร้านล่าสุดจาก server ทุกครั้งที่เปิดแอป
    // (กันไม่ให้ชื่อร้าน/โลโก้ค้างเป็นค่าเก่าบนเครื่อง/แพลตฟอร์มอื่นที่ login ค้างไว้นาน
    //  เพราะเดิม tryRestoreSession() ดึงค่าจาก localStorage ของเครื่องนั้นอย่างเดียว
    //  ไม่เคยถาม backend ใหม่ จนกว่าจะ logout แล้ว login ใหม่)
    syncPartnerProfile();

    fetchOrders(true);
    startPolling();
}

function renderHeaderLogo() {
    const logoWrap = document.getElementById('hdr-logo');
    if (!logoWrap) return;
    if (PARTNER.logoUrl) {
        logoWrap.innerHTML = `<img src="${PARTNER.logoUrl}" style="width:36px;height:36px;border-radius:8px;object-fit:cover;border:2px solid rgba(255,255,255,.3);">`;
    } else {
        logoWrap.innerHTML = `<div style="width:36px;height:36px;border-radius:8px;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:20px;">🏪</div>`;
    }
}

async function syncPartnerProfile() {
    try {
        const data = await API.call('getPartners', {});
        const me = (data.partners || []).find(p =>
            String(p.partnerId).toUpperCase() === String(PARTNER.id).toUpperCase()
        );
        if (!me) return;

        const changed = (me.partnerName || '') !== (PARTNER.name || '')
                      || (me.logoUrl     || '') !== (PARTNER.logoUrl || '');
        if (!changed) return;

        // อัปเดต state + UI ให้ตรงกับข้อมูลล่าสุดบน server
        PARTNER.name    = me.partnerName || PARTNER.name;
        PARTNER.logoUrl = me.logoUrl     || '';
        document.getElementById('hdr-shop-name').textContent = PARTNER.name || PARTNER.id;
        renderHeaderLogo();

        // sync กลับเข้า localStorage ของเครื่องนี้ด้วย
        try {
            const saved = JSON.parse(localStorage.getItem('partner_session') || '{}');
            saved.name    = PARTNER.name;
            saved.logoUrl = PARTNER.logoUrl;
            localStorage.setItem('partner_session', JSON.stringify(saved));
        } catch(e) {}
    } catch(e) {
        // เงียบๆ ถ้า sync ไม่สำเร็จ — ใช้ค่า cache เดิมต่อไป ไม่กระทบการทำงานหลัก
        console.warn('[syncPartnerProfile]', e.message);
    }
}

async function requestNotificationPermission() {
    if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
        try {
            const { LocalNotifications } = window.Capacitor.Plugins;
            if (LocalNotifications) {
                const perm = await LocalNotifications.requestPermissions();
                if (perm.display === 'granted') {
                    showToast('✅ เปิดการแจ้งเตือนแล้ว', 'success');
                } else {
                    showToast('⚠️ กรุณาเปิดการแจ้งเตือนในการตั้งค่า', 'info');
                }
                return;
            }
        } catch(e) { console.warn('[NotifPerm Capacitor]', e.message); }
    }
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') return;
    if (Notification.permission === 'denied') {
        showToast('⚠️ กรุณาเปิดการแจ้งเตือนในการตั้งค่าเบราว์เซอร์', 'info');
        return;
    }
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            showToast('✅ เปิดการแจ้งเตือนแล้ว', 'success');
        }
    });
}

function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + name).classList.add('active');
}

// ============================================================
// 📡 Data Fetching
// ============================================================
async function fetchOrders(initial = false) {
    if (initial) showLoading(true);
    try {
        const data = await API.call('getPartnerOrders', {
            partnerId: PARTNER.id,
            token: PARTNER.token,
        });

        const newOrders = data.orders || [];
        checkNewOrders(newOrders);
        PSTATE.orders = newOrders;
        renderAll();
        setOnlineStatus(true);
    } catch (err) {
        if (err.message && err.message.includes('ACCOUNT_SUSPENDED')) {
            stopPolling();
            localStorage.removeItem('partner_session');
            PARTNER.id = PARTNER.name = PARTNER.token = null;
            showScreen('login');
            const errEl = document.getElementById('login-err');
            if (errEl) {
                errEl.textContent = '⚠️ บัญชีของคุณถูกระงับ กรุณาติดต่อแอดมิน';
                errEl.style.display = 'block';
            }
            return;
        }
        setOnlineStatus(false);
        if (initial) showToast('โหลดออเดอร์ล้มเหลว: ' + err.message, 'error');
    } finally {
        if (initial) showLoading(false);
    }
}

function checkNewOrders(newOrders) {
    if (PSTATE.lastOrderIds === null) {
        PSTATE.lastOrderIds = new Set(newOrders.map(o => o.id));
        return;
    }
    const incoming = newOrders.filter(o => !PSTATE.lastOrderIds.has(o.id) && o.status === 'pending');
    if (incoming.length > 0) {
        playNotificationSound();
        showNewOrderAlert();
        sendPushNotification(incoming.length);
    }
    PSTATE.lastOrderIds = new Set(newOrders.map(o => o.id));
}

function startPolling() {
    stopPolling();
    PSTATE.polling = setInterval(() => fetchOrders(false), 5000);
}

function stopPolling() {
    if (PSTATE.polling) { clearInterval(PSTATE.polling); PSTATE.polling = null; }
}

// ============================================================
// 🔄 Manual Refresh
// ============================================================
async function manualRefresh(btn) {
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ กำลังโหลด...';
    }
    document.querySelectorAll('.refresh-hint').forEach(el => {
        el.textContent = '⟳ กำลังโหลด...';
    });

    try {
        await fetchOrders(false);
        const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        document.querySelectorAll('.refresh-hint').forEach(el => {
            el.textContent = '✅ อัปเดตแล้ว ' + now;
        });
        setTimeout(() => {
            document.querySelectorAll('.refresh-hint').forEach(el => {
                el.textContent = '⟳ refresh อัตโนมัติทุก 5 วินาที';
            });
        }, 3000);
    } catch(e) {
        document.querySelectorAll('.refresh-hint').forEach(el => {
            el.textContent = '❌ โหลดล้มเหลว';
        });
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🔄 รีเฟรช';
        }
    }
}
window.manualRefresh = manualRefresh;

// ============================================================
// 🎨 Rendering
// ============================================================
function renderAll() {
    renderNew();
    renderActive();
    renderHistory();
    updateBadges();
}

function renderNew() {
    const pending = PSTATE.orders.filter(o => o.status === 'pending');
    const el = document.getElementById('list-new');
    if (pending.length === 0) {
        el.innerHTML = emptyState('📭', 'ยังไม่มีออเดอร์ใหม่', 'ออเดอร์ที่ลูกค้าสั่งจะปรากฏที่นี่');
        return;
    }
    el.innerHTML = pending.map(o => orderCard(o, ['accept', 'cancel'])).join('');
    bindCardButtons(el);
}

function renderActive() {
    const active = PSTATE.orders.filter(o => ['accepted','cooking','ready'].includes(o.status));
    const el = document.getElementById('list-active');
    if (active.length === 0) {
        el.innerHTML = emptyState('👨‍🍳', 'ไม่มีออเดอร์กำลังทำ', 'ออเดอร์ที่รับแล้วจะปรากฏที่นี่');
        return;
    }
    el.innerHTML = active.map(o => {
        const actions = nextActions(o.status);
        return orderCard(o, actions);
    }).join('');
    bindCardButtons(el);
}

function renderHistory() {
    const done = PSTATE.orders.filter(o => ['completed','cancelled'].includes(o.status));
    const now = Date.now();
    const filtered = done.filter(o => {
        const t = new Date(o.created_at).getTime();
        if (PSTATE.historyFilter === 'today') {
            const start = new Date(); start.setHours(0,0,0,0);
            return t >= start.getTime();
        }
        if (PSTATE.historyFilter === 'week') return now - t < 7 * 86400000;
        return true;
    });

    const el = document.getElementById('list-history');
    if (filtered.length === 0) {
        el.innerHTML = emptyState('📋', 'ยังไม่มีประวัติออเดอร์', 'ออเดอร์ที่เสร็จหรือยกเลิกจะปรากฏที่นี่');
        return;
    }
    el.innerHTML = filtered.map(o => orderCard(o, [], true)).join('');
    bindCardButtons(el);
}

function nextActions(status) {
    return {
        accepted: ['cook', 'cancel'],
        cooking:  ['ready'],
        ready:    ['complete'],
    }[status] || [];
}

function updateBadges() {
    const pending = PSTATE.orders.filter(o => o.status === 'pending').length;
    const active  = PSTATE.orders.filter(o => ['accepted','cooking','ready'].includes(o.status)).length;

    const bNew = document.getElementById('badge-new');
    const bAct = document.getElementById('badge-active');

    bNew.textContent = pending;
    bNew.style.display = pending > 0 ? 'inline-flex' : 'none';
    bAct.textContent = active;
    bAct.style.display = active > 0 ? 'inline-flex' : 'none';
}

// ============================================================
// 🃏 Order Card HTML
// ============================================================
function orderCard(o, actions, isHistory = false) {
    const meta = STATUS_META[o.status] || { label: o.status, icon: '?', badgeClass: '' };
    const dt = new Date(o.created_at);
    const timeStr = dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const dateStr = dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    const items = (o.items || []);
    const total = items.reduce((s, i) => s + (parseFloat(i.price) * parseInt(i.quantity)), 0);

    const itemsHtml = items.map(i => `
        <div class="oc-item-row">
            <span class="order-item-name">${i.quantity}× ${esc(i.name)}${i.note ? `<span class="oc-item-note">📝 ${esc(i.note)}</span>` : ''}</span>
            <span style="color:var(--stone);font-size:12px;white-space:nowrap">฿${fmt(parseFloat(i.price) * parseInt(i.quantity))}</span>
        </div>
    `).join('');

    const notesHtml = o.notes
        ? `<div class="oc-notes">📝 ${esc(o.notes)}</div>`
        : '';

    const tableInfo = o.table_number
        ? `🪑 โต๊ะ ${o.table_number}`
        : (o.order_type === 'takeaway' ? '🥡 กลับบ้าน' : '');

    const actionsHtml = actions.length > 0 ? `
        <div class="oc-actions">
            ${actions.map(a => actionBtn(a, o.id)).join('')}
        </div>
    ` : '';

    // ปุ่มเครื่องมือ: ดูรายละเอียด, แก้ไข, ปริ้น, ลบ
    const toolsHtml = `
        <div class="oc-tools">
            <button class="oc-tool-btn" data-action="view" data-order-id="${o.id}" title="ดูรายละเอียด">🔍</button>
            <button class="oc-tool-btn" data-action="edit" data-order-id="${o.id}" title="แก้ไขออเดอร์">✏️</button>
            <button class="oc-tool-btn" data-action="print" data-order-id="${o.id}" title="ปริ้นออเดอร์">🖨️</button>
            <button class="oc-tool-btn btn-tool-delete" data-action="delete" data-order-id="${o.id}" title="ลบออเดอร์">🗑️</button>
        </div>
    `;

    return `
    <div class="order-card status-${o.status}" data-order-id="${o.id}" style="cursor:pointer;">
        <div class="oc-head">
            <div>
                <div class="oc-num">#${esc(o.order_number || o.id)}</div>
                <div class="oc-time">${dateStr} · ${timeStr}${tableInfo ? ' · ' + tableInfo : ''}</div>
            </div>
            <span class="order-badge ${meta.badgeClass}">${meta.icon} ${meta.label}</span>
        </div>
        <div class="oc-cust">👤 ${esc(o.customer_name || 'ลูกค้า')}${o.customer_phone ? ' · 📞 ' + esc(o.customer_phone) : ''}</div>
        <div class="oc-items">
            ${itemsHtml}
            <div class="oc-total">
                <span>รวม</span>
                <span>฿${fmt(total)}</span>
            </div>
        </div>
        ${notesHtml}
        ${actionsHtml}
        ${toolsHtml}
    </div>`;
}

function actionBtn(action, orderId) {
    const MAP = {
        accept:   { label: '✅ รับออเดอร์',    cls: 'btn-accept'  },
        cook:     { label: '👨‍🍳 เริ่มทำ',       cls: 'btn-cook'    },
        ready:    { label: '🍽️ พร้อมส่ง',       cls: 'btn-ready'   },
        complete: { label: '✨ เสร็จสิ้น',      cls: 'btn-done'    },
        cancel:   { label: '❌ ยกเลิก',         cls: 'btn-cancel'  },
    };
    const m = MAP[action];
    if (!m) return '';
    return `<button class="btn-action ${m.cls}" data-action="${action}" data-order-id="${orderId}">${m.label}</button>`;
}

function bindCardButtons(container) {
    // คลิกที่ตัวการ์ดเอง (ที่ไม่ใช่ปุ่ม) — เปิด pop-up รายละเอียด
    container.querySelectorAll('.order-card').forEach(card => {
        card.addEventListener('click', () => {
            const orderId = card.dataset.orderId;
            openOrderModal(orderId);
        });
    });

    container.querySelectorAll('.btn-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action  = btn.dataset.action;
            const orderId = btn.dataset.orderId;
            handleOrderAction(action, orderId, btn);
        });
    });
    // ปุ่มเครื่องมือ
    container.querySelectorAll('.oc-tool-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action  = btn.dataset.action;
            const orderId = btn.dataset.orderId;
            if (action === 'view')   openOrderModal(orderId);
            if (action === 'print')  printOrder(orderId);
            if (action === 'edit')   openEditModal(orderId);
            if (action === 'delete') deleteOrder(orderId);
        });
    });
}

// ============================================================
// ⚡ Order Actions (Status Change)
// ============================================================
async function handleOrderAction(action, orderId, btn) {
    const STATUS_MAP = {
        accept:   'accepted',
        cook:     'cooking',
        ready:    'ready',
        complete: 'completed',
        cancel:   'cancelled',
    };

    const newStatus = STATUS_MAP[action];
    if (!newStatus) return;

    if (action === 'cancel') {
        if (!confirm('ยืนยันการยกเลิกออเดอร์นี้?')) return;
    }

    btn.disabled = true;
    const origText = btn.innerHTML;
    btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;margin:0 auto;"></div>';

    try {
        await API.call('updatePartnerOrderStatus', {
            partnerId: PARTNER.id,
            token: PARTNER.token,
            orderId,
            status: newStatus,
        });

        const order = PSTATE.orders.find(o => o.id === orderId);
        if (order) order.status = newStatus;
        renderAll();

        const labels = { accepted:'รับออเดอร์แล้ว', cooking:'เริ่มทำแล้ว', ready:'พร้อมส่งแล้ว', completed:'เสร็จสิ้น', cancelled:'ยกเลิกแล้ว' };
        showToast(labels[newStatus] || 'อัปเดตแล้ว', 'success');

    } catch (err) {
        btn.disabled = false;
        btn.innerHTML = origText;
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
}

// ============================================================
// 🔍 Order Detail Modal (Pop-up)
// ============================================================
function openOrderModal(orderId) {
    const o = PSTATE.orders.find(o => o.id === orderId);
    if (!o) return;

    const meta = STATUS_META[o.status] || { label: o.status, icon: '?', badgeClass: '' };
    const dt = new Date(o.created_at);
    const timeStr = dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    const items = (o.items || []);
    const total = items.reduce((s, i) => s + (parseFloat(i.price) * parseInt(i.quantity)), 0);

    const tableInfo = o.table_number
        ? `🪑 โต๊ะ ${o.table_number}`
        : (o.order_type === 'takeaway' ? '🥡 กลับบ้าน' : (o.order_type === 'delivery' ? '🛵 ส่งที่ห้อง' : ''));

    const itemsHtml = items.map(i => `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--cream-dk);">
            <div>
                <div style="font-size:14px;font-weight:600;">${i.quantity}× ${esc(i.name)}</div>
                ${i.note ? `<div style="font-size:12px;color:var(--stone);margin-top:2px;">📝 ${esc(i.note)}</div>` : ''}
            </div>
            <div style="font-size:14px;color:var(--em);font-weight:700;white-space:nowrap;margin-left:12px;">฿${fmt(parseFloat(i.price) * parseInt(i.quantity))}</div>
        </div>
    `).join('');

    document.getElementById('order-modal-content').innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <div>
                <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:var(--em);">#${esc(o.order_number || o.id)}</div>
                <div style="font-size:12px;color:var(--stone);margin-top:2px;">${dateStr} ${timeStr}</div>
            </div>
            <span class="order-badge ${meta.badgeClass}" style="font-size:13px;">${meta.icon} ${meta.label}</span>
        </div>

        <div style="background:var(--cream);border-radius:10px;padding:12px;margin-bottom:14px;">
            <div style="font-size:12px;font-weight:700;color:var(--stone);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em;">ข้อมูลลูกค้า</div>
            <div style="font-size:14px;">👤 ${esc(o.customer_name || 'ลูกค้า')}</div>
            ${o.customer_phone ? `<div style="font-size:14px;margin-top:4px;">📞 ${esc(o.customer_phone)}</div>` : ''}
            ${tableInfo ? `<div style="font-size:14px;margin-top:4px;">${tableInfo}</div>` : ''}
        </div>

        <div style="margin-bottom:14px;">
            <div style="font-size:12px;font-weight:700;color:var(--stone);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em;">รายการอาหาร</div>
            ${itemsHtml}
            <div style="display:flex;justify-content:space-between;padding:10px 0 0;font-size:16px;font-weight:700;color:var(--em);">
                <span>ยอดรวมทั้งหมด</span>
                <span>฿${fmt(total)}</span>
            </div>
        </div>

        ${o.notes ? `
        <div style="background:#FFFBF0;border-radius:10px;padding:12px;border-left:4px solid var(--gold);">
            <div style="font-size:12px;font-weight:700;color:var(--stone);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em;">📝 หมายเหตุจากลูกค้า</div>
            <div style="font-size:14px;color:var(--char);line-height:1.6;">${esc(o.notes)}</div>
        </div>
        ` : ''}

        <div style="display:flex;gap:8px;margin-top:18px;">
            <button onclick="printOrder('${o.id}')" style="flex:1;padding:11px;background:var(--em);color:#fff;border:none;border-radius:10px;font-family:'Sarabun',sans-serif;font-size:14px;font-weight:700;cursor:pointer;">🖨️ ปริ้น</button>
            <button onclick="closeOrderModal()" style="flex:1;padding:11px;background:var(--cream-dk);color:var(--char);border:none;border-radius:10px;font-family:'Sarabun',sans-serif;font-size:14px;font-weight:700;cursor:pointer;">ปิด</button>
        </div>
    `;

    document.getElementById('order-modal-backdrop').classList.add('show');
}

function closeOrderModal() {
    document.getElementById('order-modal-backdrop').classList.remove('show');
}
window.closeOrderModal = closeOrderModal;

// ============================================================
// ✏️ Edit Order Modal
// ============================================================
function openEditModal(orderId) {
    const o = PSTATE.orders.find(o => o.id === orderId);
    if (!o) return;

    const items = (o.items || []);

    const itemsHtml = items.map((item, idx) => `
        <div class="edit-item-row" data-idx="${idx}">
            <div style="flex:1;">
                <div style="font-size:13px;font-weight:600;">${esc(item.name)}</div>
                ${item.note ? `<div style="font-size:11px;color:var(--stone);">📝 ${esc(item.note)}</div>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                <button onclick="changeQty(${idx},-1)" style="width:28px;height:28px;border-radius:50%;border:1.5px solid var(--cream-dk);background:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700;">−</button>
                <span class="edit-qty" id="edit-qty-${idx}" style="min-width:24px;text-align:center;font-weight:700;">${item.quantity}</span>
                <button onclick="changeQty(${idx},+1)" style="width:28px;height:28px;border-radius:50%;border:1.5px solid var(--cream-dk);background:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700;">+</button>
                <span style="font-size:12px;color:var(--stone);width:50px;text-align:right;">฿${fmt(parseFloat(item.price) * parseInt(item.quantity))}</span>
                <button onclick="removeEditItem(${idx})" style="width:28px;height:28px;border-radius:50%;border:none;background:#FEE2E2;color:#991B1B;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
            </div>
        </div>
    `).join('');

    document.getElementById('edit-modal-content').innerHTML = `
        <div style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:var(--em);margin-bottom:4px;">#${esc(o.order_number || o.id)}</div>
        <div style="font-size:12px;color:var(--stone);margin-bottom:16px;">แก้ไขจำนวนหรือลบรายการ</div>

        <div style="font-size:12px;font-weight:700;color:var(--stone);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em;">รายการอาหาร</div>
        <div id="edit-items-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
            ${itemsHtml}
        </div>

        <div style="font-size:12px;font-weight:700;color:var(--stone);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em;">หมายเหตุ</div>
        <textarea id="edit-notes" style="width:100%;padding:10px;border:1.5px solid var(--cream-dk);border-radius:8px;font-family:'Sarabun',sans-serif;font-size:14px;resize:none;min-height:70px;outline:none;" placeholder="หมายเหตุจากลูกค้า...">${esc(o.notes || '')}</textarea>

        <div style="display:flex;gap:8px;margin-top:16px;">
            <button id="btn-save-edit" onclick="saveEditOrder('${o.id}')" style="flex:2;padding:12px;background:linear-gradient(135deg,var(--em),var(--em-dk));color:var(--gold-lt);border:none;border-radius:10px;font-family:'Sarabun',sans-serif;font-size:14px;font-weight:700;cursor:pointer;">💾 บันทึกการแก้ไข</button>
            <button onclick="closeEditModal()" style="flex:1;padding:12px;background:var(--cream-dk);color:var(--char);border:none;border-radius:10px;font-family:'Sarabun',sans-serif;font-size:14px;font-weight:700;cursor:pointer;">ยกเลิก</button>
        </div>
    `;

    // เก็บ items ชั่วคราวสำหรับแก้ไข
    window._editItems = JSON.parse(JSON.stringify(items));
    window._editOrderId = o.id;

    document.getElementById('edit-modal-backdrop').classList.add('show');
}

function closeEditModal() {
    document.getElementById('edit-modal-backdrop').classList.remove('show');
    window._editItems = null;
    window._editOrderId = null;
}
window.closeEditModal = closeEditModal;

function changeQty(idx, delta) {
    if (!window._editItems) return;
    const item = window._editItems[idx];
    if (!item) return;
    const newQty = parseInt(item.quantity) + delta;
    if (newQty < 0) return;
    item.quantity = newQty;
    const qtyEl = document.getElementById('edit-qty-' + idx);
    if (qtyEl) qtyEl.textContent = newQty;

    // ถ้า qty = 0 แสดงว่าจะลบ
    const row = document.querySelector(`.edit-item-row[data-idx="${idx}"]`);
    if (row) {
        if (newQty === 0) {
            row.style.opacity = '0.35';
            row.style.textDecoration = 'line-through';
        } else {
            row.style.opacity = '1';
            row.style.textDecoration = 'none';
        }
    }
}
window.changeQty = changeQty;

function removeEditItem(idx) {
    if (!window._editItems) return;
    window._editItems[idx].quantity = 0;
    const row = document.querySelector(`.edit-item-row[data-idx="${idx}"]`);
    if (row) {
        row.style.opacity = '0.35';
        row.style.textDecoration = 'line-through';
        const qtyEl = document.getElementById('edit-qty-' + idx);
        if (qtyEl) qtyEl.textContent = '0';
    }
}
window.removeEditItem = removeEditItem;

async function saveEditOrder(orderId) {
    if (!window._editItems) return;

    const filteredItems = window._editItems.filter(i => parseInt(i.quantity) > 0);
    if (filteredItems.length === 0) {
        showToast('⚠️ ต้องมีรายการอาหารอย่างน้อย 1 รายการ', 'error');
        return;
    }

    const notes = document.getElementById('edit-notes').value.trim();
    const btn = document.getElementById('btn-save-edit');
    btn.disabled = true;
    btn.textContent = 'กำลังบันทึก...';

    try {
        await API.call('editPartnerOrder', {
            partnerId: PARTNER.id,
            token: PARTNER.token,
            orderId,
            items: filteredItems,
            notes,
        });

        // อัปเดต local state
        const order = PSTATE.orders.find(o => o.id === orderId);
        if (order) {
            order.items = filteredItems;
            order.notes = notes;
        }

        closeEditModal();
        renderAll();
        showToast('✅ แก้ไขออเดอร์แล้ว', 'success');
    } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
        btn.disabled = false;
        btn.textContent = '💾 บันทึกการแก้ไข';
    }
}
window.saveEditOrder = saveEditOrder;

// ============================================================
// 🗑️ Delete Order
// ============================================================
async function deleteOrder(orderId) {
    const o = PSTATE.orders.find(o => o.id === orderId);
    const label = o ? `#${o.order_number || o.id}` : `#${orderId}`;

    if (!confirm(`ลบออเดอร์ ${label} ?\nการลบไม่สามารถกู้คืนได้`)) return;

    showLoading(true);
    try {
        await API.call('deletePartnerOrder', {
            partnerId: PARTNER.id,
            token: PARTNER.token,
            orderId,
        });

        PSTATE.orders = PSTATE.orders.filter(o => o.id !== orderId);
        renderAll();
        showToast('🗑️ ลบออเดอร์แล้ว', 'success');
    } catch (err) {
        showToast('ลบไม่สำเร็จ: ' + err.message, 'error');
    } finally {
        showLoading(false);
    }
}
window.deleteOrder = deleteOrder;

// ============================================================
// 🖨️ Print Order
// ============================================================
function printOrder(orderId) {
    const o = PSTATE.orders.find(o => o.id === orderId);
    if (!o) { showToast('ไม่พบออเดอร์', 'error'); return; }

    const meta = STATUS_META[o.status] || { label: o.status };
    const dt = new Date(o.created_at);
    const timeStr = dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const dateStr = dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    const items = (o.items || []);
    const total = items.reduce((s, i) => s + (parseFloat(i.price) * parseInt(i.quantity)), 0);

    const tableInfo = o.table_number
        ? `โต๊ะ ${o.table_number}`
        : (o.order_type === 'takeaway' ? 'กลับบ้าน' : (o.order_type === 'delivery' ? 'ส่งที่ห้อง' : ''));

    const itemsHtml = items.map(i => `
        <tr>
            <td style="padding:5px 0;">${esc(i.name)}${i.note ? `<br><small style="color:#666;">📝 ${esc(i.note)}</small>` : ''}</td>
            <td style="text-align:center;padding:5px 8px;">${i.quantity}</td>
            <td style="text-align:right;padding:5px 0;">฿${fmt(parseFloat(i.price) * parseInt(i.quantity))}</td>
        </tr>
    `).join('');

    const printWin = window.open('', '_blank', 'width=380,height=600');
    printWin.document.write(`<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>ออเดอร์ #${o.order_number || o.id}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Sarabun', 'TH Sarabun New', sans-serif; font-size:14px; color:#111; padding:16px; }
  .header { text-align:center; border-bottom:2px dashed #333; padding-bottom:12px; margin-bottom:12px; }
  .shop-name { font-size:18px; font-weight:700; }
  .order-num { font-size:24px; font-weight:700; color:#651713; margin:6px 0; }
  .info-row { font-size:13px; color:#444; margin:3px 0; }
  table { width:100%; border-collapse:collapse; margin:12px 0; }
  th { font-size:12px; color:#666; text-align:left; padding:4px 0; border-bottom:1px solid #ddd; }
  th:last-child, td:last-child { text-align:right; }
  th:nth-child(2), td:nth-child(2) { text-align:center; }
  .total-row { border-top:2px dashed #333; padding-top:10px; margin-top:4px; display:flex; justify-content:space-between; font-size:16px; font-weight:700; }
  .notes-box { background:#FFFBF0; border:1px solid #C9A861; border-radius:6px; padding:10px; margin:12px 0; }
  .footer { text-align:center; font-size:11px; color:#999; margin-top:16px; border-top:1px dashed #ddd; padding-top:10px; }
  @media print { button { display:none; } }
</style>
</head>
<body>
<div class="header">
  <div class="shop-name">🏪 ${esc(PARTNER.name || PARTNER.id)}</div>
  <div class="order-num">#${esc(o.order_number || o.id)}</div>
  <div class="info-row">${dateStr} · ${timeStr}</div>
  ${tableInfo ? `<div class="info-row">${tableInfo}</div>` : ''}
  <div class="info-row">สถานะ: ${meta.label}</div>
</div>

<div class="info-row">👤 ${esc(o.customer_name || 'ลูกค้า')}</div>
${o.customer_phone ? `<div class="info-row">📞 ${esc(o.customer_phone)}</div>` : ''}

<table>
  <thead>
    <tr>
      <th>รายการ</th>
      <th>จำนวน</th>
      <th>ราคา</th>
    </tr>
  </thead>
  <tbody>${itemsHtml}</tbody>
</table>

<div class="total-row">
  <span>ยอดรวม</span>
  <span>฿${fmt(total)}</span>
</div>

${o.notes ? `
<div class="notes-box">
  <div style="font-size:12px;font-weight:700;color:#92400E;margin-bottom:4px;">📝 หมายเหตุ</div>
  <div>${esc(o.notes)}</div>
</div>` : ''}

<div class="footer">
  พิมพ์โดย Partner App · แม่ยมพาเลส
</div>

<div style="text-align:center;margin-top:16px;">
  <button onclick="window.print();window.close();" style="padding:10px 24px;background:#651713;color:#fff;border:none;border-radius:8px;font-size:15px;cursor:pointer;">🖨️ พิมพ์</button>
</div>
</body>
</html>`);
    printWin.document.close();
}
window.printOrder = printOrder;

// ============================================================
// 🔔 Notifications & Alerts
// ============================================================
function showNewOrderAlert() {
    const el = document.getElementById('new-order-alert');
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 6000);
}

// ============================================================
// 🔔 Push Notification — รองรับทั้ง Web + Capacitor APK
// ============================================================
async function sendPushNotification(count) {
    const title = '🔔 มีออเดอร์ใหม่' + (count > 1 ? ' ' + count + ' รายการ!' : '!');
    const body  = 'แตะเพื่อเปิดแอพและรับออเดอร์';

    if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
        // ✅ ใช้ NativeNotify plugin ที่เขียนเอง แทน LocalNotifications.schedule()
        // เพราะ LocalNotifications ของ Capacitor ผูก PendingIntent กับ Activity
        // instance reference ที่ไม่เสถียร — บนเครื่อง Huawei/Honor ที่ kill
        // background activity บ่อย ทำให้แตะ notification แล้วไม่เข้าแอป
        // (พาไป Home screen แทน) NativeNotify ผูก PendingIntent กับ
        // applicationContext + ComponentName ตรงๆ จึงทำงานได้แน่นอนกว่า
        try {
            const { NativeNotify } = window.Capacitor.Plugins;
            if (NativeNotify) {
                await NativeNotify.show({ title, body });
                return;
            }
        } catch(e) {
            console.warn('[NativeNotify]', e.message);
        }

        // Fallback — เผื่อ APK เก่าที่ยังไม่มี NativeNotify plugin (ยังไม่ได้ build ใหม่)
        try {
            const { LocalNotifications } = window.Capacitor.Plugins;
            if (LocalNotifications) {
                const perm = await LocalNotifications.requestPermissions();
                if (perm.display === 'granted') {
                    await LocalNotifications.schedule({
                        notifications: [{
                            id:       Date.now(),
                            title:    title,
                            body:     body,
                            sound:    'default',
                            smallIcon: 'ic_stat_icon_config_sample',
                            iconColor: '#651713',
                            channelId: 'partner_orders',
                            extra: { type: 'new_order', count: String(count) },
                        }]
                    });
                    return;
                }
            }
        } catch(e) {
            console.warn('[LocalNotif]', e.message);
        }
    }

    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
        const notif = new Notification(title, {
            body,
            icon:  'https://maeyompalece-sys.github.io/maeyom-palace/images/icon-192.png',
            badge: 'https://maeyompalece-sys.github.io/maeyom-palace/images/icon-192.png',
            tag:   'new-order',
            renotify: true,
        });
        // ✅ กดที่ notification แล้วพาโฟกัสกลับมาที่แท็บ/หน้าต่างแอปนี้ทันที
        notif.onclick = function() {
            try {
                window.focus();
                if (parent && parent.focus) parent.focus();
            } catch(e) {}
            // เปิดแท็บออเดอร์ใหม่ให้เลย
            try { switchTab('new'); } catch(e) {}
            notif.close();
        };
    } catch(e) {}
}

// ============================================================
// 🔔 ลงทะเบียน Listener สำหรับการแตะ Local Notification (Capacitor APK)
// ต้องเรียกครั้งเดียวตอน app เริ่มทำงาน — ไม่ใช่ทุกครั้งที่ส่ง notification
// ============================================================
function setupNotificationClickListener() {
    // ✅ ฟังก์ชันกลางที่พาเข้าแท็บออเดอร์ใหม่ + รีเฟรชข้อมูล
    // เรียกได้จากหลายทาง: แตะ notification ตรงๆ, native resume event,
    // หรือ visibilitychange (กรณีสลับแอปกลับมาด้วยมือ)
    function goToNewOrdersAndRefresh() {
        try {
            showScreen('app');
            switchTab('new');
            fetchOrders(false);
        } catch(e) {
            console.warn('[NotifClick]', e.message);
        }
    }
    window._goToNewOrdersAndRefresh = goToNewOrdersAndRefresh;

    // ✅ Event ที่ native ฝั่ง MainActivity.onResume() ยิงเข้ามาทาง
    // evaluateJavascript — ทำงานได้แม้ JS listener ของปลั๊กอินจะไม่ถูก trigger
    // (กรณี WebView ถูก suspend ไปนานจนแอปอยู่ background)
    window.addEventListener('maeyomAppResumed', () => {
        // รีเฟรชข้อมูลเสมอตอน resume แต่ไม่บังคับสลับแท็บ ถ้าผู้ใช้ไม่ได้มาจาก notification
        // (ป้องกันแย่งโฟกัสตอนผู้ใช้แค่สลับแอปไปมาเฉยๆ)
        try { fetchOrders(false); } catch(e) {}
    });

    if (!window.Capacitor || !window.Capacitor.isNativePlatform || !window.Capacitor.isNativePlatform()) return;
    try {
        const { LocalNotifications } = window.Capacitor.Plugins;
        if (!LocalNotifications || !LocalNotifications.addListener) return;
        LocalNotifications.addListener('localNotificationActionPerformed', () => {
            // แตะ notification โดยตรง — พาเข้าแท็บออเดอร์ใหม่ทันที
            goToNewOrdersAndRefresh();
        });
    } catch(e) {
        console.warn('[NotifClickListenerSetup]', e.message);
    }
}

// ============================================================
// 🔔 ตั้งค่า Notification Channel (Android 8+)
// ============================================================
async function setupNotificationChannel() {
    if (!window.Capacitor || !window.Capacitor.isNativePlatform || !window.Capacitor.isNativePlatform()) return;
    try {
        const { LocalNotifications } = window.Capacitor.Plugins;
        if (!LocalNotifications) return;
        await LocalNotifications.createChannel({
            id:          'partner_orders',
            name:        'ออเดอร์ใหม่',
            description: 'แจ้งเตือนเมื่อมีออเดอร์ใหม่เข้ามา',
            importance:  5,
            visibility:  1,
            vibration:   true,
            lights:      true,
            lightColor:  '#651713',
            sound:       'default',
        });
    } catch(e) {
        console.warn('[Channel]', e.message);
    }
}

function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [0, 150, 300].forEach((delay) => {
            setTimeout(() => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 880;
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
                osc.start();
                osc.stop(ctx.currentTime + 0.2);
            }, delay);
        });
    } catch (e) {}
}

// ============================================================
// 🌐 Connectivity
// ============================================================
function setOnlineStatus(online) {
    const dot = document.getElementById('status-dot');
    dot.className = 'status-dot' + (online ? ' online' : '');
    dot.title = online ? 'เชื่อมต่อแล้ว' : 'ไม่มีการเชื่อมต่อ';
}

// ============================================================
// 🎛 Tab Switching
// ============================================================
function switchTab(tab) {
    PSTATE.activeTab = tab;
    document.querySelectorAll('.tab').forEach(t =>
        t.classList.toggle('active', t.dataset.tab === tab)
    );
    document.querySelectorAll('.pane').forEach(p =>
        p.classList.toggle('active', p.id === 'pane-' + tab)
    );
    if (tab === 'settings' && typeof renderSettingsPane === 'function') {
        renderSettingsPane();
    }
    if (tab === 'menu' && typeof loadPartnerMenu === 'function') {
        loadPartnerMenu();
    }
}

// ============================================================
// 🛠 Helpers
// ============================================================
function showLoading(show) {
    document.getElementById('global-loading').classList.toggle('show', show);
}

function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 2600);
}

function emptyState(icon, title, sub) {
    return `<div class="empty-state">
        <div class="es-icon">${icon}</div>
        <div class="es-title">${title}</div>
        <div class="es-sub">${sub}</div>
    </div>`;
}

// ============================================================
// 🔔 FCM Token Registration
// ============================================================
async function registerFCMTokenToServer() {
    try {
        if (window.firebase && window.firebase.messaging) {
            const messaging = window.firebase.messaging();
            const fcmToken = await messaging.getToken({ vapidKey: 'YOUR_VAPID_KEY' });
            if (fcmToken && PARTNER.id) {
                await API.call('registerFCMToken', {
                    partnerId: PARTNER.id,
                    token: PARTNER.token,
                    fcmToken: fcmToken,
                });
            }
        } else {
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FirebaseMessaging) {
                const { FirebaseMessaging } = window.Capacitor.Plugins;
                await FirebaseMessaging.requestPermissions();
                const { token } = await FirebaseMessaging.getToken();
                if (token && PARTNER.id) {
                    await API.call('registerFCMToken', {
                        partnerId: PARTNER.id,
                        token: PARTNER.token,
                        fcmToken: token,
                    });
                }
            }
        }
    } catch(e) {
        console.warn('[FCM] register failed:', e.message);
    }
}

function esc(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
}

function fmt(n) {
    return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
